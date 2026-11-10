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

class Store {
  constructor(config = NEXO_CONFIG, options = {}) {
    this.config = config;
    this.storageKeys = config.storageKeys || STORAGE_KEYS;
    if (!this.storageKeys.BUSINESS_CONFIG) {
      this.storageKeys.BUSINESS_CONFIG = `${this.storageKeys.PREFIX || (this.isDemo() ? "nexo_demo_v1_" : "nexo_prod_v1_")}business_config`;
    }
    this.listeners = new Set();
    this.blockedNetwork = [];
    this.supabase = options?.supabaseClient || null;
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
    const config = this.getComercioConfigSync();
    return {
      name: config.nombre || this.config.business?.name || "",
      alias: config.alias || this.config.business?.alias || "",
      whatsapp: config.whatsapp || this.config.business?.whatsapp || "",
      whatsappDisplay: this.config.business?.whatsappDisplay || config.whatsapp || "",
      ...config
    };
  }

  getDefaultComercioConfig() {
    const business = this.config.business || {};
    return {
      nombre: business.name || "Mi Huerta",
      alias: business.alias || "mihuerta",
      whatsapp: business.whatsapp || "5491100000000",
      costo_envio: 0,
      compra_minima: 0,
      horarios: "Lunes a Sábado de 8:00 a 20:00"
    };
  }

  getComercioConfigSync() {
    const storageKey = this.storageKeys.BUSINESS_CONFIG;
    const cached = safeGet(storageKey, null);
    if (cached && typeof cached === "object") {
      return {
        ...this.getDefaultComercioConfig(),
        ...cached,
        costo_envio: Number(cached.costo_envio != null ? cached.costo_envio : 0),
        compra_minima: Number(cached.compra_minima != null ? cached.compra_minima : 0),
        horarios: typeof cached.horarios === "string" ? cached.horarios : "Lunes a Sábado de 8:00 a 20:00"
      };
    }
    return this.getDefaultComercioConfig();
  }

  async getComercioConfig() {
    if (this.isDemo() || !this.supabase) {
      return this.getComercioConfigSync();
    }
    try {
      const { data, error } = await this.supabase
        .from("comercio_config")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (!error && data) {
        const config = {
          nombre: data.nombre || "Mi Huerta",
          alias: data.alias || "mihuerta",
          whatsapp: data.whatsapp || "",
          costo_envio: Number(data.costo_envio != null ? data.costo_envio : 0),
          compra_minima: Number(data.compra_minima != null ? data.compra_minima : 0),
          horarios: data.horarios || ""
        };
        safeSet(this.storageKeys.BUSINESS_CONFIG, config);
        return config;
      }
    } catch (err) {
      console.warn("Error consultando comercio_config:", err);
    }
    return this.getComercioConfigSync();
  }

  async saveComercioConfig(draft = {}, options = {}) {
    const current = this.getComercioConfigSync();
    if (draft.costo_envio !== undefined && Number(draft.costo_envio) < 0) {
      throw new Error("El costo de envío no puede ser negativo.");
    }
    if (draft.compra_minima !== undefined && Number(draft.compra_minima) < 0) {
      throw new Error("La compra mínima no puede ser negativa.");
    }

    const cleanDraft = {
      nombre: typeof draft.nombre === "string" && draft.nombre.trim() ? draft.nombre.trim().slice(0, 120) : current.nombre,
      alias: typeof draft.alias === "string" && draft.alias.trim() ? draft.alias.trim().slice(0, 60) : current.alias,
      whatsapp: typeof draft.whatsapp === "string" ? draft.whatsapp.replace(/\D/g, "").slice(0, 25) : current.whatsapp,
      costo_envio: Math.max(0, Number(draft.costo_envio != null ? draft.costo_envio : current.costo_envio) || 0),
      compra_minima: Math.max(0, Number(draft.compra_minima != null ? draft.compra_minima : current.compra_minima) || 0),
      horarios: typeof draft.horarios === "string" ? draft.horarios.trim().slice(0, 250) : current.horarios
    };

    const storageKey = this.storageKeys.BUSINESS_CONFIG;

    if (this.isDemo()) {
      safeSet(storageKey, cleanDraft);
      this.notify("config_changed", cleanDraft);
      return { ok: true, data: cleanDraft, ...cleanDraft };
    }

    if (!this.supabase) {
      throw new Error("No se puede guardar la configuración del comercio en producción sin conexión a Supabase.");
    }

    const explicitPin = (options && typeof options.staffPin === "string" && options.staffPin.trim())
      || (typeof draft.staffPin === "string" && draft.staffPin.trim());
    const unlockedPin = this.isStaffUnlocked() ? this.getLocalSettings().staffPin : "";
    const pin = explicitPin || unlockedPin;

    if (!pin) {
      throw new Error("Se requiere el PIN de administración para guardar la configuración del comercio.");
    }

    const payload = {
      id: 1,
      ...cleanDraft,
      updated_at: new Date().toISOString()
    };

    const query = this.supabase
      .from("comercio_config")
      .upsert(payload);

    if (typeof query.setHeader === "function") {
      query.setHeader("x-nexo-staff-pin", pin);
    }

    const { data, error } = typeof query.select === "function" ? await query.select() : await query;
    if (error) {
      throw new Error(error.message || "Error al actualizar la configuración del comercio en Supabase.");
    }

    safeSet(storageKey, cleanDraft);
    this.notify("config_changed", cleanDraft);
    return { ok: true, data: cleanDraft, ...cleanDraft };
  }

  init() {
    // 0. Aplicar tema visual (Claro / Oscuro)
    this.applyTheme(this.getTheme());

    // Producción inválida: no se siembran datos ni se conecta nada.
    if (!this.config.ok) {
      return;
    }

    if (this.isDemo()) {
      if (!safeGet(this.storageKeys.BUSINESS_CONFIG, null)) {
        safeSet(this.storageKeys.BUSINESS_CONFIG, this.getDefaultComercioConfig());
      }
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

  async updateStaffPin(oldPin, newPin) {
    const cleanOld = String(oldPin || "").trim();
    const cleanNew = String(newPin || "").trim();

    if (!cleanOld) {
      throw new Error("Ingresá el PIN actual.");
    }
    if (!/^[0-9]{4,8}$/.test(cleanNew)) {
      throw new Error("El nuevo PIN debe ser numérico de 4 a 8 dígitos.");
    }
    if (cleanNew === cleanOld) {
      throw new Error("El nuevo PIN no puede ser igual al actual.");
    }

    if (this.isDemo()) {
      const { staffPin } = this.getLocalSettings();
      if (cleanOld !== staffPin) {
        throw new Error("PIN actual incorrecto");
      }
      this.saveLocalSettings({ staffPin: cleanNew });
      return { ok: true, message: "PIN actualizado con éxito" };
    }

    if (!this.supabase || typeof this.supabase.rpc !== "function") {
      throw new Error("No se puede actualizar el PIN en producción sin conexión a Supabase.");
    }

    const { data, error } = await this.supabase.rpc("update_staff_pin", {
      old_pin: cleanOld,
      new_pin: cleanNew
    });
    if (error) {
      throw new Error(error.message || "Error al actualizar el PIN.");
    }
    if (data && data.ok === false) {
      throw new Error(data.message || "Error al actualizar el PIN.");
    }
    this.saveLocalSettings({ staffPin: cleanNew });
    return data || { ok: true, message: "PIN actualizado con éxito" };
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
      if (!this.supabase) {
        const lib = await this.loadSupabaseLibrary();
        if (!lib || typeof lib.createClient !== "function") {
          throw new Error("Librería de Supabase no disponible.");
        }
        this.supabase = lib.createClient(supabaseUrl, supabaseAnonKey);
      }
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
      const { staffPin } = this.getLocalSettings();

      let clientQuery = null;
      if (isStaff) {
        const query = this.supabase.from("clientes").select("*");
        if (staffPin && typeof query.setHeader === "function") {
          query.setHeader("x-nexo-staff-pin", staffPin);
        }
        clientQuery = query;
      } else if (cleanPhone) {
        const query = this.supabase.from("clientes").select("*");
        if (typeof query.setHeader === "function") {
          query.setHeader("x-nexo-client-phone", cleanPhone);
        }
        clientQuery = query.eq("telefono", cleanPhone);
      }

      let orderQuery = null;
      if (isStaff) {
        const query = this.supabase.from("pedidos").select("*");
        if (staffPin && typeof query.setHeader === "function") {
          query.setHeader("x-nexo-staff-pin", staffPin);
        }
        orderQuery = query.order("id", { ascending: false }).limit(50);
      } else if (cleanPhone) {
        const query = this.supabase.from("pedidos").select("*");
        if (typeof query.setHeader === "function") {
          query.setHeader("x-nexo-client-phone", cleanPhone);
        }
        orderQuery = query.eq("cliente_telefono", cleanPhone).order("id", { ascending: false }).limit(20);
      } else {
        orderQuery = Promise.resolve({ data: [] });
      }

      const prodQuery = this.supabase.from("productos").select("*").order("id");

      const [prodRes, cliRes, ordRes] = await Promise.all([
        prodQuery,
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
          imagen_id: p.imagen_id || p.imagen_url || null,
          imagen_url: p.imagen_url || (p.imagen_id && (p.imagen_id.startsWith("https://") || p.imagen_id.startsWith("http://")) ? p.imagen_id : null)
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
          items: Array.isArray(o.items) ? o.items : [],
          checkout_cart_key: o.checkout_cart_key || null,
          version: o.version != null ? Number(o.version) : 1,
          tomado_por: o.tomado_por || null
        }));
        this.persistOrders(mappedOrders);
        this.notify("orders_changed");
      }

      try {
        if (typeof this.supabase?.from === "function") {
          const confRes = await this.supabase.from("comercio_config").select("*").eq("id", 1).maybeSingle();
          if (confRes && confRes.data) {
            const config = {
              nombre: confRes.data.nombre || "Mi Huerta",
              alias: confRes.data.alias || "mihuerta",
              whatsapp: confRes.data.whatsapp || "",
              costo_envio: Number(confRes.data.costo_envio != null ? confRes.data.costo_envio : 0),
              compra_minima: Number(confRes.data.compra_minima != null ? confRes.data.compra_minima : 0),
              horarios: confRes.data.horarios || ""
            };
            safeSet(this.storageKeys.BUSINESS_CONFIG, config);
            this.notify("config_changed", config);
          }
        }
      } catch {}

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
      .on("postgres_changes", { event: "*", schema: "public", table: "comercio_config" }, () => {
        this.pullFromSupabase();
      })
      .subscribe();
  }

  async syncOrderToSupabase(order) {
    if (!this.supabase || !order) return;
    try {
      const isStaff = this.isStaffUnlocked();
      const { staffPin } = this.getLocalSettings();
      const currentUser = this.getCurrentUser();
      const userPhone = currentUser?.telefono ? String(currentUser.telefono).replace(/\D/g, "") : "";
      const cleanPhone = order.cliente && order.cliente.telefono
        ? String(order.cliente.telefono).replace(/\D/g, "")
        : userPhone;

      // Garantizar que el cliente exista en Supabase antes de insertar el pedido para satisfacer la Foreign Key
      if (cleanPhone) {
        const clientQuery = this.supabase.from("clientes").upsert({
          telefono: cleanPhone,
          nombre: order.cliente?.nombre || currentUser?.nombre || "Cliente",
          direccion: order.cliente?.direccion || currentUser?.direccion || "",
          updated_at: new Date().toISOString()
        });
        if (isStaff && staffPin && typeof clientQuery.setHeader === "function") {
          clientQuery.setHeader("x-nexo-staff-pin", staffPin);
        } else if (cleanPhone && typeof clientQuery.setHeader === "function") {
          clientQuery.setHeader("x-nexo-client-phone", cleanPhone);
        }
        await clientQuery;
      }

      // En producción, creación atómica de pedido vía RPC 'create_order_atomic'
      if (order._isNew && typeof this.supabase.rpc === "function") {
        const rpcPayload = {
          p_cliente_telefono: cleanPhone || null,
          p_cliente_nombre: order.cliente?.nombre || currentUser?.nombre || "Cliente",
          p_cliente_direccion: order.cliente?.direccion || currentUser?.direccion || "",
          p_tipo_entrega: order.tipo_entrega || "RETIRO",
          p_direccion_entrega: order.direccion_entrega || (order.tipo_entrega === "DELIVERY" ? "" : "Retiro en Mostrador"),
          p_items: (order.items || []).map((i) => ({
            id: i.producto_id || i.id,
            producto_id: i.producto_id || i.id,
            cantidad: i.cantidad_solicitada ?? i.cantidad ?? 1,
            precio: i.precio_unitario ?? i.precio
          })),
          p_checkout_cart_key: order.checkout_cart_key || null
        };

        const rpcCall = this.supabase.rpc("create_order_atomic", rpcPayload);
        if (isStaff && staffPin && typeof rpcCall.setHeader === "function") {
          rpcCall.setHeader("x-nexo-staff-pin", staffPin);
        } else if (cleanPhone && typeof rpcCall.setHeader === "function") {
          rpcCall.setHeader("x-nexo-client-phone", cleanPhone);
        }

        const rpcRes = await rpcCall;
        if (rpcRes.error) {
          console.warn("Error creando pedido vía create_order_atomic:", rpcRes.error);
          this.notify("cloud_error", rpcRes.error.message);
          return;
        }

        if (rpcRes.data && rpcRes.data.pedido && rpcRes.data.pedido.id) {
          order._isNew = false;
          const dbOrder = rpcRes.data.pedido;
          const dbId = dbOrder.id;
          const oldId = order.id;
          order.id = dbId;
          order.version = dbOrder.version != null ? Number(dbOrder.version) : 1;
          if (dbOrder.total_estimado != null) order.total_estimado = Number(dbOrder.total_estimado);
          if (Array.isArray(dbOrder.items) && dbOrder.items.length) order.items = dbOrder.items;

          const currentOrders = this.getOrders();
          this.persistOrders(
            currentOrders.map((o) =>
              o.id === oldId || o.id === dbId
                ? {
                    ...o,
                    id: dbId,
                    version: order.version,
                    total_estimado: order.total_estimado,
                    items: order.items,
                    _isNew: false
                  }
                : o
            )
          );
          if (this.getActiveOrderId() === oldId) {
            this.setActiveOrderId(dbId);
          }
          this.notify("orders_changed");
          return;
        }
      }

      const orderPayload = {
        cliente_telefono: cleanPhone || null,
        cliente_nombre: order.cliente?.nombre || currentUser?.nombre || "Cliente",
        tipo_entrega: order.tipo_entrega || "RETIRO",
        direccion_entrega: order.direccion_entrega || (order.tipo_entrega === "DELIVERY" ? "" : "Retiro en Mostrador"),
        estado: order.estado || "PENDIENTE",
        total_estimado: Number(order.total_estimado || 0),
        total_real: order.total_real !== null && order.total_real !== undefined ? Number(order.total_real) : null,
        items: Array.isArray(order.items) ? order.items : [],
        checkout_cart_key: order.checkout_cart_key || null,
        version: order.version != null ? Number(order.version) : 1,
        tomado_por: order.tomado_por || null,
        fecha: order.fecha || new Date().toISOString()
      };

      if (!order._isNew && order.id) {
        orderPayload.id = order.id;
      }

      const query = order._isNew
        ? this.supabase.from("pedidos").insert(orderPayload)
        : this.supabase.from("pedidos").upsert(orderPayload);

      if (isStaff && staffPin && typeof query.setHeader === "function") {
        query.setHeader("x-nexo-staff-pin", staffPin);
      } else if (cleanPhone && typeof query.setHeader === "function") {
        query.setHeader("x-nexo-client-phone", cleanPhone);
      }

      const res = typeof query.select === "function" ? await query.select() : await query;

      if (res.error) {
        if (order._isNew && order.id) {
          const fallbackQuery = this.supabase.from("pedidos").upsert({ id: order.id, ...orderPayload });
          if (isStaff && staffPin && typeof fallbackQuery.setHeader === "function") {
            fallbackQuery.setHeader("x-nexo-staff-pin", staffPin);
          } else if (cleanPhone && typeof fallbackQuery.setHeader === "function") {
            fallbackQuery.setHeader("x-nexo-client-phone", cleanPhone);
          }
          await fallbackQuery;
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
        imagen_url: product.imagen_url || (product.imagen_id && (product.imagen_id.startsWith("https://") || product.imagen_id.startsWith("http://")) ? product.imagen_id : null),
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
    if (Object.hasOwn(draft, "imagen_url")) {
      saved.imagen_url = draft.imagen_url;
    } else if (draft.imagen_id && (draft.imagen_id.startsWith("https://") || draft.imagen_id.startsWith("http://"))) {
      saved.imagen_url = draft.imagen_id;
    } else if (previous?.imagen_url !== undefined) {
      saved.imagen_url = previous.imagen_url;
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

  getCartSummary(options = {}) {
    const cart = this.getCart();
    const items = Object.values(cart);
    const subtotal = items.reduce((sum, item) => sum + item.subtotal_estimado, 0);
    const config = this.getComercioConfigSync();
    const tipoEntrega = typeof options === "string" ? options : (options && options.tipo_entrega);
    const isDelivery = tipoEntrega === "DELIVERY";
    const costoEnvio = isDelivery ? Number(config.costo_envio || 0) : 0;
    const totalEstimado = subtotal + costoEnvio;
    const totalItems = items.length;
    const compraMinima = Number(config.compra_minima || 0);
    const cumpleMinimo = subtotal >= compraMinima;
    return {
      items,
      subtotal,
      costo_envio: costoEnvio,
      totalEstimado,
      totalItems,
      compraMinima,
      cumpleMinimo
    };
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
    const config = this.getComercioConfigSync();
    const { items, subtotal } = this.getCartSummary({ tipo_entrega });
    const orders = this.getOrders();
    const cartKey = this.checkoutCartKey();
    const accepted = orders.find((order) => order.checkout_cart_key && this.isSameCustomer(order.cliente?.telefono, cliente.telefono)
      && (order.checkout_cart_key === cartKey || items.length === 0));
    if (accepted) return this.finishCheckout(accepted);
    if (items.length === 0) return null;

    const compraMinima = Number(config.compra_minima || 0);
    if (compraMinima > 0 && subtotal < compraMinima) {
      throw new Error(`La compra mínima es de $${compraMinima.toLocaleString("es-AR")}. Tu pedido actual suma $${subtotal.toLocaleString("es-AR")}.`);
    }

    const products = this.getAdminProducts();
    if (this.catalogError) throw new Error(this.catalogError);
    for (const item of items) {
      const product = products.find((p) => p.id === item.producto_id);
      if (!product || product.archivado || !product.disponible) throw new Error(`Revisá el carrito: ${item.nombre} está pausado, archivado o no disponible. Quitalo antes de confirmar.`);
      this.assertCurrentCartProduct(product, item);
      const steps = item.cantidad / product.paso;
      if (!Number.isFinite(item.cantidad) || item.cantidad <= 0 || Math.abs(steps - Math.round(steps)) > 1e-7 || (product.unidad_medida === "UNIDAD" && !Number.isInteger(item.cantidad))) throw new Error(`Revisá la cantidad de ${item.nombre}: no coincide con el paso permitido.`);
    }

    const costoEnvio = tipo_entrega === "DELIVERY" ? Number(config.costo_envio || 0) : 0;
    const totalEstimado = subtotal + costoEnvio;

    const newId = orders.length > 0 ? Math.max(...orders.map((o) => o.id)) + 1 : 101;
    const newOrder = {
      id: newId, cliente, tipo_entrega,
      direccion_entrega: tipo_entrega === "DELIVERY" ? direccion_entrega : "Retiro en Mostrador",
      estado: "PENDIENTE", fecha: new Date().toISOString(),
      total_estimado: totalEstimado, total_real: null, checkout_cart_key: cartKey,
      version: 1,
      tomado_por: null,
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

  async takeOrder(orderId, operatorName, expectedVersion) {
    const id = Number(orderId);
    if (!Number.isFinite(id)) throw new Error("ID de pedido no válido.");
    const operator = String(operatorName || "Operador").trim() || "Operador";
    const expected = expectedVersion != null ? Number(expectedVersion) : 1;

    if (this.isDemo()) {
      const orders = this.getOrders();
      const order = orders.find((o) => o.id === id);
      if (!order) throw new Error("Pedido no encontrado.");
      const currentVersion = Number(order.version ?? 1);
      if (currentVersion !== expected) {
        throw new Error("El pedido ya fue tomado por otro operario o fue modificado.");
      }
      if (order.estado !== "PENDIENTE" && order.estado !== "EN_PREPARACION") {
        throw new Error("El pedido ya fue finalizado o cancelado.");
      }

      const updatedOrder = {
        ...order,
        estado: "EN_PREPARACION",
        tomado_por: operator,
        version: currentVersion + 1,
        updated_at: new Date().toISOString()
      };
      this.persistOrders(orders.map((o) => (o.id === id ? updatedOrder : o)));
      this.notify("orders_changed");
      return updatedOrder;
    }

    if (!this.supabase) {
      throw new Error("No hay conexión con Supabase en modo producción.");
    }

    const { staffPin } = this.getLocalSettings();
    const query = this.supabase
      .from("pedidos")
      .update({
        estado: "EN_PREPARACION",
        tomado_por: operator,
        version: expected + 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("version", expected);

    if (staffPin && typeof query.setHeader === "function") {
      query.setHeader("x-nexo-staff-pin", staffPin);
    }

    const res = typeof query.select === "function" ? await query.select() : await query;
    if (res.error) {
      throw new Error(res.error.message || "Error al tomar el pedido.");
    }

    const updatedRows = Array.isArray(res.data) ? res.data : [];
    if (updatedRows.length === 0) {
      throw new Error("El pedido ya fue tomado por otro operario o fue modificado.");
    }

    const updatedDbOrder = updatedRows[0];
    const currentOrders = this.getOrders();
    const updatedLocalOrders = currentOrders.map((o) => {
      if (o.id === id) {
        return {
          ...o,
          estado: "EN_PREPARACION",
          tomado_por: operator,
          version: expected + 1,
          updated_at: updatedDbOrder.updated_at || new Date().toISOString()
        };
      }
      return o;
    });
    this.persistOrders(updatedLocalOrders);
    this.notify("orders_changed");
    return updatedDbOrder;
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
      const query = this.supabase.from("pedidos").update({
        estado: "CANCELADO",
        cancelado_at: new Date().toISOString()
      });

      const isStaff = this.isStaffUnlocked();
      const { staffPin } = this.getLocalSettings();
      const currentUser = this.getCurrentUser();
      const cleanPhone = currentUser?.telefono ? String(currentUser.telefono).replace(/\D/g, "") : "";

      if (isStaff && staffPin && typeof query.setHeader === "function") {
        query.setHeader("x-nexo-staff-pin", staffPin);
      } else if (cleanPhone && typeof query.setHeader === "function") {
        query.setHeader("x-nexo-client-phone", cleanPhone);
      }

      query.eq("id", orderId).then(() => {});
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

export const store = new Store();
export { Store, STORAGE_KEYS, safeGet, safeSet, safeRemove };
