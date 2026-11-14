import { store } from "../store.js";
import { DEMO_QUICK_CUSTOMER } from "../demo-data.js";
import { escapeHtml } from "../html.js";
import { createScopedImageLoader } from "../images.js";

export function renderClientView(container) {
  let selectedCategory = "Todos";
  let searchQuery = "";
  let isCartOpen = false;
  let isDrawerFirstOpen = true;
  let viewMode = "catalog"; // "catalog" | "orders" | "order_detail"
  let selectedOrderId = null;
  let deliveryMode = "RETIRO"; // RETIRO | DELIVERY
  let deliveryAddress = "";
  let checkoutError = "";
  let checkoutStatus = store.getPendingCheckout()?.status === "unknown"
    ? { status: "unknown", error: "Hay un envío anterior pendiente de verificación. Reintentá para confirmar sin duplicar tu pedido." }
    : null;
  let isSubmittingCheckout = false;
  let catalogRecoveryError = "";
  let trackingLookupError = "";
  let lastTrackingHashAttempt = "";

  let catalogScrollBeforeCart = 0;

  // Restaurar pedido activo al iniciar (garantía de recibo accesible tras recarga)
  const initialUser = store.getCurrentUser();
  const initialActive = initialUser ? store.getActiveOrder(initialUser.telefono) : null;
  if (initialActive && initialActive.estado !== "ENTREGADO" && initialActive.estado !== "CANCELADO") {
    viewMode = "order_detail";
    selectedOrderId = initialActive.id;
  }

  function maybeResolveHashTracking() {
    const hash = typeof window !== "undefined" ? String(window.location.hash || "") : "";
    if (!hash.startsWith("#track=")) return false;
    if (hash !== lastTrackingHashAttempt) {
      lastTrackingHashAttempt = hash;
      trackingLookupError = "";
      viewMode = "order_detail";
      const parsed = store.parseTrackingHash(hash);
      if (parsed) selectedOrderId = parsed.orderId;
      store.resolvePrivateTrackingLink(hash).then((res) => {
        if (res?.ok && res.order) {
          selectedOrderId = res.order.id;
          trackingLookupError = "";
        } else {
          selectedOrderId = null;
          trackingLookupError = res?.error || "Pedido no disponible o enlace revocado.";
        }
        update();
      });
    }
    return true;
  }

  const imageLoader = createScopedImageLoader();
  let renderedUserKey = initialUser?.telefono ? String(initialUser.telefono).replace(/\D/g, "") : null;

  function update() {
    imageLoader.revokeAll();
    const isTrackingHash = maybeResolveHashTracking();
    const user = store.getCurrentUser();
    const userKey = user?.telefono ? String(user.telefono).replace(/\D/g, "") : null;
    if (!isTrackingHash && (!user || userKey !== renderedUserKey)) {
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

    if (isTrackingHash || viewMode === "order_detail") {
      if (trackingLookupError) {
        renderOrderNotFound(trackingLookupError);
        return;
      }
      const order = store.getOrders().find(o => o.id === selectedOrderId);
      const hasTokenAccess = order && Boolean(store.getTrackingTokenForOrder(order.id));
      const hasPhoneAccess = order && user && store.isSameCustomer(order.cliente?.telefono, user.telefono);
      if (order && (hasTokenAccess || hasPhoneAccess)) {
        renderOrderTracking(order);
        return;
      }
      if (isTrackingHash) {
        renderOrderNotFound("Verificando enlace de seguimiento...");
        return;
      }
      if (!user) {
        renderPhoneGate();
        return;
      }
      renderOrderNotFound();
      return;
    }

    if (!user) {
      renderPhoneGate();
      return;
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
              <label for="phone-input" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
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
              <p id="phone-error" role="alert" aria-live="assertive" class="hidden text-xs text-rose-500 dark:text-rose-400 font-semibold mt-1.5">
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
                <p id="name-error" role="alert" aria-live="assertive" class="hidden text-xs text-rose-500 dark:text-rose-400 font-semibold mt-1.5">
                  Por favor ingresá tu nombre para que podamos identificar tu pedido.
                </p>
              </div>

              <div>
                <label for="address-input" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
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

      if (!user) {
        if (phoneError) {
          phoneError.textContent = "Ingresá un número de WhatsApp válido con código de área (ej: 1100000001).";
          phoneError.classList.remove("hidden");
        }
        phoneInput?.classList.add("border-rose-500", "focus:ring-rose-500");
        phoneInput?.focus();
        return;
      }

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
    const syncError = store.getSyncError();
    const storageWarning = store.getStorageWarning();
    const cartIssues = store.getCartAvailabilityIssues();
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
        ${syncError ? `<p id="client-sync-error" role="alert" class="m-4 p-3 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 text-sm font-medium">${escapeHtml(syncError)}</p>` : ""}
        ${storageWarning ? `<p role="alert" class="m-4 p-3 rounded-xl bg-amber-50 text-amber-950 text-sm">${escapeHtml(storageWarning)}</p>` : ""}
        ${cartIssues.length > 0 && !isCartOpen ? `<p role="alert" class="m-4 p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 text-sm font-medium">${escapeHtml(cartIssues[0].message)} Abrí tu pedido para revisarlo.</p>` : ""}
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
              aria-label="Buscar productos"
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
                aria-label="Agregar ${escapeHtml(product.nombre)} al pedido"
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
                  title="Restar ${escapeHtml(product.nombre)}"
                  aria-label="Restar ${escapeHtml(product.nombre)}"
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
                  title="Sumar ${escapeHtml(product.nombre)}"
                  aria-label="Sumar ${escapeHtml(product.nombre)}"
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
    const cartIssues = store.getCartAvailabilityIssues();
    const hasSyncErr = Boolean(store.getSyncError());
    const statusBox = checkoutStatus && checkoutStatus.status === "unknown"
      ? `<div id="checkout-status-banner" data-checkout-status="unknown" role="alert" class="p-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 text-xs font-medium">${escapeHtml(checkoutStatus.error)}</div>`
      : checkoutStatus && checkoutStatus.status === "failed"
      ? `<div id="checkout-status-banner" data-checkout-status="failed" role="alert" class="p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 text-xs font-medium">${escapeHtml(checkoutStatus.error)}</div>`
      : "";
    const confirmLabel = isSubmittingCheckout
      ? "Enviando al comercio..."
      : checkoutStatus?.status === "unknown"
      ? "Reintentar verificación (sin duplicar)"
      : "Confirmar Pedido";
    const blockConfirm = isSubmittingCheckout || cartIssues.length > 0 || hasSyncErr;

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
          ${cartIssues.length > 0 ? `<div id="cart-availability-warning" role="alert" class="m-4 p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 text-xs font-semibold">${escapeHtml(cartIssues.map(i => i.message).join(" "))} Quitá los ítems afectados antes de confirmar.</div>` : ""}

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
                <label for="delivery-address-input" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
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
            ${statusBox}
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
                ${blockConfirm ? "disabled" : ""}
                class="w-full min-h-[50px] bg-slate-950 hover:bg-slate-900 active:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-950/20 text-sm transition tap-feedback flex items-center justify-center gap-2 touch-target"
              >
                <span>${confirmLabel}</span>
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
      sheet.style.animation = "none";
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
    btnConfirm?.addEventListener("click", async () => {
      if (isSubmittingCheckout) return;
      const { items } = store.getCartSummary();
      if (items.length === 0) {
        closeCartModal();
        return;
      }

      const mode = deliveryMode;
      const finalAddress = mode === "DELIVERY" ? deliveryAddress.trim() : "Retiro en Mostrador";

      if (mode === "DELIVERY" && !finalAddress) {
        checkoutStatus = { status: "failed", error: "Ingresá tu dirección para coordinar el envío a domicilio." };
        renderCatalog();
        container.querySelector("#delivery-address-input")?.focus();
        return;
      }

      if (navigator.vibrate) { try { navigator.vibrate(30); } catch {} }

      isSubmittingCheckout = true;
      checkoutError = "";
      checkoutStatus = null;
      btnConfirm.disabled = true;

      try {
        const result = await store.submitOrder({ cliente: user, tipo_entrega: mode, direccion_entrega: finalAddress });
        isSubmittingCheckout = false;
        if (result?.ok && result.order) {
          isCartOpen = false;
          isDrawerFirstOpen = true;
          checkoutStatus = null;
          document.getElementById("nexo-top-stack")?.removeAttribute("inert");
          document.body.style.overflow = "";
          selectedOrderId = result.order.id;
          viewMode = "order_detail";
          update();
          return;
        }
        checkoutStatus = {
          status: result?.status === "unknown" ? "unknown" : "failed",
          error: result?.error || "No se pudo confirmar el pedido. Reintentá."
        };
        renderCatalog();
      } catch (error) {
        isSubmittingCheckout = false;
        checkoutStatus = {
          status: "failed",
          error: error.message || "No se pudo guardar el pedido. Reintentá."
        };
        renderCatalog();
      } finally {
        isSubmittingCheckout = false;
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

  function renderOrderNotFound(customMessage = null) {
    container.innerHTML = `
      <div class="max-w-md mx-auto p-4 pt-12 text-center">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <h2 class="text-lg font-black text-slate-900 dark:text-white">Pedido no disponible</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            ${escapeHtml(customMessage || "El pedido solicitado no existe, fue revocado o ya no está disponible en este dispositivo.")}
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
      trackingLookupError = "";
      viewMode = "orders";
      update();
    });
    container.querySelector("#btn-not-found-catalog")?.addEventListener("click", () => {
      trackingLookupError = "";
      lastTrackingHashAttempt = "";
      if (String(window.location.hash || "").startsWith("#track=")) window.location.hash = "client";
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

          ${(() => {
            const trackFragment = store.getTrackingLink(currentOrder.id);
            if (!trackFragment) return "";
            return `
              <div id="private-tracking-box" class="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Enlace privado de seguimiento</span>
                <p class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">Guardá este enlace privado (el token viaja sólo en el fragmento <code class="font-mono">#track=</code> y no se consulta historial remoto por teléfono si lo perdés):</p>
                <a id="private-tracking-link" href="${escapeHtml(trackFragment)}" class="block text-[11px] font-mono text-emerald-700 dark:text-emerald-400 break-all underline">${escapeHtml(trackFragment)}</a>
              </div>
            `;
          })()}

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
      trackingLookupError = "";
      lastTrackingHashAttempt = "";
      if (String(window.location.hash || "").startsWith("#track=")) window.location.hash = "client";
      viewMode = "catalog";
      update();
    });

    container.querySelector("#btn-back-to-orders")?.addEventListener("click", () => {
      trackingLookupError = "";
      lastTrackingHashAttempt = "";
      if (String(window.location.hash || "").startsWith("#track=")) window.location.hash = "client";
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
      trackingLookupError = "";
      lastTrackingHashAttempt = "";
      if (String(window.location.hash || "").startsWith("#track=")) window.location.hash = "client";
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
      event === "user_changed" ||
      event === "sync_error" ||
      event === "catalog_error" ||
      event === "pending_checkout_changed"
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
