# Resultado AUD-16 — Seguridad operativa, lockfile, headers y CI multi-job

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE (verificado localmente en Windows + contrato CI Linux; corrida real de GitHub Actions depende del push a `origin`)

## 1. Cambios Realizados
- **`.github/workflows/ci.yml`**:
  - Dividido en dos jobs limpios: `validate-local` (verifica `bot/package-lock.json`, sintaxis JS/MJS, generación y artefactos de `dist/public`, más todas las suites Node de aislamiento/simulación/confinamiento) y `validate-browser` (`needs: validate-local`, instala Playwright + Chromium de forma efímera en `/tmp/pw` con `--no-save` y `PLAYWRIGHT_PATH=/tmp/pw/node_modules/playwright`, y ejecuta `test-aud-03`, `test-aud-04-06`, `test-aud-13`, `test-aud-14`, `test-aud-15`).
- **`tests/test-aud-03-xss-orders.test.mjs`, `tests/test-aud-04-06-auth-rbac-tracking.test.mjs`, `tests/test-aud-13-a11y.test.mjs`, `tests/test-aud-14-mobile-visual.test.mjs`**:
  - Resolución portable de Playwright soportando `PLAYWRIGHT_PATH`, `playwright`, `/tmp/pw/node_modules/playwright` (Linux CI) y rutas locales en Windows sin contaminar `package.json`.
- **`tests/test-aud-16-ops-security.test.mjs`**:
  - Verifica integridad SRI (`sha256`/`sha384`/`sha512`) y concordancia de `bot/package-lock.json` con `bot/package.json`.
  - Verifica confinamiento de `dist/public` (ausencia de `.git`, `.env`, `supabase`, `bot`, `coordination`, `js/store.js`, `js/config.js`), headers de seguridad (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`), `ETag`/`304` y `403` `no-store`.
  - Valida higiene de `vercel.json`, `Dockerfile` (`USER node`) y cobertura completa en `.github/workflows/ci.yml` sin invocación de scripts prohibidos (`bot/index.js`, `seed.js`, `test-mock.js`, `test-order-flow.js`).

## 2. Verificación Ejecutada
- `node tests/test-aud-16-ops-security.test.mjs`: PASS (`exit 0`, 5/5).
- `npm audit --prefix bot --audit-level=moderate`: PASS (`exit 0`, `found 0 vulnerabilities`).
- `node tests/test-aud-03-xss-orders.test.mjs`: PASS (`exit 0`, 5/5).
- `node tests/test-aud-04-06-auth-rbac-tracking.test.mjs`: PASS (`exit 0`, 10/10).
- `node tests/test-aud-13-a11y.test.mjs`: PASS (`exit 0`, 5/5).
- `node tests/test-aud-14-mobile-visual.test.mjs`: PASS (`exit 0`, 1/1 — 12 combinaciones viewport x tema).

## 3. Limitaciones Honestamente Reportadas
- La ejecución exitosa de los jobs de `.github/workflows/ci.yml` dentro del runner remoto `ubuntu-latest` de GitHub Actions se comprueba tras el `git push origin main` y no en emulación local de GitHub Actions.
