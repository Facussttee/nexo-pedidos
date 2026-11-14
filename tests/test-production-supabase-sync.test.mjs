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

test("Production Supabase Sync Suite (AUD-04..12 aligned)", async (t) => {
  const harness = createDisposableSupabaseHarness({
    targetUrl: "http://127.0.0.1:54321",
    anonKey: "sb_publishable_local_disposable_anon_key",
    products: [
      {
        id: "prod-cloud-1",
        nombre: "Manzana Roja Cloud",
        categoria: "Frutas",
        unidad_medida: "KG",
        precio: 2500,
        disponible: true,
        paso: 0.5,
        codigo: "MANZ-01",
        detalle: "Muy ricas",
        archivado: false,
        imagen_id: null
      }
    ],
    staffUsers: [
      {
        user_id: "11111111-1111-4111-8111-111111111111",
        email: "dueno@local.test",
        password: "OwnerPassword!2026",
        role: "owner",
        active: true
      },
      {
        user_id: "22222222-2222-4222-8222-222222222222",
        email: "operario@local.test",
        password: "OperatorPassword!2026",
        role: "operator",
        active: true
      }
    ]
  });

  assert.equal(harness.isRealPostgresRls, false);

  const clientSupa = harness.createClient({ sourceKey: "source:client-browser" });
  const staffSupa = harness.createClient({ sourceKey: "source:staff-browser" });

  let activeFactoryClient = clientSupa;
  globalThis.window = {
    supabase: {
      createClient: () => activeFactoryClient
    },
    addEventListener() {},
    location: { search: "", hash: "" }
  };

  const { buildStorageKeys } = await import("../js/config.js");
  const { Store } = await import("../js/store.js");

  const prodConfig = {
    mode: "production",
    ok: true,
    errors: [],
    warnings: [],
    business: {
      name: "Comercio Producción",
      alias: "comercio.prod",
      whatsapp: "5491199998888",
      whatsappDisplay: "+54 11 9999-8888"
    },
    supabaseUrl: "http://127.0.0.1:54321",
    supabaseAnonKey: "sb_publishable_local_disposable_anon_key",
    storageKeys: buildStorageKeys("production")
  };

  function makeStoragePrefix(prefix) {
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

  activeFactoryClient = staffSupa;
  const staffStore = new Store({ ...prodConfig, storageKeys: makeStoragePrefix("nexo_staff_test_") });
  await new Promise((r) => setTimeout(r, 40));

  activeFactoryClient = clientSupa;
  const clientStore = new Store({ ...prodConfig, storageKeys: makeStoragePrefix("nexo_client_test_") });
  await new Promise((r) => setTimeout(r, 40));

  await t.test("1. Anonymous pullFromSupabase populates catalog without querying pedidos/clientes", async () => {
    harness.logs.orderSelects.length = 0;
    harness.logs.customerQueries.length = 0;
    harness.logs.realtimeSubscriptions.length = 0;

    await clientStore.pullFromSupabase();
    const products = clientStore.getAdminProducts();
    assert.equal(products.length, 1);
    assert.equal(products[0].id, "prod-cloud-1");
    assert.equal(products[0].nombre, "Manzana Roja Cloud");
    assert.equal(products[0].precio, 2500);
    assert.equal(products[0].codigo, "MANZ-01");

    assert.equal(harness.logs.orderSelects.length, 0, "Anon client must never query pedidos table directly");
    assert.equal(harness.logs.customerQueries.length, 0, "Anon client must never query clientes table directly");
    assert.equal(
      harness.logs.realtimeSubscriptions.some((s) => s.table === "pedidos"),
      false,
      "Anon client must not attach realtime listener on pedidos"
    );
  });

  await t.test("2. Owner signs in via Auth and saves product without x-nexo-staff-pin header", async () => {
    await staffStore.signInStaff("dueno@local.test", "OwnerPassword!2026");
    assert.equal(staffStore.isStaffUnlocked(), true);
    assert.equal(staffStore.getStaffRole(), "owner");

    const draft = {
      nombre: "Pera Williams",
      categoria: "Frutas",
      unidad_medida: "KG",
      precio: 3000,
      paso: 0.5,
      codigo: "PERA-01",
      detalle: "Fresco del valle"
    };

    const saved = await staffStore.saveProductAsync(draft);
    assert.ok(saved.id);
    assert.equal(saved.nombre, "Pera Williams");

    assert.equal(harness.logs.productUpserts.length, 1);
    assert.equal(harness.logs.productUpserts[0].id, saved.id);
    assert.equal(harness.logs.productUpserts[0].nombre, "Pera Williams");
    assert.equal(harness.logs.productUpserts[0].precio, 3000);
    assert.equal(harness.logs.productUpserts[0].codigo, "PERA-01");
    assert.equal(harness.logs.productUpserts[0].archivado, false);
    assert.equal(harness.logs.capturedHeaders["x-nexo-staff-pin"], undefined, "Must never use legacy PIN header");
  });

  await t.test("3. Owner archives a product and it syncs to Supabase", async () => {
    const products = staffStore.getAdminProducts();
    const toArchive = products.find((p) => p.nombre === "Pera Williams");
    assert.ok(toArchive);

    await staffStore.archiveProductAsync(toArchive.id, true);

    assert.equal(harness.logs.productUpserts.length, 2);
    assert.equal(harness.logs.productUpserts[1].id, toArchive.id);
    assert.equal(harness.logs.productUpserts[1].archivado, true);
  });

  await t.test("4. Client places atomic order via submitOrder; sync createOrder rejects in production", async () => {
    await clientStore.pullFromSupabase();
    assert.equal(
      clientStore.getAdminProducts().some((p) => p.nombre === "Pera Williams"),
      false,
      "Anon catalog query must not expose archived products"
    );

    clientStore.addToCart("prod-cloud-1", 1.5);
    assert.equal(clientStore.getCartSummary().totalItems, 1);

    const client = {
      nombre: "Carlos Gómez",
      telefono: "1155667788",
      direccion: "Calle Falsa 123"
    };

    assert.throws(
      () =>
        clientStore.createOrder({
          cliente: client,
          tipo_entrega: "DELIVERY",
          direccion_entrega: client.direccion
        }),
      /atómica/i
    );

    const res = await clientStore.submitOrder({
      cliente: client,
      tipo_entrega: "DELIVERY",
      direccion_entrega: client.direccion
    });

    assert.equal(res.ok, true);
    assert.equal(res.status, "confirmed");
    assert.equal(res.order.id, 501);
    assert.equal(res.order.estado, "PENDIENTE");
    assert.ok(res.trackingToken && res.trackingToken.length >= 32);
    assert.ok(res.trackingLink.includes(`#track=${res.order.id}:`));
    assert.equal(harness.db.pedidos.length, 1);
    assert.equal(harness.db.clientes.get("1155667788")?.nombre, "Carlos Gómez");
  });

  await t.test("5. Operator updates order via RPC and cannot write productos", async () => {
    await staffStore.logoutStaff();
    await staffStore.signInStaff("operario@local.test", "OperatorPassword!2026");
    assert.equal(staffStore.getStaffRole(), "operator");

    await assert.rejects(
      async () =>
        staffStore.saveProductAsync({
          nombre: "Intento Ilegal",
          categoria: "Frutas",
          unidad_medida: "KG",
          precio: 100,
          paso: 0.5
        }),
      /dueño/i
    );

    const taken = await staffStore.takeOrderAsync(501);
    assert.equal(taken.id, 501);
    assert.equal(taken.estado, "EN_PREPARACION");
    assert.equal(taken.version, 2);
  });

  await t.test("6. Anon client pullFromSupabase refreshes only via tracking token RPC", async () => {
    harness.logs.orderSelects.length = 0;
    harness.logs.rpcCalls.length = 0;

    await clientStore.pullFromSupabase();

    assert.equal(harness.logs.orderSelects.length, 0, "Client must not query pedidos table directly");
    const trackingCalls = harness.logs.rpcCalls.filter((c) => c.name === "get_order_by_tracking_token");
    assert.equal(trackingCalls.length, 1);
    assert.equal(clientStore.getOrdersByCustomer("1155667788")[0].estado, "EN_PREPARACION");
  });

  await t.test("7. Authenticated staff pullFromSupabase queries global Kanban orders", async () => {
    harness.logs.orderSelects.length = 0;
    await staffStore.pullFromSupabase();

    assert.equal(harness.logs.orderSelects.length, 1);
    assert.equal(harness.logs.orderSelects[0].isGlobal, true);
    assert.equal(harness.logs.orderSelects[0].limit, 50);
  });

  await t.test("8. Production rejects PIN bypass; Demo retains anti-bruteforce PIN lockout", async () => {
    assert.equal(clientStore.verifyStaffPin("1234"), false, "Production must ignore shared PIN");

    const demoStore = new Store({
      ...prodConfig,
      mode: "demo",
      supabaseUrl: "",
      supabaseAnonKey: "",
      storageKeys: buildStorageKeys("demo")
    });
    demoStore.lockStaff();
    assert.equal(demoStore.isPinLockedOut(), false);
    for (let i = 0; i < 4; i++) {
      assert.equal(demoStore.verifyStaffPin("0000"), false);
      assert.equal(demoStore.isPinLockedOut(), false);
    }
    assert.equal(demoStore.verifyStaffPin("0000"), false);
    assert.equal(demoStore.isPinLockedOut(), true);
    assert.ok(demoStore.getPinLockoutRemainingSeconds() > 0);
    assert.equal(demoStore.verifyStaffPin("1234"), false);
  });

  await t.test("9. Operator performs soft cancellation (CANCELADO) via RPC without deleting", async () => {
    const cancelled = await staffStore.cancelOrderAsync(501);
    assert.equal(cancelled.id, 501);
    assert.equal(cancelled.estado, "CANCELADO");
    assert.ok(cancelled.cancelado_at);
    assert.equal(harness.db.pedidos.length, 1);
  });
});
