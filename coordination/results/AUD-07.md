# Resultado AUD-07 — Creación atómica de pedidos con precios y stock autoritativos del servidor

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE (RPC simulada + contrato SQL; Postgres vivo pendiente)

## 1. Cambios Realizados
- **`supabase/migrations/202611130002_aud_07_09_12_atomic_orders_ratelimit.sql`**:
  - RPC transaccional `create_order_atomic` que lee catálogo en servidor con `FOR SHARE`, rechaza productos pausados/archivados (`PRODUCT_UNAVAILABLE`), valida cantidades y pasos, ignora cualquier precio/fecha/estado enviado por el cliente y fija `fecha = NOW()` y `estado = 'PENDIENTE'`.
- **`js/store.js`**, **`js/views/client.js`**:
  - Envío exclusivo de `{ producto_id, cantidad }` en `submitOrder()` y bloqueo de `createOrder()` síncrono en producción.

## 2. Verificación Ejecutada
- `node tests/test-aud-07-08-09-12-orders.test.mjs` (`AUD-07.1`, `AUD-07.2`): PASS (`exit 0`).
- `node tests/test-production-supabase-sync.test.mjs`: PASS (`exit 0`, 10/10).

## 3. Limitaciones Honestamente Reportadas
- Ejecutado contra harness en memoria (`isRealPostgresRls: false`); ejecución bajo bloqueos reales `FOR SHARE` en PostgreSQL queda `UNVERIFIED` por falta de Docker/Supabase CLI en host.
