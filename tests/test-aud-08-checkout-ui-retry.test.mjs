import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(".");
const distRoot = path.join(root, "dist", "public");

function resolveChromium() {
  for (const cand of [
    "playwright",
    process.env.PLAYWRIGHT_PATH || "",
    "/tmp/pw/node_modules/playwright",
    "C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
  ].filter(Boolean)) {
    try {
      const m = require(cand);
      if (m?.chromium) return m.chromium;
    } catch {}
  }
  throw new Error("Playwright no disponible (ni local, PLAYWRIGHT_PATH ni /tmp/pw)");
}

function createStaticProdTestServer() {
  const mimeMap = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8"
  };

  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || "/", "http://127.0.0.1");
    let pathname = reqUrl.pathname;
    if (pathname === "/") pathname = "/index.html";

    if (pathname === "/js/public-config.js") {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(
        `window.NEXO_PUBLIC_CONFIG = ${JSON.stringify({
          mode: "production",
          business: { name: "Comercio UI Retry Test" },
          supabase: {
            url: "https://127.0.0.1:54321",
            anonKey: "sb_publishable_local_ui_retry_test_only"
          }
        })};`
      );
      return;
    }

    const rel = pathname.replace(/^\/+/, "");
    const target = path.resolve(distRoot, rel);
    if (!target.startsWith(distRoot + path.sep) && target !== distRoot) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(target);
    res.writeHead(200, { "Content-Type": mimeMap[ext] || "application/octet-stream" });
    fs.createReadStream(target).pipe(res);
  });

  return server;
}

function buildSupabaseMockInitScript(scenario) {
  return ({ scenarioMode }) => {
    window.__rpcAttempts = 0;
    window.__cartKeys = [];
    window.__scenarioMode = scenarioMode;

    const sampleProducts = [
      {
        id: "prod-1",
        nombre: "Tomate Perita",
        categoria: "Verduras",
        unidad_medida: "KG",
        precio: 2400,
        disponible: true,
        paso: 0.5,
        codigo: "TOM-1",
        detalle: "",
        archivado: false,
        imagen_id: null
      }
    ];

    function makeQuery(table) {
      const state = {
        then(resolve, reject) {
          const data = table === "productos" ? sampleProducts : [];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
        select() { return state; },
        order() { return state; },
        eq() { return state; },
        in() { return state; },
        limit() { return state; },
        upsert() { return Promise.resolve({ data: null, error: null }); },
        maybeSingle() { return Promise.resolve({ data: null, error: null }); },
        single() { return Promise.resolve({ data: null, error: null }); }
      };
      return state;
    }

    window.supabase = {
      createClient() {
        return {
          auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            signOut: async () => ({ error: null })
          },
          channel() {
            const ch = {
              on() { return ch; },
              subscribe() { return ch; }
            };
            return ch;
          },
          removeChannel() {},
          from(table) {
            return makeQuery(table);
          },
          async rpc(fnName, params) {
            if (fnName === "get_order_by_tracking_token") {
              return { data: [], error: null };
            }
            if (fnName !== "create_order_atomic") {
              return { data: null, error: null };
            }
            window.__rpcAttempts += 1;
            window.__cartKeys.push(params?.p_checkout_cart_key || "");

            if (window.__rpcAttempts === 1) {
              if (window.__scenarioMode === "timeout_then_idempotent") {
                throw new Error("FetchError: Request timed out after commit");
              }
              return {
                data: null,
                error: { message: "VALIDATION_ERROR: Horario de recepción cerrado temporalmente" }
              };
            }

            const orderId = window.__scenarioMode === "timeout_then_idempotent" ? 501 : 502;
            return {
              data: {
                idempotent: window.__scenarioMode === "timeout_then_idempotent",
                tracking_token: "b".repeat(64),
                order: {
                  id: orderId,
                  cliente_telefono: params.p_cliente_telefono,
                  cliente_nombre: params.p_cliente_nombre,
                  tipo_entrega: params.p_tipo_entrega,
                  direccion_entrega: params.p_direccion_entrega,
                  estado: "PENDIENTE",
                  fecha: new Date().toISOString(),
                  total_estimado: 2400,
                  total_real: null,
                  version: 1,
                  items: [
                    {
                      producto_id: "prod-1",
                      nombre: "Tomate Perita",
                      categoria: "Verduras",
                      unidad_medida: "KG",
                      precio_unitario: 2400,
                      cantidad_solicitada: 1,
                      peso_real: null,
                      subtotal: 2400,
                      sin_stock: false
                    }
                  ]
                }
              },
              error: null
            };
          }
        };
      }
    };
  };
}

test("AUD-08 UI Retry — Checkout button unlocks on timeout & error in compiled bundle", async (t) => {
  assert.ok(fs.existsSync(path.join(distRoot, "js", "bundle.js")), "dist/public/js/bundle.js debe existir; ejecutá node scripts/build-public.mjs");

  const chromium = resolveChromium();
  const server = createStaticProdTestServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const launchOpts = { headless: true, args: ["--disable-background-networking", "--no-first-run", "--disable-gpu"] };
  const braveExe = "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe";
  if (fs.existsSync(braveExe)) launchOpts.executablePath = braveExe;

  const browser = await chromium.launch(launchOpts);

  try {
    async function runScenario(scenarioMode, expectedOrderId, expectedFirstLabel, expectedStatusAttr) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await ctx.route("**/*", (route) => {
        const u = new URL(route.request().url());
        if (u.hostname === "127.0.0.1" || u.hostname === "localhost" || u.hostname === "cdn.tailwindcss.com") {
          return route.continue();
        }
        return route.abort();
      });
      await ctx.addInitScript(buildSupabaseMockInitScript(scenarioMode), { scenarioMode });

      const page = await ctx.newPage();
      const pageErrors = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      await page.goto(baseUrl, { waitUntil: "load" });
      await page.locator("#phone-input").fill("1144445555");
      await page.locator("#name-input").fill("Cliente Retry UI");
      await page.locator("#address-input").fill("Calle Falsa 123");
      await page.locator('#phone-form button[type="submit"]').click();

      await page.locator('[data-add-id="prod-1"]').click();
      await page.locator("#btn-open-cart").click();

      // Primer intento: falla por timeout o error determinista
      await page.locator("#btn-confirm-order").click();
      await page.waitForSelector(`#checkout-status-banner[data-checkout-status="${expectedStatusAttr}"]`);

      const btnAfterFailure = await page.evaluate(() => {
        const btn = document.querySelector("#btn-confirm-order");
        return {
          exists: Boolean(btn),
          disabled: Boolean(btn?.disabled),
          hasDisabledAttr: Boolean(btn?.hasAttribute("disabled")),
          text: (btn?.textContent || "").trim(),
          attempts: window.__rpcAttempts
        };
      });

      assert.equal(btnAfterFailure.exists, true, "Debe mantenerse #btn-confirm-order tras error");
      assert.equal(btnAfterFailure.attempts, 1, "Primer click debe ejecutar exactamente 1 RPC");
      assert.equal(btnAfterFailure.disabled, false, "El botón de confirmación NO debe quedar deshabilitado tras falla");
      assert.equal(btnAfterFailure.hasDisabledAttr, false, "El atributo disabled debe quedar removido tras falla");
      assert.equal(btnAfterFailure.text, expectedFirstLabel);

      // Segundo click: debe funcionar y completar el pedido
      await page.locator("#btn-confirm-order").click();
      await page.waitForFunction((id) => document.body.innerText.includes(`#${id}`), expectedOrderId);

      const finalState = await page.evaluate(() => ({
        attempts: window.__rpcAttempts,
        cartKeys: window.__cartKeys,
        drawerOpen: Boolean(document.querySelector("#cart-drawer-sheet")),
        bodyText: document.body.innerText
      }));

      assert.equal(finalState.attempts, 2, "Segundo click debe ejecutar reintento sin quedar trabado");
      assert.equal(finalState.drawerOpen, false, "El drawer del carrito debe cerrarse tras éxito");
      assert.ok(finalState.bodyText.includes(`#${expectedOrderId}`), `Debe navegar al detalle del pedido #${expectedOrderId}`);
      if (scenarioMode === "timeout_then_idempotent") {
        assert.equal(finalState.cartKeys[0], finalState.cartKeys[1], "Reintento tras timeout debe reutilizar la misma clave idempotente");
      }
      assert.equal(pageErrors.length, 0, `Errores JS inesperados: ${pageErrors.join("; ")}`);

      await ctx.close();
    }

    await t.test("1. Timeout tras commit deja #btn-confirm-order habilitado y permite verificación idempotente", async () => {
      await runScenario("timeout_then_idempotent", 501, "Reintentar verificación (sin duplicar)", "unknown");
    });

    await t.test("2. Rechazo determinista deja #btn-confirm-order habilitado para corregir/reintentar", async () => {
      await runScenario("deterministic_fail", 502, "Confirmar Pedido", "failed");
    });
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
