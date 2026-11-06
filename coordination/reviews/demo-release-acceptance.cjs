// Independent synthetic vertical acceptance. No store calls perform user operations.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = (value, message) => { if (!value) throw new Error(message); };

async function main() {
  if (!process.argv[2] || !process.argv[3]) throw new Error('Usage: node demo-release-acceptance.cjs <root> <report.json> [--expect-fixed]');
  const root = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]);
  const report = { root, synthetic: true, checks: [], errors: [], unexpected: [], screenshots: [], pass: false };
  let temporary, server, browser;
  try {
    temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'nexo-release-qa-'));
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
    report.served = { origin, publicRoot, assets: 4, ephemeral: true, builtSource: false };
    browser = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
    for (const viewport of [{ width: 390, height: 844 }, { width: 1024, height: 768 }]) {
      const label = `${viewport.width}x${viewport.height}`;
      const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
      const errors = [], unexpected = [], dialogs = [];
      let page, stage = 'admin CRUD available';
      const stored = key => page.evaluate(key => JSON.parse(localStorage.getItem('nexo_demo_v1_' + key)), key);
      const order = async () => (await stored('orders'))[0];
      const products = () => stored('products');
      const check = async (name, action) => {
        stage = name;
        const entry = { viewport: label, name, pass: false };
        report.checks.push(entry);
        await action(entry);
        entry.pass = !entry.failure;
      };
      async function unlock() {
        if (await page.locator('#pin-input').isVisible()) {
          await page.locator('#pin-input').fill('1234');
          await page.locator('#pin-input').press('Enter');
        }
      }
      async function view(name) {
        await page.locator(`.nav-switch[data-view="${name}"]`).click();
        await unlock();
      }
      async function freshAdmin() {
        await page.reload({ waitUntil: 'networkidle' });
        await unlock();
        await page.locator('#btn-new-product').waitFor();
      }
      async function form(values) {
        await page.locator('#prod-name').fill(values.name);
        await page.locator('#prod-category').fill('Categoría sintética QA');
        await page.locator('#prod-code').fill(values.code);
        await page.locator('#prod-unit').selectOption(values.unit);
        await page.locator('#prod-price').fill(String(values.price));
        if (values.unit === 'KG') await page.locator('#prod-step').selectOption('0.25');
        else assert(await page.locator('#prod-step').inputValue() === '1', 'UNIDAD debe usar paso 1');
        await page.locator('#prod-detail').fill('Sólo datos sintéticos de aceptación');
      }
      async function save() { await page.locator('#product-form').getByRole('button', { name: 'Guardar producto', exact: true }).click(); }
      async function visibleRejection(pattern) {
        const notice = page.locator('#product-form-error');
        const text = await notice.isVisible() ? await notice.innerText() : '';
        assert(pattern.test(text) || dialogs.some(text => pattern.test(text)), 'Falta rechazo visible para el usuario');
      }
      try {
        await context.route('**/*', route => {
          const request = route.request(), url = new URL(request.url());
          const local = url.origin === origin && ['GET', 'HEAD'].includes(request.method());
          const visual = url.protocol === 'https:' && request.method() === 'GET' && (
            (url.hostname === 'cdn.tailwindcss.com' && request.resourceType() === 'script') ||
            (url.hostname === 'fonts.googleapis.com' && request.resourceType() === 'stylesheet') ||
            (url.hostname === 'fonts.gstatic.com' && request.resourceType() === 'font'));
          if (local || visual) return route.continue();
          unexpected.push(request.url());
          report.unexpected.push({ viewport: label, url: request.url(), method: request.method() });
          return route.abort();
        });
        await context.addInitScript(() => {
          if (localStorage.getItem('__qa_release_initialized')) return;
          for (const [key, value] of Object.entries({ products: [], orders: [], customers: {}, cart: {}, current_user: null, local_settings: { staffPin: '1234' } })) {
            localStorage.setItem('nexo_demo_v1_' + key, JSON.stringify(value));
          }
          localStorage.setItem('__qa_release_initialized', '1');
        });
        page = await context.newPage();
        page.setDefaultTimeout(4000);
        page.on('pageerror', error => { errors.push(error.message); report.errors.push({ viewport: label, message: error.message }); });
        page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
        page.on('popup', popup => { unexpected.push('popup:' + popup.url()); popup.close(); });
        await page.goto(`${origin}/?demo=1#admin`, { waitUntil: 'networkidle' });
        await unlock();
        await check(stage, async () => assert(await page.locator('#btn-new-product').count(), 'Feature ausente: no existe Nuevo producto'));
        let unit, kg;
        await check('create UNIDAD and KG through real admin', async entry => {
          for (const values of [{ name: 'Unidad sintética QA', code: '000071', unit: 'UNIDAD', price: 125 }, { name: 'Peso sintético QA', code: '000072', unit: 'KG', price: 1000 }]) {
            await page.locator('#btn-new-product').click();
            await form(values); await save();
            await page.waitForFunction(code => JSON.parse(localStorage.getItem('nexo_demo_v1_products')).some(p => p.codigo === code), values.code);
          }
          const catalog = await products();
          unit = catalog.find(p => p.codigo === '000071'); kg = catalog.find(p => p.codigo === '000072');
          assert(unit && kg && unit.id !== kg.id && unit.precio === 125 && kg.precio === 1000, 'Alta no persistida o ID/precio incorrecto');
          entry.created = [unit, kg];
        });
        await check('zero price accepted and duplicate SKU visibly rejected', async () => {
          await page.locator('#btn-new-product').click();
          await form({ name: 'Cero sintético QA', code: '000073', unit: 'UNIDAD', price: 0 }); await save();
          assert((await products()).find(p => p.codigo === '000073')?.precio === 0, 'Precio cero rechazado');
          await page.locator('#btn-new-product').click();
          await form({ name: 'Duplicado sintético QA', code: '000071', unit: 'UNIDAD', price: 99 }); await save();
          assert((await products()).length === 3, 'SKU duplicado generó una fila');
          await visibleRejection(/duplic|ya existe|únic|utilizad/i);
          await freshAdmin();
        });
        await check('failed catalog write preserves form and retries exactly once', async entry => {
          const before = await products();
          await page.locator('#btn-new-product').click();
          await form({ name: 'Persistencia sintética QA', code: '000074', unit: 'UNIDAD', price: 777 });
          await page.evaluate(() => {
            window.__qaReleaseSetItem = Storage.prototype.setItem;
            Storage.prototype.setItem = function(key, value) {
              if (key === 'nexo_demo_v1_products') throw new DOMException('Fallo sintético QA de catálogo', 'QuotaExceededError');
              return window.__qaReleaseSetItem.call(this, key, value);
            };
          });
          try {
            await save();
            assert(JSON.stringify(await products()) === JSON.stringify(before), 'Alta fallida alteró catálogo');
            assert(await page.locator('#product-form').isVisible() && await page.locator('#prod-name').inputValue() === 'Persistencia sintética QA' && await page.locator('#prod-price').inputValue() === '777', 'Alta fallida perdió formulario/nombre/precio');
            await visibleRejection(/guardar|almacenamiento|espacio|reintent/i);
          } finally {
            await page.evaluate(() => { Storage.prototype.setItem = window.__qaReleaseSetItem; delete window.__qaReleaseSetItem; });
          }
          await save();
          const after = await products();
          assert(after.length === before.length + 1 && after.filter(product => product.codigo === '000074').length === 1, 'Reintento no creó exactamente un producto');
          await freshAdmin();
          assert((await products()).filter(product => product.codigo === '000074' && product.precio === 777).length === 1, 'Reintento no persistió tras recarga');
          entry.persistedCount = (await products()).length;
        });
        await check('customer form, dynamic category and mixed estimated checkout', async entry => {
          await view('client');
          await page.locator('#phone-input').fill('1100000071');
          await page.locator('#name-input').fill('Cliente sintético QA');
          await page.locator('#address-input').fill('Dirección sintética 71');
          await page.locator('#phone-form button[type="submit"]').click();
          await page.locator('[data-category="Categoría sintética QA"]').click();
          await page.locator(`[data-add-id="${unit.id}"]`).click();
          await page.locator(`[data-add-id="${kg.id}"]`).click();
          const cart = await stored('cart');
          const estimate = Object.values(cart).reduce((sum, item) => sum + item.subtotal_estimado, 0);
          assert(Object.keys(cart).length === 2 && estimate > 125, 'Carrito mixto incompleto');
          await page.locator('#btn-header-cart').click();
          const drawer = await page.locator('#cart-drawer-sheet').innerText();
          assert(/estimado/i.test(drawer) && drawer.includes(estimate.toLocaleString('es-AR')), 'Carrito no presenta estimado correcto');
          await page.locator('#delivery-card-retiro').click();
          await page.locator('#btn-confirm-order').click();
          await page.waitForFunction(() => JSON.parse(localStorage.getItem('nexo_demo_v1_orders')).length === 1);
          const accepted = await order();
          assert(accepted.estado === 'PENDIENTE' && accepted.items.length === 2 && accepted.total_estimado === estimate, 'Checkout no conservó estimado/snapshots');
          assert(Object.keys((await stored('cart')) || {}).length === 0, 'Checkout no limpió carrito confirmado');
          entry.orderId = accepted.id; entry.totalEstimated = estimate;
        });
        await check('explicit UNIDAD confirmation and decimal kg with grams; unresolved closing blocked', async entry => {
          await view('operator');
          const accepted = await order();
          await page.locator(`[data-start-id="${accepted.id}"]`).click();
          const finish = page.locator(`[data-finish-order-id="${accepted.id}"]`);
          if (!(await finish.isDisabled())) await finish.click();
          assert((await order()).estado === 'EN_PREPARACION', 'Cerró sin resolver los ítems');
          const ui = accepted.items.findIndex(item => item.unidad_medida === 'UNIDAD');
          const ki = accepted.items.findIndex(item => item.unidad_medida === 'KG');
          assert((await order()).items[ui].confirmado_preparacion !== true, 'UNIDAD confirmada implícitamente');
          await page.locator(`.input-weight[data-item-idx="${ui}"]`).fill('2');
          await page.locator(`[data-confirm-unit-order="${accepted.id}"][data-item-idx="${ui}"]`).click();
          const input = page.locator(`.input-weight[data-item-idx="${ki}"]`);
          await input.fill('1,45'); await input.press('Tab');
          await page.waitForFunction(() => JSON.parse(localStorage.getItem('nexo_demo_v1_orders'))[0].items.some(i => i.unidad_medida === 'KG' && i.peso_real === 1.45));
          const grams = (await page.locator('[data-weight-grams]').allTextContents()).join(' ');
          assert(/1[.,\s]?450\s*g/.test(grams), 'Falta equivalente visible de 1450 g');
          assert(/2\s*(?:\/|de)\s*2/.test(await page.locator('[data-preparation-progress]').innerText()), 'Contador de preparación incorrecto');
          if (viewport.width === 390) {
            const shot = path.join(path.dirname(out), 'DEMO_RELEASE_PREPARATION_390.png');
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            entry.captureLayout = await page.evaluate(() => {
              const bounds = element => element ? Object.fromEntries(['top', 'bottom', 'height'].map(key => [key, element.getBoundingClientRect()[key]])) : null;
              const card = document.querySelector('[data-preparation-order]');
              return {
                header: bounds(document.querySelector('#app-content header')), card: bounds(card), label: bounds(card?.querySelector('span')),
                rootOffset: getComputedStyle(document.documentElement).getPropertyValue('--sim-bar-h'), bodyOffset: getComputedStyle(document.body).getPropertyValue('--sim-bar-h'),
                scrolled: Array.from(document.querySelectorAll('*')).filter(element => element.scrollTop > 0).map(element => ({ tag: element.tagName, id: element.id, class: element.className, top: element.scrollTop }))
              };
            });
            await page.screenshot({ path: shot, fullPage: true }); report.screenshots.push(shot);
            try {
              assert(entry.captureLayout.scrolled.length === 0, 'La captura de preparación debe estar sin scroll');
              assert(entry.captureLayout.header.bottom <= entry.captureLayout.label.top + 1, `Cabecera hasta ${entry.captureLayout.header.bottom}px tapa rótulo desde ${entry.captureLayout.label.top}px`);
            } catch (error) { entry.failure = error.message; }
          }
          entry.prepared = (await order()).items;
          await finish.click();
          await page.locator(`[data-wa-order-id="${accepted.id}"]`).waitFor();
          assert((await order()).estado === 'LISTO' && (await order()).total_real === 1700, 'Final exacto debe ser 2×125 + 1,45×1000 = 1700');
        });
        await check('LISTO exact final, simulated WhatsApp and ENTREGADO', async entry => {
          const ready = await order();
          assert((await page.locator('#app-content').innerText()).includes('1.700'), 'Listos no muestra final exacto');
          await page.locator(`[data-wa-order-id="${ready.id}"]`).click();
          const messages = await stored('simulated_messages');
          assert(messages.length && messages.every(message => message.simulated === true), 'WhatsApp no registrado como simulado');
          assert(messages.some(message => message.text.includes('1.700')), 'Mensaje no presenta final exacto');
          assert(/simulad/i.test(await page.locator(`#wa-sim-feedback-${ready.id}`).innerText()), 'Falta feedback SIMULADO visible');
          await page.locator(`[data-deliver-order-id="${ready.id}"]`).click();
          await page.locator('[data-tab="ENTREGADO"]').click();
          assert((await order()).estado === 'ENTREGADO' && (await page.locator('#app-content').innerText()).includes('1.700'), 'Entrega perdió estado/final');
          entry.messages = messages;
        });
        await check('referenced unit change rejected; edit/archive preserve historical snapshots', async entry => {
          const history = await order(), frozen = JSON.stringify(history);
          await view('admin');
          await page.locator(`[data-edit-product="${unit.id}"]`).click();
          const modality = page.locator('#prod-unit');
          dialogs.length = 0;
          if (await modality.isDisabled()) await visibleRejection(/referenc|pedido|otro producto|modalidad|unidad.*cambi/i);
          else { await modality.selectOption('KG'); await save(); await visibleRejection(/referenc|pedido|otro producto|cambiar.*unidad/i); }
          assert((await products()).find(p => p.id === unit.id).unidad_medida === 'UNIDAD', 'Unidad histórica reinterpretada');
          await freshAdmin();
          await page.locator(`[data-edit-product="${unit.id}"]`).click();
          await page.locator('#prod-name').fill('Unidad editada sintética');
          await page.locator('#prod-price').fill('999'); await save();
          assert((await products()).find(p => p.id === unit.id).precio === 999, 'Edición no guardada');
          await page.locator(`[data-archive-product="${unit.id}"]`).click();
          assert((await products()).find(p => p.id === unit.id).archivado === true, 'Archivo no persistido');
          assert(JSON.stringify(await order()) === frozen, 'Editar/archivar modificó pedido histórico');
          if (viewport.width === 1024) {
            await page.locator('[data-product-status="Archivados"]').click();
            const shot = path.join(path.dirname(out), 'DEMO_RELEASE_ADMIN_1024.png');
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            await page.screenshot({ path: shot, fullPage: true }); report.screenshots.push(shot);
          }
          await view('client');
          if (await page.locator('#btn-back-to-catalog').isVisible()) await page.locator('#btn-back-to-catalog').click();
          assert(await page.locator(`[data-add-id="${unit.id}"], [data-inc-id="${unit.id}"]`).count() === 0, 'Archivado sigue comprable');
          await page.reload({ waitUntil: 'networkidle' });
          assert(JSON.stringify(await order()) === frozen && (await products()).find(p => p.id === unit.id).archivado === true, 'Recarga perdió historial/archivo');
          entry.historicalFinal = history.total_real;
        });
        await check('top offset follows banner reflow without viewport resize', async entry => {
          const layout = () => page.evaluate(() => ({
            stack: document.getElementById('nexo-top-stack').offsetHeight,
            css: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sim-bar-h')),
            effectiveCss: parseFloat(getComputedStyle(document.body).getPropertyValue('--sim-bar-h')),
            width: innerWidth, height: innerHeight
          }));
          const frames = () => page.evaluate(async () => {
            for (let frame = 0; frame < 3; frame++) await new Promise(requestAnimationFrame);
          });
          entry.before = await layout();
          const original = await page.locator('#nexo-demo-banner').textContent();
          try {
            await page.locator('#nexo-demo-banner').evaluate(element => {
              element.textContent = 'MODO DEMO. Texto sintético QA para comprobar que el aviso se adapta al contenido y mantiene libre la pantalla de trabajo. '.repeat(12);
            });
            await frames();
            entry.after = await layout();
          } finally {
            await page.locator('#nexo-demo-banner').evaluate((element, text) => { element.textContent = text; }, original);
            await frames();
            entry.restored = await layout();
          }
          assert(entry.after.width === entry.before.width && entry.after.height === entry.before.height, 'La prueba alteró el viewport');
          assert(Math.abs(entry.after.stack - entry.before.stack) > 1, 'El texto sintético no produjo reflow de la cabecera');
          assert(Math.abs(entry.after.css - entry.after.stack) <= 1, `Offset CSS ${entry.after.css}px distinto de cabecera ${entry.after.stack}px tras reflow sin resize`);
          assert(Math.abs(entry.after.effectiveCss - entry.after.stack) <= 1, `Offset efectivo body ${entry.after.effectiveCss}px distinto de cabecera ${entry.after.stack}px tras reflow`);
          assert(Math.abs(entry.restored.css - entry.restored.stack) <= 1, 'Offset no restaurado tras reponer banner');
          assert(Math.abs(entry.restored.effectiveCss - entry.restored.stack) <= 1, 'Offset efectivo body no restaurado tras reponer banner');
        });
        await check('catalog warning and recovery preserve valid row, raw backup and other data', async entry => {
          await view('admin');
          const snapshots = () => page.evaluate(() => Object.fromEntries(['orders', 'cart', 'customers', 'current_user', 'local_settings', 'theme'].map(key => [key, localStorage.getItem('nexo_demo_v1_' + key)])));
          const before = await snapshots();
          const valid = { ...kg, id: 'qa-recovery-valid', codigo: '000075', nombre: 'Recuperación sintética QA', precio: 123.45 };
          const raw = JSON.stringify([valid, {}]);
          await page.evaluate(raw => localStorage.setItem('nexo_demo_v1_products', raw), raw);
          await freshAdmin();
          assert(await page.locator('[role="alert"]').filter({ hasText: /catálogo/i }).isVisible() && await page.locator('#btn-recover-catalog').isVisible(), 'Catálogo mixto no muestra aviso y recuperación');
          assert(await page.evaluate(() => localStorage.getItem('nexo_demo_v1_products')) === raw, 'Lectura corrupta cambió catálogo original antes de recuperar');
          await page.locator('#btn-recover-catalog').click();
          const recovered = await products();
          assert(recovered.length === 1 && recovered[0].id === valid.id && recovered[0].precio === 123.45 && recovered[0].codigo === '000075', 'Recuperación perdió fila válida o precio decimal');
          const backups = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('nexo_demo_v1_products_backup_')).map(key => ({ key, raw: localStorage.getItem(key) })));
          assert(backups.length === 1 && backups[0].raw === raw, 'Falta respaldo durable del raw exacto en clave aparte');
          assert(JSON.stringify(await snapshots()) === JSON.stringify(before), 'Recuperación modificó pedidos/carrito/clientes/settings');
          await freshAdmin();
          assert(await page.locator('#btn-recover-catalog').count() === 0 && !(await page.locator('[role="alert"]').filter({ hasText: /catálogo/i }).count()), 'Aviso sigue tras recuperar y recargar');
          assert((await products())[0].precio === 123.45 && await page.evaluate(key => localStorage.getItem(key), backups[0].key) === raw, 'Recarga perdió fila válida o respaldo exacto');
          assert(JSON.stringify(await snapshots()) === JSON.stringify(before), 'Recarga tras recuperar modificó otros datos');
          entry.recovered = recovered; entry.backup = backups[0];
        });
      } catch (error) {
        const current = report.checks.findLast(item => item.viewport === label && item.name === stage);
        if (current) { current.pass = false; current.failure = error.message; }
        else report.checks.push({ viewport: label, name: stage, pass: false, failure: error.message });
      } finally {
        report.checks.push({ viewport: label, name: 'no pageerrors, data destinations or popups', pass: !errors.length && !unexpected.length, errors, unexpected });
        await context.close();
      }
    }
    report.pass = report.checks.length === 22 && report.checks.every(check => check.pass) && !report.errors.length && !report.unexpected.length;
  } catch (error) { report.fatal = error.stack; }
  finally {
    if (browser) await browser.close().catch(error => report.errors.push({ cleanup: error.message }));
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (temporary) {
      const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(temporary));
      if (relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(temporary).startsWith('nexo-release-qa-')) {
        await fs.rm(temporary, { recursive: true, force: true }); report.cleanedTemporary = true;
      }
    }
    report.pass = report.pass && !report.errors.length && report.cleanedTemporary === true;
    await fs.writeFile(out, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ pass: report.pass, checks: report.checks.map(({ viewport, name, pass, failure }) => ({ viewport, name, pass, failure })), fatal: report.fatal, errors: report.errors, unexpected: report.unexpected, cleanedTemporary: report.cleanedTemporary, out }, null, 2));
  if (report.fatal || (process.argv.includes('--expect-fixed') && !report.pass)) process.exitCode = 1;
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
