# Resultado AUD-09 — Preparación de operario, bloqueos optimistas por versión y preservación de snapshots históricos

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE (RPCs simuladas + UI integrada; Postgres vivo pendiente)

## 1. Cambios Realizados
- **`supabase/migrations/202611130002_aud_07_09_12_atomic_orders_ratelimit.sql`**:
  - Columna `version` en `pedidos` y RPCs `take_order`, `update_order_preparation`, `finalize_order_preparation`, `transition_order_status` y `update_order_details_staff` con bloqueo `FOR UPDATE`, verificación `version IS DISTINCT FROM p_expected_version` (`CONFLICT`) e incremento `version = version + 1`.
- **`js/store.js`**, **`js/views/operator.js`**:
  - Wrappers `*Async` para todas las operaciones de mostrador con recuperación ante `CONFLICT`, debounce/sincronización en `change` y finalización evitando ráfagas RPC por tecla en `.input-weight`, preservación estricta de `total_real === 0` e snapshots históricos intactos ante cambios de catálogo.

## 2. Verificación Ejecutada
- `node tests/test-aud-07-08-09-12-orders.test.mjs` (`AUD-09.1`, `AUD-09.2`): PASS (`exit 0`).
- `node tests/test-preparation-input.test.mjs`: verificar nuevamente al cierre global.
- `node bot/test-store-state.js`: PASS (`exit 0`, 72/72).

## 3. Limitaciones Honestamente Reportadas
- Concurrencia transaccional `FOR UPDATE` validada sobre harness simulado (`isRealPostgresRls: false`) e inspección SQL; PostgreSQL vivo `UNVERIFIED`.
