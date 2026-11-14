# Resultado AUD-06 — Seguimiento privado por token opaco con hash SHA-256 en fragmento

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE (RPC SQL verificada en harness simulado; Postgres real pendiente)

## 1. Cambios Realizados
- **`supabase/migrations/202611130001_aud_04_05_06_auth_rbac_tracking.sql`**:
  - Columnas `tracking_token_hash` y `tracking_token_revoked_at` en `public.pedidos`.
  - RPC `get_order_by_tracking_token(p_order_id INT, p_token TEXT)` (hash SHA-256, respuesta uniforme vacía ante token inválido/revocado, excluye `cliente_telefono`) y `revoke_order_tracking_token(p_order_id INT)` sólo para staff activo.
- **`js/config.js`**, **`js/store.js`**, **`js/app.js`**, **`js/views/client.js`**:
  - Almacenamiento local acotado en `OWN_TRACKING_REFS`, hash SHA-256 (`sha256Hex`), enlaces exclusivamente en fragmento `#track=<id>:<token>` (nunca en query string `?token=`).

## 2. Verificación Ejecutada
- `node tests/test-aud-04-06-auth-rbac-tracking.test.mjs` (`AUD-06.1`, `AUD-06.2`, `AUD-04/06 Browser Check` en Brave headless): PASS (`exit 0`).
- `node tests/test-aud-02-disposable-backend.test.mjs`: PASS (`exit 0`).

## 3. Limitaciones Honestamente Reportadas
- `get_order_by_tracking_token` y `revoke_order_tracking_token` probadas sobre harness en memoria (`isRealPostgresRls: false`) y navegación fragmento en Brave headless contra `dist/public`; Postgres vivo `UNVERIFIED`.
