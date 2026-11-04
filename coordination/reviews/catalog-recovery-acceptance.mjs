// Independent catalogue recovery acceptance: actual Store, synthetic storage, no services.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] || '.');
const output = process.argv[3];
if (!output) throw new Error('Usage: node catalog-recovery-acceptance.mjs ROOT REPORT.json [--expect-fixed]');
const data = new Map();
let rejectWrites = false;
const network = [];
globalThis.localStorage = {
  getItem: key => data.has(key) ? data.get(key) : null,
  setItem(key, value) { if (rejectWrites) throw new DOMException('Synthetic quota failure', 'QuotaExceededError'); data.set(key, String(value)); },
  removeItem(key) { if (rejectWrites) throw new DOMException('Synthetic quota failure', 'QuotaExceededError'); data.delete(key); }
};
globalThis.fetch = (...args) => { network.push(String(args[0])); throw new Error('Network prohibited in catalogue QA'); };
const { resolveNexoConfig } = await import(pathToFileURL(path.join(root, 'js/config.js')).href);
const { Store } = await import(pathToFileURL(path.join(root, 'js/store.js')).href);
const config = resolveNexoConfig({ mode: 'demo' }), keys = config.storageKeys;
const good = { id: 'qa-valid', nombre: 'Producto sintético', categoria: 'QA', unidad_medida: 'KG', precio: 123.45, paso: 0.5, disponible: true };
const report = { root, at: new Date().toISOString(), checks: [], errors: [], network, limits: ['Reload creates a new Store; browser reload is verified separately.'], pass: false };
const check = (name, pass, detail) => report.checks.push({ name, pass: Boolean(pass), ...(detail === undefined ? {} : { detail }) });
const hasRecovery = typeof Store.prototype.getCatalogError === 'function' && typeof Store.prototype.recoverCatalog === 'function';
check('visible issue and explicit recovery contracts exist', hasRecovery);
const protectedKeys = [keys.ORDERS, keys.CART, keys.CUSTOMERS, keys.CURRENT_USER, keys.LOCAL_SETTINGS];
function seed(raw) {
  data.clear();
  const customer = { nombre: 'Cliente QA', telefono: '1100000099' };
  data.set(keys.ORDERS, JSON.stringify([{ id: 9000, cliente: customer, estado: 'PENDIENTE', fecha: '2026-01-01T00:00:00.000Z', items: [], total_estimado: 0, total_real: null }]));
  data.set(keys.CART, '{}');
  data.set(keys.CUSTOMERS, JSON.stringify({ [customer.telefono]: customer }));
  data.set(keys.CURRENT_USER, JSON.stringify(customer));
  data.set(keys.LOCAL_SETTINGS, JSON.stringify({ staffPin: '4321' }));
  data.set(keys.PRODUCTS, raw);
}
const protectedSnapshot = () => JSON.stringify(protectedKeys.map(key => [key, data.get(key)]));
const fixtures = [
  ['not JSON', 'not-json', false],
  ['object instead of array', '{}', false],
  ['explicit null', 'null', false],
  ['incomplete entry', '[{}]', false],
  ['infinite price', '[{"id":"bad","nombre":"QA","categoria":"QA","unidad_medida":"KG","precio":1e309,"paso":0.5,"disponible":true}]', false],
  ['mixed valid and invalid', JSON.stringify([good, {}]), false],
  ['valid catalogue', JSON.stringify([good]), true],
  ['valid empty catalogue', '[]', true]
];
for (const [name, raw, valid] of fixtures) {
  try {
    seed(raw);
    const before = protectedSnapshot();
    const store = new Store(config), products = store.getProducts();
    check(`${name}: getter cannot expose malformed catalogue`, Array.isArray(products) && (valid || products.length === 0));
    check(`${name}: reading preserves original raw data`, data.get(keys.PRODUCTS) === raw);
    check(`${name}: reading preserves orders/customer/cart/config`, protectedSnapshot() === before);
    if (valid) {
      check(`${name}: valid data and price preserved`, products.length === (name === 'valid empty catalogue' ? 0 : 1) && (!products.length || products[0].id === 'qa-valid' && products[0].precio === 123.45));
      if (hasRecovery) check(`${name}: no recovery issue`, !store.getCatalogError());
      continue;
    }
    if (!hasRecovery) continue;
    check(`${name}: issue exposed for visible UI`, typeof store.getCatalogError() === 'string' && store.getCatalogError().length > 0);
    store.recoverCatalog();
    const recovered = store.getProducts();
    const durable = JSON.parse(data.get(keys.PRODUCTS));
    check(`${name}: recovery is durable, not a memory-only success`, Array.isArray(durable) && recovered.every(p => durable.some(saved => saved.id === p.id && saved.precio === p.precio)) && data.get(keys.PRODUCTS) !== raw);
    check(`${name}: explicit recovery returns valid data`, Array.isArray(recovered) && recovered.length > 0 && !store.getCatalogError());
    check(`${name}: original recoverable in a separate durable backup`, [...data].some(([key, value]) => key !== keys.PRODUCTS && value === raw));
    if (name === 'mixed valid and invalid') check('recovery preserves valid row and its price', recovered.some(p => p.id === 'qa-valid' && p.precio === 123.45));
    check(`${name}: recovery preserves other records`, protectedSnapshot() === before);
    const reload = new Store(config);
    check(`${name}: recovery survives reload`, Array.isArray(reload.getProducts()) && reload.getProducts().length === recovered.length && !reload.getCatalogError());
  } catch (error) {
    report.errors.push({ name, error: error.message });
    check(`${name}: completes without crash`, false, error.message);
  }
}
if (hasRecovery) {
  seed('not-json');
  const before = protectedSnapshot(), store = new Store(config);
  store.getProducts();
  rejectWrites = true;
  let rejected = false;
  try { store.recoverCatalog(); } catch { rejected = true; }
  check('failed recovery is explicit and does not replace original', rejected && data.get(keys.PRODUCTS) === 'not-json' && protectedSnapshot() === before);
  rejectWrites = false;
  store.recoverCatalog();
  check('recovery can be retried after storage returns', store.getProducts().length > 0 && !store.getCatalogError());
}
check('no data or SDK network calls', network.length === 0);
report.pass = report.checks.every(item => item.pass) && !report.errors.length;
fs.writeFileSync(path.resolve(output), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ pass: report.pass, total: report.checks.length, failed: report.checks.filter(item => !item.pass), errors: report.errors, output: path.resolve(output) }));
if (process.argv.includes('--expect-fixed') && !report.pass) process.exitCode = 1;
