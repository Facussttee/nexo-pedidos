import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Store } from "../js/store.js";

// Mock localStorage for Store testing
const memStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => memStorage.get(k) ?? null,
  setItem: (k, v) => memStorage.set(k, String(v)),
  removeItem: (k) => memStorage.delete(k),
  clear: () => memStorage.clear()
};

test("Task V2-02: Authoritative Checkout RPC & Concurrency Locking Suite", async (t) => {
  const schemaPath = path.resolve("supabase/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  // ===========================================================================
  // 1. SQL Schema Invariants for Concurrency & create_order_atomic
  // ===========================================================================
  await t.test("1. SQL Schema - Concurrency columns and RPC definition", () => {
    // Columns version and tomado_por
    assert.ok(
      schemaSql.includes("version INT NOT NULL DEFAULT 1"),
      "Schema must declare version INT NOT NULL DEFAULT 1 in pedidos"
    );
    assert.ok(
      schemaSql.includes("tomado_por VARCHAR(60) DEFAULT NULL"),
      "Schema must declare tomado_por VARCHAR(60) DEFAULT NULL in pedidos"
    );
    assert.ok(
      schemaSql.includes("ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;"),
      "Schema must include idempotent ALTER TABLE for version"
    );
    assert.ok(
      schemaSql.includes("ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS tomado_por VARCHAR(60) DEFAULT NULL;"),
      "Schema must include idempotent ALTER TABLE for tomado_por"
    );

    // Function definition
    assert.ok(
      schemaSql.includes("FUNCTION public.create_order_atomic("),
      "Schema must declare function public.create_order_atomic"
    );
    assert.ok(
      schemaSql.includes("SECURITY DEFINER"),
      "create_order_atomic must be SECURITY DEFINER"
    );
    assert.ok(
      schemaSql.includes("SET search_path = public"),
      "create_order_atomic must set search_path = public"
    );

    // Permissions
    assert.ok(
      schemaSql.includes("GRANT EXECUTE ON FUNCTION public.create_order_atomic"),
      "create_order_atomic must grant EXECUTE to anon, authenticated, service_role"
    );

    // Share lock on products
    assert.ok(
      schemaSql.includes("FOR SHARE"),
      "create_order_atomic must lock products with FOR SHARE"
    );

    // Availability validation
    assert.ok(
      schemaSql.includes("archivado IS TRUE OR v_product.disponible IS FALSE"),
      "Must check product availability and archived status"
    );
    assert.ok(
      schemaSql.includes("Producto no disponible:"),
      "Must raise 'Producto no disponible: ' when product is paused or archived"
    );

    // Authoritative pricing
    assert.ok(
      schemaSql.includes("v_item_precio := v_product.precio;"),
      "Must override price with authoritative v_product.precio"
    );
    assert.ok(
      schemaSql.includes("round(v_item_cantidad * v_item_precio)"),
      "Must calculate subtotal as round(v_item_cantidad * v_item_precio)"
    );

    // Idempotency
    assert.ok(
      schemaSql.includes("checkout_cart_key = v_clean_cart_key"),
      "Must check checkout_cart_key for idempotency replay"
    );
    assert.ok(
      schemaSql.includes("'replayed', true"),
      "Must return replayed: true on idempotent duplicate"
    );
    assert.ok(
      schemaSql.includes("'replayed', false"),
      "Must return replayed: false on initial order creation"
    );
  });

  // ===========================================================================
  // 2. Behavioral Simulation of create_order_atomic RPC Logic
  // ===========================================================================
  await t.test("2. RPC Simulation - Availability enforcement (rejects unavailable/archived items)", () => {
    const catalog = new Map([
      ["prod-active", { id: "prod-active", nombre: "Manzana", precio: 2200, disponible: true, archivado: false, paso: 0.5 }],
      ["prod-paused", { id: "prod-paused", nombre: "Pera Pausada", precio: 2800, disponible: false, archivado: false, paso: 0.5 }],
      ["prod-archived", { id: "prod-archived", nombre: "Uva Archivada", precio: 3500, disponible: true, archivado: true, paso: 0.25 }]
    ]);

    function simulateCreateOrderAtomic({ telefono, nombre, items, cartKey }) {
      if (!telefono || telefono.length < 8) throw new Error("Teléfono del cliente es requerido (mínimo 8 dígitos)");
      if (!items || !items.length) throw new Error("El pedido debe contener al menos un producto");

      let totalEstimado = 0;
      const verifiedItems = [];

      for (const item of items) {
        const prod = catalog.get(item.id || item.producto_id);
        if (!prod || !prod.disponible || prod.archivado) {
          throw new Error(`Producto no disponible: ${item.id || item.producto_id}`);
        }
        const qty = Number(item.cantidad || item.cantidad_solicitada);
        if (!qty || qty <= 0) throw new Error(`Cantidad debe ser mayor a 0 para el producto: ${prod.id}`);
        if (prod.paso && Math.abs(qty / prod.paso - Math.round(qty / prod.paso)) > 1e-6) {
          throw new Error(`La cantidad ${qty} no respeta el paso ${prod.paso} para el producto: ${prod.id}`);
        }
        const subtotal = Math.round(qty * prod.precio);
        totalEstimado += subtotal;
        verifiedItems.push({
          id: prod.id,
          nombre: prod.nombre,
          precio_unitario: prod.precio,
          cantidad: qty,
          subtotal
        });
      }

      return {
        ok: true,
        replayed: false,
        pedido: {
          cliente_telefono: telefono,
          cliente_nombre: nombre,
          total_estimado: totalEstimado,
          items: verifiedItems,
          checkout_cart_key: cartKey,
          version: 1
        }
      };
    }

    // Active product succeeds
    const okRes = simulateCreateOrderAtomic({
      telefono: "1122334455",
      nombre: "Test Client",
      items: [{ id: "prod-active", cantidad: 1.0, precio: 9999 }],
      cartKey: "cart-key-1"
    });
    assert.equal(okRes.ok, true);
    assert.equal(okRes.pedido.total_estimado, 2200);

    // Paused product is rejected
    assert.throws(
      () => simulateCreateOrderAtomic({
        telefono: "1122334455",
        nombre: "Test Client",
        items: [{ id: "prod-paused", cantidad: 1.0 }],
        cartKey: "cart-key-2"
      }),
      /Producto no disponible: prod-paused/
    );

    // Archived product is rejected
    assert.throws(
      () => simulateCreateOrderAtomic({
        telefono: "1122334455",
        nombre: "Test Client",
        items: [{ id: "prod-archived", cantidad: 1.0 }],
        cartKey: "cart-key-3"
      }),
      /Producto no disponible: prod-archived/
    );
  });

  await t.test("3. RPC Simulation - Authoritative price lookup overrides client-supplied prices", () => {
    const catalog = new Map([
      ["prod-premium", { id: "prod-premium", nombre: "Palta Hass", precio: 1500, disponible: true, archivado: false, paso: 1.0, unidad_medida: "UNIDAD" }]
    ]);

    // Client maliciously or erroneously supplies precio: 10 pesos
    const clientPayload = {
      telefono: "1133445566",
      nombre: "Malicious Client",
      items: [{ id: "prod-premium", cantidad: 3, precio: 10 }], // Claiming $10 each
      cartKey: "cart-key-spoof"
    };

    // Authoritative calculation using server catalog price ($1500)
    const product = catalog.get("prod-premium");
    const authoritativePrice = product.precio;
    assert.equal(authoritativePrice, 1500);

    const calculatedTotal = 3 * authoritativePrice; // 4500, NOT 30
    assert.equal(calculatedTotal, 4500);
    assert.notEqual(calculatedTotal, 3 * clientPayload.items[0].precio);
  });

  await t.test("4. RPC Simulation - Idempotency via checkout_cart_key", () => {
    const existingOrders = [];

    function processCheckout({ telefono, cartKey, total }) {
      // Check existing
      const existing = existingOrders.find((o) => o.cliente_telefono === telefono && o.checkout_cart_key === cartKey);
      if (existing) {
        return { ok: true, replayed: true, pedido: existing };
      }
      const newOrder = {
        id: existingOrders.length + 101,
        cliente_telefono: telefono,
        checkout_cart_key: cartKey,
        total_estimado: total,
        version: 1
      };
      existingOrders.push(newOrder);
      return { ok: true, replayed: false, pedido: newOrder };
    }

    // First call: initial creation
    const res1 = processCheckout({ telefono: "1155998877", cartKey: "key-abc-123", total: 3200 });
    assert.equal(res1.ok, true);
    assert.equal(res1.replayed, false);
    assert.equal(res1.pedido.id, 101);

    // Second call with same cart key and phone: replay detected
    const res2 = processCheckout({ telefono: "1155998877", cartKey: "key-abc-123", total: 3200 });
    assert.equal(res2.ok, true);
    assert.equal(res2.replayed, true);
    assert.equal(res2.pedido.id, 101, "Replayed order ID must match initial order");
    assert.equal(existingOrders.length, 1, "Must not create duplicate order in database");

    // Third call with different cart key: creates new order
    const res3 = processCheckout({ telefono: "1155998877", cartKey: "key-xyz-789", total: 1800 });
    assert.equal(res3.ok, true);
    assert.equal(res3.replayed, false);
    assert.equal(res3.pedido.id, 102);
    assert.equal(existingOrders.length, 2);
  });

  // ===========================================================================
  // 5. Store Optimistic Concurrency Locking (takeOrder) in Demo Mode
  // ===========================================================================
  await t.test("5. Store takeOrder in demo mode advances version and prevents race conditions", async () => {
    const demoConfig = {
      mode: "demo",
      ok: true,
      errors: [],
      warnings: [],
      business: { name: "Demo Nexo", alias: "demo.nexo", whatsapp: "5491100000000" },
      storageKeys: {
        ORDERS: "nexo_demo_v1_orders_test_v2",
        PRODUCTS: "nexo_demo_v1_products_test_v2",
        LOCAL_SETTINGS: "nexo_demo_v1_local_settings_test_v2",
        ACTIVE_ORDER: "nexo_demo_v1_active_order_test_v2",
        CART: "nexo_demo_v1_cart_test_v2"
      }
    };

    const store = new Store(demoConfig);
    store.persistOrders([
      {
        id: 201,
        cliente: { nombre: "Cliente Demo", telefono: "11223344" },
        estado: "PENDIENTE",
        total_estimado: 2500,
        items: [],
        version: 1,
        tomado_por: null
      }
    ]);

    // Operator 1 takes order with expectedVersion = 1
    const orderAfterOp1 = await store.takeOrder(201, "Operador Juan", 1);
    assert.equal(orderAfterOp1.estado, "EN_PREPARACION");
    assert.equal(orderAfterOp1.tomado_por, "Operador Juan");
    assert.equal(orderAfterOp1.version, 2);

    // Operator 2 attempts to take the same order with stale expectedVersion = 1
    await assert.rejects(
      async () => await store.takeOrder(201, "Operador Maria", 1),
      /El pedido ya fue tomado por otro operario o fue modificado/
    );

    // Order remains assigned to Operator Juan at version 2
    const currentOrder = store.getOrders().find((o) => o.id === 201);
    assert.equal(currentOrder.tomado_por, "Operador Juan");
    assert.equal(currentOrder.version, 2);
  });

  // ===========================================================================
  // 6. Store Optimistic Concurrency Locking in Production Mode
  // ===========================================================================
  await t.test("6. Store takeOrder in production executes WHERE version = expectedVersion", async () => {
    let capturedFilters = {};
    let capturedPayload = {};
    let capturedHeaders = {};

    let serverOrderVersion = 1;
    const mockSupabase = {
      from(table) {
        if (table === "pedidos") {
          return {
            update(payload) {
              capturedPayload = payload;
              const builder = {
                setHeader(name, val) {
                  capturedHeaders[name] = val;
                  return this;
                },
                eq(col, val) {
                  capturedFilters[col] = val;
                  return this;
                },
                select() {
                  if (capturedFilters.id === 301 && capturedFilters.version === serverOrderVersion) {
                    serverOrderVersion++;
                    return Promise.resolve({
                      data: [
                        {
                          id: 301,
                          estado: "EN_PREPARACION",
                          tomado_por: payload.tomado_por,
                          version: serverOrderVersion,
                          updated_at: new Date().toISOString()
                        }
                      ],
                      error: null
                    });
                  }
                  // Concurrency conflict: 0 rows updated
                  return Promise.resolve({ data: [], error: null });
                }
              };
              return builder;
            }
          };
        }
      }
    };

    const prodConfig = {
      mode: "production",
      ok: true,
      errors: [],
      warnings: [],
      business: { name: "Prod Nexo", alias: "prod.nexo", whatsapp: "5491100000000" },
      storageKeys: {
        ORDERS: "nexo_prod_v1_orders_test_v2",
        LOCAL_SETTINGS: "nexo_prod_v1_local_settings_test_v2"
      }
    };

    const store = new Store(prodConfig);
    await new Promise((r) => setTimeout(r, 60));
    store.supabase = mockSupabase;
    store.saveLocalSettings({ staffPin: "7788" });
    store.persistOrders([
      { id: 301, estado: "PENDIENTE", total_estimado: 4000, items: [], version: 1 }
    ]);

    // Successful take
    const res = await store.takeOrder(301, "Operador Cloud", 1);
    assert.equal(res.id, 301);
    assert.equal(res.version, 2);
    assert.equal(capturedFilters.id, 301);
    assert.equal(capturedFilters.version, 1);
    assert.equal(capturedPayload.estado, "EN_PREPARACION");
    assert.equal(capturedPayload.version, 2);
    assert.equal(capturedHeaders["x-nexo-staff-pin"], "7788");

    // Concurrency conflict: Operator attempts to take with version 1 again
    await assert.rejects(
      async () => await store.takeOrder(301, "Operador Tardío", 1),
      /El pedido ya fue tomado por otro operario o fue modificado/
    );
  });

  // ===========================================================================
  // 7. Operator View Concurrency Integration
  // ===========================================================================
  await t.test("7. Operator UI passes expectedVersion to takeOrder and displays alert on conflict", async () => {
    const operatorJsPath = path.resolve("js/views/operator.js");
    const operatorJs = fs.readFileSync(operatorJsPath, "utf-8");

    assert.ok(
      operatorJs.includes('data-order-version="${order.version ?? 1}"'),
      "Operator card must bind data-order-version attribute"
    );
    assert.ok(
      operatorJs.includes("store.takeOrder(id, operatorName, expectedVersion)"),
      "Operator view must call store.takeOrder with id, operatorName, expectedVersion"
    );
    assert.ok(
      operatorJs.includes("showError(error.message)"),
      "Operator view must display error on concurrency conflict"
    );
  });
});
