// ==============================================================================
// Nexo Pedidos - Resolución de configuración pública y aislamiento de demo
// ------------------------------------------------------------------------------
// - La configuración pública se declara en js/public-config.js como
//   window.NEXO_PUBLIC_CONFIG (archivo separado, NO incluido en el bundle).
// - Sin configuración => modo demo explícito con datos sintéticos.
// - Producción exige configuración completa y válida; si falta algo, falla
//   claramente (sin fallback productivo ni éxito local simulado).
// - Nunca se leen claves heredadas (mihuerta_*) ni secretos de servidor.
// ==============================================================================

const NEXO_STORAGE_VERSION = "v1";
const NEXO_THEME_KEY = "nexo_theme_v1";
const NEXO_SUPABASE_LIBRARY_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

const DEMO_BUSINESS = Object.freeze({
  name: "Comercio Demo Nexo",
  alias: "alias.demo.nexo",
  whatsapp: "5491100000000",
  whatsappDisplay: "+54 11 0000-0000 (demo)"
});

// Nombres de campos que jamás deben aparecer en la configuración pública.
const FORBIDDEN_CONFIG_FIELDS = [
  "servicerole",
  "servicerolekey",
  "service_role",
  "service_role_key",
  "supabaseservicerolekey",
  "secret",
  "secretkey",
  "jwtsecret",
  "password",
  "dbpassword",
  "databaseurl"
];

function cleanText(value, maxLen = 80) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, maxLen);
}

function findForbiddenFields(obj, path = "", depth = 0, found = []) {
  if (!obj || typeof obj !== "object" || depth > 4) return found;
  Object.keys(obj).forEach((key) => {
    const normalized = key.toLowerCase().replace(/[-\s]/g, "");
    const fullPath = path ? `${path}.${key}` : key;
    if (FORBIDDEN_CONFIG_FIELDS.includes(normalized)) {
      found.push(fullPath);
    }
    findForbiddenFields(obj[key], fullPath, depth + 1, found);
  });
  return found;
}

function decodeJwtRole(token) {
  try {
    const parts = String(token).split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    let json;
    if (typeof atob === "function") {
      json = atob(padded);
    } else if (typeof Buffer !== "undefined") {
      json = Buffer.from(padded, "base64").toString("utf8");
    } else {
      return null;
    }
    const payload = JSON.parse(json);
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function resolveBusiness(rawBusiness, fallback) {
  const b = rawBusiness && typeof rawBusiness === "object" ? rawBusiness : {};
  const whatsapp = cleanText(b.whatsapp, 20).replace(/\D/g, "");
  return {
    name: cleanText(b.name) || (fallback ? fallback.name : ""),
    alias: cleanText(b.alias, 60) || (fallback ? fallback.alias : ""),
    whatsapp: whatsapp || (fallback ? fallback.whatsapp : ""),
    whatsappDisplay: cleanText(b.whatsappDisplay, 40) || (fallback ? fallback.whatsappDisplay : whatsapp)
  };
}

function buildStorageKeys(mode) {
  const prefix = `nexo_${mode === "production" ? "prod" : "demo"}_${NEXO_STORAGE_VERSION}_`;
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
    THEME: NEXO_THEME_KEY
  };
}

/**
 * Resuelve la configuración pública. Función pura: no toca red ni almacenamiento.
 * @param {unknown} raw - normalmente window.NEXO_PUBLIC_CONFIG
 */
function resolveNexoConfig(raw) {
  // Sin configuración: demo explícita.
  if (raw === undefined || raw === null) {
    return {
      mode: "demo",
      ok: true,
      errors: [],
      warnings: [],
      business: { ...DEMO_BUSINESS },
      supabaseUrl: "",
      supabaseAnonKey: "",
      storageKeys: buildStorageKeys("demo")
    };
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return {
      mode: "invalid",
      ok: false,
      errors: ["NEXO_PUBLIC_CONFIG debe ser un objeto."],
      warnings: [],
      business: resolveBusiness(null, null),
      supabaseUrl: "",
      supabaseAnonKey: "",
      storageKeys: buildStorageKeys("production")
    };
  }

  const mode = raw.mode === undefined ? "demo" : String(raw.mode);
  const forbidden = findForbiddenFields(raw);

  if (mode === "demo") {
    const warnings = [];
    if (raw.supabase) {
      warnings.push("Modo demo: la sección supabase se ignora; la demo nunca se conecta.");
    }
    if (forbidden.length > 0) {
      warnings.push(`Campos prohibidos ignorados: ${forbidden.join(", ")}`);
    }
    return {
      mode: "demo",
      ok: true,
      errors: [],
      warnings,
      business: resolveBusiness(raw.business, DEMO_BUSINESS),
      supabaseUrl: "",
      supabaseAnonKey: "",
      storageKeys: buildStorageKeys("demo")
    };
  }

  if (mode !== "production") {
    return {
      mode: "invalid",
      ok: false,
      errors: [`Modo desconocido "${cleanText(mode, 30)}". Valores válidos: "demo" o "production".`],
      warnings: [],
      business: resolveBusiness(raw.business, null),
      supabaseUrl: "",
      supabaseAnonKey: "",
      storageKeys: buildStorageKeys("production")
    };
  }

  // --- Producción: validación estricta, sin valores por defecto productivos ---
  const errors = [];
  const business = resolveBusiness(raw.business, null);
  const supa = raw.supabase && typeof raw.supabase === "object" ? raw.supabase : {};
  const supabaseUrl = typeof supa.url === "string" ? supa.url.trim() : "";
  const supabaseAnonKey = typeof supa.anonKey === "string" ? supa.anonKey.trim() : "";

  if (forbidden.length > 0) {
    errors.push(`La configuración pública contiene campos secretos prohibidos: ${forbidden.join(", ")}.`);
  }
  if (!business.name) {
    errors.push("Falta business.name (nombre del comercio).");
  }
  if (!supabaseUrl) {
    errors.push("Falta supabase.url.");
  } else {
    try {
      const parsed = new URL(supabaseUrl);
      if (parsed.protocol !== "https:" || !parsed.hostname) {
        errors.push("supabase.url debe ser una URL https válida.");
      }
    } catch {
      errors.push("supabase.url no es una URL válida.");
    }
  }
  if (!supabaseAnonKey) {
    errors.push("Falta supabase.anonKey (clave pública anon/publishable).");
  } else if (/^sb_secret_/i.test(supabaseAnonKey)) {
    errors.push("supabase.anonKey es una clave secreta; sólo se admite la clave pública.");
  } else {
    const role = decodeJwtRole(supabaseAnonKey);
    if (role && role !== "anon") {
      errors.push(`supabase.anonKey tiene rol "${cleanText(role, 30)}"; sólo se admite rol anon.`);
    }
  }

  return {
    mode: "production",
    ok: errors.length === 0,
    errors,
    warnings: [],
    business,
    supabaseUrl: errors.length === 0 ? supabaseUrl : "",
    supabaseAnonKey: errors.length === 0 ? supabaseAnonKey : "",
    storageKeys: buildStorageKeys("production")
  };
}

function readPublicConfigSource() {
  try {
    if (typeof globalThis !== "undefined" && "NEXO_PUBLIC_CONFIG" in globalThis) {
      return globalThis.NEXO_PUBLIC_CONFIG;
    }
  } catch {}
  return undefined;
}

/**
 * Bloquea las APIs de datos JS (fetch, WebSocket, EventSource, XHR, sendBeacon) y apertura de enlaces externos (window.open / wa.me) en modo demo.
 * Devuelve un registro de intentos bloqueados (útil para auditoría y pruebas).
 */
function installDemoNetworkGuard(win, onBlocked) {
  const blocked = [];
  if (!win || win.__NEXO_DEMO_GUARD__) return blocked;
  const record = (kind, target) => {
    const entry = { kind, target: String(target || ""), at: new Date().toISOString() };
    blocked.push(entry);
    try { if (typeof onBlocked === "function") onBlocked(entry); } catch {}
    return entry;
  };
  const define = (name, value) => {
    try {
      Object.defineProperty(win, name, { value, configurable: true, writable: true });
    } catch {
      try { win[name] = value; } catch {}
    }
  };

  define("fetch", function blockedFetch(input) {
    const target = input && typeof input === "object" && "url" in input ? input.url : input;
    record("fetch", target);
    return Promise.reject(new Error("Nexo demo: red deshabilitada (fetch bloqueado)."));
  });
  define("WebSocket", function BlockedWebSocket(url) {
    record("websocket", url);
    throw new Error("Nexo demo: red deshabilitada (WebSocket bloqueado).");
  });
  define("EventSource", function BlockedEventSource(url) {
    record("eventsource", url);
    throw new Error("Nexo demo: red deshabilitada (EventSource bloqueado).");
  });
  define("XMLHttpRequest", function BlockedXHR() {
    record("xhr", "");
    throw new Error("Nexo demo: red deshabilitada (XMLHttpRequest bloqueado).");
  });
  define("open", function blockedOpen(url) {
    record("window.open", url);
    return null;
  });
  try {
    if (win.navigator && typeof win.navigator.sendBeacon === "function") {
      Object.defineProperty(win.navigator, "sendBeacon", {
        value: (url) => { record("beacon", url); return false; },
        configurable: true
      });
    }
  } catch {}
  define("__NEXO_DEMO_GUARD__", { blocked });
  return blocked;
}

export { NEXO_STORAGE_VERSION, NEXO_THEME_KEY, NEXO_SUPABASE_LIBRARY_URL, DEMO_BUSINESS, resolveNexoConfig, readPublicConfigSource, installDemoNetworkGuard, buildStorageKeys };
