(function () {
  "use strict";


  // ==========================================

  // 1. CATALOGO DE PRODUCTOS

  // ==========================================

// Catálogo inicial de productos para la verdulería (sin emojis, enfocado en tipografía moderna)
const INITIAL_PRODUCTS = [
  // Frutas
  {
    id: "prod-1",
    nombre: "Banana Cavendish",
    categoria: "Frutas",
    unidad_medida: "KG",
    precio: 1800,
    disponible: true,
    paso: 0.5,
    detalle: "Ecuador Seleccionada"
  },
  {
    id: "prod-2",
    nombre: "Manzana Roja Elegida",
    categoria: "Frutas",
    unidad_medida: "KG",
    precio: 2200,
    disponible: true,
    paso: 0.5,
    detalle: "Alto Valle, Río Negro"
  },
  {
    id: "prod-3",
    nombre: "Naranja de Jugo",
    categoria: "Frutas",
    unidad_medida: "KG",
    precio: 1400,
    disponible: true,
    paso: 0.5,
    detalle: "San Pedro dulce y jugosa"
  },
  {
    id: "prod-4",
    nombre: "Limón Comercial",
    categoria: "Frutas",
    unidad_medida: "KG",
    precio: 1600,
    disponible: true,
    paso: 0.25,
    detalle: "Tucumano cuatro estaciones"
  },
  {
    id: "prod-5",
    nombre: "Frutilla Seleccionada",
    categoria: "Frutas",
    unidad_medida: "KG",
    precio: 4500,
    disponible: true,
    paso: 0.25,
    detalle: "Coronda madura y fresca"
  },
  {
    id: "prod-6",
    nombre: "Palta Hass Madura",
    categoria: "Frutas",
    unidad_medida: "UNIDAD",
    precio: 1200,
    disponible: true,
    paso: 1,
    detalle: "Punto justo para consumir"
  },

  // Verduras
  {
    id: "prod-7",
    nombre: "Papa Negra Cepillada",
    categoria: "Verduras",
    unidad_medida: "KG",
    precio: 950,
    disponible: true,
    paso: 1.0,
    detalle: "Balcarce lavada y firme"
  },
  {
    id: "prod-8",
    nombre: "Cebolla Selección",
    categoria: "Verduras",
    unidad_medida: "KG",
    precio: 1100,
    disponible: true,
    paso: 0.5,
    detalle: "Seca de primera calidad"
  },
  {
    id: "prod-9",
    nombre: "Tomate Redondo Premium",
    categoria: "Verduras",
    unidad_medida: "KG",
    precio: 2600,
    disponible: true,
    paso: 0.5,
    detalle: "Platense maduro en planta"
  },
  {
    id: "prod-10",
    nombre: "Zanahoria Fresca",
    categoria: "Verduras",
    unidad_medida: "KG",
    precio: 1300,
    disponible: true,
    paso: 0.5,
    detalle: "Dulce y crujiente"
  },
  {
    id: "prod-11",
    nombre: "Zapallito Verde Tronco",
    categoria: "Verduras",
    unidad_medida: "KG",
    precio: 1700,
    disponible: true,
    paso: 0.5,
    detalle: "Chico y tierno"
  },
  {
    id: "prod-12",
    nombre: "Calabaza Anco Butternut",
    categoria: "Verduras",
    unidad_medida: "KG",
    precio: 1100,
    disponible: true,
    paso: 1.0,
    detalle: "Cremosa y dulce"
  },

  // Hojas Verdes
  {
    id: "prod-13",
    nombre: "Acelga de Huerta",
    categoria: "Hojas Verdes",
    unidad_medida: "UNIDAD",
    precio: 900,
    disponible: true,
    paso: 1,
    detalle: "Atado fresco del día"
  },
  {
    id: "prod-14",
    nombre: "Lechuga Mantecosa",
    categoria: "Hojas Verdes",
    unidad_medida: "KG",
    precio: 2800,
    disponible: true,
    paso: 0.25,
    detalle: "Hojas tiernas y limpias"
  },
  {
    id: "prod-15",
    nombre: "Espinaca Fresca",
    categoria: "Hojas Verdes",
    unidad_medida: "UNIDAD",
    precio: 1100,
    disponible: true,
    paso: 1,
    detalle: "Atado grande seleccionado"
  },

  // Almacén / Granja
  {
    id: "prod-16",
    nombre: "Huevos de Campo (Maple x 30)",
    categoria: "Almacén",
    unidad_medida: "UNIDAD",
    precio: 5200,
    disponible: true,
    paso: 1,
    detalle: "Castaños de gallinas libres"
  },
  {
    id: "prod-17",
    nombre: "Huevos de Campo (Docena)",
    categoria: "Almacén",
    unidad_medida: "UNIDAD",
    precio: 2300,
    disponible: true,
    paso: 1,
    detalle: "Caja seleccionada x 12 u."
  }
];
const CATEGORIAS = ["Todos", "Frutas", "Verduras", "Hojas Verdes", "Almacén"];

  // ==========================================

  // 1b. CONFIGURACION PUBLICA Y DATOS DEMO SINTETICOS

  // ==========================================

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

// ==============================================================================
// Nexo Pedidos - Datos sintéticos de demostración
// Todas las personas, teléfonos, direcciones y alias son valores sintéticos
// usados exclusivamente con mensajería bloqueada/simulada (no se verificó la
// asignación real de esos números telefónicos).
// ==============================================================================

const DEMO_CUSTOMERS = Object.freeze({
  "1100000001": Object.freeze({
    telefono: "1100000001",
    nombre: "Ana Demo (sintética)",
    direccion: "Calle Ficticia 101 (demo)"
  }),
  "1100000002": Object.freeze({
    telefono: "1100000002",
    nombre: "Bruno Demo (sintético)",
    direccion: "Retiro en Local"
  })
});

const DEMO_QUICK_CUSTOMER = DEMO_CUSTOMERS["1100000001"];

function buildDemoOrders(now = Date.now()) {
  return [
    {
      id: 101,
      demo: true,
      cliente: {
        nombre: "Ana Demo (sintética)",
        telefono: "1100000001",
        direccion: "Calle Ficticia 101 (demo)"
      },
      tipo_entrega: "DELIVERY",
      direccion_entrega: "Calle Ficticia 101 (demo)",
      estado: "PENDIENTE",
      fecha: new Date(now - 15 * 60 * 1000).toISOString(),
      total_estimado: 6400,
      total_real: null,
      items: [
        { producto_id: "prod-9", nombre: "Tomate Redondo Premium", unidad_medida: "KG", precio_unitario: 2600, cantidad_solicitada: 1.0, peso_real: null, subtotal: 2600, sin_stock: false },
        { producto_id: "prod-1", nombre: "Banana Cavendish", unidad_medida: "KG", precio_unitario: 1800, cantidad_solicitada: 1.0, peso_real: null, subtotal: 1800, sin_stock: false },
        { producto_id: "prod-2", nombre: "Manzana Roja Elegida", unidad_medida: "KG", precio_unitario: 2200, cantidad_solicitada: 0.5, peso_real: null, subtotal: 1100, sin_stock: false },
        { producto_id: "prod-13", nombre: "Acelga de Huerta", unidad_medida: "UNIDAD", precio_unitario: 900, cantidad_solicitada: 1, peso_real: 1, subtotal: 900, sin_stock: false }
      ]
    },
    {
      id: 102,
      demo: true,
      cliente: {
        nombre: "Bruno Demo (sintético)",
        telefono: "1100000002",
        direccion: "Retiro en Local"
      },
      tipo_entrega: "RETIRO",
      direccion_entrega: "Retiro por Mostrador",
      estado: "EN_PREPARACION",
      fecha: new Date(now - 35 * 60 * 1000).toISOString(),
      total_estimado: 4700,
      total_real: null,
      items: [
        { producto_id: "prod-7", nombre: "Papa Negra Cepillada", unidad_medida: "KG", precio_unitario: 950, cantidad_solicitada: 2.0, peso_real: 2.15, subtotal: 2043, sin_stock: false },
        { producto_id: "prod-10", nombre: "Zanahoria Fresca", unidad_medida: "KG", precio_unitario: 1300, cantidad_solicitada: 1.0, peso_real: null, subtotal: 1300, sin_stock: false },
        { producto_id: "prod-3", nombre: "Naranja de Jugo", unidad_medida: "KG", precio_unitario: 1400, cantidad_solicitada: 1.0, peso_real: null, subtotal: 1400, sin_stock: false }
      ]
    }
  ];
}

function cloneDemoCustomers() {
  const out = {};
  Object.keys(DEMO_CUSTOMERS).forEach((k) => {
    out[k] = { ...DEMO_CUSTOMERS[k] };
  });
  return out;
}

  // ==========================================

  // 2. STORE Y PERSISTENCIA LOCAL + SUPABASE

  // ==========================================

// Configuración pública resuelta una sola vez al cargar (demo por defecto).
// Las claves heredadas mihuerta_* NUNCA se leen ni se migran.
const NEXO_CONFIG = resolveNexoConfig(readPublicConfigSource());

// Claves de almacenamiento local en namespace Nexo separado por modo
const STORAGE_KEYS = NEXO_CONFIG.storageKeys;

// Fallback en memoria en caso de bloqueo de localStorage en file:///
const memoryFallback = {};
function safeGet(key, def) {
  try {
    const val = localStorage.getItem(key);
    if (val === null || val === undefined) return memoryFallback[key] !== undefined ? memoryFallback[key] : def;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  } catch {
    return memoryFallback[key] !== undefined ? memoryFallback[key] : def;
  }
}
function safeSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    memoryFallback[key] = val;
  }
}
function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    delete memoryFallback[key];
  }
}

class Store {
  constructor(config = NEXO_CONFIG) {
    this.config = config;
    this.storageKeys = config.storageKeys || STORAGE_KEYS;
    this.listeners = new Set();
    this.blockedNetwork = [];
    this.supabase = null;
    this.realtimeChannel = null;
    this.cloudError = null;

    // En demo se bloquean las APIs de datos JS y apertura de enlaces externos (WhatsApp) antes de inicializar.
    if (this.isDemo() && typeof window !== "undefined") {
      this.blockedNetwork = installDemoNetworkGuard(window, (entry) => this.notify("network_blocked", entry));
    }

    this.init();

    // Sincronización en tiempo real entre pestañas
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("storage", (e) => {
        if (e.key === this.storageKeys.THEME) {
          this.applyTheme(this.getTheme());
          this.notify("theme_changed");
        } else if (Object.values(this.storageKeys).includes(e.key)) {
          this.notify("storage_sync");
        }
      });

      // Escuchar cambios reactivos en la preferencia del sistema operativo si no hay override explícito
      if (window.matchMedia) {
        try {
          const mq = window.matchMedia("(prefers-color-scheme: dark)");
          const handler = (e) => {
            const saved = safeGet(this.storageKeys.THEME, null);
            if (!saved) {
              this.applyTheme(e.matches ? "dark" : "light");
              this.notify("theme_changed");
            }
          };
          if (mq.addEventListener) {
            mq.addEventListener("change", handler);
          } else if (mq.addListener) {
            mq.addListener(handler);
          }
        } catch {}
      }
    }
  }

  // --- Modo y configuración pública ---
  isDemo() {
    return this.config.mode === "demo";
  }

  getMode() {
    return this.config.mode;
  }

  getConfigErrors() {
    return this.config.ok ? [] : [...this.config.errors];
  }

  getBusinessProfile() {
    return { ...this.config.business };
  }

  init() {
    // 0. Aplicar tema visual (Claro / Oscuro)
    this.applyTheme(this.getTheme());

    // Producción inválida: no se siembran datos ni se conecta nada.
    if (!this.config.ok) {
      return;
    }

    if (this.isDemo()) {
      // 1. Catálogo sintético
      if (!safeGet(this.storageKeys.PRODUCTS, null)) {
        safeSet(this.storageKeys.PRODUCTS, INITIAL_PRODUCTS);
      }
      // 2. Clientes sintéticos
      if (!safeGet(this.storageKeys.CUSTOMERS, null)) {
        safeSet(this.storageKeys.CUSTOMERS, cloneDemoCustomers());
      }
      // 3. Pedidos sintéticos
      if (!safeGet(this.storageKeys.ORDERS, null)) {
        safeSet(this.storageKeys.ORDERS, buildDemoOrders());
      }
    }

    // 4. Detectar parámetro ?tel= en el link de acceso del cliente
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPhone = urlParams.get("tel");
      if (urlPhone) {
        const cleanPhone = String(urlPhone).replace(/\D/g, "");
        const existingCustomer = this.getCustomer(cleanPhone);
        if (existingCustomer) {
          this.setCurrentUser(existingCustomer);
        } else if (cleanPhone.length >= 8) {
          this.prefilledPhone = cleanPhone;
        }
      }
    } catch {}

    // 5. Conexión cloud SOLO en producción con configuración explícita válida
    if (this.config.mode === "production") {
      this.initSupabaseConnection();
    }
  }

  // --- Ajustes locales (PIN de UI) ---
  getLocalSettings() {
    const stored = safeGet(this.storageKeys.LOCAL_SETTINGS, null);
    const pin = stored && typeof stored.staffPin === "string" ? stored.staffPin.trim() : "";
    return { staffPin: pin || "1234" };
  }

  saveLocalSettings(newSettings = {}) {
    const current = this.getLocalSettings();
    const pin = String(newSettings.staffPin ?? current.staffPin).replace(/\D/g, "").slice(0, 8);
    const updated = { staffPin: pin.length >= 4 ? pin : current.staffPin };
    safeSet(this.storageKeys.LOCAL_SETTINGS, updated);
    this.notify("local_settings_changed", { staffPin: "****" });
    return updated;
  }

  isCloudConnected() {
    return Boolean(this.supabase);
  }

  getCloudStatus() {
    if (this.isDemo()) return "demo";
    if (!this.config.ok) return "config_error";
    if (this.supabase) return "connected";
    if (this.cloudError) return "error";
    return "connecting";
  }

  verifyStaffPin(inputPin) {
    const { staffPin } = this.getLocalSettings();
    const ok = String(inputPin).trim() === String(staffPin).trim();
    if (ok) {
      safeSet(this.storageKeys.PIN_UNLOCKED, true);
    }
    return ok;
  }

  isStaffUnlocked() {
    return Boolean(safeGet(this.storageKeys.PIN_UNLOCKED, false));
  }

  lockStaff() {
    safeRemove(this.storageKeys.PIN_UNLOCKED);
    this.notify("staff_locked");
  }

  // Carga la librería oficial sólo en producción válida (nunca en demo).
  loadSupabaseLibrary() {
    if (typeof window === "undefined") return Promise.resolve(null);
    if (window.supabase && typeof window.supabase.createClient === "function") {
      return Promise.resolve(window.supabase);
    }
    if (typeof document === "undefined" || typeof document.createElement !== "function") {
      return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = NEXO_SUPABASE_LIBRARY_URL;
      script.async = true;
      script.onload = () => resolve(window.supabase || null);
      script.onerror = () => reject(new Error("No se pudo cargar la librería de Supabase."));
      (document.head || document.body).appendChild(script);
    });
  }

  async initSupabaseConnection() {
    // Defensa en profundidad: jamás conectar en demo o con config inválida.
    if (this.isDemo() || this.config.mode !== "production" || !this.config.ok) {
      this.supabase = null;
      return;
    }
    const { supabaseUrl, supabaseAnonKey } = this.config;
    try {
      const lib = await this.loadSupabaseLibrary();
      if (!lib || typeof lib.createClient !== "function") {
        throw new Error("Librería de Supabase no disponible.");
      }
      this.supabase = lib.createClient(supabaseUrl, supabaseAnonKey);
      this.cloudError = null;
      await this.pullFromSupabase();
      this.subscribeToSupabaseRealtime();
      this.notify("cloud_connected");
    } catch (err) {
      console.warn("No se pudo conectar a Supabase:", err);
      this.supabase = null;
      this.cloudError = String((err && err.message) || err);
      this.notify("cloud_error", this.cloudError);
    }
  }

  async pullFromSupabase() {
    if (!this.supabase) return;
    try {
      const currentUser = this.getCurrentUser();
      const clientQuery = currentUser?.telefono
        ? this.supabase.from("clientes").select("*").eq("telefono", String(currentUser.telefono).replace(/\D/g, ""))
        : null;

      const [prodRes, cliRes, ordRes] = await Promise.all([
        this.supabase.from("productos").select("*").order("id"),
        clientQuery ? clientQuery : Promise.resolve({ data: [] }),
        this.supabase.from("pedidos").select("*").order("id", { ascending: false }).limit(50)
      ]);

      if (prodRes.data && prodRes.data.length > 0) {
        const mappedProducts = prodRes.data.map((p) => ({
          ...p,
          precio: Number(p.precio),
          paso: Number(p.paso || 0.5)
        }));
        safeSet(this.storageKeys.PRODUCTS, mappedProducts);
      }

      if (cliRes && cliRes.data && cliRes.data.length > 0) {
        const customerMap = safeGet(this.storageKeys.CUSTOMERS, {}) || {};
        cliRes.data.forEach((c) => {
          customerMap[c.telefono] = {
            telefono: c.telefono,
            nombre: c.nombre,
            direccion: c.direccion || ""
          };
        });
        safeSet(this.storageKeys.CUSTOMERS, customerMap);
      }

      if (ordRes.data) {
        const mappedOrders = ordRes.data.map((o) => ({
          id: o.id,
          cliente: {
            nombre: o.cliente_nombre,
            telefono: o.cliente_telefono,
            direccion: o.direccion_entrega
          },
          tipo_entrega: o.tipo_entrega,
          direccion_entrega: o.direccion_entrega,
          estado: o.estado,
          fecha: o.fecha || o.created_at || new Date().toISOString(),
          total_estimado: Number(o.total_estimado),
          total_real: o.total_real !== null ? Number(o.total_real) : null,
          items: Array.isArray(o.items) ? o.items : []
        }));
        safeSet(this.storageKeys.ORDERS, mappedOrders);
      }

      this.notify("storage_sync");
    } catch (err) {
      console.warn("Error sincronizando datos desde Supabase:", err);
    }
  }

  subscribeToSupabaseRealtime() {
    if (!this.supabase) return;
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = this.supabase
      .channel("nexo-pedidos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, (payload) => {
        if (payload.eventType === "INSERT") {
          this.playAudioAlert();
        }
        this.pullFromSupabase();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "productos" }, () => {
        this.pullFromSupabase();
      })
      .subscribe();
  }

  async syncOrderToSupabase(order) {
    if (!this.supabase || !order) return;
    try {
      // Garantizar que el cliente exista en Supabase antes de insertar el pedido para satisfacer la Foreign Key
      if (order.cliente && order.cliente.telefono) {
        const cleanPhone = String(order.cliente.telefono).replace(/\D/g, "");
        await this.supabase.from("clientes").upsert({
          telefono: cleanPhone,
          nombre: order.cliente.nombre || "Cliente",
          direccion: order.cliente.direccion || "",
          updated_at: new Date().toISOString()
        });
      }

      await this.supabase.from("pedidos").upsert({
        id: order.id,
        cliente_telefono: order.cliente.telefono,
        cliente_nombre: order.cliente.nombre,
        tipo_entrega: order.tipo_entrega,
        direccion_entrega: order.direccion_entrega,
        estado: order.estado,
        total_estimado: order.total_estimado,
        total_real: order.total_real,
        items: order.items
      });
    } catch (err) {
      console.warn("Error guardando pedido en Supabase:", err);
    }
  }

  // --- Mensajería WhatsApp ---
  // Demo: siempre simulado (se registra localmente, nunca abre wa.me ni red).
  // Producción: abre wa.me manualmente por acción del usuario (outbox real en paquete posterior).
  sendWhatsAppMessage({ to, text, kind = "general" } = {}) {
    const cleanTo = String(to || "").replace(/\D/g, "");
    const body = String(text || "");
    if (this.isDemo()) {
      const entry = {
        id: `sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        kind,
        to: cleanTo,
        text: body,
        at: new Date().toISOString(),
        simulated: true
      };
      const log = safeGet(this.storageKeys.SIMULATED_MESSAGES, []);
      const list = Array.isArray(log) ? log : [];
      list.unshift(entry);
      safeSet(this.storageKeys.SIMULATED_MESSAGES, list.slice(0, 50));
      this.notify("whatsapp_simulated", entry);
      return { simulated: true, sent: false, entry };
    }
    if (!this.config.ok || !cleanTo) {
      return { simulated: false, sent: false, error: "Configuración o destinatario inválido." };
    }
    const url = `https://wa.me/${cleanTo}?text=${encodeURIComponent(body)}`;
    try {
      if (typeof window !== "undefined" && typeof window.open === "function") {
        window.open(url, "_blank", "noopener");
      }
    } catch {}
    return { simulated: false, sent: false, opened: true, url };
  }

  getSimulatedMessages() {
    const log = safeGet(this.storageKeys.SIMULATED_MESSAGES, []);
    return Array.isArray(log) ? log : [];
  }

  // --- Reactividad ---
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(event, data) {
    this.listeners.forEach((cb) => cb(event, data));
  }

  // --- Productos ---
  getProducts() {
    if (!this.config.ok) return [];
    // Producción no muestra catálogo de ejemplo: sólo datos sincronizados.
    return safeGet(this.storageKeys.PRODUCTS, this.isDemo() ? INITIAL_PRODUCTS : []);
  }

  updateProductPrice(productId, newPrice) {
    const cleanPrice = Math.max(0, Number(newPrice));
    const products = this.getProducts().map((p) => {
      if (p.id === productId) {
        return { ...p, precio: cleanPrice };
      }
      return p;
    });
    safeSet(this.storageKeys.PRODUCTS, products);
    if (this.supabase) {
      this.supabase.from("productos").update({ precio: cleanPrice, updated_at: new Date().toISOString() }).eq("id", productId).then(() => {});
    }
    this.notify("products_changed");
  }

  toggleProductStock(productId) {
    let newStatus = true;
    const products = this.getProducts().map((p) => {
      if (p.id === productId) {
        newStatus = !p.disponible;
        return { ...p, disponible: newStatus };
      }
      return p;
    });
    safeSet(this.storageKeys.PRODUCTS, products);
    if (this.supabase) {
      this.supabase.from("productos").update({ disponible: newStatus, updated_at: new Date().toISOString() }).eq("id", productId).then(() => {});
    }
    this.notify("products_changed");
  }

  // --- Clientes ---
  getCustomers() {
    return safeGet(this.storageKeys.CUSTOMERS, {});
  }

  getCustomer(phone) {
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/\D/g, "");
    if (!cleanPhone) return null;
    const customers = this.getCustomers();
    return customers[cleanPhone] || null;
  }

  saveCustomer(customer) {
    if (!customer || !customer.telefono) return null;
    const cleanPhone = String(customer.telefono).replace(/\D/g, "");
    if (!cleanPhone) return null;
    const customers = this.getCustomers();
    customers[cleanPhone] = { ...customer, telefono: cleanPhone };
    safeSet(this.storageKeys.CUSTOMERS, customers);
    if (this.supabase) {
      this.supabase.from("clientes").upsert({
        telefono: cleanPhone,
        nombre: customer.nombre || "Cliente",
        direccion: customer.direccion || "",
        updated_at: new Date().toISOString()
      }).then(() => {});
    }
    this.setCurrentUser(customers[cleanPhone]);
    this.notify("customers_changed");
    return customers[cleanPhone];
  }

  getCurrentUser() {
    return safeGet(this.storageKeys.CURRENT_USER, null);
  }

  setCurrentUser(user) {
    safeSet(this.storageKeys.CURRENT_USER, user);
    this.notify("user_changed", user);
  }

  logoutUser() {
    safeRemove(this.storageKeys.CURRENT_USER);
    this.clearCart();
    this.notify("user_changed", null);
  }

  // --- Carrito ---
  getCart() {
    return safeGet(this.storageKeys.CART, {});
  }

  addToCart(productId, quantityDelta) {
    const cart = this.getCart();
    const product = this.getProducts().find((p) => p.id === productId);
    if (!product) return;
    if (quantityDelta > 0 && !product.disponible) return;

    const currentQty = cart[productId]?.cantidad || 0;
    const newQty = Math.max(0, Number((currentQty + quantityDelta).toFixed(2)));

    if (newQty <= 0) {
      delete cart[productId];
    } else {
      cart[productId] = {
        producto_id: productId,
        nombre: product.nombre,
        categoria: product.categoria,
        unidad_medida: product.unidad_medida,
        precio_unitario: product.precio,
        cantidad: newQty,
        subtotal_estimado: Math.round(newQty * product.precio)
      };
    }

    safeSet(this.storageKeys.CART, cart);
    this.notify("cart_changed");
  }

  removeFromCart(productId) {
    const cart = this.getCart();
    delete cart[productId];
    safeSet(this.storageKeys.CART, cart);
    this.notify("cart_changed");
  }

  setCartQuantity(productId, targetQty) {
    const cleanQty = Math.max(0, Number(targetQty.toFixed(2)));
    if (cleanQty <= 0) {
      this.removeFromCart(productId);
      return;
    }
    const cart = this.getCart();
    const product = this.getProducts().find((p) => p.id === productId);
    if (!product || !product.disponible) return;

    cart[productId] = {
      producto_id: productId,
      nombre: product.nombre,
      categoria: product.categoria,
      unidad_medida: product.unidad_medida,
      precio_unitario: product.precio,
      cantidad: cleanQty,
      subtotal_estimado: Math.round(cleanQty * product.precio)
    };

    safeSet(this.storageKeys.CART, cart);
    this.notify("cart_changed");
  }

  clearCart() {
    safeRemove(this.storageKeys.CART);
    this.notify("cart_changed");
  }

  getCartSummary() {
    const cart = this.getCart();
    const items = Object.values(cart);
    const totalEstimado = items.reduce((sum, item) => sum + item.subtotal_estimado, 0);
    const totalItems = items.length;
    return { items, totalEstimado, totalItems };
  }

  // --- Pedidos ---
  getOrders() {
    return safeGet(this.storageKeys.ORDERS, []);
  }

  getActiveOrderId() {
    return safeGet(this.storageKeys.ACTIVE_ORDER, null);
  }

  setActiveOrderId(orderId) {
    if (orderId) {
      safeSet(this.storageKeys.ACTIVE_ORDER, Number(orderId));
    } else {
      safeRemove(this.storageKeys.ACTIVE_ORDER);
    }
    this.notify("active_order_changed", orderId);
  }

  isSameCustomer(phoneA, phoneB) {
    if (!phoneA || !phoneB) return false;
    const a = String(phoneA).replace(/\D/g, "");
    const b = String(phoneB).replace(/\D/g, "");
    if (a === b) return true;
    // Manejo de prefijos internacionales y locales (ej: 54911 vs 11)
    if (a.length >= 8 && b.length >= 8) {
      return a.slice(-8) === b.slice(-8);
    }
    return false;
  }

  getActiveOrder(userPhone = null) {
    const orders = this.getOrders();
    const targetPhone = userPhone || this.getCurrentUser()?.telefono;
    if (!targetPhone) return null;

    const activeId = this.getActiveOrderId();
    if (activeId) {
      const active = orders.find((o) => o.id === activeId);
      if (active && this.isSameCustomer(active.cliente?.telefono, targetPhone)) {
        if (active.estado !== "ENTREGADO" && active.estado !== "CANCELADO") {
          return active;
        }
      }
    }

    // Si el ID guardado no pertenece a este cliente o ya fue entregado, buscar su pedido activo más reciente
    const latestUserOrder = orders.find((o) => {
      const isOwner = this.isSameCustomer(o.cliente?.telefono, targetPhone);
      const isOngoing = o.estado !== "ENTREGADO" && o.estado !== "CANCELADO";
      return isOwner && isOngoing;
    });

    if (latestUserOrder) {
      this.setActiveOrderId(latestUserOrder.id);
      return latestUserOrder;
    }

    return null;
  }

  getOrdersByCustomer(phone) {
    if (!phone) return [];
    return this.getOrders().filter((o) => this.isSameCustomer(o.cliente?.telefono, phone));
  }

  createOrder({ cliente, tipo_entrega, direccion_entrega }) {
    const { items, totalEstimado } = this.getCartSummary();
    // Producción inválida nunca simula un pedido exitoso.
    if (!this.config.ok) return null;
    if (items.length === 0) return null;

    const orders = this.getOrders();
    const newId = orders.length > 0 ? Math.max(...orders.map((o) => o.id)) + 1 : 101;

    const newOrder = {
      id: newId,
      cliente,
      tipo_entrega,
      direccion_entrega: tipo_entrega === "DELIVERY" ? direccion_entrega : "Retiro en Mostrador",
      estado: "PENDIENTE",
      fecha: new Date().toISOString(),
      total_estimado: totalEstimado,
      total_real: null,
      items: items.map((item) => ({
        producto_id: item.producto_id,
        nombre: item.nombre,
        categoria: item.categoria,
        unidad_medida: item.unidad_medida,
        precio_unitario: item.precio_unitario,
        cantidad_solicitada: item.cantidad,
        peso_real: item.unidad_medida === "UNIDAD" ? item.cantidad : null,
        subtotal: item.subtotal_estimado,
        sin_stock: false
      }))
    };

    orders.unshift(newOrder);
    safeSet(this.storageKeys.ORDERS, orders);
    this.syncOrderToSupabase(newOrder);
    this.setActiveOrderId(newOrder.id);
    this.clearCart();
    this.playAudioAlert();
    this.notify("order_created", newOrder);
    return newOrder;
  }

  updateOrderStatus(orderId, newStatus) {
    let targetOrder = null;
    const orders = this.getOrders().map((order) => {
      if (order.id === orderId) {
        targetOrder = { ...order, estado: newStatus, updated_at: new Date().toISOString() };
        return targetOrder;
      }
      return order;
    });
    safeSet(this.storageKeys.ORDERS, orders);
    if (targetOrder) this.syncOrderToSupabase(targetOrder);
    this.notify("orders_changed");
  }

  updateItemWeight(orderId, itemIndex, pesoReal, { notify = true } = {}) {
    let targetOrder = null;
    const orders = this.getOrders().map((order) => {
      if (order.id === orderId) {
        const items = [...order.items];
        const item = { ...items[itemIndex] };

        const peso = Math.max(0, Number(pesoReal));
        item.peso_real = peso;
        item.subtotal = Math.round(peso * item.precio_unitario);
        items[itemIndex] = item;

        const todosPesados = items.every((i) => i.sin_stock || i.peso_real !== null);
        let totalReal = null;
        if (todosPesados) {
          totalReal = items
            .filter((i) => !i.sin_stock)
            .reduce((sum, i) => sum + (i.subtotal || 0), 0);
        }

        targetOrder = { ...order, items, total_real: totalReal };
        return targetOrder;
      }
      return order;
    });
    safeSet(this.storageKeys.ORDERS, orders);
    if (targetOrder) this.syncOrderToSupabase(targetOrder);
    if (notify) {
      this.notify("orders_changed");
    }
  }

  toggleItemOutOfStock(orderId, itemIndex) {
    let targetOrder = null;
    const orders = this.getOrders().map((order) => {
      if (order.id === orderId) {
        const items = [...order.items];
        const item = { ...items[itemIndex] };
        item.sin_stock = !item.sin_stock;
        if (item.sin_stock) {
          item.subtotal = 0;
        } else {
          const qty = item.peso_real !== null ? item.peso_real : item.cantidad_solicitada;
          item.subtotal = Math.round(qty * item.precio_unitario);
        }
        items[itemIndex] = item;

        const totalReal = items
          .filter((i) => !i.sin_stock && i.peso_real !== null)
          .reduce((sum, i) => sum + (i.subtotal || 0), 0);

        targetOrder = { ...order, items, total_real: totalReal };
        return targetOrder;
      }
      return order;
    });
    safeSet(this.storageKeys.ORDERS, orders);
    if (targetOrder) this.syncOrderToSupabase(targetOrder);
    this.notify("orders_changed");
  }

  finalizeOrderWeighing(orderId, weightsMap = null) {
    let targetOrder = null;
    const orders = this.getOrders().map((order) => {
      if (order.id === orderId) {
        const items = order.items.map((i, idx) => {
          if (i.sin_stock) return i;
          let pesoFinal;
          if (weightsMap && weightsMap[idx] !== undefined && weightsMap[idx] !== null && String(weightsMap[idx]).trim() !== "") {
            pesoFinal = Math.max(0, Number(weightsMap[idx]));
          } else {
            pesoFinal = i.peso_real !== null ? i.peso_real : i.cantidad_solicitada;
          }
          return {
            ...i,
            peso_real: pesoFinal,
            subtotal: Math.round(pesoFinal * i.precio_unitario)
          };
        });

        const totalFinal = items
          .filter((i) => !i.sin_stock)
          .reduce((sum, i) => sum + i.subtotal, 0);

        targetOrder = {
          ...order,
          items,
          total_real: totalFinal,
          estado: "LISTO",
          finalizado_at: new Date().toISOString()
        };
        return targetOrder;
      }
      return order;
    });

    safeSet(this.storageKeys.ORDERS, orders);
    if (targetOrder) this.syncOrderToSupabase(targetOrder);
    this.notify("orders_changed");
    this.notify("order_ready", orderId);
  }

  // Eliminar o cancelar completamente un pedido
  deleteOrder(orderId) {
    const orders = this.getOrders().filter((o) => o.id !== orderId);
    safeSet(this.storageKeys.ORDERS, orders);
    if (this.supabase) {
      this.supabase.from("pedidos").delete().eq("id", orderId).then(() => {});
    }
    if (this.getActiveOrderId() === orderId) {
      this.setActiveOrderId(null);
    }
    this.notify("orders_changed");
  }

  // Cancelar un pedido de forma lógica (soft cancellation)
  cancelOrder(orderId) {
    let targetOrder = null;
    const orders = this.getOrders().map((order) => {
      if (order.id === orderId) {
        targetOrder = {
          ...order,
          estado: "CANCELADO",
          cancelado_at: new Date().toISOString()
        };
        return targetOrder;
      }
      return order;
    });
    safeSet(this.storageKeys.ORDERS, orders);
    if (targetOrder) this.syncOrderToSupabase(targetOrder);
    if (this.getActiveOrderId() === orderId) {
      this.setActiveOrderId(null);
    }
    this.notify("orders_changed");
  }

  // Quitar un producto específico del pedido
  removeItemFromOrder(orderId, itemIndex) {
    let targetOrder = null;
    const orders = this.getOrders().map((order) => {
      if (order.id === orderId) {
        const items = order.items.filter((_, idx) => idx !== itemIndex);
        const totalEstimado = items.reduce((sum, i) => sum + (i.subtotal || Math.round(i.cantidad_solicitada * i.precio_unitario)), 0);

        // Recalcular total_real si habia pesaje en curso o total_real existente
        const hasWeighedItems = items.some((i) => i.peso_real !== null);
        const totalReal = hasWeighedItems
          ? items.filter((i) => !i.sin_stock && i.peso_real !== null).reduce((sum, i) => sum + (i.subtotal || 0), 0)
          : null;

        targetOrder = { ...order, items, total_estimado: totalEstimado, total_real: totalReal };
        return targetOrder;
      }
      return order;
    });
    safeSet(this.storageKeys.ORDERS, orders);
    if (targetOrder) this.syncOrderToSupabase(targetOrder);
    this.notify("orders_changed");
  }

  // Agregar un producto al pedido en preparación
  addProductToOrder(orderId, productId, cantidad) {
    const product = this.getProducts().find((p) => p.id === productId);
    if (!product) return;
    const qty = Math.max(0.1, Number(cantidad));
    const subtotal = Math.round(qty * product.precio);

    let targetOrder = null;
    const orders = this.getOrders().map((order) => {
      if (order.id === orderId) {
        const newItem = {
          producto_id: product.id,
          nombre: product.nombre,
          categoria: product.categoria,
          unidad_medida: product.unidad_medida,
          precio_unitario: product.precio,
          cantidad_solicitada: qty,
          peso_real: product.unidad_medida === "UNIDAD" ? qty : null,
          subtotal: subtotal,
          sin_stock: false
        };
        const items = [...order.items, newItem];
        const totalEstimado = items.reduce((sum, i) => sum + (i.subtotal || Math.round(i.cantidad_solicitada * i.precio_unitario)), 0);

        // Si el pedido ya estaba en preparación o tenía pesaje, recalcular total_real
        const allWeighed = items.every((i) => i.sin_stock || i.peso_real !== null);
        let totalReal = order.total_real;
        if (allWeighed) {
          totalReal = items.filter((i) => !i.sin_stock).reduce((sum, i) => sum + (i.subtotal || 0), 0);
        } else if (order.total_real !== null) {
          const hasWeighedItems = items.some((i) => i.peso_real !== null);
          totalReal = hasWeighedItems
            ? items.filter((i) => !i.sin_stock && i.peso_real !== null).reduce((sum, i) => sum + (i.subtotal || 0), 0)
            : null;
        }

        targetOrder = { ...order, items, total_estimado: totalEstimado, total_real: totalReal };
        return targetOrder;
      }
      return order;
    });
    safeSet(this.storageKeys.ORDERS, orders);
    if (targetOrder) this.syncOrderToSupabase(targetOrder);
    this.notify("orders_changed");
  }

  // Modificar datos de entrega y contacto del pedido
  updateOrderDetails(orderId, details) {
    let targetOrder = null;
    const orders = this.getOrders().map((order) => {
      if (order.id === orderId) {
        targetOrder = {
          ...order,
          cliente: {
            ...order.cliente,
            nombre: details.nombre !== undefined ? details.nombre : order.cliente.nombre,
            telefono: details.telefono !== undefined ? details.telefono : order.cliente.telefono
          },
          tipo_entrega: details.tipo_entrega || order.tipo_entrega,
          direccion_entrega: details.direccion_entrega || order.direccion_entrega
        };
        return targetOrder;
      }
      return order;
    });
    safeSet(this.storageKeys.ORDERS, orders);
    if (targetOrder) this.syncOrderToSupabase(targetOrder);
    this.notify("orders_changed");
  }

  // ========================================================
  // GESTION DE MODO OSCURO / CLARO
  // ========================================================
  getTheme() {
    const saved = safeGet(this.storageKeys.THEME, null);
    if (saved === "dark" || saved === "light") {
      return saved;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  }

  setTheme(theme) {
    const validTheme = theme === "dark" ? "dark" : "light";
    // Sólo namespace Nexo (no se escribe la clave genérica "theme")
    safeSet(this.storageKeys.THEME, validTheme);
    this.applyTheme(validTheme);
    this.notify("theme_changed");
    return validTheme;
  }

  toggleTheme() {
    const current = this.getTheme();
    const next = current === "dark" ? "light" : "dark";
    return this.setTheme(next);
  }

  applyTheme(theme) {
    if (typeof document === "undefined") return;
    const isDark = theme === "dark";
    const themeName = isDark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", isDark);
    if (document.body) {
      document.body.classList.toggle("dark", isDark);
    }
    document.documentElement.setAttribute("data-theme", themeName);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", isDark ? "#020617" : "#f8fafc");
    }
    const labels = document.querySelectorAll(".theme-label");
    labels.forEach((el) => {
      el.textContent = isDark ? "Oscuro" : "Claro";
    });
    const btns = document.querySelectorAll(".theme-toggle-btn");
    btns.forEach((btn) => {
      btn.setAttribute("aria-label", isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
      btn.setAttribute("title", isDark ? "Cambiar a tema claro (atajo: T)" : "Cambiar a tema oscuro (atajo: T)");
    });
  }

  playAudioAlert() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }
}

const store = new Store();

  // ==========================================

  // 3. VISTA CLIENTE

  // ==========================================

function renderClientView(container) {
  let selectedCategory = "Todos";
  let searchQuery = "";
  let isCartOpen = false;
  let isDrawerFirstOpen = true;
  let viewingActiveOrder = false;
  let deliveryMode = "RETIRO"; // RETIRO | DELIVERY
  let deliveryAddress = "";

  // Determinar si debemos mostrar el seguimiento de pedido automáticamente al iniciar
  const initialUser = store.getCurrentUser();
  const initialActive = initialUser ? store.getActiveOrder(initialUser.telefono) : null;
  if (initialActive && initialActive.estado !== "ENTREGADO" && initialActive.estado !== "CANCELADO") {
    viewingActiveOrder = true;
  }

  function update() {
    const user = store.getCurrentUser();
    if (!user) {
      renderPhoneGate();
      return;
    }

    if (viewingActiveOrder) {
      const activeOrder = store.getActiveOrder(user.telefono);
      if (activeOrder) {
        renderOrderTracking(activeOrder);
        return;
      } else {
        viewingActiveOrder = false;
      }
    }

    renderCatalog();
  }

  // ========================================================
  // 1. PANTALLA DE ACCESO / TELEFONO (Mobile First)
  // ========================================================
  function renderPhoneGate() {
    container.innerHTML = `
      <div class="max-w-md mx-auto p-4 pt-8 pb-16 min-h-[85vh] flex flex-col justify-center">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/40 border border-slate-200/80 dark:border-slate-800 text-left">

          <div class="mb-6 flex items-start justify-between gap-2">
            <div>
              <span class="inline-block text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-2">
                Verdulería Digital
              </span>
              <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">${store.getBusinessProfile().name || "Nexo Pedidos"}</h1>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Catálogo fresco del día, pedidos directos desde tu celular y pesaje transparente en balanza.
              </p>
            </div>
            <button
              type="button"
              class="theme-toggle-btn shrink-0 min-h-[44px] text-[11px] font-bold tracking-wider px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition tap-feedback flex items-center gap-1.5 touch-target"
              title="Cambiar tema claro / oscuro"
            >
              <span>Tema:</span>
              <span class="theme-label font-black">${store.getTheme() === "dark" ? "Oscuro" : "Claro"}</span>
            </button>
          </div>

          <form id="phone-form" class="space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Número de WhatsApp
              </label>
              <div class="relative flex items-center">
                <span class="absolute left-4 text-slate-400 dark:text-slate-500 font-semibold text-base select-none pointer-events-none">
                  +54 9
                </span>
                <input
                  type="tel"
                  id="phone-input"
                  required
                  inputmode="numeric"
                  pattern="[0-9]{8,15}"
                  maxlength="15"
                  autocomplete="tel"
                  placeholder="11 0000 0001"
                  value="${(store.prefilledPhone || "").replace(/\D/g, "")}"
                  class="w-full pl-20 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white font-bold text-base outline-none transition"
                />
              </div>
              <p id="phone-error" class="hidden text-xs text-rose-500 dark:text-rose-400 font-semibold mt-1.5">
                Ingresá un número de WhatsApp válido (sólo números, mín. 8 dígitos).
              </p>
              <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                Usamos tu teléfono para enviarte el comprobante de pesaje real por WhatsApp.
              </p>
            </div>

            <div id="new-user-fields" class="space-y-3 pt-1">
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label for="name-input" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Nombre completo
                  </label>
                  <span class="text-[10px] font-bold text-rose-500 dark:text-rose-400">Requerido</span>
                </div>
                <input
                  type="text"
                  id="name-input"
                  required
                  minlength="2"
                  maxlength="60"
                  autocomplete="name"
                  placeholder="${store.isDemo() ? "Ej: Ana Demo (sintética)" : "Ej: Tu nombre y apellido"}"
                  class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white text-base font-medium outline-none transition"
                />
                <p id="name-error" class="hidden text-xs text-rose-500 dark:text-rose-400 font-semibold mt-1.5">
                  Por favor ingresá tu nombre para que podamos identificar tu pedido.
                </p>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Dirección de entrega (opcional)
                </label>
                <input
                  type="text"
                  id="address-input"
                  placeholder="${store.isDemo() ? "Ej: Calle Ficticia 101 (demo)" : "Ej: Calle y altura, piso/depto"}"
                  class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white text-base font-medium outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              class="w-full mt-2 min-h-[48px] bg-slate-950 hover:bg-slate-900 active:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-slate-950/15 dark:shadow-emerald-950/30 transition tap-feedback text-sm flex items-center justify-center gap-2"
            >
              <span>Ingresar al Catálogo</span>
            </button>
          </form>

          <!-- Acceso rápido demo (exclusivo en Modo Demo) -->
          ${
            store.isDemo()
              ? `
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              id="btn-quick-demo-user"
              type="button"
              class="w-full min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl transition tap-feedback text-center border border-transparent dark:border-slate-700"
            >
              Probar como ${DEMO_QUICK_CUSTOMER.nombre}
            </button>
          </div>
          `
              : ""
          }

          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              Precios del día
            </span>
            <span>Pesaje transparente</span>
          </div>
        </div>
      </div>
    `;

    const phoneForm = container.querySelector("#phone-form");
    const phoneInput = container.querySelector("#phone-input");
    const nameInput = container.querySelector("#name-input");
    const addressInput = container.querySelector("#address-input");
    const btnQuickDemo = container.querySelector("#btn-quick-demo-user");

    const phoneError = container.querySelector("#phone-error");
    const nameError = container.querySelector("#name-error");

    function syncUserFields(phoneVal) {
      if (!phoneVal) return;
      const clean = String(phoneVal).replace(/\D/g, "");
      const match = store.getCustomer(clean);
      if (match) {
        if (nameInput) {
          nameInput.value = match.nombre || "";
          clearNameError();
        }
        if (addressInput) addressInput.value = match.direccion || "";
      }
    }

    const clearPhoneError = () => {
      if (phoneError && !phoneError.classList.contains("hidden")) {
        phoneError.classList.add("hidden");
        phoneInput?.classList.remove("border-rose-500", "focus:ring-rose-500");
      }
    };

    const clearNameError = () => {
      if (nameError && !nameError.classList.contains("hidden")) {
        nameError.classList.add("hidden");
        nameInput?.classList.remove("border-rose-500", "focus:ring-rose-500");
      }
    };

    nameInput?.addEventListener("input", () => {
      clearNameError();
    });

    // Bloquear teclas no numéricas en keydown para teclado físico
    phoneInput?.addEventListener("keydown", (e) => {
      const allowedKeys = [
        "Backspace", "Tab", "Enter", "Escape", "Delete",
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "Home", "End"
      ];
      if (allowedKeys.includes(e.key)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
      }
    });

    // Sanitizar en evento input (captura dictado, autocompletar y teclados virtuales móviles)
    phoneInput?.addEventListener("input", (e) => {
      const raw = e.target.value;
      const clean = raw.replace(/\D/g, "");
      if (raw !== clean) {
        const curPos = e.target.selectionStart || 0;
        e.target.value = clean;
        try {
          const newPos = Math.max(0, curPos - (raw.length - clean.length));
          e.target.setSelectionRange(newPos, newPos);
        } catch {}
      }
      clearPhoneError();
      syncUserFields(clean);
    });

    // Sanitizar en evento paste para admitir sólo dígitos
    phoneInput?.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasteText = (e.clipboardData || window.clipboardData)?.getData("text") || "";
      const digits = pasteText.replace(/\D/g, "");
      if (!digits) return;

      const start = phoneInput.selectionStart || 0;
      const end = phoneInput.selectionEnd || 0;
      const current = phoneInput.value;
      const updated = (current.slice(0, start) + digits + current.slice(end)).slice(0, 15);
      phoneInput.value = updated;
      const targetPos = Math.min(start + digits.length, updated.length);
      try {
        phoneInput.setSelectionRange(targetPos, targetPos);
      } catch {}
      clearPhoneError();
      syncUserFields(updated);
    });

    if (phoneInput?.value) {
      phoneInput.value = phoneInput.value.replace(/\D/g, "");
      syncUserFields(phoneInput.value);
    }

    btnQuickDemo?.addEventListener("click", () => {
      if (!store.isDemo()) return;
      const demoUser = store.saveCustomer({ ...DEMO_QUICK_CUSTOMER });
      store.setCurrentUser(demoUser);
      deliveryAddress = demoUser.direccion || "";
      update();
    });

    phoneForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const phone = phoneInput.value.replace(/\D/g, "").trim();

      if (!phone || phone.length < 8) {
        if (phoneError) {
          phoneError.textContent = "Ingresá un número de WhatsApp válido (sólo números, mín. 8 dígitos).";
          phoneError.classList.remove("hidden");
        }
        phoneInput?.classList.add("border-rose-500", "focus:ring-rose-500");
        phoneInput?.focus();
        return;
      }

      const name = nameInput.value.trim();
      if (!name || name.length < 2) {
        if (nameError) {
          nameError.textContent = "Por favor ingresá tu nombre para que podamos identificar tu pedido.";
          nameError.classList.remove("hidden");
        }
        nameInput?.classList.add("border-rose-500", "focus:ring-rose-500");
        nameInput?.focus();
        return;
      }

      const address = addressInput.value.trim();

      const user = store.saveCustomer({
        telefono: phone,
        nombre: name,
        direccion: address
      });

      store.setCurrentUser(user);
      deliveryAddress = user.direccion || "";
      update();
    });
  }

  // ========================================================
  // 2. CATALOGO PRINCIPAL
  // ========================================================
  function renderCatalog() {
    const user = store.getCurrentUser();
    const products = store.getProducts();
    const cart = store.getCart();
    const { items: cartItems, totalEstimado, totalItems } = store.getCartSummary();
    const activeOrder = store.getActiveOrder(user.telefono);

    if (!deliveryAddress && user.direccion) {
      deliveryAddress = user.direccion;
    }

    const filteredProducts = products.filter((p) => {
      const matchesCategory = selectedCategory === "Todos" || p.categoria === selectedCategory;
      const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });

    // Conteo por categoría
    const categoryCounts = {};
    CATEGORIAS.forEach((cat) => {
      categoryCounts[cat] =
        cat === "Todos"
          ? products.length
          : products.filter((p) => p.categoria === cat).length;
    });

    // Preservar scroll del drawer si ya estaba montado
    const prevScrollEl = container.querySelector("#cart-drawer-items-list");
    const savedDrawerScroll = prevScrollEl ? prevScrollEl.scrollTop : 0;

    container.innerHTML = `
      <div class="max-w-md mx-auto pb-32 sm:pb-36 w-full overflow-x-hidden safe-pb">

        <!-- Banner de Pedido Activo en Curso (si existe) -->
        ${
          activeOrder && activeOrder.estado !== "ENTREGADO"
            ? `
          <div class="px-4 pt-3">
            <button
              id="btn-banner-active-order"
              class="w-full min-h-[48px] bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 p-3 rounded-2xl text-left flex items-center justify-between transition tap-feedback shadow-xs touch-target"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span class="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    Pedido #${activeOrder.id} en curso
                  </span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    ${activeOrder.estado}
                  </span>
                </div>
                <p class="text-xs text-emerald-900 dark:text-emerald-200 font-semibold mt-0.5">
                  Tocá aquí para ver el pesaje en balanza en tiempo real
                </p>
              </div>
              <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                Ver
              </span>
            </button>
          </div>
        `
            : ""
        }

        <!-- Header Móvil del Catálogo (Coordinado con clase sticky-header-offset) -->
        <header class="sticky sticky-header-offset z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 pt-3 pb-2.5 shadow-xs">
          <!-- Fila 1: Título y Estado (Izq) + Carrito de Pedido (Der) -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase truncate">Catálogo del Día</span>
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Abierto
              </span>
            </div>

            <div class="flex items-center shrink-0">
              <button
                id="btn-header-cart"
                class="relative min-h-[44px] px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-200 dark:border-slate-700 tap-feedback touch-target"
                title="Ver pedido"
                aria-label="Ver pedido"
              >
                <span>Pedido</span>
                <span class="px-2 py-0.5 rounded-full ${totalItems > 0 ? "bg-emerald-600 text-white font-black" : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"} text-xs">
                  ${totalItems}
                </span>
              </button>
            </div>
          </div>

          <!-- Fila 2: Saludo de usuario (Izq) + Conmutador de Tema (Der) -->
          <div class="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="truncate">Hola, <strong class="text-slate-800 dark:text-slate-200 font-semibold">${user.nombre}</strong></span>
              <button id="btn-change-user" class="min-h-[44px] min-w-[44px] inline-flex items-center px-1 text-slate-400 dark:text-slate-500 underline hover:text-slate-600 dark:hover:text-slate-300 text-[11px] touch-target shrink-0">Cambiar</button>
            </div>
            <div class="flex items-center shrink-0">
              <button
                type="button"
                class="theme-toggle-btn min-h-[44px] px-2.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-200 dark:border-slate-700 tap-feedback touch-target"
                title="Cambiar tema claro / oscuro"
                aria-label="Cambiar tema claro u oscuro"
              >
                <span>Tema:</span>
                <span class="theme-label font-black">${store.getTheme() === "dark" ? "Oscuro" : "Claro"}</span>
              </button>
            </div>
          </div>

          <!-- Buscador con tamaño de fuente accesible para evitar zoom iOS -->
          <div class="mt-2.5 relative">
            <input
              type="text"
              id="search-input"
              placeholder="Buscar productos..."
              value="${searchQuery}"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              class="w-full pl-3.5 pr-14 py-2.5 bg-slate-100 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 border border-slate-200/80 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-base font-medium outline-none transition"
            />
            ${
              searchQuery
                ? `<button id="btn-clear-search" class="absolute right-1 top-1 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-bold tap-feedback rounded-xl touch-target" title="Borrar búsqueda" aria-label="Borrar búsqueda">Borrar</button>`
                : ""
            }
          </div>

          <!-- Píldoras de Categorías con conteo (Horizontal Scroll Táctil) -->
          <div class="mt-2.5 flex gap-2 overflow-x-auto no-scrollbar overscroll-x-contain py-1 -mx-4 px-4">
            ${CATEGORIAS.map(
              (cat) => `
              <button
                data-category="${cat}"
                class="category-pill shrink-0 whitespace-nowrap min-h-[44px] px-4 py-2.5 rounded-full text-xs font-bold transition tap-feedback touch-target flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent dark:border-slate-800"
                }"
              >
                <span>${cat}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full ${
                  selectedCategory === cat ? "bg-slate-800 dark:bg-emerald-800 text-slate-200 dark:text-white font-black" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }">
                  ${categoryCounts[cat] || 0}
                </span>
              </button>
            `
            ).join("")}
            <div class="w-2 shrink-0 select-none pointer-events-none" aria-hidden="true"></div>
          </div>
        </header>

        <!-- Contenedor de Productos -->
        <main id="products-list-container" class="p-4 space-y-4">
          ${renderProductCardsHTML(filteredProducts, cart)}
        </main>

        <!-- Footer discreto para acceso a personal del local -->
        <footer class="mt-8 mb-16 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>${store.getBusinessProfile().name || "Nexo Pedidos"} <span class="opacity-40 font-light">|</span> Catálogo y Pesaje en Balanza</p>
          <a href="?view=operario" class="min-h-[44px] inline-flex items-center justify-center py-2 px-3 mt-2 text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline touch-target">
            Acceso Personal del Local
          </a>
        </footer>

        <!-- Barra Flotante Inferior de Pedido (Safe Area Adaptable) -->
        ${
          totalItems > 0
            ? `
          <div class="fixed left-4 right-4 z-30 max-w-md mx-auto pointer-events-auto safe-floating-bottom">
            <button
              id="btn-open-cart"
              class="w-full min-h-[52px] bg-slate-950 dark:bg-slate-900 hover:bg-slate-900 dark:hover:bg-slate-800 active:bg-black text-white p-3.5 px-4 rounded-2xl shadow-xl shadow-slate-950/30 flex items-center justify-between transition tap-feedback border border-slate-800 dark:border-slate-700"
            >
              <div class="flex items-center gap-3">
                <span class="bg-emerald-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-full">
                  ${totalItems} ${totalItems === 1 ? "ítem" : "ítems"}
                </span>
                <div class="text-left">
                  <span class="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Total Estimado</span>
                  <span class="font-black text-base leading-none text-white">$${totalEstimado.toLocaleString("es-AR")}</span>
                </div>
              </div>
              <div class="flex items-center gap-1.5 font-bold text-xs bg-slate-800 dark:bg-slate-800 hover:bg-slate-700 dark:hover:bg-slate-700 px-3.5 py-2.5 rounded-xl text-emerald-400 transition">
                <span>Ver Pedido</span>
              </div>
            </button>
          </div>
        `
            : ""
        }

        <!-- Bottom Sheet Drawer de Carrito -->
        ${isCartOpen ? renderCartDrawer(user, cartItems, totalEstimado) : ""}
      </div>
    `;

    // Restaurar posición de scroll del drawer
    if (isCartOpen) {
      const newScrollEl = container.querySelector("#cart-drawer-items-list");
      if (newScrollEl && savedDrawerScroll > 0) {
        newScrollEl.scrollTop = savedDrawerScroll;
      }
      isDrawerFirstOpen = false;
    }

    attachCatalogListeners(user);
    if (isCartOpen) {
      attachCartDrawerListeners(user);
    }
  }

  // Generador de tarjetas de productos optimizadas para mobile
  function renderProductCardsHTML(products, cart) {
    if (products.length === 0) {
      return `
        <div class="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">Sin coincidencias</span>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No encontramos productos con ese nombre</p>
          <button id="btn-reset-filter" class="mt-3 min-h-[44px] px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 tap-feedback border border-transparent dark:border-slate-700">
            Limpiar búsqueda
          </button>
        </div>
      `;
    }

    return products
      .map((product) => {
        const cartItem = cart[product.id];
        const currentQty = cartItem ? cartItem.cantidad : 0;
        const step = product.paso || (product.unidad_medida === "KG" ? 0.5 : 1);
        const isKg = product.unidad_medida === "KG";
        const unitLabel = isKg ? "kg" : "u.";
        const unitSubtitle = isKg ? "Por kilo" : "Por unidad";
        const inCart = currentQty > 0;
        const itemSubtotal = inCart ? Math.round(currentQty * product.precio) : 0;

        return `
          <div class="relative bg-white dark:bg-slate-900 rounded-2xl p-4 border transition ${
            inCart ? "border-emerald-500/60 bg-emerald-50/15 dark:bg-emerald-950/20 shadow-xs" : "border-slate-200/80 dark:border-slate-800 shadow-xs"
          } ${!product.disponible ? "opacity-40 grayscale pointer-events-none" : ""}">

            <!-- Botón de Descarte Rápido '×' (Visible sólo si Qty > 0, 44x44px táctil) -->
            ${
              inCart && product.disponible
                ? `
              <button
                type="button"
                data-quick-discard-id="${product.id}"
                class="btn-quick-discard absolute top-2.5 right-2.5 min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 active:bg-rose-100 dark:active:bg-rose-900/60 transition tap-feedback touch-target z-10"
                title="Quitar ${product.nombre} del pedido"
                aria-label="Quitar ${product.nombre} del pedido"
              >
                <span class="text-xl font-bold leading-none select-none" aria-hidden="true">×</span>
              </button>
            `
                : ""
            }

            <div class="flex items-start justify-between gap-3 ${inCart ? "pr-11" : ""}">
              <!-- Info Producto -->
              <div class="flex-1 min-w-0 pr-1">
                <div class="flex items-center flex-wrap gap-1 mb-1">
                  <span class="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    ${product.categoria}
                  </span>
                  <span class="text-[10px] text-slate-300 dark:text-slate-600 font-bold select-none">/</span>
                  <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    ${unitSubtitle}
                  </span>
                  ${
                    inCart
                      ? `<span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">En pedido</span>`
                      : ""
                  }
                </div>

                <h3 class="font-extrabold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
                  ${product.nombre}
                </h3>

                <p class="text-[11px] text-slate-400 dark:text-slate-400 truncate mt-0.5">
                  ${product.detalle || ""}
                </p>

                <div class="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
                  <span class="text-base font-black text-emerald-700 dark:text-emerald-400">
                    $${product.precio.toLocaleString("es-AR")}
                  </span>
                  <span class="text-xs text-slate-400 dark:text-slate-500 font-medium">/ ${unitLabel}</span>
                  ${
                    inCart
                      ? `<span class="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">($${itemSubtotal.toLocaleString("es-AR")})</span>`
                      : ""
                  }
                </div>

                ${
                  !product.disponible
                    ? `<span class="inline-block text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mt-1">Sin Stock</span>`
                    : ""
                }
              </div>

              <!-- Selector de Cantidad / Botón Táctil -->
              <div class="shrink-0 flex flex-col items-end">
                ${
                  product.disponible
                    ? !inCart
                      ? `
                      <button
                        data-add-id="${product.id}"
                        data-step="${step}"
                        class="btn-add-initial min-h-[44px] min-w-[96px] bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border dark:border-slate-700 text-white font-bold px-3 py-2.5 rounded-xl text-xs transition tap-feedback touch-target flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <span>Agregar</span>
                        <span class="text-xs font-bold">+</span>
                      </button>
                    `
                      : `
                      <div class="flex items-center bg-emerald-600 text-white rounded-xl p-0.5 shadow-xs min-h-[44px]">
                        <button
                          type="button"
                          data-dec-id="${product.id}"
                          data-step="${step}"
                          class="btn-qty-dec min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg hover:bg-emerald-700 active:scale-90 text-base font-black transition tap-feedback touch-target"
                          title="Restar"
                          aria-label="Restar cantidad"
                        >
                          −
                        </button>
                        <span class="px-2 text-xs font-black min-w-[40px] text-center tracking-tight select-none">
                          ${currentQty} ${unitLabel}
                        </span>
                        <button
                          type="button"
                          data-inc-id="${product.id}"
                          data-step="${step}"
                          class="btn-qty-inc min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg hover:bg-emerald-700 active:scale-90 text-base font-black transition tap-feedback touch-target"
                          title="Sumar"
                          aria-label="Sumar cantidad"
                        >
                          +
                        </button>
                      </div>
                    `
                    : ""
                }
              </div>
            </div>

            <!-- Accesos rápidos de peso para productos pesables (Disponibles en todo momento) -->
            ${
              product.disponible && isKg
                ? `
              <div class="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ajuste rápido:</span>
                <div class="flex items-center gap-1.5">
                  <button
                    data-quick-weight-id="${product.id}"
                    data-weight="0.5"
                    class="btn-quick-weight min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold transition tap-feedback touch-target ${
                      currentQty === 0.5 ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700/60"
                    }"
                  >
                    500g
                  </button>
                  <button
                    data-quick-weight-id="${product.id}"
                    data-weight="1"
                    class="btn-quick-weight min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold transition tap-feedback touch-target ${
                      currentQty === 1 ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700/60"
                    }"
                  >
                    1 kg
                  </button>
                  <button
                    data-quick-weight-id="${product.id}"
                    data-weight="2"
                    class="btn-quick-weight min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold transition tap-feedback touch-target ${
                      currentQty === 2 ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700/60"
                    }"
                  >
                    2 kg
                  </button>
                </div>
              </div>
            `
                : ""
            }
          </div>
        `;
      })
      .join("");
  }

  function attachCatalogListeners(user) {
    container.querySelector("#btn-banner-active-order")?.addEventListener("click", () => {
      viewingActiveOrder = true;
      update();
    });

    container.querySelector("#btn-change-user")?.addEventListener("click", () => {
      store.logoutUser();
      update();
    });

    container.querySelector("#btn-header-cart")?.addEventListener("click", () => {
      const { totalItems } = store.getCartSummary();
      if (totalItems > 0) {
        isCartOpen = true;
        isDrawerFirstOpen = true;
        renderCatalog();
      }
    });

    // Búsqueda en tiempo real sin recargar todo el header
    const searchInput = container.querySelector("#search-input");
    searchInput?.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      const products = store.getProducts();
      const cart = store.getCart();
      const filtered = products.filter((p) => {
        const matchesCategory = selectedCategory === "Todos" || p.categoria === selectedCategory;
        const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase().trim());
        return matchesCategory && matchesSearch;
      });

      const listContainer = container.querySelector("#products-list-container");
      if (listContainer) {
        listContainer.innerHTML = renderProductCardsHTML(filtered, cart);
        attachProductItemListeners();
      }
    });

    container.querySelector("#btn-clear-search")?.addEventListener("click", () => {
      searchQuery = "";
      renderCatalog();
    });

    container.querySelector("#btn-reset-filter")?.addEventListener("click", () => {
      searchQuery = "";
      selectedCategory = "Todos";
      renderCatalog();
    });

    container.querySelectorAll(".category-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedCategory = btn.dataset.category;
        renderCatalog();
        const activePill = container.querySelector(`.category-pill[data-category="${selectedCategory}"]`);
        if (activePill && typeof activePill.scrollIntoView === "function") {
          activePill.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
        }
      });
    });

    container.querySelector("#btn-open-cart")?.addEventListener("click", () => {
      isCartOpen = true;
      isDrawerFirstOpen = true;
      renderCatalog();
    });

    attachProductItemListeners();
  }

  function attachProductItemListeners() {
    container.querySelectorAll(".btn-add-initial, .btn-qty-inc").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch {} }
        const id = btn.dataset.addId || btn.dataset.incId;
        const step = Number(btn.dataset.step) || 0.5;
        store.addToCart(id, step);
      });
    });

    container.querySelectorAll(".btn-qty-dec").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch {} }
        const id = btn.dataset.decId;
        const step = Number(btn.dataset.step) || 0.5;
        store.addToCart(id, -step);
      });
    });

    container.querySelectorAll(".btn-quick-discard, .btn-remove-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch {} }
        const id = btn.dataset.quickDiscardId || btn.dataset.removeId;
        store.removeFromCart(id);
      });
    });

    container.querySelectorAll(".btn-quick-weight").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch {} }
        const id = btn.dataset.quickWeightId;
        const weight = Number(btn.dataset.weight);
        store.setCartQuantity(id, weight);
      });
    });
  }

  // ========================================================
  // 3. BOTTOM SHEET / DRAWER DE CARRITO & CHECKOUT
  // ========================================================
  function renderCartDrawer(user, items, totalEstimado) {
    const isDelivery = deliveryMode === "DELIVERY";
    const isEmpty = items.length === 0;

    return `
      <!-- Backdrop con cierre al tocar fondo -->
      <div id="cart-drawer-backdrop" class="fixed inset-0 z-40 bg-slate-950/70 dark:bg-black/80 backdrop-blur-xs flex items-end justify-center animate-fade-in">
        <div id="cart-drawer-sheet" class="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl max-h-[85vh] max-h-[85dvh] flex flex-col shadow-2xl ${
          isDrawerFirstOpen ? "animate-slide-up" : ""
        } border-t border-slate-200 dark:border-slate-800">

          <!-- Handle bar táctil -->
          <div class="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3"></div>

          <!-- Header Carrito con botón de cierre accesible (44x44px) y toggle de tema -->
          <div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 class="font-black text-slate-900 dark:text-white text-lg tracking-tight">Tu Pedido</h2>
              <p class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Revisá las cantidades antes de confirmar</p>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="theme-toggle-btn min-h-[44px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition tap-feedback flex items-center gap-1 text-xs font-bold touch-target"
                title="Cambiar tema claro / oscuro"
                aria-label="Cambiar tema claro u oscuro"
              >
                <span>Tema:</span>
                <span class="theme-label font-black">${store.getTheme() === "dark" ? "Oscuro" : "Claro"}</span>
              </button>
              <button
                id="btn-close-cart"
                class="min-h-[44px] px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 flex items-center justify-center font-bold text-xs tap-feedback touch-target border border-transparent dark:border-slate-700"
                title="Cerrar pedido"
              >
                Cerrar
              </button>
            </div>
          </div>

          <!-- Lista de Ítems en Carrito con Controles Directos -->
          <div id="cart-drawer-items-list" class="p-5 overflow-y-auto space-y-3 flex-1 overscroll-contain">
            ${
              isEmpty
                ? `
                <div class="text-center py-12 px-4">
                  <span class="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 mb-2">Pedido Vacío</span>
                  <h4 class="font-extrabold text-slate-800 dark:text-slate-200 text-sm">Tu pedido no tiene productos</h4>
                  <p class="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">Seleccioná frutas y verduras del catálogo para coordinar el pesaje en balanza.</p>
                  <button
                    id="btn-drawer-empty-back"
                    type="button"
                    class="mt-4 min-h-[44px] px-5 py-2.5 bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold rounded-xl transition tap-feedback shadow-sm"
                  >
                    Volver al Catálogo
                  </button>
                </div>
              `
                : items
                    .map(
                      (item) => `
                <div class="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div class="flex-1 min-w-0 pr-1">
                    <span class="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      ${item.categoria || "Producto"}
                    </span>
                    <h4 class="font-extrabold text-slate-900 dark:text-white text-sm truncate mt-0.5">${item.nombre}</h4>
                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span class="font-black text-sm text-slate-900 dark:text-white">$${item.subtotal_estimado.toLocaleString("es-AR")}</span>
                      <span class="text-xs text-slate-400 dark:text-slate-500 font-medium">($${item.precio_unitario.toLocaleString("es-AR")}/${item.unidad_medida === "KG" ? "kg" : "u."})</span>
                    </div>
                  </div>

                  <!-- Stepper en Carrito y Botón con la cruz '×' accesible (44x44px touch-target) -->
                  <div class="flex items-center gap-2 shrink-0">
                    <div class="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-xs min-h-[44px]">
                      <button
                        type="button"
                        data-drawer-dec="${item.producto_id}"
                        class="min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 rounded-lg font-black text-base tap-feedback touch-target"
                        title="Restar cantidad"
                        aria-label="Restar cantidad"
                      >
                        −
                      </button>
                      <span class="px-1 text-xs font-black min-w-[32px] text-center text-slate-900 dark:text-white select-none">
                        ${item.cantidad}
                      </span>
                      <button
                        type="button"
                        data-drawer-inc="${item.producto_id}"
                        class="min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 rounded-lg font-black text-base tap-feedback touch-target"
                        title="Sumar cantidad"
                        aria-label="Sumar cantidad"
                      >
                        +
                      </button>
                    </div>

                    <!-- Botón tipográfico con cruz '×' para eliminar el ítem completo de 1 toque (44x44px touch-target) -->
                    <button
                      type="button"
                      data-drawer-remove="${item.producto_id}"
                      class="min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:active:bg-rose-900/80 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 transition tap-feedback shadow-xs shrink-0 touch-target"
                      title="Quitar ${item.nombre} del pedido"
                      aria-label="Quitar ${item.nombre} del pedido"
                    >
                      <span class="text-xl font-bold leading-none select-none" aria-hidden="true">×</span>
                    </button>
                  </div>
                </div>
              `
                    )
                    .join("")
            }

            ${
              !isEmpty
                ? `
            <!-- Selector de Forma de Entrega Segmentado -->
            <div class="pt-3">
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Método de Entrega
              </label>
              <div class="grid grid-cols-2 gap-2">
                <label id="delivery-card-retiro" class="flex flex-col p-3.5 border rounded-2xl cursor-pointer transition tap-feedback ${
                  !isDelivery
                    ? "border-slate-900 dark:border-emerald-500 bg-slate-900 dark:bg-slate-800 text-white shadow-xs"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                }">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-black">Retiro en Local</span>
                    <input type="radio" name="delivery-mode" value="RETIRO" ${!isDelivery ? "checked" : ""} class="accent-emerald-500" />
                  </div>
                  <span class="text-[10px] opacity-75 mt-1">Listo en 20-30 min <span class="opacity-60">|</span> Sin costo</span>
                </label>

                <label id="delivery-card-delivery" class="flex flex-col p-3.5 border rounded-2xl cursor-pointer transition tap-feedback ${
                  isDelivery
                    ? "border-slate-900 dark:border-emerald-500 bg-slate-900 dark:bg-slate-800 text-white shadow-xs"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                }">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-black">Envío a Domicilio</span>
                    <input type="radio" name="delivery-mode" value="DELIVERY" ${isDelivery ? "checked" : ""} class="accent-emerald-500" />
                  </div>
                  <span class="text-[10px] opacity-75 mt-1">Cadete a tu puerta</span>
                </label>
              </div>
            </div>

            <!-- Campo Dirección de Envío -->
            <div id="delivery-address-container" class="${isDelivery ? "" : "hidden"} pt-1">
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Dirección exacta de entrega
              </label>
              <input
                type="text"
                id="delivery-address-input"
                value="${deliveryAddress}"
                placeholder="Calle, número, piso y departamento"
                class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-base font-medium outline-none focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 transition"
              />
            </div>

            <!-- Explicación de Pesaje Real Transparente -->
            <div class="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3.5 text-xs text-amber-950 dark:text-amber-200 mt-2">
              <div class="flex items-center gap-1.5 mb-1">
                <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                <span class="font-bold text-[11px] uppercase tracking-wider text-amber-900 dark:text-amber-300">Pesaje en Balanza</span>
              </div>
              <p class="text-[11px] leading-relaxed opacity-90">
                El total indicado es una estimación. En el mostrador se pesan las unidades reales y te notificaremos el comprobante con los gramos exactos y el importe final.
              </p>
            </div>
            `
                : ""
            }
          </div>

          <!-- Footer con Confirmación y Safe Area Pad -->
          <div class="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-b-3xl space-y-3 safe-pb">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider">Total Estimado</span>
                <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Sujeto a balanza</span>
              </div>
              <span class="font-black text-2xl text-slate-900 dark:text-white">$${totalEstimado.toLocaleString("es-AR")}</span>
            </div>

            ${
              isEmpty
                ? `
              <button
                id="btn-confirm-order"
                disabled
                class="w-full min-h-[50px] bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 font-black py-4 rounded-2xl text-sm cursor-not-allowed opacity-60 text-center"
              >
                Pedido Vacío
              </button>
            `
                : `
              <button
                id="btn-confirm-order"
                class="w-full min-h-[50px] bg-slate-950 hover:bg-slate-900 active:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-950/20 text-sm transition tap-feedback flex items-center justify-center gap-2"
              >
                <span>Confirmar Pedido</span>
              </button>
            `
            }
          </div>
        </div>
      </div>
    `;
  }

  function attachCartDrawerListeners(user) {
    // Cerrar al hacer clic en el backdrop
    const backdrop = container.querySelector("#cart-drawer-backdrop");
    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        isCartOpen = false;
        renderCatalog();
      }
    });

    container.querySelector("#btn-close-cart")?.addEventListener("click", () => {
      isCartOpen = false;
      renderCatalog();
    });

    container.querySelector("#btn-drawer-empty-back")?.addEventListener("click", () => {
      isCartOpen = false;
      renderCatalog();
    });

    const addressInput = container.querySelector("#delivery-address-input");
    addressInput?.addEventListener("input", (e) => {
      deliveryAddress = e.target.value;
    });

    // Toggle de entrega sin recrear todo el drawer para no reiniciar el scroll
    const cardRetiro = container.querySelector("#delivery-card-retiro");
    const cardDelivery = container.querySelector("#delivery-card-delivery");
    const addressContainer = container.querySelector("#delivery-address-container");
    const radios = container.querySelectorAll('input[name="delivery-mode"]');

    const selClasses = ["border-slate-900", "dark:border-emerald-500", "bg-slate-900", "dark:bg-slate-800", "text-white", "shadow-xs"];
    const unselClasses = ["border-slate-200", "dark:border-slate-800", "bg-slate-50", "dark:bg-slate-950", "text-slate-700", "dark:text-slate-300"];

    radios.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        deliveryMode = e.target.value;
        const isDel = deliveryMode === "DELIVERY";

        if (isDel) {
          cardDelivery?.classList.add(...selClasses);
          cardDelivery?.classList.remove(...unselClasses);
          cardRetiro?.classList.remove(...selClasses);
          cardRetiro?.classList.add(...unselClasses);
          addressContainer?.classList.remove("hidden");
          addressInput?.focus();
        } else {
          cardRetiro?.classList.add(...selClasses);
          cardRetiro?.classList.remove(...unselClasses);
          cardDelivery?.classList.remove(...selClasses);
          cardDelivery?.classList.add(...unselClasses);
          addressContainer?.classList.add("hidden");
        }
      });
    });

    // Controles directos de cantidad en drawer
    container.querySelectorAll("[data-drawer-inc]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch {} }
        const id = btn.dataset.drawerInc;
        const product = store.getProducts().find((p) => p.id === id);
        const step = product?.paso || (product?.unidad_medida === "KG" ? 0.5 : 1);
        store.addToCart(id, step);
      });
    });

    container.querySelectorAll("[data-drawer-dec]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch {} }
        const id = btn.dataset.drawerDec;
        const product = store.getProducts().find((p) => p.id === id);
        const step = product?.paso || (product?.unidad_medida === "KG" ? 0.5 : 1);
        store.addToCart(id, -step);
      });
    });

    container.querySelectorAll("[data-drawer-remove]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch {} }
        const id = btn.dataset.drawerRemove;
        store.removeFromCart(id);
      });
    });

    const btnConfirm = container.querySelector("#btn-confirm-order");
    btnConfirm?.addEventListener("click", () => {
      const { items } = store.getCartSummary();
      if (items.length === 0) {
        isCartOpen = false;
        renderCatalog();
        return;
      }

      const mode = deliveryMode;
      const finalAddress = mode === "DELIVERY" ? deliveryAddress.trim() : "Retiro en Mostrador";

      if (mode === "DELIVERY" && !finalAddress) {
        alert("Por favor ingresá tu dirección para coordinar el envío a domicilio.");
        addressInput?.focus();
        return;
      }

      if (navigator.vibrate) { try { navigator.vibrate(30); } catch {} }

      const newOrder = store.createOrder({
        cliente: user,
        tipo_entrega: mode,
        direccion_entrega: finalAddress
      });

      if (newOrder) {
        isCartOpen = false;
        isDrawerFirstOpen = true;
        viewingActiveOrder = true;
        update();
      }
    });
  }

  // ========================================================
  // 4. PANTALLA DE SEGUIMIENTO DEL PEDIDO (Timeline y Balanza)
  // ========================================================
  function renderOrderTracking(currentOrder) {
    const isWeighing = currentOrder.estado === "EN_PREPARACION";
    const isReady = currentOrder.estado === "LISTO" || currentOrder.estado === "ENTREGADO";
    const isDelivered = currentOrder.estado === "ENTREGADO";

    let stepNumber = 1;
    let stepTitle = "Pedido Recibido";
    let stepDesc = "El pedido ingresó en la cola del mostrador.";

    if (isWeighing) {
      stepNumber = 2;
      stepTitle = "En Balanza";
      stepDesc = "El operario está pesando cada uno de tus productos.";
    } else if (isReady && !isDelivered) {
      stepNumber = 3;
      stepTitle = "Listo para Entrega";
      stepDesc =
        currentOrder.tipo_entrega === "DELIVERY"
          ? "El pedido fue pesado y el cadete está listo para despachar."
          : "El pedido fue pesado y podés pasar a retirarlo por el local.";
    } else if (isDelivered) {
      stepNumber = 4;
      stepTitle = "Entregado y Cobrado";
      stepDesc = "Pedido finalizado exitosamente. ¡Muchas gracias por tu compra!";
    }

    const waHelpRawText = `Hola! Consulto por mi pedido #${currentOrder.id} a nombre de ${currentOrder.cliente.nombre}.`;

    container.innerHTML = `
      <div class="max-w-md mx-auto p-4 pt-4 pb-28 safe-pb">

        <!-- Botón para volver a ver catálogo sin perder el pedido y toggle de tema -->
        <div class="flex items-center justify-between mb-3">
          <button
            id="btn-back-to-catalog"
            class="min-h-[44px] px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition tap-feedback flex items-center gap-1.5 touch-target"
          >
            <span>Volver al Catálogo</span>
          </button>

          <button
            type="button"
            class="theme-toggle-btn min-h-[44px] px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition tap-feedback flex items-center gap-1.5 touch-target"
            title="Cambiar tema claro / oscuro"
            aria-label="Cambiar tema claro u oscuro"
          >
            <span>Tema:</span>
            <span class="theme-label font-black">${store.getTheme() === "dark" ? "Oscuro" : "Claro"}</span>
          </button>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/40 border border-slate-200/80 dark:border-slate-800 text-left">

          <!-- Encabezado de la Orden -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Comprobante Digital</span>
              <h2 class="text-xl font-black text-slate-900 dark:text-white tracking-tight">Pedido #${currentOrder.id}</h2>
            </div>
            <span class="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
              isDelivered
                ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                : isReady
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse"
                : isWeighing
                ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 animate-pulse"
                : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
            }">
              ${currentOrder.estado}
            </span>
          </div>

          <!-- Línea de Progreso (Timeline Minimalista de 4 Pasos) -->
          <div class="my-5">
            <div class="grid grid-cols-4 gap-1.5 text-center">
              <div class="h-1.5 rounded-full ${stepNumber >= 1 ? "bg-slate-900 dark:bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"}"></div>
              <div class="h-1.5 rounded-full ${stepNumber >= 2 ? (stepNumber > 2 ? "bg-slate-900 dark:bg-emerald-500" : "bg-blue-600") : "bg-slate-200 dark:bg-slate-800"}"></div>
              <div class="h-1.5 rounded-full ${stepNumber >= 3 ? (stepNumber > 3 ? "bg-slate-900 dark:bg-emerald-500" : "bg-emerald-600") : "bg-slate-200 dark:bg-slate-800"}"></div>
              <div class="h-1.5 rounded-full ${stepNumber >= 4 ? "bg-slate-900 dark:bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"}"></div>
            </div>
            <div class="mt-3">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">${stepTitle}</h3>
                ${
                  isWeighing || (isReady && !isDelivered)
                    ? `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>`
                    : ""
                }
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">${stepDesc}</p>
            </div>
          </div>

          <!-- Resumen Financiero -->
          <div class="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Entrega:</span>
              <strong class="text-slate-800 dark:text-slate-200 font-semibold">
                ${currentOrder.tipo_entrega === "DELIVERY" ? "Envío a Domicilio" : "Retiro en Mostrador"}
              </strong>
            </div>

            ${
              currentOrder.tipo_entrega === "DELIVERY"
                ? `
              <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Destino:</span>
                <span class="text-slate-800 dark:text-slate-200 font-medium text-right">${currentOrder.direccion_entrega}</span>
              </div>
            `
                : ""
            }

            ${
              isReady && currentOrder.total_real !== null
                ? `
              <div class="pt-2.5 border-t border-slate-200 dark:border-slate-800">
                <div class="flex justify-between items-center text-xs text-slate-400 dark:text-slate-500">
                  <span>Estimado inicial:</span>
                  <span class="line-through">$${currentOrder.total_estimado.toLocaleString("es-AR")}</span>
                </div>
                <div class="flex justify-between items-center mt-1">
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total Final en Balanza:</span>
                  <span class="font-black text-2xl text-emerald-700 dark:text-emerald-400">$${currentOrder.total_real.toLocaleString("es-AR")}</span>
                </div>
              </div>
            `
                : `
              <div class="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">Total Estimado:</span>
                <span class="font-black text-xl text-slate-900 dark:text-white">$${currentOrder.total_estimado.toLocaleString("es-AR")}</span>
              </div>
            `
            }
          </div>

          <!-- Desglose Ítems Pesados -->
          <div class="mt-5">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Detalle de Productos</h4>
            <div class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              ${currentOrder.items
                .map((item) => {
                  const pesoTexto =
                    item.peso_real !== null
                      ? `${item.peso_real} ${item.unidad_medida === "KG" ? "kg" : "u."} (pesado)`
                      : `${item.cantidad_solicitada} ${item.unidad_medida === "KG" ? "kg" : "u."} (aprox)`;
                  return `
                  <div class="py-2.5 flex items-center justify-between gap-2 ${item.sin_stock ? "opacity-40 line-through" : ""}">
                    <div>
                      <div class="flex items-center gap-1.5">
                        <span class="font-bold text-slate-800 dark:text-slate-200 text-xs">${item.nombre}</span>
                        ${item.sin_stock ? `<span class="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase">Sin Stock</span>` : ""}
                      </div>
                      <span class="text-[11px] text-slate-400 dark:text-slate-500 block">${pesoTexto}</span>
                    </div>
                    <strong class="text-slate-900 dark:text-white font-bold text-xs">
                      $${(item.subtotal || 0).toLocaleString("es-AR")}
                    </strong>
                  </div>
                `;
                })
                .join("")}
            </div>
          </div>

          <!-- Botón de consulta al local por WhatsApp (simulado en Modo Demo) -->
          <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              type="button"
              id="btn-wa-help"
              class="w-full min-h-[44px] bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:bg-emerald-200 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold py-2.5 px-3 rounded-xl text-xs transition tap-feedback flex items-center justify-center gap-1.5"
            >
              <span>${store.isDemo() ? "Simular consulta por WhatsApp (Demo)" : "Consultar al local por WhatsApp"}</span>
            </button>
            <p id="wa-help-feedback" class="hidden text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-center"></p>
          </div>

          <!-- Acciones de Seguimiento -->
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              id="btn-new-order"
              class="w-full min-h-[46px] py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 text-slate-800 dark:text-slate-200 border border-transparent dark:border-slate-700 font-bold rounded-xl text-xs transition tap-feedback"
            >
              Realizar Otro Pedido
            </button>
          </div>
        </div>
      </div>
    `;

    container.querySelector("#btn-back-to-catalog")?.addEventListener("click", () => {
      viewingActiveOrder = false;
      update();
    });

    container.querySelector("#btn-wa-help")?.addEventListener("click", () => {
      const business = store.getBusinessProfile();
      const res = store.sendWhatsAppMessage({
        to: business.whatsapp,
        text: waHelpRawText,
        kind: "client_help"
      });
      const fb = container.querySelector("#wa-help-feedback");
      if (fb && res.simulated) {
        fb.textContent = `Consulta simulada en Modo Demo (destinatario sintético ${business.whatsappDisplay || business.whatsapp}). No se envió ningún mensaje real.`;
        fb.classList.remove("hidden");
      }
    });

    container.querySelector("#btn-new-order")?.addEventListener("click", () => {
      store.setActiveOrderId(null);
      viewingActiveOrder = false;
      update();
    });
  }

  // Suscripción reactiva al store
  const unsubscribe = store.subscribe((event) => {
    if (
      event === "cart_changed" ||
      event === "products_changed" ||
      event === "orders_changed" ||
      event === "active_order_changed" ||
      event === "storage_sync" ||
      event === "user_changed"
    ) {
      update();
    }
  });

  update();
  return () => unsubscribe();
}

  // ==========================================

  // 4. VISTA OPERARIO (BALANZA Y MOSTRADOR)

  // ==========================================

// Convierte automáticamente entradas en gramos sin punto (ej: 2150 -> 2.15 kg, 850 -> 0.85 kg)
function parseOperatorWeight(rawInput, isWeight = true) {
  if (rawInput === undefined || rawInput === null) return null;
  const str = String(rawInput).trim().replace(",", ".");
  if (str === "") return null;
  const num = Number(str);
  if (isNaN(num) || num <= 0) return null;

  if (!isWeight) return Math.round(num);

  // Si es producto pesable y el operario tipeó un entero >= 50 sin punto decimal (ej: 2150, 850, 500)
  // lo interpretamos automáticamente como gramos y lo convertimos a kilos (2150 g -> 2.15 kg)
  if (!str.includes(".") && num >= 50) {
    return Number((num / 1000).toFixed(3));
  }
  return Number(num.toFixed(3));
}

function renderOperatorView(container) {
  let activeTab = "PENDIENTE"; // PENDIENTE | EN_PREPARACION | LISTO | ENTREGADO
  let editingOrderId = null; // ID del pedido que se está editando en modal
  let addingProductOrderId = null; // ID del pedido que tiene abierto el desplegable de agregar ítem

  function update() {
    container.innerHTML = "";
    const orders = store.getOrders();

    const counts = {
      PENDIENTE: orders.filter((o) => o.estado === "PENDIENTE").length,
      EN_PREPARACION: orders.filter((o) => o.estado === "EN_PREPARACION").length,
      LISTO: orders.filter((o) => o.estado === "LISTO").length,
      ENTREGADO: orders.filter((o) => o.estado === "ENTREGADO").length
    };

    container.innerHTML = `
      <div class="max-w-2xl mx-auto pb-24 overflow-x-hidden safe-pb">
        <!-- Header del Mostrador con sticky-header-offset -->
        <header class="sticky sticky-header-offset z-20 bg-slate-900 text-white px-4 py-3 shadow-md border-b border-slate-800">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Puesto de Balanza</span>
              <h1 class="font-extrabold text-sm leading-tight text-white">Mostrador & Balanza</h1>
              <p class="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Recepción en vivo activa
              </p>
            </div>

            <!-- Botones de Acción de Cabecera -->
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="theme-toggle-btn min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700 transition tap-feedback touch-target"
                title="Cambiar tema claro / oscuro"
                aria-label="Cambiar tema claro u oscuro"
              >
                <span>Tema:</span>
                <span class="theme-label font-black">${store.getTheme() === "dark" ? "Oscuro" : "Claro"}</span>
              </button>
              <button
                id="btn-test-sound"
                title="Probar timbre de pedido"
                class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition tap-feedback touch-target"
              >
                <span>Timbre</span>
              </button>
              <button
                id="btn-operator-logout"
                title="Salir y bloquear"
                class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold border border-rose-800/60 transition tap-feedback touch-target flex items-center justify-center"
              >
                Salir
              </button>
            </div>
          </div>

          <!-- Pestañas del Kanban (Mobile-First) -->
          <div class="grid grid-cols-4 gap-1 mt-3 bg-slate-800/90 p-1 rounded-2xl text-center">
            <button
              data-tab="PENDIENTE"
              class="tab-btn min-h-[48px] py-1.5 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col items-center justify-center leading-tight tap-feedback touch-target ${
                activeTab === "PENDIENTE" ? "bg-amber-400 text-slate-950 font-black shadow-xs" : "text-slate-400 hover:text-white"
              }"
            >
              <span>Entrantes</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded-full mt-0.5 ${
                activeTab === "PENDIENTE" ? "bg-amber-600/30 text-slate-950 font-black" : "bg-slate-700 text-slate-300"
              }">${counts.PENDIENTE}</span>
            </button>

            <button
              data-tab="EN_PREPARACION"
              class="tab-btn min-h-[48px] py-1.5 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col items-center justify-center leading-tight tap-feedback touch-target ${
                activeTab === "EN_PREPARACION" ? "bg-blue-600 text-white font-black shadow-xs" : "text-slate-400 hover:text-white"
              }"
            >
              <span>En Balanza</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded-full mt-0.5 ${
                activeTab === "EN_PREPARACION" ? "bg-blue-800 text-white font-black" : "bg-slate-700 text-slate-300"
              }">${counts.EN_PREPARACION}</span>
            </button>

            <button
              data-tab="LISTO"
              class="tab-btn min-h-[48px] py-1.5 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col items-center justify-center leading-tight tap-feedback touch-target ${
                activeTab === "LISTO" ? "bg-emerald-600 text-white font-black shadow-xs" : "text-slate-400 hover:text-white"
              }"
            >
              <span>Listos</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded-full mt-0.5 ${
                activeTab === "LISTO" ? "bg-emerald-800 text-white font-black" : "bg-slate-700 text-slate-300"
              }">${counts.LISTO}</span>
            </button>

            <button
              data-tab="ENTREGADO"
              class="tab-btn min-h-[48px] py-1.5 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col items-center justify-center leading-tight tap-feedback touch-target ${
                activeTab === "ENTREGADO" ? "bg-slate-700 text-white font-black shadow-xs" : "text-slate-400 hover:text-white"
              }"
            >
              <span>Cobrados</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded-full mt-0.5 bg-slate-700 text-slate-300">${counts.ENTREGADO}</span>
            </button>
          </div>
        </header>

        <!-- Contenido según la pestaña activa -->
        <main class="p-4">
          ${renderTabContent(orders)}
        </main>

        <!-- Modal de Edición de Pedido -->
        ${editingOrderId ? renderEditModal(orders.find((o) => o.id === editingOrderId)) : ""}
      </div>
    `;

    // Listeners del header
    container.querySelector("#btn-test-sound")?.addEventListener("click", () => {
      store.playAudioAlert();
    });

    container.querySelector("#btn-operator-logout")?.addEventListener("click", () => {
      store.lockStaff();
      window.location.href = "?view=cliente";
    });

    container.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(10); } catch {} }
        activeTab = btn.dataset.tab;
        update();
      });
    });

    attachActions(orders);
  }

  // --- Render según Pestaña ---
  function renderTabContent(orders) {
    const tabOrders = orders.filter((o) => o.estado === activeTab);

    if (tabOrders.length === 0) {
      return `
        <div class="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">Sin órdenes</span>
          <h3 class="font-bold text-slate-700 dark:text-slate-200 text-sm">No hay pedidos en esta columna</h3>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Los nuevos pedidos ingresarán automáticamente aquí en tiempo real.</p>
        </div>
      `;
    }

    // 1. Pestaña PENDIENTES
    if (activeTab === "PENDIENTE") {
      return `
        <div class="space-y-3">
          ${tabOrders
            .map((order) => {
              const itemsList = order.items
                .map((i) => `${i.cantidad_solicitada}${i.unidad_medida === "KG" ? "kg" : "u"} ${i.nombre}`)
                .join(" · ");

              return `
              <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs transition">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-base font-black text-slate-900 dark:text-white">#${order.id}</span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        order.tipo_entrega === "DELIVERY"
                          ? "bg-slate-900 dark:bg-slate-800 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }">
                        ${order.tipo_entrega === "DELIVERY" ? "Envío a Domicilio" : "Retiro en Local"}
                      </span>
                    </div>
                    <h3 class="font-extrabold text-slate-900 dark:text-white text-sm mt-1.5">${order.cliente.nombre}</h3>
                    <p class="text-xs text-slate-400 dark:text-slate-500">${order.cliente.telefono} · ${timeAgo(order.fecha)}</p>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-wider">Estimado</span>
                    <span class="font-black text-base text-slate-900 dark:text-white">$${order.total_estimado.toLocaleString("es-AR")}</span>
                  </div>
                </div>

                <!-- Resumen de productos solicitados -->
                <div class="mt-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                  <span class="font-bold text-slate-700 dark:text-slate-300 block mb-0.5 text-[11px] uppercase tracking-wider">Productos solicitados (${order.items.length}):</span>
                  <p class="leading-relaxed">${itemsList || "Sin productos"}</p>
                </div>

                <!-- Acciones Principales y de Gestión -->
                <div class="mt-3 space-y-2">
                  <button
                    data-start-id="${order.id}"
                    class="btn-start-prep w-full min-h-[48px] bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-xs transition tap-feedback touch-target flex items-center justify-center gap-2"
                  >
                    <span>Tomar y Pesar en Balanza</span>
                  </button>

                  <div class="grid grid-cols-2 gap-2">
                    <button
                      data-edit-order-id="${order.id}"
                      class="btn-open-edit min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition tap-feedback touch-target border border-transparent dark:border-slate-700"
                    >
                      <span>Editar datos</span>
                    </button>
                    <button
                      data-cancel-order-id="${order.id}"
                      data-delete-order-id="${order.id}"
                      class="btn-cancel-order min-h-[44px] bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition tap-feedback touch-target border border-transparent dark:border-rose-900/50"
                    >
                      <span>Cancelar pedido</span>
                    </button>
                  </div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      `;
    }

    // 2. Pestaña EN PREPARACIÓN (Módulo de Pesaje en Balanza)
    if (activeTab === "EN_PREPARACION") {
      const activeProducts = store.getProducts().filter((p) => p.disponible);

      return `
        <div class="space-y-4">
          ${tabOrders
            .map((order) => {
              const currentTotal = order.items
                .filter((i) => !i.sin_stock)
                .reduce((sum, i) => sum + (i.peso_real !== null ? i.subtotal : Math.round(i.cantidad_solicitada * i.precio_unitario)), 0);

              const isAddingProduct = addingProductOrderId === order.id;

              return `
              <div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border-2 border-blue-200/80 dark:border-blue-900/60 shadow-md">

                <!-- Header de la tarjeta -->
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span class="text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-widest uppercase">Pesaje Activo</span>
                    <h2 class="text-lg font-black text-slate-900 dark:text-white">Pedido #${order.id} · ${order.cliente.nombre}</h2>
                    <p class="text-xs text-slate-400 dark:text-slate-500">
                      ${order.tipo_entrega === "DELIVERY" ? order.direccion_entrega : "Retiro por mostrador"}
                    </p>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider block">Total en Balanza</span>
                    <span id="order-balanza-total-${order.id}" class="text-2xl font-black text-emerald-700 dark:text-emerald-400">$${Math.round(currentTotal).toLocaleString("es-AR")}</span>
                  </div>
                </div>

                <!-- Lista de Pesaje Ítem por Ítem -->
                <div class="mt-4 space-y-2.5">
                  ${
                    order.items.length === 0
                      ? `
                    <div class="p-4 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      No hay productos en este pedido. Podés agregar uno abajo.
                    </div>
                  `
                      : order.items
                          .map((item, idx) => {
                            const isWeight = item.unidad_medida === "KG";
                            const currentVal = item.peso_real !== null ? item.peso_real : "";
                            const subtotalItem = item.peso_real !== null ? item.subtotal : Math.round(item.cantidad_solicitada * item.precio_unitario);
                            const stepFine = isWeight ? 0.1 : 1;

                            return `
                      <div class="item-weigh-card p-3.5 rounded-2xl border transition space-y-3 ${
                        item.sin_stock
                          ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 opacity-60"
                          : item.peso_real !== null
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                      }">
                        <!-- Tier 1: Product info and Sin Stock / Quitar actions -->
                        <div class="flex items-start justify-between gap-2">
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5 mb-0.5">
                              <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                ${item.categoria || (isWeight ? "Por Kilo" : "Por Unidad")}
                              </span>
                              <span class="text-xs text-slate-500 dark:text-slate-400">
                                ($${item.precio_unitario.toLocaleString("es-AR")} / ${isWeight ? "kg" : "u"})
                              </span>
                            </div>
                            <h4 class="font-extrabold text-slate-900 dark:text-white text-base truncate ${item.sin_stock ? "line-through text-rose-600 dark:text-rose-400" : ""}">
                              ${item.nombre}
                            </h4>
                            <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                              Solicitó: <strong class="text-slate-900 dark:text-white font-black">${item.cantidad_solicitada} ${isWeight ? "kg" : "u."}</strong>
                            </p>
                          </div>

                          <!-- Acciones por ítem: Sin Stock y Quitar -->
                          <div class="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              data-toggle-stock-order="${order.id}"
                              data-item-index="${idx}"
                              class="btn-toggle-stock min-h-[44px] px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition tap-feedback touch-target ${
                                item.sin_stock
                                  ? "bg-rose-600 text-white border-rose-600"
                                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:text-rose-600 dark:hover:text-rose-400"
                              }"
                              title="Marcar sin disponibilidad en el cajón"
                            >
                              ${item.sin_stock ? "Anulado" : "Sin Stock"}
                            </button>

                            <button
                              type="button"
                              data-remove-item-order="${order.id}"
                              data-item-index="${idx}"
                              class="btn-remove-item min-h-[44px] min-w-[44px] px-3 py-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 text-xs font-bold rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition tap-feedback touch-target flex items-center justify-center"
                              title="Eliminar este ítem del pedido"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>

                        <!-- Tier 2: Weight controls, steppers (>=44x44px), copy button and subtotal -->
                        ${
                          !item.sin_stock
                            ? `
                          <div class="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-1.5">
                              <!-- Controles de ajuste fino (-0.1 / +0.1 o -1 / +1) -->
                              <button
                                type="button"
                                data-adjust-order="${order.id}"
                                data-item-idx="${idx}"
                                data-delta="${-stepFine}"
                                class="btn-adjust-weight min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 active:bg-slate-400 dark:active:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-xl text-lg font-black transition tap-feedback touch-target shrink-0 border border-transparent dark:border-slate-700"
                                title="Restar ${stepFine}"
                                aria-label="Restar ${stepFine}"
                              >
                                −
                              </button>

                              <div class="relative w-28">
                                <input
                                  type="text"
                                  inputmode="decimal"
                                  data-order-id="${order.id}"
                                  data-item-idx="${idx}"
                                  data-unit="${item.unidad_medida}"
                                  data-price-unit="${item.precio_unitario}"
                                  value="${currentVal}"
                                  placeholder="${isWeight ? 'ej: 2150' : item.cantidad_solicitada}"
                                  class="input-weight w-full min-h-[44px] h-11 text-center py-2 px-2 border-2 rounded-xl font-black text-lg outline-none focus:border-blue-600 transition ${
                                    item.peso_real !== null
                                      ? "border-emerald-500 text-emerald-800 dark:text-emerald-300 bg-emerald-50/20 dark:bg-emerald-950/40"
                                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                  }"
                                  title="${isWeight ? 'Podés ingresar en gramos (ej: 2150) o con punto (2.15)' : 'Cantidad'}"
                                />
                                <span class="absolute right-2.5 top-3 text-xs font-bold text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                                  ${isWeight ? "kg" : "u."}
                                </span>
                              </div>

                              <button
                                type="button"
                                data-adjust-order="${order.id}"
                                data-item-idx="${idx}"
                                data-delta="${stepFine}"
                                class="btn-adjust-weight min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 active:bg-slate-400 dark:active:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-xl text-lg font-black transition tap-feedback touch-target shrink-0 border border-transparent dark:border-slate-700"
                                title="Sumar ${stepFine}"
                                aria-label="Sumar ${stepFine}"
                              >
                                +
                              </button>

                              <!-- Botón rápido para copiar lo solicitado -->
                              <button
                                type="button"
                                data-copy-requested-order="${order.id}"
                                data-item-idx="${idx}"
                                data-requested-val="${item.cantidad_solicitada}"
                                class="btn-copy-requested min-h-[44px] px-2.5 py-2 text-xs font-bold bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 active:bg-slate-400 text-slate-800 dark:text-slate-200 rounded-xl transition tap-feedback touch-target shrink-0 border border-transparent dark:border-slate-700 flex items-center justify-center"
                                title="Copiar cantidad solicitada"
                              >
                                = ${item.cantidad_solicitada}
                              </button>
                            </div>

                            <div class="text-right ml-auto">
                              <span class="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-wider">Subtotal</span>
                              <span id="item-subtotal-${order.id}-${idx}" class="font-black text-base text-slate-900 dark:text-white">$${subtotalItem.toLocaleString("es-AR")}</span>
                            </div>
                          </div>
                        `
                            : ""
                        }
                      </div>
                    `;
                          })
                          .join("")
                  }
                </div>

                <!-- Módulo para Agregar Producto al Pedido -->
                <div class="mt-3">
                  ${
                    isAddingProduct
                      ? `
                    <div class="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Sumar producto al pedido</span>
                        <button id="btn-close-add-product" class="min-h-[44px] min-w-[44px] px-3 py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold flex items-center justify-center tap-feedback touch-target">Cerrar</button>
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Producto</label>
                          <select id="select-new-product" class="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-semibold outline-none focus:border-blue-600 text-slate-900 dark:text-white">
                            ${activeProducts
                              .map(
                                (p) => `
                              <option value="${p.id}" data-unit="${p.unidad_medida}" data-price="${p.precio}">
                                ${p.nombre} ($${p.precio.toLocaleString("es-AR")}/${p.unidad_medida === "KG" ? "kg" : "u"})
                              </option>
                            `
                              )
                              .join("")}
                          </select>
                        </div>

                        <div>
                          <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Cantidad / Peso inicial</label>
                          <div class="flex gap-2">
                            <input
                              type="number"
                              id="input-new-quantity"
                              value="1.0"
                              step="0.5"
                              min="0.1"
                              class="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-black text-center outline-none focus:border-blue-600 text-slate-900 dark:text-white"
                            />
                            <button
                              data-confirm-add-order="${order.id}"
                              class="btn-confirm-add-item min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 rounded-xl text-xs transition tap-feedback touch-target shrink-0 flex items-center justify-center"
                            >
                              Agregar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  `
                      : `
                    <button
                      data-toggle-add-order="${order.id}"
                      class="btn-open-add-product w-full min-h-[44px] py-2.5 px-3 border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 tap-feedback touch-target"
                    >
                      <span>Agregar producto que olvidó el cliente</span>
                    </button>
                  `
                  }
                </div>

                <!-- Cierre de Pesaje y Acciones Secundarias -->
                <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <button
                    data-finish-order-id="${order.id}"
                    class="btn-finish-weighing w-full min-h-[48px] bg-slate-950 hover:bg-slate-900 active:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black py-3 px-4 rounded-xl shadow-lg shadow-slate-950/15 text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition tap-feedback touch-target"
                  >
                    <span>Finalizar Pesaje y Notificar al Cliente</span>
                  </button>

                  <div class="grid grid-cols-2 gap-2">
                    <button
                      data-edit-order-id="${order.id}"
                      class="btn-open-edit min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition tap-feedback touch-target border border-transparent dark:border-slate-700"
                    >
                      <span>Cambiar entrega/datos</span>
                    </button>

                    <button
                      data-cancel-order-id="${order.id}"
                      data-delete-order-id="${order.id}"
                      class="btn-cancel-order min-h-[44px] bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition tap-feedback touch-target border border-transparent dark:border-rose-900/50"
                    >
                      <span>Cancelar pedido</span>
                    </button>
                  </div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      `;
    }

    // 3. Pestaña LISTOS
    if (activeTab === "LISTO") {
      return `
        <div class="space-y-4">
          ${tabOrders
            .map((order) => {
              const waSummary = generateWhatsAppSummary(order);

              return `
              <div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                <div class="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Pesaje Completo
                    </span>
                    <h3 class="text-base font-black text-slate-900 dark:text-white mt-1">#${order.id} · ${order.cliente.nombre}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">${order.cliente.telefono} · ${order.tipo_entrega === "DELIVERY" ? "Envío" : "Retiro"}</p>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-wider">Total Exacto</span>
                    <span class="font-black text-2xl text-emerald-700 dark:text-emerald-400">$${(order.total_real || order.total_estimado).toLocaleString("es-AR")}</span>
                  </div>
                </div>

                <!-- Vista previa del mensaje de WhatsApp -->
                <div class="mt-3 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-line leading-relaxed">
                  ${waSummary}
                </div>

                <div class="grid grid-cols-2 gap-2 mt-4">
                  <button
                    type="button"
                    data-wa-order-id="${order.id}"
                    class="btn-send-wa min-h-[48px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition text-center tap-feedback touch-target"
                  >
                    <span>${store.isDemo() ? "Simular WhatsApp (Demo)" : "Enviar WhatsApp"}</span>
                  </button>
                  <button
                    data-deliver-order-id="${order.id}"
                    class="btn-deliver-order min-h-[48px] bg-slate-950 hover:bg-slate-900 active:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold py-3 px-3 rounded-xl text-xs transition tap-feedback touch-target border border-transparent dark:border-slate-700 flex items-center justify-center"
                  >
                    Marcar Cobrado
                  </button>
                </div>
                <p id="wa-sim-feedback-${order.id}" class="hidden mt-2 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-2 text-center"></p>

                <!-- Opción de Cancelar / Eliminar Pedido Listo -->
                <div class="mt-2 text-right">
                  <button
                    data-cancel-order-id="${order.id}"
                    data-delete-order-id="${order.id}"
                    class="btn-cancel-order min-h-[44px] px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition tap-feedback touch-target inline-flex items-center justify-center"
                  >
                    Cancelar / Anular pedido
                  </button>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      `;
    }

    // 4. Pestaña ENTREGADOS / COBRADOS
    if (activeTab === "ENTREGADO") {
      return `
        <div class="space-y-2.5">
          ${tabOrders
            .map(
              (order) => `
            <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">#${order.id}</span>
                <h4 class="font-extrabold text-slate-900 dark:text-white text-sm">${order.cliente.nombre}</h4>
                <p class="text-xs text-slate-400 dark:text-slate-500">${order.tipo_entrega === "DELIVERY" ? "Envío" : "Retiro"} · ${timeAgo(order.fecha)}</p>
              </div>
              <div class="text-right">
                <span class="font-black text-base text-slate-900 dark:text-white">$${(order.total_real || order.total_estimado).toLocaleString("es-AR")}</span>
                <span class="block text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">Cobrado</span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `;
    }
  }

  // --- Modal de Edición de Pedido ---
  function renderEditModal(order) {
    if (!order) return "";

    return `
      <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Modificar</span>
              <h3 class="font-black text-base text-slate-900 dark:text-white">Pedido #${order.id}</h3>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="theme-toggle-btn min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition tap-feedback touch-target flex items-center gap-1 text-xs font-bold"
                title="Cambiar tema claro / oscuro"
                aria-label="Cambiar tema claro u oscuro"
              >
                <span>Tema:</span>
                <span class="theme-label font-black">${store.getTheme() === "dark" ? "Oscuro" : "Claro"}</span>
              </button>
              <button id="btn-close-edit-modal" class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-xs tap-feedback touch-target border border-transparent dark:border-slate-700">
                Cerrar
              </button>
            </div>
          </div>

          <form id="edit-order-form" class="space-y-3 text-left">
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Nombre del cliente</label>
              <input
                type="text"
                id="edit-name"
                value="${order.cliente.nombre}"
                class="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-semibold outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-slate-800 dark:focus:border-emerald-500 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Teléfono / WhatsApp</label>
              <input
                type="tel"
                id="edit-phone"
                inputmode="numeric"
                pattern="[0-9]{8,15}"
                maxlength="15"
                value="${(order.cliente.telefono || "").replace(/\D/g, "")}"
                class="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-semibold outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-slate-800 dark:focus:border-emerald-500 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Forma de entrega</label>
              <div class="grid grid-cols-2 gap-2">
                <label class="min-h-[44px] flex items-center gap-2 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer has-[:checked]:border-slate-900 dark:has-[:checked]:border-emerald-500 has-[:checked]:bg-slate-50 dark:has-[:checked]:bg-slate-800">
                  <input type="radio" name="edit-delivery-mode" value="RETIRO" ${order.tipo_entrega === "RETIRO" ? "checked" : ""} class="accent-emerald-500" />
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200">Retiro Local</span>
                </label>
                <label class="min-h-[44px] flex items-center gap-2 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer has-[:checked]:border-slate-900 dark:has-[:checked]:border-emerald-500 has-[:checked]:bg-slate-50 dark:has-[:checked]:bg-slate-800">
                  <input type="radio" name="edit-delivery-mode" value="DELIVERY" ${order.tipo_entrega === "DELIVERY" ? "checked" : ""} class="accent-emerald-500" />
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200">Envío Domicilio</span>
                </label>
              </div>
            </div>

            <div id="edit-address-container" class="${order.tipo_entrega === "DELIVERY" ? "" : "hidden"}">
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Dirección de entrega</label>
              <input
                type="text"
                id="edit-address"
                value="${order.direccion_entrega || ""}"
                placeholder="Calle, altura, depto..."
                class="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-semibold outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-slate-800 dark:focus:border-emerald-500 text-slate-900 dark:text-white"
              />
            </div>

            <div class="pt-2 flex gap-2">
              <button
                type="button"
                id="btn-cancel-edit-modal"
                class="flex-1 min-h-[44px] py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition border border-transparent dark:border-slate-700 tap-feedback touch-target flex items-center justify-center"
              >
                Volver
              </button>
              <button
                type="submit"
                class="flex-1 min-h-[44px] py-3 bg-slate-900 hover:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md tap-feedback touch-target flex items-center justify-center"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // Generador de mensaje de WhatsApp
  function generateWhatsAppSummary(order) {
    const itemsLines = order.items
      .filter((i) => !i.sin_stock)
      .map((i) => `- ${i.nombre} (${i.peso_real} ${i.unidad_medida === "KG" ? "kg" : "u"}): $${i.subtotal.toLocaleString("es-AR")}`)
      .join("\n");

    const total = order.total_real || order.total_estimado;

    const business = store.getBusinessProfile();
    const businessName = business.name || "Comercio Demo Nexo";
    const businessAlias = business.alias || "alias.demo.nexo";
    return `Hola ${order.cliente.nombre}. Tu pedido #${order.id} en ${businessName} ya fue pesado y está listo:

${itemsLines}

Total exacto en balanza: $${total.toLocaleString("es-AR")}
${order.tipo_entrega === "DELIVERY" ? "El cadete está coordinado con tu dirección de entrega." : "Ya podés pasar a retirarlo por el mostrador."}

Alias para transferir: ${businessAlias}
(O podés abonar en efectivo al recibir).`;
  }

  // --- Attach Event Listeners ---
  function attachActions(orders) {
    // Tomar y pesar
    container.querySelectorAll(".btn-start-prep").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(20); } catch {} }
        const id = Number(btn.dataset.startId);
        store.updateOrderStatus(id, "EN_PREPARACION");
        activeTab = "EN_PREPARACION";
        update();
      });
    });

    // Cancelar Pedido (Cancelación lógica / soft cancellation preservando historial)
    container.querySelectorAll(".btn-cancel-order").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.cancelOrderId || btn.dataset.deleteOrderId);
        const order = orders.find((o) => o.id === id);
        const clientName = order ? order.cliente.nombre : "este cliente";
        const confirmCancel = confirm(`¿Estás seguro de que querés cancelar el pedido #${id} de ${clientName}?`);
        if (confirmCancel) {
          if (navigator.vibrate) { try { navigator.vibrate(25); } catch {} }
          store.cancelOrder(id);
        }
      });
    });

    // Abrir Modal de Edición
    container.querySelectorAll(".btn-open-edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        editingOrderId = Number(btn.dataset.editOrderId);
        update();
      });
    });

    // Desplegable para Agregar Producto
    container.querySelectorAll(".btn-open-add-product").forEach((btn) => {
      btn.addEventListener("click", () => {
        addingProductOrderId = Number(btn.dataset.toggleAddOrder);
        update();
      });
    });

    const btnCloseAddProduct = container.querySelector("#btn-close-add-product");
    if (btnCloseAddProduct) {
      btnCloseAddProduct.addEventListener("click", () => {
        addingProductOrderId = null;
        update();
      });
    }

    // Confirmar agregar nuevo ítem a la orden
    const btnConfirmAddItem = container.querySelector(".btn-confirm-add-item");
    if (btnConfirmAddItem) {
      btnConfirmAddItem.addEventListener("click", () => {
        const orderId = Number(btnConfirmAddItem.dataset.confirmAddOrder);
        const select = container.querySelector("#select-new-product");
        const inputQty = container.querySelector("#input-new-quantity");
        if (select && inputQty) {
          const productId = select.value;
          const qty = Number(inputQty.value) || 1.0;
          store.addProductToOrder(orderId, productId, qty);
          addingProductOrderId = null;
        }
      });
    }

    // Quitar un ítem específico del pedido
    container.querySelectorAll(".btn-remove-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const orderId = Number(btn.dataset.removeItemOrder);
        const itemIdx = Number(btn.dataset.itemIndex);
        const confirmRemove = confirm("¿Eliminar este producto de la lista?");
        if (confirmRemove) {
          store.removeItemFromOrder(orderId, itemIdx);
        }
      });
    });

    // Ajuste fino con botones + y -
    container.querySelectorAll(".btn-adjust-weight").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(10); } catch {} }
        const orderId = Number(btn.dataset.adjustOrder);
        const itemIdx = Number(btn.dataset.itemIdx);
        const delta = Number(btn.dataset.delta);

        const input = container.querySelector(`.input-weight[data-order-id="${orderId}"][data-item-idx="${itemIdx}"]`);
        if (input) {
          const current = Number(input.value) || Number(input.placeholder) || 0;
          const next = Math.max(0, Number((current + delta).toFixed(2)));
          input.value = next;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          store.updateItemWeight(orderId, itemIdx, next, { notify: false });
        }
      });
    });

    // Botón copiar solicitado (= X.X)
    container.querySelectorAll(".btn-copy-requested").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch {} }
        const orderId = Number(btn.dataset.copyRequestedOrder);
        const itemIdx = Number(btn.dataset.itemIdx);
        const requestedVal = Number(btn.dataset.requestedVal);

        const input = container.querySelector(`.input-weight[data-order-id="${orderId}"][data-item-idx="${itemIdx}"]`);
        if (input) {
          input.value = requestedVal;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          store.updateItemWeight(orderId, itemIdx, requestedVal, { notify: false });
        }
      });
    });

    // Modal de edición - Listeners
    if (editingOrderId) {
      const btnCloseEdit = container.querySelector("#btn-close-edit-modal");
      const btnCancelEdit = container.querySelector("#btn-cancel-edit-modal");
      const editForm = container.querySelector("#edit-order-form");
      const editRadios = container.querySelectorAll('input[name="edit-delivery-mode"]');
      const addressContainer = container.querySelector("#edit-address-container");

      const closeModal = () => {
        editingOrderId = null;
        update();
      };

      if (btnCloseEdit) btnCloseEdit.addEventListener("click", closeModal);
      if (btnCancelEdit) btnCancelEdit.addEventListener("click", closeModal);

      editRadios.forEach((radio) => {
        radio.addEventListener("change", (e) => {
          if (e.target.value === "DELIVERY") {
            addressContainer?.classList.remove("hidden");
          } else {
            addressContainer?.classList.add("hidden");
          }
        });
      });

      const editPhoneInput = container.querySelector("#edit-phone");
      editPhoneInput?.addEventListener("keydown", (e) => {
        const allowedKeys = [
          "Backspace", "Tab", "Enter", "Escape", "Delete",
          "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
          "Home", "End"
        ];
        if (allowedKeys.includes(e.key)) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (!/^[0-9]$/.test(e.key)) {
          e.preventDefault();
        }
      });
      editPhoneInput?.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, "");
      });
      editPhoneInput?.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData)?.getData("text") || "";
        const digits = text.replace(/\D/g, "");
        if (!digits) return;
        const start = editPhoneInput.selectionStart || 0;
        const end = editPhoneInput.selectionEnd || 0;
        const cur = editPhoneInput.value;
        editPhoneInput.value = (cur.slice(0, start) + digits + cur.slice(end)).slice(0, 15);
      });

      if (editForm) {
        editForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const name = container.querySelector("#edit-name")?.value.trim() || "";
          const phone = (container.querySelector("#edit-phone")?.value || "").replace(/\D/g, "").trim();
          const modeRadio = container.querySelector('input[name="edit-delivery-mode"]:checked');
          const mode = modeRadio ? modeRadio.value : "RETIRO";
          const address = mode === "DELIVERY" ? container.querySelector("#edit-address")?.value.trim() || "" : "Retiro por mostrador";

          store.updateOrderDetails(editingOrderId, {
            nombre: name,
            telefono: phone,
            tipo_entrega: mode,
            direccion_entrega: address
          });

          editingOrderId = null;
        });
      }
    }

    // Inputs de pesaje con conversión automática de gramos a kilos (ej: 2150 -> 2.15 kg)
    container.querySelectorAll(".input-weight").forEach((input) => {
      input.addEventListener("input", (e) => {
        const orderId = Number(e.target.dataset.orderId);
        const itemIdx = Number(e.target.dataset.itemIdx);
        const isWeight = e.target.dataset.unit === "KG";
        const priceUnit = Number(e.target.dataset.priceUnit) || 0;
        const val = e.target.value.trim();

        const parsed = parseOperatorWeight(val, isWeight);
        const numVal = parsed !== null ? parsed : (val !== "" ? Math.max(0, Number(val.replace(",", "."))) : 0);
        const subtotal = Math.round(numVal * priceUnit);

        const subtotalEl = container.querySelector(`#item-subtotal-${orderId}-${itemIdx}`);
        if (subtotalEl) {
          subtotalEl.textContent = `$${subtotal.toLocaleString("es-AR")}`;
        }

        const orderInputs = container.querySelectorAll(`.input-weight[data-order-id="${orderId}"]`);
        let runningTotal = 0;
        orderInputs.forEach((inp) => {
          const p = Number(inp.dataset.priceUnit) || 0;
          const inpIsWeight = inp.dataset.unit === "KG";
          const parsedInp = parseOperatorWeight(inp.value.trim(), inpIsWeight);
          const v = parsedInp !== null ? parsedInp : Number(inp.placeholder || 0);
          runningTotal += Math.round(v * p);
        });

        const totalEl = container.querySelector(`#order-balanza-total-${orderId}`);
        if (totalEl) {
          totalEl.textContent = `$${Math.round(runningTotal).toLocaleString("es-AR")}`;
        }
      });

      input.addEventListener("change", (e) => {
        const orderId = Number(e.target.dataset.orderId);
        const itemIdx = Number(e.target.dataset.itemIdx);
        const isWeight = e.target.dataset.unit === "KG";
        const val = e.target.value.trim();
        const parsed = parseOperatorWeight(val, isWeight);

        if (parsed !== null) {
          e.target.value = parsed; // Auto-formatea visualmente a kilos
          store.updateItemWeight(orderId, itemIdx, parsed, { notify: false });
        }
      });
    });

    container.querySelectorAll(".btn-toggle-stock").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch {} }
        const orderId = Number(btn.dataset.toggleStockOrder);
        const itemIdx = Number(btn.dataset.itemIndex);
        store.toggleItemOutOfStock(orderId, itemIdx);
      });
    });

    container.querySelectorAll(".btn-finish-weighing").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(30); } catch {} }
        const id = Number(btn.dataset.finishOrderId);

        const weightsMap = {};
        const currentInputs = container.querySelectorAll(`.input-weight[data-order-id="${id}"]`);
        currentInputs.forEach((input) => {
          const itemIdx = Number(input.dataset.itemIdx);
          const isWeight = input.dataset.unit === "KG";
          const parsed = parseOperatorWeight(input.value.trim(), isWeight);
          if (parsed !== null) {
            weightsMap[itemIdx] = parsed;
          }
        });

        store.finalizeOrderWeighing(id, weightsMap);
        activeTab = "LISTO";
        update();
      });
    });

    container.querySelectorAll(".btn-send-wa").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.waOrderId);
        const order = orders.find((o) => o.id === id);
        if (!order) return;
        const summary = generateWhatsAppSummary(order);
        const res = store.sendWhatsAppMessage({
          to: `549${order.cliente.telefono}`,
          text: summary,
          kind: "order_ready"
        });
        const fb = container.querySelector(`#wa-sim-feedback-${id}`);
        if (fb && res.simulated) {
          fb.textContent = `Envío simulado en Modo Demo para #${order.id} (${order.cliente.telefono}). No se contactó ningún número real.`;
          fb.classList.remove("hidden");
        }
      });
    });

    container.querySelectorAll(".btn-deliver-order").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(20); } catch {} }
        const id = Number(btn.dataset.deliverOrderId);
        store.updateOrderStatus(id, "ENTREGADO");
        update();
      });
    });
  }

  function timeAgo(dateString) {
    if (!dateString) return "Hace instantes";
    const timestamp = new Date(dateString).getTime();
    if (isNaN(timestamp)) return "Hace instantes";
    const diff = Math.floor((Date.now() - timestamp) / 60000);
    if (diff < 1) return "Hace instantes";
    if (diff === 1) return "Hace 1 min";
    if (diff < 60) return `Hace ${diff} min`;
    return `Hace ${Math.floor(diff / 60)} hs`;
  }

  const unsubscribe = store.subscribe((event) => {
    // Si el usuario está interactuando activamente con un input, evitar destruir el DOM
    const isTyping = document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT");
    if ((event === "orders_changed" || event === "order_created" || event === "storage_sync") && !isTyping) {
      update();
    }
  });

  update();
  return () => unsubscribe();
}

  // ==========================================

  // 5. VISTA ADMIN / DUENO

  // ==========================================

function renderAdminView(container) {
  let selectedCategory = "Todos";
  let searchQuery = "";
  let showCloudSettings = false;
  let configSavedToast = false;

  function update() {
    container.innerHTML = "";
    const products = store.getProducts();
    const localSettings = store.getLocalSettings();
    const isConnected = store.isCloudConnected();
    const isDemo = store.isDemo();

    const filtered = products.filter((p) => {
      const matchCat = selectedCategory === "Todos" || p.categoria === selectedCategory;
      const matchSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCat && matchSearch;
    });

    const categoryCounts = {};
    CATEGORIAS.forEach((cat) => {
      categoryCounts[cat] =
        cat === "Todos"
          ? products.length
          : products.filter((p) => p.categoria === cat).length;
    });

    const statusBadgeLabel = isDemo
      ? "Modo Demo (sin red)"
      : isConnected
        ? "Cloud Online"
        : "Sin Conexión Cloud";

    container.innerHTML = `
      <div class="max-w-xl mx-auto p-4 pb-32 overflow-x-hidden safe-pb">
        <!-- Header del Panel -->
        <header class="sticky sticky-header-offset z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 pt-3 pb-3 mb-4 -mx-4 px-4 shadow-xs">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">
                Panel de Administración
              </span>
              <h1 class="font-black text-slate-900 dark:text-white text-lg tracking-tight">Precios y Catálogo</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ajustá los valores del día en tiempo real.</p>
            </div>
            <div class="flex flex-col items-end gap-1.5">
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isConnected
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                  : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
              }">
                ${statusBadgeLabel}
              </span>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="theme-toggle-btn min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition tap-feedback touch-target flex items-center gap-1"
                  title="Cambiar tema claro / oscuro"
                  aria-label="Cambiar tema claro u oscuro"
                >
                  <span>Tema:</span>
                  <span class="theme-label font-black">${store.getTheme() === "dark" ? "Oscuro" : "Claro"}</span>
                </button>
                <button
                  id="btn-toggle-cloud"
                  class="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition tap-feedback touch-target flex items-center justify-center ${
                    isConnected
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }"
                >
                  ${showCloudSettings ? "Cerrar PIN" : "Config PIN"}
                </button>
                <button
                  id="btn-admin-logout"
                  title="Salir y bloquear panel"
                  class="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition tap-feedback touch-target flex items-center justify-center"
                >
                  Salir
                </button>
              </div>
            </div>
          </div>

          <!-- Buscador rápido para celular -->
          <div class="mt-3.5 relative">
            <input
              type="text"
              id="admin-search-input"
              placeholder="Buscar producto por nombre..."
              value="${searchQuery}"
              class="w-full pl-3.5 pr-14 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 border border-transparent focus:border-slate-300 dark:focus:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-base font-medium outline-none transition"
            />
            ${
              searchQuery
                ? `<button id="btn-admin-clear-search" class="absolute right-1 top-1 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-bold tap-feedback touch-target">Borrar</button>`
                : ""
            }
          </div>

          ${
            showCloudSettings
              ? `
            <div class="mt-3 p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 animate-fade-in text-xs space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                <span class="font-black text-slate-200 uppercase tracking-wider text-[11px]">Seguridad Local & Estado de Instalación</span>
                ${
                  configSavedToast
                    ? `<span class="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">Guardado</span>`
                    : ""
                }
              </div>

              <div class="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300 leading-relaxed">
                ${
                  isDemo
                    ? "Modo Demo activo: las conexiones a endpoints externos están bloqueadas desde este panel. Para configurar una instalación productiva editá exclusivamente <code class='font-mono text-amber-300'>js/public-config.js</code>."
                    : "Modo Producción: la conexión pública se define exclusivamente en <code class='font-mono text-emerald-300'>js/public-config.js</code> (sin secretos)."
                }
              </div>

              <form id="cloud-config-form" class="space-y-2.5">
                <div>
                  <label class="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">PIN del Negocio (Staff UI local)</label>
                  <input
                    type="password"
                    id="cfg-pin"
                    maxlength="6"
                    value="${localSettings.staffPin || "1234"}"
                    class="w-full min-h-[44px] p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-base font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div class="pt-1 flex gap-2">
                  <button
                    type="submit"
                    class="w-full min-h-[44px] py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition tap-feedback touch-target flex items-center justify-center"
                  >
                    Guardar PIN Local
                  </button>
                </div>
              </form>
            </div>
          `
              : ""
          }

          <!-- Filtro de Categorías Táctil con conteo -->
          <div class="mt-3.5 flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4">
            ${CATEGORIAS.map(
              (cat) => `
              <button
                data-admin-cat="${cat}"
                class="admin-cat-pill shrink-0 whitespace-nowrap min-h-[44px] px-4 py-2 rounded-full text-xs font-bold transition tap-feedback touch-target flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent dark:border-slate-800"
                }"
              >
                <span>${cat}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full ${
                  selectedCategory === cat ? "bg-slate-800 dark:bg-emerald-800 text-slate-200 dark:text-white font-black" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }">
                  ${categoryCounts[cat] || 0}
                </span>
              </button>
            `
            ).join("")}
            <div class="w-2 shrink-0 select-none pointer-events-none" aria-hidden="true"></div>
          </div>
        </header>

        <!-- Lista de Productos y Precios -->
        <div id="admin-products-list" class="space-y-2.5">
          ${renderAdminProductsListHTML(filtered)}
        </div>
      </div>
    `;

    attachAdminListeners();
  }

  function renderAdminProductsListHTML(filtered) {
    if (filtered.length === 0) {
      return `
        <div class="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">Sin resultados</span>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No encontramos productos con ese nombre</p>
        </div>
      `;
    }

    return filtered
      .map((p) => {
        const unit = p.unidad_medida === "KG" ? "kg" : "u.";

        return `
          <div id="product-card-${p.id}" class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs transition space-y-3">
            <!-- Row 1: Category, Unit, Name, and Stock Status Toggle -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    ${p.categoria}
                  </span>
                  <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    ${p.unidad_medida === "KG" ? "Por kilo" : "Por unidad"}
                  </span>
                </div>
                <h3 class="font-extrabold text-slate-900 dark:text-white text-base leading-snug truncate">
                  ${p.nombre}
                </h3>
              </div>

              <!-- Stock availability button (min 44x44px) -->
              <button
                type="button"
                data-toggle-stock="${p.id}"
                class="btn-stock-toggle min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition tap-feedback touch-target shrink-0 flex items-center justify-center ${
                  p.disponible
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                }"
              >
                ${p.disponible ? "Activo" : "Pausado"}
              </button>
            </div>

            <!-- Row 2: Price Stepper Controls (min 44x44px) -->
            <div class="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Precio:</span>

              <button
                type="button"
                data-step-price="${p.id}"
                data-delta="-100"
                class="btn-step-price min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 text-slate-800 dark:text-slate-200 font-black rounded-xl text-base transition tap-feedback touch-target shrink-0 border border-slate-200 dark:border-slate-700"
                title="Bajar $100"
                aria-label="Bajar $100"
              >
                −
              </button>

              <div class="relative flex-1">
                <span class="absolute left-3 top-3 text-sm font-bold text-slate-400 dark:text-slate-500 select-none pointer-events-none">$</span>
                <input
                  type="number"
                  data-product-id="${p.id}"
                  value="${p.precio}"
                  step="50"
                  min="0"
                  inputmode="numeric"
                  class="input-price w-full min-h-[44px] h-11 pl-7 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-center font-black text-lg text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-slate-900 dark:focus:border-emerald-500 transition"
                />
                <span class="absolute right-3 top-3 text-xs font-bold text-slate-400 dark:text-slate-500 select-none pointer-events-none">${unit}</span>
              </div>

              <button
                type="button"
                data-step-price="${p.id}"
                data-delta="100"
                class="btn-step-price min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 text-slate-800 dark:text-slate-200 font-black rounded-xl text-base transition tap-feedback touch-target shrink-0 border border-slate-200 dark:border-slate-700"
                title="Subir $100"
                aria-label="Subir $100"
              >
                +
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function attachAdminListeners() {
    // Búsqueda en vivo sin recrear el DOM del input
    const searchInput = container.querySelector("#admin-search-input");
    searchInput?.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      const products = store.getProducts();
      const filtered = products.filter((p) => {
        const matchCat = selectedCategory === "Todos" || p.categoria === selectedCategory;
        const matchSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase().trim());
        return matchCat && matchSearch;
      });

      const listContainer = container.querySelector("#admin-products-list");
      if (listContainer) {
        listContainer.innerHTML = renderAdminProductsListHTML(filtered);
        attachProductItemAdminListeners();
      }
    });

    container.querySelector("#btn-admin-clear-search")?.addEventListener("click", () => {
      searchQuery = "";
      update();
    });

    container.querySelector("#btn-admin-logout")?.addEventListener("click", () => {
      store.lockStaff();
      window.location.href = "?view=cliente";
    });

    const btnToggleCloud = container.querySelector("#btn-toggle-cloud");
    if (btnToggleCloud) {
      btnToggleCloud.addEventListener("click", () => {
        showCloudSettings = !showCloudSettings;
        configSavedToast = false;
        update();
      });
    }

    const cloudForm = container.querySelector("#cloud-config-form");
    if (cloudForm) {
      cloudForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const pin = container.querySelector("#cfg-pin")?.value || "";
        store.saveLocalSettings({ staffPin: pin });
        configSavedToast = true;
        update();
      });
    }

    container.querySelectorAll(".admin-cat-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedCategory = btn.dataset.adminCat;
        update();
      });
    });

    attachProductItemAdminListeners();
  }

  function attachProductItemAdminListeners() {
    // Inputs de precio directo
    container.querySelectorAll(".input-price").forEach((input) => {
      input.addEventListener("change", (e) => {
        const id = e.target.dataset.productId;
        const val = Math.max(0, Number(e.target.value) || 0);
        store.updateProductPrice(id, val);
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch {} }

        const card = container.querySelector(`#product-card-${id}`);
        if (card) {
          card.classList.add("flash-saved");
          setTimeout(() => card.classList.remove("flash-saved"), 1200);
        }
      });
    });

    // Ajuste rápido con botones +/- 100
    container.querySelectorAll(".btn-step-price").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(10); } catch {} }
        const id = btn.dataset.stepPrice;
        const delta = Number(btn.dataset.delta);
        const input = container.querySelector(`.input-price[data-product-id="${id}"]`);
        if (input) {
          const current = Number(input.value) || 0;
          const next = Math.max(0, current + delta);
          input.value = next;
          store.updateProductPrice(id, next);

          const card = container.querySelector(`#product-card-${id}`);
          if (card) {
            card.classList.add("flash-saved");
            setTimeout(() => card.classList.remove("flash-saved"), 1200);
          }
        }
      });
    });

    // Toggle de disponibilidad
    container.querySelectorAll(".btn-stock-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch {} }
        const id = btn.dataset.toggleStock;
        store.toggleProductStock(id);
      });
    });
  }

  const unsubscribe = store.subscribe((event) => {
    const isTyping = document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT");
    if ((event === "products_changed" || event === "storage_sync" || event === "cloud_connected") && !isTyping) {
      update();
    }
  });

  update();
  return () => unsubscribe();
}

  // ==========================================

  // 6. ENRUTADOR Y CONTROL DE ACCESO POR PIN

  // ==========================================

class App {
  constructor() {
    this.container = document.getElementById("app-content");
    this.topStack = document.getElementById("nexo-top-stack");
    this.demoBanner = document.getElementById("nexo-demo-banner");
    this.simulatorBar = document.getElementById("simulator-bar");
    this.navButtons = document.querySelectorAll(".nav-switch");
    this.btnLockPin = document.getElementById("btn-lock-pin");
    this.currentViewCleanup = null;
    this.currentView = "client";
    this.requirePinInDemo = false;

    this.init();
  }

  init() {
    const configErrors = store.getConfigErrors();

    // Si la configuración pública de producción es incompleta o inválida,
    // fallar claramente y NO iniciar vistas ni simular éxito local.
    if (configErrors.length > 0) {
      if (this.demoBanner) {
        this.demoBanner.classList.remove("hidden");
        this.demoBanner.classList.add("is-error");
        this.demoBanner.textContent = "ERROR DE CONFIGURACIÓN PRODUCTIVA · La aplicación se detuvo antes de conectar.";
      }
      if (this.simulatorBar) {
        this.simulatorBar.classList.add("hidden");
      }
      this.renderConfigErrorGate(configErrors);
      return;
    }

    // Mostrar aviso persistente cuando corre en modo demo
    if (store.isDemo() && this.demoBanner) {
      this.demoBanner.classList.remove("hidden", "is-error");
    } else if (this.demoBanner) {
      this.demoBanner.classList.add("hidden");
    }

    const urlParams = new URLSearchParams(window.location.search);

    const updateTopOffset = () => {
      let h = 0;
      if (this.topStack) {
        h = this.topStack.offsetHeight || 0;
      } else {
        if (this.demoBanner && !this.demoBanner.classList.contains("hidden")) {
          h += this.demoBanner.offsetHeight || 28;
        }
        if (this.simulatorBar && !this.simulatorBar.classList.contains("hidden")) {
          h += this.simulatorBar.offsetHeight || 46;
        }
      }
      document.documentElement.style.setProperty("--sim-bar-h", `${h}px`);
    };

    const isDemoSimBar = urlParams.get("demo") === "1" || urlParams.get("sim") === "1";

    // La barra del simulador de roles se muestra si se agrega ?demo=1 en la URL
    if (isDemoSimBar && this.simulatorBar) {
      this.simulatorBar.classList.remove("hidden");
      document.body.classList.add("has-sim-bar");
    } else if (this.simulatorBar) {
      this.simulatorBar.classList.add("hidden");
      document.body.classList.remove("has-sim-bar");
    }
    updateTopOffset();
    window.addEventListener("resize", updateTopOffset);

    if (this.btnLockPin) {
      this.btnLockPin.addEventListener("click", () => {
        store.lockStaff();
        this.navigate("client");
      });
    }

    this.navButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch {} }
        const view = btn.dataset.view;
        this.navigate(view);
      });
    });

    // Delegación global para botones de cambio de tema en cualquier vista
    document.addEventListener("click", (e) => {
      const toggleBtn = e.target.closest(".theme-toggle-btn");
      if (toggleBtn) {
        e.preventDefault();
        if (navigator.vibrate) { try { navigator.vibrate(10); } catch {} }
        store.toggleTheme();
      }
    });

    // Atajo de teclado 'T' para alternar tema rápidamente en escritorio (sin interferir con Ctrl+T o Alt+T)
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (
        (e.key === "t" || e.key === "T") &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName) &&
        !document.activeElement?.isContentEditable
      ) {
        store.toggleTheme();
      }
    });

    // Actualización reactiva de etiquetas de tema
    store.subscribe((event) => {
      if (event === "theme_changed") {
        const isDark = store.getTheme() === "dark";
        document.querySelectorAll(".theme-label").forEach((el) => {
          el.textContent = isDark ? "Oscuro" : "Claro";
        });
      }
    });

    const initialView = urlParams.get("view") || window.location.hash.replace("#", "") || "client";
    this.navigate(initialView);

    // Reaccionar a cambios manuales del hash (#operador, #admin) sin recargar
    window.addEventListener("hashchange", () => {
      const target = this.normalizeView(window.location.hash.replace("#", ""));
      if (target !== this.currentView) this.navigate(target);
    });
  }

  renderConfigErrorGate(errors) {
    if (!this.container) return;
    const listHtml = errors
      .map((err) => `<li class="text-xs text-rose-800 dark:text-rose-200 font-medium">${String(err).replace(/[<>]/g, "")}</li>`)
      .join("");
    this.container.innerHTML = `
      <div class="max-w-md mx-auto p-4 pt-12">
        <div id="nexo-config-error-card" role="alert" class="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-rose-300 dark:border-rose-800 shadow-xl space-y-4">
          <span class="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            Producción no disponible
          </span>
          <h1 class="text-xl font-black text-slate-900 dark:text-white">Configuración pública incompleta o inválida</h1>
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Nexo Pedidos está configurado en modo <strong>production</strong>, pero faltan parámetros obligatorios en <code class="font-mono">js/public-config.js</code>. Por seguridad no se realiza fallback a modo local ni a ningún proyecto heredado.
          </p>
          <ul id="nexo-config-error-list" class="list-disc pl-5 space-y-1 bg-rose-50 dark:bg-rose-950/50 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900">
            ${listHtml}
          </ul>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">
            Revisá <code class="font-mono">docs/DEMO.md</code> para completar la configuración pública (nunca incluyas <code class="font-mono">service_role</code> ni secretos de servidor) o cambiá <code class="font-mono">mode: "demo"</code>.
          </p>
        </div>
      </div>
    `;
  }

  renderPinGate(targetView) {
    const isOperario = targetView === "operator" || targetView === "operario";
    const roleLabel = isOperario ? "Puesto de Balanza (Operario)" : "Panel de Precios (Dueño)";
    this.container.innerHTML = `
      <div class="max-w-sm mx-auto p-4 pt-16">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
          <div class="flex items-center justify-between mb-3">
            <span class="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Acceso Personal del Local
            </span>
            <button
              type="button"
              class="theme-toggle-btn min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition tap-feedback touch-target inline-flex items-center justify-center gap-1.5"
              title="${store.getTheme() === 'dark' ? 'Cambiar a tema claro (atajo: T)' : 'Cambiar a tema oscuro (atajo: T)'}"
              aria-label="${store.getTheme() === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}"
            >
              <span class="text-slate-400 dark:text-slate-500">Tema:</span>
              <span class="theme-label font-black">${store.getTheme() === "dark" ? "Oscuro" : "Claro"}</span>
            </button>
          </div>
          <h2 class="text-xl font-black text-slate-900 dark:text-white">${roleLabel}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">Ingresá el PIN numérico de 4 dígitos del comercio (Por defecto: <strong>1234</strong>)</p>

          <form id="pin-gate-form" class="space-y-4">
            <input
              type="password"
              id="pin-input"
              inputmode="numeric"
              maxlength="8"
              placeholder="••••"
              required
              class="w-40 mx-auto block text-center tracking-[0.5em] py-3 px-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 rounded-2xl font-black text-2xl text-slate-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition"
            />
            <p id="pin-error" class="hidden text-xs font-bold text-rose-600 dark:text-rose-400">PIN incorrecto. Intentá nuevamente.</p>
            <div class="flex gap-2 pt-1">
              <button
                type="button"
                id="btn-pin-back"
                class="flex-1 min-h-[48px] py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition touch-target"
              >
                Volver al Catálogo
              </button>
              <button
                type="submit"
                class="flex-1 min-h-[48px] py-3 bg-slate-950 hover:bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md touch-target"
              >
                Ingresar
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const input = this.container.querySelector("#pin-input");
    const form = this.container.querySelector("#pin-gate-form");
    const errorEl = this.container.querySelector("#pin-error");
    const btnBack = this.container.querySelector("#btn-pin-back");

    if (input) input.focus();

    if (btnBack) {
      btnBack.addEventListener("click", () => this.navigate("client"));
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (store.verifyStaffPin(input.value)) {
          this.navigate(targetView);
        } else {
          errorEl.classList.remove("hidden");
          input.value = "";
          input.focus();
        }
      });
    }
  }

  // Normaliza alias de URL (#operador, #precios, #administrador...) a vistas canónicas
  normalizeView(name) {
    const key = String(name || "").toLowerCase().trim();
    const aliases = {
      operator: "operator", operario: "operator", operador: "operator",
      mostrador: "operator", balanza: "operator",
      admin: "admin", administrador: "admin", dueno: "admin", "dueño": "admin",
      precios: "admin", owner: "admin",
      client: "client", cliente: "client", catalogo: "client", "catálogo": "client"
    };
    return aliases[key] || "client";
  }

  navigate(viewName) {
    if (store.getConfigErrors().length > 0) {
      this.renderConfigErrorGate(store.getConfigErrors());
      return;
    }

    viewName = this.normalizeView(viewName);
    if (this.currentViewCleanup) {
      this.currentViewCleanup();
      this.currentViewCleanup = null;
    }

    this.currentView = viewName;
    window.location.hash = viewName;

    this.navButtons.forEach((btn) => {
      const isActive = btn.dataset.view === viewName;
      if (isActive) {
        btn.classList.add("bg-white", "text-slate-900", "shadow-sm");
        btn.classList.remove("text-slate-400");
      } else {
        btn.classList.remove("bg-white", "text-slate-900", "shadow-sm");
        btn.classList.add("text-slate-400");
      }
    });

    // Control estricto de acceso por PIN: si no está desbloqueado, exige PIN
    const isStaffView = ["operator", "operario", "admin", "dueno"].includes(viewName);
    if (isStaffView && !store.isStaffUnlocked()) {
      this.renderPinGate(viewName);
      return;
    }

    switch (viewName) {
      case "operator":
      case "operario":
        this.currentViewCleanup = renderOperatorView(this.container);
        break;
      case "admin":
      case "dueno":
        this.currentViewCleanup = renderAdminView(this.container);
        break;
      case "client":
      case "cliente":
      default:
        this.currentViewCleanup = renderClientView(this.container);
        break;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new App());
} else {
  new App();
}

})();
