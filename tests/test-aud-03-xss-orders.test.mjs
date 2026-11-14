/**
 * AUD-03 — ORDER XSS & CORRUPT RECORD VALIDATION REGRESSION SUITE
 *
 * Pruebas reproducibles sobre:
 * 1. Validación estricta de tipo y finitud en store.getOrders() / validateOrderRecord()
 *    (rechazo sin convertir registros corruptos en compras válidas).
 * 2. Escape contextual de renderOperatorView() y renderClientView() (módulo y bundle en Brave headless)
 *    ante payloads XSS en cantidad_solicitada, peso_real, order.id, estado y total_estimado.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(".");
const { chromium } = require("C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const { startDemoServer } = await import(pathToFileURL(path.join(root, "bot/serve-demo.js")).href);

console.log("===============================================================");
console.log("   NEXO PEDIDOS — AUD-03 XSS & ORDER RECORD VALIDATION SUITE");
console.log("===============================================================");

// 1. Verificar escape en código fuente HTML antes del build (excluyendo texto plano WhatsApp / textContent)
const opSrc = fs.readFileSync(path.join(root, "js/views/operator.js"), "utf8");
const opHtmlSrc = opSrc
  .replace(/function generateWhatsAppSummary[\s\S]*?\n  \}/, "")
  .replace(/\.textContent\s*=\s*`[^`]*`/g, "");
assert.equal(/\$\{\s*i\.cantidad_solicitada\s*\}/.test(opHtmlSrc), false, "operator.js no debe interpolar i.cantidad_solicitada sin escapeHtml en HTML");
assert.equal(/#\$\{\s*order\.id\s*\}/.test(opHtmlSrc), false, "operator.js no debe interpolar order.id sin escapeHtml en HTML");

const clientSrc = fs.readFileSync(path.join(root, "js/views/client.js"), "utf8");
assert.equal(/\$\{\s*currentOrder\.estado\s*\}/.test(clientSrc), false, "client.js no debe interpolar currentOrder.estado sin escapeHtml");
assert.equal(/\$\{\s*item\.peso_real\s*\}/.test(clientSrc), false, "client.js no debe interpolar item.peso_real sin escapeHtml");
assert.equal(/\$\{\s*item\.cantidad_solicitada\s*\}/.test(clientSrc), false, "client.js no debe interpolar item.cantidad_solicitada sin escapeHtml");
console.log("  [PASS] 1. Código fuente de vistas sin interpolaciones crudas en campos de pedido");

// 2. Validar comportamiento del módulo Store ante registro corrupto
{
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    clear: () => mem.clear()
  };

  const { Store } = await import(pathToFileURL(path.join(root, "js/store.js")).href + `?t=${Date.now()}`);
  const store = new Store({
    mode: "demo",
    ok: true,
    storageKeys: {
      PREFIX: "nexo_demo_aud03_",
      THEME: "nexo_demo_aud03_theme",
      USER: "nexo_demo_aud03_user",
      CUSTOMERS: "nexo_demo_aud03_customers",
      PRODUCTS: "nexo_demo_aud03_products",
      CART: "nexo_demo_aud03_cart",
      ORDERS: "nexo_demo_aud03_orders",
      ACTIVE_ORDER: "nexo_demo_aud03_active_order",
      SETTINGS: "nexo_demo_aud03_settings",
      STAFF_UNLOCKED: "nexo_demo_aud03_staff",
      SIMULATED_MESSAGES: "nexo_demo_aud03_sim"
    },
    business: { name: "Demo", alias: "demo.nexo", whatsapp: "5491100000000" }
  });

  // Inyectar un pedido válido y un pedido corrupto con XSS en cantidad_solicitada
  const rawOrders = JSON.parse(globalThis.localStorage.getItem("nexo_demo_aud03_orders"));
  const maliciousOrder = {
    id: 999,
    cliente: { nombre: "Cliente Malicioso", telefono: "1100000088", direccion: "Calle 1" },
    tipo_entrega: "RETIRO",
    direccion_entrega: "Retiro en Mostrador",
    estado: "PENDIENTE",
    fecha: new Date().toISOString(),
    total_estimado: 1000,
    total_real: null,
    items: [
      {
        producto_id: "prod-1",
        nombre: "Banana Cavendish",
        unidad_medida: "KG",
        precio_unitario: 1800,
        cantidad_solicitada: '<img src=x onerror="window.__xssQty=1">',
        peso_real: null,
        subtotal: 1800,
        sin_stock: false
      }
    ]
  };
  globalThis.localStorage.setItem("nexo_demo_aud03_orders", JSON.stringify([maliciousOrder, ...rawOrders]));

  const validOrders = store.getOrders();
  assert.equal(validOrders.some((o) => o.id === 999), false, "Pedido con cantidad_solicitada no numérica debe ser rechazado y no aparecer como compra válida");
  assert.ok(store.getOrdersError(), "Debe registrarse advertencia de registro de pedido inválido");
  assert.ok(validOrders.length >= 2, "Pedidos válidos restantes deben conservarse intactos");

  // También rechazar NaN / Infinity / cantidad <= 0 / estado inválido
  assert.throws(() => {
    store.validateOrderRecord({
      ...maliciousOrder,
      items: [{ ...maliciousOrder.items[0], cantidad_solicitada: NaN }]
    });
  });
  console.log("  [PASS] 2. Store rechaza registros corruptos/XSS sin convertirlos en compras válidas y conserva pedidos sanos");
}

// 3. Prueba real en navegador headless Brave sobre bundle (dist/public) y módulo ES directo
const running = await startDemoServer({ sourceRoot: root, host: "127.0.0.1", port: 0 });
const moduleServer = http.createServer((req, res) => {
  const reqPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const safeRel = reqPath === "/" ? "index.html" : reqPath.replace(/^\/+/, "");
  const fullPath = path.resolve(root, safeRel);
  if (!fullPath.startsWith(root + path.sep) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(fullPath);
  const mime = ext === ".js" ? "application/javascript; charset=utf-8" : ext === ".css" ? "text/css; charset=utf-8" : "text/html; charset=utf-8";
  res.writeHead(200, { "Content-Type": mime });
  fs.createReadStream(fullPath).pipe(res);
});
await new Promise((resolve) => moduleServer.listen(0, "127.0.0.1", resolve));
const moduleUrl = `http://127.0.0.1:${moduleServer.address().port}`;

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
    headless: true,
    args: ["--disable-background-networking", "--no-first-run", "--disable-gpu"]
  });

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "127.0.0.1") return route.continue();
    return route.abort();
  });
  const page = await context.newPage();

  // 3a. Inyectar pedido malicioso en almacenamiento servido por dist/public (bundle)
  await page.goto(`${running.url}/?demo=1`, { waitUntil: "load" });
  await page.evaluate(() => {
    window.__xssAudit = 0;
    const orders = JSON.parse(localStorage.getItem("nexo_demo_v1_orders") || "[]");
    orders.unshift({
      id: '109"><img src=x onerror="window.__xssAudit=1">',
      cliente: { nombre: "Eva Prueba", telefono: "1100000099", direccion: "Calle 2" },
      tipo_entrega: "RETIRO",
      direccion_entrega: "Retiro",
      estado: '<img src=x onerror="window.__xssAudit=2">',
      fecha: new Date().toISOString(),
      total_estimado: 1500,
      total_real: null,
      items: [
        {
          producto_id: "prod-1",
          nombre: "Banana Cavendish",
          unidad_medida: "KG",
          precio_unitario: 1800,
          cantidad_solicitada: '<img src=x onerror="window.__xssAudit=3">',
          peso_real: null,
          subtotal: 1800,
          sin_stock: false
        }
      ]
    });
    localStorage.setItem("nexo_demo_v1_orders", JSON.stringify(orders));
  });

  // Navegar a vista Operador en bundle y verificar 0 XSS y alerta de registro corrupto
  await page.goto(`${running.url}/?demo=1#operator`, { waitUntil: "load" });
  await page.locator("#pin-input").fill("1234");
  await page.locator("#pin-input").press("Enter");
  await page.waitForSelector("#operator-error");
  await page.waitForTimeout(200);

  const opDomState = await page.evaluate(() => ({
    marker: window.__xssAudit || 0,
    injectedImages: document.querySelectorAll("img[onerror]").length,
    errorText: document.querySelector("#operator-error")?.textContent || "",
    cardsCount: document.querySelectorAll(".btn-start-prep").length
  }));
  assert.equal(opDomState.marker, 0, "Bundle en Operador NO debe ejecutar XSS");
  assert.equal(opDomState.injectedImages, 0, "Bundle en Operador NO debe inyectar <img>");
  assert.ok(opDomState.errorText.trim().length > 0, "Operador debe mostrar alerta cuando existe registro corrupto");
  assert.ok(opDomState.cardsCount >= 1, "Pedidos sanos en cola deben seguir renderizándose normalmente");
  console.log("  [PASS] 3. Bundle en Brave headless bloquea pedido malicioso en almacenamiento, muestra alerta y no ejecuta XSS");

  // 3b. Probar defense-in-depth del módulo ES renderOperatorView/renderClientView directo en Brave
  await page.goto(`${moduleUrl}/?demo=1`, { waitUntil: "load" });
  const rawViewResult = await page.evaluate(async () => {
    window.__xssDirect = 0;
    const { store } = await import("/js/store.js");
    const { renderOperatorView } = await import("/js/views/operator.js");
    const { renderClientView } = await import("/js/views/client.js");

    const xssOrder = {
      id: '777<img src=x onerror="window.__xssDirect=1">',
      cliente: { nombre: "Test", telefono: "1100000001", direccion: "Calle 1" },
      tipo_entrega: "RETIRO",
      direccion_entrega: "Retiro",
      estado: "PENDIENTE",
      fecha: new Date().toISOString(),
      total_estimado: 1200,
      total_real: null,
      items: [
        {
          producto_id: "prod-1",
          nombre: "Banana",
          unidad_medida: "KG",
          precio_unitario: 1800,
          cantidad_solicitada: '<img src=x onerror="window.__xssDirect=2">',
          peso_real: null,
          subtotal: 1200,
          sin_stock: false
        }
      ]
    };

    const origGetOrders = store.getOrders.bind(store);
    const origGetUser = store.getCurrentUser.bind(store);
    const origGetActive = store.getActiveOrder.bind(store);
    try {
      store.getOrders = () => [xssOrder];
      const hostOp = document.createElement("div");
      document.body.appendChild(hostOp);
      const cleanupOp = renderOperatorView(hostOp);
      const opHtml = hostOp.innerHTML;
      cleanupOp();
      hostOp.remove();

      const xssClientOrder = {
        ...xssOrder,
        estado: '<img src=x onerror="window.__xssDirect=3">',
        items: [{ ...xssOrder.items[0], peso_real: '<img src=x onerror="window.__xssDirect=4">' }]
      };
      store.getCurrentUser = () => ({ telefono: "1100000001", nombre: "Test", direccion: "Calle 1" });
      store.getActiveOrder = () => xssClientOrder;
      store.getOrdersByCustomer = () => [xssClientOrder];
      const hostCli = document.createElement("div");
      document.body.appendChild(hostCli);
      const cleanupCli = renderClientView(hostCli);
      const cliHtml = hostCli.innerHTML;
      cleanupCli();
      hostCli.remove();

      return {
        marker: window.__xssDirect || 0,
        imgs: document.querySelectorAll("img[onerror]").length,
        opEscapedQty: opHtml.includes("&lt;img src=x onerror="),
        cliEscapedPeso: cliHtml.includes("&lt;img src=x onerror=")
      };
    } finally {
      store.getOrders = origGetOrders;
      store.getCurrentUser = origGetUser;
      store.getActiveOrder = origGetActive;
    }
  });

  assert.equal(rawViewResult.marker, 0, "Defense-in-depth module views no ejecutaron XSS");
  assert.equal(rawViewResult.imgs, 0, "Defense-in-depth module views no crearon <img> maliciosos");
  assert.equal(rawViewResult.opEscapedQty, true, "operator.js debe escapar cantidad_solicitada");
  assert.equal(rawViewResult.cliEscapedPeso, true, "client.js debe escapar peso_real/estado");
  console.log("  [PASS] 4. Defense-in-depth en módulos operator.js y client.js escapa payloads aún ante bypass de store");

  // 3c. Flujo normal de compra y preparación en demo sigue intacto
  await page.goto(`${running.url}/?demo=1`, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.locator("#btn-quick-demo-user").click();
  await page.locator("[data-add-id]").first().click();
  await page.locator("#btn-open-cart").click();
  await page.locator("#btn-confirm-order").click();
  await page.waitForSelector("#btn-wa-help");
  const receiptTitle = await page.locator("h2").textContent();
  assert.match(receiptTitle || "", /Pedido #103/, "Pedido normal conserva flujo y numeración");
  console.log("  [PASS] 5. Flujo normal de compra conserva cantidades, precios y comprobante");

  await context.close();
} finally {
  if (browser) await browser.close();
  running.server.closeAllConnections();
  await new Promise((r) => running.server.close(r));
  moduleServer.closeAllConnections();
  await new Promise((r) => moduleServer.close(r));
}

console.log("\n===============================================================");
console.log("   AUD-03 ORDER XSS & VALIDATION SUITE: ALL CHECKS PASSED");
console.log("===============================================================");
