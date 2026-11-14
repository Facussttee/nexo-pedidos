# Resultado AUD-11 — Sincronización de catálogo vacío, errores visibles y bloqueo de carrito obsoleto

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE

## 1. Cambios Realizados
- **`js/store.js`**, **`js/views/client.js`**:
  - `pullFromSupabase()` distingue falla de consulta (`syncError`/`catalogError` con notificación sin borrar caché válida) de respuesta legítima vacía `[]` (reemplaza catálogo obsoleto completamente).
  - Agregados `getCartAvailabilityIssues()` y `revalidateCartAgainstCatalog()` exponiendo banner `#cart-availability-warning` y bloqueando checkout en `submitOrder()` manteniendo el carrito editable para que el cliente retire o ajuste ítems afectados.
  - Banner `#client-sync-error` visible en vista cliente ante `sync_error` / `catalog_error`.

## 2. Verificación Ejecutada
- `node tests/test-aud-10-11-identity-catalog.test.mjs` (`AUD-11.1`, `AUD-11.2`): PASS (`exit 0`, incluyendo falla simulada de tabla `productos` y reemplazo de catálogo poblado a `[]`).
- `node tests/test-demo-isolation.test.mjs`: PASS (`exit 0`, 17/17).

## 3. Limitaciones Honestamente Reportadas
- Probado mediante harness local de Supabase y almacenamiento en memoria.
