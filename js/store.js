import { INITIAL_PRODUCTS } from "./products-data.js";
import { resolveNexoConfig, readPublicConfigSource, installDemoNetworkGuard, NEXO_SUPABASE_LIBRARY_URL } from "./config.js";
import { cloneDemoCustomers, buildDemoOrders } from "./demo-data.js";

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

function normalizeArPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return { ok: false, normalized: null, ambiguous: false, digits: "" };

  let d = digits;
  let hadCountryCode = false;
  if (d.startsWith("0054")) {
    d = d.slice(4);
    hadCountryCode = true;
  } else if (d.startsWith("54") && d.length >= 12) {
    d = d.slice(2);
    hadCountryCode = true;
  }

  if (hadCountryCode && d.startsWith("9") && (d.length === 11 || d.length === 13)) {
    d = d.slice(1);
  }
  if (d.startsWith("0") && (d.length === 11 || d.length === 13)) {
    d = d.slice(1);
  }

  if (d.startsWith("15")) {
    return { ok: false, normalized: null, ambiguous: true, digits };
  }

  if (d.length === 12) {
    if (d.startsWith("11") && d.slice(2, 4) === "15") {
      d = d.slice(0, 2) + d.slice(4);
    } else if (d.startsWith("2") || d.startsWith("3")) {
      const at3 = d.slice(3, 5) === "15";
      const at4 = d.slice(4, 6) === "15";
      if (at3 && !at4) {
        d = d.slice(0, 3) + d.slice(5);
      } else if (at4 && !at3) {
        d = d.slice(0, 4) + d.slice(6);
      } else {
        return { ok: false, normalized: null, ambiguous: true, digits };
      }
    } else {
      return { ok: false, normalized: null, ambiguous: true, digits };
    }
  }

  if (/^[1-9]\d{9}$/.test(d) && !d.startsWith("15")) {
    return { ok: true, normalized: d, ambiguous: false, digits };
  }

  return { ok: false, normalized: null, ambiguous: digits.length >= 8, digits };
}

function generateTrackingToken() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Este navegador no soporta generación criptográfica de tokens.");
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text) {
  if (!globalThis.crypto?.subtle?.digest) {
    throw new Error("Web Crypto API no disponible para proteger el token de seguimiento.");
  }
  const encoded = new TextEncoder().encode(String(text || ""));
  const hashBuf = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function extractRetryAfterSeconds(message) {
  const match = String(message || "").match(/RETRY_AFTER:(\d+)/i);
  return match ? Number(match[1]) : null;
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
    this.syncError = null;
    this.ordersError = null;
    this.staffSession = null;
    this.staffMember = null;
    this.authError = null;
    this.orderMutationQueues = new Map();

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

    // 4. Detectar parámetro ?tel= sólo para precompletar campo en alta manual (nunca autentica ni abre sesiones)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPhone = urlParams.get("tel");
      if (urlPhone) {
        const cleanPhone = String(urlPhone).replace(/\D/g, "");
        if (cleanPhone.length >= 8 && cleanPhone.length <= 15) {
          this.prefilledPhone = cleanPhone;
        }
      }
    } catch {}

    // 5. Conexión cloud SOLO en producción con configuración explícita válida
    if (this.config.mode === "production") {
      this.initSupabaseConnection();
    }
  }

  // --- Ajustes locales (PIN de UI sólo en Demo; producción usa Supabase Auth + RBAC) ---
  getLocalSettings() {
    if (!this.isDemo()) {
      return { staffPin: null };
    }
    const stored = safeGet(this.storageKeys.LOCAL_SETTINGS, null);
    const pin = stored && typeof stored.staffPin === "string" ? stored.staffPin.trim() : "";
    return { staffPin: pin || "1234" };
  }

  saveLocalSettings(newSettings = {}) {
    if (!this.isDemo()) {
      throw new Error("El PIN local sólo existe en modo demo. En producción usá tu cuenta de personal.");
    }
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

  getSyncError() {
    return this.syncError || this.cloudError || null;
  }

  verifyStaffPin(inputPin) {
    if (!this.isDemo()) {
      return false;
    }
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

  hasValidStaffSession() {
    if (!this.staffSession || !this.staffSession.user || !this.staffMember || this.staffMember.active !== true) {
      return false;
    }
    if (!["owner", "operator"].includes(this.staffMember.role)) {
      return false;
    }
    if (this.staffSession.expires_at !== undefined && this.staffSession.expires_at !== null) {
      const expMs = Number(this.staffSession.expires_at) > 1e12
        ? Number(this.staffSession.expires_at)
        : Number(this.staffSession.expires_at) * 1000;
      if (!Number.isFinite(expMs) || expMs <= Date.now()) {
        return false;
      }
    }
    return true;
  }

  getStaffRole() {
    if (this.isDemo()) {
      return safeGet(this.storageKeys.PIN_UNLOCKED, false) ? "owner" : null;
    }
    return this.hasValidStaffSession() ? this.staffMember.role : null;
  }

  getStaffSession() {
    if (this.isDemo()) {
      return this.isStaffUnlocked() ? { user: { email: "demo@nexo.local" }, role: "owner", demo: true } : null;
    }
    if (!this.hasValidStaffSession()) return null;
    return {
      user: this.staffSession.user,
      role: this.staffMember.role,
      expires_at: this.staffSession.expires_at || null
    };
  }

  canAccessStaffView(viewName) {
    const normalized = String(viewName || "").toLowerCase();
    const role = this.getStaffRole();
    if (!role) return false;
    if (["admin", "dueno"].includes(normalized)) return role === "owner";
    if (["operator", "operario"].includes(normalized)) return role === "owner" || role === "operator";
    return false;
  }

  isStaffUnlocked() {
    if (this.isDemo()) {
      return Boolean(safeGet(this.storageKeys.PIN_UNLOCKED, false));
    }
    return this.hasValidStaffSession();
  }

  async refreshStaffSession() {
    if (this.isDemo()) {
      return this.getStaffSession();
    }
    if (!this.supabase || !this.supabase.auth) {
      this.staffSession = null;
      this.staffMember = null;
      return null;
    }
    try {
      const { data, error } = await this.supabase.auth.getSession();
      const session = data?.session || null;
      if (error || !session || !session.user) {
        this.staffSession = null;
        this.staffMember = null;
        return null;
      }
      if (session.expires_at !== undefined && session.expires_at !== null) {
        const expMs = Number(session.expires_at) > 1e12
          ? Number(session.expires_at)
          : Number(session.expires_at) * 1000;
        if (!Number.isFinite(expMs) || expMs <= Date.now()) {
          this.staffSession = null;
          this.staffMember = null;
          this.authError = "Tu sesión expiró. Volvé a iniciar sesión.";
          try { await this.supabase.auth.signOut(); } catch {}
          this.notify("staff_locked");
          return null;
        }
      }

      const memberQuery = this.supabase
        .from("staff_members")
        .select("user_id, email, role, active")
        .eq("user_id", session.user.id);
      const memberRes = typeof memberQuery.maybeSingle === "function"
        ? await memberQuery.maybeSingle()
        : await memberQuery.single();

      const member = memberRes?.data;
      if (memberRes?.error || !member || member.active !== true || !["owner", "operator"].includes(member.role)) {
        this.staffSession = null;
        this.staffMember = null;
        this.authError = "La cuenta no tiene membresía de personal activa.";
        return null;
      }

      this.staffSession = session;
      this.staffMember = member;
      this.authError = null;
      return this.getStaffSession();
    } catch (err) {
      this.staffSession = null;
      this.staffMember = null;
      this.authError = String(err?.message || err);
      return null;
    }
  }

  async signInStaff(email, password) {
    if (this.isDemo()) {
      throw new Error("En modo demo utilizá el PIN de demostración.");
    }
    if (!this.config.ok || !this.supabase || !this.supabase.auth) {
      throw new Error("Conexión al servidor no disponible para autenticar personal.");
    }
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "");
    if (!cleanEmail || !cleanPassword) {
      throw new Error("Ingresá tu correo y contraseña.");
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword
    });
    if (error || !data?.session?.user) {
      this.staffSession = null;
      this.staffMember = null;
      throw new Error(error?.message || "Credenciales inválidas.");
    }

    const refreshed = await this.refreshStaffSession();
    if (!refreshed) {
      try { await this.supabase.auth.signOut(); } catch {}
      throw new Error(this.authError || "Tu usuario no pertenece al personal activo del comercio.");
    }

    this.subscribeToSupabaseRealtime();
    await this.pullFromSupabase();
    this.notify("staff_authenticated", refreshed);
    return refreshed;
  }

  async logoutStaff() {
    safeRemove(this.storageKeys.PIN_UNLOCKED);
    this.staffSession = null;
    this.staffMember = null;
    this.authError = null;
    if (this.config.mode === "production" && this.supabase) {
      try {
        if (this.supabase.auth && typeof this.supabase.auth.signOut === "function") {
          await this.supabase.auth.signOut();
        }
      } catch {}
      safeRemove(this.storageKeys.ORDERS);
      this.subscribeToSupabaseRealtime();
      await this.pullFromSupabase();
    }
    this.notify("staff_locked");
  }

  lockStaff() {
    return this.logoutStaff();
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
      this.syncError = null;
      await this.refreshStaffSession();
      await this.pullFromSupabase();
      this.subscribeToSupabaseRealtime();
      this.notify("cloud_connected");
    } catch (err) {
      console.warn("No se pudo conectar a Supabase:", err);
      this.supabase = null;
      this.cloudError = String((err && err.message) || err);
      this.syncError = this.cloudError;
      this.notify("cloud_error", this.cloudError);
    }
  }

  mapRemoteOrderRow(o) {
    return {
      id: typeof o.id === "number" ? o.id : Number(o.id),
      cliente: {
        nombre: o.cliente_nombre,
        telefono: o.cliente_telefono || "",
        direccion: o.direccion_entrega || ""
      },
      tipo_entrega: o.tipo_entrega,
      direccion_entrega: o.direccion_entrega || "",
      estado: o.estado,
      fecha: o.fecha || o.created_at || new Date().toISOString(),
      finalizado_at: o.finalizado_at || null,
      cancelado_at: o.cancelado_at || null,
      checkout_cart_key: o.checkout_cart_key || null,
      version: Number.isSafeInteger(Number(o.version)) && Number(o.version) >= 1 ? Number(o.version) : 1,
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
  }

  async pullFromSupabase() {
    if (!this.supabase) return;
    try {
      await this.refreshStaffSession();
      const isStaff = this.isStaffUnlocked();

      const prodRes = await this.supabase.from("productos").select("*").order("id");
      if (prodRes?.error) {
        this.syncError = `No se pudo sincronizar el catálogo: ${prodRes.error.message || "error de red o permisos."}`;
        this.cloudError = this.syncError;
        this.notify("sync_error", this.syncError);
        this.notify("catalog_error", this.syncError);
      } else if (Array.isArray(prodRes?.data)) {
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
        this.syncError = null;
        this.cloudError = null;
        this.catalogError = null;
        this.revalidateCartAgainstCatalog();
        this.notify("products_changed");
      }

      if (isStaff) {
        const ordRes = await this.supabase.from("pedidos").select("*").order("id", { ascending: false }).limit(50);
        if (ordRes?.error) {
          this.ordersError = `No se pudieron cargar pedidos: ${ordRes.error.message || "sin autorización."}`;
          this.syncError = this.ordersError;
          this.notify("orders_error", this.ordersError);
          this.notify("sync_error", this.ordersError);
        } else if (Array.isArray(ordRes?.data)) {
          const mappedOrders = [];
          let corruptRemoteCount = 0;
          for (const o of ordRes.data) {
            try {
              const candidate = this.mapRemoteOrderRow(o);
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
      } else {
        await this.refreshOwnTrackingOrders();
      }

      this.notify("storage_sync");
    } catch (err) {
      this.syncError = `Error de sincronización: ${String(err?.message || err)}`;
      this.cloudError = this.syncError;
      this.notify("sync_error", this.syncError);
    }
  }

  subscribeToSupabaseRealtime() {
    if (!this.supabase || typeof this.supabase.channel !== "function") return;
    if (this.realtimeChannel && typeof this.supabase.removeChannel === "function") {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    let channel = this.supabase.channel("nexo-pedidos-realtime");
    if (this.isStaffUnlocked()) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, (payload) => {
        if (payload?.eventType === "INSERT" && this.isStaffUnlocked()) {
          this.playAudioAlert();
        }
        this.pullFromSupabase();
      });
    }
    channel = channel.on("postgres_changes", { event: "*", schema: "public", table: "productos" }, () => {
      this.pullFromSupabase();
    });
    this.realtimeChannel = channel.subscribe();
  }

  async syncOrderToSupabase() {
    return null;
  }

  async syncProductToSupabase(product) {
    if (!this.supabase || !product) return { ok: true };
    if (!this.canAccessStaffView("admin")) {
      const msg = "Sólo el dueño autenticado puede modificar productos en el servidor.";
      this.cloudError = msg;
      this.notify("cloud_error", msg);
      throw new Error(msg);
    }
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
    const { error } = await this.supabase.from("productos").upsert(payload);
    if (error) {
      this.cloudError = error.message;
      this.notify("cloud_error", error.message);
      throw new Error(error.message);
    }
    return { ok: true };
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

  saveProduct(draft, productId = null, { sync = true } = {}) {
    if (!this.config.ok) throw new Error("Configuración inválida.");
    if (!this.isDemo() && !this.canAccessStaffView("admin")) {
      throw new Error("Sólo el dueño autenticado puede administrar productos.");
    }
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
    if (sync && !this.isDemo() && this.supabase) {
      this.syncProductToSupabase(saved).catch(() => {});
    }
    return saved;
  }

  async saveProductAsync(draft, productId = null) {
    const saved = this.saveProduct(draft, productId, { sync: false });
    if (!this.isDemo() && this.supabase) {
      await this.syncProductToSupabase(saved);
    }
    return saved;
  }

  archiveProduct(id, archived = true, { sync = true } = {}) {
    if (!this.config.ok) throw new Error("Configuración inválida.");
    if (!this.isDemo() && !this.canAccessStaffView("admin")) {
      throw new Error("Sólo el dueño autenticado puede archivar productos.");
    }
    const products = this.getAdminProducts();
    if (this.catalogError) throw new Error(this.catalogError);
    const product = products.find((p) => p.id === id);
    if (!product || typeof archived !== "boolean") throw new Error("No se encontró el producto o el estado de archivo no es válido.");
    const saved = { ...product, archivado: archived };
    writeCritical(this.storageKeys.PRODUCTS, products.map((p) => p.id === id ? saved : p));
    this.notify("products_changed");
    if (sync && !this.isDemo() && this.supabase) {
      this.syncProductToSupabase(saved).catch(() => {});
    }
    return saved;
  }

  async archiveProductAsync(id, archived = true) {
    const saved = this.archiveProduct(id, archived, { sync: false });
    if (!this.isDemo() && this.supabase) {
      await this.syncProductToSupabase(saved);
    }
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
    const norm = normalizeArPhone(phone);
    if (!norm.ok) return null;
    const customers = this.getCustomers();
    if (customers[norm.normalized]) return customers[norm.normalized];
    for (const candidate of Object.values(customers)) {
      if (candidate && candidate.telefono && normalizeArPhone(candidate.telefono).normalized === norm.normalized) {
        return candidate;
      }
    }
    return null;
  }

  saveCustomer(customer) {
    if (!customer || !customer.telefono) return null;
    const norm = normalizeArPhone(customer.telefono);
    if (!norm.ok) return null;
    const cleanPhone = norm.normalized;
    const customers = this.getCustomers();
    customers[cleanPhone] = { ...customer, telefono: cleanPhone };
    safeSet(this.storageKeys.CUSTOMERS, customers);
    // Anónimo/cliente nunca escribe directamente en tabla clientes por RLS (sólo create_order_atomic o staff).
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

  getCartAvailabilityIssues() {
    const cart = this.getCart();
    const items = Object.values(cart);
    if (items.length === 0) return [];
    const products = this.getAdminProducts();
    const issues = [];
    for (const item of items) {
      const product = products.find((p) => p.id === item.producto_id);
      if (!product) {
        issues.push({ producto_id: item.producto_id, nombre: item.nombre, reason: "removed", message: `${item.nombre} ya no forma parte del catálogo.` });
      } else if (product.archivado) {
        issues.push({ producto_id: item.producto_id, nombre: item.nombre, reason: "archived", message: `${item.nombre} fue archivado por el comercio.` });
      } else if (!product.disponible) {
        issues.push({ producto_id: item.producto_id, nombre: item.nombre, reason: "paused", message: `${item.nombre} quedó sin stock o pausado.` });
      } else if (product.precio !== item.precio_unitario || product.unidad_medida !== item.unidad_medida || (item.paso_solicitado !== undefined && product.paso !== item.paso_solicitado)) {
        issues.push({ producto_id: item.producto_id, nombre: item.nombre, reason: "changed", message: `Cambió el precio, unidad o paso de ${item.nombre}.` });
      }
    }
    return issues;
  }

  revalidateCartAgainstCatalog() {
    const issues = this.getCartAvailabilityIssues();
    this.cartWarnings = issues;
    if (issues.length > 0) {
      this.notify("cart_changed", { issues });
    }
    return issues;
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
    if (order.tipo_entrega !== undefined && !["RETIRO", "DELIVERY"].includes(order.tipo_entrega)) {
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
    const normA = normalizeArPhone(phoneA);
    const normB = normalizeArPhone(phoneB);
    if (!normA.ok || !normB.ok) return false;
    return normA.normalized === normB.normalized;
  }

  // --- Referencias locales de seguimiento por token opaco (AUD-06) ---
  getOwnTrackingRefs() {
    const raw = safeGet(this.storageKeys.OWN_TRACKING_REFS, []);
    if (!Array.isArray(raw)) return [];
    return raw.filter((ref) => ref && Number.isSafeInteger(Number(ref.orderId)) && typeof ref.token === "string" && ref.token.length >= 32);
  }

  saveOwnTrackingRef(orderId, token) {
    const numId = Number(orderId);
    if (!Number.isSafeInteger(numId) || numId <= 0 || typeof token !== "string" || token.trim().length < 32) return;
    const cleanToken = token.trim();
    const refs = this.getOwnTrackingRefs().filter((r) => Number(r.orderId) !== numId);
    refs.unshift({ orderId: numId, token: cleanToken, savedAt: new Date().toISOString() });
    safeSet(this.storageKeys.OWN_TRACKING_REFS, refs.slice(0, 30));
  }

  removeOwnTrackingRef(orderId) {
    const numId = Number(orderId);
    const refs = this.getOwnTrackingRefs().filter((r) => Number(r.orderId) !== numId);
    safeSet(this.storageKeys.OWN_TRACKING_REFS, refs);
  }

  getTrackingTokenForOrder(orderId) {
    const numId = Number(orderId);
    const found = this.getOwnTrackingRefs().find((r) => Number(r.orderId) === numId);
    return found ? found.token : null;
  }

  getTrackingLink(orderId, token = null) {
    const effectiveToken = token || this.getTrackingTokenForOrder(orderId);
    if (!effectiveToken || !orderId) return "";
    // Fragmento URL (#track=...) para que el token jamás viaje en query string ni logs HTTP.
    return `#track=${Number(orderId)}:${encodeURIComponent(effectiveToken)}`;
  }

  parseTrackingHash(hashStr = null) {
    const source = hashStr !== null
      ? String(hashStr)
      : (typeof window !== "undefined" ? String(window.location.hash || "") : "");
    const match = source.match(/^#?track=(\d+):([^&\s]+)$/);
    if (!match) return null;
    const orderId = Number(match[1]);
    let token = "";
    try { token = decodeURIComponent(match[2]).trim(); } catch { return null; }
    if (!Number.isSafeInteger(orderId) || orderId <= 0 || token.length < 32 || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
      return null;
    }
    return { orderId, token };
  }

  async resolvePrivateTrackingLink(hashOrRef = null) {
    const parsed = this.parseTrackingHash(hashOrRef);
    if (!parsed) {
      return { ok: false, error: "El enlace de seguimiento es inválido o está incompleto." };
    }
    if (this.isDemo()) {
      const expectedToken = this.getTrackingTokenForOrder(parsed.orderId);
      const localOrder = this.getOrders().find((o) => o.id === parsed.orderId);
      if (!expectedToken || expectedToken !== parsed.token || !localOrder) {
        return { ok: false, notFoundOrRevoked: true, error: "Pedido no disponible o enlace revocado." };
      }
      this.setActiveOrderId(localOrder.id);
      return { ok: true, order: localOrder };
    }
    if (!this.supabase) {
      return { ok: false, error: "Sin conexión con el servidor para verificar el seguimiento." };
    }
    const res = await this.supabase.rpc("get_order_by_tracking_token", {
      p_order_id: parsed.orderId,
      p_token: parsed.token
    });
    const rows = Array.isArray(res?.data) ? res.data : (res?.data ? [res.data] : []);
    if (res?.error || rows.length === 0) {
      this.removeOwnTrackingRef(parsed.orderId);
      return { ok: false, notFoundOrRevoked: true, error: "Pedido no disponible o enlace revocado." };
    }
    const mapped = this.mapRemoteOrderRow(rows[0]);
    this.validateOrderRecord(mapped);
    this.saveOwnTrackingRef(mapped.id, parsed.token);
    const others = this.getOrders().filter((o) => o.id !== mapped.id);
    this.persistOrders([mapped, ...others]);
    this.setActiveOrderId(mapped.id);
    this.notify("orders_changed");
    return { ok: true, order: mapped };
  }

  async refreshOwnTrackingOrders() {
    if (!this.supabase || this.isDemo()) return;
    const refs = this.getOwnTrackingRefs();
    if (refs.length === 0) {
      this.persistOrders([]);
      this.notify("orders_changed");
      return;
    }
    const validOrders = [];
    let revokedCount = 0;
    for (const ref of refs) {
      const res = await this.supabase.rpc("get_order_by_tracking_token", {
        p_order_id: ref.orderId,
        p_token: ref.token
      });
      if (res?.error) {
        // Error transitorio: no borrar la referencia ni falsificar estado.
        const cached = this.getOrders().find((o) => o.id === ref.orderId);
        if (cached) validOrders.push(cached);
        continue;
      }
      const rows = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      if (rows.length === 0) {
        revokedCount++;
        this.removeOwnTrackingRef(ref.orderId);
        continue;
      }
      try {
        const mapped = this.mapRemoteOrderRow(rows[0]);
        this.validateOrderRecord(mapped);
        validOrders.push(mapped);
      } catch {
        // Ignorar fila corrupta
      }
    }
    if (revokedCount > 0 && validOrders.length === 0 && this.getActiveOrderId()) {
      this.setActiveOrderId(null);
    }
    this.persistOrders(validOrders);
    this.notify("orders_changed");
  }

  async revokeOrderTrackingTokenAsync(orderId) {
    if (this.isDemo()) {
      this.removeOwnTrackingRef(orderId);
      if (this.getActiveOrderId() === orderId) this.setActiveOrderId(null);
      this.notify("orders_changed");
      return true;
    }
    if (!this.supabase || !this.isStaffUnlocked()) {
      throw new Error("Sólo el personal autenticado puede revocar enlaces de seguimiento.");
    }
    const res = await this.supabase.rpc("revoke_order_tracking_token", { p_order_id: Number(orderId) });
    if (res?.error) throw new Error(res.error.message || "No se pudo revocar el enlace.");
    this.removeOwnTrackingRef(orderId);
    this.notify("orders_changed");
    return Boolean(res?.data ?? true);
  }

  getPendingCheckout() {
    return safeGet(this.storageKeys.PENDING_CHECKOUT, null);
  }

  clearPendingCheckout() {
    safeRemove(this.storageKeys.PENDING_CHECKOUT);
    this.notify("pending_checkout_changed", null);
  }

  getActiveOrder(userPhone = null) {
    const orders = this.getOrders();
    if (!this.isDemo() && !this.isStaffUnlocked()) {
      const ownIds = new Set(this.getOwnTrackingRefs().map((r) => Number(r.orderId)));
      const activeId = this.getActiveOrderId();
      if (activeId && ownIds.has(Number(activeId))) {
        const active = orders.find((o) => o.id === Number(activeId));
        if (active && active.estado !== "ENTREGADO" && active.estado !== "CANCELADO") return active;
      }
      const ongoingOwn = orders.find((o) => ownIds.has(Number(o.id)) && o.estado !== "ENTREGADO" && o.estado !== "CANCELADO");
      if (ongoingOwn) {
        this.setActiveOrderId(ongoingOwn.id);
        return ongoingOwn;
      }
      return null;
    }

    const targetPhone = userPhone || this.getCurrentUser()?.telefono;
    if (!targetPhone) return null;

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
    if (!this.isDemo() && !this.isStaffUnlocked()) {
      const ownIds = new Set(this.getOwnTrackingRefs().map((r) => Number(r.orderId)));
      return this.getOrders().filter((o) => ownIds.has(Number(o.id)));
    }
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
    if (!order.checkout_cart_key || this.checkoutCartKey() === order.checkout_cart_key) {
      try {
        localStorage.removeItem(this.storageKeys.CART);
        delete memoryFallback[this.storageKeys.CART];
      } catch { warnings.push("El carrito conserva una copia; reintentar no duplica este pedido."); }
    }
    this.checkoutWarning = warnings.length
      ? `Pedido #${order.id} recibido y guardado. ${warnings.join(" ")} Podés volver a abrirlo y reintentar la limpieza cuando se restablezca el almacenamiento.`
      : null;
    this.notify("cart_changed");
    return order;
  }

  getCheckoutWarning() {
    return this.checkoutWarning || null;
  }

  createOrder({ cliente, tipo_entrega, direccion_entrega }) {
    if (!this.config.ok) return null;
    if (!this.isDemo()) {
      throw new Error("En producción el pedido se confirma de forma atómica contra el servidor (submitOrder).");
    }
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
      version: 1,
      total_estimado: totalEstimado, total_real: null, checkout_cart_key: cartKey,
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
    this.playAudioAlert();
    this.notify("order_created", newOrder);
    return newOrder;
  }

  async submitOrder({ cliente, tipo_entrega, direccion_entrega }) {
    if (!this.config.ok) {
      return { ok: false, status: "failed", error: "Configuración inválida; no se puede crear el pedido." };
    }

    if (this.isDemo()) {
      try {
        const order = this.createOrder({ cliente, tipo_entrega, direccion_entrega });
        if (!order) {
          return { ok: false, status: "failed", error: "El carrito está vacío." };
        }
        let token = this.getTrackingTokenForOrder(order.id);
        if (!token) {
          token = generateTrackingToken();
          this.saveOwnTrackingRef(order.id, token);
        }
        return {
          ok: true,
          status: "confirmed",
          order,
          idempotent: false,
          trackingToken: token,
          trackingLink: this.getTrackingLink(order.id, token)
        };
      } catch (err) {
        return { ok: false, status: "failed", error: String(err?.message || err) };
      }
    }

    if (!this.supabase) {
      return { ok: false, status: "failed", error: this.cloudError || "Sin conexión con el servidor para enviar el pedido." };
    }
    if (this.syncError || this.catalogError) {
      return { ok: false, status: "failed", error: this.syncError || this.catalogError };
    }

    const { items } = this.getCartSummary();
    if (items.length === 0) {
      return { ok: false, status: "failed", error: "El carrito está vacío." };
    }

    const issues = this.getCartAvailabilityIssues();
    if (issues.length > 0) {
      return { ok: false, status: "failed", error: issues[0].message, issues };
    }

    const normPhone = normalizeArPhone(cliente?.telefono);
    if (!normPhone.ok) {
      return { ok: false, status: "failed", error: "Ingresá un número de WhatsApp válido con código de área (10 dígitos AR)." };
    }
    const cleanPhone = normPhone.normalized;
    const cleanName = String(cliente?.nombre || "").trim();
    if (cleanName.length < 2) {
      return { ok: false, status: "failed", error: "Ingresá tu nombre completo para identificar el pedido." };
    }
    const cleanDelivery = tipo_entrega === "DELIVERY" ? "DELIVERY" : "RETIRO";
    const cleanAddress = cleanDelivery === "DELIVERY"
      ? String(direccion_entrega || "").trim()
      : "Retiro en Mostrador";
    if (cleanDelivery === "DELIVERY" && !cleanAddress) {
      return { ok: false, status: "failed", error: "Ingresá la dirección de entrega para delivery." };
    }

    const itemsPayload = items
      .map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad }))
      .sort((a, b) => String(a.producto_id).localeCompare(String(b.producto_id)));

    const payloadSignature = JSON.stringify({
      telefono: cleanPhone,
      nombre: cleanName,
      tipo_entrega: cleanDelivery,
      direccion: cleanAddress,
      items: itemsPayload
    });

    const cartKey = this.checkoutCartKey();
    const existingPending = this.getPendingCheckout();
    let pending;
    if (
      existingPending &&
      existingPending.payloadSignature === payloadSignature &&
      typeof existingPending.attemptKey === "string" &&
      typeof existingPending.token === "string" &&
      typeof existingPending.tokenHash === "string"
    ) {
      pending = { ...existingPending, status: "pending", cartKey };
    } else {
      const token = generateTrackingToken();
      const tokenHash = await sha256Hex(token);
      pending = {
        attemptKey: this.localProductId(),
        token,
        tokenHash,
        payloadSignature,
        cartKey,
        status: "pending",
        createdAt: new Date().toISOString()
      };
    }

    writeCritical(this.storageKeys.PENDING_CHECKOUT, pending);
    this.notify("pending_checkout_changed", pending);

    try {
      const res = await this.supabase.rpc("create_order_atomic", {
        p_cliente_telefono: cleanPhone,
        p_cliente_nombre: cleanName,
        p_tipo_entrega: cleanDelivery,
        p_direccion_entrega: cleanAddress,
        p_items: itemsPayload,
        p_checkout_cart_key: pending.attemptKey,
        p_tracking_token_hash: pending.tokenHash
      });

      if (res?.error) {
        return this.handleCheckoutError(res.error, pending);
      }

      const payload = res?.data;
      if (!payload || !payload.order) {
        safeSet(this.storageKeys.PENDING_CHECKOUT, { ...pending, status: "unknown", updatedAt: new Date().toISOString() });
        this.notify("pending_checkout_changed", this.getPendingCheckout());
        return {
          ok: false,
          status: "unknown",
          canRetry: true,
          attemptKey: pending.attemptKey,
          error: "Respuesta incompleta del servidor. Tu carrito sigue guardado; reintentá verificar sin riesgo de duplicar."
        };
      }

      const effectiveToken = typeof payload.tracking_token === "string" && payload.tracking_token.length >= 32
        ? payload.tracking_token
        : pending.token;

      const mappedOrder = this.mapRemoteOrderRow(payload.order);
      this.validateOrderRecord(mappedOrder);

      this.saveOwnTrackingRef(mappedOrder.id, effectiveToken);
      const others = this.getOrders().filter((o) => o.id !== mappedOrder.id);
      this.persistOrders([mappedOrder, ...others]);
      this.clearPendingCheckout();
      this.finishCheckout({ ...mappedOrder, checkout_cart_key: cartKey });
      this.playAudioAlert();
      this.notify("order_created", mappedOrder);
      this.notify("orders_changed");

      return {
        ok: true,
        status: "confirmed",
        order: mappedOrder,
        idempotent: Boolean(payload.idempotent),
        trackingToken: effectiveToken,
        trackingLink: this.getTrackingLink(mappedOrder.id, effectiveToken)
      };
    } catch (err) {
      return this.handleCheckoutError(err, pending);
    }
  }

  async handleCheckoutError(err, pending) {
    const rawMsg = String(err?.message || err || "Error desconocido");
    const status = Number(err?.status || err?.code || 0);
    const isRateLimit = /RATE_LIMIT_EXCEEDED/i.test(rawMsg);
    const isRateUnconfigured = /RATE_LIMIT_UNCONFIGURED/i.test(rawMsg);
    const isProductUnavailable = /PRODUCT_UNAVAILABLE/i.test(rawMsg);
    const isConflict = /CONFLICT/i.test(rawMsg);
    const isValidation = /VALIDATION_ERROR/i.test(rawMsg);
    const isDeterministicRejection =
      isRateLimit ||
      isRateUnconfigured ||
      isProductUnavailable ||
      isConflict ||
      isValidation ||
      (status >= 400 && status < 500 && status !== 408);

    if (isDeterministicRejection) {
      this.clearPendingCheckout();
      if (isProductUnavailable) {
        try { await this.pullFromSupabase(); } catch {}
      }
      const retryAfterSeconds = extractRetryAfterSeconds(rawMsg);
      let friendly = rawMsg.replace(/^(RATE_LIMIT_EXCEEDED|RATE_LIMIT_UNCONFIGURED|PRODUCT_UNAVAILABLE|VALIDATION_ERROR|CONFLICT):\s*/i, "");
      if (isRateLimit) {
        friendly = retryAfterSeconds
          ? `Demasiados pedidos seguidos. Esperá ${retryAfterSeconds} segundos para volver a intentar.`
          : "Demasiados pedidos seguidos. Esperá unos instantes antes de volver a intentar.";
      }
      if (isRateUnconfigured) {
        friendly = "El sistema de límites no está disponible en el servidor; por seguridad el checkout quedó bloqueado temporalmente.";
      }
      return {
        ok: false,
        status: "failed",
        retryAfterSeconds,
        error: friendly
      };
    }

    // Falla de transporte, timeout, caída de red o HTTP 5xx: estado desconocido (NO limpiar carrito ni attemptKey)
    const unknownState = {
      ...pending,
      status: "unknown",
      lastError: rawMsg,
      updatedAt: new Date().toISOString()
    };
    safeSet(this.storageKeys.PENDING_CHECKOUT, unknownState);
    this.notify("pending_checkout_changed", unknownState);
    return {
      ok: false,
      status: "unknown",
      canRetry: true,
      attemptKey: pending.attemptKey,
      error: "No pudimos verificar si el servidor recibió tu pedido por un corte o demora de conexión. Tu carrito sigue guardado; reintentá para recuperar o confirmar sin duplicar."
    };
  }

  requireDemoOrSyncGuard() {
    if (!this.isDemo()) {
      throw new Error("En producción esta operación requiere sincronización autoritativa con el servidor.");
    }
  }

  updateOrderStatus(orderId, newStatus) {
    this.requireDemoOrSyncGuard();
    if (newStatus === "LISTO") return this.finalizeOrderWeighing(orderId);
    const previous = this.getOrders().find((o) => o.id === orderId);
    if (previous && ["LISTO", "ENTREGADO"].includes(previous.estado) && ["PENDIENTE", "EN_PREPARACION"].includes(newStatus)) throw new Error("Un pedido finalizado no se puede reabrir desde preparación.");
    let targetOrder = null;
    const orders = this.getOrders().map((order) => {
      if (order.id === orderId) {
        targetOrder = { ...order, estado: newStatus, version: (order.version || 1) + 1, updated_at: new Date().toISOString() };
        return targetOrder;
      }
      return order;
    });
    this.persistOrders(orders);
    this.notify("orders_changed");
    return targetOrder;
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

  computeWeightUpdateOrder(order, itemIndex, pesoReal, { confirmUnit = false } = {}) {
    if (!order || !order.items[itemIndex] || !["PENDIENTE", "EN_PREPARACION"].includes(order.estado)) {
      throw new Error("El pedido o ítem no está disponible para preparación.");
    }
    const previous = order.items[itemIndex];
    const peso = this.parsePreparedValue(pesoReal, previous.unidad_medida);
    if (confirmUnit && previous.unidad_medida === "UNIDAD" && peso === null) {
      throw new Error("Ingresá una cantidad entera mayor que cero; para cero usá Sin Stock.");
    }
    if (peso !== null && !Number.isFinite(peso * previous.precio_unitario)) {
      throw new Error("El importe de preparación no es válido.");
    }
    const item = { ...previous, peso_real: peso, subtotal: previous.sin_stock ? 0 : peso === null ? 0 : Math.round(peso * previous.precio_unitario) };
    if (previous.unidad_medida === "UNIDAD") {
      item.confirmado_preparacion = peso !== null && (confirmUnit || (previous.peso_real === peso && previous.confirmado_preparacion === true));
    }
    const items = order.items.map((i, index) => (index === itemIndex ? item : i));
    const totalReal = items.every((i) => i.sin_stock || this.parsePreparedValue(i.peso_real, i.unidad_medida) !== null)
      ? items.filter((i) => !i.sin_stock).reduce((sum, i) => sum + i.subtotal, 0)
      : null;
    return { items, totalReal };
  }

  updateItemWeight(orderId, itemIndex, pesoReal, { notify = true, confirmUnit = false } = {}) {
    this.requireDemoOrSyncGuard();
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    const { items, totalReal } = this.computeWeightUpdateOrder(order, itemIndex, pesoReal, { confirmUnit });
    const target = { ...order, items, total_real: totalReal, version: (order.version || 1) + 1 };
    this.persistOrders(orders.map((o) => o.id === orderId ? target : o));
    if (notify) this.notify("orders_changed");
    return target;
  }

  computeOutOfStockOrder(order, itemIndex) {
    if (!order || !order.items[itemIndex] || !["PENDIENTE", "EN_PREPARACION"].includes(order.estado)) {
      throw new Error("El ítem no está disponible para preparación.");
    }
    const previous = order.items[itemIndex];
    const item = { ...previous, sin_stock: !previous.sin_stock };
    if (item.unidad_medida === "UNIDAD") item.confirmado_preparacion = false;
    const qty = this.parsePreparedValue(item.peso_real, item.unidad_medida);
    item.subtotal = item.sin_stock || qty === null ? 0 : Math.round(qty * item.precio_unitario);
    const items = order.items.map((i, index) => (index === itemIndex ? item : i));
    const allResolved = items.every((i) => i.sin_stock || this.parsePreparedValue(i.peso_real, i.unidad_medida) !== null);
    const totalReal = allResolved
      ? items.filter((i) => !i.sin_stock).reduce((sum, i) => sum + i.subtotal, 0)
      : items.some((i) => !i.sin_stock && i.peso_real !== null)
      ? items.filter((i) => !i.sin_stock && i.peso_real !== null).reduce((sum, i) => sum + i.subtotal, 0)
      : null;
    return { items, totalReal };
  }

  toggleItemOutOfStock(orderId, itemIndex) {
    this.requireDemoOrSyncGuard();
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    const { items, totalReal } = this.computeOutOfStockOrder(order, itemIndex);
    const target = { ...order, items, total_real: totalReal, version: (order.version || 1) + 1 };
    this.persistOrders(orders.map((o) => o.id === orderId ? target : o));
    this.notify("orders_changed");
    return target;
  }

  computeFinalizeItems(order, weightsMap = null) {
    if (!order) throw new Error("No se encontró el pedido.");
    if (["LISTO", "ENTREGADO"].includes(order.estado)) return { alreadyFinalized: true, items: order.items, totalReal: order.total_real };
    if (order.estado === "CANCELADO" || order.items.length === 0) {
      throw new Error("Agregá un ítem o cancelá el pedido vacío; no se puede finalizar así.");
    }
    const items = order.items.map((item, index) => {
      if (item.sin_stock) return { ...item, subtotal: 0 };
      const value = weightsMap && Object.hasOwn(weightsMap, index) ? weightsMap[index] : item.peso_real;
      const qty = this.parsePreparedValue(value, item.unidad_medida);
      const prepared = { ...item, peso_real: qty };
      if (!this.preparationItemResolved(prepared) || (item.unidad_medida === "UNIDAD" && qty !== item.peso_real)) {
        throw new Error("Falta preparar o confirmar ítems. Revisá cantidades y pesos antes de finalizar.");
      }
      if (!Number.isFinite(item.precio_unitario) || item.precio_unitario < 0) {
        throw new Error("El precio del pedido no es válido.");
      }
      const subtotal = Math.round(qty * item.precio_unitario);
      if (!Number.isFinite(subtotal)) throw new Error("El importe final no es válido.");
      return { ...prepared, subtotal };
    });
    const totalReal = items.filter((i) => !i.sin_stock).reduce((sum, i) => sum + i.subtotal, 0);
    return { alreadyFinalized: false, items, totalReal };
  }

  finalizeOrderWeighing(orderId, weightsMap = null) {
    this.requireDemoOrSyncGuard();
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    const { alreadyFinalized, items, totalReal } = this.computeFinalizeItems(order, weightsMap);
    if (alreadyFinalized) return order;
    const target = { ...order, items, total_real: totalReal, estado: "LISTO", finalizado_at: new Date().toISOString(), version: (order.version || 1) + 1 };
    this.persistOrders(orders.map((o) => o.id === orderId ? target : o));
    this.notify("orders_changed");
    this.notify("order_ready", orderId);
    return target;
  }

  deleteOrder(orderId) {
    this.requireDemoOrSyncGuard();
    const orders = this.getOrders().filter((o) => o.id !== orderId);
    this.persistOrders(orders);
    if (this.getActiveOrderId() === orderId) {
      this.setActiveOrderId(null);
    }
    this.notify("orders_changed");
  }

  cancelOrder(orderId) {
    this.requireDemoOrSyncGuard();
    let targetOrder = null;
    const orders = this.getOrders().map((order) => {
      if (order.id === orderId) {
        targetOrder = {
          ...order,
          estado: "CANCELADO",
          cancelado_at: new Date().toISOString(),
          version: (order.version || 1) + 1
        };
        return targetOrder;
      }
      return order;
    });
    this.persistOrders(orders);
    if (this.getActiveOrderId() === orderId) {
      this.setActiveOrderId(null);
    }
    this.notify("orders_changed");
    return targetOrder;
  }

  computeRemoveItemState(order, itemIndex) {
    if (!order || !["PENDIENTE", "EN_PREPARACION"].includes(order.estado)) {
      throw new Error("El pedido finalizado o cancelado conserva sus ítems.");
    }
    const items = order.items.filter((_, idx) => idx !== itemIndex);
    const totalEstimado = items.reduce((sum, i) => sum + Math.round(i.cantidad_solicitada * i.precio_unitario), 0);
    const hasWeighedItems = items.some((i) => i.peso_real !== null || i.sin_stock);
    const totalReal = hasWeighedItems
      ? items.filter((i) => !i.sin_stock && i.peso_real !== null).reduce((sum, i) => sum + (i.subtotal || 0), 0)
      : null;
    return { items, totalEstimado, totalReal };
  }

  removeItemFromOrder(orderId, itemIndex) {
    this.requireDemoOrSyncGuard();
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    const { items, totalEstimado, totalReal } = this.computeRemoveItemState(order, itemIndex);
    const targetOrder = { ...order, items, total_estimado: totalEstimado, total_real: totalReal, version: (order.version || 1) + 1 };
    this.persistOrders(orders.map((o) => (o.id === orderId ? targetOrder : o)));
    this.notify("orders_changed");
    return targetOrder;
  }

  computeAddItemState(order, productId, cantidad) {
    const product = this.getProducts().find((p) => p.id === productId);
    if (!product || !product.disponible) throw new Error("El producto está pausado, archivado o no disponible.");
    if (!order || !["PENDIENTE", "EN_PREPARACION"].includes(order.estado)) {
      throw new Error("El pedido no está disponible para agregar productos.");
    }
    const qty = this.parsePreparedValue(cantidad, product.unidad_medida);
    if (qty === null) throw new Error("Ingresá una cantidad válida mayor que cero.");
    const subtotal = Math.round(qty * product.precio);
    if (!Number.isFinite(subtotal)) throw new Error("El importe del producto no es válido.");
    const newItem = {
      producto_id: product.id,
      nombre: product.nombre,
      categoria: product.categoria,
      unidad_medida: product.unidad_medida,
      precio_unitario: product.precio,
      cantidad_solicitada: qty,
      peso_real: product.unidad_medida === "UNIDAD" ? qty : null,
      subtotal,
      sin_stock: false,
      ...(product.unidad_medida === "UNIDAD" ? { confirmado_preparacion: false } : {})
    };
    const items = [...order.items, newItem];
    const totalEstimado = items.reduce((sum, i) => sum + Math.round(i.cantidad_solicitada * i.precio_unitario), 0);
    const allWeighed = items.every((i) => i.sin_stock || this.parsePreparedValue(i.peso_real, i.unidad_medida) !== null);
    let totalReal = order.total_real;
    if (allWeighed) {
      totalReal = items.filter((i) => !i.sin_stock).reduce((sum, i) => sum + (i.subtotal || 0), 0);
    } else if (order.total_real !== null) {
      const hasWeighedItems = items.some((i) => i.peso_real !== null);
      totalReal = hasWeighedItems
        ? items.filter((i) => !i.sin_stock && i.peso_real !== null).reduce((sum, i) => sum + (i.subtotal || 0), 0)
        : null;
    }
    return { items, totalEstimado, totalReal };
  }

  addProductToOrder(orderId, productId, cantidad) {
    this.requireDemoOrSyncGuard();
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    const { items, totalEstimado, totalReal } = this.computeAddItemState(order, productId, cantidad);
    const targetOrder = { ...order, items, total_estimado: totalEstimado, total_real: totalReal, version: (order.version || 1) + 1 };
    this.persistOrders(orders.map((o) => (o.id === orderId ? targetOrder : o)));
    this.notify("orders_changed");
    return targetOrder;
  }

  updateOrderDetails(orderId, details) {
    this.requireDemoOrSyncGuard();
    let targetOrder = null;
    const orders = this.getOrders().map((order) => {
      if (order.id === orderId) {
        const nextTipo = details.tipo_entrega || order.tipo_entrega;
        const nextDireccion = details.direccion_entrega !== undefined
          ? details.direccion_entrega
          : (nextTipo === "RETIRO" ? "" : order.direccion_entrega);
        targetOrder = {
          ...order,
          cliente: {
            ...order.cliente,
            nombre: details.nombre !== undefined ? details.nombre : order.cliente.nombre,
            telefono: details.telefono !== undefined ? details.telefono : order.cliente.telefono
          },
          tipo_entrega: nextTipo,
          direccion_entrega: nextDireccion,
          version: (order.version || 1) + 1
        };
        return targetOrder;
      }
      return order;
    });
    this.persistOrders(orders);
    this.notify("orders_changed");
    return targetOrder;
  }

  // --- Operaciones autoritativas y concurrencia optimista para personal (AUD-09) ---
  enqueueOrderMutation(orderId, task) {
    const key = Number(orderId);
    const prev = this.orderMutationQueues.get(key);
    const run = prev
      ? prev.promise.then(
          () => task(),
          (prevErr) => {
            if (prevErr && prevErr.isVersionConflict) throw prevErr;
            return task();
          }
        )
      : Promise.resolve().then(() => task());
    const marker = { promise: run };
    this.orderMutationQueues.set(key, marker);
    const cleanup = () => {
      if (this.orderMutationQueues.get(key) === marker) {
        this.orderMutationQueues.delete(key);
      }
    };
    run.then(cleanup, cleanup);
    return run;
  }

  applyServerOrderResult(rawRow) {
    const mapped = this.mapRemoteOrderRow(rawRow);
    this.validateOrderRecord(mapped);
    const current = this.getOrders();
    const exists = current.some((o) => o.id === mapped.id);
    const updated = exists ? current.map((o) => (o.id === mapped.id ? mapped : o)) : [mapped, ...current];
    this.persistOrders(updated);
    this.notify("orders_changed");
    return mapped;
  }

  async invokeStaffOrderRpc(rpcName, params) {
    if (!this.supabase || !this.isStaffUnlocked()) {
      throw new Error("Sesión de personal autenticada requerida.");
    }
    const res = await this.supabase.rpc(rpcName, params);
    if (res?.error) {
      const msg = String(res.error.message || "Error al actualizar el pedido.");
      if (/CONFLICT/i.test(msg)) {
        try { await this.pullFromSupabase(); } catch {}
        const err = new Error(msg.replace(/^CONFLICT:\s*/i, "") + " Recargamos los datos actuales.");
        err.isVersionConflict = true;
        throw err;
      }
      throw new Error(msg.replace(/^(FORBIDDEN|NOT_FOUND|INVALID_TRANSITION|VALIDATION_ERROR):\s*/i, ""));
    }
    if (!res?.data) {
      throw new Error("El servidor no devolvió el pedido actualizado.");
    }
    return this.applyServerOrderResult(res.data);
  }

  async takeOrderAsync(orderId) {
    if (this.isDemo()) return this.updateOrderStatus(orderId, "EN_PREPARACION");
    return this.enqueueOrderMutation(orderId, () => {
      const order = this.getOrders().find((o) => o.id === orderId);
      if (!order) throw new Error("No se encontró el pedido.");
      return this.invokeStaffOrderRpc("take_order", {
        p_order_id: orderId,
        p_expected_version: order.version || 1
      });
    });
  }

  async saveItemWeightAsync(orderId, itemIndex, pesoReal, opts = {}) {
    if (this.isDemo()) return this.updateItemWeight(orderId, itemIndex, pesoReal, opts);
    return this.enqueueOrderMutation(orderId, () => {
      const order = this.getOrders().find((o) => o.id === orderId);
      const { items, totalReal } = this.computeWeightUpdateOrder(order, itemIndex, pesoReal, opts);
      return this.invokeStaffOrderRpc("update_order_preparation", {
        p_order_id: orderId,
        p_expected_version: order.version || 1,
        p_items: items,
        p_total_real: totalReal
      });
    });
  }

  async toggleItemOutOfStockAsync(orderId, itemIndex) {
    if (this.isDemo()) return this.toggleItemOutOfStock(orderId, itemIndex);
    return this.enqueueOrderMutation(orderId, () => {
      const order = this.getOrders().find((o) => o.id === orderId);
      const { items, totalReal } = this.computeOutOfStockOrder(order, itemIndex);
      return this.invokeStaffOrderRpc("update_order_preparation", {
        p_order_id: orderId,
        p_expected_version: order.version || 1,
        p_items: items,
        p_total_real: totalReal
      });
    });
  }

  async finalizeOrderWeighingAsync(orderId, weightsMap = null) {
    if (this.isDemo()) return this.finalizeOrderWeighing(orderId, weightsMap);
    return this.enqueueOrderMutation(orderId, async () => {
      const order = this.getOrders().find((o) => o.id === orderId);
      const { alreadyFinalized, items } = this.computeFinalizeItems(order, weightsMap);
      if (alreadyFinalized) return order;
      const saved = await this.invokeStaffOrderRpc("finalize_order_preparation", {
        p_order_id: orderId,
        p_expected_version: order.version || 1,
        p_items: items
      });
      this.notify("order_ready", orderId);
      return saved;
    });
  }

  async transitionOrderStatusAsync(orderId, newStatus) {
    if (newStatus === "LISTO") return this.finalizeOrderWeighingAsync(orderId);
    if (newStatus === "EN_PREPARACION") {
      const order = this.getOrders().find((o) => o.id === orderId);
      if (order?.estado === "PENDIENTE") return this.takeOrderAsync(orderId);
    }
    if (this.isDemo()) return this.updateOrderStatus(orderId, newStatus);
    return this.enqueueOrderMutation(orderId, () => {
      const order = this.getOrders().find((o) => o.id === orderId);
      if (!order) throw new Error("No se encontró el pedido.");
      return this.invokeStaffOrderRpc("transition_order_status", {
        p_order_id: orderId,
        p_expected_version: order.version || 1,
        p_new_status: newStatus
      });
    });
  }

  async cancelOrderAsync(orderId) {
    if (this.isDemo()) return this.cancelOrder(orderId);
    const saved = await this.transitionOrderStatusAsync(orderId, "CANCELADO");
    if (this.getActiveOrderId() === orderId) this.setActiveOrderId(null);
    return saved;
  }

  async removeItemFromOrderAsync(orderId, itemIndex) {
    if (this.isDemo()) return this.removeItemFromOrder(orderId, itemIndex);
    return this.enqueueOrderMutation(orderId, () => {
      const order = this.getOrders().find((o) => o.id === orderId);
      const { items, totalReal } = this.computeRemoveItemState(order, itemIndex);
      return this.invokeStaffOrderRpc("update_order_preparation", {
        p_order_id: orderId,
        p_expected_version: order.version || 1,
        p_items: items,
        p_total_real: totalReal
      });
    });
  }

  async addProductToOrderAsync(orderId, productId, cantidad) {
    if (this.isDemo()) return this.addProductToOrder(orderId, productId, cantidad);
    return this.enqueueOrderMutation(orderId, () => {
      const order = this.getOrders().find((o) => o.id === orderId);
      const { items, totalReal } = this.computeAddItemState(order, productId, cantidad);
      return this.invokeStaffOrderRpc("update_order_preparation", {
        p_order_id: orderId,
        p_expected_version: order.version || 1,
        p_items: items,
        p_total_real: totalReal
      });
    });
  }

  async updateOrderDetailsAsync(orderId, details) {
    if (this.isDemo()) return this.updateOrderDetails(orderId, details);
    return this.enqueueOrderMutation(orderId, () => {
      const order = this.getOrders().find((o) => o.id === orderId);
      if (!order) throw new Error("No se encontró el pedido.");
      const nextTipo = details.tipo_entrega || order.tipo_entrega;
      const nextDireccion = details.direccion_entrega !== undefined
        ? details.direccion_entrega
        : (nextTipo === "RETIRO" ? "" : order.direccion_entrega);
      return this.invokeStaffOrderRpc("update_order_details_staff", {
        p_order_id: orderId,
        p_expected_version: order.version || 1,
        p_nombre: details.nombre !== undefined ? details.nombre : order.cliente.nombre,
        p_telefono: details.telefono !== undefined ? details.telefono : order.cliente.telefono,
        p_tipo_entrega: nextTipo,
        p_direccion_entrega: nextDireccion
      });
    });
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

export const store = new Store();
export { Store, STORAGE_KEYS, safeGet, safeSet, safeRemove, normalizeArPhone, generateTrackingToken, sha256Hex };
