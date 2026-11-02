import { store } from "../store.js";

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

export function renderOperatorView(container) {
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
