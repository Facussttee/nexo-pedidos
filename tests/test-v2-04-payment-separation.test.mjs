/**
 * NEXO PEDIDOS - TEST SUITE: PAYMENT & DELIVERY SEPARATION (V2-04)
 *
 * Verifies:
 * 1. Supabase SQL Schema: columns estado_pago, metodo_pago, check constraints, index, create_order_atomic RPC.
 * 2. Demo Seeds: initial mock orders contain valid estado_pago and metodo_pago.
 * 3. Store State Machine: createOrder defaults, updateOrderPayment validation & persistence, staff PIN header.
 * 4. Decoupling Invariants: ENTREGADO with PENDIENTE/INFORMADO payment; COBRADO while in EN_PREPARACION.
 * 5. Pending Payment Filter: filtering unpaid orders (estado_pago != 'COBRADO') across columns.
 * 6. Operator UI: "Entregados" tab, "Entregar Pedido" button, payment badges and quick action controls.
 * 7. Client UI: Payment method selection in drawer, passing metodo_pago, and decoupled tracking summary.
 * 8. Bundle Hygiene: All features compiled into js/bundle.js with clean syntax.
 */

import assert from "node:assert";
import fs from "node:fs";

console.log("===============================================================");
console.log("   NEXO PEDIDOS - PAYMENT & DELIVERY SEPARATION (V2-04)");
console.log("===============================================================");

let totalPassed = 0;
function pass(msg) {
  totalPassed++;
  console.log(`  [PASS] ${msg}`);
}

// ---------------------------------------------------------------------------
// SUITE 1: Supabase Database Schema & Migration Invariants
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 1: Supabase SQL Schema & RPC Updates ---");

const schemaSql = fs.readFileSync("supabase/schema.sql", "utf8");

// 1.1 estado_pago definition in public.pedidos
assert.ok(
  /estado_pago\s+VARCHAR\(20\)\s+NOT\s+NULL\s+DEFAULT\s+'PENDIENTE'\s+CHECK\s*\(estado_pago\s+IN\s*\('PENDIENTE',\s*'INFORMADO',\s*'COBRADO'\)\)/i.test(
    schemaSql
  ),
  "schema.sql must define estado_pago with correct VARCHAR(20), DEFAULT 'PENDIENTE', and CHECK constraint"
);
pass("1.1 public.pedidos table defines estado_pago with check constraint ('PENDIENTE', 'INFORMADO', 'COBRADO')");

// 1.2 metodo_pago definition in public.pedidos
assert.ok(
  /metodo_pago\s+VARCHAR\(20\)\s+NOT\s+NULL\s+DEFAULT\s+'EFECTIVO'\s+CHECK\s*\(metodo_pago\s+IN\s*\('EFECTIVO',\s*'TRANSFERENCIA',\s*'OTRO'\)\)/i.test(
    schemaSql
  ),
  "schema.sql must define metodo_pago with correct VARCHAR(20), DEFAULT 'EFECTIVO', and CHECK constraint"
);
pass("1.2 public.pedidos table defines metodo_pago with check constraint ('EFECTIVO', 'TRANSFERENCIA', 'OTRO')");

// 1.3 idx_pedidos_estado_pago index
assert.ok(
  /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_pedidos_estado_pago\s+ON\s+public\.pedidos\s*\(estado_pago\);/i.test(
    schemaSql
  ),
  "schema.sql must create index idx_pedidos_estado_pago"
);
pass("1.3 idx_pedidos_estado_pago index is defined on public.pedidos(estado_pago)");

// 1.4 create_order_atomic signature and payment handling
assert.ok(
  schemaSql.includes("p_metodo_pago TEXT DEFAULT 'EFECTIVO'") ||
    schemaSql.includes("p_metodo_pago VARCHAR DEFAULT 'EFECTIVO'"),
  "create_order_atomic RPC must accept p_metodo_pago with default 'EFECTIVO'"
);
assert.ok(
  schemaSql.includes("estado_pago,") && schemaSql.includes("metodo_pago,"),
  "create_order_atomic INSERT statement must include estado_pago and metodo_pago columns"
);
pass("1.4 create_order_atomic accepts p_metodo_pago and persists estado_pago ('PENDIENTE') and metodo_pago");

// 1.5 Migration idempotence: ALTER TABLE fallback
assert.ok(
  schemaSql.includes("ADD COLUMN IF NOT EXISTS estado_pago") &&
    schemaSql.includes("ADD COLUMN IF NOT EXISTS metodo_pago"),
  "schema.sql must contain idempotent ALTER TABLE ADD COLUMN IF NOT EXISTS for existing deployments"
);
pass("1.5 Idempotent ALTER TABLE migrations exist for existing database upgrades");

// ---------------------------------------------------------------------------
// SUITE 2: Demo Mock Data
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 2: Demo Data Seeds ---");

const demoDataSrc = fs.readFileSync("js/demo-data.js", "utf8");

assert.ok(
  demoDataSrc.includes('estado_pago: "PENDIENTE"') || demoDataSrc.includes("estado_pago: 'PENDIENTE'"),
  "demo-data.js must include estado_pago in mock orders"
);
assert.ok(
  demoDataSrc.includes('metodo_pago: "EFECTIVO"') || demoDataSrc.includes("metodo_pago: 'EFECTIVO'"),
  "demo-data.js must include metodo_pago EFECTIVO"
);
assert.ok(
  demoDataSrc.includes('metodo_pago: "TRANSFERENCIA"') || demoDataSrc.includes("metodo_pago: 'TRANSFERENCIA'"),
  "demo-data.js must include metodo_pago TRANSFERENCIA"
);
pass("2.1 Demo mock seeds include explicit estado_pago and metodo_pago");

// ---------------------------------------------------------------------------
// SUITE 3: Store State Machine & Payment Updates
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 3: Store State Machine & Payment Updates ---");

// Mock browser localStorage and window environment for Store testing
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
};
globalThis.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};

// Import Store dynamically
const { Store } = await import("../js/store.js");
const store = new Store();

// 3.1 Initial orders in demo have payment properties
const initialOrders = store.getOrders();
assert.ok(initialOrders.length > 0, "Store should have demo orders");
initialOrders.forEach((o) => {
  assert.ok(["PENDIENTE", "INFORMADO", "COBRADO"].includes(o.estado_pago), `Order #${o.id} must have valid estado_pago`);
  assert.ok(["EFECTIVO", "TRANSFERENCIA", "OTRO"].includes(o.metodo_pago), `Order #${o.id} must have valid metodo_pago`);
});
pass("3.1 Initial demo orders have valid estado_pago and metodo_pago attributes");

// 3.2 createOrderDirect preserves payment fields
const newDirectOrder = store.createOrderDirect({
  cliente: { nombre: "Test Cliente", telefono: "1122334455" },
  tipo_entrega: "RETIRO",
  metodo_pago: "TRANSFERENCIA",
  estado_pago: "INFORMADO",
  items: [{ id: "p1", nombre: "Tomate", cantidad: 2, precio: 1000 }]
});
assert.strictEqual(newDirectOrder.metodo_pago, "TRANSFERENCIA");
assert.strictEqual(newDirectOrder.estado_pago, "INFORMADO");
assert.strictEqual(newDirectOrder.estado, "PENDIENTE");
pass("3.2 createOrderDirect sets designated metodo_pago and estado_pago");

// 3.3 updateOrderPayment updates payment status in Demo mode
let changedNotificationFired = false;
const unsubscribe = store.subscribe((event) => {
  if (event === "orders_changed") changedNotificationFired = true;
});

const updatedPaymentOrder = await store.updateOrderPayment(newDirectOrder.id, {
  estado_pago: "COBRADO"
});
assert.strictEqual(updatedPaymentOrder.estado_pago, "COBRADO");
assert.strictEqual(updatedPaymentOrder.metodo_pago, "TRANSFERENCIA");
assert.ok(changedNotificationFired, "updateOrderPayment must emit 'orders_changed' event");
pass("3.3 updateOrderPayment updates estado_pago to COBRADO and notifies subscribers");

// 3.4 updateOrderPayment updates metodo_pago
const updatedMethodOrder = await store.updateOrderPayment(newDirectOrder.id, {
  metodo_pago: "EFECTIVO"
});
assert.strictEqual(updatedMethodOrder.metodo_pago, "EFECTIVO");
assert.strictEqual(updatedMethodOrder.estado_pago, "COBRADO");
pass("3.4 updateOrderPayment updates metodo_pago independently");

// 3.5 updateOrderPayment rejects invalid status or method
await assert.rejects(
  async () => {
    await store.updateOrderPayment(newDirectOrder.id, { estado_pago: "INVALID_STATUS" });
  },
  /Estado de pago no v.lido/i,
  "Should reject invalid estado_pago"
);

await assert.rejects(
  async () => {
    await store.updateOrderPayment(newDirectOrder.id, { metodo_pago: "BITCOIN" });
  },
  /M.todo de pago no v.lido/i,
  "Should reject invalid metodo_pago"
);
pass("3.5 updateOrderPayment strictly validates payment status and method against whitelist");

// 3.6 getStaffPinHeaders returns x-nexo-staff-pin
const pinHeaders = store.getStaffPinHeaders();
assert.ok(pinHeaders["x-nexo-staff-pin"], "getStaffPinHeaders must return 'x-nexo-staff-pin'");
pass("3.6 getStaffPinHeaders provides x-nexo-staff-pin header");

// ---------------------------------------------------------------------------
// SUITE 4: Decoupling Invariants
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 4: Decoupling Invariants (Delivery vs Payment) ---");

// 4.1 Invariant: Order can be ENTREGADO while estado_pago is PENDIENTE
const deliveredUnpaidOrder = store.createOrderDirect({
  cliente: { nombre: "Juan Unpaid", telefono: "1199887766" },
  tipo_entrega: "DELIVERY",
  direccion_entrega: "Av. Siempre Viva 742",
  estado: "ENTREGADO",
  estado_pago: "PENDIENTE",
  metodo_pago: "EFECTIVO",
  items: []
});
assert.strictEqual(deliveredUnpaidOrder.estado, "ENTREGADO");
assert.strictEqual(deliveredUnpaidOrder.estado_pago, "PENDIENTE");
pass("4.1 Invariant: Order can be ENTREGADO while payment is PENDIENTE");

// 4.2 Invariant: Order can be ENTREGADO while estado_pago is INFORMADO
await store.updateOrderPayment(deliveredUnpaidOrder.id, { estado_pago: "INFORMADO" });
const checkDeliveredInformed = store.getOrders().find((o) => o.id === deliveredUnpaidOrder.id);
assert.strictEqual(checkDeliveredInformed.estado, "ENTREGADO");
assert.strictEqual(checkDeliveredInformed.estado_pago, "INFORMADO");
pass("4.2 Invariant: Order can be ENTREGADO while payment is INFORMADO");

// 4.3 Invariant: Order can be COBRADO while in EN_PREPARACION
const preparingPaidOrder = store.createOrderDirect({
  cliente: { nombre: "Maria AdvancePay", telefono: "1155443322" },
  tipo_entrega: "RETIRO",
  estado: "EN_PREPARACION",
  estado_pago: "COBRADO",
  metodo_pago: "TRANSFERENCIA",
  items: []
});
assert.strictEqual(preparingPaidOrder.estado, "EN_PREPARACION");
assert.strictEqual(preparingPaidOrder.estado_pago, "COBRADO");
pass("4.3 Invariant: Order can be COBRADO while in EN_PREPARACION");

// 4.4 Invariant: Pending payment filter logic (estado_pago !== 'COBRADO')
const allOrders = store.getOrders();
const unpaidOrders = allOrders.filter((o) => o.estado_pago !== "COBRADO");
assert.ok(unpaidOrders.some((o) => o.id === deliveredUnpaidOrder.id), "Unpaid delivered order must be in unpaid filter");
assert.ok(!unpaidOrders.some((o) => o.id === preparingPaidOrder.id), "Paid preparing order must NOT be in unpaid filter");
pass("4.4 Filter logic (estado_pago !== 'COBRADO') isolates orders requiring payment collection");

// ---------------------------------------------------------------------------
// SUITE 5: Operator UI Templates & Controls
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 5: Operator View UI Templates & Controls ---");

const operatorSrc = fs.readFileSync("js/views/operator.js", "utf8");

// 5.1 Tab 4 renamed to Entregados
assert.ok(operatorSrc.includes("Entregados"), "operator.js must display 'Entregados' tab label");
assert.ok(!operatorSrc.includes('<!-- 4. Pestaña ENTREGADOS / COBRADOS -->'), "Old comment 'ENTREGADOS / COBRADOS' should be cleaned");
pass("5.1 Operator view Tab 4 is labeled 'Entregados'");

// 5.2 Button renamed from 'Marcar Cobrado' to 'Entregar Pedido' in Tab 3 (LISTO)
assert.ok(operatorSrc.includes("Entregar Pedido"), "operator.js must feature 'Entregar Pedido' action button");
pass("5.2 Tab 3 (LISTO) action button renamed to 'Entregar Pedido'");

// 5.3 Payment badge renderer
assert.ok(operatorSrc.includes("renderPaymentBadge"), "operator.js must define renderPaymentBadge");
assert.ok(operatorSrc.includes("Cobrado") && operatorSrc.includes("Informado") && operatorSrc.includes("Pendiente"), "Payment badge must handle Cobrado, Informado, and Pendiente");
pass("5.3 renderPaymentBadge produces distinct badges for Cobrado, Informado, and Pendiente");

// 5.4 Quick payment action controls
assert.ok(operatorSrc.includes("btn-mark-paid"), "operator.js must have .btn-mark-paid");
assert.ok(operatorSrc.includes("btn-mark-unpaid"), "operator.js must have .btn-mark-unpaid");
assert.ok(operatorSrc.includes("btn-mark-informed"), "operator.js must have .btn-mark-informed");
assert.ok(operatorSrc.includes("select-payment-method"), "operator.js must have .select-payment-method");
pass("5.4 Operator cards contain quick payment controls (Marcar Cobrado, Desmarcar, Informado, Método)");

// 5.5 Pending payment filter button in toolbar
assert.ok(operatorSrc.includes("btn-toggle-unpaid-filter") || operatorSrc.includes("filterUnpaidOnly"), "operator.js must have filter for unpaid orders");
assert.ok(operatorSrc.includes("Pendientes de cobro") || operatorSrc.includes("pendientes de cobro"), "operator.js must display 'Pendientes de cobro' in toolbar");
pass("5.5 Toolbar includes 'Pendientes de cobro' toggle filter button");

// ---------------------------------------------------------------------------
// SUITE 6: Client Checkout & Tracking UI
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 6: Client Checkout & Tracking UI ---");

const clientSrc = fs.readFileSync("js/views/client.js", "utf8");

// 6.1 Payment method selector in checkout drawer
assert.ok(clientSrc.includes('name="checkout-payment-method"'), "client.js must include payment method radio buttons");
assert.ok(clientSrc.includes('value="EFECTIVO"') && clientSrc.includes('value="TRANSFERENCIA"'), "client.js must include EFECTIVO and TRANSFERENCIA options");
pass("6.1 Client checkout drawer contains payment method selection (Efectivo / Transferencia)");

// 6.2 createOrder receives metodo_pago
assert.ok(clientSrc.includes("metodo_pago: paymentMethod"), "client.js must pass metodo_pago to store.createOrder");
pass("6.2 Client checkout dispatches selected metodo_pago to store.createOrder");

// 6.3 Decoupled delivery tracking
assert.ok(clientSrc.includes("Pedido Entregado") || clientSrc.includes("Entregado"), "client.js must decouple delivery tracking");
assert.ok(clientSrc.includes("Pago:"), "client.js tracking summary must include payment details");
pass("6.3 Client tracking displays decoupled delivery state and payment information");

// ---------------------------------------------------------------------------
// SUITE 7: Bundle Compilation & Integrity
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 7: Bundle Compilation & UTF-8 Integrity ---");

const bundleSrc = fs.readFileSync("js/bundle.js", "utf8");

assert.ok(bundleSrc.includes("updateOrderPayment"), "bundle.js must contain updateOrderPayment");
assert.ok(bundleSrc.includes("renderPaymentBadge"), "bundle.js must contain renderPaymentBadge");
assert.ok(bundleSrc.includes("checkout-payment-method"), "bundle.js must contain checkout-payment-method");
assert.ok(!bundleSrc.startsWith("\uFEFF"), "bundle.js must NOT have a UTF-8 BOM");
pass("7.1 js/bundle.js contains all V2-04 implementations with clean UTF-8 without BOM");

console.log("\n===============================================================");
console.log(`   ALL TESTS PASSED: ${totalPassed} / ${totalPassed} (0 FAILURES)`);
console.log("===============================================================");
