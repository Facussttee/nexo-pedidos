# Resultado AUD-08 — Idempotencia de checkout y recuperación segura ante cortes o estado desconocido

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE

## 1. Cambios Realizados
- **`supabase/migrations/202611130002_aud_07_09_12_atomic_orders_ratelimit.sql`**:
  - Deduplicación por `checkout_cart_key` único + verificación `payload_hash` (`CONFLICT` si difiere, replay idempotente si coincide).
- **`js/config.js`**, **`js/store.js`**, **`js/views/client.js`**:
  - Estado durable `PENDING_CHECKOUT` con `attemptKey`, `token`, `tokenHash` y `payloadSignature`.
  - Ante timeout o error de red/5xx (`status: "unknown"`), conserva carrito y clave de intento para reintentar tras recarga sin duplicar pedido; ante rechazo determinista conserva carrito para corrección y deshabilita doble click en `#btn-confirm-order`.

## 2. Verificación Ejecutada
- `js/views/client.js`: desbloqueo explícito de `isSubmittingCheckout = false` antes de `renderCatalog()` tras `!result?.ok` o excepción, evitando que `#btn-confirm-order` quede trabado en `"Enviando al comercio..."`.
- `node tests/test-aud-07-08-09-12-orders.test.mjs` (`AUD-08.1` simulando `timeout_after_commit`, recarga de instancia `Store` y replay idempotente vs `CONFLICT`): PASS (`exit 0`, 10/10).
- `node tests/test-aud-08-checkout-ui-retry.test.mjs` (browser headless sobre `dist/public/js/bundle.js` en modo producción mockeado: verifica desbloqueo UI y reintento idempotente/determinista tras timeout y fallo): PASS (`exit 0`, 3/3).
- `node tests/test-demo-isolation.test.mjs`: PASS (`exit 0`).

## 3. Limitaciones Honestamente Reportadas
- Advisory lock transaccional `pg_advisory_xact_lock` y constraint único comprobados en contrato SQL y emulados en harness; concurrencia real sobre PostgreSQL `UNVERIFIED`.
