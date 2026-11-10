import test from "node:test";
import assert from "node:assert/strict";

const memStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => memStorage.get(k) ?? null,
  setItem: (k, v) => memStorage.set(k, String(v)),
  removeItem: (k) => memStorage.delete(k),
  clear: () => memStorage.clear()
};

test("Production Supabase Sync Suite", async (t) => {
  const upsertedProducts = [];
  const upsertedOrders = [];
  const insertedOrders = [];
  const updatedOrders = [];
  const upsertedCustomers = [];
  const orderSelectLogs = [];
  const capturedProductHeaders = {};
  const capturedOrderHeaders = [];
  const capturedCustomerHeaders = [];
  const rpcCalls = [];
  let currentServerPin = "1234";

  const mockSupabase = {
    rpc(fnName, args) {
      rpcCalls.push({ fnName, args });
      if (fnName === "update_staff_pin") {
        const { old_pin, new_pin } = args;
        if (old_pin !== currentServerPin) {
          return Promise.resolve({ data: null, error: { message: "PIN actual incorrecto" } });
        }
        if (!/^[0-9]{4,8}$/.test(new_pin)) {
          return Promise.resolve({ data: null, error: { message: "El nuevo PIN debe ser numérico de 4 a 8 dígitos" } });
        }
        if (new_pin === old_pin) {
          return Promise.resolve({ data: null, error: { message: "El nuevo PIN no puede ser igual al actual" } });
        }
        currentServerPin = new_pin;
        return Promise.resolve({
          data: { ok: true, message: "PIN actualizado con éxito" },
          error: null
        });
      }
      return Promise.resolve({ data: null, error: { message: `Unknown RPC ${fnName}` } });
    },
    from(table) {
      if (table === "productos") {
        return {
          select(cols) {
            return {
              order() {
                return Promise.resolve({
                  data: [
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
                  ]
                });
              }
            };
          },
          upsert(payload) {
            const queryPromise = Promise.resolve({ error: null });
            queryPromise.setHeader = (name, val) => {
              capturedProductHeaders[name] = val;
            };
            upsertedProducts.push(payload);
            return queryPromise;
          }
        };
      }

      if (table === "clientes") {
        return {
          select() {
            let captured = {};
            const queryObj = {
              setHeader(name, val) {
                captured[name] = val;
                capturedCustomerHeaders.push({ op: "select", name, val });
                return this;
              },
              eq() {
                return Promise.resolve({ data: [] });
              },
              order() {
                return Promise.resolve({ data: [] });
              },
              then(resolve) {
                resolve({ data: [] });
              }
            };
            return queryObj;
          },
          upsert(payload) {
            let captured = {};
            const queryPromise = Promise.resolve({ error: null });
            queryPromise.setHeader = (name, val) => {
              captured[name] = val;
              capturedCustomerHeaders.push({ op: "upsert", name, val });
              return queryPromise;
            };
            upsertedCustomers.push(payload);
            return queryPromise;
          }
        };
      }

      if (table === "pedidos") {
        return {
          select() {
            let captured = {};
            const builder = {
              setHeader(name, val) {
                captured[name] = val;
                capturedOrderHeaders.push({ op: "select", name, val });
                return this;
              },
              order(col, opts) {
                return {
                  limit(n) {
                    orderSelectLogs.push({ isGlobal: true, limit: n, headers: { ...captured } });
                    return Promise.resolve({ data: [] });
                  }
                };
              },
              eq(col, val) {
                return {
                  order(c, o) {
                    return {
                      limit(n) {
                        orderSelectLogs.push({ isGlobal: false, col, val, limit: n, headers: { ...captured } });
                        return Promise.resolve({ data: [] });
                      }
                    };
                  }
                };
              }
            };
            return builder;
          },
          insert(payload) {
            let captured = {};
            insertedOrders.push(payload);
            const queryObj = {
              setHeader(name, val) {
                captured[name] = val;
                capturedOrderHeaders.push({ op: "insert", name, val });
                return this;
              },
              select() {
                return Promise.resolve({
                  data: [{ ...payload, id: 501 }],
                  error: null
                });
              }
            };
            return queryObj;
          },
          upsert(payload) {
            let captured = {};
            upsertedOrders.push(payload);
            const queryObj = {
              setHeader(name, val) {
                captured[name] = val;
                capturedOrderHeaders.push({ op: "upsert", name, val });
                return this;
              },
              select() {
                return Promise.resolve({
                  data: [{ ...payload, id: payload.id || 501 }],
                  error: null
                });
              }
            };
            return queryObj;
          },
          update(payload) {
            let captured = {};
            return {
              setHeader(name, val) {
                captured[name] = val;
                capturedOrderHeaders.push({ op: "update", name, val });
                return this;
              },
              eq(col, val) {
                updatedOrders.push({ payload, col, val, headers: { ...captured } });
                return {
                  then(resolve) {
                    resolve({ data: null, error: null });
                  }
                };
              }
            };
          }
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
    channel() {
      return {
        on() {
          return this;
        },
        subscribe() {
          return {};
        }
      };
    },
    removeChannel() {}
  };

  globalThis.window = {
    supabase: {
      createClient: () => mockSupabase
    },
    addEventListener() {},
    location: { search: "" }
  };

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
    supabaseUrl: "https://test.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.mock",
    storageKeys: {
      PREFIX: "nexo_test_",
      PRODUCTS: "nexo_test_products",
      ORDERS: "nexo_test_orders",
      CUSTOMERS: "nexo_test_customers",
      CURRENT_USER: "nexo_test_current_user",
      CART: "nexo_test_cart",
      ACTIVE_ORDER: "nexo_test_active_order",
      LOCAL_SETTINGS: "nexo_test_local_settings",
      PIN_UNLOCKED: "nexo_test_pin_unlocked",
      SIMULATED_MESSAGES: "nexo_test_simulated_messages",
      THEME: "nexo_test_theme"
    }
  };

  const store = new Store(prodConfig);

  // Wait for initSupabaseConnection to complete
  await new Promise((r) => setTimeout(r, 50));

  await t.test("1. pullFromSupabase populates catalog with all fields", async () => {
    await store.pullFromSupabase();
    const products = store.getAdminProducts();
    assert.equal(products.length, 1);
    assert.equal(products[0].id, "prod-cloud-1");
    assert.equal(products[0].nombre, "Manzana Roja Cloud");
    assert.equal(products[0].precio, 2500);
    assert.equal(products[0].codigo, "MANZ-01");
  });

  await t.test("2. Admin adds a product and it syncs with x-nexo-staff-pin header", async () => {
    const draft = {
      nombre: "Pera Williams",
      categoria: "Frutas",
      unidad_medida: "KG",
      precio: 3000,
      paso: 0.5,
      codigo: "PERA-01",
      detalle: "Fresco del valle"
    };

    const saved = store.saveProduct(draft);
    assert.ok(saved.id);
    assert.equal(saved.nombre, "Pera Williams");

    await new Promise((r) => setTimeout(r, 20));

    assert.equal(upsertedProducts.length, 1);
    assert.equal(upsertedProducts[0].id, saved.id);
    assert.equal(upsertedProducts[0].nombre, "Pera Williams");
    assert.equal(upsertedProducts[0].precio, 3000);
    assert.equal(upsertedProducts[0].codigo, "PERA-01");
    assert.equal(upsertedProducts[0].archivado, false);
    assert.equal(capturedProductHeaders["x-nexo-staff-pin"], "1234", "Must include staff PIN header");
  });

  await t.test("3. Admin archives a product and it syncs to Supabase", async () => {
    const products = store.getAdminProducts();
    const toArchive = products.find((p) => p.nombre === "Pera Williams");
    assert.ok(toArchive);

    store.archiveProduct(toArchive.id, true);
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(upsertedProducts.length, 2);
    assert.equal(upsertedProducts[1].id, toArchive.id);
    assert.equal(upsertedProducts[1].archivado, true);
  });

  await t.test("4. Client places order in production mode and it uploads to Supabase", async () => {
    const products = store.getProducts();
    const available = products.find((p) => p.id === "prod-cloud-1");
    assert.ok(available, "Product prod-cloud-1 should be available");

    store.addToCart("prod-cloud-1", 1.5);
    const cartSummary = store.getCartSummary();
    assert.equal(cartSummary.totalItems, 1);

    const client = {
      nombre: "Carlos Gómez",
      telefono: "1155667788",
      direccion: "Calle Falsa 123"
    };

    const createdOrder = store.createOrder({
      cliente: client,
      tipo_entrega: "DELIVERY",
      direccion_entrega: client.direccion
    });

    assert.ok(createdOrder);
    assert.equal(createdOrder.estado, "PENDIENTE");

    // Wait for async syncOrderToSupabase
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Clientes upserted
    assert.equal(upsertedCustomers.length, 1);
    assert.equal(upsertedCustomers[0].telefono, "1155667788");
    assert.equal(upsertedCustomers[0].nombre, "Carlos Gómez");

    // Pedidos inserted
    assert.equal(insertedOrders.length, 1);
    assert.equal(insertedOrders[0].cliente_nombre, "Carlos Gómez");
    assert.equal(insertedOrders[0].cliente_telefono, "1155667788");
    assert.equal(insertedOrders[0].tipo_entrega, "DELIVERY");

    // Order ID updated with server-assigned serial ID
    assert.equal(createdOrder.id, 501);
  });

  await t.test("5. Operator updates order status and it syncs to Supabase", async () => {
    store.updateOrderStatus(501, "EN_PREPARACION");
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.ok(upsertedOrders.length >= 1);
    const lastUpsert = upsertedOrders[upsertedOrders.length - 1];
    assert.equal(lastUpsert.id, 501);
    assert.equal(lastUpsert.estado, "EN_PREPARACION");
  });

  await t.test("6. Client pullFromSupabase queries only their own phone without staff unlock", async () => {
    orderSelectLogs.length = 0;
    store.lockStaff();
    assert.equal(store.isStaffUnlocked(), false);

    store.setCurrentUser({ telefono: "1155667788", nombre: "Carlos Gómez" });
    await store.pullFromSupabase();

    assert.equal(orderSelectLogs.length, 1);
    assert.equal(orderSelectLogs[0].isGlobal, false, "Client without staff unlock must not query global orders");
    assert.equal(orderSelectLogs[0].col, "cliente_telefono");
    assert.equal(orderSelectLogs[0].val, "1155667788");
  });

  await t.test("7. Staff unlock queries all orders globally for Kanban", async () => {
    orderSelectLogs.length = 0;
    assert.ok(store.verifyStaffPin("1234"));
    assert.equal(store.isStaffUnlocked(), true);

    await store.pullFromSupabase();

    assert.equal(orderSelectLogs.length, 1);
    assert.equal(orderSelectLogs[0].isGlobal, true, "Staff unlocked must query all 50 global orders");
    assert.equal(orderSelectLogs[0].limit, 50);

    store.lockStaff();
  });

  await t.test("8. PIN anti-bruteforce lockout triggers after 5 failed attempts", async () => {
    store.lockStaff();
    assert.equal(store.isPinLockedOut(), false);

    for (let i = 0; i < 4; i++) {
      assert.equal(store.verifyStaffPin("0000"), false);
      assert.equal(store.isPinLockedOut(), false);
    }
    // 5th failed attempt triggers 30s lockout
    assert.equal(store.verifyStaffPin("0000"), false);
    assert.equal(store.isPinLockedOut(), true);
    assert.ok(store.getPinLockoutRemainingSeconds() > 0);

    // Even with correct PIN, verification fails while locked out
    assert.equal(store.verifyStaffPin("1234"), false);

    // Reset lockout for further test cleanliness
    store.pinLockoutUntil = 0;
    store.pinFailedAttempts = 0;
    assert.equal(store.isPinLockedOut(), false);
    assert.equal(store.verifyStaffPin("1234"), true);
    store.lockStaff();
  });

  await t.test("9. deleteOrder performs soft cancellation (CANCELADO) in cloud", async () => {
    updatedOrders.length = 0;
    store.deleteOrder(501);

    assert.equal(updatedOrders.length, 1);
    assert.equal(updatedOrders[0].payload.estado, "CANCELADO");
    assert.equal(updatedOrders[0].val, 501);
  });

  await t.test("10. Client order queries and soft cancellation include x-nexo-client-phone header", async () => {
    capturedOrderHeaders.length = 0;
    store.lockStaff();
    store.setCurrentUser({ telefono: "1155667788", nombre: "Carlos Gómez" });

    // Client pullFromSupabase
    await store.pullFromSupabase();
    const clientSelect = capturedOrderHeaders.find((h) => h.op === "select" && h.name === "x-nexo-client-phone");
    assert.ok(clientSelect, "Client select query must include x-nexo-client-phone header");
    assert.equal(clientSelect.val, "1155667788");

    // Client deleteOrder (cancellation)
    capturedOrderHeaders.length = 0;
    store.deleteOrder(501);
    const clientUpdate = capturedOrderHeaders.find((h) => h.op === "update" && h.name === "x-nexo-client-phone");
    assert.ok(clientUpdate, "Client cancellation must include x-nexo-client-phone header");
    assert.equal(clientUpdate.val, "1155667788");
  });

  await t.test("11. Staff order queries and updates include x-nexo-staff-pin header", async () => {
    capturedOrderHeaders.length = 0;
    assert.ok(store.verifyStaffPin("1234"));

    // Staff pullFromSupabase
    await store.pullFromSupabase();
    const staffSelect = capturedOrderHeaders.find((h) => h.op === "select" && h.name === "x-nexo-staff-pin");
    assert.ok(staffSelect, "Staff select query must include x-nexo-staff-pin header");
    assert.equal(staffSelect.val, "1234");

    // Staff creates and updates order
    store.addToCart("prod-cloud-1", 1);
    const newStaffOrder = store.createOrder({
      cliente: { nombre: "Staff Test", telefono: "1199887766", direccion: "Mostrador" },
      tipo_entrega: "RETIRO"
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    capturedOrderHeaders.length = 0;
    store.updateOrderStatus(newStaffOrder.id, "EN_PREPARACION");
    await new Promise((resolve) => setTimeout(resolve, 50));
    const staffUpsert = capturedOrderHeaders.find((h) => h.op === "upsert" && h.name === "x-nexo-staff-pin");
    assert.ok(staffUpsert, "Staff status update must include x-nexo-staff-pin header");
    assert.equal(staffUpsert.val, "1234");

    store.lockStaff();
  });

  await t.test("12. updateStaffPin successfully calls update_staff_pin RPC and updates local PIN in production", async () => {
    rpcCalls.length = 0;
    const res = await store.updateStaffPin("1234", "5678");
    assert.ok(res);
    assert.equal(res.ok, true);
    assert.equal(store.getLocalSettings().staffPin, "5678");
    assert.equal(rpcCalls.length, 1);
    assert.equal(rpcCalls[0].fnName, "update_staff_pin");
    assert.equal(rpcCalls[0].args.old_pin, "1234");
    assert.equal(rpcCalls[0].args.new_pin, "5678");
  });

  await t.test("13. updateStaffPin validates PIN inputs and propagates RPC errors for invalid current PIN", async () => {
    // Missing old PIN
    await assert.rejects(
      async () => await store.updateStaffPin("", "9999"),
      /Ingresá el PIN actual/
    );

    // Invalid new PIN format (non-numeric or length < 4 or > 8)
    await assert.rejects(
      async () => await store.updateStaffPin("5678", "12"),
      /El nuevo PIN debe ser numérico de 4 a 8 dígitos/
    );
    await assert.rejects(
      async () => await store.updateStaffPin("5678", "abcd"),
      /El nuevo PIN debe ser numérico de 4 a 8 dígitos/
    );

    // Same PIN as current
    await assert.rejects(
      async () => await store.updateStaffPin("5678", "5678"),
      /El nuevo PIN no puede ser igual al actual/
    );

    // Wrong old PIN rejected by server RPC
    await assert.rejects(
      async () => await store.updateStaffPin("0000", "9999"),
      /PIN actual incorrecto/
    );
  });

  await t.test("14. updateStaffPin in demo mode updates localSettings without cloud calls", async () => {
    rpcCalls.length = 0;
    const demoConfig = {
      mode: "demo",
      ok: true,
      errors: [],
      warnings: [],
      business: { name: "Demo", alias: "demo", whatsapp: "5491111111111", whatsappDisplay: "+54 11 1111-1111" },
      storageKeys: prodConfig.storageKeys
    };
    const demoStore = new Store(demoConfig);
    demoStore.saveLocalSettings({ staffPin: "4321" });

    // Wrong old PIN
    await assert.rejects(
      async () => await demoStore.updateStaffPin("0000", "8888"),
      /PIN actual incorrecto/
    );

    // Valid update
    const res = await demoStore.updateStaffPin("4321", "8888");
    assert.equal(res.ok, true);
    assert.equal(demoStore.getLocalSettings().staffPin, "8888");
    assert.equal(rpcCalls.length, 0, "Demo mode must not call cloud RPC");
  });
});
