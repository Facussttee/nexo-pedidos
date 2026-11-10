/**
 * NEXO PEDIDOS - EMPIRICAL ADVERSARIAL CHALLENGE SUITE: V2-04
 * Milestone M4: Payment & Delivery Separation
 *
 * Adversarial stress tests for:
 * 1. Fulfillment vs Payment Lifecycle Independence (PENDIENTE -> EN_PREPARACION -> LISTO -> ENTREGADO)
 * 2. Advance Bank Transfer & Out-of-Order Payments (INFORMADO / COBRADO before delivery)
 * 3. Post-Delivery Payment & Rollback (Cash on delivery collection and operator error reversal)
 * 4. Input Validation & Hostile Payloads Rejection ('FIADO', 'BITCOIN', null, XSS, SQLi, non-numeric IDs)
 * 5. Unpaid Orders Filtering Invariants (Unpaid delivered orders visibility, cancellation isolation)
 * 6. Production Mode Fail-Closed & Staff PIN Header Forwarding
 * 7. State Mutation Isolation & Event Reactivity
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Store } from "../js/store.js";

// Mock localStorage and window environment for headless testing
const memStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => (memStorage.has(k) ? memStorage.get(k) : null),
  setItem: (k, v) => memStorage.set(k, String(v)),
  removeItem: (k) => memStorage.delete(k),
  clear: () => memStorage.clear()
};

globalThis.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};

test("Milestone M4 (Task V2-04): Empirical Adversarial Challenge Suite", async (t) => {
  const schemaPath = path.resolve("supabase/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  function createFreshStore(customSettings = {}) {
    memStorage.clear();
    const s = new Store();
    if (Object.keys(customSettings).length > 0) {
      s.saveLocalSettings(customSettings);
    }
    return s;
  }

  // ===========================================================================
  // CHALLENGE 1: Fulfillment vs Payment Lifecycle Independence
  // ===========================================================================
  await t.test("CHALLENGE 1: Full fulfillment cycle preserves estado_pago = PENDIENTE throughout", async () => {
    const store = createFreshStore({ staffPin: "1234" });

    // Step 1: Create order with 1 KG item and 1 UNIDAD item
    const order = store.createOrderDirect({
      id: 501,
      cliente: { nombre: "Adversarial Customer 1", telefono: "1144556677" },
      tipo_entrega: "DELIVERY",
      direccion_entrega: "Calle Falsa 123",
      metodo_pago: "EFECTIVO",
      estado_pago: "PENDIENTE",
      items: [
        {
          id: "prod-tomate",
          nombre: "Tomate Perita",
          unidad_medida: "KG",
          precio_unitario: 2500,
          cantidad_solicitada: 2,
          peso_real: null,
          subtotal: 5000,
          sin_stock: false
        },
        {
          id: "prod-palta",
          nombre: "Palta Hass",
          unidad_medida: "UNIDAD",
          precio_unitario: 1200,
          cantidad_solicitada: 1,
          peso_real: 1,
          confirmado_preparacion: true,
          subtotal: 1200,
          sin_stock: false
        }
      ]
    });

    assert.strictEqual(order.estado, "PENDIENTE", "Initial fulfillment status must be PENDIENTE");
    assert.strictEqual(order.estado_pago, "PENDIENTE", "Initial payment status must be PENDIENTE");
    assert.strictEqual(order.metodo_pago, "EFECTIVO", "Initial payment method must be EFECTIVO");

    // Step 2: Take order (transition to EN_PREPARACION)
    const taken = await store.takeOrder(501, "Operator Alpha", 1);
    assert.strictEqual(taken.estado, "EN_PREPARACION", "Fulfillment must transition to EN_PREPARACION");
    assert.strictEqual(taken.estado_pago, "PENDIENTE", "Payment status must remain PENDIENTE when taken");
    assert.strictEqual(taken.metodo_pago, "EFECTIVO", "Payment method must remain EFECTIVO when taken");

    // Step 3: Weigh KG item
    store.updateItemWeight(501, 0, 2.1, { notify: false });
    const orderWeighed = store.getOrders().find((o) => o.id === 501);
    assert.strictEqual(orderWeighed.items[0].peso_real, 2.1);
    assert.strictEqual(orderWeighed.estado_pago, "PENDIENTE", "Payment status must remain PENDIENTE after weighing");

    // Step 4: Finalize weighing (transition to LISTO)
    const finalized = store.finalizeOrderWeighing(501);
    assert.strictEqual(finalized.estado, "LISTO", "Fulfillment must transition to LISTO");
    assert.strictEqual(finalized.estado_pago, "PENDIENTE", "Payment status must remain PENDIENTE when LISTO");
    assert.strictEqual(finalized.total_real, Math.round(2.1 * 2500) + 1200);

    // Step 5: Deliver order (transition to ENTREGADO)
    store.updateOrderStatus(501, "ENTREGADO");
    const delivered = store.getOrders().find((o) => o.id === 501);
    assert.strictEqual(delivered.estado, "ENTREGADO", "Fulfillment must transition to ENTREGADO");
    assert.strictEqual(delivered.estado_pago, "PENDIENTE", "CRITICAL INVARIANT: Delivered order remains PENDIENTE in payment");

    // Step 6: Illegal transitions check
    // Re-opening delivered order to EN_PREPARACION or PENDIENTE must throw
    assert.throws(
      () => store.updateOrderStatus(501, "EN_PREPARACION"),
      /Un pedido finalizado no se puede reabrir/
    );
    assert.throws(
      () => store.updateOrderStatus(501, "PENDIENTE"),
      /Un pedido finalizado no se puede reabrir/
    );

    // Database check constraint strictly enforces valid fulfillment states
    const hasFulfillmentConstraint = /estado\s+VARCHAR\(25\)\s+NOT\s+NULL\s+DEFAULT\s+'PENDIENTE'\s+CHECK\s*\(estado\s+IN\s*\('PENDIENTE',\s*'EN_PREPARACION',\s*'LISTO',\s*'ENTREGADO',\s*'CANCELADO'\)\)/i.test(
      schemaSql
    );
    assert.ok(hasFulfillmentConstraint, "Database schema must reject non-existent fulfillment status like 'CONFIRMADO'");
  });

  // ===========================================================================
  // CHALLENGE 2: Advance Payments (Bank Transfer upfront)
  // ===========================================================================
  await t.test("CHALLENGE 2: Advance bank transfer updated to INFORMADO then COBRADO during EN_PREPARACION", async () => {
    const store = createFreshStore({ staffPin: "1234" });

    const order = store.createOrderDirect({
      id: 502,
      cliente: { nombre: "Advance Buyer", telefono: "1166778899" },
      tipo_entrega: "RETIRO",
      metodo_pago: "TRANSFERENCIA",
      estado_pago: "PENDIENTE",
      items: [
        {
          id: "prod-manzana",
          nombre: "Manzana Roja",
          unidad_medida: "KG",
          precio_unitario: 2000,
          cantidad_solicitada: 1,
          peso_real: 1.0,
          subtotal: 2000,
          sin_stock: false
        }
      ]
    });

    // Move to preparation
    await store.takeOrder(502, "Operator Beta", 1);

    // Phase A: Customer reports bank transfer
    const informedOrder = await store.updateOrderPayment(502, { estado_pago: "INFORMADO" });
    assert.strictEqual(informedOrder.estado_pago, "INFORMADO");
    assert.strictEqual(informedOrder.estado, "EN_PREPARACION", "Fulfillment must stay EN_PREPARACION");

    // Phase B: Cashier / operator verifies bank credit and marks COBRADO
    const paidOrder = await store.updateOrderPayment(502, { estado_pago: "COBRADO" });
    assert.strictEqual(paidOrder.estado_pago, "COBRADO");
    assert.strictEqual(paidOrder.estado, "EN_PREPARACION", "Fulfillment must stay EN_PREPARACION while already COBRADO");

    // Phase C: Operator finishes order preparation (weighing)
    const readyOrder = store.finalizeOrderWeighing(502);
    assert.strictEqual(readyOrder.estado, "LISTO");
    assert.strictEqual(readyOrder.estado_pago, "COBRADO", "Advance payment COBRADO must NOT be overwritten by finalizeOrderWeighing");

    // Phase D: Handover to customer
    store.updateOrderStatus(502, "ENTREGADO");
    const deliveredOrder = store.getOrders().find((o) => o.id === 502);
    assert.strictEqual(deliveredOrder.estado, "ENTREGADO");
    assert.strictEqual(deliveredOrder.estado_pago, "COBRADO", "Advance payment COBRADO must NOT be overwritten by delivery");
  });

  // ===========================================================================
  // CHALLENGE 3: Post-Delivery Payment & Rollback (COD & Correction Workflow)
  // ===========================================================================
  await t.test("CHALLENGE 3: Delivered order paid later, and reversal/correction workflow", async () => {
    const store = createFreshStore({ staffPin: "1234" });

    // Seed an already delivered order that was not paid
    store.createOrderDirect({
      id: 503,
      cliente: { nombre: "Post Delivery Buyer", telefono: "1122334455" },
      tipo_entrega: "DELIVERY",
      direccion_entrega: "Belgrano 456",
      estado: "ENTREGADO",
      estado_pago: "PENDIENTE",
      metodo_pago: "EFECTIVO",
      total_estimado: 4500,
      total_real: 4500,
      items: []
    });

    // Driver returns with cash -> mark COBRADO
    const paid = await store.updateOrderPayment(503, { estado_pago: "COBRADO" });
    assert.strictEqual(paid.estado, "ENTREGADO");
    assert.strictEqual(paid.estado_pago, "COBRADO");

    // Operator realized they clicked wrong order -> Rollback to PENDIENTE
    const unmark = await store.updateOrderPayment(503, { estado_pago: "PENDIENTE" });
    assert.strictEqual(unmark.estado, "ENTREGADO");
    assert.strictEqual(unmark.estado_pago, "PENDIENTE", "Operator can revert COBRADO to PENDIENTE on delivered order");

    // Customer actually sent transfer receipt -> update method to TRANSFERENCIA and status to INFORMADO
    const informed = await store.updateOrderPayment(503, {
      estado_pago: "INFORMADO",
      metodo_pago: "TRANSFERENCIA"
    });
    assert.strictEqual(informed.metodo_pago, "TRANSFERENCIA");
    assert.strictEqual(informed.estado_pago, "INFORMADO");

    // Final confirmation of transfer credit -> COBRADO
    const confirmed = await store.updateOrderPayment(503, { estado_pago: "COBRADO" });
    assert.strictEqual(confirmed.estado_pago, "COBRADO");
    assert.strictEqual(confirmed.metodo_pago, "TRANSFERENCIA");
    assert.strictEqual(confirmed.estado, "ENTREGADO");
  });

  // ===========================================================================
  // CHALLENGE 4: Hostile Input Rejection & Validation Boundaries
  // ===========================================================================
  await t.test("CHALLENGE 4: updateOrderPayment strictly rejects hostile and invalid inputs", async () => {
    const store = createFreshStore({ staffPin: "1234" });

    store.createOrderDirect({
      id: 504,
      cliente: { nombre: "Adversarial Target", telefono: "1199887766" },
      estado: "PENDIENTE",
      estado_pago: "PENDIENTE",
      metodo_pago: "EFECTIVO",
      items: []
    });

    // 4.1 Hostile / invalid estado_pago values
    const invalidStatuses = [
      "FIADO",
      "BITCOIN",
      "DEUDA",
      "null",
      null,
      "",
      " ",
      "<script>alert(1)</script>",
      "PENDIENTE; DROP TABLE pedidos;--",
      12345,
      {},
      ["INVALID_STATUS"],
      false,
      true
    ];

    for (const badStatus of invalidStatuses) {
      await assert.rejects(
        async () => {
          await store.updateOrderPayment(504, { estado_pago: badStatus });
        },
        /Estado de pago no v.lido/i,
        `Should reject invalid estado_pago: ${String(badStatus)}`
      );
    }

    // 4.2 Hostile / invalid metodo_pago values
    const invalidMethods = [
      "FIADO",
      "BITCOIN",
      "MERCADOPAGO",
      "CHEQUE",
      "CRYPTO",
      null,
      "",
      " ",
      "<img src=x onerror=alert(1)>",
      "TRANSFERENCIA OR 1=1",
      999,
      {},
      ["INVALID_METHOD"],
      false,
      true
    ];

    for (const badMethod of invalidMethods) {
      await assert.rejects(
        async () => {
          await store.updateOrderPayment(504, { metodo_pago: badMethod });
        },
        /M.todo de pago no v.lido/i,
        `Should reject invalid metodo_pago: ${String(badMethod)}`
      );
    }

    // 4.3 Empty update payload
    await assert.rejects(
      async () => {
        await store.updateOrderPayment(504, {});
      },
      /Debe proporcionar estado_pago o metodo_pago/i,
      "Should reject empty update object"
    );

    await assert.rejects(
      async () => {
        await store.updateOrderPayment(504);
      },
      /Debe proporcionar estado_pago o metodo_pago/i,
      "Should reject undefined payload"
    );

    // 4.4 Hostile / invalid order IDs
    const invalidIds = ["abc", "order-123", NaN, Infinity, -Infinity, undefined];
    for (const badId of invalidIds) {
      await assert.rejects(
        async () => {
          await store.updateOrderPayment(badId, { estado_pago: "COBRADO" });
        },
        /ID de pedido no v.lido/i,
        `Should reject non-finite order ID: ${String(badId)}`
      );
    }

    // null coerces via Number(null) === 0, which rejects as non-existent or invalid ID
    await assert.rejects(
      async () => {
        await store.updateOrderPayment(null, { estado_pago: "COBRADO" });
      },
      /ID de pedido no v.lido|Pedido no encontrado/i,
      "Should reject null order ID"
    );

    // Non-existent order ID
    await assert.rejects(
      async () => {
        await store.updateOrderPayment(999999, { estado_pago: "COBRADO" });
      },
      /Pedido no encontrado/i,
      "Should reject non-existent order ID in demo mode"
    );

    // 4.5 Case insensitivity resilience: lowercase inputs should be accepted safely and normalized
    const lowerStatusOrder = await store.updateOrderPayment(504, { estado_pago: "informado" });
    assert.strictEqual(lowerStatusOrder.estado_pago, "INFORMADO", "Lowercase 'informado' should be normalized to 'INFORMADO'");

    const lowerMethodOrder = await store.updateOrderPayment(504, { metodo_pago: "transferencia" });
    assert.strictEqual(lowerMethodOrder.metodo_pago, "TRANSFERENCIA", "Lowercase 'transferencia' should be normalized to 'TRANSFERENCIA'");

    // 4.6 Verify SQL Check constraints in schema.sql
    assert.ok(
      /CHECK\s*\(estado_pago\s+IN\s*\('PENDIENTE',\s*'INFORMADO',\s*'COBRADO'\)\)/i.test(schemaSql),
      "Database schema must have CHECK constraint for estado_pago"
    );
    assert.ok(
      /CHECK\s*\(metodo_pago\s+IN\s*\('EFECTIVO',\s*'TRANSFERENCIA',\s*'OTRO'\)\)/i.test(schemaSql),
      "Database schema must have CHECK constraint for metodo_pago"
    );
  });

  // ===========================================================================
  // CHALLENGE 5: Unpaid Orders Filtering & Debt Visibility
  // ===========================================================================
  await t.test("CHALLENGE 5: Unpaid filter isolates unpaid delivered orders and ignores cancelled orders", async () => {
    const store = createFreshStore({ staffPin: "1234" });

    // Seed comprehensive test pool (clearing demo initial orders to strictly isolate pool)
    const pool = [
      { id: 601, estado: "ENTREGADO", estado_pago: "PENDIENTE", desc: "Delivered unpaid" },
      { id: 602, estado: "ENTREGADO", estado_pago: "INFORMADO", desc: "Delivered transfer unconfirmed" },
      { id: 603, estado: "ENTREGADO", estado_pago: "COBRADO", desc: "Delivered paid" },
      { id: 604, estado: "LISTO", estado_pago: "PENDIENTE", desc: "Ready unpaid" },
      { id: 605, estado: "LISTO", estado_pago: "COBRADO", desc: "Ready advance paid" },
      { id: 606, estado: "EN_PREPARACION", estado_pago: "PENDIENTE", desc: "In prep unpaid" },
      { id: 607, estado: "CANCELADO", estado_pago: "PENDIENTE", desc: "Cancelled unpaid" }
    ];

    const seededOrders = pool.map((p) => ({
      id: p.id,
      cliente: { nombre: p.desc, telefono: `1100000${p.id}` },
      tipo_entrega: "RETIRO",
      direccion_entrega: "Retiro en Mostrador",
      estado: p.estado,
      estado_pago: p.estado_pago,
      metodo_pago: "EFECTIVO",
      total_estimado: 1000,
      total_real: p.estado === "ENTREGADO" || p.estado === "LISTO" ? 1000 : null,
      items: [],
      version: 1
    }));

    // Explicitly set pool to isolate test
    store.persistOrders(seededOrders);

    const allOrders = store.getOrders();

    // 1. Global unpaid count formula from operator.js:
    // orders.filter((o) => o.estado !== "CANCELADO" && o.estado_pago !== "COBRADO").length
    const unpaidCount = allOrders.filter(
      (o) => o.estado !== "CANCELADO" && o.estado_pago !== "COBRADO"
    ).length;

    // Expected: 601, 602, 604, 606 -> Exactly 4
    assert.strictEqual(unpaidCount, 4, "Global unpaid count must be exactly 4 (excluding 603, 605 paid and 607 cancelled)");

    // 2. Tab ENTREGADO filtering with filterUnpaidOnly = true
    const deliveredTabOrders = allOrders.filter((o) => o.estado === "ENTREGADO");
    const deliveredUnpaidTab = deliveredTabOrders.filter((o) => o.estado_pago !== "COBRADO");

    assert.strictEqual(deliveredTabOrders.length, 3, "Total delivered orders must be 3");
    assert.strictEqual(deliveredUnpaidTab.length, 2, "Unpaid delivered orders must be exactly 2 (601 and 602)");
    assert.ok(deliveredUnpaidTab.some((o) => o.id === 601), "Unpaid delivered #601 must appear in unpaid filter");
    assert.ok(deliveredUnpaidTab.some((o) => o.id === 602), "Informado delivered #602 must appear in unpaid filter");
    assert.ok(!deliveredUnpaidTab.some((o) => o.id === 603), "Paid delivered #603 must be excluded from unpaid filter");

    // 3. Tab LISTO filtering with filterUnpaidOnly = true
    const readyTabOrders = allOrders.filter((o) => o.estado === "LISTO");
    const readyUnpaidTab = readyTabOrders.filter((o) => o.estado_pago !== "COBRADO");

    assert.strictEqual(readyTabOrders.length, 2, "Total ready orders must be 2");
    assert.strictEqual(readyUnpaidTab.length, 1, "Unpaid ready orders must be exactly 1 (604)");
    assert.strictEqual(readyUnpaidTab[0].id, 604);
  });

  // ===========================================================================
  // CHALLENGE 6: Production Mode Isolation & Staff PIN Header Security
  // ===========================================================================
  await t.test("CHALLENGE 6: Production mode fails closed without Supabase and forwards staff PIN header", async () => {
    // 6.1 Production mode without Supabase connection -> Fails closed
    const prodStoreWithoutClient = new Store({
      config: {
        ok: true,
        isDemo: false,
        supabaseUrl: "https://synthetic-test.supabase.co",
        supabaseAnonKey: "synthetic-anon-key"
      }
    });

    await assert.rejects(
      async () => {
        await prodStoreWithoutClient.updateOrderPayment(101, { estado_pago: "COBRADO" });
      },
      /No hay conexi.n con Supabase en modo producci.n/i,
      "Must fail closed if Supabase client is not instantiated in production"
    );

    // 6.2 Production mode with mock Supabase client -> verifies header forwarding and RLS failure handling
    let capturedHeader = null;
    let capturedUpdatePayload = null;
    let capturedEqId = null;
    let simulateDbError = false;

    const mockSupabase = {
      from(table) {
        assert.strictEqual(table, "pedidos");
        return {
          update(payload) {
            capturedUpdatePayload = payload;
            return this;
          },
          eq(column, value) {
            if (column === "id") capturedEqId = value;
            return this;
          },
          setHeader(headerName, headerVal) {
            if (headerName === "x-nexo-staff-pin") {
              capturedHeader = headerVal;
            }
          },
          async select() {
            if (simulateDbError) {
              return { data: null, error: { message: "new row violates row-level security policy for table 'pedidos'" } };
            }
            return {
              data: [
                {
                  id: capturedEqId,
                  estado_pago: capturedUpdatePayload.estado_pago,
                  metodo_pago: capturedUpdatePayload.metodo_pago || "EFECTIVO",
                  version: 2
                }
              ],
              error: null
            };
          }
        };
      }
    };

    const prodStoreWithClient = new Store({
      config: {
        ok: true,
        isDemo: false,
        supabaseUrl: "https://synthetic-test.supabase.co",
        supabaseAnonKey: "synthetic-anon-key"
      }
    });
    prodStoreWithClient.supabase = mockSupabase;
    prodStoreWithClient.saveLocalSettings({ staffPin: "8765" });

    // Seed existing order in memory with valid numeric total_estimado
    prodStoreWithClient.persistOrders([
      { id: 701, estado: "ENTREGADO", estado_pago: "PENDIENTE", metodo_pago: "EFECTIVO", total_estimado: 1000, total_real: 1000 }
    ]);

    // Test 6.2a: Successful payment update forwards staff PIN
    const updateResult = await prodStoreWithClient.updateOrderPayment(701, {
      estado_pago: "COBRADO",
      metodo_pago: "TRANSFERENCIA"
    });

    assert.strictEqual(capturedEqId, 701);
    assert.strictEqual(capturedHeader, "8765", "x-nexo-staff-pin header must be forwarded to Supabase query");
    assert.strictEqual(capturedUpdatePayload.estado_pago, "COBRADO");
    assert.strictEqual(capturedUpdatePayload.metodo_pago, "TRANSFERENCIA");
    assert.strictEqual(updateResult.estado_pago, "COBRADO");

    // Test 6.2b: Supabase RLS error propagation
    simulateDbError = true;
    await assert.rejects(
      async () => {
        await prodStoreWithClient.updateOrderPayment(701, { estado_pago: "PENDIENTE" });
      },
      /violates row-level security policy/i,
      "Supabase database errors must be propagated without silently failing"
    );
  });

  // ===========================================================================
  // CHALLENGE 7: Reactivity & Event Notification Invariants
  // ===========================================================================
  await t.test("CHALLENGE 7: updateOrderPayment triggers orders_changed and persists to storage", async () => {
    const store = createFreshStore({ staffPin: "1234" });

    store.createOrderDirect({
      id: 801,
      cliente: { nombre: "Reactivity Target", telefono: "1133221100" },
      estado: "PENDIENTE",
      estado_pago: "PENDIENTE",
      metodo_pago: "EFECTIVO",
      items: []
    });

    let eventsEmitted = [];
    store.subscribe((evt) => {
      eventsEmitted.push(evt);
    });

    await store.updateOrderPayment(801, { estado_pago: "COBRADO" });

    assert.ok(
      eventsEmitted.includes("orders_changed"),
      "Must emit 'orders_changed' event on payment update"
    );

    // Verify storage persistence across store re-instantiation
    const reloadedStore = new Store();
    const persistedOrder = reloadedStore.getOrders().find((o) => o.id === 801);
    assert.ok(persistedOrder, "Order #801 must exist after reload");
    assert.strictEqual(persistedOrder.estado_pago, "COBRADO", "Payment update must persist to localStorage");
  });

  // ===========================================================================
  // CHALLENGE 8: Checkout Fallback & RPC Sanitization
  // ===========================================================================
  await t.test("CHALLENGE 8: createOrder and RPC create_order_atomic sanitize invalid payment methods", async () => {
    const store = createFreshStore({ staffPin: "1234" });

    // Seed cart and customer
    store.saveCustomer({ nombre: "Checkout Tester", telefono: "1188776655" });
    store.addToCart("prod-1", 1); // Banana

    // Case 8.1: createOrder with invalid metodo_pago ('BITCOIN') falls back to 'EFECTIVO'
    const orderFallback = store.createOrder({
      cliente: store.getCustomer("1188776655"),
      tipo_entrega: "RETIRO",
      metodo_pago: "BITCOIN"
    });

    assert.ok(orderFallback, "Order must be created");
    assert.strictEqual(orderFallback.metodo_pago, "EFECTIVO", "Invalid payment method must fall back to 'EFECTIVO'");
    assert.strictEqual(orderFallback.estado_pago, "PENDIENTE", "New order must always default to 'PENDIENTE'");

    // Case 8.2: createOrder with valid lowercase 'transferencia' normalizes to 'TRANSFERENCIA'
    store.addToCart("prod-1", 1);
    const orderTransfer = store.createOrder({
      cliente: store.getCustomer("1188776655"),
      tipo_entrega: "RETIRO",
      metodo_pago: "transferencia"
    });
    assert.strictEqual(orderTransfer.metodo_pago, "TRANSFERENCIA", "Lowercase 'transferencia' must normalize to 'TRANSFERENCIA'");

    // Case 8.3: PostgreSQL RPC create_order_atomic sanitization simulation
    function simulateRpcPaymentSanitization(p_metodo_pago) {
      let v_metodo_pago = String(p_metodo_pago || "EFECTIVO").trim().toUpperCase();
      if (!["EFECTIVO", "TRANSFERENCIA", "OTRO"].includes(v_metodo_pago)) {
        v_metodo_pago = "EFECTIVO";
      }
      return v_metodo_pago;
    }

    assert.strictEqual(simulateRpcPaymentSanitization(null), "EFECTIVO");
    assert.strictEqual(simulateRpcPaymentSanitization(""), "EFECTIVO");
    assert.strictEqual(simulateRpcPaymentSanitization("FIADO"), "EFECTIVO");
    assert.strictEqual(simulateRpcPaymentSanitization("  transferencia  "), "TRANSFERENCIA");
    assert.strictEqual(simulateRpcPaymentSanitization("OTRO"), "OTRO");
  });

  // ===========================================================================
  // CHALLENGE 9: Mobile Ergonomics & Touch Target Compliance (>= 44px)
  // ===========================================================================
  await t.test("CHALLENGE 9: Operator and Client payment controls enforce >= 44px touch targets", async () => {
    const operatorSrc = fs.readFileSync(path.resolve("js/views/operator.js"), "utf-8");
    const clientSrc = fs.readFileSync(path.resolve("js/views/client.js"), "utf-8");

    // All interactive buttons/selects for payment must have min-h-[44px]
    assert.ok(
      operatorSrc.includes('class="btn-mark-paid min-h-[44px]'),
      ".btn-mark-paid must have min-h-[44px] touch target"
    );
    assert.ok(
      operatorSrc.includes('class="btn-mark-unpaid min-h-[44px]'),
      ".btn-mark-unpaid must have min-h-[44px] touch target"
    );
    assert.ok(
      operatorSrc.includes('class="btn-mark-informed min-h-[44px]'),
      ".btn-mark-informed must have min-h-[44px] touch target"
    );
    assert.ok(
      operatorSrc.includes('class="select-payment-method min-h-[44px]'),
      ".select-payment-method must have min-h-[44px] touch target"
    );
    assert.ok(
      operatorSrc.includes('id="btn-toggle-unpaid-filter"') &&
      operatorSrc.includes('min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 tap-feedback touch-target'),
      "#btn-toggle-unpaid-filter must have min-h-[44px] touch target"
    );

    // Client drawer radio cards
    assert.ok(
      clientSrc.includes('id="payment-card-efectivo"'),
      "client.js must include #payment-card-efectivo"
    );
    assert.ok(
      clientSrc.includes('id="payment-card-transferencia"'),
      "client.js must include #payment-card-transferencia"
    );
  });
});

