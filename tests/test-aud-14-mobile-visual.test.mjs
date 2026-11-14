import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(".");
let chromium;
for (const cand of ["playwright", process.env.PLAYWRIGHT_PATH || "", "/tmp/pw/node_modules/playwright", "C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"].filter(Boolean)) {
  try { const m = require(cand); if (m?.chromium) { chromium = m.chromium; break; } } catch {}
}
const { startDemoServer } = await import(pathToFileURL(path.join(root, "bot/serve-demo.js")).href);

const VIEWPORTS = [360, 375, 390, 430, 768, 1024];
const THEMES = ["light", "dark"];

test("AUD-14 — Responsive & Visual Geometry across 360..1024px (light & dark)", async () => {
  const running = await startDemoServer({ sourceRoot: root, host: "127.0.0.1", port: 0 });
  const launchOpts = { headless: true, args: ["--disable-background-networking", "--no-first-run", "--disable-gpu"] };
  const braveExe = "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe";
  if (fs.existsSync(braveExe)) launchOpts.executablePath = braveExe;

  const browser = await chromium.launch(launchOpts);
  const unexpectedHosts = [];
  const pageErrors = [];

  try {
    const products = [
      {
        id: "vis-1",
        nombre: "Tomate Redondo Orgánico de Huerta de Estación Selección Especial Extra Grande",
        categoria: "Verduras",
        unidad_medida: "KG",
        precio: 2450,
        paso: 0.25,
        disponible: true,
        archivado: false,
        detalle: "Descripción extensa para verificar truncamiento y evitar desborde horizontal en móvil"
      },
      {
        id: "vis-2",
        nombre: "Palta Hass",
        categoria: "Frutas",
        unidad_medida: "UNIDAD",
        precio: 1300,
        paso: 1,
        disponible: true,
        archivado: false,
        detalle: "Punto justo"
      },
      {
        id: "vis-3",
        nombre: "Espinaca",
        categoria: "Hojas",
        unidad_medida: "UNIDAD",
        precio: 950,
        paso: 1,
        disponible: true,
        archivado: false,
        detalle: ""
      }
    ];
    const customer = {
      telefono: "1100000077",
      nombre: "Cliente Visual Sintético Nombre Muy Largo",
      direccion: "Avenida Siempre Viva 1234 Piso 9 Departamento C"
    };
    const orders = [
      {
        id: 901,
        cliente: customer,
        tipo_entrega: "DELIVERY",
        direccion_entrega: customer.direccion,
        estado: "EN_PREPARACION",
        fecha: new Date().toISOString(),
        total_estimado: 3750,
        total_real: null,
        version: 1,
        items: [
          { producto_id: "vis-1", nombre: products[0].nombre, categoria: "Verduras", unidad_medida: "KG", precio_unitario: 2450, cantidad_solicitada: 1, peso_real: null, subtotal: 2450, sin_stock: false },
          { producto_id: "vis-2", nombre: "Palta Hass", categoria: "Frutas", unidad_medida: "UNIDAD", precio_unitario: 1300, cantidad_solicitada: 1, peso_real: 1, subtotal: 1300, sin_stock: false, confirmado_preparacion: false }
        ]
      }
    ];

    for (const theme of THEMES) {
      for (const width of VIEWPORTS) {
        const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true, colorScheme: theme });
        await context.route("**/*", (route) => {
          const u = new URL(route.request().url());
          if (u.hostname === "127.0.0.1" || u.hostname === "localhost" || ["cdn.tailwindcss.com", "fonts.googleapis.com", "fonts.gstatic.com"].includes(u.hostname)) {
            return route.continue();
          }
          unexpectedHosts.push(u.hostname);
          return route.abort();
        });

        await context.addInitScript(({ products, customer, orders, theme }) => {
          if (localStorage.getItem("__aud14_seed")) return;
          localStorage.setItem("nexo_demo_v1_products", JSON.stringify(products));
          localStorage.setItem("nexo_demo_v1_orders", JSON.stringify(orders));
          localStorage.setItem("nexo_demo_v1_customers", JSON.stringify({ [customer.telefono]: customer }));
          localStorage.setItem("nexo_demo_v1_current_user", JSON.stringify(customer));
          localStorage.setItem("nexo_demo_v1_cart", JSON.stringify({ "vis-2": { producto_id: "vis-2", nombre: "Palta Hass", categoria: "Frutas", unidad_medida: "UNIDAD", precio_unitario: 1300, cantidad: 1, paso_solicitado: 1, subtotal_estimado: 1300 } }));
          localStorage.setItem("nexo_demo_v1_local_settings", JSON.stringify({ staffPin: "1234" }));
          localStorage.setItem("nexo_theme_v1", JSON.stringify(theme));
          localStorage.setItem("__aud14_seed", "1");
        }, { products, customer, orders, theme });

        const page = await context.newPage();
        page.on("pageerror", (e) => pageErrors.push(`${theme}@${width}: ${e.message}`));

        await page.goto(`${running.url}/?demo=1`, { waitUntil: "load" });
        // Active order view opens automatically when ongoing order exists: verify no overflow there first
        const backBtn = page.locator("#btn-back-to-catalog");
        if (await backBtn.isVisible().catch(() => false)) {
          const trackOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          assert.ok(trackOverflow <= 1, `${theme}@${width} tracking view horizontal overflow: ${trackOverflow}`);
          await backBtn.click();
        }
        await page.locator("#search-input").waitFor();

        // Check catalog view overflow, inputs >=16px, interactive touch targets >=44px
        const catalogMetrics = await page.evaluate(() => {
          const overflowX = document.documentElement.scrollWidth - window.innerWidth;
          const searchFont = parseFloat(getComputedStyle(document.getElementById("search-input")).fontSize);
          const minTouchH = Math.min(
            ...Array.from(document.querySelectorAll(".touch-target")).map((el) => el.getBoundingClientRect().height)
          );
          return { overflowX, searchFont, minTouchH };
        });
        assert.ok(catalogMetrics.overflowX <= 1, `${theme}@${width} catalog horizontal overflow: ${catalogMetrics.overflowX}`);
        assert.ok(catalogMetrics.searchFont >= 16, `${theme}@${width} search fontSize ${catalogMetrics.searchFont}`);
        assert.ok(catalogMetrics.minTouchH >= 43.5, `${theme}@${width} min touch target height ${catalogMetrics.minTouchH}`);

        // Open cart modal and switch DELIVERY mode cleanly
        await page.locator("#btn-open-cart").click();
        await page.locator("#cart-drawer-sheet").waitFor();
        await page.locator("#delivery-card-delivery").click();
        const modalMetrics = await page.evaluate(() => {
          const sheet = document.getElementById("cart-drawer-sheet");
          const sheetRect = sheet.getBoundingClientRect();
          const addrFont = parseFloat(getComputedStyle(document.getElementById("delivery-address-input")).fontSize);
          const confirmRect = document.getElementById("btn-confirm-order").getBoundingClientRect();
          return {
            overflowX: document.documentElement.scrollWidth - window.innerWidth,
            fitsViewport: sheetRect.right <= window.innerWidth + 1 && sheetRect.left >= -1,
            addrFont,
            confirmH: confirmRect.height
          };
        });
        assert.ok(modalMetrics.overflowX <= 1, `${theme}@${width} cart modal overflowX: ${modalMetrics.overflowX}`);
        assert.equal(modalMetrics.fitsViewport, true, `${theme}@${width} cart modal exceeds viewport width`);
        assert.ok(modalMetrics.addrFont >= 16, `${theme}@${width} address input font ${modalMetrics.addrFont}`);
        assert.ok(modalMetrics.confirmH >= 43.5, `${theme}@${width} confirm button height ${modalMetrics.confirmH}`);
        await page.keyboard.press("Escape");

        // Navigate to Operator view and verify preparation controls fit mobile cleanly
        await page.goto(`${running.url}/?demo=1#operador`, { waitUntil: "load" });
        await page.locator("#pin-input").waitFor();
        await page.locator("#pin-input").fill("1234");
        await page.locator('#pin-gate-form button[type="submit"]').click();
        await page.locator("#operator-error").waitFor({ state: "attached" });
        await page.waitForTimeout(150);

        const opMetrics = await page.evaluate(() => {
          const overflowX = document.documentElement.scrollWidth - window.innerWidth;
          const prepInputs = Array.from(document.querySelectorAll(".input-weight"));
          const minInputFont = prepInputs.length ? Math.min(...prepInputs.map((i) => parseFloat(getComputedStyle(i).fontSize))) : 16;
          return { overflowX, minInputFont };
        });
        assert.ok(opMetrics.overflowX <= 1, `${theme}@${width} operator view overflowX: ${opMetrics.overflowX}`);
        assert.ok(opMetrics.minInputFont >= 16, `${theme}@${width} operator weight fontSize ${opMetrics.minInputFont}`);

        await context.close();
      }
    }

    assert.equal(unexpectedHosts.length, 0, `Unexpected network hosts contacted: ${unexpectedHosts.join(", ")}`);
    assert.equal(pageErrors.length, 0, `Browser JS errors detected: ${pageErrors.join("; ")}`);
  } finally {
    await browser.close();
    running.server.closeAllConnections();
    await new Promise((r) => running.server.close(r));
  }
});
