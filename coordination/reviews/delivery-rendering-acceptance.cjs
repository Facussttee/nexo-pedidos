// Independent delivery rendering acceptance; synthetic data and local marker only.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

async function main() {
  if (!process.argv[2] || !process.argv[3]) throw new Error('Usage: node delivery-rendering-acceptance.cjs <source-root> <report.json> [--expect-fixed]');
  const root = path.resolve(process.argv[2]);
  const out = path.resolve(process.argv[3]);
  const payload = '<img src=x onerror=window.__qaDelivery=1> & " \' Ω';
  const quotedId = 'qa-id" data-qa-injected="id" onmouseover="window.__qaDelivery=1';
  const cssId = 'qa-admin"].broken:#';
  const report = { root, payload, quotedId, cssId, checks: [], errors: [], unexpected: [], pass: false };
  let temporary, server, browser;
  const customer = { nombre: 'Cliente sintético QA', telefono: '1100000096', direccion: 'Retiro sintético' };
  const product = (overrides = {}) => ({ id: 'qa-product', nombre: 'Producto sintético QA', categoria: 'QA', detalle: 'Detalle sintético', unidad_medida: 'UNIDAD', precio: 100, paso: 1, disponible: true, ...overrides });
  const cartItem = (overrides = {}) => ({ producto_id: 'qa-product', nombre: 'Producto sintético QA', categoria: 'QA', unidad_medida: 'UNIDAD', precio_unitario: 100, cantidad: 1, subtotal_estimado: 100, ...overrides });
  const orderItem = (overrides = {}) => ({ producto_id: 'qa-snapshot', nombre: 'Snapshot sintético', categoria: 'QA', unidad_medida: 'UNIDAD', precio_unitario: 100, cantidad_solicitada: 1, peso_real: 1, subtotal: 100, sin_stock: false, ...overrides });
  const order = (items) => ({ id: 9901, demo: true, cliente: customer, tipo_entrega: 'RETIRO', direccion_entrega: 'Retiro sintético', estado: 'EN_PREPARACION', fecha: new Date().toISOString(), total_estimado: 100, total_real: null, items });
  try {
    temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'nexo-delivery-qa-'));
    const publicRoot = path.join(temporary, 'public');
    for (const asset of ['index.html', 'css/style.css', 'js/public-config.js', 'js/bundle.js']) {
      const destination = path.join(publicRoot, asset);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(path.join(root, asset), destination);
    }
    const { createStaticServer } = await import(pathToFileURL(path.join(root, 'bot/static-server.js')).href);
    server = createStaticServer({ publicRoot });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    report.served = { origin, publicRoot, ephemeral: true, builtSource: false };
    browser = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });

    async function runCase(name, seed, view, action) {
      const check = { name, pass: false, errors: [], unexpected: [] };
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      try {
        await context.route('**/*', (route) => {
          const request = route.request();
          const url = new URL(request.url());
          const local = url.origin === origin && ['GET', 'HEAD'].includes(request.method());
          const visual = url.protocol === 'https:' && request.method() === 'GET' && (
            (url.hostname === 'cdn.tailwindcss.com' && request.resourceType() === 'script') ||
            (url.hostname === 'fonts.googleapis.com' && request.resourceType() === 'stylesheet') ||
            (url.hostname === 'fonts.gstatic.com' && request.resourceType() === 'font'));
          if (local || visual) return route.continue();
          check.unexpected.push(request.url());
          report.unexpected.push({ case: name, url: request.url() });
          return route.abort();
        });
        await context.addInitScript(({ seed, customer }) => {
          const values = { products: seed.products, orders: seed.orders || [], customers: {}, current_user: customer, cart: seed.cart || {}, local_settings: { staffPin: '1234' } };
          for (const [key, value] of Object.entries(values)) localStorage.setItem('nexo_demo_v1_' + key, JSON.stringify(value));
          window.__qaDelivery = 0;
        }, { seed, customer });
        const page = await context.newPage();
        page.setDefaultTimeout(5000);
        page.on('pageerror', error => { check.errors.push(error.message); report.errors.push({ case: name, message: error.message }); });
        await page.goto(`${origin}/?demo=1#${view}`, { waitUntil: 'load' });
        if (view !== 'client') {
          await page.locator('#pin-input').fill('1234');
          await page.locator('#pin-input').press('Enter');
        }
        await action(page, check);
        await page.waitForTimeout(150);
        const state = await page.evaluate(() => ({
          marker: window.__qaDelivery || 0,
          handlers: Array.from(document.querySelectorAll('*')).flatMap(el => Array.from(el.attributes).filter(a => /^on/i.test(a.name)).map(a => ({ tag: el.tagName, name: a.name }))),
          injectedAttributes: document.querySelectorAll('[data-qa-injected]').length
        }));
        Object.assign(check, state);
        check.pass = check.literalPreserved === true && check.dataPreserved === true && check.interaction === true && !state.marker && !state.handlers.length && !state.injectedAttributes && !check.errors.length && !check.unexpected.length;
      } catch (error) {
        check.failure = error.message;
      } finally {
        await context.close();
        report.checks.push(check);
      }
    }
    const stored = (page, key) => page.evaluate(key => JSON.parse(localStorage.getItem('nexo_demo_v1_' + key)), key);
    async function byData(page, attribute, value) {
      const matches = page.locator(`[${attribute}]`);
      const index = await matches.evaluateAll((elements, { attribute, value }) => elements.findIndex(el => el.getAttribute(attribute) === value), { attribute, value });
      if (index < 0) throw new Error(`Missing exact ${attribute} value`);
      return matches.nth(index);
    }

    for (const [field, selector] of [['nombre', 'h3'], ['detalle', 'p'], ['categoria', 'span']]) {
      await runCase(`catalog product ${field}`, { products: [product({ [field]: payload })] }, 'client', async (page, check) => {
        await page.locator('[data-add-id]').waitFor();
        check.literalPreserved = (await page.locator('#products-list-container').locator(selector).allTextContents()).some(text => text.trim() === payload);
        await (await byData(page, 'data-add-id', 'qa-product')).click();
        check.interaction = (await stored(page, 'cart'))['qa-product']?.cantidad === 1;
        check.dataPreserved = (await stored(page, 'products'))[0][field] === payload;
      });
    }
    for (const field of ['nombre', 'categoria']) {
      await runCase(`cart snapshot ${field}`, { products: [product()], cart: { 'qa-product': cartItem({ [field]: payload }) } }, 'client', async (page, check) => {
        await page.locator('#btn-open-cart').click();
        await page.locator('#cart-drawer-items-list').waitFor();
        check.literalPreserved = (await page.locator('#cart-drawer-items-list').textContent()).includes(payload);
        check.dataPreserved = (await stored(page, 'cart'))['qa-product'][field] === payload;
        await (await byData(page, 'data-drawer-remove', 'qa-product')).click();
        check.interaction = !Object.hasOwn(await stored(page, 'cart'), 'qa-product');
      });
    }
    await runCase('preparation historical item name/category', { products: [product()], orders: [order([orderItem({ nombre: payload, categoria: payload })])] }, 'operator', async (page, check) => {
      await page.locator('[data-tab="EN_PREPARACION"]').click();
      await page.locator('.item-weigh-card').waitFor();
      const card = page.locator('.item-weigh-card').first();
      check.literalPreserved = (await card.locator('h4').textContent()).trim() === payload && (await card.locator('span').allTextContents()).some(text => text.trim() === payload);
      const item = (await stored(page, 'orders'))[0].items[0];
      check.dataPreserved = item.nombre === payload && item.categoria === payload;
      await card.getByRole('button', { name: 'Sin Stock', exact: true }).click();
      check.interaction = (await stored(page, 'orders'))[0].items[0].sin_stock === true;
    });
    await runCase('client quoted product ID add/cart', { products: [product({ id: quotedId })] }, 'client', async (page, check) => {
      await page.locator('[data-add-id]').waitFor();
      check.literalPreserved = await page.locator('[data-add-id]').first().getAttribute('data-add-id') === quotedId;
      await (await byData(page, 'data-add-id', quotedId)).click();
      await page.locator('#btn-open-cart').click();
      await (await byData(page, 'data-drawer-inc', quotedId)).click();
      check.interaction = (await stored(page, 'cart'))[quotedId]?.cantidad === 2;
      check.dataPreserved = (await stored(page, 'products'))[0].id === quotedId && (await stored(page, 'cart'))[quotedId]?.producto_id === quotedId;
    });
    await runCase('operator quoted product ID selector/add', { products: [product({ id: quotedId })], orders: [order([orderItem()])] }, 'operator', async (page, check) => {
      await page.locator('[data-tab="EN_PREPARACION"]').click();
      await page.getByRole('button', { name: 'Agregar producto que olvidó el cliente' }).click();
      await page.locator('#select-new-product').waitFor();
      check.literalPreserved = await page.locator('#select-new-product option').first().getAttribute('value') === quotedId;
      if (check.literalPreserved) await page.locator('#select-new-product').selectOption({ value: quotedId });
      await page.getByRole('button', { name: 'Agregar', exact: true }).click();
      check.interaction = (await stored(page, 'orders'))[0].items.some(item => item.producto_id === quotedId);
      check.dataPreserved = (await stored(page, 'products'))[0].id === quotedId;
    });
    for (const operation of ['direct price', 'price stepper']) {
      await runCase(`admin CSS-sensitive ID ${operation}`, { products: [product({ id: cssId })] }, 'admin', async (page, check) => {
        await page.locator('[data-product-id]').waitFor();
        const input = await byData(page, 'data-product-id', cssId);
        check.literalPreserved = await input.getAttribute('data-product-id') === cssId;
        if (operation === 'direct price') {
          await input.fill('250');
          await input.press('Tab');
        } else {
          await (await byData(page, 'data-edit-product', cssId)).click();
          await page.getByRole('button', { name: 'Subir $100', exact: true }).click();
          await page.locator('#product-form button[type="submit"]').click();
          await page.locator('#product-form').waitFor({ state: 'hidden' });
        }
        const result = (await stored(page, 'products'))[0];
        check.interaction = result.precio === (operation === 'direct price' ? 250 : 200);
        check.dataPreserved = result.id === cssId && result.nombre === 'Producto sintético QA';
      });
    }
    report.pass = report.checks.length === 10 && report.checks.every(check => check.pass) && !report.errors.length && !report.unexpected.length;
  } catch (error) {
    report.fatal = error.stack;
  } finally {
    if (browser) await browser.close().catch(error => report.errors.push({ cleanup: error.message }));
    if (server) {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
    if (temporary) {
      const tempRoot = path.resolve(os.tmpdir());
      const relative = path.relative(tempRoot, path.resolve(temporary));
      if (relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(temporary).startsWith('nexo-delivery-qa-')) {
        await fs.rm(temporary, { recursive: true, force: true });
        report.cleanedTemporary = true;
      }
    }
    report.pass = report.pass && !report.errors.length;
    await fs.writeFile(out, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ pass: report.pass, checks: report.checks.map(({ name, pass, failure }) => ({ name, pass, failure })), errors: report.errors, unexpected: report.unexpected, fatal: report.fatal, cleanedTemporary: report.cleanedTemporary, out }, null, 2));
  if (report.fatal || (process.argv.includes('--expect-fixed') && !report.pass)) process.exitCode = 1;
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
