import { store } from "../store.js";
import { CATEGORIAS } from "../products-data.js";

export function renderAdminView(container) {
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
