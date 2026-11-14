# Resultado AUD-12 — Limitación de tasa en servidor con reloj PG `NOW()` y modo fail-closed

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE (simulación de ráfagas + SQL fail-closed; PostgreSQL vivo pendiente)

## 1. Cambios Realizados
- **`supabase/migrations/202611130002_aud_07_09_12_atomic_orders_ratelimit.sql`**:
  - Tablas `public.rate_limit_config` (valores iniciales 3/300s cliente, 10/60s origen, 30/60s comercio) y `public.order_rate_limit_events`.
  - Función `check_and_record_order_rate_limit(p_customer_phone TEXT)` fail-closed (`RATE_LIMIT_UNCONFIGURED` si falta configuración o es inválida), usando `NOW()` y devolviendo `RATE_LIMIT_EXCEEDED ... RETRY_AFTER:<segundos>`, además de trigger `enforce_order_rate_limit` en `pedidos` que sobreescribe `NEW.fecha := NOW()`.
- **`js/store.js`**, **`js/views/client.js`**:
  - Parseo de `RETRY_AFTER:<secs>` y preservación de carrito ante `RATE_LIMIT_EXCEEDED` o `RATE_LIMIT_UNCONFIGURED`.

## 2. Verificación Ejecutada
- `node tests/test-aud-07-08-09-12-orders.test.mjs` (`AUD-12.1` con ráfaga paralela `Promise.all`, verificación de cero filas extra, avance de ventana temporal y configuración eliminada fail-closed): PASS (`exit 0`).

## 3. Limitaciones Honestamente Reportadas
- El harness emula límites y reloj del servidor en memoria; la contención física de `pg_advisory_xact_lock` y headers reales de proxy PostgREST en PostgreSQL vivo quedan `UNVERIFIED`.
