import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(".");

function resolvePlaywrightChromium() {
  const candidates = [
    "playwright",
    process.env.PLAYWRIGHT_PATH || "",
    "/tmp/pw/node_modules/playwright",
    "C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
  ].filter(Boolean);
  for (const cand of candidates) {
    try {
      const mod = require(cand);
      if (mod?.chromium) return mod.chromium;
    } catch {}
  }
  throw new Error("Playwright chromium no disponible en los paths esperados.");
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const q25 = sorted[Math.floor((sorted.length - 1) * 0.25)];
  const q75 = sorted[Math.floor((sorted.length - 1) * 0.75)];
  return {
    median: Math.round(median),
    iqr: Math.round(q75 - q25),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    values
  };
}

test("AUD-15 — Performance: zero blocking @import, bundle hygiene, and 5-run median/IQR protocol", async () => {
  const chromium = resolvePlaywrightChromium();
  const { startDemoServer } = await import(pathToFileURL(path.join(root, "bot/serve-demo.js")).href);

  // Measure 5 fixed cold runs first so baseline/post numbers are always printed cleanly
  const running = await startDemoServer({ sourceRoot: root, host: "127.0.0.1", port: 0 });
  const launchOpts = { headless: true, args: ["--disable-background-networking", "--no-first-run", "--disable-gpu"] };
  const braveExe = "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe";
  if (fs.existsSync(braveExe)) launchOpts.executablePath = braveExe;

  const browser = await chromium.launch(launchOpts);
  const runs = [];

  try {
    for (let i = 0; i < 5; i++) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      let fontCssRequests = 0;

      await context.route("**/*", async (route) => {
        const u = new URL(route.request().url());
        if (u.hostname === "127.0.0.1" || u.hostname === "localhost") return route.continue();
        if (u.hostname === "cdn.tailwindcss.com") {
          return route.fulfill({
            status: 200,
            contentType: "application/javascript",
            body: "window.tailwind = window.tailwind || {};"
          });
        }
        if (u.hostname === "fonts.googleapis.com") {
          fontCssRequests++;
          // Fixed deterministic latency simulating CSS stylesheet fetch chain
          await new Promise((r) => setTimeout(r, 80));
          return route.fulfill({ status: 200, contentType: "text/css", body: "/* fixed font stub */" });
        }
        return route.abort();
      });

      const page = await context.newPage();
      await page.addInitScript(() => {
        if (localStorage.getItem("__aud15_seed")) return;
        localStorage.setItem(
          "nexo_demo_v1_current_user",
          JSON.stringify({ telefono: "1100000099", nombre: "Perf Demo", direccion: "Calle 1" })
        );
        localStorage.setItem("__aud15_seed", "1");
      });

      await page.goto(`${running.url}/?demo=1`, { waitUntil: "load" });
      await page.locator("#search-input").waitFor();

      const navMetrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0;
        return {
          dclMs: Math.round(nav.domContentLoadedEventEnd),
          loadMs: Math.round(nav.loadEventEnd),
          fcpMs: Math.round(fcp)
        };
      });

      const t0 = performance.now();
      await page.locator("#search-input").fill("Tomate");
      await page.locator(".btn-add-initial").first().click();
      await page.locator("#btn-open-cart").click();
      await page.locator("#cart-drawer-sheet").waitFor();
      const interactionMs = Math.round(performance.now() - t0);

      runs.push({ run: i + 1, fontCssRequests, ...navMetrics, interactionMs });
      await context.close();
    }
  } finally {
    await browser.close();
    running.server.closeAllConnections();
    await new Promise((r) => running.server.close(r));
  }

  const summary = {
    runs: 5,
    fontCssRequestsMax: Math.max(...runs.map((r) => r.fontCssRequests)),
    dclMs: stats(runs.map((r) => r.dclMs)),
    loadMs: stats(runs.map((r) => r.loadMs)),
    fcpMs: stats(runs.map((r) => r.fcpMs)),
    interactionMs: stats(runs.map((r) => r.interactionMs))
  };

  console.log("[AUD-15 METRICS] Runs:", JSON.stringify(runs));
  console.log("[AUD-15 SUMMARY] Synthetic local headless (NOT field INP):", JSON.stringify(summary));

  // Verify bundle syntax, no BOM, reasonable raw size (explicitly separate from runtime speed)
  execSync("node --check js/bundle.js", { stdio: "ignore" });
  const bundleBuf = fs.readFileSync(path.join(root, "js/bundle.js"));
  const hasBom = bundleBuf[0] === 0xef && bundleBuf[1] === 0xbb && bundleBuf[2] === 0xbf;
  assert.equal(hasBom, false, "bundle.js must not start with UTF-8 BOM");
  assert.ok(bundleBuf.length >= 50000 && bundleBuf.length < 400000, `Unexpected bundle size: ${bundleBuf.length}`);

  // Critical CSS chain check: no duplicate blocking @import url(...) in css/style.css
  const styleCss = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
  assert.equal(/@import\s+url\(/i.test(styleCss), false, "css/style.css must not contain render-blocking @import url(...)");
  assert.equal(summary.fontCssRequestsMax, 1, `Expected single stylesheet link request without duplicate @import waterfall, got ${summary.fontCssRequestsMax}`);

  assert.ok(summary.loadMs.median < 1500, `Synthetic median loadMs exceeded 1500ms: ${summary.loadMs.median}`);
  assert.ok(summary.interactionMs.median < 800, `Synthetic median interactionMs exceeded 800ms: ${summary.interactionMs.median}`);
});
