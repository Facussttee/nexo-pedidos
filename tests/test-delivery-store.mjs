import assert from "node:assert/strict";
const data = new Map();
let blocked = null;
globalThis.localStorage = {
  getItem: key => data.get(key) ?? null,
  setItem(key, value) { if (blocked?.(key)) throw new DOMException("QA quota", "QuotaExceededError"); data.set(key, String(value)); },
  removeItem: key => data.delete(key)
};
const { Store } = await import("../js/store.js");
const { resolveNexoConfig } = await import("../js/config.js");
const config = resolveNexoConfig({ mode: "demo" });
const keys = config.storageKeys;
const product = (overrides = {}) => ({ id: "qa-unit", nombre: "Producto QA", categoria: "Categoría nueva", unidad_medida: "UNIDAD", precio: 1200, paso: 1, disponible: true, ...overrides });
const customer = { nombre: "QA", telefono: "1100000098", direccion: "" };
function fresh(products = [product()]) {
  blocked = null; data.clear();
  const store = new Store(config);
  data.set(keys.PRODUCTS, JSON.stringify(products)); data.set(keys.ORDERS, "[]");
  store.setCurrentUser(customer);
  return store;
}
function order(store) { store.addToCart("qa-unit", 2); return store.createOrder({ cliente: customer, tipo_entrega: "RETIRO" }); }
let passed = 0;
function test(name, run) { try { run(); passed++; console.log("PASS " + name); } catch (error) { console.error("FAIL " + name); throw error; } }

test("corrupted catalogs block rendering and recover explicitly with raw backup", () => {
  for (const raw of ["not-json", "null", "{}", '[{"id":"missing"}]']) {
    const store = fresh(); data.set(keys.PRODUCTS, raw);
    assert.deepEqual(store.getProducts(), []); assert.ok(store.getCatalogError());
    assert.equal(data.get(keys.PRODUCTS), raw);
    store.recoverCatalog();
    assert.ok([...data].some(([key, value]) => key !== keys.PRODUCTS && value === raw));
    assert.ok(store.getProducts().length); assert.equal(store.getCatalogError(), null);
    assert.ok(new Store(config).getProducts().length);
  }
});
test("valid empty catalog stays empty and partial recovery preserves valid prices", () => {
  const store = fresh([]); assert.deepEqual(store.getProducts(), []); assert.equal(store.getCatalogError(), null);
  data.set(keys.PRODUCTS, JSON.stringify([product({ precio: 0 }), { id: "invalid" }]));
  assert.deepEqual(store.getProducts(), []); store.recoverCatalog();
  assert.deepEqual(store.getProducts(), [product({ precio: 0 })]);
});
test("recovery cannot overwrite original if backup or replacement cannot persist", () => {
  const store = fresh(); data.set(keys.PRODUCTS, "not-json");
  blocked = key => key.startsWith(keys.PRODUCTS); assert.throws(() => store.recoverCatalog(), /guard|almacen/i);
  assert.equal(data.get(keys.PRODUCTS), "not-json");
  blocked = key => key === keys.PRODUCTS; assert.throws(() => store.recoverCatalog(), /guard|almacen/i);
  assert.equal(data.get(keys.PRODUCTS), "not-json"); blocked = null;
});
test("production corruption never seeds synthetic catalog", () => {
  const store = fresh(); store.config = { ...config, mode: "production" };
  data.set(keys.PRODUCTS, "not-json"); assert.deepEqual(store.getProducts(), []);
  assert.throws(() => store.recoverCatalog(), /demo/i); assert.equal(data.get(keys.PRODUCTS), "not-json");
});
test("CRUD creates stable UUID/SKU/category, archives without touching snapshots", () => {
  const store = fresh(); const initial = order(store); const snapshot = JSON.stringify(store.getOrders());
  const created = store.saveProduct({ ...product({ nombre: "Nuevo", codigo: "001ab", precio: 0 }), id: "ignored" });
  assert.match(created.id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
  assert.equal(created.codigo, "001AB"); assert.ok(store.getCategories().includes("Categoría nueva"));
  store.saveProduct({ ...product(), precio: 2200 }, "qa-unit");
  store.archiveProduct("qa-unit");
  assert.equal(store.getProducts().some(p => p.id === "qa-unit"), false);
  assert.equal(store.getAdminProducts().find(p => p.id === "qa-unit").archivado, true);
  assert.equal(JSON.stringify(store.getOrders()), snapshot); assert.equal(store.getOrders()[0].id, initial.id);
  assert.throws(() => store.saveProduct({ ...product(), codigo: "001ab" }), /c[oó]digo|SKU/i);
});
test("product validation and failed saves never produce phantom success", () => {
  const store = fresh(); const before = data.get(keys.PRODUCTS);
  for (const draft of [product({ precio: NaN }), product({ precio: "" }), product({ paso: 0 }), product({ paso: 0.5 }), product({ nombre: "" })]) assert.throws(() => store.saveProduct(draft));
  assert.equal(data.get(keys.PRODUCTS), before);
  blocked = key => key === keys.PRODUCTS;
  assert.throws(() => store.saveProduct(product({ nombre: "Other" })), /guard|almacen/i);
  assert.throws(() => store.updateProductPrice("qa-unit", 2), /guard|almacen/i);
  assert.throws(() => store.toggleProductStock("qa-unit"), /guard|almacen/i);
  assert.throws(() => store.archiveProduct("qa-unit"), /guard|almacen/i);
  assert.equal(data.get(keys.PRODUCTS), before); assert.deepEqual(store.getProducts(), [product()]); blocked = null;
});
test("unit change rejects cart/order references, allows no-reference edit", () => {
  const store = fresh(); store.addToCart("qa-unit", 1);
  assert.throws(() => store.saveProduct({ ...product(), unidad_medida: "KG", paso: 0.5 }, "qa-unit"), /refer|pedido|carrito/i);
  store.createOrder({ cliente: customer, tipo_entrega: "RETIRO" });
  assert.throws(() => store.saveProduct({ ...product(), unidad_medida: "KG", paso: 0.5 }, "qa-unit"), /refer|pedido|carrito/i);
  const empty = fresh(); empty.saveProduct({ ...product(), unidad_medida: "KG", paso: 0.5 }, "qa-unit");
  assert.equal(empty.getProducts()[0].unidad_medida, "KG");
});
test("checkout requires explicit reselection after price, pause, archive or step changes", () => {
  for (const change of [s => s.updateProductPrice("qa-unit", 500), s => s.toggleProductStock("qa-unit"), s => s.archiveProduct("qa-unit")]) {
    const store = fresh(); store.addToCart("qa-unit", 1); const cart = data.get(keys.CART); change(store);
    assert.throws(() => store.createOrder({ cliente: customer, tipo_entrega: "RETIRO" }), /precio|paus|archiv|dispon|revis/i);
    assert.equal(data.get(keys.CART), cart); assert.equal(store.getOrders().length, 0);
  }
});
test("quantity edits cannot silently reprice an existing cart; changed step requires reselection", () => {
  const store = fresh(); store.addToCart("qa-unit", 1); const cart = data.get(keys.CART);
  store.updateProductPrice("qa-unit", 500);
  assert.throws(() => store.addToCart("qa-unit", 1), /cambi|precio|revis/i);
  assert.throws(() => store.setCartQuantity("qa-unit", 3), /cambi|precio|revis/i);
  assert.equal(data.get(keys.CART), cart);
  const kg = fresh([product({ unidad_medida: "KG", paso: 0.5 })]); kg.addToCart("qa-unit", 1);
  kg.saveProduct({ ...product(), unidad_medida: "KG", paso: 0.25 }, "qa-unit");
  assert.throws(() => kg.createOrder({ cliente: customer, tipo_entrega: "RETIRO" }), /paso|revis/i);
});
test("UNIDAD requires confirmation; quantity edit/restore invalidates only that item", () => {
  const store = fresh(); const created = order(store);
  assert.deepEqual(store.getPreparationProgress(created.id), { resolved: 0, total: 1, canFinalize: false });
  assert.throws(() => store.finalizeOrderWeighing(created.id));
  store.updateItemWeight(created.id, 0, 2, { confirmUnit: true }); assert.equal(store.getPreparationProgress(created.id).canFinalize, true);
  store.updateItemWeight(created.id, 0, 3); assert.equal(store.getPreparationProgress(created.id).resolved, 0);
  assert.throws(() => store.updateItemWeight(created.id, 0, 1.5, { confirmUnit: true }));
  store.updateItemWeight(created.id, 0, 3, { confirmUnit: true }); store.toggleItemOutOfStock(created.id, 0);
  assert.equal(store.getPreparationProgress(created.id).canFinalize, true);
  store.toggleItemOutOfStock(created.id, 0); assert.equal(store.getPreparationProgress(created.id).resolved, 0);
});
test("KG invalid edits clear previous weight and direct finalization cannot fallback", () => {
  for (const invalid of ["", 0, -1, "NaN", Infinity]) {
    const store = fresh([product({ unidad_medida: "KG", paso: 0.5 })]); const created = order(store);
    store.updateItemWeight(created.id, 0, "1,45"); assert.equal(store.getPreparationProgress(created.id).canFinalize, true);
    store.updateItemWeight(created.id, 0, invalid); assert.equal(store.getOrders()[0].items[0].peso_real, null);
    const snapshot = data.get(keys.ORDERS); assert.throws(() => store.finalizeOrderWeighing(created.id));
    assert.equal(data.get(keys.ORDERS), snapshot);
  }
});
test("mixed confirmation, item addition/removal, all missing zero and old history", () => {
  const store = fresh([product(), product({ id: "qa-kg", unidad_medida: "KG", paso: 0.5 })]); const created = order(store);
  store.updateItemWeight(created.id, 0, 2, { confirmUnit: true }); store.addProductToOrder(created.id, "qa-kg", 1);
  assert.deepEqual(store.getPreparationProgress(created.id), { resolved: 1, total: 2, canFinalize: false });
  store.removeItemFromOrder(created.id, 1); assert.equal(store.getPreparationProgress(created.id).canFinalize, true);
  store.finalizeOrderWeighing(created.id); assert.equal(store.getOrders()[0].total_real, 2400);
  const zero = fresh(); const z = order(zero); zero.toggleItemOutOfStock(z.id, 0); zero.finalizeOrderWeighing(z.id);
  assert.equal(zero.getOrders()[0].total_real, 0); assert.equal(zero.getOrders()[0].estado, "LISTO");
  const snapshot = data.get(keys.ORDERS); zero.finalizeOrderWeighing(z.id); assert.equal(data.get(keys.ORDERS), snapshot);
  const empty = fresh(); const e = order(empty); empty.removeItemFromOrder(e.id, 0); assert.throws(() => empty.finalizeOrderWeighing(e.id));
});
test("finite subtotals cannot overflow checkout or preparation totals", () => {
  const products = [product({ precio: 1e308 }), product({ id: "qa-second", precio: 1e308 })];
  for (const action of ["checkout", "finalize", "weight", "restore", "add", "cart"]) {
    const store = fresh(products);
    const item = p => ({ producto_id: p.id, nombre: p.nombre, categoria: p.categoria, unidad_medida: "UNIDAD", precio_unitario: p.precio, cantidad_solicitada: 1, peso_real: 1, subtotal: 1e308, sin_stock: false, confirmado_preparacion: true });
    const items = products.map(item);
    if (action === "restore") { items[1].sin_stock = true; items[1].subtotal = 0; }
    if (action === "add") items.pop();
    data.set(keys.ORDERS, JSON.stringify([{ id: 9010, cliente: customer, estado: "EN_PREPARACION", total_estimado: 1, total_real: null, items }]));
    const cart = Object.fromEntries(products.map(p => [p.id, { ...item(p), cantidad: 1, subtotal_estimado: 1e308 }]));
    data.set(keys.CART, JSON.stringify(action === "cart" ? { "qa-unit": cart["qa-unit"] } : cart));
    const beforeOrders = data.get(keys.ORDERS), beforeCart = data.get(keys.CART);
    const run = { checkout: () => store.createOrder({ cliente: customer, tipo_entrega: "RETIRO" }), finalize: () => store.finalizeOrderWeighing(9010), weight: () => store.updateItemWeight(9010, 0, 1), restore: () => store.toggleItemOutOfStock(9010, 1), add: () => store.addProductToOrder(9010, "qa-second", 1), cart: () => store.addToCart("qa-second", 1) };
    assert.throws(run[action], /importe|total|rango/i, action);
    assert.equal(data.get(keys.ORDERS), beforeOrders, action + " preserves orders");
    assert.equal(data.get(keys.CART), beforeCart, action + " preserves cart");
  }
});
test("failed local PIN save throws and preserves prior durable and readable settings", () => {
  const store = fresh(); store.saveLocalSettings({ staffPin: "4321" });
  const before = data.get(keys.LOCAL_SETTINGS);
  blocked = key => key === keys.LOCAL_SETTINGS;
  assert.throws(() => store.saveLocalSettings({ staffPin: "9876" }), /guard|almacen/i);
  assert.equal(data.get(keys.LOCAL_SETTINGS), before);
  assert.equal(store.getLocalSettings().staffPin, "4321"); blocked = null;
});
test("adding/removing after weighing keeps estimated totals based on requested snapshots", () => {
  const store = fresh([product({ unidad_medida: "KG", precio: 1000, paso: 0.5 }), product({ id: "qa-extra", precio: 100 })]);
  store.addToCart("qa-unit", 1);
  const created = store.createOrder({ cliente: customer, tipo_entrega: "RETIRO" });
  store.updateItemWeight(created.id, 0, 1.5);
  const weighed = store.getOrders()[0];
  assert.equal(weighed.total_estimado, 1000); assert.equal(weighed.total_real, 1500);
  const snapshot = JSON.stringify(weighed.items[0]);
  store.addProductToOrder(created.id, "qa-extra", 1);
  const added = store.getOrders()[0];
  assert.equal(added.total_estimado, 1100); assert.equal(added.total_real, 1600);
  assert.equal(JSON.stringify(added.items[0]), snapshot);
  store.removeItemFromOrder(created.id, 1);
  const removed = store.getOrders()[0];
  assert.equal(removed.total_estimado, 1000); assert.equal(removed.total_real, 1500);
  assert.equal(JSON.stringify(removed.items[0]), snapshot);
});
console.log(`${passed} delivery store scenarios passed`);
