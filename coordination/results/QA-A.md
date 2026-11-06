# Informe de Entrega: QA-A — Diagnóstico y Scroll

**Fecha:** 2 de noviembre de 2026
**Worktree:** `D:\Escritorio\nexo-pedidos-worktrees\quality`
**Rama:** `codex/quality-navigation`
**Base:** `47c05b3`
**Ejecutor:** Antigravity (Gemini 3.8 Flash Medium)
**Configuración de Equipo:** Teamwork acotado a 1 escritor de UI (`css/style.css`, tests, bugs, docs) y 1 subagente auditor de seguridad de sólo lectura (`research` subagent sobre Gemini 3.8 Flash Medium). Un único escritor en el worktree; auditoría de seguridad devuelta por texto e integrada por el escritor sin contención de archivos.
**Estado:** RESUELTO POR EJECUTOR / PENDIENTE DE REVISIÓN INDEPENDIENTE CODEX (Sin bot productivo, sin llamadas de red a Supabase, sin cambios en MiHuerta, sin push, sin deploy).

---

## 1. Resumen de Ejecución y Solución del Scroll (BUG-001)

### 1.1 Diagnóstico de Causa Raíz
El síntoma reportado por los usuarios (imposibilidad de hacer scroll en catálogo, carrito y vistas en navegador de escritorio y tablets) fue investigado y reproducido de forma idéntica a la evidencia de coordinación (`BASELINE_SCROLL.json` vs `SCROLL_EXPERIMENT.json`):
1. La regla CSS heredada `html, body { max-width: 100vw; overflow-x: hidden; position: relative; }` forzaba la promoción de `overflow-y` a `auto` tanto en `html` como en `body` según el estándar W3C CSS Overflow Level 3.
2. Esta configuración generó un doble contenedor de scroll interno que desacopló el viewport nativo (`window`), eliminó el scroll por inercia en Blink y anuló la propagación del evento físico de rueda (`wheel`).
3. La propiedad `overscroll-behavior-y: none;` en `body` restringía el rebote elástico en bordes; se removió del body para evitar rigidez en bordes.
4. Una aserción estricta de regex en `tests/test-adversarial-r1.cjs` forzaba artificialmente la permanencia del bug.

### 1.2 Corrección Implementada
1. En `css/style.css`:
   - `html`: configurado con `max-width: 100vw; overflow-x: clip; overflow-y: auto; position: relative;`.
   - `body`: configurado con `max-width: 100vw; overflow-x: clip; overflow-y: visible; position: relative;`.
   - Se removió `overscroll-behavior-y: none;` del cuerpo.
   - Se preservó el scroll horizontal táctil nativo en las píldoras de categorías (`.category-pill`, `.admin-cat-pill`) sin imponer `touch-action: pan-y`.
2. En `tests/test-adversarial-r1.cjs`:
   - Se actualizó la aserción de guarda de desbordamiento (autorizado explícitamente en el requerimiento) para aceptar la versión moderna no bloqueante `overflow-x: clip` o `hidden`.

---

## 2. Nueva Suite de Regresión en Navegador Chromium / Brave

Se implementó la suite automatizada `tests/test-navigation-scroll.test.mjs`, ejecutada sobre el servidor demo local aislado (`bot/serve-demo.js`) interactuando con Chromium (Brave headless) mediante Playwright con viewports emulados y eventos de rueda (`mouse.wheel`):

*Nota metodológica:* Las pruebas demuestran desplazamiento físico efectivo por evento de rueda de ratón en Chromium emulado; no se atribuyen a hardware físico de iPad ni trackpads reales.

| Suite / Viewport | Prueba Realizada | Desplazamiento Observado | Resultado |
|---|---|---|---|
| **Desktop (1366x768)** | Wheel scroll 800px hacia abajo | `y=21` -> `y=821` (+800px) | **PASS** |
| **Desktop (1366x768)** | Wheel scroll 800px hacia arriba | `y=821` -> `y=21` | **PASS** |
| **Tablet Portrait (768x1024 emul.)** | Wheel scroll 800px hacia abajo | `y=0` -> `y=800` (+800px) | **PASS** |
| **Tablet Portrait (768x1024 emul.)** | Wheel scroll 800px hacia arriba | `y=800` -> `y=0` | **PASS** |
| **Tablet Landscape (1024x768 emul.)** | Wheel scroll 800px hacia abajo | `y=21` -> `y=821` (+800px) | **PASS** |
| **Tablet Landscape (1024x768 emul.)** | Wheel scroll 800px hacia arriba | `y=821` -> `y=21` | **PASS** |
| **Mobile (390x844 emul.)** | Wheel scroll 800px hacia abajo | `y=0` -> `y=800` (+800px) | **PASS** |
| **Mobile (390x844 emul.)** | Wheel scroll 800px hacia arriba | `y=800` -> `y=0` | **PASS** |
| **Mobile (390x844 emul.)** | Apertura y visibilidad del drawer de Carrito | Drawer `#cart-drawer-sheet` visible | **PASS** |
| **Mobile (390x844 emul.)** | Selector de Entrega / Dirección | Toggle muestra `#delivery-address-input` | **PASS** |
| **Mobile (390x844 emul.)** | Desborde real en lista de ítems de Carrito | `scrollHeight: 1005px > clientHeight: 469px` | **PASS** |
| **Mobile (390x844 emul.)** | Desplazamiento `scrollTop` por rueda en Carrito | `scrollTop` se desplazó de `0` a `536px` | **PASS** |
| **Mobile (390x844 emul.)** | Cierre de Carrito y restauración de Catálogo | Catálogo scrollea con rueda tras cierre (`y=0` -> `y=500`) | **PASS** |
| **Tablet Landscape (1024x768 emul.)** | Vista Operario post-PIN | Autenticación con `1234`, montado con `#btn-operator-logout` y `[data-tab="PENDIENTE"]` | **PASS** |
| **Tablet Landscape (1024x768 emul.)** | Vista Precios post-PIN | Autenticación con `1234`, montado con `Precios y Catálogo` y `.admin-cat-pill` | **PASS** |
| **Tablet Landscape (1024x768 emul.)** | Scroll rueda en tabla de productos Precios | `scrollHeight: 3066px > 768px`, desplazamiento verificado (+400px) | **PASS** |

**Resultado total de la nueva suite:** **26 de 26 pruebas aprobadas (0 fallos).**

---

## 3. Matriz de Suites Existentes de Regresión

Todas las suites históricas y de regresión del repositorio fueron ejecutadas y verificadas:

| Comando | Tests / Aserciones | Salida / Estado |
|---|---|---|
| `node tests/test-navigation-scroll.test.mjs` | 26 / 26 | **PASS** (0 fallos) |
| `node tests/test-demo-isolation.test.mjs` | 17 / 17 | **PASS** (0 fallos) |
| `node tests/test-static-server.test.mjs` | 24 / 24 | **PASS** (0 fallos) |
| `node bot/test-store-state.js` | 71 / 71 | **PASS** (0 fallos) |
| `node tests/test-phone-numeric-validation.test.mjs` | 18 / 18 | **PASS** (0 fallos) |
| `node tests/test-iphone-13-pro-layout.test.mjs` | 10 / 10 | **PASS** (0 fallos) |
| `node tests/test-adversarial-r1.cjs` | 112 / 112 | **PASS** (0 fallos) |
| `powershell -ExecutionPolicy Bypass -File .\build-bundle.ps1` | Build exitoso | **UTF-8 estricto sin BOM** |
| `node --check js/bundle.js` | Sintaxis JS | **Exit 0** |
| `node scripts/build-public.mjs` | Confinamiento public | **dist/public generado limpiamente** |

---

## 4. Entregables Generados

1. **`coordination/bugs/BUG-001.md`:** Registro técnico exhaustivo de la causa raíz W3C, baseline y resolución.
2. **`coordination/results/QA-SECURITY-DIAG.md`:** Auditoría estática que distingue la deuda técnica heredada (XSS en `.innerHTML`, riesgo estático condicionado en `schema.sql` Supabase, descarga masiva de PII en `select * from pedidos`) del blindaje logrado en Nexo Pedidos (servidor estático seguro, aislamiento de demo).
3. **`docs/UX_COMPARISON.md`:** Relevamiento comparativo frente a MiHuerta, causas de la percepción de pobreza de interfaz, propuesta de arquitectura para modalidades unitaria / pesable / mixta, diseño de CRUD de catálogo y relevamiento preliminar de importador.
4. **`tests/test-navigation-scroll.test.mjs`:** Suite de pruebas automatizadas con navegador real Chromium/Brave y Playwright que valida el desplazamiento físico por rueda y desborde en las resoluciones de referencia.
5. **`css/style.css`:** Solución quirúrgica del viewport scroll (`clip` + `overflow-y`).
6. **`tests/test-adversarial-r1.cjs`:** Actualización justificada de la aserción de desbordamiento horizontal.

---

## 5. Próximos Pasos (Codex Review)
El worktree `D:\Escritorio\nexo-pedidos-worktrees\quality` queda listo para la revisión y pruebas independientes de Codex. No se marcaron estados en `BOARD.md` ni se realizó push a repositorio remoto.
