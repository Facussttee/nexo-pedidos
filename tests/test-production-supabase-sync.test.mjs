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

  const mockSupabase = {
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
            return {
              eq() {
                return Promise.resolve({ data: [] });
              }
            };
          },
          upsert(payload) {
            upsertedCustomers.push(payload);
            return Promise.resolve({ error: null });
          }
        };
      }

      if (table === "pedidos") {
        return {
          select() {
            return {
              order() {
                return {
                  limit(n) {
                    orderSelectLogs.push({ isGlobal: true, limit: n });
                    return Promise.resolve({ data: [] });
                  }
                };
              },
              eq(col, val) {
                return {
                  order() {
                    return {
                      limit(n) {
                        orderSelectLogs.push({ isGlobal: false, col, val, limit: n });
                        return Promise.resolve({ data: [] });
                      }
                    };
                  }
                };
              }
            };
          },
          insert(payload) {
            insertedOrders.push(payload);
            return {
              select() {
                return Promise.resolve({
                  data: [{ ...payload, id: 501 }],
                  error: null
                });
              }
            };
          },
          upsert(payload) {
            upsertedOrders.push(payload);
            return {
              select() {
                return Promise.resolve({
                  data: [{ ...payload, id: payload.id || 501 }],
                  error: null
                });
              }
            };
          },
          update(payload) {
            return {
              eq(col, val) {
                updatedOrders.push({ payload, col, val });
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
});
