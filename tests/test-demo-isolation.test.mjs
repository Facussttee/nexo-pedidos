/**
 * NEXO PEDIDOS - TEST SUITE: DEMO ISOLATION & EXPLICIT PUBLIC CONFIG (NP-002)
 *
 * Pruebas empíricas ejecutables en Node (sin red ni servicios reales):
 * 1. Ejecución real del bundle en VM con localStorage contaminado con claves
 *    heredadas mihuerta_* y espías en window.supabase.createClient / fetch /
 *    WebSocket / window.open -> cero llamadas de red ni creación de cliente.
 * 2. Separación estricta de namespace (nexo_demo_v1_* / nexo_prod_v1_*) sin
 *    migrar ni leer datos heredados.
 * 3. Validación de configuración pública explícita: producción incompleta o con
 *    credenciales prohibidas (service_role / sb_secret_) falla claramente,
 *    bloquea createOrder() y muestra pantalla de error sin fallback local.
 * 4. Flujo operativo completo con datos sintéticos: catálogo -> carrito (pesable
 *    + unidad) -> pedido -> pesaje real -> estado LISTO -> WhatsApp simulado.
 * 5. Higiene de index.html y bundle (sin SDK Supabase predeterminado ni
 *    credenciales/contactos heredados).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

import { resolveNexoConfig, installDemoNetworkGuard, DEMO_BUSINESS } from "../js/config.js";
import { DEMO_CUSTOMERS, DEMO_QUICK_CUSTOMER, buildDemoOrders } from "../js/demo-data.js";

// Preparar entorno localStorage aislado antes de importar store.js
function createMockStorage(initial = {}) {
  const map = new Map(Object.entries(initial).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  const reads = [];
  const writes = [];
  return {
    map,
    reads,
    writes,
    getItem(k) {
      reads.push(k);
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      writes.push(k);
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
    clear() {
      map.clear();
    },
    keys() {
      return [...map.keys()];
    }
  };
}

// Sembrar datos heredados maliciosos/viejos ANTES de importar store.js
const globalStorage = createMockStorage({
  mihuerta_cloud_config_v3: {
    supabaseUrl: "https://legacy-should-never-connect.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legacy",
    staffPin: "9999"
  },
  mihuerta_customers_v3: {
    "1123456789": { telefono: "1123456789", nombre: "Contacto Heredado Prohibido", direccion: "Calle Real 123" }
  },
  mihuerta_orders_v3: [{ id: 999, cliente: { nombre: "Contacto Heredado Prohibido", telefono: "1123456789" }, estado: "PENDIENTE", items: [] }],
  mihuerta_theme_v3: "dark",
  theme: "dark"
});
globalThis.localStorage = globalStorage;

const { Store, STORAGE_KEYS } = await import("../js/store.js");

let passed = 0;
function pass(label) {
  passed++;
  console.log(`  [PASS] ${label}`);
}

console.log("===============================================================");
console.log("   NEXO PEDIDOS - DEMO ISOLATION & CONFIG TEST SUITE (NP-002)");
console.log("===============================================================\n");

// ---------------------------------------------------------------------------
// Helper: Ejecutar public-config.js + bundle.js dentro de un sandbox VM con DOM mínimo
// ---------------------------------------------------------------------------
function runBundleInSandbox({ publicConfigScript = null, prefillStorage = {} } = {}) {
  const storage = createMockStorage(prefillStorage);
  const spyCalls = {
    createClient: [],
    fetch: [],
    websocket: [],
    xhr: [],
    open: [],
    scriptsInjected: []
  };

  const makeEl = (id = "") => ({
    id,
    innerHTML: "",
    textContent: "",
    value: "",
    dataset: {},
    style: { setProperty() {} },
    offsetHeight: 32,
    classList: {
      _set: new Set(id === "nexo-demo-banner" || id === "simulator-bar" ? ["hidden"] : []),
      add(...cls) { cls.forEach((c) => this._set.add(c)); },
      remove(...cls) { cls.forEach((c) => this._set.delete(c)); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._set.has(c)) this._set.delete(c); else this._set.add(c);
        } else if (force) this._set.add(c); else this._set.delete(c);
      },
      contains(c) { return this._set.has(c); }
    },
    addEventListener() {},
    setAttribute() {},
    removeAttribute() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    appendChild(child) {
      if (child && child.src) spyCalls.scriptsInjected.push(child.src);
    },
    focus() {}
  });

  const elements = {
    "app-content": makeEl("app-content"),
    "nexo-top-stack": makeEl("nexo-top-stack"),
    "nexo-demo-banner": makeEl("nexo-demo-banner"),
    "simulator-bar": makeEl("simulator-bar"),
    "btn-lock-pin": makeEl("btn-lock-pin")
  };

  const documentMock = {
    readyState: "complete",
    documentElement: makeEl("html"),
    body: makeEl("body"),
    head: makeEl("head"),
    getElementById(id) { return elements[id] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement(tag) { return { tagName: tag.toUpperCase(), src: "", async: false }; }
  };

  const windowMock = {
    URL,
    URLSearchParams,
    document: documentMock,
    localStorage: storage,
    location: { search: "", hash: "", href: "http://localhost/" },
    navigator: {
      vibrate() {},
      sendBeacon(url) { spyCalls.fetch.push({ via: "beacon", url }); return false; }
    },
    matchMedia() { return { matches: false, addEventListener() {} }; },
    addEventListener() {},
    scrollTo() {},
    supabase: {
      createClient(url, key) {
        spyCalls.createClient.push({ url, key });
        return {
          from() {
            return {
              select() { return { eq() { return Promise.resolve({ data: [] }); }, order() { return { limit() { return Promise.resolve({ data: [] }); }, then(r) { return r({ data: [] }); } }; } }; },
              upsert() { return Promise.resolve({}); },
              update() { return { eq() { return Promise.resolve({}); } }; },
              delete() { return { eq() { return Promise.resolve({}); } }; }
            };
          },
          channel() {
            return { on() { return this; }, subscribe() { return {}; } };
          },
          removeChannel() {}
        };
      }
    },
    fetch(url) {
      spyCalls.fetch.push(url);
      return Promise.resolve({ ok: true });
    },
    WebSocket: function MockWS(url) {
      spyCalls.websocket.push(url);
    },
    XMLHttpRequest: function MockXHR() {
      spyCalls.xhr.push("xhr");
    },
    open(url) {
      spyCalls.open.push(url);
      return null;
    }
  };
  windowMock.window = windowMock;
  windowMock.globalThis = windowMock;

  const context = vm.createContext(windowMock);
  const pubCfgCode = publicConfigScript !== null
    ? publicConfigScript
    : fs.readFileSync("js/public-config.js", "utf8");
  const bundleCode = fs.readFileSync("js/bundle.js", "utf8");

  vm.runInContext(pubCfgCode, context, { filename: "public-config.js" });
  vm.runInContext(bundleCode, context, { filename: "bundle.js" });

  return { windowMock, elements, storage, spyCalls };
}

// ===========================================================================
// SUITE 1: AISLAMIENTO DE RED Y CLIENTE SUPABASE EN DEMO CON CONFIG HEREDADA
// ===========================================================================
console.log("--- SUITE 1: Demo Isolation & Network Interception ---");

{
  const { windowMock, elements, storage, spyCalls } = runBundleInSandbox({
    prefillStorage: {
      mihuerta_cloud_config_v3: {
        supabaseUrl: "https://legacy-should-never-connect.supabase.co",
        supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legacy",
        staffPin: "7777"
      },
      mihuerta_customers_v3: {
        "1123456789": { telefono: "1123456789", nombre: "Contacto Heredado", direccion: "Real 123" }
      },
      mihuerta_orders_v3: [{ id: 888, cliente: { nombre: "Heredado", telefono: "1123456789" }, estado: "PENDIENTE", items: [] }]
    }
  });

  assert.equal(spyCalls.createClient.length, 0, "Demo NUNCA debe invocar supabase.createClient");
  assert.equal(spyCalls.fetch.length, 0, "Demo NUNCA debe ejecutar fetch al iniciar");
  assert.equal(spyCalls.websocket.length, 0, "Demo NUNCA debe abrir WebSockets");
  assert.equal(spyCalls.scriptsInjected.length, 0, "Demo NUNCA debe inyectar el script SDK de Supabase");
  pass("1.1 Bundle en demo no crea cliente Supabase ni realiza llamadas de red aunque exista mihuerta_cloud_config_v3");

  // Guard activo en window: intentar fetch / WebSocket / window.open debe bloquearse
  await assert.rejects(() => windowMock.fetch("https://example.com/api"), /red deshabilitada/i);
  assert.throws(() => new windowMock.WebSocket("wss://example.com/socket"), /red deshabilitada/i);
  assert.equal(windowMock.open("https://wa.me/5491100000001"), null);
  assert.equal(spyCalls.fetch.length, 0, "El fetch original no debe haber sido alcanzado");
  assert.equal(spyCalls.websocket.length, 0, "El WebSocket original no debe haber sido alcanzado");
  assert.equal(spyCalls.open.length, 0, "El window.open original no debe haber sido alcanzado");
  assert.equal(windowMock.__NEXO_DEMO_GUARD__.blocked.length, 3, "El guard debe registrar los 3 intentos bloqueados");
  pass("1.2 Guard de red en demo intercepta y bloquea fetch, WebSocket y window.open");

  // Banner persistente visible en demo
  assert.equal(elements["nexo-demo-banner"].classList.contains("hidden"), false, "El banner de demo debe ser visible");
  assert.equal(elements["nexo-demo-banner"].classList.contains("is-error"), false, "El banner de demo no es de error");
  pass("1.3 Aviso persistente de Modo Demo visible al iniciar");

  // Verificar que ninguna clave mihuerta_* fue leída por el runtime de Nexo
  const mihuertaReads = storage.reads.filter((k) => k.startsWith("mihuerta_") || k === "theme");
  assert.equal(mihuertaReads.length, 0, `No se debe leer ninguna clave heredada, pero se leyeron: ${mihuertaReads.join(", ")}`);
  const nexoWrites = storage.writes.filter((k) => k.startsWith("nexo_demo_v1_"));
  assert.ok(nexoWrites.length >= 3, "Debe escribir productos, clientes y pedidos en nexo_demo_v1_*");
  pass("1.4 Cero lecturas a claves mihuerta_* o 'theme'; escritura exclusiva en nexo_demo_v1_*");
}

// ===========================================================================
// SUITE 2: CONFIGURACIÓN PÚBLICA EXPLÍCITA Y FALLO CLARO EN PRODUCCIÓN
// ===========================================================================
console.log("\n--- SUITE 2: Explicit Public Config & Production Fail-Closed ---");

{
  // 2.1 Sin config -> demo por defecto
  const defCfg = resolveNexoConfig(undefined);
  assert.equal(defCfg.mode, "demo");
  assert.equal(defCfg.ok, true);
  assert.equal(defCfg.supabaseUrl, "");
  assert.equal(defCfg.supabaseAnonKey, "");
  assert.equal(defCfg.business.alias, DEMO_BUSINESS.alias);
  pass("2.1 Sin NEXO_PUBLIC_CONFIG inicia en modo demo explícito sin URL ni clave Supabase");

  // 2.2 Demo ignora bloque supabase si alguien lo pasa por error
  const demoWithSupa = resolveNexoConfig({
    mode: "demo",
    supabase: { url: "https://should-be-ignored.supabase.co", anonKey: "anon-key" }
  });
  assert.equal(demoWithSupa.mode, "demo");
  assert.equal(demoWithSupa.ok, true);
  assert.equal(demoWithSupa.supabaseUrl, "");
  assert.equal(demoWithSupa.supabaseAnonKey, "");
  assert.ok(demoWithSupa.warnings.length > 0);
  pass("2.2 Modo demo ignora cualquier credencial Supabase inyectada en la configuración");

  // 2.3 Producción vacía o incompleta falla claramente
  const prodEmpty = resolveNexoConfig({ mode: "production" });
  assert.equal(prodEmpty.mode, "production");
  assert.equal(prodEmpty.ok, false);
  assert.ok(prodEmpty.errors.some((e) => e.includes("business.name")));
  assert.ok(prodEmpty.errors.some((e) => e.includes("supabase.url")));
  assert.ok(prodEmpty.errors.some((e) => e.includes("supabase.anonKey")));
  assert.equal(prodEmpty.supabaseUrl, "");
  assert.equal(prodEmpty.supabaseAnonKey, "");
  pass("2.3 Producción sin parámetros falla con lista explícita de errores y sin fallback");

  // 2.4 Producción rechaza service_role JWT, sb_secret_ y campos secretos
  const fakeServiceRoleJwt = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify({ role: "service_role", iss: "supabase" })).toString("base64url"),
    "sig"
  ].join(".");
  const prodServiceRole = resolveNexoConfig({
    mode: "production",
    business: { name: "Comercio Test" },
    supabase: { url: "https://valid-example.supabase.co", anonKey: fakeServiceRoleJwt },
    serviceRoleKey: "forbidden"
  });
  assert.equal(prodServiceRole.ok, false);
  assert.ok(prodServiceRole.errors.some((e) => e.includes("service_role")));
  assert.ok(prodServiceRole.errors.some((e) => e.includes("serviceRoleKey")));

  const prodSbSecret = resolveNexoConfig({
    mode: "production",
    business: { name: "Comercio Test" },
    supabase: { url: "https://valid-example.supabase.co", anonKey: "sb_secret_123456" }
  });
  assert.equal(prodSbSecret.ok, false);
  assert.ok(prodSbSecret.errors.some((e) => e.includes("clave secreta")));
  pass("2.4 Producción rechaza claves service_role, sb_secret_ y propiedades secretas prohibidas");

  // 2.5 En VM, producción incompleta muestra pantalla de error y no conecta ni simula éxito local
  const { elements, spyCalls } = runBundleInSandbox({
    publicConfigScript: `window.NEXO_PUBLIC_CONFIG = { mode: "production", business: { name: "" }, supabase: {} };`
  });
  assert.equal(spyCalls.createClient.length, 0, "Producción inválida no debe llamar createClient");
  assert.equal(elements["nexo-demo-banner"].classList.contains("is-error"), true, "Debe activar estilo de error en barra superior");
  assert.ok(elements["app-content"].innerHTML.includes("nexo-config-error-card"), "Debe renderizar tarjeta de error de configuración");

  const brokenStore = new Store(prodEmpty);
  assert.equal(brokenStore.getProducts().length, 0, "Producción inválida no debe exponer catálogo demo");
  assert.equal(brokenStore.createOrder({ cliente: { nombre: "X", telefono: "1100000099" }, tipo_entrega: "RETIRO", direccion_entrega: "" }), null, "Producción inválida no debe permitir crear pedidos locales");
  pass("2.5 Producción incompleta bloquea vistas/pedidos, muestra error claro y no simula éxito local");

  // 2.6 Producción válida (mockeada en VM sin red real) NO renderiza ni habilita #btn-quick-demo-user ni clientes sintéticos
  const demoVm = runBundleInSandbox();
  assert.ok(demoVm.elements["app-content"].innerHTML.includes('id="btn-quick-demo-user"'), "En modo demo sí debe mostrarse #btn-quick-demo-user");

  const fakeAnonJwt = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify({ role: "anon", iss: "supabase" })).toString("base64url"),
    "sig"
  ].join(".");
  const prodValidVm = runBundleInSandbox({
    publicConfigScript: `window.NEXO_PUBLIC_CONFIG = ${JSON.stringify({
      mode: "production",
      business: { name: "Comercio Productivo Mock", alias: "comercio.mock", whatsapp: "5491100009999" },
      supabase: { url: "https://mock-prod-isolated.supabase.co", anonKey: fakeAnonJwt }
    })};`
  });
  assert.ok(prodValidVm.elements["app-content"].innerHTML.includes("Comercio Productivo Mock"), "Producción válida debe renderizar el nombre configurado");
  assert.ok(!prodValidVm.elements["app-content"].innerHTML.includes("btn-quick-demo-user"), "Producción válida NUNCA debe renderizar #btn-quick-demo-user");
  assert.ok(!prodValidVm.elements["app-content"].innerHTML.includes(DEMO_QUICK_CUSTOMER.nombre), "Producción válida NUNCA debe ofrecer el botón de cliente sintético");

  const prodValidCfg = resolveNexoConfig({
    mode: "production",
    business: { name: "Comercio Productivo Mock", alias: "comercio.mock", whatsapp: "5491100009999" },
    supabase: { url: "https://mock-prod-isolated.supabase.co", anonKey: fakeAnonJwt }
  });
  const prodStore = new Store(prodValidCfg);
  assert.equal(Object.keys(prodStore.getCustomers()).length, 0, "Producción válida no debe sembrar clientes sintéticos en nexo_prod_v1_*");
  assert.equal(prodStore.getOrders().length, 0, "Producción válida no debe sembrar pedidos sintéticos en nexo_prod_v1_*");
  pass("2.6 Producción válida (aislada con mock) oculta #btn-quick-demo-user y no siembra clientes/pedidos sintéticos");
}

// ===========================================================================
// SUITE 3: FLUJO OPERATIVO COMPLETO CON DATOS SINTÉTICOS (CARRITO -> PESO -> LISTO)
// ===========================================================================
console.log("\n--- SUITE 3: Synthetic Data & Full Order/Weighing Flow ---");

{
  globalStorage.clear();
  const demoCfg = resolveNexoConfig({ mode: "demo" });
  const demoStore = new Store(demoCfg);

  // 3.1 Semilla sintética verificable
  assert.ok(STORAGE_KEYS.PRODUCTS.startsWith("nexo_demo_v1_"));
  const customers = demoStore.getCustomers();
  assert.equal( customers["1123456789"], undefined, "El teléfono heredado 1123456789 no debe existir");
  assert.equal(customers["1100000001"].nombre, DEMO_CUSTOMERS["1100000001"].nombre);
  assert.equal(customers["1100000002"].nombre, DEMO_CUSTOMERS["1100000002"].nombre);

  const seededOrders = demoStore.getOrders();
  assert.equal(seededOrders.length, 2);
  assert.ok(seededOrders.every((o) => o.demo === true && o.cliente.nombre.includes("Demo")));
  pass("3.1 Clientes y pedidos iniciales son 100% sintéticos y viven bajo nexo_demo_v1_*");

  // 3.2 Login con cliente sintético rápido + armado de carrito mixto (pesable KG + UNIDAD)
  const logged = demoStore.saveCustomer({ ...DEMO_QUICK_CUSTOMER });
  assert.equal(demoStore.getCurrentUser().telefono, "1100000001");

  demoStore.clearCart();
  demoStore.addToCart("prod-9", 1.5); // Tomate Redondo Premium (KG, $2600/kg -> $3900 est.)
  demoStore.addToCart("prod-13", 2);  // Acelga de Huerta (UNIDAD, $900/u -> $1800)

  const summary = demoStore.getCartSummary();
  assert.equal(summary.totalItems, 2);
  assert.equal(summary.totalEstimado, 5700);
  pass("3.2 Carrito calcula subtotal estimado para ítem pesable (1.5 kg) e ítem por unidad (2 u)");

  // 3.3 Checkout -> creación de pedido PENDIENTE
  const created = demoStore.createOrder({
    cliente: logged,
    tipo_entrega: "DELIVERY",
    direccion_entrega: logged.direccion
  });
  assert.ok(created && created.id === 103);
  assert.equal(created.estado, "PENDIENTE");
  assert.equal(created.total_estimado, 5700);
  assert.equal(created.total_real, null);
  const kgItemIdx = created.items.findIndex((i) => i.unidad_medida === "KG");
  const unitItemIdx = created.items.findIndex((i) => i.unidad_medida === "UNIDAD");
  assert.equal(created.items[kgItemIdx].peso_real, null, "Ítem en KG inicia sin peso_real");
  assert.equal(created.items[unitItemIdx].peso_real, 2, "Ítem por UNIDAD conserva cantidad como peso_real");
  pass("3.3 Checkout crea pedido #103 en estado PENDIENTE con diferencia entre estimado y real");

  // 3.4 Preparación y pesaje en balanza -> LISTO
  demoStore.updateOrderStatus(created.id, "EN_PREPARACION");
  assert.equal(demoStore.getOrders().find((o) => o.id === created.id).estado, "EN_PREPARACION");

  // Pesar 1.65 kg reales de tomate ($2600 * 1.65 = $4290) + 2 u acelga ($1800) = $6090
  demoStore.updateItemWeight(created.id, kgItemIdx, 1.65);
  assert.equal(created.items[unitItemIdx].confirmado_preparacion, false, "UNIDAD precargada no está confirmada");
  assert.throws(() => demoStore.finalizeOrderWeighing(created.id), /preparar|confirmar/);
  demoStore.updateItemWeight(created.id, unitItemIdx, 2, { confirmUnit: true });
  demoStore.finalizeOrderWeighing(created.id, { [kgItemIdx]: 1.65, [unitItemIdx]: 2 });

  const readyOrder = demoStore.getOrders().find((o) => o.id === created.id);
  assert.equal(readyOrder.estado, "LISTO");
  assert.equal(readyOrder.total_estimado, 5700);
  assert.equal(readyOrder.total_real, 6090);
  pass("3.4 Pesaje en balanza actualiza peso_real (1.65 kg), calcula total_real ($6090) y pasa a LISTO");

  // 3.5 Simulación de WhatsApp en demo (sin abrir enlaces externos)
  const waRes = demoStore.sendWhatsAppMessage({
    to: `549${readyOrder.cliente.telefono}`,
    text: `Pedido #${readyOrder.id} listo. Alias: ${demoStore.getBusinessProfile().alias}`,
    kind: "order_ready"
  });
  assert.equal(waRes.simulated, true);
  assert.equal(waRes.sent, false);
  const simLog = demoStore.getSimulatedMessages();
  assert.equal(simLog.length, 1);
  assert.equal(simLog[0].to, "5491100000001");
  assert.ok(simLog[0].text.includes("alias.demo.nexo"));
  pass("3.5 Envío de WhatsApp en demo queda registrado localmente como simulado sin abrir wa.me");
}

// ===========================================================================
// SUITE 4: HIGIENE DE ARCHIVOS ACTIVOS (HTML, FUENTES Y BUNDLE)
// ===========================================================================
console.log("\n--- SUITE 4: HTML & Bundle Hygiene ---");

{
  const html = fs.readFileSync("index.html", "utf8");
  const bundle = fs.readFileSync("js/bundle.js", "utf8");

  assert.ok(!html.includes("@supabase/supabase-js"), "index.html no debe cargar el SDK de Supabase por defecto");
  const pubCfgPos = html.indexOf("js/public-config.js");
  const bundlePos = html.indexOf("js/bundle.js");
  assert.ok(pubCfgPos > 0 && pubCfgPos < bundlePos, "index.html debe cargar js/public-config.js antes de js/bundle.js");
  assert.ok(html.includes('id="nexo-demo-banner"'), "index.html debe incluir el contenedor #nexo-demo-banner");
  pass("4.1 index.html carga public-config antes del bundle, sin SDK Supabase y con banner demo");

  const forbiddenLiterals = [
    "afrvwqghnvblgjbdndnt",
    "mhw70b-K3G-bhUEBTdXS",
    "1123456789",
    "1198765432",
    "Facundo Gómez",
    "mihuerta.verduras",
    "mihuerta_products_v3",
    "mihuerta_cloud_config_v3"
  ];
  for (const lit of forbiddenLiterals) {
    assert.ok(!bundle.includes(lit), `js/bundle.js no debe contener el literal heredado "${lit}"`);
  }
  pass("4.2 js/bundle.js libre de endpoints, claves, contactos, alias y claves localStorage heredadas");
}

console.log("\n===============================================================");
console.log(`   ALL DEMO ISOLATION TESTS PASSED: ${passed} / ${passed}`);
console.log("===============================================================");
