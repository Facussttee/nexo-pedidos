# Resultado AUD-04 — Autenticación real de staff (owner y operator) y retiro de PIN compartido en producción

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE (verificación SQL real pendiente de PostgreSQL/Supabase local)

## 1. Cambios Realizados
- **`supabase/migrations/202611130001_aud_04_05_06_auth_rbac_tracking.sql`**, **`supabase/schema.sql`**, **`supabase/001_pilot.sql`**, **`supabase/fixtures/owner_seed.sql`**:
  - Tabla `public.staff_members` vinculada a `auth.users(id)` con roles `'owner' | 'operator'` y bandera `active`.
  - Funciones `current_staff_role()`, `is_active_staff()`, `is_active_owner()`.
- **`js/store.js`**, **`js/app.js`**, **`js/views/admin.js`**, **`js/views/operator.js`**:
  - En producción: autenticación obligatoria mediante Supabase Auth (`signInStaff`, `refreshStaffSession`, `logoutStaff`, `getStaffRole`, `canAccessStaffView`), bloqueo explícito a `operator` en vistas/acciones de dueño (`admin`) y expiración automática de sesión (`staff_locked`).
  - PIN compartido (`verifyStaffPin`, `saveLocalSettings`) restringido exclusivamente a `mode === "demo"`; eliminado el header `x-nexo-staff-pin`.

## 2. Verificación Ejecutada
- `node tests/test-aud-04-06-auth-rbac-tracking.test.mjs`: PASS (`exit 0`, incluye login/logout, expiración de token, membresía inactiva rechazada y bloqueo de escalación `operator -> admin`).
- `node tests/test-production-supabase-sync.test.mjs`: PASS (`exit 0`, 10/10).
- `node tests/test-demo-isolation.test.mjs`: PASS (`exit 0`, 17/17).
- `powershell -ExecutionPolicy Bypass -File .\build-bundle.ps1` + `node --check js/bundle.js`: PASS (`exit 0`).

## 3. Limitaciones Honestamente Reportadas
- `docker=absent, supabase=absent, psql=absent` en este host Windows: las políticas RLS y `auth.uid()` sobre PostgreSQL real permanecen `UNVERIFIED` en instancia viva; probadas mediante harness simulado (`isRealPostgresRls: false`) e inspección estática SQL.
