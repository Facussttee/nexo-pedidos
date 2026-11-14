import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(".");
const pwPath = fs.existsSync("node_modules/playwright")
  ? "playwright"
  : "C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright";
const { chromium } = require(pwPath);
const { startDemoServer } = await import(pathToFileURL(path.join(root, "bot/serve-demo.js")).href);

test("AUD-13 — Accessibility: labels, per-product control names, keyboard, modal Escape & focus restore", async (t) => {
  const running = await startDemoServer({ sourceRoot: root, host: "127.0.0.1", port: 0 });
  const launchOpts = { headless: true, args: ["--disable-background-networking", "--no-first-run", "--disable-gpu"] };
  const braveExe = "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe";
  if (fs.existsSync(braveExe)) launchOpts.executablePath = braveExe;

  const browser = await chromium.launch(launchOpts);
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1" || u.hostname === "localhost") return route.continue();
      if (u.hostname === "cdn.tailwindcss.com") {
        return route.continue();
      }
      if (["fonts.googleapis.com", "fonts.gstatic.com"].includes(u.hostname)) {
        return route.abort();
      }
      return route.abort();
    });

    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await t.test("1. Phone gate inputs have <label for>, errors use role=alert, keyboard submits", async () => {
      await page.goto(`${running.url}/`, { waitUntil: "domcontentloaded" });
      await page.locator("#phone-input").waitFor();

      const labelBindings = await page.evaluate(() => {
        const ids = ["phone-input", "name-input", "address-input"];
        return ids.map((id) => {
          const input = document.getElementById(id);
          const lbl = document.querySelector(`label[for="${id}"]`);
          const fontSize = input ? parseFloat(getComputedStyle(input).fontSize) : 0;
          return { id, hasInput: Boolean(input), hasLabelFor: Boolean(lbl), labelText: lbl?.textContent?.trim(), fontSize };
        });
      });

      for (const item of labelBindings) {
        assert.equal(item.hasInput, true, `Missing input #${item.id}`);
        assert.equal(item.hasLabelFor, true, `Missing <label for="${item.id}">`);
        assert.ok(item.labelText.length > 0);
        assert.ok(item.fontSize >= 16, `Expected #${item.id} fontSize >= 16px, got ${item.fontSize}`);
      }

      // Verify validation alerts have role="alert"
      const alertMeta = await page.evaluate(() => ({
        phoneRole: document.getElementById("phone-error")?.getAttribute("role"),
        phoneLive: document.getElementById("phone-error")?.getAttribute("aria-live"),
        nameRole: document.getElementById("name-error")?.getAttribute("role"),
        nameLive: document.getElementById("name-error")?.getAttribute("aria-live")
      }));
      assert.equal(alertMeta.phoneRole, "alert");
      assert.equal(alertMeta.phoneLive, "assertive");
      assert.equal(alertMeta.nameRole, "alert");
      assert.equal(alertMeta.nameLive, "assertive");

      await page.locator("#phone-input").fill("1155667788");
      await page.locator("#name-input").fill("Ana Accesible");
      await page.locator('#phone-form button[type="submit"]').click();
      await page.locator("#search-input").waitFor();
    });

    await t.test("2. Search input, product add/qty buttons include product names and >=44px targets", async () => {
      const searchA11y = await page.evaluate(() => {
        const s = document.getElementById("search-input");
        return {
          ariaLabel: s?.getAttribute("aria-label") || "",
          fontSize: s ? parseFloat(getComputedStyle(s).fontSize) : 0
        };
      });
      assert.ok(searchA11y.ariaLabel.trim().length > 0, "#search-input must have aria-label");
      assert.ok(searchA11y.fontSize >= 16, `Expected search fontSize >= 16px, got ${searchA11y.fontSize}`);

      const addLabels = await page.evaluate(() =>
        Array.from(document.querySelectorAll(".btn-add-initial")).slice(0, 3).map((b) => ({
          label: b.getAttribute("aria-label") || "",
          rect: b.getBoundingClientRect()
        }))
      );
      assert.ok(addLabels.length > 0);
      for (const btn of addLabels) {
        assert.match(btn.label, /Agregar .+ al pedido/i, `Add button aria-label must name product, got "${btn.label}"`);
        assert.ok(btn.rect.height >= 43.5, `Add button height >= 44px, got ${btn.rect.height}`);
      }

      // Click first product and verify stepper +/- labels include product name
      const firstAdd = page.locator(".btn-add-initial").first();
      await firstAdd.click();
      const stepperMeta = await page.evaluate(() => {
        const dec = document.querySelector(".btn-qty-dec");
        const inc = document.querySelector(".btn-qty-inc");
        return {
          decLabel: dec?.getAttribute("aria-label") || "",
          incLabel: inc?.getAttribute("aria-label") || "",
          decH: dec?.getBoundingClientRect().height || 0,
          incH: inc?.getBoundingClientRect().height || 0
        };
      });
      assert.match(stepperMeta.decLabel, /Restar .+/i);
      assert.match(stepperMeta.incLabel, /Sumar .+/i);
      assert.ok(stepperMeta.decH >= 43.5);
      assert.ok(stepperMeta.incH >= 43.5);
    });

    await t.test("3. Cart dialog uses aria-modal/inert, traps Tab, labels delivery address, and Escape restores focus", async () => {
      const openCartBtn = page.locator("#btn-open-cart");
      await openCartBtn.click();
      await page.locator("#cart-drawer-sheet").waitFor();

      const dialogMeta = await page.evaluate(() => {
        const sheet = document.getElementById("cart-drawer-sheet");
        const topStack = document.getElementById("nexo-top-stack");
        const deliveryLabel = document.querySelector('label[for="delivery-address-input"]');
        return {
          role: sheet?.getAttribute("role"),
          ariaModal: sheet?.getAttribute("aria-modal"),
          labelledBy: sheet?.getAttribute("aria-labelledby"),
          activeInside: Boolean(sheet && sheet.contains(document.activeElement)),
          topInert: Boolean(topStack && topStack.hasAttribute("inert")),
          hasDeliveryLabelFor: Boolean(deliveryLabel)
        };
      });
      assert.equal(dialogMeta.role, "dialog");
      assert.equal(dialogMeta.ariaModal, "true");
      assert.equal(dialogMeta.labelledBy, "cart-drawer-title");
      assert.equal(dialogMeta.activeInside, true, "Initial modal focus must enter dialog");
      assert.equal(dialogMeta.topInert, true, "Background top-stack should be inert while dialog open");
      assert.equal(dialogMeta.hasDeliveryLabelFor, true, "Delivery address must have <label for='delivery-address-input'>");

      // Tab across controls and verify focus remains trapped inside modal
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Tab");
      }
      const trapped = await page.evaluate(() => {
        const sheet = document.getElementById("cart-drawer-sheet");
        return Boolean(sheet && sheet.contains(document.activeElement));
      });
      assert.equal(trapped, true, "Tab focus must stay trapped inside modal");

      // Escape closes modal and returns focus to #btn-open-cart
      await page.keyboard.press("Escape");
      await page.locator("#cart-drawer-sheet").waitFor({ state: "detached" });
      const postClose = await page.evaluate(() => ({
        focusedId: document.activeElement?.id || "",
        topStillInert: Boolean(document.getElementById("nexo-top-stack")?.hasAttribute("inert"))
      }));
      assert.equal(postClose.focusedId, "btn-open-cart", "Escape must restore focus to cart trigger");
      assert.equal(postClose.topStillInert, false);
    });

    await t.test("4. Operator view renders accessible alerts and preparation weight labels", async () => {
      await page.goto(`${running.url}/?demo=1#operador`, { waitUntil: "domcontentloaded" });
      await page.locator("#pin-input").waitFor();
      await page.locator("#pin-input").fill("1234");
      await page.locator('#pin-gate-form button[type="submit"]').click();
      await page.locator("#operator-error").waitFor({ state: "attached" });

      const opMeta = await page.evaluate(() => {
        const errEl = document.getElementById("operator-error");
        const prepInputs = Array.from(document.querySelectorAll(".input-weight"));
        const allLabeled = prepInputs.every((inp) => Boolean(document.querySelector(`label[for="${inp.id}"]`)));
        return {
          errorRole: errEl?.getAttribute("role"),
          prepCount: prepInputs.length,
          allLabeled
        };
      });
      assert.equal(opMeta.errorRole, "alert");
      assert.equal(opMeta.allLabeled, true);
    });

    assert.equal(pageErrors.length, 0, `Unexpected browser JS errors: ${pageErrors.join("; ")}`);
  } finally {
    await browser.close();
    running.server.closeAllConnections();
    await new Promise((r) => running.server.close(r));
  }
});
