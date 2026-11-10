import { store } from "../store.js";
import { escapeHtml } from "../html.js";

function parseOperatorWeight(rawInput, isWeight = true) {
  const str = String(rawInput ?? "").trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(str)) return null;
  const value = Number(str);
  if (!Number.isFinite(value) || value <= 0 || (!isWeight && !Number.isInteger(value))) return null;
  return value;
}

export function renderOperatorView(container) {
  let activeTab = "PENDIENTE"; // PENDIENTE | EN_PREPARACION | LISTO | ENTREGADO
  let editingOrderId = null; // ID del pedido que se está editando en modal
  let actionError = "";
  let addingProductOrderId = null; // ID del pedido que tiene abierto el desplegable de agregar ítem

  function update() {
    container.innerHTML = "";
    const orders = store.getOrders();

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
          <p id="operator-error" role="alert" class="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-sm ${actionError ? "" : "hidden"}">${escapeHtml(actionError)}</p>
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
                .map((i) => `${i.cantidad_solicitada}${i.unidad_medida === "KG" ? "kg" : "u"} ${escapeHtml(i.nombre)}`)
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
                    <h3 class="font-extrabold text-slate-900 dark:text-white text-sm mt-1.5">${escapeHtml(order.cliente.nombre)}</h3>
                    <p class="text-xs text-slate-400 dark:text-slate-500">${escapeHtml(order.cliente.telefono)} · ${timeAgo(order.fecha)}</p>
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
                    <span>Comenzar preparación</span>
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
                <strong class="block text-base text-slate-900 dark:text-white">$${order.total_estimado.toLocaleString("es-AR")}</strong>
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
                    <p class="text-xs text-slate-500 dark:text-slate-400">Solicitó ${escapeHtml(item.cantidad_solicitada)} ${isWeight ? "kg" : "u."} · $${item.precio_unitario.toLocaleString("es-AR")}/${isWeight ? "kg" : "u"}</p>
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
                    <h3 class="text-base font-black text-slate-900 dark:text-white mt-1">#${order.id} · ${escapeHtml(order.cliente.nombre)}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(order.cliente.telefono)} · ${order.tipo_entrega === "DELIVERY" ? "Envío" : "Retiro"}</p>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-wider">${order.total_real == null ? "Estimado · final no registrado" : "Total final"}</span>
                    <span class="font-black text-2xl text-emerald-700 dark:text-emerald-400">$${(order.total_real ?? order.total_estimado).toLocaleString("es-AR")}</span>
                  </div>
                </div>

                <!-- Vista previa del mensaje de WhatsApp -->
                <div class="mt-3 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-line leading-relaxed">
                  ${escapeHtml(waSummary)}
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
                <h4 class="font-extrabold text-slate-900 dark:text-white text-sm">${escapeHtml(order.cliente.nombre)}</h4>
                <p class="text-xs text-slate-400 dark:text-slate-500">${order.tipo_entrega === "DELIVERY" ? "Envío" : "Retiro"} · ${timeAgo(order.fecha)}</p>
              </div>
              <div class="text-right">
                <span class="font-black text-base text-slate-900 dark:text-white">$${(order.total_real ?? order.total_estimado).toLocaleString("es-AR")}</span>
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
              <h3 class="font-black text-base text-slate-900 dark:text-white">Pedido #${order.id}</h3>
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
