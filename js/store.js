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

    // En demo se bloquea toda salida de red antes de cualquier otra cosa.
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

export const store = new Store();
export { Store, STORAGE_KEYS, safeGet, safeSet, safeRemove };
