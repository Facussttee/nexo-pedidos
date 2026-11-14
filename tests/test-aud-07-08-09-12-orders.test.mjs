import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createDisposableSupabaseHarness } from "./helpers/disposable-supabase-harness.mjs";

const memStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => (memStorage.has(k) ? memStorage.get(k) : null),
  setItem: (k, v) => memStorage.set(k, String(v)),
  removeItem: (k) => memStorage.delete(k),
  clear: () => memStorage.clear()
};

function makePrefixKeys(prefix) {
  return {
    PREFIX: prefix,
    PRODUCTS: `${prefix}products`,
    ORDERS: `${prefix}orders`,
    CUSTOMERS: `${prefix}customers`,
    CURRENT_USER: `${prefix}current_user`,
    CART: `${prefix}cart`,
    ACTIVE_ORDER: `${prefix}active_order`,
    LOCAL_SETTINGS: `${prefix}local_settings`,
    PIN_UNLOCKED: `${prefix}pin_unlocked`,
    SIMULATED_MESSAGES: `${prefix}simulated_messages`,
    OWN_TRACKING_REFS: `${prefix}own_tracking_refs`,
    PENDING_CHECKOUT: `${prefix}pending_checkout`,
    THEME: `${prefix}theme`
  };
}

test("AUD-07 / AUD-08 / AUD-09 / AUD-12 — Atomic Orders, Idempotency, Concurrency & Rate Limiting", async (t) => {
  const harness = createDisposableSupabaseHarness({
    products: [
      {
        id: "tomate-kg",
        nombre: "Tomate Redondo",
        categoria: "Verduras",
        unidad_medida: "KG",
        precio: 2500,
        disponible: true,
        paso: 0.5,
        archivado: false
      },
      {
        id: "palta-un",
        nombre: "Palta Hass",
        categoria: "Frutas",
        unidad_medida: "UNIDAD",
        precio: 1200,
        disponible: true,
        paso: 1,
        archivado: false
      }
    ],
    staffUsers: [
      {
        user_id: "11111111-1111-4111-8111-111111111111",
        email: "owner@local.test",
        password: "OwnerStrongPassword!1",
        role: "owner",
        active: true
      },
      {
        user_id: "22222222-2222-4222-8222-222222222222",
        email: "op1@local.test",
        password: "Op1StrongPassword!1",
        role: "operator",
        active: true
      },
      {
        user_id: "33333333-3333-4333-8333-333333333333",
        email: "op2@local.test",
        password: "Op2StrongPassword!1",
        role: "operator",
        active: true
      }
    ]
  });

  const clientSupa = harness.createClient({ sourceKey: "source:client-orders" });
  const ownerSupa = harness.createClient({ sourceKey: "source:owner-orders" });
  const op1Supa = harness.createClient({ sourceKey: "source:op1" });
  const op2Supa = harness.createClient({ sourceKey: "source:op2" });

  let nextClient = clientSupa;
  globalThis.window = {
    supabase: { createClient: () => nextClient },
    addEventListener() {},
    location: { search: "", hash: "" }
  };

  const { Store } = await import("../js/store.js");
  const baseProdConfig = {
    mode: "production",
    ok: true,
    errors: [],
    warnings: [],
    business: { name: "Comercio Local", alias: "comercio.local", whatsapp: "5491100000001" },
    supabaseUrl: "http://127.0.0.1:54321",
    supabaseAnonKey: "sb_publishable_local_disposable_anon_key"
  };

  async function spawnStore(supaClient, prefix) {
    nextClient = supaClient;
    const s = new Store({ ...baseProdConfig, storageKeys: makePrefixKeys(prefix) });
    await new Promise((r) => setTimeout(r, 30));
    return s;
  }

  const clientStore = await spawnStore(clientSupa, "nexo_a07_cli_");
  const ownerStore = await spawnStore(ownerSupa, "nexo_a07_own_");
  const op1Store = await spawnStore(op1Supa, "nexo_a07_op1_");
  const op2Store = await spawnStore(op2Supa, "nexo_a07_op2_");

  await ownerStore.signInStaff("owner@local.test", "OwnerStrongPassword!1");
  await op1Store.signInStaff("op1@local.test", "Op1StrongPassword!1");
  await op2Store.signInStaff("op2@local.test", "Op2StrongPassword!1");

  await t.test("AUD-07.1 Server catalog pricing overrides tampered local price and forged fecha/estado", async () => {
    await clientStore.pullFromSupabase();

    // Tamper local cached catalog price to $1 BEFORE adding to cart
    const rawCached = JSON.parse(localStorage.getItem(clientStore.storageKeys.PRODUCTS));
    const targetCached = rawCached.find((p) => p.id === "tomate-kg");
    assert.ok(targetCached);
    targetCached.precio = 1;
    localStorage.setItem(clientStore.storageKeys.PRODUCTS, JSON.stringify(rawCached));

    clientStore.addToCart("tomate-kg", 2);
    assert.equal(clientStore.getCartSummary().totalEstimado, 2, "Client thinks total is $2");

    const res = await clientStore.submitOrder({
      cliente: { nombre: "Cliente Honesto", telefono: "1144445555", direccion: "Calle 10" },
      tipo_entrega: "RETIRO"
    });

    assert.equal(res.ok, true);
    assert.equal(res.order.total_estimado, 5000, "Server MUST compute authoritative total $2500 * 2 = $5000");
    assert.equal(res.order.items[0].precio_unitario, 2500);
    assert.equal(res.order.estado, "PENDIENTE");

    // Direct RPC attempt with forged timestamp / tampered item payload fails or ignores client fecha
    const directTamper = await clientSupa.rpc("create_order_atomic", {
      p_cliente_telefono: "1144445556",
      p_cliente_nombre: "Test Direct",
      p_tipo_entrega: "RETIRO",
      p_direccion_entrega: "",
      p_items: [{ producto_id: "palta-un", cantidad: 2, precio: 1, fecha: "1999-01-01T00:00:00Z" }],
      p_checkout_cart_key: "direct-key-1"
    });
    assert.equal(directTamper.error, null);
    assert.equal(directTamper.data.order.total_estimado, 2400);
    assert.equal(directTamper.data.order.fecha.startsWith("1999"), false, "Server overrides forged fecha with NOW()");
  });

  await t.test("AUD-07.2 Paused product remotely rejects checkout atomically and preserves cart", async () => {
    await clientStore.pullFromSupabase();
    clientStore.clearCart();
    clientStore.addToCart("tomate-kg", 1);

    // Owner pauses tomate-kg remotely before client refreshes
    await ownerStore.saveProductAsync(
      {
        nombre: "Tomate Redondo",
        categoria: "Verduras",
        unidad_medida: "KG",
        precio: 2500,
        paso: 0.5,
        disponible: false
      },
      "tomate-kg"
    );

    const rejected = await clientStore.submitOrder({
      cliente: { nombre: "Cliente Demorado", telefono: "1144445557", direccion: "" },
      tipo_entrega: "RETIRO"
    });

    assert.equal(rejected.ok, false);
    assert.equal(rejected.status, "failed");
    assert.match(rejected.error, /no disponible|pausado/i);
    assert.equal(clientStore.getCartSummary().totalItems, 1, "Rejected order must preserve client cart");

    // Restore availability for subsequent tests
    await ownerStore.saveProductAsync(
      {
        nombre: "Tomate Redondo",
        categoria: "Verduras",
        unidad_medida: "KG",
        precio: 2500,
        paso: 0.5,
        disponible: true
      },
      "tomate-kg"
    );
    clientStore.clearCart();
  });

  await t.test("AUD-08.1 Timeout after server commit leaves unknown recoverable state, preserves cart, and idempotency deduplicates across reload", async () => {
    const cliKeys = makePrefixKeys("nexo_a08_reload_");
    const cliA = await spawnStore(clientSupa, "nexo_a08_reload_");
    await cliA.pullFromSupabase();
    cliA.addToCart("tomate-kg", 1);

    const beforeCount = harness.db.pedidos.length;
    harness.setNextRpcFault("create_order_atomic", "timeout_after_commit");

    const firstAttempt = await cliA.submitOrder({
      cliente: { nombre: "Ana Reintento", telefono: "1177778888", direccion: "Av Siempre Viva 742" },
      tipo_entrega: "DELIVERY",
      direccion_entrega: "Av Siempre Viva 742"
    });

    assert.equal(firstAttempt.ok, false);
    assert.equal(firstAttempt.status, "unknown");
    assert.equal(firstAttempt.canRetry, true);
    assert.ok(firstAttempt.attemptKey);
    assert.equal(cliA.getCartSummary().totalItems, 1, "Cart must remain intact while status is unknown");
    assert.equal(harness.db.pedidos.length, beforeCount + 1, "Order committed once on server");

    // Simulate page reload into fresh Store instance backed by the same localStorage
    const cliReloaded = await spawnStore(clientSupa, "nexo_a08_reload_");
    assert.equal(cliReloaded.getPendingCheckout()?.attemptKey, firstAttempt.attemptKey);
    assert.equal(cliReloaded.getPendingCheckout()?.status, "unknown");

    const retryRes = await cliReloaded.submitOrder({
      cliente: { nombre: "Ana Reintento", telefono: "1177778888", direccion: "Av Siempre Viva 742" },
      tipo_entrega: "DELIVERY",
      direccion_entrega: "Av Siempre Viva 742"
    });

    assert.equal(retryRes.ok, true);
    assert.equal(retryRes.idempotent, true, "Retry after unknown timeout MUST recover idempotently");
    assert.equal(harness.db.pedidos.length, beforeCount + 1, "Zero duplicate orders allowed on retry");
    assert.equal(cliReloaded.getPendingCheckout(), null, "Pending checkout clears after confirmation");
    assert.equal(cliReloaded.getCartSummary().totalItems, 0, "Cart clears once order recovery confirms");

    // Reusing same attempt key with DIFFERENT payload throws CONFLICT
    const conflictRes = await clientSupa.rpc("create_order_atomic", {
      p_cliente_telefono: "1177778888",
      p_cliente_nombre: "Ana Alterada",
      p_tipo_entrega: "RETIRO",
      p_direccion_entrega: "",
      p_items: [{ producto_id: "palta-un", cantidad: 1 }],
      p_checkout_cart_key: firstAttempt.attemptKey
    });
    assert.ok(conflictRes.error);
    assert.match(conflictRes.error.message, /CONFLICT/i);

    assert.ok(cliKeys.PENDING_CHECKOUT);
  });

  await t.test("AUD-09.1 Optimistic locking blocks stale concurrent operator overwrite", async () => {
    await op1Store.pullFromSupabase();
    await op2Store.pullFromSupabase();

    const targetOrder = op1Store.getOrders().find((o) => o.estado === "PENDIENTE");
    assert.ok(targetOrder);
    const vInitial = targetOrder.version;

    // Op1 takes order cleanly
    const op1Taken = await op1Store.takeOrderAsync(targetOrder.id);
    assert.equal(op1Taken.estado, "EN_PREPARACION");
    assert.equal(op1Taken.version, vInitial + 1);

    // Op2 STILL holds stale version in memory and tries to take or edit the same order
    await assert.rejects(
      () => op2Store.takeOrderAsync(targetOrder.id),
      /modificado por otro operario/i
    );
    assert.equal(
      op2Store.getOrders().find((o) => o.id === targetOrder.id)?.version,
      vInitial + 1,
      "Conflict recovery must refresh stale store state"
    );
  });

  await t.test("AUD-09.2 Edge case total_real=0 preserved & historical snapshot untouched after price change", async () => {
    await clientStore.pullFromSupabase();
    clientStore.clearCart();
    clientStore.addToCart("palta-un", 2);
    const created = await clientStore.submitOrder({
      cliente: { nombre: "Cliente Cero", telefono: "1188889999", direccion: "" },
      tipo_entrega: "RETIRO"
    });
    assert.equal(created.ok, true);
    const orderId = created.order.id;

    // Price changes in catalog AFTER order placement
    await ownerStore.saveProductAsync(
      {
        nombre: "Palta Hass",
        categoria: "Frutas",
        unidad_medida: "UNIDAD",
        precio: 3500,
        paso: 1,
        disponible: true
      },
      "palta-un"
    );

    await op1Store.pullFromSupabase();
    const loadedOrder = op1Store.getOrders().find((o) => o.id === orderId);
    assert.equal(loadedOrder.items[0].precio_unitario, 1200, "Historical snapshot MUST retain $1200 unit price");
    assert.equal(loadedOrder.total_estimado, 2400);

    // Mark all items out of stock -> finalize with total_real === 0
    await op1Store.toggleItemOutOfStockAsync(orderId, 0);
    const finalized = await op1Store.finalizeOrderWeighingAsync(orderId);
    assert.equal(finalized.estado, "LISTO");
    assert.strictEqual(finalized.total_real, 0, "total_real === 0 must be preserved strictly (not null/falsy loss)");

    // Completed order cannot regress back to EN_PREPARACION
    await assert.rejects(
      () => op1Store.transitionOrderStatusAsync(orderId, "EN_PREPARACION"),
      /finalizado/i
    );
  });

  await t.test("AUD-12.1 Parallel burst hits customer limit, returns RETRY_AFTER, resets after window, and fails closed when unconfigured", async () => {
    // Advance clock away from previous tests cleanly
    harness.advanceTimeMs(600_000);
    const initialCount = harness.db.pedidos.length;

    // Parallel burst of 5 orders from the same phone (customer_max_orders = 3 in 300s)
    const burst = await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        clientSupa.rpc("create_order_atomic", {
          p_cliente_telefono: "1199990001",
          p_cliente_nombre: `Burst ${n}`,
          p_tipo_entrega: "RETIRO",
          p_direccion_entrega: "",
          p_items: [{ producto_id: "tomate-kg", cantidad: 1 }],
          p_checkout_cart_key: `burst-key-${n}-${Date.now()}`
        })
      )
    );

    const successes = burst.filter((r) => !r.error);
    const rejections = burst.filter((r) => r.error);
    assert.equal(successes.length, 3, "At most customer_max_orders (3) should commit in parallel burst");
    assert.equal(rejections.length, 2, "Excess orders must be rejected atomically");
    assert.equal(harness.db.pedidos.length, initialCount + 3, "Zero extra orders committed beyond limit");
    for (const rej of rejections) {
      assert.match(rej.error.message, /RATE_LIMIT_EXCEEDED.*RETRY_AFTER:\d+/);
    }

    // Store handleCheckoutError translates RATE_LIMIT_EXCEEDED + RETRY_AFTER nicely
    const rateStore = await spawnStore(clientSupa, "nexo_a12_rl_");
    await rateStore.pullFromSupabase();
    rateStore.addToCart("tomate-kg", 1);
    const uiReject = await rateStore.submitOrder({
      cliente: { nombre: "Burst UI", telefono: "1199990001", direccion: "" },
      tipo_entrega: "RETIRO"
    });
    assert.equal(uiReject.ok, false);
    assert.equal(uiReject.status, "failed");
    assert.ok(uiReject.retryAfterSeconds > 0);
    assert.equal(rateStore.getCartSummary().totalItems, 1, "Cart kept on rate-limit rejection");

    // Advance past 300s customer window -> succeeds again
    harness.advanceTimeMs(301_000);
    const afterWindow = await rateStore.submitOrder({
      cliente: { nombre: "After Window", telefono: "1199990001", direccion: "" },
      tipo_entrega: "RETIRO"
    });
    assert.equal(afterWindow.ok, true);

    // Fail-closed: unconfigured/deleted rate_limit_config blocks checkout
    const savedCfg = harness.db.rateLimitConfig;
    harness.db.rateLimitConfig = null;
    const countBeforeUnconfigured = harness.db.pedidos.length;
    const failClosed = await clientSupa.rpc("create_order_atomic", {
      p_cliente_telefono: "1199990002",
      p_cliente_nombre: "No Config",
      p_tipo_entrega: "RETIRO",
      p_direccion_entrega: "",
      p_items: [{ producto_id: "tomate-kg", cantidad: 1 }],
      p_checkout_cart_key: "unconfigured-check"
    });
    assert.ok(failClosed.error);
    assert.match(failClosed.error.message, /RATE_LIMIT_UNCONFIGURED/i);
    assert.equal(harness.db.pedidos.length, countBeforeUnconfigured);
    harness.db.rateLimitConfig = savedCfg;
  });

  await t.test("AUD-09.3 Single-operator rapid saveItemWeightAsync serializes cleanly & aborts queued ops on external CONFLICT", async () => {
    await clientStore.pullFromSupabase();
    clientStore.clearCart();
    clientStore.addToCart("tomate-kg", 1);
    const created = await clientStore.submitOrder({
      cliente: { nombre: "Cliente Pesaje Rapido", telefono: "1188887777", direccion: "" },
      tipo_entrega: "RETIRO"
    });
    assert.equal(created.ok, true);
    const orderId = created.order.id;

    await op1Store.pullFromSupabase();
    const taken = await op1Store.takeOrderAsync(orderId);
    const baseVersion = taken.version;

    // Rapid same-operator weight adjustments without awaiting each one sequentially
    const [r1, r2, r3] = await Promise.all([
      op1Store.saveItemWeightAsync(orderId, 0, 1.1),
      op1Store.saveItemWeightAsync(orderId, 0, 1.2),
      op1Store.saveItemWeightAsync(orderId, 0, 1.35)
    ]);

    assert.equal(r1.version, baseVersion + 1);
    assert.equal(r2.version, baseVersion + 2);
    assert.equal(r3.version, baseVersion + 3);
    assert.equal(r3.items[0].peso_real, 1.35);

    // Cross-operator conflict while op2Store still holds stale version: queued finalize must abort too
    await op2Store.pullFromSupabase();
    await op1Store.saveItemWeightAsync(orderId, 0, 1.5); // advances server version to baseVersion + 4

    const [op2WeightRes, op2FinalizeRes] = await Promise.allSettled([
      op2Store.saveItemWeightAsync(orderId, 0, 1.25),
      op2Store.finalizeOrderWeighingAsync(orderId)
    ]);

    assert.equal(op2WeightRes.status, "rejected");
    assert.equal(op2FinalizeRes.status, "rejected");
    assert.match(op2WeightRes.reason.message, /actualizado simultáneamente/i);
    assert.match(op2FinalizeRes.reason.message, /actualizado simultáneamente/i);
    const refreshedOrder = op2Store.getOrders().find((o) => o.id === orderId);
    assert.equal(refreshedOrder.estado, "EN_PREPARACION", "Conflicted queued finalize must NOT transition order");
    assert.equal(refreshedOrder.version, baseVersion + 4);
  });

  await t.test("AUD-09.4 updateOrderDetailsAsync clears delivery address on DELIVERY->RETIRO & validates blank DELIVERY", async () => {
    await clientStore.pullFromSupabase();
    clientStore.clearCart();
    clientStore.addToCart("tomate-kg", 1);
    const created = await clientStore.submitOrder({
      cliente: { nombre: "Cliente Delivery Switch", telefono: "1188886666", direccion: "Calle Falsa 123" },
      tipo_entrega: "DELIVERY",
      direccion_entrega: "Calle Falsa 123"
    });
    assert.equal(created.ok, true);
    const orderId = created.order.id;

    await op1Store.pullFromSupabase();
    await assert.rejects(
      () => op1Store.updateOrderDetailsAsync(orderId, { tipo_entrega: "DELIVERY", direccion_entrega: "   " }),
      /dirección de entrega es obligatoria/i
    );

    const switched = await op1Store.updateOrderDetailsAsync(orderId, {
      tipo_entrega: "RETIRO",
      direccion_entrega: ""
    });
    assert.equal(switched.tipo_entrega, "RETIRO");
    assert.equal(switched.direccion_entrega, "");
    const customerRow =
      harness.db.clientes instanceof Map
        ? harness.db.clientes.get("1188886666")
        : Array.isArray(harness.db.clientes)
        ? harness.db.clientes.find((c) => c.telefono === "1188886666")
        : harness.db.clientes?.["1188886666"];
    assert.equal(customerRow?.direccion, "Calle Falsa 123", "Customer directory address must not be wiped on RETIRO switch");
  });

  await t.test("AUD-07/08/09/12 Static SQL migration contract check", () => {
    const migSql = fs.readFileSync(
      path.resolve("supabase/migrations/202611130002_aud_07_09_12_atomic_orders_ratelimit.sql"),
      "utf8"
    );
    assert.ok(migSql.includes("CREATE OR REPLACE FUNCTION public.create_order_atomic"));
    assert.ok(migSql.includes("RATE_LIMIT_UNCONFIGURED"));
    assert.ok(migSql.includes("FOR SHARE"));
    assert.ok(migSql.includes("FOR UPDATE"));
    assert.ok(migSql.includes("version = version + 1"));
    assert.ok(migSql.includes("NEW.fecha := NOW()"));
    assert.ok(migSql.includes("La dirección de entrega es obligatoria"));
  });
});
