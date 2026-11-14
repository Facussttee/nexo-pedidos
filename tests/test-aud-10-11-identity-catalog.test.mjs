import test from "node:test";
import assert from "node:assert/strict";
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

test("AUD-10 / AUD-11 — Phone Normalization, Identity Separation & Catalog Sync", async (t) => {
  const harness = createDisposableSupabaseHarness({
    products: [
      {
        id: "prod-a",
        nombre: "Naranja Jugo",
        categoria: "Frutas",
        unidad_medida: "KG",
        precio: 1800,
        disponible: true,
        paso: 0.5,
        archivado: false
      },
      {
        id: "prod-b",
        nombre: "Espinaca",
        categoria: "Verduras",
        unidad_medida: "UNIDAD",
        precio: 1100,
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
      }
    ]
  });

  const clientSupa = harness.createClient({ sourceKey: "source:client-id-cat" });
  const ownerSupa = harness.createClient({ sourceKey: "source:owner-id-cat" });
  let nextClient = clientSupa;

  globalThis.window = {
    supabase: { createClient: () => nextClient },
    addEventListener() {},
    location: { search: "", hash: "" }
  };

  const { Store, normalizeArPhone } = await import("../js/store.js");
  const baseProdConfig = {
    mode: "production",
    ok: true,
    errors: [],
    warnings: [],
    business: { name: "Comercio Local", alias: "comercio.local", whatsapp: "5491100000001" },
    supabaseUrl: "http://127.0.0.1:54321",
    supabaseAnonKey: "sb_publishable_local_disposable_anon_key"
  };

  const clientStore = new Store({ ...baseProdConfig, storageKeys: makePrefixKeys("nexo_a10_cli_") });
  nextClient = ownerSupa;
  const ownerStore = new Store({ ...baseProdConfig, storageKeys: makePrefixKeys("nexo_a10_own_") });
  await new Promise((r) => setTimeout(r, 40));

  await t.test("AUD-10.1 AR area-code collision guard (distinct areas never collide on 8 trailing digits)", () => {
    assert.equal(clientStore.isSameCustomer("1133334444", "2233334444"), false);
    assert.equal(clientStore.isSameCustomer("1133334444", "3513334444"), false);
    assert.equal(clientStore.isSameCustomer("0341-444-5566", "0351-444-5566"), false);

    // Ambiguous 8-digit or 15-prefixed numbers NEVER match canonical 10-digit numbers
    assert.equal(normalizeArPhone("33334444").ok, false);
    assert.equal(normalizeArPhone("1533334444").ok, false);
    assert.equal(clientStore.isSameCustomer("33334444", "1133334444"), false);
    assert.equal(clientStore.isSameCustomer("1533334444", "1133334444"), false);
  });

  await t.test("AUD-10.2 Equivalent AR phone variants normalize identically (AMBA, 3-digit & 4-digit codes)", () => {
    const ambaVariants = [
      "1133334444",
      "+54 9 11 3333-4444",
      "5491133334444",
      "011-15-3333-4444",
      "0054 9 11 3333 4444",
      "54 11 3333 4444",
      "(011) 3333-4444"
    ];
    for (const variant of ambaVariants) {
      const res = normalizeArPhone(variant);
      assert.equal(res.ok, true, `Expected valid AR phone for ${variant}`);
      assert.equal(res.normalized, "1133334444");
      assert.equal(clientStore.isSameCustomer("1133334444", variant), true);
    }

    const cordobaVariants = ["3514445566", "0351-15-444-5566", "+54 9 351 444-5566", "54 351 444 5566"];
    for (const variant of cordobaVariants) {
      const res = normalizeArPhone(variant);
      assert.equal(res.ok, true, `Expected valid Córdoba phone for ${variant}`);
      assert.equal(res.normalized, "3514445566");
    }

    const viedmaVariants = ["2920445566", "02920-15-445566", "+54 9 2920 44-5566"];
    for (const variant of viedmaVariants) {
      const res = normalizeArPhone(variant);
      assert.equal(res.ok, true, `Expected valid Viedma phone for ${variant}`);
      assert.equal(res.normalized, "2920445566");
    }
  });

  await t.test("AUD-10.3 Production client saveCustomer does not write server clientes table and ?tel= never auto-logs in", () => {
    harness.logs.customerQueries.length = 0;
    const profile = clientStore.saveCustomer({
      telefono: "+54 9 11 6666-7777",
      nombre: "Lucía Local",
      direccion: "Belgrano 100"
    });
    assert.equal(profile.telefono, "1166667777");
    assert.equal(harness.db.clientes.has("1166667777"), false, "Production anon client profile stays local until order");
    assert.equal(harness.logs.customerQueries.length, 0);

    globalThis.window.location.search = "?tel=1122223333";
    nextClient = clientSupa;
    const linkStore = new Store({
      ...baseProdConfig,
      mode: "demo",
      supabaseUrl: "",
      supabaseAnonKey: "",
      storageKeys: makePrefixKeys("nexo_a10_link_")
    });
    assert.equal(linkStore.getCurrentUser(), null);
    assert.equal(linkStore.prefilledPhone, "1122223333");
    globalThis.window.location.search = "";
  });

  await t.test("AUD-11.1 Query failure surfaces syncError without wiping valid local catalog", async () => {
    await clientStore.pullFromSupabase();
    assert.equal(clientStore.getProducts().length, 2);
    assert.equal(clientStore.getSyncError(), null);

    let syncErrorEvent = null;
    const unsub = clientStore.subscribe((evt, msg) => {
      if (evt === "sync_error") syncErrorEvent = msg;
    });

    harness.setNextTableFault("productos", "error");
    await clientStore.pullFromSupabase();
    unsub();

    assert.ok(clientStore.getSyncError(), "Failed catalog query MUST expose syncError");
    assert.ok(syncErrorEvent, "sync_error notification must fire");
    assert.equal(clientStore.getProducts().length, 2, "Transient error must not destroy cached products");

    // Checkout blocks cleanly when syncError is active
    clientStore.addToCart("prod-a", 1);
    const blocked = await clientStore.submitOrder({
      cliente: { nombre: "Lucía Local", telefono: "1166667777", direccion: "" },
      tipo_entrega: "RETIRO"
    });
    assert.equal(blocked.ok, false);

    // Next clean pull clears syncError
    await clientStore.pullFromSupabase();
    assert.equal(clientStore.getSyncError(), null);
    clientStore.clearCart();
  });

  await t.test("AUD-11.2 Populated -> Empty [] catalog replacement purges stale items and blocks stale cart", async () => {
    clientStore.clearCart();
    await clientStore.pullFromSupabase();
    assert.equal(clientStore.getProducts().length, 2);
    clientStore.addToCart("prod-a", 1);

    // Owner archives all products on server
    await ownerStore.signInStaff("owner@local.test", "OwnerStrongPassword!1");
    await ownerStore.archiveProductAsync("prod-a", true);
    await ownerStore.archiveProductAsync("prod-b", true);

    await clientStore.pullFromSupabase();
    assert.equal(clientStore.getProducts().length, 0, "Empty remote array [] MUST replace populated local cache");

    const issues = clientStore.getCartAvailabilityIssues();
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /ya no forma parte|archivado/i);

    const rejected = await clientStore.submitOrder({
      cliente: { nombre: "Lucía Local", telefono: "1166667777", direccion: "" },
      tipo_entrega: "RETIRO"
    });
    assert.equal(rejected.ok, false);
    assert.equal(rejected.status, "failed");
    assert.equal(clientStore.getCartSummary().totalItems, 1, "Cart stays inspectable so client can remove stale item");
  });
});
