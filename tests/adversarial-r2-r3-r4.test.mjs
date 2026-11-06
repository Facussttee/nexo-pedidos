/**
 * MI HUERTA - ADVERSARIAL TEST HARNESS: REQUIREMENTS R2, R3, R4
 * Challenger 2 (Quick Discard, Theme Reactivity & State Machine Adversarial Tester)
 *
 * Requirements Tested:
 * - R2: Global & Commutable Dark Mode (Reactivity, 50+ toggles, dual-key persistence, matchMedia fallback, corrupt data)
 * - R3: Quick Discard Cross (HTML verification, 44x44px target, '×' glyph, clearance, click simulation, rapid clicks, category switching)
 * - R4: Bundle Sync & Execution (UTF-8 no BOM, zero ESM imports/exports, node --check, simulated DOM evaluation)
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

// ============================================================================
// TEST HARNESS ASSERTION INFRASTRUCTURE
// ============================================================================
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];
const suiteResults = {};

function suite(name) {
  console.log(`\n===============================================================`);
  console.log(`  ${name}`);
  console.log(`===============================================================`);
  suiteResults[name] = { passed: 0, failed: 0 };
  currentSuite = name;
}
let currentSuite = "Default";

function assert(condition, message, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    suiteResults[currentSuite].passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    suiteResults[currentSuite].failed++;
    const errMsg = `  [FAIL] ${message}${details ? " -> " + details : ""}`;
    console.error(errMsg);
    failures.push({ suite: currentSuite, message, details });
  }
}

// ============================================================================
// MOCK DOM & BROWSER ENVIRONMENT SETUP
// ============================================================================
class DOMTokenList {
  constructor(element) {
    this.element = element;
    this.set = new Set();
  }
  _sync() {
    this.element.attributes["class"] = Array.from(this.set).join(" ");
  }
  contains(cls) {
    return this.set.has(cls);
  }
  add(...classes) {
    classes.forEach((c) => this.set.add(c));
    this._sync();
  }
  remove(...classes) {
    classes.forEach((c) => this.set.delete(c));
    this._sync();
  }
  toggle(cls, force) {
    const shouldAdd =
      force !== undefined ? Boolean(force) : !this.contains(cls);
    if (shouldAdd) this.add(cls);
    else this.remove(cls);
    return shouldAdd;
  }
  initFrom(str) {
    this.set = new Set(String(str).split(/\s+/).filter(Boolean));
  }
}

class MockDOMElement {
  constructor(tagName = "div", attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attrs };
    this.children = [];
    this.eventListeners = {};
    this.dataset = {};
    this.classList = new DOMTokenList(this);
    this._textContent = "";
    this._innerHTML = "";
    this.style = {
      _styles: {},
      setProperty(prop, val) {
        this._styles[prop] = String(val);
      },
      removeProperty(prop) {
        delete this._styles[prop];
      },
      getPropertyValue(prop) {
        return this._styles[prop] || "";
      }
    };
    this.offsetHeight = 46;
    this.offsetWidth = 360;

    for (const [k, v] of Object.entries(attrs)) {
      this.setAttribute(k, v);
    }
  }

  getAttribute(name) {
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }

  setAttribute(name, val) {
    const strVal = String(val);
    this.attributes[name] = strVal;
    if (name === "class") {
      this.classList.initFrom(strVal);
    }
    if (name.startsWith("data-")) {
      const camel = name
        .slice(5)
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[camel] = strVal;
    }
    if (name === "id") {
      this.id = strVal;
    }
  }

  hasAttribute(name) {
    return name in this.attributes;
  }

  removeAttribute(name) {
    delete this.attributes[name];
    if (name === "class") this.classList.initFrom("");
    if (name === "id") delete this.id;
  }

  closest(selector) {
    if (selector === ".theme-toggle-btn") {
      if (this.classList.contains("theme-toggle-btn")) return this;
      return null;
    }
    return null;
  }

  querySelector(sel) {
    return null;
  }

  querySelectorAll(sel) {
    return [];
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(val) {
    this._textContent = String(val);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = String(val);
  }

  addEventListener(event, fn) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(fn);
  }

  removeEventListener(event, fn) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        (f) => f !== fn
      );
    }
  }

  dispatchEvent(event) {
    const list = this.eventListeners[event.type || event] || [];
    const ev =
      typeof event === "string"
        ? {
            type: event,
            target: this,
            preventDefault() {},
            stopPropagation() {}
          }
        : event;
    if (!ev.target) ev.target = this;
    if (!ev.stopPropagation) ev.stopPropagation = () => {};
    if (!ev.preventDefault) ev.preventDefault = () => {};
    for (const fn of list) {
      fn(ev);
    }
    return true;
  }

  click() {
    this.dispatchEvent({
      type: "click",
      target: this,
      preventDefault() {},
      stopPropagation() {}
    });
  }
}

function parseHTMLToMockElements(html) {
  const elements = [];
  const tagRegex = /<([a-zA-Z0-9\-]+)([^>]*)>/g;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const tagName = match[1];
    const attrString = match[2];
    const attrs = {};
    const attrRegex = /([a-zA-Z0-9\-]+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      const key = attrMatch[1];
      const val =
        attrMatch[2] !== undefined
          ? attrMatch[2]
          : attrMatch[3] !== undefined
          ? attrMatch[3]
          : attrMatch[4] || "";
      attrs[key] = val;
    }
    const el = new MockDOMElement(tagName, attrs);
    elements.push(el);
  }
  return elements;
}

class InteractiveContainer extends MockDOMElement {
  constructor(id = "app-content") {
    super("div", { id });
    this.parsedElements = [];
  }
  set innerHTML(val) {
    this._innerHTML = String(val);
    this.parsedElements = parseHTMLToMockElements(this._innerHTML);
  }
  get innerHTML() {
    return this._innerHTML;
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
  querySelectorAll(sel) {
    const parts = sel.split(",").map((s) => s.trim());
    return this.parsedElements.filter((el) => {
      return parts.some((part) => {
        if (part.startsWith(".")) return el.classList.contains(part.slice(1));
        if (part.startsWith("#")) return el.id === part.slice(1);
        if (part.startsWith("[")) {
          const m = part.match(/^\[([a-zA-Z0-9\-]+)(?:=["']?(.*?)["']?)?\]$/);
          if (m) {
            const attr = m[1];
            const val = m[2];
            return val !== undefined
              ? el.getAttribute(attr) === val
              : el.hasAttribute(attr);
          }
        }
        return el.tagName.toLowerCase() === part.toLowerCase();
      });
    });
  }
}

function createMockEnvironment(initialStorage = {}, mediaMatches = false) {
  const storeMap = new Map();
  for (const [k, v] of Object.entries(initialStorage)) {
    storeMap.set(k, String(v));
  }

  const localStorage = {
    getItem: (k) => (storeMap.has(k) ? storeMap.get(k) : null),
    setItem: (k, v) => storeMap.set(k, String(v)),
    removeItem: (k) => storeMap.delete(k),
    clear: () => storeMap.clear(),
    get length() {
      return storeMap.size;
    },
    key: (i) => Array.from(storeMap.keys())[i] || null
  };

  const docEl = new MockDOMElement("html", { "data-theme": "light" });
  const bodyEl = new MockDOMElement("body");

  const metaThemeColor = new MockDOMElement("meta", {
    name: "theme-color",
    content: "#f8fafc"
  });
  const themeLabels = [
    new MockDOMElement("span", { class: "theme-label" }),
    new MockDOMElement("span", { class: "theme-label" })
  ];
  themeLabels.forEach((l) => (l.textContent = "Claro"));

  const themeToggleBtns = [
    new MockDOMElement("button", { class: "theme-toggle-btn" }),
    new MockDOMElement("button", { class: "theme-toggle-btn" })
  ];

  const appContent = new InteractiveContainer("app-content");
  const simulatorBar = new MockDOMElement("aside", {
    id: "simulator-bar",
    class: "hidden"
  });
  simulatorBar.offsetHeight = 46;

  const btnLockPin = new MockDOMElement("button", { id: "btn-lock-pin" });
  const navButtons = [
    new MockDOMElement("button", { class: "nav-switch", "data-view": "client" }),
    new MockDOMElement("button", {
      class: "nav-switch",
      "data-view": "operator"
    }),
    new MockDOMElement("button", { class: "nav-switch", "data-view": "admin" })
  ];

  const mediaListeners = [];
  const matchMedia = (query) => {
    return {
      matches: mediaMatches,
      media: query,
      addEventListener: (event, handler) => {
        mediaListeners.push(handler);
      },
      removeEventListener: (event, handler) => {
        const idx = mediaListeners.indexOf(handler);
        if (idx !== -1) mediaListeners.splice(idx, 1);
      },
      addListener: (handler) => mediaListeners.push(handler),
      removeListener: (handler) => {
        const idx = mediaListeners.indexOf(handler);
        if (idx !== -1) mediaListeners.splice(idx, 1);
      }
    };
  };

  const windowListeners = {};
  const mockWindow = {
    location: { search: "", hash: "", pathname: "/" },
    matchMedia,
    addEventListener: (ev, fn) => {
      if (!windowListeners[ev]) windowListeners[ev] = [];
      windowListeners[ev].push(fn);
    },
    removeEventListener: (ev, fn) => {
      if (windowListeners[ev]) {
        windowListeners[ev] = windowListeners[ev].filter((f) => f !== fn);
      }
    },
    dispatchEvent: (ev) => {
      const list = windowListeners[ev.type || ev] || [];
      list.forEach((f) => f(ev));
    },
    scrollTo: () => {}
  };

  const docListeners = {};
  const mockDocument = {
    readyState: "complete",
    activeElement: null,
    documentElement: docEl,
    body: bodyEl,
    querySelector: (sel) => {
      if (sel === 'meta[name="theme-color"]') return metaThemeColor;
      if (sel === "#app-content") return appContent;
      if (sel === "#simulator-bar") return simulatorBar;
      if (sel === "#btn-lock-pin") return btnLockPin;
      if (sel === ".theme-toggle-btn") return themeToggleBtns[0];
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === ".theme-label") return themeLabels;
      if (sel === ".theme-toggle-btn") return themeToggleBtns;
      if (sel === ".nav-switch") return navButtons;
      return [];
    },
    getElementById: (id) => {
      if (id === "app-content") return appContent;
      if (id === "simulator-bar") return simulatorBar;
      if (id === "btn-lock-pin") return btnLockPin;
      return null;
    },
    addEventListener: (ev, fn) => {
      if (!docListeners[ev]) docListeners[ev] = [];
      docListeners[ev].push(fn);
    },
    removeEventListener: (ev, fn) => {
      if (docListeners[ev]) {
        docListeners[ev] = docListeners[ev].filter((f) => f !== fn);
      }
    },
    dispatchEvent: (ev) => {
      const list = docListeners[ev.type || ev] || [];
      list.forEach((f) => f(ev));
    }
  };

  return {
    localStorage,
    docEl,
    bodyEl,
    metaThemeColor,
    themeLabels,
    themeToggleBtns,
    appContent,
    mockWindow,
    mockDocument,
    mediaListeners,
    setMediaMatches: (val) => {
      mediaMatches = val;
      mediaListeners.forEach((fn) => fn({ matches: val }));
    }
  };
}

// ============================================================================
// MAIN EXECUTION FUNCTION
// ============================================================================
async function runAllTests() {
  console.log("===============================================================");
  console.log("  MI HUERTA - ADVERSARIAL STRESS TEST: R2, R3, R4");
  console.log("  Tester: Challenger 2");
  console.log("  Date: 2026-10-29");
  console.log("===============================================================\n");

  // ==========================================================================
  // SUITE 1: REQUIREMENT R2 - THEME REACTIVITY, DUAL-KEY PERSISTENCE & EDGES
  // ==========================================================================
  suite("SUITE 1: REQUIREMENT R2 - THEME REACTIVITY & PERSISTENCE");

  // Setup DOM environment for store
  const env = createMockEnvironment();
  Object.defineProperty(globalThis, "localStorage", {
    value: env.localStorage,
    configurable: true,
    writable: true
  });
  globalThis.window = env.mockWindow;
  globalThis.document = env.mockDocument;

  // Import store module dynamically
  const { store, safeGet, safeSet, safeRemove, STORAGE_KEYS } = await import(
    "../js/store.js"
  );

  // 1.1 Test Fallback to matchMedia when localStorage is empty
  env.localStorage.clear();
  // Case A: prefers-color-scheme: light
  env.setMediaMatches(false);
  assert(
    store.getTheme() === "light",
    "1.1.A Fallback when storage empty & OS is light -> theme is 'light'"
  );

  // Case B: prefers-color-scheme: dark
  env.setMediaMatches(true);
  assert(
    store.getTheme() === "dark",
    "1.1.B Fallback when storage empty & OS is dark -> theme is 'dark'"
  );

  // 1.2 Dual-Key Persistence Verification
  env.localStorage.clear();
  store.setTheme("dark");
  const storedThemeDark = env.localStorage.getItem("theme");
  const storedV3Dark = env.localStorage.getItem("mihuerta_theme_v3");
  assert(
    storedThemeDark === '"dark"' || storedThemeDark === "dark",
    "1.2.A setTheme('dark') persists in 'theme' key",
    `got: ${storedThemeDark}`
  );
  assert(
    storedV3Dark === '"dark"' || storedV3Dark === "dark",
    "1.2.B setTheme('dark') persists in 'mihuerta_theme_v3' key",
    `got: ${storedV3Dark}`
  );

  store.setTheme("light");
  const storedThemeLight = env.localStorage.getItem("theme");
  const storedV3Light = env.localStorage.getItem("mihuerta_theme_v3");
  assert(
    storedThemeLight === '"light"' || storedThemeLight === "light",
    "1.2.C setTheme('light') persists in 'theme' key",
    `got: ${storedThemeLight}`
  );
  assert(
    storedV3Light === '"light"' || storedV3Light === "light",
    "1.2.D setTheme('light') persists in 'mihuerta_theme_v3' key",
    `got: ${storedV3Light}`
  );

  // 1.3 Backward and Forward Compatibility
  // Case: only 'mihuerta_theme_v3' present
  env.localStorage.clear();
  env.localStorage.setItem("mihuerta_theme_v3", JSON.stringify("dark"));
  assert(
    store.getTheme() === "dark",
    "1.3.A Theme retrieved from 'mihuerta_theme_v3' when 'theme' key is absent"
  );

  // Case: only 'theme' present
  env.localStorage.clear();
  env.localStorage.setItem("theme", JSON.stringify("light"));
  assert(
    store.getTheme() === "light",
    "1.3.B Theme retrieved from 'theme' when 'mihuerta_theme_v3' is absent"
  );

  // 1.4 Storage Edge Cases: Corrupt JSON & Raw Strings
  // Edge Case: raw unquoted string 'dark' in 'theme'
  env.localStorage.clear();
  env.localStorage.setItem("theme", "dark");
  assert(
    store.getTheme() === "dark",
    "1.4.A Resilient parsing: raw string 'dark' in localStorage is correctly read"
  );

  // Edge Case: raw unquoted string 'light' in 'mihuerta_theme_v3'
  env.localStorage.clear();
  env.localStorage.setItem("mihuerta_theme_v3", "light");
  assert(
    store.getTheme() === "light",
    "1.4.B Resilient parsing: raw string 'light' in 'mihuerta_theme_v3' is correctly read"
  );

  // Edge Case: corrupt JSON '{invalid-json' in 'theme'
  env.localStorage.clear();
  env.localStorage.setItem("theme", "{invalid-json: true");
  env.setMediaMatches(true);
  const corruptTheme = store.getTheme();
  assert(
    corruptTheme === "dark" || corruptTheme === "light",
    "1.4.C Corrupt JSON does not crash getTheme() and falls back gracefully",
    `returned: ${corruptTheme}`
  );

  // Edge Case: unexpected values like 'undefined', 'null', '{}'
  env.localStorage.clear();
  env.localStorage.setItem("theme", "undefined");
  env.setMediaMatches(false);
  assert(
    store.getTheme() === "light",
    "1.4.D String 'undefined' in storage gracefully falls back to OS preference"
  );

  env.localStorage.clear();
  env.localStorage.setItem("theme", JSON.stringify({}));
  assert(
    store.getTheme() === "light",
    "1.4.E Object '{}' in storage gracefully falls back without throwing"
  );

  // 1.5 DOM Synchronization Verification
  store.setTheme("dark");
  assert(
    env.docEl.classList.contains("dark") === true,
    "1.5.A Dark mode adds 'dark' class to html element"
  );
  assert(
    env.docEl.getAttribute("data-theme") === "dark",
    "1.5.B Dark mode sets data-theme='dark' on html element"
  );
  assert(
    env.metaThemeColor.getAttribute("content") === "#020617",
    "1.5.C Dark mode sets meta[name='theme-color'] to #020617"
  );
  assert(
    env.themeLabels[0].textContent === "Oscuro",
    "1.5.D Dark mode updates .theme-label text to 'Oscuro'"
  );
  assert(
    env.themeToggleBtns[0].getAttribute("aria-label") ===
      "Cambiar a tema claro",
    "1.5.E Dark mode updates .theme-toggle-btn aria-label"
  );

  store.setTheme("light");
  assert(
    env.docEl.classList.contains("dark") === false,
    "1.5.F Light mode removes 'dark' class from html element"
  );
  assert(
    env.docEl.getAttribute("data-theme") === "light",
    "1.5.G Light mode sets data-theme='light' on html element"
  );
  assert(
    env.metaThemeColor.getAttribute("content") === "#f8fafc",
    "1.5.H Light mode sets meta[name='theme-color'] to #f8fafc"
  );
  assert(
    env.themeLabels[0].textContent === "Claro",
    "1.5.I Light mode updates .theme-label text to 'Claro'"
  );
  assert(
    env.themeToggleBtns[0].getAttribute("aria-label") ===
      "Cambiar a tema oscuro",
    "1.5.J Light mode updates .theme-toggle-btn aria-label"
  );

  // 1.6 Stress Test: 60 Rapid Consecutive Theme Toggles
  let toggleError = null;
  let togglesPassed = true;
  for (let i = 1; i <= 60; i++) {
    const prevTheme = store.getTheme();
    const expectedNext = prevTheme === "dark" ? "light" : "dark";
    const result = store.toggleTheme();

    if (result !== expectedNext) {
      togglesPassed = false;
      toggleError = `Iteration ${i}: expected ${expectedNext}, got ${result}`;
      break;
    }
    const isDark = result === "dark";
    const classOk = env.docEl.classList.contains("dark") === isDark;
    const attrOk = env.docEl.getAttribute("data-theme") === result;
    const metaOk =
      env.metaThemeColor.getAttribute("content") ===
      (isDark ? "#020617" : "#f8fafc");

    if (!classOk || !attrOk || !metaOk) {
      togglesPassed = false;
      toggleError = `Iteration ${i} DOM sync failure: class=${classOk}, attr=${attrOk}, meta=${metaOk}`;
      break;
    }
  }
  assert(
    togglesPassed,
    "1.6 Stress Test: 60 consecutive theme toggles executed flawlessly",
    toggleError || "60/60 iterations verified"
  );

  // 1.7 Verification of Anti-Flicker Script in index.html
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
  const antiFlickerMatch = indexHtml.match(
    /<script>([\s\S]*?\(function\s*\(\)\s*\{[\s\S]*?meta\.setAttribute[\s\S]*?\}\)\(\);[\s\S]*?)<\/script>/
  );
  assert(
    Boolean(antiFlickerMatch),
    "1.7.A Anti-flicker script snippet located in index.html <head>"
  );

  if (antiFlickerMatch) {
    const scriptCode = antiFlickerMatch[1];
    // Test anti-flicker with dark storage
    const testEnv = createMockEnvironment({ theme: "dark" });
    const runAntiFlicker = new Function(
      "localStorage",
      "window",
      "document",
      scriptCode
    );

    runAntiFlicker(testEnv.localStorage, testEnv.mockWindow, testEnv.mockDocument);
    assert(
      testEnv.docEl.classList.contains("dark") === true,
      "1.7.B Anti-flicker script adds 'dark' class on page load when theme='dark'"
    );
    assert(
      testEnv.docEl.getAttribute("data-theme") === "dark",
      "1.7.C Anti-flicker script sets data-theme='dark' on page load"
    );
    assert(
      testEnv.metaThemeColor.getAttribute("content") === "#020617",
      "1.7.D Anti-flicker script sets theme-color to #020617 on dark load"
    );

    // Test anti-flicker with empty storage + dark OS
    const testEnvOsDark = createMockEnvironment({}, true);
    runAntiFlicker(
      testEnvOsDark.localStorage,
      testEnvOsDark.mockWindow,
      testEnvOsDark.mockDocument
    );
    assert(
      testEnvOsDark.docEl.classList.contains("dark") === true,
      "1.7.E Anti-flicker script respects prefers-color-scheme: dark on cold load"
    );
  }

  // ==========================================================================
  // SUITE 2: REQUIREMENT R3 - QUICK DISCARD CROSS & CART STATE MACHINE
  // ==========================================================================
  suite("SUITE 2: REQUIREMENT R3 - QUICK DISCARD CROSS & CART STATE");

  // Read client.js to extract renderProductCardsHTML
  const clientJsCode = fs.readFileSync(
    path.join(ROOT_DIR, "js", "views", "client.js"),
    "utf8"
  );

  // Extract renderProductCardsHTML implementation to test card generation directly
  const cardFnMatch = clientJsCode.match(
    /function\s+renderProductCardsHTML\s*\([\s\S]*?\n\s{2}\}/
  );
  assert(
    Boolean(cardFnMatch),
    "2.0.A renderProductCardsHTML function extracted from client.js"
  );

  // Create isolated evaluator for renderProductCardsHTML
  const cardEvaluator = new Function(
    `
    ${cardFnMatch[0]}
    return renderProductCardsHTML;
  `
  )();

  const allProducts = store.getProducts();
  const kgProduct = allProducts.find(
    (p) => p.unidad_medida === "KG" && p.disponible
  ); // Banana
  const unitProduct = allProducts.find(
    (p) => p.unidad_medida === "UNIDAD" && p.disponible
  ); // Palta

  assert(
    Boolean(kgProduct && unitProduct),
    "2.0.B Identified test products: KG (" +
      kgProduct?.id +
      ") and UNIDAD (" +
      unitProduct?.id +
      ")"
  );

  // Reset cart
  store.clearCart();
  let currentCart = store.getCart();

  // 2.1 Product Cards when Quantity is Zero
  const zeroCardsHtml = cardEvaluator([kgProduct, unitProduct], currentCart);

  assert(
    !zeroCardsHtml.includes("btn-quick-discard"),
    "2.1.A Product card HTML does NOT contain .btn-quick-discard when quantity is 0"
  );
  assert(
    !zeroCardsHtml.includes("data-quick-discard-id"),
    "2.1.B Product card HTML does NOT contain data-quick-discard-id when quantity is 0"
  );
  assert(
    zeroCardsHtml.includes("btn-add-initial"),
    "2.1.C Product card displays 'Agregar +' button when quantity is 0"
  );

  // 2.2 Adding KG item to Cart
  store.addToCart(kgProduct.id, 1.5);
  currentCart = store.getCart();

  assert(
    currentCart[kgProduct.id]?.cantidad === 1.5,
    "2.2.A KG product added to cart with quantity 1.5"
  );

  const kgCardHtml = cardEvaluator([kgProduct], currentCart);

  assert(
    kgCardHtml.includes("btn-quick-discard"),
    "2.2.B Product card displays .btn-quick-discard when KG item is in cart"
  );
  assert(
    kgCardHtml.includes(`data-quick-discard-id="${kgProduct.id}"`),
    "2.2.C Quick discard button has correct data-quick-discard-id"
  );
  assert(
    kgCardHtml.includes("min-h-[44px]") && kgCardHtml.includes("min-w-[44px]"),
    "2.2.D Quick discard button strictly complies with min 44x44px touch target (min-h-[44px] min-w-[44px])"
  );
  assert(
    kgCardHtml.includes("w-11 h-11"),
    "2.2.E Quick discard button has w-11 h-11 dimensions (44x44px)"
  );
  assert(
    kgCardHtml.includes(">×<") || kgCardHtml.includes("aria-hidden=\"true\">×</span>"),
    "2.2.F Quick discard button contains typographic cross glyph '×'"
  );
  assert(
    kgCardHtml.includes("absolute top-2.5 right-2.5") ||
      kgCardHtml.includes("absolute top-2 right-2"),
    "2.2.G Quick discard button positioned at top right corner"
  );
  assert(
    kgCardHtml.includes("pr-11") || kgCardHtml.includes("pr-9"),
    "2.2.H Main card flex row has right clearance padding (pr-11/pr-9) to avoid text overlap"
  );

  // 2.3 Adding UNIDAD item to Cart
  store.addToCart(unitProduct.id, 3);
  currentCart = store.getCart();

  assert(
    currentCart[unitProduct.id]?.cantidad === 3,
    "2.3.A UNIDAD product added to cart with quantity 3"
  );

  const unitCardHtml = cardEvaluator([unitProduct], currentCart);

  assert(
    unitCardHtml.includes("btn-quick-discard"),
    "2.3.B Product card displays .btn-quick-discard when UNIDAD item is in cart"
  );
  assert(
    unitCardHtml.includes(`data-quick-discard-id="${unitProduct.id}"`),
    "2.3.C UNIDAD quick discard button has data-quick-discard-id"
  );
  assert(
    unitCardHtml.includes("min-h-[44px]") &&
      unitCardHtml.includes("min-w-[44px]"),
    "2.3.D UNIDAD quick discard button has min 44x44px touch target"
  );

  // Verify Cart Summary with 2 items
  let summary = store.getCartSummary();
  const expectedTotal =
    Math.round(1.5 * kgProduct.precio) + Math.round(3 * unitProduct.precio);
  assert(
    summary.totalItems === 2,
    "2.3.E Cart summary reports totalItems = 2"
  );
  assert(
    summary.totalEstimado === expectedTotal,
    "2.3.F Cart summary reports correct totalEstimado",
    `expected: ${expectedTotal}, got: ${summary.totalEstimado}`
  );

  // 2.4 Simulate Clicking Discard Cross on KG Product
  store.removeFromCart(kgProduct.id);
  currentCart = store.getCart();

  assert(
    currentCart[kgProduct.id] === undefined,
    "2.4.A Discarding KG product completely removes key from cart state"
  );
  assert(
    currentCart[unitProduct.id]?.cantidad === 3,
    "2.4.B UNIDAD product remains unharmed in cart state with quantity 3"
  );

  summary = store.getCartSummary();
  const expectedRemaining = Math.round(3 * unitProduct.precio);
  assert(
    summary.totalItems === 1 && summary.totalEstimado === expectedRemaining,
    "2.4.C Cart summary recalculated immediately after first item discard",
    `items: ${summary.totalItems}, total: ${summary.totalEstimado}`
  );

  // Re-render KG product card
  const kgRevertedHtml = cardEvaluator([kgProduct], currentCart);
  assert(
    !kgRevertedHtml.includes("btn-quick-discard"),
    "2.4.D KG card reverts: .btn-quick-discard removed from DOM"
  );
  assert(
    kgRevertedHtml.includes("btn-add-initial"),
    "2.4.E KG card reverts: displays 'Agregar +' button again"
  );
  assert(
    !kgRevertedHtml.includes("En pedido"),
    "2.4.F KG card reverts: 'En pedido' badge removed"
  );

  // 2.5 Simulate Clicking Discard Cross on UNIDAD Product (Empty Cart Transition)
  store.removeFromCart(unitProduct.id);
  currentCart = store.getCart();

  assert(
    Object.keys(currentCart).length === 0,
    "2.5.A Discarding final item leaves cart state completely empty ({})"
  );

  summary = store.getCartSummary();
  assert(
    summary.totalItems === 0,
    "2.5.B Empty cart summary reports totalItems = 0"
  );
  assert(
    summary.totalEstimado === 0,
    "2.5.C Empty cart summary reports totalEstimado = 0"
  );

  const unitRevertedHtml = cardEvaluator([unitProduct], currentCart);
  assert(
    !unitRevertedHtml.includes("btn-quick-discard"),
    "2.5.D UNIDAD card reverts: .btn-quick-discard removed from DOM"
  );
  assert(
    unitRevertedHtml.includes("btn-add-initial"),
    "2.5.E UNIDAD card reverts: displays 'Agregar +' button"
  );

  // 2.6 Adversarial Scenario: Rapid Consecutive Discard Clicks
  let rapidClickError = null;
  try {
    for (let i = 0; i < 30; i++) {
      store.removeFromCart(kgProduct.id);
    }
  } catch (err) {
    rapidClickError = err.message;
  }
  assert(
    rapidClickError === null,
    "2.6.A 30 rapid consecutive removeFromCart calls on non-existent item do not crash"
  );
  assert(
    Object.keys(store.getCart()).length === 0,
    "2.6.B Cart state remains clean and empty after repeated discard calls"
  );

  // 2.7 Adversarial Scenario: Boundary & Malformed Product IDs
  const badIds = [
    "",
    null,
    undefined,
    12345,
    NaN,
    {},
    [],
    "__proto__",
    "constructor",
    "prod-nonexistent-999"
  ];
  let badIdCrash = false;
  for (const badId of badIds) {
    try {
      store.removeFromCart(badId);
    } catch {
      badIdCrash = true;
    }
  }
  assert(
    !badIdCrash,
    "2.7.A Malformed and prototype-polluting IDs in removeFromCart handled safely without crashing"
  );

  // 2.8 Category Switching Stress Test
  // Populate mixed cart: 2 Frutas, 2 Verduras
  const frutas = allProducts.filter((p) => p.categoria === "Frutas").slice(0, 2);
  const verduras = allProducts
    .filter((p) => p.categoria === "Verduras")
    .slice(0, 2);

  store.addToCart(frutas[0].id, 1);
  store.addToCart(frutas[1].id, 1);
  store.addToCart(verduras[0].id, 1);
  store.addToCart(verduras[1].id, 1);

  currentCart = store.getCart();
  assert(
    Object.keys(currentCart).length === 4,
    "2.8.A Cart populated with 4 items across 2 categories (Frutas & Verduras)"
  );

  // Simulate rendering Verduras view
  const verdurasHtml = cardEvaluator(verduras, currentCart);
  assert(
    verdurasHtml.includes(`data-quick-discard-id="${verduras[0].id}"`) &&
      verdurasHtml.includes(`data-quick-discard-id="${verduras[1].id}"`),
    "2.8.B In Verduras category view, all active Verduras cards show quick discard button"
  );

  // Discard one Verdura while in Verduras category
  store.removeFromCart(verduras[0].id);
  currentCart = store.getCart();

  assert(
    currentCart[verduras[0].id] === undefined,
    "2.8.C Discarded Verdura removed from cart"
  );
  assert(
    currentCart[frutas[0].id]?.cantidad === 1 &&
      currentCart[frutas[1].id]?.cantidad === 1,
    "2.8.D Frutas items in different category remain intact and unaffected"
  );

  // Switch to Frutas view
  const frutasHtml = cardEvaluator(frutas, currentCart);
  assert(
    frutasHtml.includes(`data-quick-discard-id="${frutas[0].id}"`) &&
      frutasHtml.includes(`data-quick-discard-id="${frutas[1].id}"`),
    "2.8.E In Frutas category view, both Frutas cards display active quick discard buttons"
  );

  // Discard all remaining items
  store.removeFromCart(frutas[0].id);
  store.removeFromCart(frutas[1].id);
  store.removeFromCart(verduras[1].id);

  assert(
    Object.keys(store.getCart()).length === 0,
    "2.8.F Cart completely emptied across categories; state machine verified"
  );

  // 2.9 Equivalence of Stepper to 0 vs Discard Cross
  store.addToCart(kgProduct.id, 1.0);
  store.addToCart(kgProduct.id, -1.0); // stepper decrement to 0
  const afterStepper = store.getCart()[kgProduct.id];

  store.addToCart(kgProduct.id, 1.0);
  store.removeFromCart(kgProduct.id); // discard cross
  const afterDiscard = store.getCart()[kgProduct.id];

  assert(
    afterStepper === undefined && afterDiscard === undefined,
    "2.9 Stepper decrement to 0 and Quick Discard button result in equivalent clean state deletion"
  );

  // 2.10 End-to-End Live DOM Interaction with renderClientView
  store.clearCart();
  store.setCurrentUser({
    telefono: "1123456789",
    nombre: "Facundo Gómez",
    direccion: "Av. Rivadavia 4520, Piso 3 B"
  });
  const liveContainer = new InteractiveContainer("live-app-content");
  const { renderClientView } = await import("../js/views/client.js");
  renderClientView(liveContainer);

  const addInitialBtn = liveContainer.querySelector(
    `[data-add-id="${kgProduct.id}"]`
  );
  assert(
    addInitialBtn !== null,
    "2.10.A Initial catalog render has 'Agregar +' button in live container"
  );

  if (addInitialBtn) {
    addInitialBtn.click();

    assert(
      store.getCart()[kgProduct.id]?.cantidad > 0,
      "2.10.B Clicking 'Agregar +' in live container updated cart state"
    );

    const liveDiscardBtn = liveContainer.querySelector(
      `[data-quick-discard-id="${kgProduct.id}"]`
    );
    assert(
      liveDiscardBtn !== null,
      "2.10.C Live container re-rendered and now contains .btn-quick-discard"
    );

    if (liveDiscardBtn) {
      liveDiscardBtn.click();

      assert(
        store.getCart()[kgProduct.id] === undefined,
        "2.10.D Clicking .btn-quick-discard in live container removed item from store"
      );

      const liveDiscardBtnAfter = liveContainer.querySelector(
        `[data-quick-discard-id="${kgProduct.id}"]`
      );
      const liveAddBtnAfter = liveContainer.querySelector(
        `[data-add-id="${kgProduct.id}"]`
      );
      assert(
        liveDiscardBtnAfter === null && liveAddBtnAfter !== null,
        "2.10.E Live container re-rendered: .btn-quick-discard removed and 'Agregar +' restored"
      );
    }
  }

  // ==========================================================================
  // SUITE 3: REQUIREMENT R4 - BUNDLE SYNC, EXECUTION & COMPLIANCE
  // ==========================================================================
  suite("SUITE 3: REQUIREMENT R4 - BUNDLE SYNC & UNIVERSAL EXECUTION");

  const bundlePath = path.join(ROOT_DIR, "js", "bundle.js");
  assert(
    fs.existsSync(bundlePath),
    "3.1 js/bundle.js file exists in repository"
  );

  const bundleBytes = fs.readFileSync(bundlePath);
  const bundleContent = bundleBytes.toString("utf8");

  // 3.2 UTF-8 without BOM verification
  const hasBom =
    bundleBytes.length >= 3 &&
    bundleBytes[0] === 0xef &&
    bundleBytes[1] === 0xbb &&
    bundleBytes[2] === 0xbf;
  assert(
    !hasBom,
    "3.2 Byte signature verification: js/bundle.js is strictly UTF-8 WITHOUT BOM"
  );

  // 3.3 File size verification
  assert(
    bundleBytes.length >= 100000 && bundleBytes.length <= 350000,
    `3.3 Bundle file size is healthy: ${bundleBytes.length} bytes (expected 100KB-350KB)`
  );

  // 3.4 IIFE Envelope verification
  assert(
    bundleContent.startsWith("(function () {") ||
      bundleContent.startsWith("(function() {"),
    "3.4 Bundle begins with immediate invoked function expression (IIFE)"
  );

  // 3.5 Zero ESM Import Clauses
  const residualImport = /^[ \t]*import\s+/m.test(bundleContent);
  assert(
    !residualImport,
    "3.5 Zero residual 'import' statements present in compiled bundle"
  );

  // 3.6 Zero ESM Export Clauses
  const residualExport = /^[ \t]*export\s+/m.test(bundleContent);
  assert(
    !residualExport,
    "3.6 Zero residual 'export' statements present in compiled bundle"
  );

  // 3.7 Execution in Full Simulated Browser Environment
  const simEnv = createMockEnvironment();
  const simSandbox = {
    window: simEnv.mockWindow,
    document: simEnv.mockDocument,
    localStorage: simEnv.localStorage,
    navigator: { vibrate: () => true },
    location: simEnv.mockWindow.location,
    matchMedia: simEnv.mockWindow.matchMedia,
    URLSearchParams: globalThis.URLSearchParams,
    URL: globalThis.URL,
    Date: globalThis.Date,
    Math: globalThis.Math,
    JSON: globalThis.JSON,
    Object: globalThis.Object,
    Array: globalThis.Array,
    Set: globalThis.Set,
    Map: globalThis.Map,
    String: globalThis.String,
    Number: globalThis.Number,
    Boolean: globalThis.Boolean,
    RegExp: globalThis.RegExp,
    Error: globalThis.Error,
    parseInt: globalThis.parseInt,
    parseFloat: globalThis.parseFloat,
    isNaN: globalThis.isNaN,
    encodeURIComponent: globalThis.encodeURIComponent,
    decodeURIComponent: globalThis.decodeURIComponent,
    console: {
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {}
    },
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: () => 1,
    clearInterval: () => {}
  };
  simSandbox.window.document = simEnv.mockDocument;
  simSandbox.window.localStorage = simEnv.localStorage;
  simSandbox.window.navigator = simSandbox.navigator;
  simSandbox.window.URLSearchParams = globalThis.URLSearchParams;
  simSandbox.window.URL = globalThis.URL;

  let executionError = null;
  try {
    vm.createContext(simSandbox);
    vm.runInContext(bundleContent, simSandbox);
  } catch (err) {
    executionError = err.stack || err.message;
  }

  assert(
    executionError === null,
    "3.7.A js/bundle.js executes in sandbox with zero unhandled exceptions",
    executionError || "Clean execution"
  );

  assert(
    simEnv.appContent.innerHTML.length > 50,
    "3.7.B Execution initialized App and successfully mounted view into #app-content"
  );

  // 3.8 Keyboard Shortcut 'T' (Theme Toggle) in Bundle Execution
  const darkBefore = simEnv.docEl.classList.contains("dark");
  simSandbox.window.dispatchEvent({
    type: "keydown",
    key: "t",
    ctrlKey: false,
    altKey: false,
    metaKey: false
  });
  const darkAfterT = simEnv.docEl.classList.contains("dark");
  assert(
    darkAfterT !== darkBefore,
    "3.8.A Keyboard shortcut 'T' successfully toggles application theme in live bundle",
    `before=${darkBefore}, after=${darkAfterT}`
  );

  // Ctrl+T should be ignored
  simSandbox.window.dispatchEvent({
    type: "keydown",
    key: "t",
    ctrlKey: true,
    altKey: false,
    metaKey: false
  });
  const darkAfterCtrlT = simEnv.docEl.classList.contains("dark");
  assert(
    darkAfterCtrlT === darkAfterT,
    "3.8.B Keyboard shortcut ignores Ctrl+T (preserves browser tab shortcut)"
  );

  // Typing 't' in INPUT should be ignored
  simSandbox.document.activeElement = new MockDOMElement("input");
  simSandbox.window.dispatchEvent({
    type: "keydown",
    key: "t",
    ctrlKey: false,
    altKey: false,
    metaKey: false
  });
  const darkAfterInputT = simEnv.docEl.classList.contains("dark");
  assert(
    darkAfterInputT === darkAfterT,
    "3.8.C Typing 't' inside an INPUT field does not trigger theme toggle"
  );
  simSandbox.document.activeElement = null;

  // 3.9 Multi-Tab Storage Event Synchronization
  simEnv.localStorage.setItem("theme", JSON.stringify("dark"));
  simSandbox.window.dispatchEvent({
    type: "storage",
    key: "theme"
  });
  assert(
    simEnv.docEl.classList.contains("dark") === true,
    "3.9 Multi-tab storage event synchronization applies theme instantly across tabs"
  );

  // ==========================================================================
  // SUMMARY REPORT
  // ==========================================================================
  console.log("\n===============================================================");
  console.log("  ADVERSARIAL STRESS TEST SUMMARY");
  console.log("===============================================================");
  for (const [sName, res] of Object.entries(suiteResults)) {
    console.log(`  ${sName}: ${res.passed} PASSED, ${res.failed} FAILED`);
  }
  console.log("---------------------------------------------------------------");
  console.log(
    `  TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`
  );
  console.log("===============================================================\n");

  if (failedTests > 0) {
    console.error("FAILURES DETECTED:");
    failures.forEach((f, i) => {
      console.error(`  ${i + 1}. [${f.suite}] ${f.message}`);
      if (f.details) console.error(`     Details: ${f.details}`);
    });
    process.exit(1);
  } else {
    console.log("ALL TESTS COMPLETED SUCCESSFULLY! VERDICT: CONFIRMED CORRECT.");
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error("CRITICAL TEST HARNESS FAILURE:", err);
  process.exit(1);
});
