/**
 * QA-E1 — BROWSER XSS RENDERING REGRESSION TEST SUITE
 *
 * Verifies that dangerous HTML/XSS payloads supplied via UI inputs, mock data,
 * or dynamic attributes remain inert text/attributes and do NOT execute script
 * or create unauthorized DOM elements in Chromium/Brave headless.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(".");

const { chromium } = require("C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const { startDemoServer } = await import(pathToFileURL(path.join(root, "bot/serve-demo.js")).href);

let totalTests = 0;
let passedTests = 0;

function pass(msg) {
  totalTests++;
  passedTests++;
  console.log(`  [PASS] ${msg}`);
}

function fail(msg, details) {
  totalTests++;
  console.error(`  [FAIL] ${msg}`);
  if (details) console.error("         Details:", details);
}

console.log("\n======================================================================");
console.log("   NEXO PEDIDOS — REAL BROWSER XSS MITIGATION SUITE (QA-E1)");
console.log("======================================================================\n");

const running = await startDemoServer({ sourceRoot: root, host: "127.0.0.1", port: 0 });
console.log(`[SERVER] Demo server active at ${running.url}`);

let browser;

try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
    headless: true,
    args: ["--disable-background-networking", "--no-first-run", "--disable-gpu"]
  });

  async function createContext() {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }
    });
    // Limit external network
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1" || ["cdn.tailwindcss.com", "fonts.googleapis.com", "fonts.gstatic.com"].includes(u.hostname)) {
        return route.continue();
      }
      return route.abort();
    });
    return context;
  }

  // TEST 1: Customer Name XSS Payload in Client View and Operator View
  {
    console.log("[TEST GROUP 1] Customer Name XSS Payload in Client Catalog & Operator Kanban");
    const context = await createContext();
    const page = await context.newPage();
    page.setDefaultTimeout(5000);

    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto(`${running.url}/?demo=1`, { waitUntil: "load" });

    const payload = '<img src=x onerror=window.__qaXss=1>';
    await page.locator("#phone-input").fill("1100000099");
    await page.locator("#name-input").fill(payload);
    await page.locator("#address-input").fill("Calle Sintetica 99");
    await page.locator('#phone-form button[type="submit"]').click();
    await page.waitForTimeout(300);

    const clientState = await page.evaluate(() => ({
      marker: window.__qaXss || 0,
      onerrorImages: document.querySelectorAll("img[onerror]").length,
      headerText: document.querySelector("span.truncate strong")?.textContent || ""
    }));

    if (clientState.marker === 0 && clientState.onerrorImages === 0) {
      pass("Client catalog does not execute marker script or insert img[onerror]");
    } else {
      fail("Client catalog executed marker script or created img[onerror]", clientState);
    }

    if (clientState.headerText.includes(payload)) {
      pass("Client header renders payload safely as inert literal text");
    } else {
      fail("Client header did not display expected text", clientState.headerText);
    }

    // Add an item and submit order to operator view
    await page.locator("[data-add-id]").first().click();
    await page.locator("#btn-open-cart").click();
    await page.locator("#btn-confirm-order").click();
    await page.waitForTimeout(200);

    // Navigate to operator view
    await page.evaluate(() => {
      window.__qaXss = 0;
      location.hash = "operator";
    });

    await page.locator("#pin-input").fill("1234");
    await page.locator("#pin-input").press("Enter");
    await page.locator("[data-start-id]").first().waitFor();
    await page.waitForTimeout(300);

    const operatorState = await page.evaluate(() => ({
      marker: window.__qaXss || 0,
      onerrorImages: document.querySelectorAll("img[onerror]").length
    }));

    if (operatorState.marker === 0 && operatorState.onerrorImages === 0) {
      pass("Operator Kanban view does not execute marker script or insert img[onerror]");
    } else {
      fail("Operator Kanban view executed marker script or created img[onerror]", operatorState);
    }

    // Check modal edit view for order
    await page.locator("[data-edit-order-id]").first().click();
    await page.waitForTimeout(200);

    const editModalState = await page.evaluate(() => ({
      marker: window.__qaXss || 0,
      onerrorImages: document.querySelectorAll("img[onerror]").length,
      inputValue: document.querySelector("#edit-name")?.value || ""
    }));

    if (editModalState.marker === 0 && editModalState.onerrorImages === 0) {
      pass("Operator edit modal does not execute marker script or insert img[onerror]");
    } else {
      fail("Operator edit modal executed marker script", editModalState);
    }

    if (editModalState.inputValue === payload) {
      pass("Operator edit modal retains exact unescaped value in input element value property");
    } else {
      fail("Operator edit modal input value mismatch", editModalState.inputValue);
    }

    await context.close();
  }

  // TEST 2: Delivery Address Attribute & Element Injection
  {
    console.log("\n[TEST GROUP 2] Delivery Address Injection Vector");
    const context = await createContext();
    const page = await context.newPage();
    page.setDefaultTimeout(5000);

    await page.goto(`${running.url}/?demo=1`, { waitUntil: "load" });

    const addrPayload = '"><script>window.__qaXssAddr=1</script><b id="injected-b">test</b>';
    await page.locator("#phone-input").fill("1199998888");
    await page.locator("#name-input").fill("Cliente Seguro");
    await page.locator("#address-input").fill(addrPayload);
    await page.locator('#phone-form button[type="submit"]').click();
    await page.waitForTimeout(300);

    // Add item and open cart drawer
    await page.locator("[data-add-id]").first().click();
    await page.locator("#btn-open-cart").click();

    // Select delivery option
    await page.locator('input[name="delivery-mode"][value="DELIVERY"]').click();
    await page.waitForTimeout(100);

    const drawerCheck = await page.evaluate(() => ({
      marker: window.__qaXssAddr || 0,
      injectedTag: !!document.querySelector("#injected-b"),
      inputValue: document.querySelector("#delivery-address-input")?.value || ""
    }));

    if (drawerCheck.marker === 0 && !drawerCheck.injectedTag) {
      pass("Cart drawer delivery address does not break out of input attribute or inject DOM nodes");
    } else {
      fail("Cart drawer delivery address broke out or injected DOM nodes", drawerCheck);
    }

    await context.close();
  }

  // TEST 3: Catalog Search and Product Attributes
  {
    console.log("\n[TEST GROUP 3] Search Input & Category Pills Safe Attributes");
    const context = await createContext();
    const page = await context.newPage();
    page.setDefaultTimeout(5000);

    await page.goto(`${running.url}/?demo=1`, { waitUntil: "load" });
    await page.locator("#btn-quick-demo-user").click();
    await page.waitForTimeout(300);

    // Type payload in search input
    const searchPayload = '"><img src=x onerror=window.__qaSearchXss=1>';
    await page.locator("#search-input").fill(searchPayload);
    await page.waitForTimeout(200);

    const searchCheck = await page.evaluate(() => ({
      marker: window.__qaSearchXss || 0,
      onerrorImages: document.querySelectorAll("img[onerror]").length,
      val: document.querySelector("#search-input")?.value || ""
    }));

    if (searchCheck.marker === 0 && searchCheck.onerrorImages === 0) {
      pass("Catalog search input does not execute XSS on attribute injection");
    } else {
      fail("Catalog search input executed XSS", searchCheck);
    }

    // Navigate to Admin view and verify admin search
    await page.evaluate(() => {
      location.hash = "admin";
    });
    await page.locator("#pin-input").fill("1234");
    await page.locator("#pin-input").press("Enter");
    await page.waitForTimeout(300);

    await page.locator("#admin-search-input").fill(searchPayload);
    await page.waitForTimeout(200);

    const adminCheck = await page.evaluate(() => ({
      marker: window.__qaSearchXss || 0,
      onerrorImages: document.querySelectorAll("img[onerror]").length
    }));

    if (adminCheck.marker === 0 && adminCheck.onerrorImages === 0) {
      pass("Admin search input does not execute XSS on attribute injection");
    } else {
      fail("Admin search input executed XSS", adminCheck);
    }

    await context.close();
  }

} catch (err) {
  console.error("[CRITICAL SUITE ERROR]", err);
  fail("Browser execution encountered fatal error", err.message);
} finally {
  if (browser) await browser.close();
  running.server.closeAllConnections();
  await new Promise((r) => running.server.close(r));
}

console.log("\n----------------------------------------------------------------------");
console.log(`SUITE RESULTS: ${passedTests} / ${totalTests} tests passed`);
console.log("----------------------------------------------------------------------\n");

if (passedTests !== totalTests || totalTests === 0) {
  process.exit(1);
}
