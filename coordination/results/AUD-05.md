# Resultado AUD-05 — Retiro de lectura/escritura abierta anon, RLS por rol y Realtime privado

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE (verificación RLS en PostgreSQL vivo pendiente de Docker/Supabase CLI)

## 1. Cambios Realizados
- **`supabase/migrations/202611130001_aud_04_05_06_auth_rbac_tracking.sql`**, **`supabase/schema.sql`**:
  - `REVOKE SELECT, INSERT, UPDATE, DELETE ON public.pedidos FROM anon;` y `REVOKE SELECT, INSERT, UPDATE, DELETE ON public.clientes FROM anon;` y `REVOKE INSERT, UPDATE, DELETE ON public.productos FROM anon;`.
  - Políticas RLS por tabla: `anon` sólo lee `productos` con `COALESCE(archivado, FALSE) = FALSE`; sólo `is_active_owner()` crea/modifica `productos` y `staff_members`; `clientes` y `pedidos` quedan restringidos a `is_active_staff()` / RPCs autoritativas.
- **`js/store.js`**:
  - `pullFromSupabase()` nunca consulta `pedidos` ni `clientes` cuando `!isStaffUnlocked()`; `subscribeToSupabaseRealtime()` sólo adjunta suscripción `pedidos` cuando `isStaffUnlocked()`.

## 2. Verificación Ejecutada
- `node tests/test-aud-04-06-auth-rbac-tracking.test.mjs` (`AUD-05.1`): PASS (`exit 0`).
- `node tests/test-production-supabase-sync.test.mjs`: PASS (`exit 0`, 10/10).

## 3. Limitaciones Honestamente Reportadas
- Sin PostgreSQL/Supabase local activo en el host, las políticas `REVOKE` y `ENABLE ROW LEVEL SECURITY` se validaron sobre harness en memoria (`isRealPostgresRls: false`) y verificación estática SQL; ejecución en Postgres vivo queda `UNVERIFIED`.
