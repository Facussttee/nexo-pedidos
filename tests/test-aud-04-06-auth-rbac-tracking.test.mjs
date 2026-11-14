import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createDisposableSupabaseHarness } from "./helpers/disposable-supabase-harness.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(".");

const memStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => (memStorage.has(k) ? memStorage.get(k) : null),
  setItem: (k, v) => memStorage.set(k, String(v)),
  removeItem: (k) => memStorage.delete(k),
  clear: () => memStorage.clear()
};

function makePrefixKeys(prefix) {
  return {
    PREFIX: prefix,
    PRODUCTS: `${prefix}products`,
    ORDERS: `${prefix}orders`,
    CUSTOMERS: `${prefix}customers`,
    CURRENT_USER: `${prefix}current_user`,
    CART: `${prefix}cart`,
    ACTIVE_ORDER: `${prefix}active_order`,
    LOCAL_SETTINGS: `${prefix}local_settings`,
    PIN_UNLOCKED: `${prefix}pin_unlocked`,
    SIMULATED_MESSAGES: `${prefix}simulated_messages`,
    OWN_TRACKING_REFS: `${prefix}own_tracking_refs`,
    PENDING_CHECKOUT: `${prefix}pending_checkout`,
    THEME: `${prefix}theme`
  };
}

test("AUD-04 / AUD-05 / AUD-06 — Auth, RBAC & Private Order Tracking Isolation", async (t) => {
  const harness = createDisposableSupabaseHarness({
    products: [
      {
        id: "prod-1",
        nombre: "Tomate Perita",
        categoria: "Verduras",
        unidad_medida: "KG",
        precio: 2400,
        disponible: true,
        paso: 0.5,
        archivado: false
      },
      {
        id: "prod-archived",
        nombre: "Producto Oculto",
        categoria: "Otros",
        unidad_medida: "UNIDAD",
        precio: 999,
        disponible: true,
        paso: 1,
        archivado: true
      }
    ],
    staffUsers: [
      {
        user_id: "11111111-1111-4111-8111-111111111111",
        email: "owner@local.test",
        password: "OwnerStrongPassword!1",
        role: "owner",
        active: true
      },
      {
        user_id: "22222222-2222-4222-8222-222222222222",
        email: "operator@local.test",
        password: "OperatorStrongPassword!1",
        role: "operator",
        active: true
      },
      {
        user_id: "33333333-3333-4333-8333-333333333333",
        email: "inactive@local.test",
        password: "InactivePassword!1",
        role: "operator",
        active: false
      }
    ]
  });

  assert.equal(harness.isRealPostgresRls, false, "Harness must explicitly report non-live PG RLS");

  const anonClient = harness.createClient({ sourceKey: "source:anon-browser" });
  const clientACup = harness.createClient({ sourceKey: "source:client-a" });
  const clientBCup = harness.createClient({ sourceKey: "source:client-b" });
  const opSupa = harness.createClient({ sourceKey: "source:operator" });
  const ownerSupa = harness.createClient({ sourceKey: "source:owner" });
  const inactiveSupa = harness.createClient({ sourceKey: "source:inactive" });

  let nextClient = clientACup;
  globalThis.window = {
    supabase: { createClient: () => nextClient },
    addEventListener() {},
    location: { search: "", hash: "" }
  };

  const { Store } = await import("../js/store.js");
  const baseProdConfig = {
    mode: "production",
    ok: true,
    errors: [],
    warnings: [],
    business: { name: "Comercio Local", alias: "comercio.local", whatsapp: "5491100000001" },
    supabaseUrl: "http://127.0.0.1:54321",
    supabaseAnonKey: "sb_publishable_local_disposable_anon_key"
  };

  async function spawnStore(supaClient, prefix) {
    nextClient = supaClient;
    const s = new Store({ ...baseProdConfig, storageKeys: makePrefixKeys(prefix) });
    await new Promise((r) => setTimeout(r, 30));
    return s;
  }

  const clientA = await spawnStore(clientACup, "nexo_a04_a_");
  const clientB = await spawnStore(clientBCup, "nexo_a04_b_");
  const opStore = await spawnStore(opSupa, "nexo_a04_op_");
  const ownerStore = await spawnStore(ownerSupa, "nexo_a04_own_");
  const inactiveStore = await spawnStore(inactiveSupa, "nexo_a04_inact_");

  await t.test("AUD-04.1 Unauthenticated operator cannot access staff views or bypass with shared PIN", async () => {
    assert.equal(opStore.isStaffUnlocked(), false);
    assert.equal(opStore.canAccessStaffView("operator"), false);
    assert.equal(opStore.canAccessStaffView("admin"), false);
    assert.equal(opStore.verifyStaffPin("1234"), false);
    assert.throws(() => opStore.saveLocalSettings({ staffPin: "9999" }), /sólo existe en modo demo/i);
    await assert.rejects(
      () => opStore.invokeStaffOrderRpc("take_order", { p_order_id: 501, p_expected_version: 1 }),
      /autenticada requerida/i
    );
    const anonRpc = await anonClient.rpc("take_order", { p_order_id: 501, p_expected_version: 1 });
    assert.ok(anonRpc.error);
    assert.match(anonRpc.error.message, /FORBIDDEN/i);
  });

  await t.test("AUD-04.2 Inactive staff member or wrong password cannot authenticate", async () => {
    await assert.rejects(() => opStore.signInStaff("operator@local.test", "WrongPass"), /Invalid login/i);
    await assert.rejects(() => inactiveStore.signInStaff("inactive@local.test", "InactivePassword!1"), /membresía|activo/i);
    assert.equal(inactiveStore.isStaffUnlocked(), false);
  });

  await t.test("AUD-04.3 Operator logs in, operates Kanban, but is blocked from admin/product writes", async () => {
    const sess = await opStore.signInStaff("operator@local.test", "OperatorStrongPassword!1");
    assert.equal(sess.role, "operator");
    assert.equal(opStore.canAccessStaffView("operator"), true);
    assert.equal(opStore.canAccessStaffView("admin"), false, "Operator must NOT access admin view");

    assert.throws(
      () =>
        opStore.saveProduct({
          nombre: "Hack",
          categoria: "Verduras",
          unidad_medida: "KG",
          precio: 1,
          paso: 0.5
        }),
      /dueño/i
    );

    const directRes = await opSupa.from("productos").upsert({
      id: "hack-1",
      nombre: "Hack",
      categoria: "Verduras",
      unidad_medida: "KG",
      precio: 1,
      paso: 0.5
    });
    assert.ok(directRes.error, "RLS must reject operator upsert on productos");
  });

  await t.test("AUD-04.4 Expired token fails refreshStaffSession and re-gates store", async () => {
    await ownerStore.signInStaff("owner@local.test", "OwnerStrongPassword!1");
    assert.equal(ownerStore.canAccessStaffView("admin"), true);
    assert.equal(ownerStore.canAccessStaffView("operator"), true);

    let lockedEvents = 0;
    const unsub = ownerStore.subscribe((evt) => {
      if (evt === "staff_locked") lockedEvents++;
    });

    ownerSupa.__setSessionExpiresAt(Math.floor(Date.now() / 1000) - 60);
    const refreshed = await ownerStore.refreshStaffSession();
    unsub();

    assert.equal(refreshed, null);
    assert.equal(ownerStore.isStaffUnlocked(), false);
    assert.equal(ownerStore.canAccessStaffView("admin"), false);
    assert.equal(lockedEvents, 1, "Expired session must notify staff_locked");

    await ownerStore.signInStaff("owner@local.test", "OwnerStrongPassword!1");
  });

  await t.test("AUD-05.1 Anon direct enumeration on pedidos/clientes is denied and realtime excludes pedidos", async () => {
    const pedRes = await anonClient.from("pedidos").select("*").limit(50);
    assert.ok(pedRes.error, "Anon direct select on pedidos must fail");
    assert.equal(pedRes.data, null);

    const cliRes = await anonClient.from("clientes").select("*");
    assert.ok(cliRes.error, "Anon direct select on clientes must fail");
    assert.equal(cliRes.data, null);

    const prodRes = await anonClient.from("productos").select("*");
    assert.equal(prodRes.error, null);
    assert.equal(prodRes.data.some((p) => p.id === "prod-archived"), false, "Anon must not read archived products");

    assert.equal(
      harness.logs.realtimeSubscriptions.some((s) => s.table === "pedidos"),
      true,
      "Only authenticated staff stores should have subscribed to pedidos realtime"
    );
  });

  await t.test("AUD-06.1 Tracking tokens isolate Customer A vs Customer B, hide phones, and stay in hash fragment", async () => {
    await clientA.pullFromSupabase();
    await clientB.pullFromSupabase();

    clientA.addToCart("prod-1", 1);
    const resA = await clientA.submitOrder({
      cliente: { nombre: "Cliente A", telefono: "1133334444", direccion: "Dir A 10" },
      tipo_entrega: "RETIRO"
    });
    assert.equal(resA.ok, true);
    const orderA = resA.order;
    const tokenA = resA.trackingToken;

    clientB.addToCart("prod-1", 2);
    const resB = await clientB.submitOrder({
      cliente: { nombre: "Cliente B", telefono: "1166667777", direccion: "Dir B 20" },
      tipo_entrega: "DELIVERY",
      direccion_entrega: "Dir B 20"
    });
    assert.equal(resB.ok, true);
    const orderB = resB.order;
    const tokenB = resB.trackingToken;

    assert.ok(resA.trackingLink.startsWith(`#track=${orderA.id}:`), "Tracking link must use hash fragment");
    assert.equal(resA.trackingLink.includes("?token="), false, "Tracking token must never appear in query string");

    // Token A CANNOT lookup Order B
    const crossRes = await anonClient.rpc("get_order_by_tracking_token", {
      p_order_id: orderB.id,
      p_token: tokenA
    });
    assert.equal(crossRes.error, null);
    assert.equal(crossRes.data.length, 0, "Cross-order tracking lookup must return 0 rows");

    // Token B resolves Order B cleanly and NEVER exposes cliente_telefono
    const selfRes = await anonClient.rpc("get_order_by_tracking_token", {
      p_order_id: orderB.id,
      p_token: tokenB
    });
    assert.equal(selfRes.data.length, 1);
    assert.equal(selfRes.data[0].cliente_nombre, "Cliente B");
    assert.equal(selfRes.data[0].cliente_telefono, undefined, "Tracking projection must not leak phone");

    // Store private resolution refuses invalid/cross hash without crashing
    const resolvedCross = await clientA.resolvePrivateTrackingLink(`#track=${orderB.id}:${tokenA}`);
    assert.equal(resolvedCross.ok, false);
    assert.equal(resolvedCross.notFoundOrRevoked, true);

    const resolvedOwn = await clientA.resolvePrivateTrackingLink(resA.trackingLink);
    assert.equal(resolvedOwn.ok, true);
    assert.equal(resolvedOwn.order.id, orderA.id);
  });

  await t.test("AUD-06.2 Revoking tracking token requires staff and invalidates further tracking lookup", async () => {
    const ownRefs = clientA.getOwnTrackingRefs();
    assert.equal(ownRefs.length, 1);
    const orderAId = ownRefs[0].orderId;
    const tokenA = ownRefs[0].token;

    await assert.rejects(() => clientA.revokeOrderTrackingTokenAsync(orderAId), /autenticado/i);

    const revoked = await opStore.revokeOrderTrackingTokenAsync(orderAId);
    assert.equal(revoked, true);

    const afterRevoke = await anonClient.rpc("get_order_by_tracking_token", {
      p_order_id: orderAId,
      p_token: tokenA
    });
    assert.equal(afterRevoke.data.length, 0, "Revoked token must behave indistinguishably from invalid token");

    await clientA.refreshOwnTrackingOrders();
    assert.equal(clientA.getOwnTrackingRefs().length, 0, "Revoked ref must be pruned from client storage");
  });

  await t.test("AUD-04/05/06 Static SQL Migration Contract & ?tel= non-autologin check", async () => {
    const migSql = fs.readFileSync(
      path.join(root, "supabase/migrations/202611130001_aud_04_05_06_auth_rbac_tracking.sql"),
      "utf8"
    );
    assert.ok(migSql.includes("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.pedidos FROM anon;"));
    assert.ok(migSql.includes("REVOKE SELECT ON public.clientes FROM anon;"));
    assert.ok(migSql.includes("CREATE OR REPLACE FUNCTION public.get_order_by_tracking_token"));
    assert.ok(migSql.includes("CREATE OR REPLACE FUNCTION public.revoke_order_tracking_token"));
    assert.ok(migSql.includes("CREATE OR REPLACE FUNCTION public.is_active_owner()"));

    // Verify ?tel= query string NEVER auto-logs in customer
    globalThis.window.location.search = "?tel=1144445555";
    nextClient = anonClient;
    const prefillStore = new Store({
      ...baseProdConfig,
      mode: "demo",
      supabaseUrl: "",
      supabaseAnonKey: "",
      storageKeys: makePrefixKeys("nexo_prefill_")
    });
    assert.equal(prefillStore.getCurrentUser(), null, "?tel= must NEVER authenticate/login user automatically");
    assert.equal(prefillStore.prefilledPhone, "1144445555");
    globalThis.window.location.search = "";
  });

  await t.test("AUD-04/06 Browser Check: fragment routing does not leak token to query params & renders staff Auth gate", async () => {
    let chromium;
    for (const cand of ["playwright", process.env.PLAYWRIGHT_PATH || "", "/tmp/pw/node_modules/playwright", "C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"].filter(Boolean)) {
      try { const m = require(cand); if (m?.chromium) { chromium = m.chromium; break; } } catch {}
    }
    assert.ok(chromium, "Playwright chromium required");
    const { startDemoServer } = await import(pathToFileURL(path.join(root, "bot/serve-demo.js")).href);

    const running = await startDemoServer({ sourceRoot: root, host: "127.0.0.1", port: 0 });
    const launchOpts = { headless: true, args: ["--disable-background-networking", "--no-first-run", "--disable-gpu"] };
    const braveExe = "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe";
    if (fs.existsSync(braveExe)) launchOpts.executablePath = braveExe;

    const browser = await chromium.launch(launchOpts);
    try {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await ctx.route("**/*", (route) => {
        const u = new URL(route.request().url());
        if (u.hostname === "127.0.0.1" || u.hostname === "localhost") return route.continue();
        if (u.hostname === "cdn.tailwindcss.com") {
          return route.fulfill({ status: 200, contentType: "application/javascript", body: "window.tailwind = window.tailwind || {};" });
        }
        return route.abort();
      });
      const page = await ctx.newPage();
      const pageErrors = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      // Verify fragment tracking route preserves hash without hitting network query params
      await page.goto(`${running.url}/#track=999:${"a".repeat(64)}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);
      const currentHref = await page.evaluate(() => window.location.href);
      assert.equal(currentHref.includes("?token="), false);
      assert.ok(currentHref.includes("#track="));

      // Verify ?tel= in browser does NOT skip phone gate
      await page.goto(`${running.url}/?tel=1144445555`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);
      const prefilledVal = await page.locator("#phone-input").inputValue();
      assert.equal(prefilledVal, "1144445555");
      assert.equal(await page.locator("#phone-input").isVisible(), true, "Customer must still explicitly confirm login");

      assert.equal(pageErrors.length, 0, `Unexpected browser JS errors: ${pageErrors.join("; ")}`);
    } finally {
      await browser.close();
      running.server.closeAllConnections();
      await new Promise((r) => running.server.close(r));
    }
  });
});
