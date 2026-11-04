// Codex independent acceptance: real Store, synthetic storage, no DOM or services.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const self = fileURLToPath(import.meta.url);
const worker = args[0] === '--worker';
const root = path.resolve(args[worker ? 1 : 0] || '.');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

if (!worker) {
  const output = args[1];
  if (!output || output.startsWith('--')) throw new Error('Usage: node script.mjs ROOT OUTPUT.json [--expect-fixed]');
  const run = (scenario, input = {}) => {
    const child = spawnSync(process.execPath, [self, '--worker', root, scenario], {
      input: JSON.stringify(input), encoding: 'utf8', windowsHide: true,
      timeout: 20000, maxBuffer: 2 * 1024 * 1024
    });
    try {
      if (child.error || child.status !== 0) throw new Error(child.error?.message || child.stderr || `exit ${child.status}`);
      return JSON.parse(child.stdout);
    } catch (error) {
      return { scenario, checks: [{ name: 'harness completed', pass: false, detail: String(error.message) }] };
    }
  };
  const cases = [];
  for (const scenario of ['normal', 'orders-failure', 'all-writes', 'cleanup-active', 'cleanup-cart', 'cleanup-both']) {
    const result = run(scenario);
    cases.push(result);
    if (scenario.startsWith('cleanup-') && result.durable) {
      cases.push(run(`${scenario}-reload`, { durable: result.durable }));
    }
  }
  const checks = cases.flatMap(c => c.checks);
  const report = {
    author: 'Codex', root, at: new Date().toISOString(),
    pass: checks.every(c => c.pass), passed: checks.filter(c => c.pass).length,
    failed: checks.filter(c => !c.pass).length,
    limitations: [
      'No DOM: visible error, button recovery and accessibility need browser acceptance.',
      'No server, DB, bot, real messages, browser storage events or multi-tab concurrency.',
      'Reload uses a separate child process and durable Map entries only; memoryFallback and ESM caches reset.',
      'Returned/thrown checkout outcomes are recorded, not interpreted as a specific future API contract.'
    ], cases
  };
  fs.writeFileSync(path.resolve(output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ pass: report.pass, passed: report.passed, failed: report.failed, output: path.resolve(output) }));
  process.exitCode = args.includes('--expect-fixed') && !report.pass ? 1 : 0;
} else {
  const scenario = args[2];
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const data = new Map(input.durable || []);
  let failMode = null;
  const attempts = [];
  const network = [];
  const effects = { sync: 0, audio: 0, events: [] };
  const storage = {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { mutate('set', key, () => data.set(key, String(value))); },
    removeItem(key) { mutate('remove', key, () => data.delete(key)); },
    clear() { throw new Error('Unexpected storage.clear'); },
    key(index) { return [...data.keys()][index] ?? null; },
    get length() { return data.size; }
  };
  // Installed before importing config/Store, including Store's exported singleton.
  globalThis.localStorage = storage;
  globalThis.fetch = (...values) => { network.push(String(values[0])); throw new Error('Network forbidden'); };
  globalThis.WebSocket = class { constructor() { network.push('WebSocket'); throw new Error('Network forbidden'); } };
  const configModule = await import(pathToFileURL(path.join(root, 'js/config.js')).href);
  const config = configModule.resolveNexoConfig({ mode: 'demo' });
  const keys = config.storageKeys;
  function mutate(op, key, apply) {
    const blocked = failMode === 'all-writes'
      || (failMode === 'orders-failure' && op === 'set' && key === keys.ORDERS)
      || (failMode?.startsWith('cleanup-') && (
        ((failMode === 'cleanup-active' || failMode === 'cleanup-both') && key === keys.ACTIVE_ORDER)
        || ((failMode === 'cleanup-cart' || failMode === 'cleanup-both') && key === keys.CART)));
    attempts.push({ op, key, blocked: Boolean(blocked) });
    if (blocked) throw new DOMException('Synthetic storage rejection', 'QuotaExceededError');
    apply();
  }
  const { Store } = await import(pathToFileURL(path.join(root, 'js/store.js')).href);
  const store = new Store(config);
  const user = { telefono: '1100000098', nombre: 'QA sintético', direccion: '' };
  const product = { id: 'qa-checkout', nombre: 'Producto QA', categoria: 'Almacén', unidad_medida: 'UNIDAD', precio: 1200, paso: 1, disponible: true };
  const seedOrder = id => ({ id, cliente: user, tipo_entrega: 'RETIRO', direccion_entrega: 'Retiro', estado: 'PENDIENTE', fecha: '2026-01-01T00:00:00.000Z', total_estimado: 5, total_real: null, items: [] });
  if (!input.durable) {
    storage.setItem(keys.PRODUCTS, JSON.stringify([product]));
    storage.setItem(keys.ORDERS, JSON.stringify([seedOrder(9002), seedOrder(9001)]));
    storage.setItem(keys.CUSTOMERS, JSON.stringify({ [user.telefono]: user }));
    storage.setItem(keys.LOCAL_SETTINGS, JSON.stringify({ staffPin: '4321' }));
    store.setCurrentUser(user);
    store.setActiveOrderId(9001);
    store.addToCart(product.id, 2);
  }
  // Existing side-effect boundaries only: no added product API or rewritten checkout.
  store.syncOrderToSupabase = async () => { effects.sync++; };
  store.playAudioAlert = () => { effects.audio++; };
  store.subscribe(event => effects.events.push(event));
  const read = (key, fallback) => data.has(key) ? JSON.parse(data.get(key)) : fallback;
  const snapshot = () => ({ orders: read(keys.ORDERS, []), cart: read(keys.CART, {}), active: read(keys.ACTIVE_ORDER, null) });
  const checks = [];
  const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), ...(detail === undefined ? {} : { detail }) });
  const outcomes = [];
  async function confirm() {
    try {
      const returned = await store.createOrder({ cliente: user, tipo_entrega: 'RETIRO', direccion_entrega: 'Retiro' });
      outcomes.push({ returned: returned === undefined ? '[undefined]' : returned });
    } catch (error) { outcomes.push({ thrown: { name: error.name, message: error.message } }); }
  }
  function coherent(label) {
    const durable = snapshot();
    check(`${label}: orders getter equals durable`, same(store.getOrders(), durable.orders));
    check(`${label}: cart getter equals durable`, same(store.getCart(), durable.cart));
    check(`${label}: active getter equals durable`, same(store.getActiveOrderId(), durable.active));
  }
  const before = snapshot();
  const protectedKeys = [keys.PRODUCTS, keys.CUSTOMERS, keys.CURRENT_USER, keys.LOCAL_SETTINGS];
  const protectedBefore = protectedKeys.map(key => [key, data.get(key)]);
  attempts.length = 0;
  if (scenario.endsWith('-reload')) {
    check('reload retained one accepted order', before.orders.length === 3);
    coherent('fresh process before retry');
    await confirm();
    await confirm();
    check('reload/repeated confirmation does not duplicate accepted order', snapshot().orders.length === before.orders.length);
    check('accepted order snapshots preserved after reload retry', same(before.orders, snapshot().orders));
    check('reload recovery targets the accepted order', snapshot().active === before.orders[0]?.id);
    // Explicit new cart operation must start a legitimate subsequent purchase.
    store.clearCart();
    store.addToCart(product.id, 1);
    await confirm();
    check('legitimate later purchase creates one new order', snapshot().orders.length === before.orders.length + 1);
    check('later purchase consumes its cart', Object.keys(snapshot().cart).length === 0);
    coherent('after later purchase');
  } else if (scenario === 'orders-failure' || scenario === 'all-writes') {
    failMode = scenario;
    await confirm();
    check('failure injection was reached', attempts.some(a => a.blocked));
    check('critical failure preserves durable orders/cart/active', same(before, snapshot()));
    check('critical failure has no acceptance effects', effects.sync === 0 && effects.audio === 0 && !['order_created', 'orders_changed', 'active_order_changed', 'cart_changed'].some(event => effects.events.includes(event)), effects);
    coherent('after critical failure');
    failMode = null;
    await confirm();
    await confirm();
    const accepted = snapshot();
    check('restored storage/retry creates one order', accepted.orders.length === before.orders.length + 1);
    check('previous orders remain unchanged', same(before.orders, accepted.orders.filter(o => before.orders.some(old => old.id === o.id))));
    check('successful retry clears cart', Object.keys(accepted.cart).length === 0);
    check('successful retry sets accepted active order', accepted.orders.some(o => o.id === accepted.active && !before.orders.some(old => old.id === o.id)));
    coherent('after restored storage');
    store.addToCart(product.id, 1);
    await confirm();
    check('legitimate later purchase is not deduplicated away', snapshot().orders.length === before.orders.length + 2);
  } else {
    failMode = scenario === 'normal' ? null : scenario;
    await confirm();
    const accepted = snapshot();
    check('one accepted order is durable', accepted.orders.length === before.orders.length + 1);
    check('previous orders snapshots preserved', same(before.orders, accepted.orders.filter(o => before.orders.some(old => old.id === o.id))));
    if (failMode) check('cleanup failure injection reached', attempts.some(a => a.blocked));
    else check('normal checkout clears cart', Object.keys(accepted.cart).length === 0);
    coherent('after checkout');
  }
  check('protected customer/catalog/config data preserved', same(protectedBefore, protectedKeys.map(key => [key, data.get(key)])));
  check('no network calls', network.length === 0, network);
  const report = { scenario, checks, before, after: snapshot(), outcomes, effects, attempts, durable: [...data] };
  process.stdout.write(JSON.stringify(report));
}
