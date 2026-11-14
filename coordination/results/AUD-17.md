# Resultado AUD-17 — Reauditoría final, cierre de tickets AUD-00–17 e higiene Git

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Commit de código + tests + bundle + docs verificado:** `0553e66` (`0553e663dd6d5456e1f05532ad498a40a89e4179`)
- **Entorno:** Windows (`win32/x64`), Node `v26.13.0`, Brave headless (`true`), `PLAYWRIGHT_PATH` resuelto, `docker=null`, `supabase=null`, `psql=null`
- **Estado:** DONE (con limitaciones explícitas `UNVERIFIED` documentadas)

---

## 1. Resumen de Cierre y Higiene del Repositorio

1. **Remediación integrada (`AUD-00`–`AUD-16` + cierre de hallazgos en revisión):**
   - `AUD-00` (`coordination/results/AUD-00.md`), `AUD-01` (`tests/test-aud-01-rubric.test.mjs`), `AUD-02` (`tests/helpers/disposable-supabase-harness.mjs`, `tests/test-aud-02-disposable-backend.test.mjs`).
   - `AUD-03` (`tests/test-aud-03-xss-orders.test.mjs`, `js/html.js`, `js/store.js`, vistas `client.js`/`operator.js`).
   - `AUD-04`–`AUD-06` (`supabase/migrations/202611130001_aud_04_05_06_auth_rbac_tracking.sql`, `supabase/schema.sql`, `js/store.js`, `js/app.js`, `tests/test-aud-04-06-auth-rbac-tracking.test.mjs`).
   - `AUD-07`–`AUD-09`, `AUD-12` (`supabase/migrations/202611130002_aud_07_09_12_atomic_orders_ratelimit.sql`, `tests/test-aud-07-08-09-12-orders.test.mjs`, `tests/test-aud-08-checkout-ui-retry.test.mjs`).
   - Fixes de revisión sobre `0553e66`:
     - `js/views/client.js`: `isSubmittingCheckout = false` antes de `renderCatalog()` tras fallo/timeout para no dejar `#btn-confirm-order` trabado como `disabled` (`tests/test-aud-08-checkout-ui-retry.test.mjs` `3/3 PASS`).
     - `js/store.js`, `js/views/operator.js`: cola serializada por pedido (`orderMutationQueues` con aborto ante `isVersionConflict`) y debounce en botones `.btn-adjust-weight` para evitar auto-colisiones de versión en un mismo operario.
     - `js/store.js`, `supabase/schema.sql`, `supabase/migrations/202611130002_aud_07_09_12_atomic_orders_ratelimit.sql`, `tests/helpers/disposable-supabase-harness.mjs`: `updateOrderDetails` / `updateOrderDetailsAsync` / `update_order_details_staff` limpian `pedidos.direccion_entrega` al pasar `DELIVERY -> RETIRO` sin borrar `clientes.direccion` y validan `p_tipo_entrega` + dirección no vacía en `DELIVERY`.
   - `AUD-10`–`AUD-11` (`tests/test-aud-10-11-identity-catalog.test.mjs`, `tests/test-phone-numeric-validation.test.mjs`).
   - `AUD-13`–`AUD-15` (`js/views/client.js`, `css/style.css`, `tests/test-aud-13-a11y.test.mjs`, `tests/test-aud-14-mobile-visual.test.mjs`, `tests/test-aud-15-performance.test.mjs`).
   - `AUD-16` (`.github/workflows/ci.yml` separando `validate-local` Node-only y `validate-browser` con Playwright portable en `test-aud-03`, `test-aud-04-06`, `test-aud-08-checkout-ui-retry`, `test-aud-13`–`15`, `test-xss-rendering`, `test-navigation-scroll`, `test-iphone-13-pro-layout`; `tests/test-aud-16-ops-security.test.mjs`, `bot/package-lock.json`).
   - Fix adicional previo en `dfe8b73`: limpieza de animación de entrada al arrastrar carrito (`sheet.style.animation = "none"` en `js/views/client.js`) y recorrido acotado de `slideUp` en `css/style.css` (`24px`).
2. **Limpieza Git y Worktrees:**
   - Retirados worktrees fusionados `aud-00`, `aud-01`, `aud-02` y sus ramas locales (`feature/aud-00-traceability`, `feature/aud-01-rubric-regression`, `feature/aud-02-disposable-backend`).
   - Depurados artefactos temporales sin trackear en `coordination/reviews/` (`admin-*.png`, `MOBILE_BASELINE_HASHES.json`, `images-acceptance.json`, `mobile-acceptance.json`) y caché intermedia de `graphify-out/` (`.gitignore` actualizado).
   - Incorporados al repositorio limpio: `coordination/results/QA-E1.md`, `tests/load/`, `scripts/audit-git.mjs`, `graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.json`, `graphify-out/graph.html`.
   - Documentación canónica sincronizada: `README.md`, `PROJECT.md`, `docs/PRODUCT.md`, `docs/REPO_MAP.md`, `tasks/todo.md`, `coordination/BOARD.md`, `coordination/results/AUD-08.md`, `AUD-09.md`, `AUD-16.md`.
   - `D:\Escritorio\miHuerta` intacto; remoto `upstream` mantiene push deshabilitado (`DISABLED_NO_PUSH_TO_MIHUERTA`); push exclusivamente hacia `origin` (`https://github.com/Facussttee/nexo-pedidos.git`).

---

## 2. Resultado de Rúbrica (`tests/test-aud-01-rubric.test.mjs`)

- **Snapshot:** `coordination/results/rubric-score.json` (generado sobre commit `0553e66`).
- **Puntaje Verificado:** **91 / 100** | **Fallido:** **0 / 100** | **No verificado:** **9 / 100**
  - **Seguridad:** `20 / 25` (`Fail: 0`, `Unverified: 5`)
  - **Integridad Funcional:** `25 / 25` (`Fail: 0`, `Unverified: 0`)
  - **UX & Accesibilidad:** `16 / 20` (`Fail: 0`, `Unverified: 4`)
  - **Rendimiento:** `10 / 10` (`Fail: 0`, `Unverified: 0`)
  - **Operación:** `20 / 20` (`Fail: 0`, `Unverified: 0`)
- **Validación conductual y contractual en `AUD-01`:** El control de autenticación individual (`4 pts` en Seguridad) verifica tanto el rechazo productivo de PIN en `js/store.js` (`getLocalSettings().staffPin === null`), ausencia de `x-nexo-staff-pin`/`'1234'` en SQL y UI, como la ejecución viva de `tests/test-aud-04-06-auth-rbac-tracking.test.mjs` (`10/10 PASS`). El control de checkout verifica además `tests/test-aud-07-08-09-12-orders.test.mjs` (`10/10 PASS`) y `tests/test-aud-08-checkout-ui-retry.test.mjs` (`3/3 PASS`) sobre `dist/public/js/bundle.js`.

---

## 3. Suites Ejecutadas sobre Commit `0553e66`

| Comando | Resultado | Detalle |
|---|---|---|
| `powershell -ExecutionPolicy Bypass -File .\build-bundle.ps1` | PASS (`exit 0`) | `js/bundle.js` 323,897 bytes UTF-8 sin BOM |
| `node --check js/bundle.js` | PASS (`exit 0`) | Sintaxis válida |
| `node --check scripts/build-public.mjs` | PASS (`exit 0`) | Sintaxis válida |
| `node --check scripts/audit-git.mjs` | PASS (`exit 0`) | Sintaxis válida |
| `node scripts/build-public.mjs` | PASS (`exit 0`) | `dist/public` (4 archivos allowlist) |
| `node tests/test-aud-02-disposable-backend.test.mjs` | PASS (`exit 0`) | `5 / 5` checks (`docker=absent, supabase=absent, psql=absent`) |
| `node tests/test-aud-03-xss-orders.test.mjs` | PASS (`exit 0`) | `5 / 5` checks en Brave headless |
| `node tests/test-aud-04-06-auth-rbac-tracking.test.mjs` | PASS (`exit 0`) | `10 / 10` checks (simulado + navegador) |
| `node tests/test-aud-07-08-09-12-orders.test.mjs` | PASS (`exit 0`) | `10 / 10` checks (checkout atómico, concurrencia single/multi-operario, cambio `DELIVERY->RETIRO`, rate limit) |
| `node tests/test-aud-08-checkout-ui-retry.test.mjs` | PASS (`exit 0`) | `3 / 3` checks en Brave headless sobre `dist/public/js/bundle.js` |
| `node tests/test-aud-10-11-identity-catalog.test.mjs` | PASS (`exit 0`) | `6 / 6` checks |
| `node tests/test-aud-13-a11y.test.mjs` | PASS (`exit 0`) | `5 / 5` checks (Brave headless) |
| `node tests/test-aud-14-mobile-visual.test.mjs` | PASS (`exit 0`) | `1 / 1` suite (12 combinaciones 360–1024px light/dark) |
| `node tests/test-aud-15-performance.test.mjs` | PASS (`exit 0`) | 5 corridas locales loopback: mediana DCL `183 ms`, Load `184 ms`, FCP `156 ms`, Interaction `109 ms` |
| `node tests/test-aud-16-ops-security.test.mjs` | PASS (`exit 0`) | `5 / 5` checks (`bot/package-lock.json`, headers, `dist/public`, `ci.yml` sin Playwright en `validate-local`) |
| `node tests/test-production-supabase-sync.test.mjs` | PASS (`exit 0`) | `10 / 10` checks |
| `node tests/test-demo-isolation.test.mjs` | PASS (`exit 0`) | `17 / 17` checks |
| `node tests/test-static-server.test.mjs` | PASS (`exit 0`) | `24 / 24` checks |
| `node tests/test-delivery-store.mjs` | PASS (`exit 0`) | `15 / 15` escenarios |
| `node tests/test-phone-numeric-validation.test.mjs` | PASS (`exit 0`) | `19 / 19` checks |
| `node bot/test-store-state.js` | PASS (`exit 0`) | `72 / 72` checks |
| `node tests/test-html-escaping.test.mjs` | PASS (`exit 0`) | `8 / 8` checks |
| `node tests/test-xss-rendering.test.mjs` | PASS (`exit 0`) | `8 / 8` checks (Brave headless, `PLAYWRIGHT_PATH`) |
| `node tests/test-preparation-input.test.mjs` | PASS (`exit 0`) | `2 / 2` checks |
| `node tests/test-navigation-scroll.test.mjs` | PASS (`exit 0`) | `26 / 26` checks (Brave headless, `PLAYWRIGHT_PATH`) |
| `node tests/test-iphone-13-pro-layout.test.mjs` | PASS (`exit 0`) | `54 / 54` checks (Brave headless 390px) |
| `npm audit --prefix bot --audit-level=moderate` | PASS (`exit 0`) | `found 0 vulnerabilities` |
| `node tests/test-aud-01-rubric.test.mjs` | PASS (`exit 0`) | `91 / 100` (`Fail: 0`, `Unverified: 9`) |

> Nota sobre suite heredada fuera de catálogo Nexo: `tests/adversarial-r2-r3-r4.test.mjs` (`Date: 2026-10-29`, ejecutada previamente en `d23afeb`) falla (`exit 1`) buscando claves antiguas de MiHuerta (`mihuerta_theme_v3`, catálogo heredado) sustituidas por `nexo_theme_v1` y catálogo demo de Nexo Pedidos.

---

## 4. Controles `UNVERIFIED` y Riesgos Residuales

1. **RLS real en PostgreSQL / Supabase vivo (`5 pts`, `UNVERIFIED`):** Ausencia de `docker`, `supabase` CLI y `psql` en este host Windows impidió ejecutar migraciones, políticas `REVOKE`/`RLS`, `pg_advisory_xact_lock` y `FOR SHARE` contra PostgreSQL real; validado sólo por análisis estático SQL y `disposable-supabase-harness.mjs` (`isRealPostgresRls: false`).
2. **Dispositivo físico iOS Safari / captura HEIC / lectores de pantalla reales (`4 pts`, `UNVERIFIED`):** Toda verificación visual/móvil/accesibilidad corrió en Brave headless emulado sobre Windows; no prueba Safari real en iPhone, teclado virtual iOS, HEIC ni VoiceOver/TalkBack.
3. **Métricas sintéticas de laboratorio (`AUD-15`):** Latencias en loopback headless NO sustituyen Core Web Vitals / INP de campo en redes móviles reales.
4. **Runner remoto GitHub Actions y despliegue Vercel:** Validados localmente; la ejecución efectiva en `ubuntu-latest` ocurre al hacer push en GitHub.
5. **Scripts prohibidos no ejecutados:** Nunca se ejecutaron `bot/index.js`, `bot/seed.js`, `bot/test-mock.js` ni `bot/test-order-flow.js`.
