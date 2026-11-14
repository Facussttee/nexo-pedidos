import { store } from "./store.js";
import { escapeHtml } from "./html.js";
import { renderClientView } from "./views/client.js";
import { renderOperatorView } from "./views/operator.js";
import { renderAdminView } from "./views/admin.js";

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
      this.btnLockPin.addEventListener("click", async () => {
        await store.logoutStaff();
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

    // Actualización reactiva de etiquetas de tema y bloqueos de sesión de personal
    store.subscribe((event) => {
      if (event === "theme_changed") {
        const isDark = store.getTheme() === "dark";
        document.querySelectorAll(".theme-label").forEach((el) => {
          el.textContent = isDark ? "Oscuro" : "Claro";
        });
      }
      if (event === "staff_locked" && ["operator", "admin"].includes(this.currentView)) {
        this.navigate(this.currentView);
      }
    });

    const initialHash = String(window.location.hash || "");
    const initialView = initialHash.startsWith("#track=")
      ? "client"
      : urlParams.get("view") || initialHash.replace("#", "") || "client";
    this.navigate(initialView, { preserveHash: initialHash.startsWith("#track=") });

    // Reaccionar a cambios manuales del hash (#operador, #admin, #track=...) sin recargar
    window.addEventListener("hashchange", () => {
      const h = String(window.location.hash || "");
      if (h.startsWith("#track=")) {
        this.navigate("client", { preserveHash: true });
        return;
      }
      const target = this.normalizeView(h.replace("#", ""));
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
    if (!store.isDemo()) {
      return this.renderStaffAuthGate(targetView);
    }
    const isOperario = targetView === "operator" || targetView === "operario";
    const roleLabel = isOperario ? "Puesto de Preparación (Operario)" : "Catálogo y Precios (Dueño)";
    this.container.innerHTML = `
      <div class="max-w-sm mx-auto p-4 pt-16">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
          <div class="flex items-center justify-between mb-3">
            <span class="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Acceso Personal del Local (Demo)
            </span>
          </div>
          <h2 class="text-xl font-black text-slate-900 dark:text-white">${roleLabel}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">Ingresá el PIN numérico de demostración del comercio (Demo: <strong>1234</strong>)</p>

          <form id="pin-gate-form" class="space-y-4">
            <label for="pin-input" class="sr-only">PIN del comercio</label>
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
            <p id="pin-error" role="alert" class="hidden text-xs font-bold text-rose-600 dark:text-rose-400">PIN incorrecto. Intentá nuevamente.</p>
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

  renderStaffAuthGate(targetView) {
    const isOperario = targetView === "operator" || targetView === "operario";
    const roleLabel = isOperario ? "Puesto de Preparación (Operario)" : "Catálogo y Precios (Dueño)";
    this.container.innerHTML = `
      <div class="max-w-sm mx-auto p-4 pt-12">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
          <span class="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 mb-3">
            Acceso Personal Autorizado
          </span>
          <h2 class="text-xl font-black text-slate-900 dark:text-white">${roleLabel}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">Iniciá sesión con tu cuenta individual habilitada por el comercio. Sin registro público.</p>

          <form id="staff-auth-form" class="space-y-4">
            <div>
              <label for="staff-email-input" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Correo de personal</label>
              <input
                type="email"
                id="staff-email-input"
                autocomplete="username"
                required
                placeholder="operario@comercio.local"
                class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-base text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 transition"
              />
            </div>
            <div>
              <label for="staff-password-input" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Contraseña</label>
              <input
                type="password"
                id="staff-password-input"
                autocomplete="current-password"
                required
                placeholder="••••••••"
                class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-base text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 transition"
              />
            </div>
            <p id="staff-auth-error" role="alert" class="hidden text-xs font-bold text-rose-600 dark:text-rose-400"></p>
            <div class="flex gap-2 pt-1">
              <button
                type="button"
                id="btn-staff-auth-back"
                class="flex-1 min-h-[48px] py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition touch-target"
              >
                Volver al Catálogo
              </button>
              <button
                type="submit"
                id="btn-staff-auth-submit"
                class="flex-1 min-h-[48px] py-3 bg-slate-950 hover:bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md touch-target"
              >
                Iniciar Sesión
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const emailInput = this.container.querySelector("#staff-email-input");
    const passwordInput = this.container.querySelector("#staff-password-input");
    const form = this.container.querySelector("#staff-auth-form");
    const errorEl = this.container.querySelector("#staff-auth-error");
    const submitBtn = this.container.querySelector("#btn-staff-auth-submit");
    const btnBack = this.container.querySelector("#btn-staff-auth-back");

    if (emailInput) emailInput.focus();
    if (btnBack) btnBack.addEventListener("click", () => this.navigate("client"));

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (errorEl) {
          errorEl.textContent = "";
          errorEl.classList.add("hidden");
        }
        if (submitBtn) submitBtn.disabled = true;
        try {
          await store.signInStaff(emailInput?.value || "", passwordInput?.value || "");
          this.navigate(targetView);
        } catch (err) {
          if (errorEl) {
            errorEl.textContent = String(err?.message || "No se pudo iniciar sesión.");
            errorEl.classList.remove("hidden");
          }
          if (passwordInput) passwordInput.value = "";
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
  }

  renderForbiddenStaffGate(targetView) {
    const role = store.getStaffRole();
    this.container.innerHTML = `
      <div class="max-w-sm mx-auto p-4 pt-12">
        <div id="staff-forbidden-card" role="alert" class="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-amber-300 dark:border-amber-800 shadow-xl space-y-4 text-center">
          <span class="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300">
            Permisos insuficientes
          </span>
          <h2 class="text-xl font-black text-slate-900 dark:text-white">Acceso restringido al dueño</h2>
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Tu sesión actual tiene rol <strong>${escapeHtml(role || "sin rol")}</strong> y no puede administrar <strong>${escapeHtml(targetView)}</strong>.
          </p>
          <div class="flex gap-2">
            ${role === "operator" ? `<button id="btn-go-operator" class="flex-1 min-h-[48px] py-3 bg-slate-950 dark:bg-emerald-600 text-white font-bold rounded-xl text-xs touch-target">Ir a Preparación</button>` : ""}
            <button id="btn-forbidden-logout" class="flex-1 min-h-[48px] py-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs touch-target">Cerrar Sesión</button>
          </div>
        </div>
      </div>
    `;
    this.container.querySelector("#btn-go-operator")?.addEventListener("click", () => this.navigate("operator"));
    this.container.querySelector("#btn-forbidden-logout")?.addEventListener("click", async () => {
      await store.logoutStaff();
      this.navigate("client");
    });
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

  navigate(viewName, { preserveHash = false } = {}) {
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
    if (!preserveHash && !(viewName === "client" && String(window.location.hash || "").startsWith("#track="))) {
      window.location.hash = viewName;
    }

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

    const isStaffView = ["operator", "operario", "admin", "dueno"].includes(viewName);
    if (isStaffView) {
      if (!store.isStaffUnlocked()) {
        if (store.isDemo()) this.renderPinGate(viewName);
        else this.renderStaffAuthGate(viewName);
        return;
      }
      if (!store.canAccessStaffView(viewName)) {
        this.renderForbiddenStaffGate(viewName);
        return;
      }
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

document.addEventListener("DOMContentLoaded", () => {
  new App();
});
