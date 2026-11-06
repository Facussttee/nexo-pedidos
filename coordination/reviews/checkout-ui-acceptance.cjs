// Independent browser checkout acceptance; local synthetic demo, no source build.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

async function main() {
  if (!process.argv[2] || !process.argv[3]) throw new Error('Usage: node checkout-ui-acceptance.cjs ROOT OUT.json [--expect-fixed]');
  const root = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]);
  const phone = '1100000088';
  const report = { root, at: new Date().toISOString(), cases: [], errors: [], unexpected: [], pass: false,
    limits: ['Browser local demo only; no server transaction, DB, messages, multi-tab or atomicity guarantee.'] };
  let temporary, server, browser;
  function installFault(mode) {
    const prefix = 'nexo_demo_v1_';
    const originalSet = Storage.prototype.setItem, originalRemove = Storage.prototype.removeItem;
    window.__qaStorageAttempts = [];
    const blocked = key => mode === 'all-writes' || (mode === 'orders-failure' && key === prefix + 'orders') ||
      ((mode === 'cleanup-active' || mode === 'cleanup-both') && key === prefix + 'active_order') ||
      ((mode === 'cleanup-cart' || mode === 'cleanup-both') && key === prefix + 'cart');
    for (const [method, original] of [['setItem', originalSet], ['removeItem', originalRemove]]) {
      Storage.prototype[method] = function (key, ...values) {
        const fail = this === localStorage && blocked(String(key));
        window.__qaStorageAttempts.push({ method, key: String(key), blocked: fail });
        if (fail) throw new DOMException('QA synthetic storage unavailable', 'QuotaExceededError');
        return original.call(this, key, ...values);
      };
    }
    window.__qaRestoreStorage = () => { Storage.prototype.setItem = originalSet; Storage.prototype.removeItem = originalRemove; };
  }
  try {
    temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'nexo-checkout-ui-qa-'));
    const publicRoot = path.join(temporary, 'public');
    for (const asset of ['index.html', 'css/style.css', 'js/public-config.js', 'js/bundle.js']) {
      const target = path.join(publicRoot, asset);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(path.join(root, asset), target);
    }
    const { createStaticServer } = await import(pathToFileURL(path.join(root, 'bot/static-server.js')).href);
    server = createStaticServer({ publicRoot });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    report.served = { origin, publicRoot, ephemeral: true, builtSource: false };
    browser = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
    for (const mode of ['orders-failure', 'all-writes', 'cleanup-active', 'cleanup-cart', 'cleanup-both']) {
      const result = { mode, checks: [], errors: [], unexpected: [] };
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      const check = (name, pass, detail) => result.checks.push({ name, pass: Boolean(pass), ...(detail === undefined ? {} : { detail }) });
      let page;
      try {
        await context.route('**/*', route => {
          const request = route.request(), url = new URL(request.url());
          const local = url.origin === origin && ['GET', 'HEAD'].includes(request.method());
          const visual = url.protocol === 'https:' && request.method() === 'GET' && (
            (url.hostname === 'cdn.tailwindcss.com' && request.resourceType() === 'script') ||
            (url.hostname === 'fonts.googleapis.com' && request.resourceType() === 'stylesheet') ||
            (url.hostname === 'fonts.gstatic.com' && request.resourceType() === 'font'));
          if (local || visual) return route.continue();
          result.unexpected.push(request.url()); report.unexpected.push({ mode, url: request.url() });
          return route.abort();
        });
        page = await context.newPage();
        page.setDefaultTimeout(5000);
        page.on('pageerror', error => { result.errors.push(error.message); report.errors.push({ mode, message: error.message }); });
        await page.goto(`${origin}/?demo=1`, { waitUntil: 'load' });
        await page.locator('#phone-input').fill(phone);
        await page.locator('#name-input').fill('Cliente QA Checkout Sintético');
        await page.locator('#address-input').fill('Calle Ficticia QA 88');
        await page.locator('#phone-form button[type="submit"]').click();
        await page.locator('[data-add-id]').first().click();
        await page.locator('#btn-open-cart').click();
        await page.locator('#btn-confirm-order').waitFor();
        const snapshot = () => page.evaluate(() => {
          const read = suffix => localStorage.getItem('nexo_demo_v1_' + suffix);
          return { orders: JSON.parse(read('orders') || '[]'), cart: read('cart'), active: read('active_order'), attempts: window.__qaStorageAttempts || [] };
        });
        const visible = async () => {
          const text = await page.locator('#app-content').innerText();
          const alerts = [];
          for (const alert of await page.getByRole('alert').all()) if (await alert.isVisible()) alerts.push(await alert.innerText());
          return { text, alerts: alerts.filter(text => text.trim()) };
        };
        const tracking = async id => {
          const headings = (await page.locator('#app-content h2').allInnerTexts()).filter(text => /Pedido\s*#/i.test(text));
          const text = headings.length ? headings.join(' ') : (await visible()).text;
          return new RegExp('(?:Pedido\\s*#?\\s*|#)' + String(id) + '\\b', 'i').test(text);
        };
        if (mode === 'cleanup-active' || mode === 'cleanup-both') {
          await page.evaluate(() => {
            const prefix = 'nexo_demo_v1_', cliente = JSON.parse(localStorage.getItem(prefix + 'current_user'));
            const orders = JSON.parse(localStorage.getItem(prefix + 'orders'));
            orders.unshift({ id: 9900, demo: true, cliente, tipo_entrega: 'RETIRO', direccion_entrega: 'Retiro sintético', estado: 'PENDIENTE', fecha: new Date().toISOString(), total_estimado: 100, total_real: null,
              items: [{ producto_id: 'qa-prior', nombre: 'Pedido anterior sintético', categoria: 'QA', unidad_medida: 'UNIDAD', precio_unitario: 100, cantidad_solicitada: 1, peso_real: 1, subtotal: 100, sin_stock: false }] });
            localStorage.setItem(prefix + 'orders', JSON.stringify(orders));
            localStorage.setItem(prefix + 'active_order', '9900');
          });
        }
        const before = await snapshot();
        result.before = before;
        await page.evaluate(installFault, mode);
        await page.locator('#btn-confirm-order').click();
        await page.waitForTimeout(150);
        const after = await snapshot(), notice = await visible();
        result.after = after; result.notice = notice;
        check('fault exercised', after.attempts.some(attempt => attempt.blocked), after.attempts);
        const mine = state => state.orders.filter(order => order.cliente?.telefono === phone && !before.orders.some(prior => prior.id === order.id));
        const failedText = /no.*(guard|confirm)|almacenamiento|espacio.*(disponible|insuficiente)/i;
        const failedOrder = /(?:pedido|compra).{0,35}(?:fall[oó]|fallad|no\s+(?:se\s+)?(?:guard|cre|confirm))|no\s+(?:se\s+)?(?:pudo|logr[oó]).{0,25}(?:guardar|crear|confirmar).{0,20}pedido/i;
        if (!mode.startsWith('cleanup-')) {
          check('critical failure preserves durable orders/cart/active', JSON.stringify(after.orders) === JSON.stringify(before.orders) && after.cart === before.cart && after.active === before.active);
          check('drawer remains and visible recovery error', await page.locator('#cart-drawer-sheet').isVisible() && (notice.alerts.length > 0 || failedText.test(notice.text)), notice);
          check('no false received order after failed save', !/Pedido Recibido/i.test(notice.text) && mine(after).length === 0);
          await page.evaluate(() => window.__qaRestoreStorage());
          const retry = page.locator('#btn-confirm-order');
          if (await retry.isVisible() && await retry.isEnabled()) {
            await retry.click();
            await page.waitForTimeout(150);
            const accepted = await snapshot(), created = mine(accepted); result.afterRetry = accepted;
            check('restored retry creates exactly one genuine order', accepted.orders.length === before.orders.length + 1 && created.length === 1 && !before.orders.some(order => order.id === created[0].id));
            if (created.length === 1) {
              check('retry tracks new durable order ID', await tracking(created[0].id));
              await page.reload({ waitUntil: 'load' });
              const reloaded = await snapshot(); result.reloaded = reloaded;
              check('reload keeps same accepted order and tracking', mine(reloaded).length === 1 && mine(reloaded)[0].id === created[0].id && await tracking(created[0].id));
            }
          } else check('restored retry is available in drawer', false);
        } else {
          const created = mine(after);
          check('cleanup failure still accepts exactly one order', after.orders.length === before.orders.length + 1 && created.length === 1);
          check('visible receipt names accepted ID without false save-failed claim', created.length === 1 && await tracking(created[0].id) && /recibid|confirmad|cread|registrad/i.test(notice.text) && !failedOrder.test(notice.text), notice);
          await context.addInitScript(installFault, mode);
          await page.reload({ waitUntil: 'load' });
          const afterReload = await snapshot(); result.reloaded = afterReload;
          check('reload retains accepted order with no duplicate', mine(afterReload).length === 1 && created.length === 1 && mine(afterReload)[0].id === created[0].id);
          const back = page.locator('#btn-back-to-catalog');
          if (await back.isVisible()) await back.click();
          const cart = page.locator('#btn-open-cart');
          if (await cart.isVisible()) await cart.click();
          const retry = page.locator('#btn-confirm-order');
          result.retryEnabledAfterReload = await retry.isVisible() && await retry.isEnabled();
          if (result.retryEnabledAfterReload) { await retry.click(); await page.waitForTimeout(150); }
          const retried = await snapshot(); result.afterRetry = retried;
          check('retry after reload never duplicates accepted checkout', retried.orders.length === before.orders.length + 1 && mine(retried).length === 1 && created.length === 1 && mine(retried)[0].id === created[0].id);
        }
        check('no unexpected pageerrors or destinations', !result.errors.length && !result.unexpected.length);
      } catch (error) {
        check('browser scenario completed', false, error.message);
      } finally {
        if (page && !page.isClosed()) await page.evaluate(() => window.__qaRestoreStorage?.()).catch(() => {});
        await context.close();
        result.pass = result.checks.length > 0 && result.checks.every(check => check.pass) && !result.errors.length && !result.unexpected.length;
        report.cases.push(result);
      }
    }
    report.pass = report.cases.length === 5 && report.cases.every(result => result.pass) && !report.errors.length && !report.unexpected.length;
  } catch (error) {
    report.fatal = error.stack;
  } finally {
    if (browser) await browser.close().catch(error => report.errors.push({ cleanup: error.message }));
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (temporary) {
      const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(temporary));
      if (relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(temporary).startsWith('nexo-checkout-ui-qa-')) {
        await fs.rm(temporary, { recursive: true, force: true }); report.cleanedTemporary = true;
      }
    }
    report.pass = report.pass && !report.errors.length;
    await fs.writeFile(out, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ pass: report.pass, cases: report.cases.map(result => ({ mode: result.mode, pass: result.pass, failed: result.checks.filter(check => !check.pass) })), errors: report.errors, unexpected: report.unexpected, fatal: report.fatal, cleanedTemporary: report.cleanedTemporary, out }, null, 2));
  if (report.fatal || (process.argv.includes('--expect-fixed') && !report.pass)) process.exitCode = 1;
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
