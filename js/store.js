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
        this.persistOrders(mappedOrders);
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
      if (typeof product.imagen_id !== "string" || !product.imagen_id.trim() || product.imagen_id.length > 100) throw new Error("El identificador de imagen no es válido.");
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
    this.requireDemo();
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
    return saved;
  }

  archiveProduct(id, archived = true) {
    this.requireDemo();
    const products = this.getAdminProducts();
    if (this.catalogError) throw new Error(this.catalogError);
    const product = products.find((p) => p.id === id);
    if (!product || typeof archived !== "boolean") throw new Error("No se encontró el producto o el estado de archivo no es válido.");
    const saved = { ...product, archivado: archived };
    writeCritical(this.storageKeys.PRODUCTS, products.map((p) => p.id === id ? saved : p));
    this.notify("products_changed");
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
    if (!this.isDemo()) throw new Error("La confirmación de pedidos reales requiere el servidor; esta entrega sólo permite demo.");
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
