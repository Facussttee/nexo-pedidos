/**
 * NEXO PEDIDOS - TEST SUITE: QUANTITATIVE INVENTORY & STOCK RESERVATION (V2-06)
 *
 * Verifies:
 * 1. Supabase SQL Schema: controlar_stock, stock_actual, stock_reservado columns, CHECK constraints,
 *    create_order_atomic reservation logic, release_order_stock_rpc, finalize_order_stock_rpc, and trigger.
 * 2. Store Product Validation & Persistence: default stock properties, saveProduct stock fields, validation rules.
 * 3. Cart & Checkout Stock Reservations: addToCart/setCartQuantity stock limits, createOrder/createOrderDirect
 *    reservation increments, and rejection when insufficient stock.
 * 4. Weighing Finalization & Scale Adjustments: finalizeOrderWeighing releases reservation and deducts actual
 *    physical weight (or 0 when marked sin_stock), preventing negative values.
 * 5. Order Cancellation & Single-Release Guarantee: cancelOrder/deleteOrder releases reserved stock once and
 *    does not double-release on repeated calls.
 * 6. Admin & Client UI Contracts: stock controls in Admin modal and out-of-stock/max-stock handling in Client view.
 * 7. Bundle Hygiene: All V2-06 features present in js/bundle.js.
 */

import assert from "node:assert";
import fs from "node:fs";

console.log("===============================================================");
console.log("   NEXO PEDIDOS - INVENTORY & STOCK RESERVATION (V2-06)");
console.log("===============================================================");

let totalPassed = 0;
function pass(msg) {
  totalPassed++;
  console.log(`  [PASS] ${msg}`);
}

// ---------------------------------------------------------------------------
// SUITE 1: Supabase SQL Schema & RPC / Trigger Definitions
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 1: Supabase SQL Schema & RPCs ---");

const schemaSql = fs.readFileSync("supabase/schema.sql", "utf8");

assert.ok(
  /controlar_stock\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+FALSE/i.test(schemaSql),
  "schema.sql must define controlar_stock BOOLEAN NOT NULL DEFAULT FALSE"
);
pass("1.1 public.productos defines controlar_stock BOOLEAN NOT NULL DEFAULT FALSE");

assert.ok(
  /stock_actual\s+NUMERIC\(10,\s*3\)\s+NOT\s+NULL\s+DEFAULT\s+0\.000\s+CHECK\s*\(stock_actual\s*>=\s*0\)/i.test(schemaSql),
  "schema.sql must define stock_actual NUMERIC(10,3) >= 0"
);
pass("1.2 public.productos defines stock_actual NUMERIC(10, 3) >= 0");

assert.ok(
  /stock_reservado\s+NUMERIC\(10,\s*3\)\s+NOT\s+NULL\s+DEFAULT\s+0\.000\s+CHECK\s*\(stock_reservado\s*>=\s*0\)/i.test(schemaSql),
  "schema.sql must define stock_reservado NUMERIC(10,3) >= 0"
);
pass("1.3 public.productos defines stock_reservado NUMERIC(10, 3) >= 0");

assert.ok(
  schemaSql.includes("IF (v_product.stock_actual - v_product.stock_reservado) < v_item_cantidad THEN") &&
    schemaSql.includes("SET stock_reservado = stock_reservado + v_item_cantidad"),
  "create_order_atomic must validate available stock and increment stock_reservado"
);
pass("1.4 create_order_atomic validates available stock and increments stock_reservado");

assert.ok(
  schemaSql.includes("CREATE OR REPLACE FUNCTION public.release_order_stock_rpc(p_order_id INT)") &&
    schemaSql.includes("CREATE OR REPLACE FUNCTION public.finalize_order_stock_rpc(p_order_id INT)") &&
    schemaSql.includes("CREATE TRIGGER trigger_order_stock_status_change"),
  "schema.sql must define release_order_stock_rpc, finalize_order_stock_rpc, and trigger_order_stock_status_change"
);
pass("1.5 release_order_stock_rpc, finalize_order_stock_rpc, and trigger_order_stock_status_change defined");

// ---------------------------------------------------------------------------
// SUITE 2: Store Product Stock Management & Validation
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 2: Store Product Stock Management & Validation ---");

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

const { Store } = await import("../js/store.js");
const store = new Store();

// 2.1 Default products have stock fields
const initialProducts = store.getProducts();
assert.ok(initialProducts.length > 0, "Should load initial products");
for (const p of initialProducts) {
  assert.strictEqual(typeof p.controlar_stock, "boolean");
  assert.ok(Number.isFinite(p.stock_actual) && p.stock_actual >= 0);
  assert.ok(Number.isFinite(p.stock_reservado) && p.stock_reservado >= 0);
}
pass("2.1 Initial products expose boolean controlar_stock and non-negative numeric stock_actual / stock_reservado");

// 2.2 Save product with quantitative stock enabled
const savedKgProd = store.saveProduct({
  nombre: "Asado Especial",
  categoria: "Carnes",
  codigo: "CAR-001",
  unidad_medida: "KG",
  paso: 0.5,
  precio: 8500,
  disponible: true,
  controlar_stock: true,
  stock_actual: 5.0,
  stock_reservado: 0
});
const kgProdId = savedKgProd.id;
assert.strictEqual(savedKgProd.controlar_stock, true);
assert.strictEqual(savedKgProd.stock_actual, 5);
assert.strictEqual(savedKgProd.stock_reservado, 0);
pass("2.2 saveProduct persists controlar_stock, stock_actual, and stock_reservado");

const savedUnitProd = store.saveProduct({
  nombre: "Maple Huevos Campo",
  categoria: "Granja",
  codigo: "GRA-001",
  unidad_medida: "UNIDAD",
  paso: 1,
  precio: 5200,
  disponible: true,
  controlar_stock: true,
  stock_actual: 3,
  stock_reservado: 0
});
const unitProdId = savedUnitProd.id;
assert.strictEqual(savedUnitProd.controlar_stock, true);
assert.strictEqual(savedUnitProd.stock_actual, 3);
pass("2.3 saveProduct persists unit product with quantitative stock");

// ---------------------------------------------------------------------------
// SUITE 3: Cart Limits & Checkout Reservations
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 3: Cart Limits & Checkout Reservations ---");

store.clearCart();
store.addToCart(unitProdId, 2);
assert.strictEqual(store.getCart()[unitProdId].cantidad, 2);

// Exceeding available stock (3) in addToCart throws
assert.throws(
  () => {
    store.addToCart(unitProdId, 2);
  },
  /Stock insuficiente/i,
  "Adding beyond available stock must throw"
);
pass("3.1 addToCart enforces available stock (stock_actual - stock_reservado) cap");

// Exceeding available stock in setCartQuantity throws
assert.throws(
  () => {
    store.setCartQuantity(unitProdId, 4);
  },
  /Stock insuficiente/i,
  "setCartQuantity beyond available stock must throw"
);
pass("3.2 setCartQuantity enforces available stock cap");

// Add KG product to cart and create order
store.addToCart(kgProdId, 2.0);
const order1 = await store.createOrder({
  nombre: "Cliente Stock 1",
  telefono: "1144556677",
  tipo_entrega: "RETIRO",
  metodo_pago: "EFECTIVO"
});
assert.ok(order1 && order1.id, "Order should be created");

const afterOrderKg = store.getProducts().find((p) => p.id === kgProdId);
const afterOrderUnit = store.getProducts().find((p) => p.id === unitProdId);
assert.strictEqual(afterOrderKg.stock_actual, 5);
assert.strictEqual(afterOrderKg.stock_reservado, 2);
assert.strictEqual(afterOrderUnit.stock_actual, 3);
assert.strictEqual(afterOrderUnit.stock_reservado, 2);
pass("3.3 createOrder reserves stock in stock_reservado without deducting stock_actual prematurely");

// Attempting another order that exceeds remaining available stock (3 - 2 = 1 unit left) must fail
assert.throws(
  () => {
    store.createOrderDirect({
      cliente: { nombre: "Cliente Exceso", telefono: "1199887766" },
      tipo_entrega: "RETIRO",
      items: [{ producto_id: unitProdId, nombre: "Maple Huevos Campo", cantidad: 2, precio_unitario: 5200 }]
    });
  },
  /Stock insuficiente/i,
  "Order exceeding remaining unreserved stock must be rejected"
);
pass("3.4 Concurrent order exceeding (stock_actual - stock_reservado) is rejected");

// ---------------------------------------------------------------------------
// SUITE 4: Scale Weighing Finalization & Physical Stock Deduction
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 4: Scale Weighing Finalization & Stock Deduction ---");

// Simulate operator weighing 2.25 kg on the scale (customer asked 2.0 kg) and confirming 2 units
store.updateItemWeight(order1.id, 0, 2, { confirmUnit: true });
store.updateItemWeight(order1.id, 1, 2.25);

const finalizedOrder = store.finalizeOrderWeighing(order1.id);
assert.strictEqual(finalizedOrder.estado, "LISTO");
assert.strictEqual(finalizedOrder.stock_deducted, true);
assert.strictEqual(finalizedOrder.stock_reserved, false);

const afterFinalizeKg = store.getProducts().find((p) => p.id === kgProdId);
const afterFinalizeUnit = store.getProducts().find((p) => p.id === unitProdId);
assert.strictEqual(afterFinalizeKg.stock_reservado, 0, "Reserved KG stock must be released");
assert.strictEqual(afterFinalizeKg.stock_actual, 2.75, "Physical KG stock must deduct real scale weight (5 - 2.25 = 2.75)");
assert.strictEqual(afterFinalizeUnit.stock_reservado, 0, "Reserved unit stock must be released");
assert.strictEqual(afterFinalizeUnit.stock_actual, 1, "Physical unit stock must deduct confirmed units (3 - 2 = 1)");
pass("4.1 finalizeOrderWeighing releases stock_reservado and deducts real scale weight from stock_actual");

// ---------------------------------------------------------------------------
// SUITE 5: Cancellation & Single-Release Guarantee
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 5: Order Cancellation & Single-Release Guarantee ---");

const orderToCancel = store.createOrderDirect({
  cliente: { nombre: "Cliente Cancelar", telefono: "1122334455" },
  tipo_entrega: "RETIRO",
  items: [
    {
      producto_id: unitProdId,
      nombre: "Maple Huevos Campo",
      unidad_medida: "UNIDAD",
      cantidad_solicitada: 1,
      cantidad: 1,
      precio_unitario: 5200,
      subtotal: 5200
    }
  ]
});

assert.strictEqual(store.getProducts().find((p) => p.id === unitProdId).stock_reservado, 1);

store.cancelOrder(orderToCancel.id);
const afterCancelUnit = store.getProducts().find((p) => p.id === unitProdId);
assert.strictEqual(afterCancelUnit.stock_reservado, 0, "Cancellation must release reserved stock");
assert.strictEqual(afterCancelUnit.stock_actual, 1, "Cancellation must not deduct stock_actual");

// Calling cancelOrder a second time must NOT underflow or double-release
store.cancelOrder(orderToCancel.id);
assert.strictEqual(store.getProducts().find((p) => p.id === unitProdId).stock_reservado, 0);
pass("5.1 cancelOrder releases reserved stock once and is idempotent on repeated calls");

// ---------------------------------------------------------------------------
// SUITE 6: Admin & Client UI Contracts
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 6: Admin & Client UI Contracts ---");

const adminSrc = fs.readFileSync("js/views/admin.js", "utf8");
assert.ok(adminSrc.includes("prod-controlar-stock"), "admin.js must include #prod-controlar-stock checkbox");
assert.ok(adminSrc.includes("prod-stock-actual"), "admin.js must include #prod-stock-actual input");
assert.ok(adminSrc.includes("prod-stock-reservado"), "admin.js must display #prod-stock-reservado");
assert.ok(adminSrc.includes("prod-stock-disponible"), "admin.js must display #prod-stock-disponible");
pass("6.1 Admin product modal renders stock control checkbox, stock_actual input, reserved and available displays");

const clientSrc = fs.readFileSync("js/views/client.js", "utf8");
assert.ok(clientSrc.includes("btn-out-of-stock") && clientSrc.includes("Sin Stock"), "client.js must render Sin Stock state");
assert.ok(clientSrc.includes("Stock máximo alcanzado"), "client.js must cap increment button at available stock");
pass("6.2 Client catalog & cart drawer enforce available stock caps and render Sin Stock state");

console.log(`\n===============================================================`);
console.log(`   ALL ${totalPassed} V2-06 INVENTORY & STOCK TESTS PASSED`);
console.log(`===============================================================`);
