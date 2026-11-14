import { store } from "../store.js";
import { escapeHtml } from "../html.js";
import { putImage, getImage, deleteImage, processProductImageFile, createScopedImageLoader } from "../images.js";

export function renderAdminView(container) {
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
              <span class="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300">${store.isDemo() ? "Demo local" : store.isCloudConnected() ? "Conectado (Dueño)" : "Sin conexión"}</span>
              ${store.isDemo() ? `<button id="btn-toggle-cloud" class="${buttonClass}">${showCloudSettings ? "Cerrar PIN" : "Config PIN"}</button>` : ""}
              <button id="btn-admin-logout" class="${buttonClass}">Salir</button>
            </div>
          </div>
          ${store.isDemo() && showCloudSettings ? `<form id="cloud-config-form" class="mt-3 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 space-y-2">
            <label for="cfg-pin" class="block text-xs font-bold text-slate-700 dark:text-slate-200">PIN del negocio</label>
            <input id="cfg-pin" type="password" inputmode="numeric" maxlength="8" value="${escapeHtml(localSettings.staffPin || "")}" class="${inputClass}" />
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
          await store.saveProductAsync(productPayload, targetId);
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
    container.querySelector("#btn-admin-logout")?.addEventListener("click", async () => {
      await store.logoutStaff();
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
      input.addEventListener("change", async () => {
        try {
          if (input.value.trim() === "") throw new Error("Ingresá un precio. Puede ser cero.");
          const product = store.getAdminProducts().find(p => p.id === input.dataset.productId);
          if (!product) throw new Error("No se encontró el producto.");
          await store.saveProductAsync({ ...product, precio: Number(input.value) }, input.dataset.productId);
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
