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

  // 1c. UTILIDADES DE ESCAPADO HTML SEGURO

  // ==========================================

/**
 * Escapa caracteres especiales de HTML (&, <, >, ", ') para prevenir inyección de código.
 * Si el valor es null o undefined, retorna cadena vacía "".
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const str = String(value);
    return str.replace(/[&<>"']/g, (char) => {
        switch (char) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return char;
        }
    });
}

/**
 * Alias semántico para atributos HTML.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeAttr(value) {
    return escapeHtml(value);
}

  // ==========================================

  // 1d. MODULO DE IMAGENES INDEXEDDB

  // ==========================================

const IMAGE_DB_NAME = "nexo_demo_images_v1";
const IMAGE_STORE_NAME = "images";
const IMAGE_DB_VERSION = 1;
const MAX_INPUT_FILE_SIZE = 15 * 1024 * 1024;
const MAX_DECODED_PIXELS = 25_000_000;
const MAX_IMAGE_SIDE = 512;
const MAX_OUTPUT_SIZE = 512 * 1024;
const ALLOWED_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

function openImageDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no está disponible en este entorno."));
      return;
    }
    const request = indexedDB.open(IMAGE_DB_NAME, IMAGE_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Error al abrir IndexedDB"));
  });
}
function generateImageId() {
  const rnd = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `img_${time}_${rnd}`;
}
async function putImage(blob, explicitId = null) {
  if (!(blob instanceof Blob)) {
    throw new TypeError("putImage requiere una instancia de Blob.");
  }
  const id = explicitId || generateImageId();
  const db = await openImageDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, "readwrite");
    const store = tx.objectStore(IMAGE_STORE_NAME);
    const request = store.put(blob, id);
    tx.oncomplete = () => {
      db.close();
      resolve(id);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || request.error || new Error("Error en la transacción IndexedDB"));
    };
    tx.onabort = () => {
      db.close();
      reject(new Error("Transacción IndexedDB abortada"));
    };
  });
}
async function getImage(id) {
  if (!id || typeof id !== "string") return null;
  try {
    const db = await openImageDatabase();
    return await new Promise((resolve) => {
      const tx = db.transaction(IMAGE_STORE_NAME, "readonly");
      const store = tx.objectStore(IMAGE_STORE_NAME);
      const request = store.get(id);
      tx.oncomplete = () => {
        db.close();
        resolve(request.result || null);
      };
      tx.onerror = () => {
        db.close();
        resolve(null);
      };
      tx.onabort = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}
async function deleteImage(id) {
  if (!id || typeof id !== "string") return false;
  try {
    const db = await openImageDatabase();
    return await new Promise((resolve) => {
      const tx = db.transaction(IMAGE_STORE_NAME, "readwrite");
      const store = tx.objectStore(IMAGE_STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
      tx.onabort = () => {
        db.close();
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}
async function processProductImageFile(file) {
  if (!file) throw new Error("No se seleccionó ningún archivo de imagen.");
  if (file.size > MAX_INPUT_FILE_SIZE) {
    throw new Error("El archivo de imagen excede el tamaño máximo permitido (15 MB).");
  }

  const type = (file.type || "").toLowerCase().trim();
  const name = (file.name || "").toLowerCase();
  const isHeic = type === "image/heic" || type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");

  if (type.includes("svg") || type.includes("html") || type.includes("xml")) {
    throw new Error("Formato de imagen no compatible. Seleccioná una imagen JPEG, PNG o WebP.");
  }

  if (!isHeic && !ALLOWED_MIME_TYPES.includes(type)) {
    throw new Error("Formato de imagen no compatible. Seleccioná una imagen JPEG, PNG o WebP.");
  }

  let imgSource;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let objectUrlToRevoke = null;

  try {
    if (typeof createImageBitmap === "function") {
      try {
        imgSource = await createImageBitmap(file, { imageOrientation: "from-image" });
        sourceWidth = imgSource.width;
        sourceHeight = imgSource.height;
      } catch (bitmapErr) {
        if (isHeic) {
          throw new Error("No se pudo decodificar la imagen HEIC/HEIF en este navegador. Por favor convertila a JPEG o PNG.");
        }
      }
    }

    if (!imgSource) {
      objectUrlToRevoke = URL.createObjectURL(file);
      imgSource = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
          if (isHeic) {
            reject(new Error("No se pudo decodificar la imagen HEIC/HEIF en este navegador. Por favor convertila a JPEG o PNG."));
          } else {
            reject(new Error("No se pudo decodificar el archivo de imagen. Verificá que no esté corrupto."));
          }
        };
        img.src = objectUrlToRevoke;
      });
      sourceWidth = imgSource.naturalWidth || imgSource.width;
      sourceHeight = imgSource.naturalHeight || imgSource.height;
    }

    if (!sourceWidth || !sourceHeight) {
      throw new Error("No se pudieron determinar las dimensiones de la imagen.");
    }

    const totalPixels = sourceWidth * sourceHeight;
    if (totalPixels > MAX_DECODED_PIXELS) {
      throw new Error("La resolución de la imagen excede los 25 megapíxeles permitidos.");
    }

    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;
    if (sourceWidth > MAX_IMAGE_SIDE || sourceHeight > MAX_IMAGE_SIDE) {
      const scale = Math.min(MAX_IMAGE_SIDE / sourceWidth, MAX_IMAGE_SIDE / sourceHeight);
      targetWidth = Math.max(1, Math.round(sourceWidth * scale));
      targetHeight = Math.max(1, Math.round(sourceHeight * scale));
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo inicializar el lienzo para procesar la imagen.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(imgSource, 0, 0, targetWidth, targetHeight);

    const normalizedBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error("Error al normalizar la imagen a formato JPEG."));
          else resolve(blob);
        },
        "image/jpeg",
        0.8
      );
    });

    if (normalizedBlob.size > MAX_OUTPUT_SIZE) {
      throw new Error("El archivo de imagen normalizado supera los 512 KB permitidos.");
    }

    return normalizedBlob;
  } finally {
    if (imgSource && typeof imgSource.close === "function") {
      imgSource.close();
    }
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }
  }
}
function isDirectImageUrl(id) {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  return trimmed.startsWith("https://");
}
function createScopedImageLoader() {
  const activeUrls = new Set();
  let generation = 0;

  return {
    async hydrate(element, imageId) {
      if (!element || !imageId) return;
      const currentGen = generation;
      const trimmedId = imageId.trim();

      // Carga directa de URL pública HTTP/HTTPS (Supabase Storage, CDN, Unsplash, etc.)
      if (isDirectImageUrl(trimmedId)) {
        const wrapper = element.closest(".product-photo-wrapper") || element.closest(".aspect-square");
        element.src = trimmedId;
        element.alt = "";
        element.loading = "lazy";
        element.decoding = "async";
        element.classList.remove("hidden");
        if (wrapper) wrapper.classList.remove("hidden");

        element.onerror = () => {
          element.classList.add("hidden");
          if (wrapper) wrapper.classList.add("hidden");
        };
        return;
      }

      // Carga local desde IndexedDB
      const blob = await getImage(imageId);
      if (currentGen !== generation || !element.isConnected) return;

      const wrapper = element.closest(".product-photo-wrapper") || element.closest(".aspect-square");
      if (!blob) {
        element.classList.add("hidden");
        if (wrapper) wrapper.classList.add("hidden");
        return;
      }

      try {
        const url = URL.createObjectURL(blob);
        if (currentGen !== generation || !element.isConnected) {
          URL.revokeObjectURL(url);
          return;
        }
        activeUrls.add(url);
        element.src = url;
        element.alt = "";
        element.loading = "lazy";
        element.decoding = "async";
        element.classList.remove("hidden");
        if (wrapper) wrapper.classList.remove("hidden");

        element.onerror = () => {
          element.classList.add("hidden");
          if (wrapper) wrapper.classList.add("hidden");
        };
      } catch {
        element.classList.add("hidden");
        if (wrapper) wrapper.classList.add("hidden");
      }
    },
    revokeAll() {
      generation++;
      for (const url of activeUrls) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      activeUrls.clear();
    }
  };
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
    if (Object.hasOwn(memoryFallback, key)) return memoryFallback[key];
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
    delete memoryFallback[key];
    return true;
  } catch {
    memoryFallback[key] = val;
    return false;
  }
}
function writeCritical(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    delete memoryFallback[key];
  } catch {
    throw new Error("No se pudo guardar: almacenamiento no disponible o sin espacio. Tus datos anteriores se conservan. Reintentá.");
  }
}
function safeRemove(key) {
  try {
    localStorage.removeItem(key);
    delete memoryFallback[key];
    return true;
  } catch {
    return false;
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
    this.ordersError = null;

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
      try {
        if (localStorage.getItem(this.storageKeys.PRODUCTS) === null) writeCritical(this.storageKeys.PRODUCTS, INITIAL_PRODUCTS);
      } catch (error) { this.catalogError = error.message; }
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
    writeCritical(this.storageKeys.LOCAL_SETTINGS, updated);
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
    if (this.isPinLockedOut()) {
      return false;
    }
    const { staffPin } = this.getLocalSettings();
    const ok = String(inputPin).trim() === String(staffPin).trim();
    if (ok) {
      this.pinFailedAttempts = 0;
      this.pinLockoutUntil = 0;
      safeSet(this.storageKeys.PIN_UNLOCKED, true);
    } else {
      this.pinFailedAttempts = (this.pinFailedAttempts || 0) + 1;
      if (this.pinFailedAttempts >= 5) {
        this.pinLockoutUntil = Date.now() + 30000;
        this.pinFailedAttempts = 0;
      }
    }
    return ok;
  }

  isPinLockedOut() {
    return Date.now() < (this.pinLockoutUntil || 0);
  }

  getPinLockoutRemainingSeconds() {
    if (!this.isPinLockedOut()) return 0;
    return Math.ceil((this.pinLockoutUntil - Date.now()) / 1000);
  }

  isStaffUnlocked() {
    return Boolean(safeGet(this.storageKeys.PIN_UNLOCKED, false));
  }

  lockStaff() {
    safeRemove(this.storageKeys.PIN_UNLOCKED);
    if (this.config.mode === "production" && this.supabase) {
      this.pullFromSupabase();
    }
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
      const isStaff = this.isStaffUnlocked();
      const currentUser = this.getCurrentUser();
      const cleanPhone = currentUser?.telefono
        ? String(currentUser.telefono).replace(/\D/g, "")
        : "";

      const clientQuery = isStaff
        ? null
        : cleanPhone
        ? this.supabase.from("clientes").select("*").eq("telefono", cleanPhone)
        : null;

      const orderQuery = isStaff
        ? this.supabase.from("pedidos").select("*").order("id", { ascending: false }).limit(50)
        : cleanPhone
        ? this.supabase.from("pedidos").select("*").eq("cliente_telefono", cleanPhone).order("id", { ascending: false }).limit(20)
        : Promise.resolve({ data: [] });

      const [prodRes, cliRes, ordRes] = await Promise.all([
        this.supabase.from("productos").select("*").order("id"),
        clientQuery ? clientQuery : Promise.resolve({ data: [] }),
        orderQuery
      ]);

      if (prodRes.data && prodRes.data.length > 0) {
        const mappedProducts = prodRes.data.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          categoria: p.categoria,
          unidad_medida: p.unidad_medida,
          precio: Number(p.precio),
          disponible: Boolean(p.disponible),
          paso: Number(p.paso || 0.5),
          codigo: p.codigo || "",
          detalle: p.detalle || "",
          archivado: Boolean(p.archivado),
          imagen_id: p.imagen_id || null
        }));
        safeSet(this.storageKeys.PRODUCTS, mappedProducts);
        this.notify("products_changed");
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
        const mappedOrders = [];
        let corruptRemoteCount = 0;
        for (const o of ordRes.data) {
          try {
            const candidate = {
              id: typeof o.id === "number" ? o.id : Number(o.id),
              cliente: {
                nombre: o.cliente_nombre,
                telefono: o.cliente_telefono,
                direccion: o.direccion_entrega || ""
              },
              tipo_entrega: o.tipo_entrega,
              direccion_entrega: o.direccion_entrega || "",
              estado: o.estado,
              fecha: o.fecha || o.created_at || new Date().toISOString(),
              total_estimado: this.parseStrictRemoteNumber(o.total_estimado),
              total_real: o.total_real !== null && o.total_real !== undefined ? this.parseStrictRemoteNumber(o.total_real) : null,
              items: Array.isArray(o.items)
                ? o.items.map((item) => ({
                    ...item,
                    precio_unitario: this.parseStrictRemoteNumber(item?.precio_unitario),
                    cantidad_solicitada: this.parseStrictRemoteNumber(item?.cantidad_solicitada),
                    peso_real: item?.peso_real !== null && item?.peso_real !== undefined ? this.parseStrictRemoteNumber(item.peso_real) : null,
                    subtotal: item?.subtotal !== undefined && item?.subtotal !== null ? this.parseStrictRemoteNumber(item.subtotal) : undefined
                  }))
                : null
            };
            this.validateOrderRecord(candidate);
            mappedOrders.push(candidate);
          } catch {
            corruptRemoteCount++;
          }
        }
        if (corruptRemoteCount > 0) {
          this.ordersError = `Se omitieron ${corruptRemoteCount} registro(s) de pedido con formato o cantidades inválidas.`;
          this.notify("orders_error", this.ordersError);
        } else {
          this.ordersError = null;
        }
        this.persistOrders(mappedOrders);
        this.notify("orders_changed");
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
        if (payload.eventType === "INSERT" && this.isStaffUnlocked()) {
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
      const cleanPhone = order.cliente && order.cliente.telefono
        ? String(order.cliente.telefono).replace(/\D/g, "")
        : "";

      // Garantizar que el cliente exista en Supabase antes de insertar el pedido para satisfacer la Foreign Key
      if (cleanPhone) {
        await this.supabase.from("clientes").upsert({
          telefono: cleanPhone,
          nombre: order.cliente.nombre || "Cliente",
          direccion: order.cliente.direccion || "",
          updated_at: new Date().toISOString()
        });
      }

      const orderPayload = {
        cliente_telefono: cleanPhone || null,
        cliente_nombre: order.cliente?.nombre || "Cliente",
        tipo_entrega: order.tipo_entrega || "RETIRO",
        direccion_entrega: order.direccion_entrega || (order.tipo_entrega === "DELIVERY" ? "" : "Retiro en Mostrador"),
        estado: order.estado || "PENDIENTE",
        total_estimado: Number(order.total_estimado || 0),
        total_real: order.total_real !== null && order.total_real !== undefined ? Number(order.total_real) : null,
        items: Array.isArray(order.items) ? order.items : [],
        fecha: order.fecha || new Date().toISOString()
      };

      if (!order._isNew && order.id) {
        orderPayload.id = order.id;
      }

      const res = order._isNew
        ? await this.supabase.from("pedidos").insert(orderPayload).select()
        : await this.supabase.from("pedidos").upsert(orderPayload).select();

      if (res.error) {
        if (order._isNew && order.id) {
          await this.supabase.from("pedidos").upsert({ id: order.id, ...orderPayload });
        }
        console.warn("Error guardando pedido en Supabase:", res.error);
        this.notify("cloud_error", res.error.message);
      } else if (res.data && res.data[0] && res.data[0].id) {
        order._isNew = false;
        const dbId = res.data[0].id;
        const oldId = order.id;
        order.id = dbId;
        const currentOrders = this.getOrders();
        this.persistOrders(currentOrders.map((o) => (o.id === oldId || o.id === dbId ? { ...o, id: dbId, _isNew: false } : o)));
        if (this.getActiveOrderId() === oldId) {
          this.setActiveOrderId(dbId);
        }
        this.notify("orders_changed");
      }
    } catch (err) {
      console.warn("Error guardando pedido en Supabase:", err);
    }
  }

  async syncProductToSupabase(product) {
    if (!this.supabase || !product) return;
    try {
      const payload = {
        id: product.id,
        nombre: product.nombre,
        categoria: product.categoria,
        unidad_medida: product.unidad_medida,
        precio: Number(product.precio),
        disponible: Boolean(product.disponible),
        paso: Number(product.paso || 0.5),
        codigo: product.codigo ? String(product.codigo).trim().toUpperCase() : "",
        detalle: product.detalle ? String(product.detalle).trim() : "",
        archivado: Boolean(product.archivado),
        imagen_id: product.imagen_id || null,
        updated_at: new Date().toISOString()
      };
      const query = this.supabase.from("productos").upsert(payload);
      const { staffPin } = this.getLocalSettings();
      if (staffPin && typeof query.setHeader === "function") {
        query.setHeader("x-nexo-staff-pin", staffPin);
      }
      const { error } = await query;
      if (error) {
        console.warn("Error guardando producto en Supabase:", error);
        this.notify("cloud_error", error.message);
      }
    } catch (err) {
      console.warn("Error guardando producto en Supabase:", err);
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
  getProducts({ includeArchived = false } = {}) {
    if (!this.config.ok) return [];
    try {
      const raw = localStorage.getItem(this.storageKeys.PRODUCTS);
      if (raw === null) {
        this.catalogError = this.isDemo() ? "No hay catálogo demo guardado. Podés recuperarlo explícitamente." : null;
        return [];
      }
      const products = JSON.parse(raw);
      if (!Array.isArray(products)) throw new Error("El catálogo debe ser una lista.");
      const ids = new Set();
      const codes = new Set();
      for (const product of products) {
        this.validateProduct(product);
        if (ids.has(product.id)) throw new Error("Hay identificadores de producto repetidos.");
        ids.add(product.id);
        const sku = String(product.codigo || "").trim().toUpperCase();
        if (sku && codes.has(sku)) throw new Error("Hay códigos SKU repetidos.");
        if (sku) codes.add(sku);
      }
      this.catalogError = null;
      return includeArchived ? products : products.filter((p) => !p.archivado);
    } catch (error) {
      this.catalogError = `No se pudo leer el catálogo: ${error.message}. No se modificaron los datos originales.`;
      return [];
    }
  }

  getAdminProducts() { return this.getProducts({ includeArchived: true }); }
  getCategories() { return [...new Set(this.getProducts().map((p) => p.categoria))]; }
  getCatalogError() { this.getAdminProducts(); return this.catalogError || null; }
  getStorageWarning() {
    return Object.keys(memoryFallback).some((key) => key.startsWith(this.storageKeys.PREFIX))
      ? "Algunos ajustes sólo están en memoria temporal: el almacenamiento no pudo guardarlos. Podrían perderse al recargar." : null;
  }

  validateProduct(product) {
    if (!product || typeof product !== "object" || Array.isArray(product)) throw new Error("Producto incompleto.");
    for (const [key, max] of [["id", 100], ["nombre", 120], ["categoria", 50]]) {
      if (typeof product[key] !== "string" || !product[key].trim() || product[key].length > max) throw new Error(`Revisá ${key}: es obligatorio (máximo ${max} caracteres).`);
    }
    if (!["KG", "UNIDAD"].includes(product.unidad_medida)) throw new Error("La modalidad debe ser KG o UNIDAD.");
    if (!Number.isFinite(product.precio) || product.precio < 0) throw new Error("El precio debe ser finito y mayor o igual a cero.");
    if (!Number.isFinite(product.paso) || product.paso <= 0 || (product.unidad_medida === "UNIDAD" && product.paso !== 1)) throw new Error("El paso debe ser positivo; para UNIDAD debe ser 1.");
    if (Math.abs(product.paso * 100 - Math.round(product.paso * 100)) > 1e-7) throw new Error("El paso de solicitud admite hasta dos decimales.");
    if (typeof product.disponible !== "boolean" || (product.archivado !== undefined && typeof product.archivado !== "boolean")) throw new Error("El estado del producto no es válido.");
    if (product.codigo !== undefined && (typeof product.codigo !== "string" || product.codigo.length > 50)) throw new Error("El SKU admite hasta 50 caracteres.");
    if (product.detalle !== undefined && (typeof product.detalle !== "string" || product.detalle.length > 500)) throw new Error("El detalle admite hasta 500 caracteres.");
    if (product.imagen_id !== undefined && product.imagen_id !== null) {
      if (typeof product.imagen_id !== "string" || !product.imagen_id.trim() || product.imagen_id.length > 500) throw new Error("El identificador de imagen no es válido.");
      if (product.imagen_id.startsWith("data:")) throw new Error("Las imágenes no deben guardarse en el producto como base64 o blob.");
    }
  }

  requireDemo() {
    if (!this.isDemo() || !this.config.ok) throw new Error("Esta operación está disponible sólo en demo.");
  }

  recoverCatalog() {
    this.requireDemo();
    let raw;
    try { raw = localStorage.getItem(this.storageKeys.PRODUCTS); }
    catch { throw new Error("No se pudo leer el almacenamiento para recuperar el catálogo."); }
    let candidates = [];
    try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) candidates = parsed; } catch {}
    const recovered = [];
    for (const product of candidates) {
      try {
        this.validateProduct(product);
        const sku = String(product.codigo || "").trim().toUpperCase();
        if (!recovered.some((p) => p.id === product.id || (sku && String(p.codigo || "").trim().toUpperCase() === sku))) recovered.push(product);
      } catch { /* Invalid rows remain recoverable in the raw backup. */ }
    }
    const backupKey = `${this.storageKeys.PRODUCTS}_backup_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try { localStorage.setItem(backupKey, raw === null ? "null" : raw); }
    catch { throw new Error("No se pudo guardar el respaldo original. El catálogo no cambió."); }
    const products = recovered.length ? recovered : INITIAL_PRODUCTS.map((p) => ({ ...p }));
    writeCritical(this.storageKeys.PRODUCTS, products);
    this.catalogError = null;
    this.notify("products_changed");
    return products;
  }

  localProductId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    if (!globalThis.crypto?.getRandomValues) throw new Error("Este navegador no puede generar un ID seguro para el producto.");
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  saveProduct(draft, productId = null) {
    if (!this.config.ok) throw new Error("Configuración inválida.");
    const products = this.getAdminProducts();
    if (this.catalogError) throw new Error(this.catalogError);
    const previous = productId === null ? null : products.find((p) => p.id === productId);
    if (productId !== null && !previous) throw new Error("No se encontró el producto.");
    const text = (key) => typeof draft[key] === "string" ? draft[key].trim() : "";
    const number = (value) => (typeof value === "number" || (typeof value === "string" && value.trim())) ? Number(String(value).replace(",", ".")) : NaN;
    let id = previous?.id;
    if (!id) { do { id = this.localProductId(); } while (products.some((p) => p.id === id)); }
    const saved = {
      ...(previous || {}), id, nombre: text("nombre"), categoria: text("categoria"), codigo: text("codigo").toUpperCase(),
      detalle: text("detalle"), unidad_medida: draft.unidad_medida, precio: number(draft.precio), paso: number(draft.paso),
      disponible: draft.disponible ?? previous?.disponible ?? true,
      archivado: typeof draft.archivado === "boolean" ? draft.archivado : (previous?.archivado || false)
    };
    if (Object.hasOwn(draft, "imagen_id")) {
      saved.imagen_id = draft.imagen_id;
    } else if (previous?.imagen_id !== undefined) {
      saved.imagen_id = previous.imagen_id;
    }
    this.validateProduct(saved);
    if (saved.codigo && products.some((p) => p.id !== id && String(p.codigo || "").trim().toUpperCase() === saved.codigo)) throw new Error("El código SKU ya existe, incluso si el producto está archivado.");
    if (previous && previous.unidad_medida !== saved.unidad_medida && (this.getCart()[id] || this.getOrders().some((order) => order.items.some((item) => item.producto_id === id)))) {
      throw new Error("No se puede cambiar la unidad: hay referencias en pedidos o carrito. Creá otro producto y archivá el anterior.");
    }
    writeCritical(this.storageKeys.PRODUCTS, previous ? products.map((p) => p.id === id ? saved : p) : [...products, saved]);
    this.notify("products_changed");
    this.syncProductToSupabase(saved);
    return saved;
  }

  archiveProduct(id, archived = true) {
    if (!this.config.ok) throw new Error("Configuración inválida.");
    const products = this.getAdminProducts();
    if (this.catalogError) throw new Error(this.catalogError);
    const product = products.find((p) => p.id === id);
    if (!product || typeof archived !== "boolean") throw new Error("No se encontró el producto o el estado de archivo no es válido.");
    const saved = { ...product, archivado: archived };
    writeCritical(this.storageKeys.PRODUCTS, products.map((p) => p.id === id ? saved : p));
    this.notify("products_changed");
    this.syncProductToSupabase(saved);
    return saved;
  }

  updateProductPrice(productId, newPrice) {
    const product = this.getAdminProducts().find((p) => p.id === productId);
    if (!product) throw new Error(this.catalogError || "No se encontró el producto.");
    return this.saveProduct({ ...product, precio: newPrice }, productId);
  }

  toggleProductStock(productId) {
    const product = this.getAdminProducts().find((p) => p.id === productId);
    if (!product) throw new Error(this.catalogError || "No se encontró el producto.");
    return this.saveProduct({ ...product, disponible: !product.disponible }, productId);
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

  persistOrders(orders) {
    if (orders.some((order) => !Number.isFinite(order.total_estimado) || (order.total_real != null && !Number.isFinite(order.total_real)))) {
      throw new Error("El total del pedido excede el rango permitido o no es válido. Revisá los importes y cantidades; no se guardaron cambios.");
    }
    writeCritical(this.storageKeys.ORDERS, orders);
  }

  persistCart(cart) {
    const total = Object.values(cart).reduce((sum, item) => sum + item.subtotal_estimado, 0);
    if (!Number.isFinite(total)) throw new Error("El total del carrito excede el rango permitido o no es válido. No se guardaron cambios.");
    writeCritical(this.storageKeys.CART, cart);
  }

  // --- Carrito ---
  getCart() {
    return safeGet(this.storageKeys.CART, {});
  }

  assertCurrentCartProduct(product, item) {
    if (item && (product.precio !== item.precio_unitario || product.unidad_medida !== item.unidad_medida || (item.paso_solicitado !== undefined && product.paso !== item.paso_solicitado))) {
      throw new Error(`Cambió el precio, unidad o paso de ${item.nombre}. Quitá el producto y volvé a agregarlo para revisar antes de confirmar.`);
    }
  }

  addToCart(productId, quantityDelta) {
    const cart = this.getCart();
    const product = this.getProducts().find((p) => p.id === productId);
    if (!product) return;
    if (quantityDelta > 0 && !product.disponible) return;

    if (!Number.isFinite(quantityDelta)) throw new Error("La cantidad no es válida.");
    const currentQty = cart[productId]?.cantidad || 0;
    const newQty = Math.max(0, Number((currentQty + quantityDelta).toFixed(2)));

    if (newQty <= 0) {
      delete cart[productId];
    } else {
      this.assertCurrentCartProduct(product, cart[productId]);
      if (product.unidad_medida === "UNIDAD" && !Number.isInteger(newQty)) throw new Error("Los productos unitarios requieren cantidades enteras.");
      if (!Number.isFinite(newQty * product.precio)) throw new Error("La cantidad o el importe excede el rango permitido.");
      cart[productId] = {
        producto_id: productId,
        nombre: product.nombre,
        categoria: product.categoria,
        unidad_medida: product.unidad_medida,
        precio_unitario: product.precio,
        cantidad: newQty,
        subtotal_estimado: Math.round(newQty * product.precio),
        paso_solicitado: product.paso,
        checkout_revision: `${Date.now()}-${Math.random()}`
      };
    }

    this.persistCart(cart);
    this.notify("cart_changed");
  }

  removeFromCart(productId) {
    const cart = this.getCart();
    delete cart[productId];
    this.persistCart(cart);
    this.notify("cart_changed");
  }

  setCartQuantity(productId, targetQty) {
    if (!Number.isFinite(targetQty)) throw new Error("La cantidad no es válida.");
    const cleanQty = Math.max(0, Number(targetQty.toFixed(2)));
    if (cleanQty <= 0) {
      this.removeFromCart(productId);
      return;
    }
    const cart = this.getCart();
    const product = this.getProducts().find((p) => p.id === productId);
    if (!product || !product.disponible) return;
    this.assertCurrentCartProduct(product, cart[productId]);
    if (product.unidad_medida === "UNIDAD" && !Number.isInteger(cleanQty)) throw new Error("Los productos unitarios requieren cantidades enteras.");
    if (!Number.isFinite(cleanQty * product.precio)) throw new Error("La cantidad o el importe excede el rango permitido.");

    cart[productId] = {
      producto_id: productId,
      nombre: product.nombre,
      categoria: product.categoria,
      unidad_medida: product.unidad_medida,
      precio_unitario: product.precio,
      cantidad: cleanQty,
      subtotal_estimado: Math.round(cleanQty * product.precio),
      paso_solicitado: product.paso,
      checkout_revision: `${Date.now()}-${Math.random()}`
    };

    this.persistCart(cart);
    this.notify("cart_changed");
  }

  clearCart() {
    try { localStorage.removeItem(this.storageKeys.CART); delete memoryFallback[this.storageKeys.CART]; }
    catch { throw new Error("No se pudo vaciar el carrito: almacenamiento no disponible."); }
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
  parseStrictRemoteNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim())) return Number(value.trim());
    return NaN;
  }

  validateOrderItem(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Ítem de pedido inválido.");
    if (typeof item.nombre !== "string" || !item.nombre.trim() || item.nombre.length > 120) {
      throw new Error("Nombre de ítem inválido.");
    }
    if (!["KG", "UNIDAD"].includes(item.unidad_medida)) throw new Error("Unidad de ítem inválida.");
    if (typeof item.precio_unitario !== "number" || !Number.isFinite(item.precio_unitario) || item.precio_unitario < 0) {
      throw new Error("Precio de ítem inválido.");
    }
    if (typeof item.cantidad_solicitada !== "number" || !Number.isFinite(item.cantidad_solicitada) || item.cantidad_solicitada <= 0) {
      throw new Error("Cantidad solicitada inválida.");
    }
    if (item.peso_real !== null && item.peso_real !== undefined && (typeof item.peso_real !== "number" || !Number.isFinite(item.peso_real) || item.peso_real < 0)) {
      throw new Error("Peso real de ítem inválido.");
    }
    if (item.subtotal !== undefined && (typeof item.subtotal !== "number" || !Number.isFinite(item.subtotal) || item.subtotal < 0)) {
      throw new Error("Subtotal de ítem inválido.");
    }
  }

  validateOrderRecord(order) {
    if (!order || typeof order !== "object" || Array.isArray(order)) throw new Error("Registro de pedido inválido.");
    if (typeof order.id !== "number" || !Number.isSafeInteger(order.id) || order.id <= 0) {
      throw new Error("Identificador de pedido inválido.");
    }
    if (!["PENDIENTE", "EN_PREPARACION", "LISTO", "ENTREGADO", "CANCELADO"].includes(order.estado)) {
      throw new Error("Estado de pedido inválido.");
    }
    if (!["RETIRO", "DELIVERY"].includes(order.tipo_entrega)) {
      throw new Error("Tipo de entrega inválido.");
    }
    if (!order.cliente || typeof order.cliente !== "object" || Array.isArray(order.cliente) || typeof order.cliente.nombre !== "string" || !order.cliente.nombre.trim() || typeof order.cliente.telefono !== "string") {
      throw new Error("Datos de cliente inválidos en pedido.");
    }
    if (typeof order.total_estimado !== "number" || !Number.isFinite(order.total_estimado) || order.total_estimado < 0) {
      throw new Error("Total estimado de pedido inválido.");
    }
    if (order.total_real !== null && order.total_real !== undefined && (typeof order.total_real !== "number" || !Number.isFinite(order.total_real) || order.total_real < 0)) {
      throw new Error("Total real de pedido inválido.");
    }
    if (!Array.isArray(order.items)) throw new Error("Lista de ítems de pedido inválida.");
    for (const item of order.items) {
      this.validateOrderItem(item);
    }
  }

  getOrdersError() {
    this.getOrders();
    return this.ordersError || null;
  }

  getOrders() {
    const rawOrders = safeGet(this.storageKeys.ORDERS, []);
    if (!Array.isArray(rawOrders)) {
      this.ordersError = "Se detectó un formato corrupto en el historial de pedidos; los registros inválidos fueron bloqueados.";
      return [];
    }
    const valid = [];
    let corruptCount = 0;
    for (const order of rawOrders) {
      try {
        this.validateOrderRecord(order);
        valid.push(order);
      } catch {
        corruptCount++;
      }
    }
    this.ordersError = corruptCount > 0
      ? `Se bloquearon ${corruptCount} registro(s) de pedido con datos o cantidades corruptas.`
      : null;
    return valid;
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

    // Recover a durable receipt even if the previous active shortcut could not be updated.
    const received = orders.find((o) => o.checkout_cart_key && this.isSameCustomer(o.cliente?.telefono, targetPhone));
    if (received && received.estado !== "ENTREGADO" && received.estado !== "CANCELADO") return received;
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

  checkoutCartKey() {
    const cart = this.getCart();
    return JSON.stringify(Object.keys(cart).sort().map((key) => [key, cart[key]]));
  }

  finishCheckout(order) {
    const warnings = [];
    try { writeCritical(this.storageKeys.ACTIVE_ORDER, order.id); }
    catch { warnings.push("No se pudo actualizar el acceso al pedido."); }
    if (this.checkoutCartKey() === order.checkout_cart_key) {
      try {
        localStorage.removeItem(this.storageKeys.CART);
        delete memoryFallback[this.storageKeys.CART];
      } catch { warnings.push("El carrito conserva una copia; reintentar no duplica este pedido."); }
    }
    this.checkoutWarning = warnings.length
      ? `Pedido #${order.id} recibido y guardado. ${warnings.join(" ")} Podés volver a abrirlo y reintentar la limpieza cuando se restablezca el almacenamiento.`
      : null;
    return order;
  }

  getCheckoutWarning() {
    return this.checkoutWarning || null;
  }

  createOrder({ cliente, tipo_entrega, direccion_entrega }) {
    if (!this.config.ok) return null;
    const { items, totalEstimado } = this.getCartSummary();
    const orders = this.getOrders();
    const cartKey = this.checkoutCartKey();
    const accepted = orders.find((order) => order.checkout_cart_key && this.isSameCustomer(order.cliente?.telefono, cliente.telefono)
      && (order.checkout_cart_key === cartKey || items.length === 0));
    if (accepted) return this.finishCheckout(accepted);
    if (items.length === 0) return null;
    const products = this.getAdminProducts();
    if (this.catalogError) throw new Error(this.catalogError);
    for (const item of items) {
      const product = products.find((p) => p.id === item.producto_id);
      if (!product || product.archivado || !product.disponible) throw new Error(`Revisá el carrito: ${item.nombre} está pausado, archivado o no disponible. Quitalo antes de confirmar.`);
      this.assertCurrentCartProduct(product, item);
      const steps = item.cantidad / product.paso;
      if (!Number.isFinite(item.cantidad) || item.cantidad <= 0 || Math.abs(steps - Math.round(steps)) > 1e-7 || (product.unidad_medida === "UNIDAD" && !Number.isInteger(item.cantidad))) throw new Error(`Revisá la cantidad de ${item.nombre}: no coincide con el paso permitido.`);
    }
    const newId = orders.length > 0 ? Math.max(...orders.map((o) => o.id)) + 1 : 101;
    const newOrder = {
      id: newId, cliente, tipo_entrega,
      direccion_entrega: tipo_entrega === "DELIVERY" ? direccion_entrega : "Retiro en Mostrador",
      estado: "PENDIENTE", fecha: new Date().toISOString(),
      total_estimado: totalEstimado, total_real: null, checkout_cart_key: cartKey,
      _isNew: true,
      items: items.map((item) => ({
        producto_id: item.producto_id, nombre: item.nombre, categoria: item.categoria,
        unidad_medida: item.unidad_medida, precio_unitario: item.precio_unitario,
        cantidad_solicitada: item.cantidad,
        peso_real: item.unidad_medida === "UNIDAD" ? item.cantidad : null,
        subtotal: item.subtotal_estimado, sin_stock: false,
        ...(item.unidad_medida === "UNIDAD" ? { confirmado_preparacion: false } : {})
      }))
    };
    this.persistOrders([newOrder, ...orders]);
    this.finishCheckout(newOrder);
    this.syncOrderToSupabase(newOrder);
    this.playAudioAlert();
    this.notify("order_created", newOrder);
    return newOrder;
  }

  updateOrderStatus(orderId, newStatus) {
    if (newStatus === "LISTO") return this.finalizeOrderWeighing(orderId);
    const previous = this.getOrders().find((o) => o.id === orderId);
    if (previous && ["LISTO", "ENTREGADO"].includes(previous.estado) && ["PENDIENTE", "EN_PREPARACION"].includes(newStatus)) throw new Error("Un pedido finalizado no se puede reabrir desde preparación.");
    let targetOrder = null;
    const orders = this.getOrders().map((order) => {
      if (order.id === orderId) {
        targetOrder = { ...order, estado: newStatus, updated_at: new Date().toISOString() };
        return targetOrder;
      }
      return order;
    });
    this.persistOrders(orders);
    if (targetOrder) this.syncOrderToSupabase(targetOrder);
    this.notify("orders_changed");
  }

  preparationItemResolved(item) {
    if (item.sin_stock) return true;
    const valid = typeof item.peso_real === "number" && Number.isFinite(item.peso_real) && item.peso_real > 0;
    return valid && (item.unidad_medida === "KG" || (item.unidad_medida === "UNIDAD" && Number.isInteger(item.peso_real) && item.confirmado_preparacion === true));
  }

  getPreparationProgress(orderId) {
    const order = this.getOrders().find((o) => o.id === orderId);
    const items = order?.items || [];
    const historical = order && ["LISTO", "ENTREGADO"].includes(order.estado);
    const resolved = historical ? items.length : items.filter((i) => this.preparationItemResolved(i)).length;
    return { resolved, total: items.length, canFinalize: Boolean(order && !historical && order.estado !== "CANCELADO" && items.length > 0 && resolved === items.length) };
  }

  parsePreparedValue(value, unit) {
    const parsed = typeof value === "number" || (typeof value === "string" && value.trim()) ? Number(String(value).replace(",", ".")) : NaN;
    return Number.isFinite(parsed) && parsed > 0 && (unit === "KG" || Number.isInteger(parsed)) ? parsed : null;
  }

  updateItemWeight(orderId, itemIndex, pesoReal, { notify = true, confirmUnit = false } = {}) {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order || !order.items[itemIndex] || !["PENDIENTE", "EN_PREPARACION"].includes(order.estado)) throw new Error("El pedido o ítem no está disponible para preparación.");
    const previous = order.items[itemIndex];
    const peso = this.parsePreparedValue(pesoReal, previous.unidad_medida);
    if (confirmUnit && previous.unidad_medida === "UNIDAD" && peso === null) throw new Error("Ingresá una cantidad entera mayor que cero; para cero usá Sin Stock.");
    if (peso !== null && !Number.isFinite(peso * previous.precio_unitario)) throw new Error("El importe de preparación no es válido.");
    const item = { ...previous, peso_real: peso, subtotal: previous.sin_stock ? 0 : peso === null ? 0 : Math.round(peso * previous.precio_unitario) };
    if (previous.unidad_medida === "UNIDAD") item.confirmado_preparacion = peso !== null && (confirmUnit || (previous.peso_real === peso && previous.confirmado_preparacion === true));
    const items = order.items.map((i, index) => index === itemIndex ? item : i);
    const totalReal = items.every((i) => i.sin_stock || this.parsePreparedValue(i.peso_real, i.unidad_medida) !== null)
      ? items.filter((i) => !i.sin_stock).reduce((sum, i) => sum + i.subtotal, 0) : null;
    const target = { ...order, items, total_real: totalReal };
    this.persistOrders(orders.map((o) => o.id === orderId ? target : o));
    this.syncOrderToSupabase(target);
    if (notify) this.notify("orders_changed");
    return target;
  }

  toggleItemOutOfStock(orderId, itemIndex) {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order || !order.items[itemIndex] || !["PENDIENTE", "EN_PREPARACION"].includes(order.estado)) throw new Error("El ítem no está disponible para preparación.");
    const previous = order.items[itemIndex];
    const item = { ...previous, sin_stock: !previous.sin_stock };
    if (item.unidad_medida === "UNIDAD") item.confirmado_preparacion = false;
    const qty = this.parsePreparedValue(item.peso_real, item.unidad_medida);
    item.subtotal = item.sin_stock || qty === null ? 0 : Math.round(qty * item.precio_unitario);
    const items = order.items.map((i, index) => index === itemIndex ? item : i);
    const totalReal = items.filter((i) => !i.sin_stock && i.peso_real !== null).reduce((sum, i) => sum + i.subtotal, 0);
    const target = { ...order, items, total_real: totalReal };
    this.persistOrders(orders.map((o) => o.id === orderId ? target : o));
    this.syncOrderToSupabase(target);
    this.notify("orders_changed");
    return target;
  }

  finalizeOrderWeighing(orderId, weightsMap = null) {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error("No se encontró el pedido.");
    if (["LISTO", "ENTREGADO"].includes(order.estado)) return order;
    if (order.estado === "CANCELADO" || order.items.length === 0) throw new Error("Agregá un ítem o cancelá el pedido vacío; no se puede finalizar así.");
    const items = order.items.map((item, index) => {
      if (item.sin_stock) return { ...item, subtotal: 0 };
      const value = weightsMap && Object.hasOwn(weightsMap, index) ? weightsMap[index] : item.peso_real;
      const qty = this.parsePreparedValue(value, item.unidad_medida);
      const prepared = { ...item, peso_real: qty };
      if (!this.preparationItemResolved(prepared) || (item.unidad_medida === "UNIDAD" && qty !== item.peso_real)) throw new Error("Falta preparar o confirmar ítems. Revisá cantidades y pesos antes de finalizar.");
      if (!Number.isFinite(item.precio_unitario) || item.precio_unitario < 0) throw new Error("El precio del pedido no es válido.");
      const subtotal = Math.round(qty * item.precio_unitario);
      if (!Number.isFinite(subtotal)) throw new Error("El importe final no es válido.");
      return { ...prepared, subtotal };
    });
    const target = { ...order, items, total_real: items.filter((i) => !i.sin_stock).reduce((sum, i) => sum + i.subtotal, 0), estado: "LISTO", finalizado_at: new Date().toISOString() };
    this.persistOrders(orders.map((o) => o.id === orderId ? target : o));
    this.syncOrderToSupabase(target);
    this.notify("orders_changed");
    this.notify("order_ready", orderId);
    return target;
  }

  // Eliminar o cancelar completamente un pedido
  deleteOrder(orderId) {
    const orders = this.getOrders().filter((o) => o.id !== orderId);
    this.persistOrders(orders);
    if (this.supabase) {
      this.supabase.from("pedidos").update({
        estado: "CANCELADO",
        cancelado_at: new Date().toISOString()
      }).eq("id", orderId).then(() => {});
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
    this.persistOrders(orders);
    if (targetOrder) this.syncOrderToSupabase(targetOrder);
    if (this.getActiveOrderId() === orderId) {
      this.setActiveOrderId(null);
    }
    this.notify("orders_changed");
  }

  // Quitar un producto específico del pedido
  removeItemFromOrder(orderId, itemIndex) {
    const current = this.getOrders().find((o) => o.id === orderId);
    if (current && !["PENDIENTE", "EN_PREPARACION"].includes(current.estado)) throw new Error("El pedido finalizado o cancelado conserva sus ítems.");
    let targetOrder = null;
    const orders = this.getOrders().map((order) => {
      if (order.id === orderId) {
        const items = order.items.filter((_, idx) => idx !== itemIndex);
        const totalEstimado = items.reduce((sum, i) => sum + Math.round(i.cantidad_solicitada * i.precio_unitario), 0);

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
    this.persistOrders(orders);
    if (targetOrder) this.syncOrderToSupabase(targetOrder);
    this.notify("orders_changed");
  }

  // Agregar un producto al pedido en preparación
  addProductToOrder(orderId, productId, cantidad) {
    const product = this.getProducts().find((p) => p.id === productId);
    if (!product || !product.disponible) throw new Error("El producto está pausado, archivado o no disponible.");
    const current = this.getOrders().find((o) => o.id === orderId);
    if (!current || !["PENDIENTE", "EN_PREPARACION"].includes(current.estado)) throw new Error("El pedido no está disponible para agregar productos.");
    const qty = this.parsePreparedValue(cantidad, product.unidad_medida);
    if (qty === null) throw new Error("Ingresá una cantidad válida mayor que cero.");
    const subtotal = Math.round(qty * product.precio);
    if (!Number.isFinite(subtotal)) throw new Error("El importe del producto no es válido.");

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
          sin_stock: false,
          ...(product.unidad_medida === "UNIDAD" ? { confirmado_preparacion: false } : {})
        };
        const items = [...order.items, newItem];
        const totalEstimado = items.reduce((sum, i) => sum + Math.round(i.cantidad_solicitada * i.precio_unitario), 0);

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
    this.persistOrders(orders);
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
    this.persistOrders(orders);
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
  let viewMode = "catalog"; // "catalog" | "orders" | "order_detail"
  let selectedOrderId = null;
  let deliveryMode = "RETIRO"; // RETIRO | DELIVERY
  let deliveryAddress = "";
  let checkoutError = "";
  let catalogRecoveryError = "";

  let catalogScrollBeforeCart = 0;

  // Restaurar pedido activo al iniciar (garantía de recibo accesible tras recarga)
  const initialUser = store.getCurrentUser();
  const initialActive = initialUser ? store.getActiveOrder(initialUser.telefono) : null;
  if (initialActive && initialActive.estado !== "ENTREGADO" && initialActive.estado !== "CANCELADO") {
    viewMode = "order_detail";
    selectedOrderId = initialActive.id;
  }

  const imageLoader = createScopedImageLoader();
  let renderedUserKey = initialUser?.telefono ? String(initialUser.telefono).replace(/\D/g, "") : null;

  function update() {
    imageLoader.revokeAll();
    const user = store.getCurrentUser();
    const userKey = user?.telefono ? String(user.telefono).replace(/\D/g, "") : null;
    if (!user || userKey !== renderedUserKey) {
      isCartOpen = false;
      isDrawerFirstOpen = true;
      selectedOrderId = null;
      viewMode = "catalog";
      deliveryMode = "RETIRO";
      deliveryAddress = "";
      checkoutError = "";
      selectedCategory = "Todos";
      searchQuery = "";
      catalogScrollBeforeCart = 0;
      document.getElementById("nexo-top-stack")?.removeAttribute("inert");
      document.body.style.overflow = "";
      renderedUserKey = userKey;
      window.scrollTo(0, 0);
    }
    if (!user) {
      renderPhoneGate();
      return;
    }

    if (viewMode === "order_detail") {
      const order = store.getOrders().find(o => o.id === selectedOrderId);
      if (order && store.isSameCustomer(order.cliente?.telefono, user.telefono)) {
        renderOrderTracking(order);
        return;
      } else {
        renderOrderNotFound();
        return;
      }
    }

    if (viewMode === "orders") {
      renderCustomerOrdersList(user);
      return;
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

          <div class="mb-6">
            <span class="inline-block text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-2">
              Verdulería Digital
            </span>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">${store.getBusinessProfile().name || "Nexo Pedidos"}</h1>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Catálogo fresco del día, pedidos directos desde tu celular y pesaje transparente en balanza.
            </p>
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

          ${store.isDemo() ? `
            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                id="btn-quick-demo-user"
                type="button"
                class="w-full min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl transition tap-feedback text-center border border-transparent dark:border-slate-700"
              >
                Probar como ${DEMO_QUICK_CUSTOMER.nombre}
              </button>
            </div>
          ` : ""}

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

    nameInput?.addEventListener("input", clearNameError);

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
  function performCartAction(action) {
    try {
      action();
    } catch (error) {
      checkoutError = error.message;
      renderCatalog();
    }
  }

  function renderCatalog() {
    const user = store.getCurrentUser();
    const products = store.getProducts();
    const categories = ["Todos", ...store.getCategories().filter((cat) => cat !== "Todos")];
    if (!categories.includes(selectedCategory)) selectedCategory = "Todos";

    const catalogError = catalogRecoveryError || store.getCatalogError();
    const storageWarning = store.getStorageWarning();
    const cart = store.getCart();
    const { items: cartItems, totalEstimado, totalItems } = store.getCartSummary();

    const customerOrders = store.getOrdersByCustomer(user.telefono);
    const ongoingOrders = customerOrders.filter(o => o.estado !== "ENTREGADO" && o.estado !== "CANCELADO");
    const ongoingCount = ongoingOrders.length;

    if (!deliveryAddress && user.direccion) {
      deliveryAddress = user.direccion;
    }

    const filteredProducts = products.filter((p) => {
      const matchesCategory = selectedCategory === "Todos" || p.categoria === selectedCategory;
      const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });

    const categoryCounts = {};
    categories.forEach((cat) => {
      categoryCounts[cat] = cat === "Todos"
        ? products.length
        : products.filter((p) => p.categoria === cat).length;
    });

    const prevScrollEl = container.querySelector("#cart-drawer-items-list");
    const savedDrawerScroll = prevScrollEl ? prevScrollEl.scrollTop : 0;

    container.innerHTML = `
      <div id="client-catalog-content" class="max-w-4xl mx-auto pb-32 sm:pb-36 w-full overflow-x-clip safe-pb">
        ${catalogError ? `<div role="alert" class="m-4 p-4 rounded-2xl border border-amber-300 bg-amber-50 text-amber-950 text-sm">
          <p>${escapeHtml(catalogError)}</p>
          ${store.isDemo() ? `<p class="mt-2">Recuperar conserva un respaldo del original y las filas válidas; si no hay filas válidas, usa el catálogo sintético.</p><button id="btn-recover-catalog" class="min-h-[44px] mt-2 px-4 py-2 rounded-xl bg-amber-900 text-white font-bold">Recuperar catálogo demo</button>` : ""}
        </div>` : ""}
        ${storageWarning ? `<p role="alert" class="m-4 p-3 rounded-xl bg-amber-50 text-amber-950 text-sm">${escapeHtml(storageWarning)}</p>` : ""}
        ${checkoutError && !isCartOpen ? `<p role="alert" class="m-4 p-3 rounded-xl bg-red-50 text-red-900 text-sm">${escapeHtml(checkoutError)}</p>` : ""}

        <!-- Área de Cabecera y Usuario FUERA del Sticky (Scrolla con la página) -->
        <div class="px-4 pt-3 pb-1">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase truncate">Catálogo del Día</span>
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Abierto
              </span>
            </div>

            <!-- Acceso a Mis Pedidos (M2: con conteo de pedidos en curso) -->
            <button
              id="btn-my-orders"
              class="min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition tap-feedback touch-target flex items-center gap-1.5 shrink-0"
              title="Ver mis pedidos anteriores y en curso"
            >
              <span>Mis pedidos</span>
              ${ongoingCount > 0 ? `
                <span class="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                  ${ongoingCount} en curso
                </span>
              ` : `
                <span class="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                  ${customerOrders.length}
                </span>
              `}
            </button>
          </div>

          <div class="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="truncate">Hola, <strong class="text-slate-800 dark:text-slate-200 font-semibold">${escapeHtml(user.nombre)}</strong></span>
              <button id="btn-change-user" class="min-h-[44px] min-w-[44px] inline-flex items-center px-1 text-slate-400 dark:text-slate-500 underline hover:text-slate-600 dark:hover:text-slate-300 text-[11px] touch-target shrink-0">Cambiar</button>
            </div>
          </div>
        </div>

        <!-- Área Sticky fija exclusiva para controles útiles de búsqueda y categorías -->
        <header class="sticky sticky-header-offset z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 pt-2.5 pb-2 shadow-xs">
          <!-- Buscador con tamaño de fuente >= 16px para evitar auto-zoom en iOS Safari -->
          <div class="relative">
            <input
              type="text"
              id="search-input"
              placeholder="Buscar productos..."
              value="${escapeHtml(searchQuery)}"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              class="w-full pl-3.5 pr-14 py-2.5 bg-slate-100 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 border border-slate-200/80 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-base font-medium outline-none transition"
            />
            ${searchQuery ? `
              <button id="btn-clear-search" class="absolute right-1 top-1 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-bold tap-feedback rounded-xl touch-target" title="Borrar búsqueda" aria-label="Borrar búsqueda">
                Borrar
              </button>
            ` : ""}
          </div>

          <!-- Píldoras de Categorías con conteo (Horizontal Scroll Táctil) -->
          <div class="mt-2 flex gap-2 overflow-x-auto no-scrollbar overscroll-x-contain py-1 -mx-4 px-4">
            ${categories.map(cat => `
              <button
                data-category="${escapeHtml(cat)}"
                class="category-pill shrink-0 whitespace-nowrap min-h-[44px] px-4 py-2.5 rounded-full text-xs font-bold transition tap-feedback touch-target flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent dark:border-slate-800"
                }"
              >
                <span>${escapeHtml(cat)}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full ${
                  selectedCategory === cat ? "bg-slate-800 dark:bg-emerald-800 text-slate-200 dark:text-white font-black" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }">
                  ${categoryCounts[cat] || 0}
                </span>
              </button>
            `).join("")}
            <div class="w-2 shrink-0 select-none pointer-events-none" aria-hidden="true"></div>
          </div>
        </header>

        <!-- Contenedor de Productos: 2 columnas en mobile >=360px y 1 columna en <360px -->
        <main id="products-list-container" class="p-4 products-grid">
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
        ${totalItems > 0 ? `
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
        ` : ""}
      </div>

      <!-- Modal Accesible de Carrito (M1) Renderizado como hermano fuera del contenido inerte -->
      ${isCartOpen ? renderCartModal(user, cartItems, totalEstimado) : ""}
    `;

    const catalogWrapper = container.querySelector("#client-catalog-content");
    const topStack = document.getElementById("nexo-top-stack");

    if (isCartOpen) {
      if (catalogWrapper) catalogWrapper.setAttribute("inert", "");
      if (topStack) topStack.setAttribute("inert", "");
      document.body.style.overflow = "hidden";

      const newScrollEl = container.querySelector("#cart-drawer-items-list");
      if (newScrollEl && savedDrawerScroll > 0) {
        newScrollEl.scrollTop = savedDrawerScroll;
      }
      isDrawerFirstOpen = false;
    } else {
      if (catalogWrapper) catalogWrapper.removeAttribute("inert");
      if (topStack) topStack.removeAttribute("inert");
      document.body.style.overflow = "";
    }

    attachCatalogListeners(user);
    hydrateClientImages();
    if (isCartOpen) {
      attachCartModalListeners(user);
    }
  }

  function hydrateClientImages() {
    container.querySelectorAll("img[data-image-id]").forEach(img => {
      const id = img.dataset.imageId;
      if (id) imageLoader.hydrate(img, id);
    });
  }

  // Tarjetas de productos compactas para mobile (M1 & M3)
  function renderProductCardsHTML(products, cart) {
    if (products.length === 0) {
      return `
        <div class="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">Sin coincidencias</span>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No encontramos productos con ese nombre</p>
          <button id="btn-reset-filter" class="mt-3 min-h-[44px] px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 tap-feedback border border-transparent dark:border-slate-700 touch-target">
            Limpiar búsqueda
          </button>
        </div>
      `;
    }

    return products.map(product => {
      const cartItem = cart[product.id];
      const currentQty = cartItem ? cartItem.cantidad : 0;
      const step = product.paso || (product.unidad_medida === "KG" ? 0.5 : 1);
      const isKg = product.unidad_medida === "KG";
      const unitLabel = isKg ? "kg" : "u.";
      const unitSubtitle = isKg ? "Por kilo" : "Por unidad";
      const inCart = currentQty > 0;
      const itemSubtotal = inCart ? Math.round(currentQty * product.precio) : 0;
      const hasImage = Boolean(product.imagen_id);

      return `
        <div class="relative bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border transition flex flex-col justify-between ${
          inCart ? "border-emerald-500/60 bg-emerald-50/15 dark:bg-emerald-950/20 shadow-xs" : "border-slate-200/80 dark:border-slate-800 shadow-xs"
        } ${!product.disponible ? "opacity-40 grayscale pointer-events-none" : ""}">

          <!-- Botón de Descarte Rápido '×' (Visible sólo si Qty > 0, 44x44px táctil) -->
          ${inCart && product.disponible ? `
            <button
              type="button"
              data-quick-discard-id="${escapeHtml(product.id)}"
              class="btn-quick-discard absolute top-2 right-2 min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 active:bg-rose-100 transition tap-feedback touch-target z-10"
              title="Quitar ${escapeHtml(product.nombre)} del pedido"
              aria-label="Quitar ${escapeHtml(product.nombre)} del pedido"
            >
              <span class="text-xl font-bold leading-none select-none" aria-hidden="true">×</span>
            </button>
          ` : ""}

          <div>
            ${hasImage ? `
              <div class="product-photo-wrapper w-full aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden mb-2.5 relative hidden">
                <img data-image-id="${escapeHtml(product.imagen_id)}" alt="" class="w-full h-full object-cover hidden" />
              </div>
            ` : ""}

            <div class="flex items-center flex-wrap gap-1 mb-1">
              <span class="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                ${escapeHtml(product.categoria)}
              </span>
              <span class="text-[10px] text-slate-300 dark:text-slate-600 font-bold select-none">/</span>
              <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                ${unitSubtitle}
              </span>
              ${inCart ? `
                <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                  En pedido
                </span>
              ` : ""}
            </div>

            <h3 class="font-extrabold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
              ${escapeHtml(product.nombre)}
            </h3>
            ${product.detalle ? `<p class="hidden sm:block truncate text-xs text-slate-500 dark:text-slate-400 mt-1">${escapeHtml(product.detalle)}</p>` : ""}

            <div class="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
              <span class="text-base font-black text-emerald-700 dark:text-emerald-400">
                $${product.precio.toLocaleString("es-AR")}
              </span>
              <span class="text-xs text-slate-400 dark:text-slate-500 font-medium">/ ${unitLabel}</span>
              ${inCart ? `
                <span class="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                  ($${itemSubtotal.toLocaleString("es-AR")})
                </span>
              ` : ""}
            </div>

            ${!product.disponible ? `
              <span class="inline-block text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mt-1">Pausado</span>
            ` : ""}
          </div>

          <!-- Selector de Cantidad / Botón Táctil (Mínimo 44px) -->
          <div class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            ${product.disponible ? (!inCart ? `
              <button
                data-add-id="${escapeHtml(product.id)}"
                data-step="${step}"
                class="btn-add-initial w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border dark:border-slate-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition tap-feedback touch-target flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Agregar</span>
                <span class="text-xs font-bold">+</span>
              </button>
            ` : `
              <div class="w-full flex items-center justify-between bg-emerald-600 text-white rounded-xl p-0.5 shadow-xs min-h-[44px]">
                <button
                  type="button"
                  data-dec-id="${escapeHtml(product.id)}"
                  data-step="${step}"
                  class="btn-qty-dec min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg hover:bg-emerald-700 active:scale-90 text-base font-black transition tap-feedback touch-target"
                  title="Restar"
                  aria-label="Restar cantidad"
                >
                  −
                </button>
                <span class="px-1 text-xs font-black min-w-[40px] text-center tracking-tight select-none truncate">
                  ${currentQty} ${unitLabel}
                </span>
                <button
                  type="button"
                  data-inc-id="${escapeHtml(product.id)}"
                  data-step="${step}"
                  class="btn-qty-inc min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg hover:bg-emerald-700 active:scale-90 text-base font-black transition tap-feedback touch-target"
                  title="Sumar"
                  aria-label="Sumar cantidad"
                >
                  +
                </button>
              </div>
            `) : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  function attachCatalogListeners(user) {
    container.querySelector("#btn-recover-catalog")?.addEventListener("click", () => {
      try {
        catalogRecoveryError = "";
        store.recoverCatalog();
      } catch (error) {
        catalogRecoveryError = error.message;
      }
      renderCatalog();
    });

    container.querySelector("#btn-change-user")?.addEventListener("click", () => {
      store.logoutUser();
      update();
    });

    // M2: Navegar a Mis Pedidos
    container.querySelector("#btn-my-orders")?.addEventListener("click", () => {
      viewMode = "orders";
      update();
    });

    container.querySelector("#btn-open-cart")?.addEventListener("click", () => {
      catalogScrollBeforeCart = window.scrollY || 0;
      isCartOpen = true;
      isDrawerFirstOpen = true;
      renderCatalog();
    });

    const searchInput = container.querySelector("#search-input");
    searchInput?.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      const listContainer = container.querySelector("#products-list-container");
      if (listContainer) {
        const cart = store.getCart();
        const products = store.getProducts();
        const filtered = products.filter((p) => {
          const matchesCategory = selectedCategory === "Todos" || p.categoria === selectedCategory;
          const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase().trim());
          return matchesCategory && matchesSearch;
        });
        imageLoader.revokeAll();
        listContainer.innerHTML = renderProductCardsHTML(filtered, cart);
        hydrateClientImages();
        attachProductItemListeners();
      }
    });

    container.querySelector("#btn-clear-search")?.addEventListener("click", () => {
      searchQuery = "";
      renderCatalog();
      container.querySelector("#search-input")?.focus();
    });

    container.querySelectorAll(".category-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedCategory = btn.dataset.category;
        renderCatalog();
      });
    });

    container.querySelector("#btn-reset-filter")?.addEventListener("click", () => {
      searchQuery = "";
      selectedCategory = "Todos";
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
        performCartAction(() => store.addToCart(id, step));
      });
    });

    container.querySelectorAll(".btn-qty-dec").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch {} }
        const id = btn.dataset.decId;
        const step = Number(btn.dataset.step) || 0.5;
        performCartAction(() => store.addToCart(id, -step));
      });
    });

    container.querySelectorAll(".btn-quick-discard, .btn-remove-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch {} }
        const id = btn.dataset.quickDiscardId || btn.dataset.removeId;
        performCartAction(() => store.removeFromCart(id));
      });
    });
  }

  // ========================================================
  // 3. MODAL ACCESIBLE DE CARRITO Y CHECKOUT (M1)
  // ========================================================
  function renderCartModal(user, items, totalEstimado) {
    const isDelivery = deliveryMode === "DELIVERY";
    const isEmpty = items.length === 0;

    return `
      <!-- Backdrop Modal con z-index 70 (sobre cabecera demo z-50) -->
      <div id="cart-drawer-backdrop" class="cart-modal-backdrop animate-fade-in" role="presentation">
        <section
          id="cart-drawer-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-title"
          class="cart-modal-dialog shadow-2xl ${isDrawerFirstOpen ? "animate-slide-up" : ""}"
        >
          ${checkoutError ? `<p role="alert" class="m-4 p-3 rounded-xl border border-red-300 bg-red-50 text-red-900 text-sm">${escapeHtml(checkoutError)}</p>` : ""}

          <!-- Asa táctil exclusiva para arrastre y cierre downward >=80px -->
          <div id="cart-drag-handle" class="py-3 px-6 cursor-grab active:cursor-grabbing touch-none select-none flex flex-col items-center">
            <div class="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
            <span class="sr-only">Deslizar hacia abajo para cerrar</span>
          </div>

          <!-- Cabecera del Carrito con botón de cierre accesible (44x44px) -->
          <div id="cart-drawer-header" class="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between touch-none">
            <div>
              <h2 id="cart-drawer-title" class="font-black text-slate-900 dark:text-white text-lg tracking-tight">Tu Pedido</h2>
              <p class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Revisá las cantidades antes de confirmar</p>
            </div>
            <button
              id="btn-close-cart"
              class="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 flex items-center justify-center font-bold text-xs tap-feedback touch-target border border-transparent dark:border-slate-700"
              title="Cerrar pedido"
              aria-label="Cerrar pedido"
            >
              Cerrar
            </button>
          </div>

          <!-- Lista de Ítems en Carrito con Controles Directos Accesibles (Scroll independiente) -->
          <div id="cart-drawer-items-list" class="p-5 overflow-y-auto space-y-3 flex-1 overscroll-contain">
            ${isEmpty ? `
              <div class="text-center py-12 px-4">
                <span class="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 mb-2">Pedido Vacío</span>
                <h4 class="font-extrabold text-slate-800 dark:text-slate-200 text-sm">Tu pedido no tiene productos</h4>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">Seleccioná frutas y verduras del catálogo para coordinar el pesaje en balanza.</p>
                <button
                  id="btn-drawer-empty-back"
                  type="button"
                  class="mt-4 min-h-[44px] px-5 py-2.5 bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold rounded-xl transition tap-feedback shadow-sm touch-target"
                >
                  Volver al Catálogo
                </button>
              </div>
            ` : items.map(item => `
              <div class="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3">
                <div class="flex-1 min-w-0 pr-1">
                  <span class="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    ${escapeHtml(item.categoria || "Producto")}
                  </span>
                  <h4 class="font-extrabold text-slate-900 dark:text-white text-sm truncate mt-0.5">${escapeHtml(item.nombre)}</h4>
                  <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span class="font-black text-sm text-slate-900 dark:text-white">$${item.subtotal_estimado.toLocaleString("es-AR")}</span>
                    <span class="text-xs text-slate-400 dark:text-slate-500 font-medium">($${item.precio_unitario.toLocaleString("es-AR")}/${item.unidad_medida === "KG" ? "kg" : "u."})</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <div class="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-xs min-h-[44px]">
                    <button
                      type="button"
                      data-drawer-dec="${escapeHtml(item.producto_id)}"
                      class="min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 rounded-lg font-black text-base tap-feedback touch-target"
                      title="Restar cantidad"
                      aria-label="Restar cantidad de ${escapeHtml(item.nombre)}"
                    >
                      −
                    </button>
                    <span class="px-1 text-xs font-black min-w-[32px] text-center text-slate-900 dark:text-white select-none">
                      ${item.cantidad}
                    </span>
                    <button
                      type="button"
                      data-drawer-inc="${escapeHtml(item.producto_id)}"
                      class="min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 rounded-lg font-black text-base tap-feedback touch-target"
                      title="Sumar cantidad"
                      aria-label="Sumar cantidad de ${escapeHtml(item.nombre)}"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    data-drawer-remove="${escapeHtml(item.producto_id)}"
                    class="min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:active:bg-rose-900/80 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 transition tap-feedback shadow-xs shrink-0 touch-target"
                    title="Quitar ${escapeHtml(item.nombre)} del pedido"
                    aria-label="Quitar ${escapeHtml(item.nombre)} del pedido"
                  >
                    <span class="text-xl font-bold leading-none select-none" aria-hidden="true">×</span>
                  </button>
                </div>
              </div>
            `).join("")}

            ${!isEmpty ? `
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
                  value="${escapeHtml(deliveryAddress)}"
                  placeholder="Calle, número, piso y departamento"
                  class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-base font-medium outline-none focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 transition"
                />
              </div>

              <div class="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3.5 text-xs text-amber-950 dark:text-amber-200 mt-2">
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span class="font-bold text-[11px] uppercase tracking-wider text-amber-900 dark:text-amber-300">Pesaje en Balanza</span>
                </div>
                <p class="text-[11px] leading-relaxed opacity-90">
                  El total indicado es una estimación. En el mostrador se pesan las unidades reales y te notificaremos el comprobante con los gramos exactos y el importe final.
                </p>
              </div>
            ` : ""}
          </div>

          <!-- Footer con Safe Area Pad y Confirmación -->
          <div class="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-b-3xl space-y-3 safe-pb">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider">Total Estimado</span>
                <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Sujeto a balanza</span>
              </div>
              <span class="font-black text-2xl text-slate-900 dark:text-white">$${totalEstimado.toLocaleString("es-AR")}</span>
            </div>

            ${isEmpty ? `
              <button
                id="btn-confirm-order"
                disabled
                class="w-full min-h-[50px] bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 font-black py-4 rounded-2xl text-sm cursor-not-allowed opacity-60 text-center"
              >
                Pedido Vacío
              </button>
            ` : `
              <button
                id="btn-confirm-order"
                class="w-full min-h-[50px] bg-slate-950 hover:bg-slate-900 active:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-950/20 text-sm transition tap-feedback flex items-center justify-center gap-2 touch-target"
              >
                <span>Confirmar Pedido</span>
              </button>
            `}
          </div>
        </section>
      </div>
    `;
  }

  function closeCartModal() {
    isCartOpen = false;
    document.getElementById("nexo-top-stack")?.removeAttribute("inert");
    document.body.style.overflow = "";

    renderCatalog();

    const freshBtn = container.querySelector("#btn-open-cart");
    if (freshBtn && typeof freshBtn.focus === "function") {
      freshBtn.focus({ preventScroll: true });
    }
    window.scrollTo(0, catalogScrollBeforeCart);
  }

  function attachCartModalListeners(user) {
    const backdrop = container.querySelector("#cart-drawer-backdrop");
    const sheet = container.querySelector("#cart-drawer-sheet");
    const handle = container.querySelector("#cart-drag-handle");
    const header = container.querySelector("#cart-drawer-header");
    const closeBtn = container.querySelector("#btn-close-cart");

    // Foco inicial accesible
    closeBtn?.focus();

    sheet?.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeCartModal();
        return;
      }
      if (e.key === "Tab") {
        const focusable = Array.from(sheet.querySelectorAll("button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])"))
          .filter(el => !el.disabled && el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // Cierre en fondo del backdrop
    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeCartModal();
      }
    });

    closeBtn?.addEventListener("click", closeCartModal);
    container.querySelector("#btn-drawer-empty-back")?.addEventListener("click", closeCartModal);

    // Arrastre hacia abajo desde asa táctil o cabecera libre (M1 & P2)
    let startY = 0;
    let isDragging = false;
    let activePointerId = null;

    function onPointerDown(e) {
      if (e.target.closest("button, input, select, textarea, a, [role='button']")) return;
      isDragging = true;
      startY = e.clientY;
      activePointerId = e.pointerId;
      sheet.style.transition = "none";
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      if (activePointerId !== null && e.pointerId !== undefined && e.pointerId !== activePointerId) return;
      const deltaY = e.clientY - startY;
      if (deltaY > 0) {
        sheet.style.transform = `translateY(${deltaY}px)`;
      } else {
        sheet.style.transform = "translateY(0)";
      }
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      if (activePointerId !== null && e.pointerId !== undefined && e.pointerId !== activePointerId) return;
      isDragging = false;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      const finalDeltaY = e.clientY - startY;
      if (finalDeltaY >= 80) {
        closeCartModal();
      } else {
        sheet.style.transition = "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)";
        sheet.style.transform = "translateY(0)";
        setTimeout(() => { if (sheet) sheet.style.transition = ""; }, 220);
      }
    }

    function onPointerCancel(e) {
      if (!isDragging) return;
      if (activePointerId !== null && e.pointerId !== undefined && e.pointerId !== activePointerId) return;
      isDragging = false;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      sheet.style.transition = "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)";
      sheet.style.transform = "translateY(0)";
      setTimeout(() => { if (sheet) sheet.style.transition = ""; }, 220);
    }

    const dragElements = [handle, header].filter(Boolean);
    dragElements.forEach(el => {
      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerup", onPointerUp);
      el.addEventListener("pointercancel", onPointerCancel);
    });

    const addressInput = container.querySelector("#delivery-address-input");
    addressInput?.addEventListener("input", (e) => {
      deliveryAddress = e.target.value;
    });

    // Toggle de método de entrega sin destruir scroll
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

    // Steppers en Carrito
    container.querySelectorAll("[data-drawer-inc]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch {} }
        const id = btn.dataset.drawerInc;
        const product = store.getProducts().find((p) => p.id === id);
        const step = product?.paso || (product?.unidad_medida === "KG" ? 0.5 : 1);
        performCartAction(() => store.addToCart(id, step));
      });
    });

    container.querySelectorAll("[data-drawer-dec]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch {} }
        const id = btn.dataset.drawerDec;
        const product = store.getProducts().find((p) => p.id === id);
        const step = product?.paso || (product?.unidad_medida === "KG" ? 0.5 : 1);
        performCartAction(() => store.addToCart(id, -step));
      });
    });

    container.querySelectorAll("[data-drawer-remove]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch {} }
        const id = btn.dataset.drawerRemove;
        performCartAction(() => store.removeFromCart(id));
      });
    });

    const btnConfirm = container.querySelector("#btn-confirm-order");
    btnConfirm?.addEventListener("click", () => {
      const { items } = store.getCartSummary();
      if (items.length === 0) {
        closeCartModal();
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

      try {
        checkoutError = "";
        const newOrder = store.createOrder({ cliente: user, tipo_entrega: mode, direccion_entrega: finalAddress });
        if (newOrder) {
          isCartOpen = false;
          isDrawerFirstOpen = true;
          document.getElementById("nexo-top-stack")?.removeAttribute("inert");
          document.body.style.overflow = "";
          selectedOrderId = newOrder.id;
          viewMode = "order_detail";
          update();
        }
      } catch (error) {
        checkoutError = error.message || "No se pudo guardar el pedido. Reintentá.";
        renderCatalog();
      }
    });
  }

  // ========================================================
  // 4. LISTA DE PEDIDOS DEL CLIENTE (M2 — Mis Pedidos)
  // ========================================================
  function renderCustomerOrdersList(user) {
    const orders = store.getOrdersByCustomer(user.telefono);

    // Separar en dos grupos: En curso / Historial (más recientes primero)
    const ongoing = orders
      .filter(o => o.estado !== "ENTREGADO" && o.estado !== "CANCELADO")
      .sort((a, b) => b.id - a.id);

    const history = orders
      .filter(o => o.estado === "ENTREGADO" || o.estado === "CANCELADO")
      .sort((a, b) => b.id - a.id);

    container.innerHTML = `
      <div class="max-w-2xl mx-auto p-4 pb-28 safe-pb">
        <div class="flex items-center justify-between mb-4">
          <button
            id="btn-orders-back-to-catalog"
            class="min-h-[44px] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition tap-feedback touch-target flex items-center gap-1.5"
          >
            <span>← Volver al Catálogo</span>
          </button>
          <span class="text-xs font-bold text-slate-500">Mis Pedidos</span>
        </div>

        <div class="space-y-6">
          <!-- Sección 1: En curso -->
          <section>
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>En curso</span>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  ${ongoing.length}
                </span>
              </h2>
            </div>

            ${ongoing.length === 0 ? `
              <div class="p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No tenés pedidos en preparación en este momento.
              </div>
            ` : `
              <div class="space-y-2.5">
                ${ongoing.map(order => renderOrderRowHTML(order)).join("")}
              </div>
            `}
          </section>

          <!-- Sección 2: Historial -->
          <section>
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Historial</span>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  ${history.length}
                </span>
              </h2>
            </div>

            ${history.length === 0 ? `
              <div class="p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No tenés compras anteriores en el historial.
              </div>
            ` : `
              <div class="space-y-2.5">
                ${history.map(order => renderOrderRowHTML(order)).join("")}
              </div>
            `}
          </section>
        </div>
      </div>
    `;

    container.querySelector("#btn-orders-back-to-catalog")?.addEventListener("click", () => {
      viewMode = "catalog";
      update();
    });

    container.querySelectorAll("[data-customer-order-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedOrderId = Number(btn.dataset.customerOrderId);
        viewMode = "order_detail";
        update();
      });
    });
  }

  function renderOrderRowHTML(order) {
    const isOngoing = order.estado !== "ENTREGADO" && order.estado !== "CANCELADO";
    const dateFormatted = order.fecha
      ? new Date(order.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "";

    let totalLabel = "Estimado:";
    let totalValue = `$${(order.total_estimado || 0).toLocaleString("es-AR")}`;

    if (order.estado === "EN_PREPARACION") {
      if (Number.isFinite(order.total_real)) {
        totalLabel = "Provisional:";
        totalValue = `$${order.total_real.toLocaleString("es-AR")}`;
      } else {
        totalLabel = "Estimado:";
        totalValue = `$${(order.total_estimado || 0).toLocaleString("es-AR")}`;
      }
    } else if (order.estado === "LISTO" || order.estado === "ENTREGADO") {
      if (Number.isFinite(order.total_real)) {
        totalLabel = "Total final:";
        totalValue = `$${order.total_real.toLocaleString("es-AR")}`;
      } else {
        totalLabel = "Estimado:";
        totalValue = `$${(order.total_estimado || 0).toLocaleString("es-AR")}`;
      }
    } else if (order.estado === "CANCELADO") {
      totalLabel = "Cancelado:";
      totalValue = `$${(order.total_estimado || 0).toLocaleString("es-AR")}`;
    }

    const statusBadgeClasses = {
      PENDIENTE: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      EN_PREPARACION: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      LISTO: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      ENTREGADO: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      CANCELADO: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800"
    }[order.estado] || "bg-slate-100 text-slate-800";

    return `
      <button
        type="button"
        data-customer-order-id="${escapeHtml(order.id)}"
        class="w-full text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition tap-feedback touch-target flex items-center justify-between gap-3"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="font-black text-sm text-slate-900 dark:text-white">Pedido #${escapeHtml(order.id)}</span>
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadgeClasses}">
              ${escapeHtml(order.estado)}
            </span>
            ${dateFormatted ? `<span class="text-[11px] text-slate-400">${escapeHtml(dateFormatted)}</span>` : ""}
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 truncate">
            ${order.tipo_entrega === "DELIVERY" ? `Envío a domicilio (${escapeHtml(order.direccion_entrega)})` : "Retiro en local"}
          </p>
        </div>

        <div class="text-right shrink-0">
          <span class="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">${escapeHtml(totalLabel)}</span>
          <span class="font-black text-base ${isOngoing ? "text-emerald-700 dark:text-emerald-400" : "text-slate-900 dark:text-white"}">
            ${escapeHtml(totalValue)}
          </span>
        </div>
      </button>
    `;
  }

  function renderOrderNotFound() {
    container.innerHTML = `
      <div class="max-w-md mx-auto p-4 pt-12 text-center">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <h2 class="text-lg font-black text-slate-900 dark:text-white">Pedido no encontrado</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            El pedido solicitado no existe o ya no está disponible en este dispositivo.
          </p>
          <div class="flex gap-2">
            <button
              id="btn-not-found-orders"
              class="flex-1 min-h-[44px] px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl tap-feedback touch-target"
            >
              Mis Pedidos
            </button>
            <button
              id="btn-not-found-catalog"
              class="flex-1 min-h-[44px] px-4 py-2 bg-slate-950 dark:bg-emerald-600 text-white font-bold text-xs rounded-xl tap-feedback touch-target"
            >
              Ir al Catálogo
            </button>
          </div>
        </div>
      </div>
    `;

    container.querySelector("#btn-not-found-orders")?.addEventListener("click", () => {
      viewMode = "orders";
      update();
    });
    container.querySelector("#btn-not-found-catalog")?.addEventListener("click", () => {
      viewMode = "catalog";
      update();
    });
  }

  // ========================================================
  // 5. PANTALLA DE SEGUIMIENTO DEL PEDIDO (Timeline y Balanza)
  // ========================================================
  function renderOrderTracking(currentOrder) {
    const isWeighing = currentOrder.estado === "EN_PREPARACION";
    const isReady = currentOrder.estado === "LISTO" || currentOrder.estado === "ENTREGADO";
    const isDelivered = currentOrder.estado === "ENTREGADO";
    const isCancelled = currentOrder.estado === "CANCELADO";

    let stepNumber = 1;
    let stepTitle = "Pedido Recibido";
    let stepDesc = "El pedido ingresó en la cola del mostrador.";

    if (isCancelled) {
      stepNumber = 0;
      stepTitle = "Pedido Cancelado";
      stepDesc = "Este pedido fue cancelado. No requiere entrega ni cobro.";
    } else if (isWeighing) {
      stepNumber = 2;
      stepTitle = "En preparación";
      stepDesc = "El comercio está preparando tus productos; los pesables se calculan con su peso real.";
    } else if (isReady && !isDelivered) {
      stepNumber = 3;
      stepTitle = "Listo para Entrega";
      stepDesc = currentOrder.tipo_entrega === "DELIVERY"
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
        <div class="flex items-center justify-between mb-3">
          <button
            id="btn-back-to-catalog"
            class="min-h-[44px] px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition tap-feedback flex items-center gap-1.5 touch-target"
          >
            <span>← Catálogo</span>
          </button>

          <button
            id="btn-back-to-orders"
            class="min-h-[44px] px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition tap-feedback flex items-center gap-1.5 touch-target"
          >
            <span>Mis Pedidos</span>
          </button>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/40 border border-slate-200/80 dark:border-slate-800 text-left">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Comprobante Digital</span>
              <h2 class="text-xl font-black text-slate-900 dark:text-white tracking-tight">Pedido #${escapeHtml(currentOrder.id)}</h2>
              ${store.getCheckoutWarning() ? `<p role="alert" class="mt-3 text-sm text-amber-800 dark:text-amber-300">${escapeHtml(store.getCheckoutWarning())}</p>` : ""}
            </div>
            <span class="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
              isCancelled
                ? "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                : isDelivered
                ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                : isReady
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse"
                : isWeighing
                ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 animate-pulse"
                : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
            }">
              ${escapeHtml(currentOrder.estado)}
            </span>
          </div>

          <!-- Línea de Progreso (Timeline Minimalista) -->
          ${!isCancelled ? `
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
                  ${isWeighing || (isReady && !isDelivered) ? `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>` : ""}
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">${stepDesc}</p>
              </div>
            </div>
          ` : `
            <div class="my-4 p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200">
              Este pedido fue cancelado. No requiere entrega ni cobro.
            </div>
          `}

          <!-- Resumen Financiero -->
          <div class="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Entrega:</span>
              <strong class="text-slate-800 dark:text-slate-200 font-semibold">
                ${currentOrder.tipo_entrega === "DELIVERY" ? "Envío a Domicilio" : "Retiro en Mostrador"}
              </strong>
            </div>

            ${currentOrder.tipo_entrega === "DELIVERY" ? `
              <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Destino:</span>
                <span class="text-slate-800 dark:text-slate-200 font-medium text-right">${escapeHtml(currentOrder.direccion_entrega)}</span>
              </div>
            ` : ""}

            ${isReady && Number.isFinite(currentOrder.total_real) ? `
              <div class="pt-2.5 border-t border-slate-200 dark:border-slate-800">
                <div class="flex justify-between items-center text-xs text-slate-400 dark:text-slate-500">
                  <span>Estimado inicial:</span>
                  <span class="line-through">$${currentOrder.total_estimado.toLocaleString("es-AR")}</span>
                </div>
                <div class="flex justify-between items-center mt-1">
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total final:</span>
                  <span class="font-black text-2xl text-emerald-700 dark:text-emerald-400">$${currentOrder.total_real.toLocaleString("es-AR")}</span>
                </div>
              </div>
            ` : `
              <div class="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">Total Estimado:</span>
                <span class="font-black text-xl text-slate-900 dark:text-white">$${currentOrder.total_estimado.toLocaleString("es-AR")}</span>
              </div>
            `}
          </div>

          ${isWeighing && Number.isFinite(currentOrder.total_real) ? `<p class="mt-3 text-sm text-slate-600 dark:text-slate-300">Total de preparación (provisional): $${currentOrder.total_real.toLocaleString("es-AR")}. El final se confirma al terminar.</p>` : ""}
          ${isReady && !Number.isFinite(currentOrder.total_real) ? `<p role="alert" class="mt-3 text-sm text-amber-800 dark:text-amber-300">El total final no está registrado; el importe mostrado es estimado.</p>` : ""}

          <!-- Desglose Ítems Pesados -->
          <div class="mt-5">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Detalle de Productos</h4>
            <div class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              ${currentOrder.items.map((item) => {
                const pesoTexto = item.peso_real !== null && item.peso_real !== undefined
                  ? `${escapeHtml(item.peso_real)} ${item.unidad_medida === "KG" ? "kg (pesado)" : `u. (${isReady || item.confirmado_preparacion ? "preparado" : "por confirmar"})`}`
                  : `${escapeHtml(item.cantidad_solicitada)} ${item.unidad_medida === "KG" ? "kg" : "u."} (aprox)`;
                const itemSubtotal = Number.isFinite(Number(item.subtotal)) ? Number(item.subtotal).toLocaleString("es-AR") : escapeHtml(item.subtotal ?? 0);
                return `
                  <div class="py-2.5 flex items-center justify-between gap-2 ${item.sin_stock ? "opacity-40 line-through" : ""}">
                    <div>
                      <div class="flex items-center gap-1.5">
                        <span class="font-bold text-slate-800 dark:text-slate-200 text-xs">${escapeHtml(item.nombre)}</span>
                        ${item.sin_stock ? `<span class="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase">Sin Stock</span>` : ""}
                      </div>
                      <span class="text-[11px] text-slate-400 dark:text-slate-500 block">${pesoTexto}</span>
                    </div>
                    <strong class="text-slate-900 dark:text-white font-bold text-xs">
                      $${itemSubtotal}
                    </strong>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <!-- Botón de consulta al local por WhatsApp (simulado en Modo Demo) -->
          <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              type="button"
              id="btn-wa-help"
              class="w-full min-h-[44px] bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:bg-emerald-200 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold py-2.5 px-3 rounded-xl text-xs transition tap-feedback flex items-center justify-center gap-1.5 touch-target"
            >
              <span>${store.isDemo() ? "Simular consulta por WhatsApp (Demo)" : "Consultar al local por WhatsApp"}</span>
            </button>
            <p id="wa-help-feedback" class="hidden text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-center"></p>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              id="btn-new-order"
              class="w-full min-h-[46px] py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 text-slate-800 dark:text-slate-200 border border-transparent dark:border-slate-700 font-bold rounded-xl text-xs transition tap-feedback touch-target"
            >
              Realizar Otro Pedido
            </button>
          </div>
        </div>
      </div>
    `;

    container.querySelector("#btn-back-to-catalog")?.addEventListener("click", () => {
      viewMode = "catalog";
      update();
    });

    container.querySelector("#btn-back-to-orders")?.addEventListener("click", () => {
      viewMode = "orders";
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
      viewMode = "catalog";
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
  return () => {
    document.getElementById("nexo-top-stack")?.removeAttribute("inert");
    document.body.style.overflow = "";
    imageLoader.revokeAll();
    unsubscribe();
  };
}

  // ==========================================

  // 4. VISTA OPERARIO (BALANZA Y MOSTRADOR)

  // ==========================================

function parseOperatorWeight(rawInput, isWeight = true) {
  const str = String(rawInput ?? "").trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(str)) return null;
  const value = Number(str);
  if (!Number.isFinite(value) || value <= 0 || (!isWeight && !Number.isInteger(value))) return null;
  return value;
}

function renderOperatorView(container) {
  let activeTab = "PENDIENTE"; // PENDIENTE | EN_PREPARACION | LISTO | ENTREGADO
  let editingOrderId = null; // ID del pedido que se está editando en modal
  let actionError = "";
  let addingProductOrderId = null; // ID del pedido que tiene abierto el desplegable de agregar ítem

  function formatMoney(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString("es-AR") : escapeHtml(String(value ?? 0));
  }

  function update() {
    container.innerHTML = "";
    const orders = store.getOrders();
    const ordersError = typeof store.getOrdersError === "function" ? store.getOrdersError() : null;
    const bannerError = actionError || ordersError || "";

    const counts = {
      PENDIENTE: orders.filter((o) => o.estado === "PENDIENTE").length,
      EN_PREPARACION: orders.filter((o) => o.estado === "EN_PREPARACION").length,
      LISTO: orders.filter((o) => o.estado === "LISTO").length,
      ENTREGADO: orders.filter((o) => o.estado === "ENTREGADO").length,
      CANCELADO: orders.filter((o) => o.estado === "CANCELADO").length
    };

    container.innerHTML = `
      <div class="max-w-2xl mx-auto pb-24 overflow-x-clip safe-pb">
        <!-- Header del Mostrador con sticky-header-offset -->
        <header class="sticky sticky-header-offset z-20 bg-slate-900 text-white px-4 py-3 shadow-md border-b border-slate-800">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Puesto de Preparación</span>
              <h1 class="font-extrabold text-sm leading-tight text-white">Mostrador y Preparación</h1>
              <p class="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Recepción en vivo activa
              </p>
            </div>

            <!-- Botones de Acción de Cabecera -->
            <div class="flex items-center gap-1.5">
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
          <div class="grid grid-cols-5 gap-1 mt-3 bg-slate-800/90 p-1 rounded-2xl text-center">
            <button
              data-tab="PENDIENTE"
              class="tab-btn min-h-[48px] py-1.5 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col items-center justify-center leading-tight tap-feedback touch-target ${
                activeTab === "PENDIENTE" ? "bg-amber-400 text-slate-950 font-black shadow-xs" : "text-slate-400 hover:text-white"
              }"
            >
              <span>Entrantes</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 ${
                activeTab === "PENDIENTE" ? "bg-amber-600/30 text-slate-950 font-black" : "bg-slate-700 text-slate-300"
              }">${counts.PENDIENTE}</span>
            </button>

            <button
              data-tab="EN_PREPARACION"
              class="tab-btn min-h-[48px] py-1.5 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition flex flex-col items-center justify-center leading-tight tap-feedback touch-target ${
                activeTab === "EN_PREPARACION" ? "bg-blue-600 text-white font-black shadow-xs" : "text-slate-400 hover:text-white"
              }"
            >
              <span>Preparación</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 ${
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
              <span class="text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 ${
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
              <span class="text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 bg-slate-700 text-slate-300">${counts.ENTREGADO}</span>
            </button>
            <button data-tab="CANCELADO" class="tab-btn min-h-[48px] px-1 py-1.5 rounded-xl text-[10px] font-bold tap-feedback touch-target ${activeTab === "CANCELADO" ? "bg-rose-950 text-rose-200" : "text-slate-400"}">
              Cancelados <span class="block">${counts.CANCELADO}</span>
            </button>
          </div>
        </header>

        <!-- Contenido según la pestaña activa -->
        <main class="p-4">
          <p id="operator-error" role="alert" class="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-sm ${bannerError ? "" : "hidden"}">${escapeHtml(bannerError)}</p>
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
                .map((i) => `${escapeHtml(i.cantidad_solicitada)}${i.unidad_medida === "KG" ? "kg" : "u"} ${escapeHtml(i.nombre)}`)
                .join(" · ");

              return `
              <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs transition">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-base font-black text-slate-900 dark:text-white">#${escapeHtml(order.id)}</span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        order.tipo_entrega === "DELIVERY"
                          ? "bg-slate-900 dark:bg-slate-800 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }">
                        ${order.tipo_entrega === "DELIVERY" ? "Envío a Domicilio" : "Retiro en Local"}
                      </span>
                    </div>
                    <h3 class="font-extrabold text-slate-900 dark:text-white text-sm mt-1.5">${escapeHtml(order.cliente.nombre)}</h3>
                    <p class="text-xs text-slate-400 dark:text-slate-500">${escapeHtml(order.cliente.telefono)} · ${escapeHtml(timeAgo(order.fecha))}</p>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-wider">Estimado</span>
                    <span class="font-black text-base text-slate-900 dark:text-white">$${formatMoney(order.total_estimado)}</span>
                  </div>
                </div>

                <!-- Resumen de productos solicitados -->
                <div class="mt-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                  <span class="font-bold text-slate-700 dark:text-slate-300 block mb-0.5 text-[11px] uppercase tracking-wider">Productos solicitados (${escapeHtml(order.items.length)}):</span>
                  <p class="leading-relaxed">${itemsList || "Sin productos"}</p>
                </div>

                <!-- Acciones Principales y de Gestión -->
                <div class="mt-3 space-y-2">
                  <button
                    data-start-id="${escapeHtml(order.id)}"
                    class="btn-start-prep w-full min-h-[48px] bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-xs transition tap-feedback touch-target flex items-center justify-center gap-2"
                  >
                    <span>Comenzar preparación</span>
                  </button>

                  <div class="grid grid-cols-2 gap-2">
                    <button
                      data-edit-order-id="${escapeHtml(order.id)}"
                      class="btn-open-edit min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition tap-feedback touch-target border border-transparent dark:border-slate-700"
                    >
                      <span>Editar datos</span>
                    </button>
                    <button
                      data-cancel-order-id="${escapeHtml(order.id)}"
                      data-delete-order-id="${escapeHtml(order.id)}"
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

    if (activeTab === "EN_PREPARACION") {
      const activeProducts = store.getProducts().filter((p) => p.disponible && !p.archivado);
      return `<div class="space-y-4">${tabOrders.map((order) => {
        const progress = store.getPreparationProgress(order.id);
        const currentTotal = order.items.filter(i => !i.sin_stock && i.peso_real != null).reduce((sum, i) => sum + i.subtotal, 0);
        return `
          <section data-preparation-order="${escapeHtml(order.id)}" class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div class="flex flex-wrap justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div><span class="text-[10px] uppercase tracking-wider font-black text-blue-600 dark:text-blue-400">En preparación</span>
                <h2 class="text-lg font-black text-slate-900 dark:text-white">Pedido #${escapeHtml(order.id)} · ${escapeHtml(order.cliente.nombre)}</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">${order.tipo_entrega === "DELIVERY" ? escapeHtml(order.direccion_entrega) : "Retiro por mostrador"}</p>
              </div>
              <div class="text-right text-xs text-slate-500 dark:text-slate-400">Estimado al pedir
                <strong class="block text-base text-slate-900 dark:text-white">$${formatMoney(order.total_estimado)}</strong>
              </div>
            </div>
            <div class="py-3 space-y-1">
              <p data-preparation-progress class="text-xs font-bold text-emerald-700 dark:text-emerald-400" aria-live="polite">${progress.resolved} de ${progress.total} ítems preparados</p>
              <progress data-preparation-bar class="w-full h-2 accent-emerald-600" value="${progress.resolved}" max="${Math.max(1, progress.total)}" aria-label="Ítems preparados"></progress>
            </div>
            <div class="space-y-3">${order.items.length ? order.items.map((item, idx) => {
              const isWeight = item.unidad_medida === "KG";
              const value = item.peso_real ?? "";
              const resolved = item.sin_stock || (isWeight ? Number.isFinite(item.peso_real) && item.peso_real > 0 : item.confirmado_preparacion === true);
              return `<div data-preparation-item="${idx}" class="item-weigh-card p-3.5 rounded-2xl border ${resolved ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"}">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <span class="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">${escapeHtml(item.categoria || (isWeight ? "Por kilo" : "Por unidad"))}</span>
                    <h4 class="font-extrabold text-base text-slate-900 dark:text-white break-words">${escapeHtml(item.nombre)}</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Solicitó ${escapeHtml(item.cantidad_solicitada)} ${isWeight ? "kg" : "u."} · $${formatMoney(item.precio_unitario)}/${isWeight ? "kg" : "u"}</p>
                  </div>
                  <div class="flex gap-1">
                    <button data-toggle-stock-order="${escapeHtml(order.id)}" data-item-index="${idx}" class="btn-toggle-stock min-h-[44px] px-3 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200">${item.sin_stock ? "Restaurar" : "Sin Stock"}</button>
                    <button data-remove-item-order="${escapeHtml(order.id)}" data-item-index="${idx}" class="btn-remove-item min-h-[44px] px-3 text-xs font-bold rounded-xl text-rose-700 dark:text-rose-300">Quitar</button>
                  </div>
                </div>
                ${item.sin_stock ? '<p class="mt-2 text-xs font-bold text-rose-700 dark:text-rose-300">Faltante · no se suma al total</p>' : `
                  <div class="mt-3 flex flex-wrap items-end gap-2">
                    <div><label for="prep-${escapeHtml(order.id)}-${idx}" class="block text-xs font-bold mb-1 text-slate-600 dark:text-slate-300">${isWeight ? "Peso real (kg)" : "Unidades preparadas"}</label>
                      <div class="flex gap-1.5 items-center">
                        <button data-adjust-order="${escapeHtml(order.id)}" data-item-idx="${idx}" data-delta="${isWeight ? -0.1 : -1}" class="btn-adjust-weight min-h-[44px] min-w-[44px] rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-lg" aria-label="Restar ${isWeight ? "0,1 kg" : "una unidad"}">−</button>
                        <input id="prep-${escapeHtml(order.id)}-${idx}" type="text" inputmode="${isWeight ? "decimal" : "numeric"}" data-order-id="${escapeHtml(order.id)}" data-item-idx="${idx}" data-unit="${escapeHtml(item.unidad_medida)}" data-price-unit="${escapeHtml(item.precio_unitario)}" value="${escapeHtml(value)}" placeholder="${isWeight ? "Ej: 1,450" : "Ej: 2"}" class="input-weight w-24 min-h-[44px] text-center text-lg font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" aria-describedby="prep-detail-${escapeHtml(order.id)}-${idx}" />
                        <button data-adjust-order="${escapeHtml(order.id)}" data-item-idx="${idx}" data-delta="${isWeight ? 0.1 : 1}" class="btn-adjust-weight min-h-[44px] min-w-[44px] rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-lg" aria-label="Sumar ${isWeight ? "0,1 kg" : "una unidad"}">+</button>
                      </div>
                    </div>
                    ${!isWeight ? `<button data-confirm-unit-order="${escapeHtml(order.id)}" data-item-idx="${idx}" class="btn-confirm-unit min-h-[44px] px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold">${item.confirmado_preparacion ? "Listo ✓" : "Listo"}</button>` : ""}
                    <span id="item-subtotal-${escapeHtml(order.id)}-${idx}" class="ml-auto text-base font-black text-slate-900 dark:text-white">$${(item.peso_real != null ? item.subtotal : 0).toLocaleString("es-AR")}</span>
                  </div>
                  <p id="prep-detail-${escapeHtml(order.id)}-${idx}" data-weight-grams="${idx}" class="mt-1 text-xs text-slate-500 dark:text-slate-400">${isWeight ? (item.peso_real != null ? `${(item.peso_real * 1000).toLocaleString("es-AR")} g` : "Ingresá el peso en kg") : "Confirmá la cantidad con Listo"}</p>
                `}
              </div>`;
            }).join("") : '<p class="py-3 text-sm text-slate-500 dark:text-slate-400">Sin ítems. Agregá un producto o cancelá el pedido.</p>'}</div>
            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div class="flex justify-between items-center mb-3"><span class="text-xs text-slate-500 dark:text-slate-400">Total de preparación · provisional</span><strong id="order-balanza-total-${escapeHtml(order.id)}" class="text-xl text-emerald-700 dark:text-emerald-400">$${currentTotal.toLocaleString("es-AR")}</strong></div>
              ${addingProductOrderId === order.id ? `
                <div class="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div class="flex justify-between items-center"><label for="select-new-product" class="text-xs font-bold text-slate-700 dark:text-slate-200">Sumar producto</label><button id="btn-close-add-product" class="min-h-[44px] px-3 text-xs text-slate-500 dark:text-slate-300">Cerrar</button></div>
                  <select id="select-new-product" class="w-full min-h-[44px] p-2 text-base rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white">${activeProducts.map(p => `<option value="${escapeHtml(p.id)}" data-unit="${escapeHtml(p.unidad_medida)}" data-price="${escapeHtml(p.precio)}">${escapeHtml(p.nombre)} ($${p.precio.toLocaleString("es-AR")}/${p.unidad_medida === "KG" ? "kg" : "u"})</option>`).join("")}</select>
                  <label for="input-new-quantity" id="new-quantity-label" class="block text-xs text-slate-500 dark:text-slate-400">Cantidad inicial</label>
                  <div class="flex gap-2"><input id="input-new-quantity" type="text" inputmode="decimal" value="1" class="flex-1 min-w-0 min-h-[44px] p-2 text-base rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white" /><button data-confirm-add-order="${escapeHtml(order.id)}" class="btn-confirm-add-item min-h-[44px] px-4 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-sm font-bold" ${activeProducts.length ? "" : "disabled"}>Agregar</button></div>
                  ${activeProducts.length ? "" : '<p class="text-xs text-slate-500">No hay productos disponibles para agregar.</p>'}
                </div>` : `<button data-toggle-add-order="${escapeHtml(order.id)}" class="btn-open-add-product w-full min-h-[44px] mb-2 px-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300">Agregar producto que olvidó el cliente</button>`}
              <button data-finish-order-id="${escapeHtml(order.id)}" class="btn-finish-weighing w-full min-h-[48px] rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-sm font-bold disabled:opacity-40" ${progress.canFinalize ? "" : "disabled"}>Finalizar preparación</button>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">El precio final se confirma al terminar todos los ítems.</p>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <button data-edit-order-id="${escapeHtml(order.id)}" class="btn-open-edit min-h-[44px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">Cambiar entrega/datos</button>
                <button data-cancel-order-id="${escapeHtml(order.id)}" class="btn-cancel-order min-h-[44px] px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs font-bold text-rose-700 dark:text-rose-300">Cancelar pedido</button>
              </div>
            </div>
          </section>`;
      }).join("")}</div>`;
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
                      Preparación completa
                    </span>
                    <h3 class="text-base font-black text-slate-900 dark:text-white mt-1">#${escapeHtml(order.id)} · ${escapeHtml(order.cliente.nombre)}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(order.cliente.telefono)} · ${order.tipo_entrega === "DELIVERY" ? "Envío" : "Retiro"}</p>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-wider">${order.total_real == null ? "Estimado · final no registrado" : "Total final"}</span>
                    <span class="font-black text-2xl text-emerald-700 dark:text-emerald-400">$${formatMoney(order.total_real ?? order.total_estimado)}</span>
                  </div>
                </div>

                <!-- Vista previa del mensaje de WhatsApp -->
                <div class="mt-3 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-line leading-relaxed">
                  ${escapeHtml(waSummary)}
                </div>

                <div class="grid grid-cols-2 gap-2 mt-4">
                  <button
                    type="button"
                    data-wa-order-id="${escapeHtml(order.id)}"
                    class="btn-send-wa min-h-[48px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition text-center tap-feedback touch-target"
                  >
                    <span>${store.isDemo() ? "Simular WhatsApp (Demo)" : "Enviar WhatsApp"}</span>
                  </button>
                  <button
                    data-deliver-order-id="${escapeHtml(order.id)}"
                    class="btn-deliver-order min-h-[48px] bg-slate-950 hover:bg-slate-900 active:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold py-3 px-3 rounded-xl text-xs transition tap-feedback touch-target border border-transparent dark:border-slate-700 flex items-center justify-center"
                  >
                    Marcar Cobrado
                  </button>
                </div>
                <p id="wa-sim-feedback-${escapeHtml(order.id)}" class="hidden mt-2 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-2 text-center"></p>

                <!-- Opción de Cancelar / Eliminar Pedido Listo -->
                <div class="mt-2 text-right">
                  <button
                    data-cancel-order-id="${escapeHtml(order.id)}"
                    data-delete-order-id="${escapeHtml(order.id)}"
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
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">#${escapeHtml(order.id)}</span>
                <h4 class="font-extrabold text-slate-900 dark:text-white text-sm">${escapeHtml(order.cliente.nombre)}</h4>
                <p class="text-xs text-slate-400 dark:text-slate-500">${order.tipo_entrega === "DELIVERY" ? "Envío" : "Retiro"} · ${escapeHtml(timeAgo(order.fecha))}</p>
              </div>
              <div class="text-right">
                <span class="font-black text-base text-slate-900 dark:text-white">$${formatMoney(order.total_real ?? order.total_estimado)}</span>
                <span class="block text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">${order.total_real == null ? "Estimado · final no registrado" : "Cobrado"}</span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `;
    }
    if (activeTab === "CANCELADO") {
      return `<div class="space-y-3">${tabOrders.map(order => `<div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <h3 class="font-bold text-slate-900 dark:text-white">#${escapeHtml(order.id)} · ${escapeHtml(order.cliente.nombre)}</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Pedido cancelado · historial conservado</p>
        <button data-delete-cancelled="${escapeHtml(order.id)}" class="btn-delete-cancelled min-h-[44px] px-3 mt-2 text-sm font-bold text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900">Eliminar cancelado</button>
      </div>`).join("")}</div>`;
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
              <h3 class="font-black text-base text-slate-900 dark:text-white">Pedido #${escapeHtml(order.id)}</h3>
            </div>
            <div class="flex items-center gap-1.5">
              <button id="btn-close-edit-modal" class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-xs tap-feedback touch-target border border-transparent dark:border-slate-700">
                Cerrar
              </button>
            </div>
          </div>

          <form id="edit-order-form" class="space-y-3 text-left">
            <div>
              <label for="edit-name" class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Nombre del cliente</label>
              <input
                type="text"
                id="edit-name"
                value="${escapeHtml(order.cliente.nombre)}"
                class="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-semibold outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-slate-800 dark:focus:border-emerald-500 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label for="edit-phone" class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Teléfono / WhatsApp</label>
              <input
                type="tel"
                id="edit-phone"
                inputmode="numeric"
                pattern="[0-9]{8,15}"
                maxlength="15"
                value="${escapeHtml((order.cliente.telefono || "").replace(/\D/g, ""))}"
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
              <label for="edit-address" class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Dirección de entrega</label>
              <input
                type="text"
                id="edit-address"
                value="${escapeHtml(order.direccion_entrega || "")}"
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

    const total = order.total_real ?? order.total_estimado;

    const business = store.getBusinessProfile();
    const businessName = business.name || "Comercio Demo Nexo";
    const businessAlias = business.alias || "alias.demo.nexo";
    return `Hola ${order.cliente.nombre}. Tu pedido #${order.id} en ${businessName} ya está preparado:

${itemsLines}

${order.total_real == null ? "Total estimado (final no registrado)" : "Total final"}: $${total.toLocaleString("es-AR")}
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
        try {
          store.updateOrderStatus(id, "EN_PREPARACION");
          actionError = "";
          activeTab = "EN_PREPARACION";
          update();
        } catch (error) { showError(error.message); }
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
          try { store.cancelOrder(id); update(); } catch (error) { showError(error.message); }
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
    const productSelect = container.querySelector("#select-new-product");
    if (productSelect) {
      const updateQuantityLabel = () => {
        const isWeight = productSelect.selectedOptions[0]?.dataset.unit === "KG";
        container.querySelector("#new-quantity-label").textContent = isWeight ? "Kilos a agregar (kg)" : "Unidades a agregar";
        container.querySelector("#input-new-quantity").inputMode = isWeight ? "decimal" : "numeric";
      };
      productSelect.addEventListener("change", updateQuantityLabel);
      updateQuantityLabel();
    }
    const btnConfirmAddItem = container.querySelector(".btn-confirm-add-item");
    if (btnConfirmAddItem) {
      btnConfirmAddItem.addEventListener("click", () => {
        const orderId = Number(btnConfirmAddItem.dataset.confirmAddOrder);
        const select = container.querySelector("#select-new-product");
        const inputQty = container.querySelector("#input-new-quantity");
        if (select && inputQty) {
          const productId = select.value;
          try {
            const isWeight = select.selectedOptions[0]?.dataset.unit === "KG";
            const qty = parseOperatorWeight(inputQty.value, isWeight);
            if (qty === null) throw new Error(isWeight ? "Ingresá kilos mayores a cero." : "Ingresá una cantidad entera mayor a cero.");
            store.addProductToOrder(orderId, productId, qty);
            addingProductOrderId = null;
            update();
          } catch (error) { showError(error.message); }
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
          try { store.removeItemFromOrder(orderId, itemIdx); update(); } catch (error) { showError(error.message); }
        }
      });
    });

    container.querySelectorAll(".btn-adjust-weight").forEach(btn => {
      btn.addEventListener("click", () => {
        const input = findPreparationInput(Number(btn.dataset.adjustOrder), Number(btn.dataset.itemIdx));
        const isWeight = input.dataset.unit === "KG";
        const current = parseOperatorWeight(input.value, isWeight) ?? 0;
        input.value = Math.max(isWeight ? 0.001 : 1, Number((current + Number(btn.dataset.delta)).toFixed(3)));
        input.dispatchEvent(new Event("input", { bubbles: true }));
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

          try {
            store.updateOrderDetails(editingOrderId, { nombre: name, telefono: phone, tipo_entrega: mode, direccion_entrega: address });
            editingOrderId = null;
            actionError = "";
            update();
          } catch (error) {
            let feedback = editForm.querySelector("[role=alert]");
            if (!feedback) { feedback = document.createElement("p"); feedback.setAttribute("role", "alert"); feedback.className = "text-sm text-rose-700 dark:text-rose-300"; editForm.appendChild(feedback); }
            feedback.textContent = error.message;
          }
        });
      }
    }

    container.querySelectorAll(".input-weight").forEach(input => {
      input.addEventListener("input", () => {
        const id = Number(input.dataset.orderId), index = Number(input.dataset.itemIdx);
        const value = parseOperatorWeight(input.value, input.dataset.unit === "KG");
        try {
          store.updateItemWeight(id, index, value, { notify: false });
          delete input.dataset.unsaved;
          showError("");
        } catch (error) {
          input.dataset.unsaved = "true";
          showError(error.message);
        }
        input.setAttribute("aria-invalid", String(value === null));
        refreshPreparation(id);
      });
    });
    container.querySelectorAll(".btn-confirm-unit").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.confirmUnitOrder), index = Number(btn.dataset.itemIdx);
        const input = findPreparationInput(id, index);
        try {
          const value = parseOperatorWeight(input.value, false);
          if (value === null) throw new Error("Ingresá una cantidad entera mayor a cero o marcá Sin Stock.");
          store.updateItemWeight(id, index, value, { notify: false, confirmUnit: true });
          delete input.dataset.unsaved;
          showError("");
        } catch (error) { showError(error.message); }
        refreshPreparation(id);
      });
    });
    container.querySelectorAll(".btn-toggle-stock").forEach(btn => {
      btn.addEventListener("click", () => {
        try { store.toggleItemOutOfStock(Number(btn.dataset.toggleStockOrder), Number(btn.dataset.itemIndex)); update(); }
        catch (error) { showError(error.message); }
      });
    });
    container.querySelectorAll(".btn-finish-weighing").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.finishOrderId);
        try {
          const inputs = Array.from(container.querySelectorAll(".input-weight")).filter(input => Number(input.dataset.orderId) === id);
          if (inputs.some(input => input.dataset.unsaved || parseOperatorWeight(input.value, input.dataset.unit === "KG") === null)) throw new Error("Resolvé cada ítem antes de finalizar.");
          store.finalizeOrderWeighing(id);
          actionError = "";
          activeTab = "LISTO";
          update();
        } catch (error) { showError(error.message); }
      });
    });
    container.querySelectorAll(".btn-delete-cancelled").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.deleteCancelled);
        const order = store.getOrders().find(order => order.id === id);
        if (order?.estado !== "CANCELADO" || !confirm(`¿Eliminar definitivamente el pedido cancelado #${id}?`)) return;
        try { store.deleteOrder(id); update(); } catch (error) { showError(error.message); }
      });
    });
    container.querySelectorAll("[data-preparation-order]").forEach(card => refreshPreparation(Number(card.dataset.preparationOrder)));

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
        try { store.updateOrderStatus(id, "ENTREGADO"); update(); }
        catch (error) { showError(error.message); }
      });
    });
  }

  function showError(message) {
    actionError = message || "";
    const element = container.querySelector("#operator-error");
    if (element) { element.textContent = actionError; element.classList.toggle("hidden", !actionError); }
  }

  function findPreparationInput(id, index) {
    return Array.from(container.querySelectorAll(".input-weight")).find(input => Number(input.dataset.orderId) === id && Number(input.dataset.itemIdx) === index);
  }

  function refreshPreparation(id) {
    const order = store.getOrders().find(order => order.id === id);
    const card = Array.from(container.querySelectorAll("[data-preparation-order]")).find(card => Number(card.dataset.preparationOrder) === id);
    if (!order || !card) return;
    const progress = store.getPreparationProgress(id);
    card.querySelector("[data-preparation-progress]").textContent = `${progress.resolved} de ${progress.total} ítems preparados`;
    card.querySelector("[data-preparation-bar]").value = progress.resolved;
    const inputs = Array.from(card.querySelectorAll(".input-weight"));
    card.querySelector(".btn-finish-weighing").disabled = !progress.canFinalize || inputs.some(input => input.dataset.unsaved || parseOperatorWeight(input.value, input.dataset.unit === "KG") === null);
    let total = 0;
    order.items.forEach((item, index) => {
      const input = findPreparationInput(id, index);
      const value = input ? parseOperatorWeight(input.value, item.unidad_medida === "KG") : null;
      if (!item.sin_stock && value !== null) total += Math.round(value * item.precio_unitario);
      if (!input) return;
      const row = input.closest("[data-preparation-item]");
      row.querySelector(`[id="item-subtotal-${id}-${index}"]`).textContent = `$${Math.round((value ?? 0) * item.precio_unitario).toLocaleString("es-AR")}`;
      row.querySelector("[data-weight-grams]").textContent = item.unidad_medida === "KG" ? (value === null ? "Ingresá kilos mayores a cero" : `${(value * 1000).toLocaleString("es-AR")} g`) : (item.confirmado_preparacion ? "Cantidad confirmada" : "Confirmá la cantidad con Listo");
      const resolved = item.unidad_medida === "KG" ? value !== null : item.confirmado_preparacion === true;
      row.classList.toggle("border-emerald-300", resolved);
      row.classList.toggle("dark:border-emerald-800", resolved);
      row.classList.toggle("border-slate-200", !resolved);
      row.classList.toggle("dark:border-slate-800", !resolved);
      const confirmButton = row.querySelector(".btn-confirm-unit");
      if (confirmButton) { confirmButton.disabled = value === null; confirmButton.textContent = item.confirmado_preparacion ? "Listo ✓" : "Listo"; }
    });
    card.querySelector(`[id="order-balanza-total-${id}"]`).textContent = `$${total.toLocaleString("es-AR")}`;
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
  let selectedCategory = "Todos", selectedStatus = "Todos", searchQuery = "";
  let showCloudSettings = false, configSavedToast = false;
  let productDraft = null, editingProductId = null, formError = "", notice = "";

  let stagedImageBlob = null;
  let stagedPreviewUrl = null;
  let removeImageFlag = false;
  let isProcessingImage = false;
  let isSaving = false;
  let formSessionToken = 0;

  const imageLoader = createScopedImageLoader();

  const buttonClass = "min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 tap-feedback touch-target inline-flex items-center justify-center";
  const inputClass = "w-full min-h-[44px] p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base text-slate-900 dark:text-white outline-none focus:border-emerald-500";

  function filteredProducts() {
    const query = searchQuery.trim().toLocaleLowerCase("es-AR");
    return store.getAdminProducts().filter(product => {
      const status = product.archivado ? "Archivados" : product.disponible ? "Activos" : "Pausados";
      return (selectedStatus === "Todos" || selectedStatus === status) &&
        (selectedCategory === "Todos" || product.categoria === selectedCategory) &&
        `${product.nombre} ${product.codigo || ""}`.toLocaleLowerCase("es-AR").includes(query);
    });
  }

  function categories() {
    return [...new Set([...store.getCategories(), ...store.getAdminProducts().map(product => product.categoria)])].filter(category => category && category !== "Todos");
  }

  function update() {
    imageLoader.revokeAll();
    const products = store.getAdminProducts();
    const catalogError = store.getCatalogError();
    const localSettings = store.getLocalSettings();

    container.innerHTML = `
      <div class="max-w-4xl mx-auto p-4 pb-32 overflow-x-clip safe-pb">
        <header class="mb-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">Administración</span>
              <h1 class="text-lg font-black text-slate-900 dark:text-white">Precios y Catálogo</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400">Productos, disponibilidad y valores del día.</p>
            </div>
            <div class="flex flex-wrap gap-1.5 items-center">
              <span class="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300">${store.isDemo() ? "Demo local" : store.isCloudConnected() ? "Conectado" : "Sin conexión"}</span>
              <button id="btn-toggle-cloud" class="${buttonClass}">${showCloudSettings ? "Cerrar PIN" : "Config PIN"}</button>
              <button id="btn-admin-logout" class="${buttonClass}">Salir</button>
            </div>
          </div>
          ${showCloudSettings ? `<form id="cloud-config-form" class="mt-3 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 space-y-2">
            <label for="cfg-pin" class="block text-xs font-bold text-slate-700 dark:text-slate-200">PIN del negocio</label>
            <input id="cfg-pin" type="password" inputmode="numeric" maxlength="8" value="${escapeHtml(localSettings.staffPin)}" class="${inputClass}" />
            <p class="text-xs text-slate-500 dark:text-slate-400">El PIN bloquea el acceso en este dispositivo.</p>
            <button class="${buttonClass}" type="submit">Guardar PIN Local</button>
            ${configSavedToast ? '<p class="text-xs font-bold text-emerald-700 dark:text-emerald-300" role="status">PIN guardado</p>' : ""}
          </form>` : ""}
        </header>

        <div class="sticky sticky-header-offset z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 -mx-4 px-4 py-2.5 mb-4 space-y-2 shadow-xs">
          <div class="flex gap-2 items-center">
            <label for="admin-search-input" class="sr-only">Buscar por nombre o SKU</label>
            <input id="admin-search-input" type="search" value="${escapeHtml(searchQuery)}" placeholder="Buscar por nombre o SKU..." class="${inputClass} min-w-0 flex-1" />
            <button id="btn-new-product" class="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 transition tap-feedback touch-target">Nuevo producto</button>
          </div>
          <div class="flex gap-1.5 overflow-x-auto no-scrollbar py-1" aria-label="Estado de productos">
            ${["Todos", "Activos", "Pausados", "Archivados"].map(status => `
              <button data-product-status="${status}" aria-pressed="${selectedStatus === status}" class="${buttonClass} shrink-0 ${selectedStatus === status ? "ring-2 ring-emerald-500 bg-slate-100 dark:bg-slate-800" : ""}">
                ${status} (${products.filter(p => status === "Todos" || (p.archivado ? "Archivados" : p.disponible ? "Activos" : "Pausados") === status).length})
              </button>
            `).join("")}
          </div>
          <div class="flex gap-1.5 overflow-x-auto no-scrollbar py-1" aria-label="Categorías">
            ${["Todos", ...categories()].map(cat => `
              <button data-admin-cat="${escapeHtml(cat)}" aria-pressed="${selectedCategory === cat}" class="admin-cat-pill ${buttonClass} shrink-0 ${selectedCategory === cat ? "ring-2 ring-emerald-500 bg-slate-100 dark:bg-slate-800" : ""}">
                ${escapeHtml(cat)}
              </button>
            `).join("")}
            <div class="w-2 shrink-0 select-none pointer-events-none" aria-hidden="true"></div>
          </div>
        </div>

        <p id="admin-notice" role="alert" class="mb-3 p-3 rounded-xl text-sm bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 ${notice ? "" : "hidden"}">${escapeHtml(notice)}</p>
        ${catalogError ? `<div role="alert" class="p-4 mb-3 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-sm"><p>${escapeHtml(catalogError)}</p>${store.isDemo() ? `<button id="btn-recover-catalog" class="${buttonClass} mt-2">Recuperar catálogo demo</button>` : ""}</div>` : ""}

        <div id="admin-products-list" class="admin-products-grid">${renderProducts(filteredProducts())}</div>
        ${productDraft ? renderProductModal() : ""}
      </div>`;

    attachAdminListeners();
    hydrateProductImages();
    if (productDraft) attachProductForm();
  }

  function hydrateProductImages() {
    container.querySelectorAll("img[data-image-id]").forEach(img => {
      const id = img.dataset.imageId;
      if (id) imageLoader.hydrate(img, id);
    });
  }

  function renderProducts(products) {
    if (!products.length) {
      return '<div class="col-span-full p-8 text-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">No hay productos para estos filtros.</div>';
    }
    return products.map(product => {
      const hasImage = Boolean(product.imagen_id);
      const isPaused = !product.disponible && !product.archivado;
      const isArchived = Boolean(product.archivado);

      return `
        <article id="product-card-${escapeHtml(product.id)}" data-admin-product="${escapeHtml(product.id)}" class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            ${hasImage ? `
              <div class="w-full aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden mb-2.5 relative product-photo-wrapper hidden">
                <img data-image-id="${escapeHtml(product.imagen_id)}" alt="" class="w-full h-full object-cover hidden" />
              </div>
            ` : ""}

            <div class="flex items-center flex-wrap gap-1 mb-1">
              <span class="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                ${escapeHtml(product.categoria)}
              </span>
              <span class="text-[10px] text-slate-400">·</span>
              <span class="text-[10px] font-semibold text-slate-400">
                ${product.unidad_medida === "KG" ? "Por kilo" : "Por unidad"}
              </span>
              ${isArchived ? `
                <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  Archivado
                </span>
              ` : isPaused ? `
                <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
                  Pausado
                </span>
              ` : ""}
            </div>

            <h3 class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white break-words line-clamp-2">
              ${escapeHtml(product.nombre)}
            </h3>
            <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              SKU: ${escapeHtml(product.codigo || "Sin código")}
            </p>
          </div>

          <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div class="flex items-center gap-1 min-w-0">
              <span class="text-xs text-slate-500 font-bold">$</span>
              <label for="price-${escapeHtml(product.id)}" class="sr-only">Precio de ${escapeHtml(product.nombre)}</label>
              <input
                id="price-${escapeHtml(product.id)}"
                data-product-id="${escapeHtml(product.id)}"
                value="${escapeHtml(product.precio)}"
                type="number"
                inputmode="decimal"
                step="any"
                min="0"
                class="input-price ${inputClass} font-black text-base text-center w-24 py-1.5"
                ${product.archivado ? "disabled" : ""}
              />
              <span class="text-[11px] text-slate-400">/${product.unidad_medida === "KG" ? "kg" : "u."}</span>
            </div>
            <button data-edit-product="${escapeHtml(product.id)}" class="${buttonClass} shrink-0">
              Editar
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderProductModal() {
    const draft = productDraft;
    const hasPhoto = Boolean(stagedPreviewUrl || (draft.imagen_id && !removeImageFlag));

    return `
      <div id="product-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="product-modal-title" class="w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
          <div class="flex justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 id="product-modal-title" class="text-lg font-black text-slate-900 dark:text-white">
              ${editingProductId === null ? "Nuevo producto" : "Editar producto"}
            </h2>
            <button id="btn-close-product" class="${buttonClass}" aria-label="Cerrar formulario" ${isSaving ? "disabled" : ""}>Cerrar</button>
          </div>

          <div class="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <label class="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Foto del producto</label>
            <input type="file" id="prod-photo-input" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" class="sr-only" ${isSaving || isProcessingImage ? "disabled" : ""} />

            <div class="flex items-center gap-3">
              <div id="photo-preview-container" class="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center relative shrink-0">
                ${hasPhoto ? `
                  <img id="form-photo-preview" src="${escapeHtml(stagedPreviewUrl || "")}" alt="" class="w-full h-full object-cover" />
                ` : `
                  <span class="text-[10px] font-bold text-slate-400 text-center px-1">Sin foto</span>
                `}
              </div>

              <div class="flex-1 space-y-1.5">
                <div class="flex flex-wrap gap-2">
                  <button type="button" id="btn-trigger-photo" class="${buttonClass}" ${isSaving || isProcessingImage ? "disabled" : ""}>
                    ${hasPhoto ? "Cambiar foto" : "Agregar foto"}
                  </button>
                  ${hasPhoto ? `
                    <button type="button" id="btn-remove-photo" class="${buttonClass} text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" ${isSaving || isProcessingImage ? "disabled" : ""}>
                      Quitar
                    </button>
                  ` : ""}
                </div>
                <div id="photo-processing-indicator" class="${isProcessingImage ? "" : "hidden"} text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <span class="animate-pulse">⏳</span> Procesando imagen...
                </div>
                <p class="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">JPEG, PNG o WebP. Máximo 15 MB (se optimiza a 512px automáticamente).</p>
              </div>
            </div>
          </div>

          <form id="product-form" class="space-y-3">
            <div>
              <label for="prod-name" class="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">Nombre</label>
              <input id="prod-name" value="${escapeHtml(draft.nombre)}" required maxlength="120" class="${inputClass}" ${isSaving ? "disabled" : ""} />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="prod-category" class="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">Categoría</label>
                <input id="prod-category" list="product-categories" value="${escapeHtml(draft.categoria)}" required maxlength="50" class="${inputClass}" ${isSaving ? "disabled" : ""} />
                <datalist id="product-categories">${categories().map(cat => `<option value="${escapeHtml(cat)}"></option>`).join("")}</datalist>
              </div>
              <div>
                <label for="prod-code" class="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">Código o SKU</label>
                <input id="prod-code" value="${escapeHtml(draft.codigo)}" maxlength="50" class="${inputClass}" ${isSaving ? "disabled" : ""} />
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Opcional; conserva ceros iniciales.</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="prod-unit" class="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">Modalidad</label>
                <select id="prod-unit" class="${inputClass}" ${isSaving ? "disabled" : ""}>
                  <option value="UNIDAD" ${draft.unidad_medida === "UNIDAD" ? "selected" : ""}>Por unidad</option>
                  <option value="KG" ${draft.unidad_medida === "KG" ? "selected" : ""}>Por kilo</option>
                </select>
              </div>
              <div>
                <label for="prod-step" class="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">Paso</label>
                <select id="prod-step" class="${inputClass}" ${draft.unidad_medida === "UNIDAD" || isSaving ? "disabled" : ""}>
                  ${(draft.unidad_medida === "UNIDAD" ? [1] : [0.25, 0.5, 1]).map(step => `
                    <option value="${step}" ${Number(draft.paso) === step ? "selected" : ""}>
                      ${step.toLocaleString("es-AR")} ${draft.unidad_medida === "KG" ? "kg" : "unidad"}
                    </option>
                  `).join("")}
                </select>
              </div>
            </div>

            <div>
              <label for="prod-price" class="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">Precio</label>
              <div class="flex items-center gap-2">
                <button type="button" id="btn-modal-step-down" class="${buttonClass}" aria-label="Bajar $100" ${isSaving ? "disabled" : ""}>− $100</button>
                <input id="prod-price" type="number" inputmode="decimal" min="0" step="any" required value="${escapeHtml(draft.precio)}" class="${inputClass} text-center font-bold flex-1" ${isSaving ? "disabled" : ""} />
                <button type="button" id="btn-modal-step-up" class="${buttonClass}" aria-label="Subir $100" ${isSaving ? "disabled" : ""}>+ $100</button>
              </div>
            </div>

            <div>
              <label for="prod-detail" class="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">Detalle</label>
              <textarea id="prod-detail" maxlength="500" rows="2" class="${inputClass}" ${isSaving ? "disabled" : ""}>${escapeHtml(draft.detalle)}</textarea>
            </div>

            <label for="prod-available" class="flex items-center gap-3 min-h-[44px] text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
              <input id="prod-available" type="checkbox" ${draft.disponible ? "checked" : ""} class="w-5 h-5 accent-emerald-600 rounded" ${isSaving ? "disabled" : ""} />
              <span>Disponible para la venta</span>
            </label>

            ${editingProductId !== null ? `
              <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300 block">Estado en catálogo</span>
                  <span class="text-[11px] text-slate-400">Los pedidos existentes conservan sus datos</span>
                </div>
                <button type="button" id="btn-modal-archive" class="${buttonClass} ${draft.archivado ? "text-emerald-600 border-emerald-300" : "text-rose-600 border-rose-300"}" ${isSaving ? "disabled" : ""}>
                  ${draft.archivado ? "Restaurar producto" : "Archivar producto"}
                </button>
              </div>
            ` : ""}

            <p id="product-form-error" role="alert" class="p-3 rounded-xl text-sm bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 ${formError ? "" : "hidden"}">
              ${escapeHtml(formError)}
            </p>

            <div class="grid grid-cols-2 gap-2 pt-2">
              <button id="btn-cancel-product" type="button" class="${buttonClass}" ${isSaving ? "disabled" : ""}>Cancelar</button>
              <button id="btn-submit-product" type="submit" class="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md transition tap-feedback touch-target" ${isSaving || isProcessingImage ? "disabled" : ""}>
                Guardar producto
              </button>
            </div>
          </form>
        </section>
      </div>
    `;
  }

  function showNotice(message) {
    notice = message || "";
    const el = container.querySelector("#admin-notice");
    if (el) {
      el.textContent = notice;
      el.classList.toggle("hidden", !notice);
    }
  }

  function openProduct(id = null) {
    if (isSaving) return;
    const sessionToken = ++formSessionToken;
    const product = id === null ? null : store.getAdminProducts().find(p => p.id === id);
    if (id !== null && !product) {
      showNotice("No encontramos ese producto. Actualizá el catálogo.");
      return;
    }
    editingProductId = id;
    productDraft = product
      ? { ...product }
      : { nombre: "", categoria: "", codigo: "", unidad_medida: "UNIDAD", paso: 1, precio: "", detalle: "", disponible: true, archivado: false };

    if (stagedPreviewUrl) {
      try { URL.revokeObjectURL(stagedPreviewUrl); } catch {}
      stagedPreviewUrl = null;
    }
    stagedImageBlob = null;
    removeImageFlag = false;
    isProcessingImage = false;
    formError = "";

    update();

    if (product?.imagen_id) {
      if (product.imagen_id.startsWith("https://") || product.imagen_id.startsWith("http://")) {
        stagedPreviewUrl = product.imagen_id;
        const previewImg = container.querySelector("#form-photo-preview");
        if (previewImg) previewImg.src = product.imagen_id;
      } else getImage(product.imagen_id).then(blob => {
        if (sessionToken !== formSessionToken || !productDraft || editingProductId !== id) return;
        if (!blob) return;
        const previewImg = container.querySelector("#form-photo-preview");
        if (previewImg && !stagedPreviewUrl) {
          const url = URL.createObjectURL(blob);
          stagedPreviewUrl = url;
          previewImg.src = url;
        }
      });
    }

    container.querySelector("#prod-name")?.focus();
  }

  function readProductForm() {
    const value = id => container.querySelector(id)?.value || "";
    return {
      nombre: value("#prod-name"),
      categoria: value("#prod-category"),
      codigo: value("#prod-code"),
      unidad_medida: value("#prod-unit"),
      paso: Number(value("#prod-step")),
      precio: value("#prod-price"),
      detalle: value("#prod-detail"),
      disponible: container.querySelector("#prod-available")?.checked ?? true,
      archivado: Boolean(productDraft?.archivado)
    };
  }

  function attachProductForm() {
    const close = () => {
      if (isSaving) return;
      ++formSessionToken;
      if (stagedPreviewUrl) {
        try { URL.revokeObjectURL(stagedPreviewUrl); } catch {}
        stagedPreviewUrl = null;
      }
      stagedImageBlob = null;
      removeImageFlag = false;
      isProcessingImage = false;
      productDraft = null;
      editingProductId = null;
      formError = "";
      update();
      container.querySelector("#btn-new-product")?.focus();
    };

    container.querySelector("#btn-close-product")?.addEventListener("click", close);
    container.querySelector("#btn-cancel-product")?.addEventListener("click", close);

    const dialog = container.querySelector("[role=dialog]");
    dialog?.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isSaving) close();
        return;
      }
      if (event.key === "Tab") {
        const controls = Array.from(dialog.querySelectorAll("button, input, select, textarea")).filter(el => !el.disabled);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });

    container.querySelector("#product-modal-backdrop")?.addEventListener("click", event => {
      if (event.target.id === "product-modal-backdrop" && !isSaving) close();
    });

    container.querySelector("#prod-unit")?.addEventListener("change", () => {
      const unit = container.querySelector("#prod-unit").value;
      const step = container.querySelector("#prod-step");
      if (!step) return;
      step.disabled = unit === "UNIDAD";
      step.innerHTML = (unit === "UNIDAD" ? [1] : [0.25, 0.5, 1]).map(val => `
        <option value="${val}">${val.toLocaleString("es-AR")} ${unit === "KG" ? "kg" : "unidad"}</option>
      `).join("");
    });

    container.querySelector("#btn-modal-step-down")?.addEventListener("click", () => {
      const input = container.querySelector("#prod-price");
      if (input) {
        const current = Number(input.value) || 0;
        input.value = Math.max(0, current - 100);
      }
    });
    container.querySelector("#btn-modal-step-up")?.addEventListener("click", () => {
      const input = container.querySelector("#prod-price");
      if (input) {
        const current = Number(input.value) || 0;
        input.value = current + 100;
      }
    });

    container.querySelector("#btn-modal-archive")?.addEventListener("click", () => {
      if (!productDraft || isSaving) return;
      const currentValues = readProductForm();
      Object.assign(productDraft, currentValues);
      productDraft.archivado = !productDraft.archivado;
      update();
    });

    const fileInput = container.querySelector("#prod-photo-input");
    const triggerPhotoBtn = container.querySelector("#btn-trigger-photo");
    const removePhotoBtn = container.querySelector("#btn-remove-photo");

    triggerPhotoBtn?.addEventListener("click", () => fileInput?.click());

    fileInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const currentToken = ++formSessionToken;
      isProcessingImage = true;

      const indicator = container.querySelector("#photo-processing-indicator");
      const submitBtn = container.querySelector("#btn-submit-product");
      if (indicator) indicator.classList.remove("hidden");
      if (submitBtn) submitBtn.disabled = true;

      try {
        const normalizedBlob = await processProductImageFile(file);
        if (currentToken !== formSessionToken || !productDraft) return;

        stagedImageBlob = normalizedBlob;
        removeImageFlag = false;

        if (stagedPreviewUrl) {
          try { URL.revokeObjectURL(stagedPreviewUrl); } catch {}
        }
        stagedPreviewUrl = URL.createObjectURL(normalizedBlob);

        const previewContainer = container.querySelector("#photo-preview-container");
        if (previewContainer) {
          previewContainer.innerHTML = `<img id="form-photo-preview" src="${stagedPreviewUrl}" alt="" class="w-full h-full object-cover" />`;
        }

        formError = "";
        const errEl = container.querySelector("#product-form-error");
        if (errEl) errEl.classList.add("hidden");

        const buttonsWrapper = triggerPhotoBtn?.parentElement;
        if (buttonsWrapper && !buttonsWrapper.querySelector("#btn-remove-photo")) {
          const removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.id = "btn-remove-photo";
          removeBtn.className = `${buttonClass} text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40`;
          removeBtn.textContent = "Quitar";
          removeBtn.addEventListener("click", onRemovePhotoClick);
          buttonsWrapper.appendChild(removeBtn);
        }
        if (triggerPhotoBtn) triggerPhotoBtn.textContent = "Cambiar foto";
      } catch (err) {
        if (currentToken === formSessionToken && productDraft) {
          formError = err.message || "Error al procesar la imagen.";
          const errEl = container.querySelector("#product-form-error");
          if (errEl) {
            errEl.textContent = formError;
            errEl.classList.remove("hidden");
          }
        }
      } finally {
        if (currentToken === formSessionToken) {
          isProcessingImage = false;
          if (indicator) indicator.classList.add("hidden");
          if (submitBtn && !isSaving) submitBtn.disabled = false;
        }
        fileInput.value = "";
      }
    });

    function onRemovePhotoClick() {
      if (isSaving) return;
      ++formSessionToken;
      isProcessingImage = false;
      container.querySelector("#photo-processing-indicator")?.classList.add("hidden");
      const submit = container.querySelector("#btn-submit-product");
      if (submit) submit.disabled = false;
      removeImageFlag = true;
      stagedImageBlob = null;
      if (stagedPreviewUrl) {
        try { URL.revokeObjectURL(stagedPreviewUrl); } catch {}
        stagedPreviewUrl = null;
      }
      if (productDraft) productDraft.imagen_id = null;
      const previewContainer = container.querySelector("#photo-preview-container");
      if (previewContainer) {
        previewContainer.innerHTML = '<span class="text-[10px] font-bold text-slate-400 text-center px-1">Sin foto</span>';
      }
      container.querySelector("#btn-remove-photo")?.remove();
      const triggerBtn = container.querySelector("#btn-trigger-photo");
      if (triggerBtn) triggerBtn.textContent = "Agregar foto";
    }

    removePhotoBtn?.addEventListener("click", onRemovePhotoClick);

    container.querySelector("#product-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (isSaving || isProcessingImage) return;

      isSaving = true;
      const targetId = editingProductId;
      const targetDraft = readProductForm();
      const blobToPut = stagedImageBlob;
      const shouldRemove = removeImageFlag;
      const previousProduct = targetId !== null ? store.getAdminProducts().find(p => p.id === targetId) : null;
      const oldImageId = previousProduct?.imagen_id || null;

      // Deshabilitar todos los controles interactivos existentes (inputs, selects, textareas, botones)
      // para evitar ediciones tardias durante transacciones asincronas, registrando su estado original.
      const formControls = Array.from(container.querySelectorAll("#product-modal-backdrop input, #product-modal-backdrop select, #product-modal-backdrop textarea, #product-modal-backdrop button"));
      const originalDisabledStates = new Map();
      formControls.forEach(el => {
        originalDisabledStates.set(el, el.disabled);
        el.disabled = true;
      });

      try {
        if (targetDraft.precio.trim() === "") throw new Error("Ingresá un precio. Puede ser cero.");

        let targetImageId = undefined;
        let createdImageId = null;

        if (blobToPut) {
          createdImageId = await putImage(blobToPut);
          targetImageId = createdImageId;
        } else if (shouldRemove) {
          targetImageId = null;
        }

        const productPayload = { ...targetDraft, precio: Number(targetDraft.precio) };
        if (targetImageId !== undefined) {
          productPayload.imagen_id = targetImageId;
        }

        try {
          store.saveProduct(productPayload, targetId);
        } catch (saveErr) {
          if (createdImageId) {
            await deleteImage(createdImageId);
          }
          throw saveErr;
        }

        // Cleanup previo best-effort: no convierte éxito en fallo
        if (oldImageId && (shouldRemove || (createdImageId && createdImageId !== oldImageId))) {
          await deleteImage(oldImageId);
        }

        isSaving = false;
        ++formSessionToken;
        if (stagedPreviewUrl) {
          try { URL.revokeObjectURL(stagedPreviewUrl); } catch {}
          stagedPreviewUrl = null;
        }
        stagedImageBlob = null;
        removeImageFlag = false;
        productDraft = null;
        editingProductId = null;
        formError = "";
        notice = "";
        update();
        container.querySelector("#btn-new-product")?.focus();
      } catch (error) {
        isSaving = false;
        // Restaurar exactamente el estado disabled previo en cada control
        formControls.forEach(el => {
          el.disabled = originalDisabledStates.get(el) || false;
        });

        formError = error.message;
        const element = container.querySelector("#product-form-error");
        if (element) {
          element.textContent = formError;
          element.classList.remove("hidden");
          element.setAttribute("tabindex", "-1");
          element.focus();
        }
      }
    });
  }

  function attachAdminListeners() {
    container.querySelector("#admin-search-input")?.addEventListener("input", event => {
      searchQuery = event.target.value;
      const listEl = container.querySelector("#admin-products-list");
      if (listEl) {
        imageLoader.revokeAll();
        listEl.innerHTML = renderProducts(filteredProducts());
        hydrateProductImages();
        attachProductListeners();
      }
    });

    container.querySelector("#btn-new-product")?.addEventListener("click", () => openProduct());
    container.querySelector("#btn-admin-logout")?.addEventListener("click", () => {
      store.lockStaff();
      window.location.href = "?view=cliente";
    });

    container.querySelector("#btn-toggle-cloud")?.addEventListener("click", () => {
      showCloudSettings = !showCloudSettings;
      configSavedToast = false;
      update();
    });

    container.querySelector("#cloud-config-form")?.addEventListener("submit", event => {
      event.preventDefault();
      try {
        store.saveLocalSettings({ staffPin: container.querySelector("#cfg-pin")?.value });
        configSavedToast = true;
        update();
      } catch (error) {
        showNotice(error.message);
      }
    });

    container.querySelectorAll("[data-product-status]").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedStatus = btn.dataset.productStatus;
        update();
      });
    });

    container.querySelectorAll("[data-admin-cat]").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedCategory = btn.dataset.adminCat;
        update();
      });
    });

    container.querySelector("#btn-recover-catalog")?.addEventListener("click", () => {
      try {
        store.recoverCatalog();
        notice = "";
        update();
      } catch (error) {
        showNotice(error.message);
      }
    });

    attachProductListeners();
  }

  function attachProductListeners() {
    container.querySelectorAll(".input-price").forEach(input => {
      input.addEventListener("change", () => {
        try {
          if (input.value.trim() === "") throw new Error("Ingresá un precio. Puede ser cero.");
          store.updateProductPrice(input.dataset.productId, Number(input.value));
          showNotice("");
        } catch (error) {
          showNotice(error.message);
        }
      });
    });

    container.querySelectorAll("[data-edit-product]").forEach(btn => {
      btn.addEventListener("click", () => openProduct(btn.dataset.editProduct));
    });
  }

  const unsubscribe = store.subscribe(event => {
    const typing = container.contains(document.activeElement) && ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName);
    if (["products_changed", "storage_sync", "cloud_connected", "catalog_error"].includes(event) && !typing && !productDraft) {
      update();
    }
  });

  update();
  return () => {
    ++formSessionToken;
    imageLoader.revokeAll();
    if (stagedPreviewUrl) {
      try { URL.revokeObjectURL(stagedPreviewUrl); } catch {}
    }
    unsubscribe();
  };
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
    if (this.topStack && typeof ResizeObserver === "function") {
      this.topStackObserver = new ResizeObserver(updateTopOffset);
      this.topStackObserver.observe(this.topStack);
    } else if (document.fonts) {
      document.fonts.ready.then(updateTopOffset);
    }

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
      .map((err) => `<li class="text-xs text-rose-800 dark:text-rose-200 font-medium">${escapeHtml(err)}</li>`)
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
    const roleLabel = isOperario ? "Puesto de Preparación (Operario)" : "Catálogo y Precios (Dueño)";
    this.container.innerHTML = `
      <div class="max-w-sm mx-auto p-4 pt-16">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
          <div class="flex items-center justify-between mb-3">
            <span class="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Acceso Personal del Local
            </span>
            </div>
          <h2 class="text-xl font-black text-slate-900 dark:text-white">${roleLabel}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">Ingresá el PIN numérico de 4 dígitos del comercio (Por defecto: <strong>1234</strong>)</p>

          <form id="pin-gate-form" class="space-y-4">
            <input
              type="password"
              id="pin-input"
              aria-label="PIN del comercio"
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
          if (store.isPinLockedOut()) {
            const secs = store.getPinLockoutRemainingSeconds();
            errorEl.textContent = `Demasiados intentos fallidos. Bloqueado por ${secs}s.`;
          } else {
            errorEl.textContent = "PIN incorrecto. Intentá nuevamente.";
          }
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
        btn.classList.remove("text-slate-400", "hover:text-white");
      } else {
        btn.classList.remove("bg-white", "text-slate-900", "shadow-sm");
        btn.classList.add("text-slate-400", "hover:text-white");
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

    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new App());
} else {
  new App();
}

})();
