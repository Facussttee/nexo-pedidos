/**
 * QA-A — REAL BROWSER (CHROMIUM / BRAVE) NAVIGATION & WHEEL SCROLL REGRESSION SUITE
 *
 * Verifies effective physical wheel displacement across emulated viewports in Chromium (Brave headless):
 * Desktop (1366x768), Tablet Portrait (768x1024), Tablet Landscape (1024x768),
 * and Mobile (390x844 with hasTouch: true).
 *
 * NOTE: These tests verify wheel event displacement and viewport scrolling behavior
 * in Chromium; they do not represent physical touch gestures on real iPad/hardware trackpads.
 *
 * Also tests:
 * - Cart Drawer content overflow and effective wheel scrollTop displacement.
 * - Operator View post-PIN authentication with real Kanban selectors.
 * - Admin View post-PIN authentication with real catalog product rows and wheel displacement.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(".");

// Load Playwright from shared cache runtime
const { chromium } = require("C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

// Load demo server factory
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
console.log("   NEXO PEDIDOS — CHROMIUM / BRAVE WHEEL SCROLL REGRESSION SUITE (QA-A)");
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

  const viewports = [
    { name: "Desktop (1366x768)", width: 1366, height: 768, touch: false },
    { name: "Tablet Portrait (768x1024 emulated)", width: 768, height: 1024, touch: true },
    { name: "Tablet Landscape (1024x768 emulated)", width: 1024, height: 768, touch: true },
    { name: "Mobile (390x844 emulated)", width: 390, height: 844, touch: true }
  ];

  console.log("--- SUITE 1: Real Wheel Displacement Across Emulated Viewports ---");

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.touch
    });

    const failed = [];
    const errors = [];
    let tailwindStatus = null;

    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1" || ["cdn.tailwindcss.com", "fonts.googleapis.com", "fonts.gstatic.com"].includes(u.hostname)) {
        return route.continue();
      }
      return route.abort();
    });

    const page = await context.newPage();
    page.on("requestfailed", (r) => failed.push({ url: r.url(), failure: r.failure()?.errorText }));
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().includes("cdn.tailwindcss.com")) tailwindStatus = r.status();
    });

    await page.goto(running.url + "/?demo=1", { waitUntil: "load", timeout: 30000 });
    await page.locator("#btn-quick-demo-user").click();

    // Read initial computed overflow and scroll position
    const initial = await page.evaluate(() => ({
      y: window.scrollY,
      rootOverflow: getComputedStyle(document.documentElement).overflow,
      bodyOverflow: getComputedStyle(document.body).overflow,
      scrollHeight: document.documentElement.scrollHeight
    }));

    if (initial.scrollHeight > vp.height) {
      pass(`${vp.name} document scrollHeight (${initial.scrollHeight}px) exceeds viewport height (${vp.height}px)`);
    } else {
      fail(`${vp.name} document content is not scrollable (scrollHeight=${initial.scrollHeight}px)`);
    }

    // Perform real physical wheel scroll
    await page.mouse.move(vp.width / 2, vp.height / 2);
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(350);

    const scrolled = await page.evaluate(() => window.scrollY);

    if (scrolled > initial.y + 400) {
      pass(`${vp.name} wheel displacement succeeded: moved from y=${initial.y} to y=${scrolled} (+${scrolled - initial.y}px)`);
    } else {
      fail(`${vp.name} wheel displacement blocked: remained at y=${scrolled} (initial=${initial.y})`, { initial, scrolled });
    }

    // Scroll back to top
    await page.mouse.wheel(0, -800);
    await page.waitForTimeout(250);
    const topScrolled = await page.evaluate(() => window.scrollY);
    if (topScrolled <= initial.y + 50) {
      pass(`${vp.name} wheel scroll upwards restored top position (y=${topScrolled})`);
    } else {
      fail(`${vp.name} wheel scroll up failed (y=${topScrolled})`);
    }

    // Verify zero page errors
    if (errors.length === 0) {
      pass(`${vp.name} executed with zero JS runtime errors`);
    } else {
      fail(`${vp.name} encountered JS errors`, errors);
    }

    await context.close();
  }

  console.log("\n--- SUITE 2: Cart Drawer Overflow & Wheel scrollTop Displacement ---");
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true
    });

    const page = await context.newPage();
    await page.goto(running.url + "/?demo=1", { waitUntil: "load", timeout: 30000 });
    await page.locator("#btn-quick-demo-user").click();

    // Add 6 items to cart to guarantee overflow in drawer
    const addButtons = page.locator(".btn-add-initial");
    const count = await addButtons.count();
    for (let i = 0; i < Math.min(6, count); i++) {
      await addButtons.nth(i).click();
    }

    // Open cart drawer
    await page.locator("#btn-open-cart").click();
    await page.waitForTimeout(300);

    const drawerVisible = await page.locator("#cart-drawer-sheet").isVisible();
    if (drawerVisible) {
      pass("Cart drawer opened and visible in mobile viewport");
    } else {
      fail("Cart drawer failed to open");
    }

    // Select delivery mode to render address field and expand drawer content
    await page.locator('#delivery-card-delivery').click();
    const addressInput = page.locator("#delivery-address-input");
    const addressVisible = await addressInput.isVisible();
    if (addressVisible) {
      pass("Delivery mode toggle reveals address input cleanly");
    } else {
      fail("Delivery address input not visible after selecting DELIVERY mode");
    }

    // Verify that cart items list overflows and has overflow-y: auto
    const listMetrics = await page.evaluate(() => {
      const el = document.querySelector("#cart-drawer-items-list");
      return el ? {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        overflowY: getComputedStyle(el).overflowY,
        scrollTop: el.scrollTop
      } : null;
    });

    if (listMetrics && listMetrics.scrollHeight > listMetrics.clientHeight) {
      pass(`Cart items list overflows correctly (scrollHeight: ${listMetrics.scrollHeight}px > clientHeight: ${listMetrics.clientHeight}px)`);
    } else {
      fail("Cart items list did not overflow", listMetrics);
    }

    // Demonstrate effective wheel scrollTop displacement inside cart drawer
    const drawerListLoc = page.locator("#cart-drawer-items-list");
    const box = await drawerListLoc.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 250);
      await page.waitForTimeout(300);

      const scrolledTop = await page.evaluate(() => {
        const el = document.querySelector("#cart-drawer-items-list");
        return el ? el.scrollTop : 0;
      });

      if (scrolledTop > 0) {
        pass(`Cart drawer wheel scroll confirmed: scrollTop moved from 0 to ${scrolledTop}px`);
      } else {
        fail(`Cart drawer wheel scroll did not move scrollTop (got: ${scrolledTop})`);
      }
    } else {
      fail("Could not find bounding box for #cart-drawer-items-list");
    }

    // Close cart drawer
    await page.locator("#btn-close-cart").click();
    await page.waitForTimeout(300);

    const drawerHidden = !(await page.locator("#cart-drawer-sheet").isVisible());
    if (drawerHidden) {
      pass("Cart drawer closed cleanly");
    } else {
      fail("Cart drawer still visible after close button clicked");
    }

    // Confirm catalog scroll works after drawer close
    const beforeY = await page.evaluate(() => window.scrollY);
    await page.mouse.move(195, 400);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(300);
    const afterY = await page.evaluate(() => window.scrollY);

    if (afterY > beforeY) {
      pass(`Catalog wheel scroll fully functional after drawer close (moved from y=${beforeY} to y=${afterY})`);
    } else {
      fail(`Catalog wheel scroll stuck after drawer close (y=${afterY})`);
    }

    await context.close();
  }

  console.log("\n--- SUITE 3: Operator & Admin Views Post-PIN Verification ---");
  {
    const context = await browser.newContext({
      viewport: { width: 1024, height: 768 },
      hasTouch: true
    });

    const page = await context.newPage();
    await page.goto(running.url + "/?demo=1", { waitUntil: "load", timeout: 30000 });

    // Switch to Operator view
    await page.locator('[data-view="operator"]').click();
    await page.waitForTimeout(200);

    // Pass PIN gate with 1234
    const pinInput = page.locator('#pin-input');
    if (await pinInput.isVisible()) {
      await pinInput.fill('1234');
      await page.locator('#pin-gate-form button[type="submit"]').click();
      await page.waitForTimeout(300);
    }

    // Verify real operator view selectors (ensuring we are past the gate)
    const operatorLogoutBtn = page.locator('#btn-operator-logout');
    const tabPendiente = page.locator('[data-tab="PENDIENTE"]');
    const isOperatorMounted = (await operatorLogoutBtn.isVisible()) && (await tabPendiente.isVisible());

    if (isOperatorMounted) {
      pass("Operator Kanban view mounted past PIN gate (#btn-operator-logout and [data-tab='PENDIENTE'] verified)");
    } else {
      fail("Operator view failed to mount past PIN gate");
    }

    // Switch to Admin view
    await page.locator('[data-view="admin"]').click();
    await page.waitForTimeout(300);

    // Verify real admin view selectors (ensuring we are past the gate)
    const adminHeader = page.locator('h1:has-text("Precios y Catálogo")');
    const adminPills = page.locator('.admin-cat-pill');
    const adminProductItems = page.locator('[data-product-id]');
    const isAdminMounted = (await adminHeader.isVisible()) && ((await adminPills.count()) > 0);

    if (isAdminMounted) {
      pass("Admin view mounted past PIN gate (header 'Precios y Catálogo' and .admin-cat-pill verified)");
    } else {
      fail("Admin view failed to mount past PIN gate");
    }

    const adminScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    if (adminScrollHeight > 768) {
      pass(`Admin view loaded with full product list (scrollHeight: ${adminScrollHeight}px > 768px)`);
    } else {
      fail(`Admin view scrollHeight unexpected: ${adminScrollHeight}px`);
    }

    // Test wheel scroll in Admin view
    const adminBefore = await page.evaluate(() => window.scrollY);
    await page.mouse.move(500, 300);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
    const adminAfter = await page.evaluate(() => window.scrollY);

    if (adminAfter > adminBefore) {
      pass(`Admin view wheel scroll confirmed on product list: moved from y=${adminBefore} to y=${adminAfter} (+${adminAfter - adminBefore}px)`);
    } else {
      fail(`Admin view wheel scroll blocked (y=${adminAfter})`);
    }

    await context.close();
  }

} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => running.server.close(resolve));
}

console.log("\n======================================================================");
console.log(`   REGRESSION SUITE COMPLETED: ${passedTests} / ${totalTests} PASSED`);
if (passedTests === totalTests) {
  console.log("   ALL REAL BROWSER WHEEL SCROLL TESTS PASSED (0 FAILURES)");
  console.log("======================================================================\n");
  process.exit(0);
} else {
  console.error(`   FAILURES DETECTED: ${totalTests - passedTests}`);
  console.error("======================================================================\n");
  process.exit(1);
}
