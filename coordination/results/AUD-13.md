# Resultado AUD-13 — Accesibilidad de flujos principales

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE

## 1. Cambios Realizados
- **`js/views/client.js`**:
  - Asociados `for="phone-input"`, `for="address-input"` y `for="delivery-address-input"` en las etiquetas correspondientes.
  - Agregado `role="alert"` y `aria-live="assertive"` a `#phone-error` y `#name-error`.
  - Agregado `aria-label="Buscar productos"` a `#search-input`.
  - Incluidos nombres de producto explícitos en `aria-label` y `title` de botones del catálogo (`.btn-add-initial`, `.btn-qty-dec`, `.btn-qty-inc`).
- **`tests/test-aud-13-a11y.test.mjs`**:
  - Suite DOM + teclado en Brave headless verificando etiquetas asociadas, nombres por producto, diálogo modal (`role="dialog"`, `aria-modal`, `inert`), trampa `Tab`, cierre por `Escape` con restauración de foco al disparador (`#btn-open-cart`), alertas operativas y controles >=44px / inputs >=16px.

## 2. Verificación Ejecutada
- `powershell -ExecutionPolicy Bypass -File .\build-bundle.ps1` + `node --check js/bundle.js` + `node scripts/build-public.mjs`: PASS (`exit 0`).
- `node tests/test-aud-13-a11y.test.mjs`: PASS (`5/5`, `exit 0`).

## 3. Limitaciones Honestamente Reportadas
- Validado en Brave headless escritorio/móvil simulado; lector de pantalla físico (VoiceOver iOS / TalkBack) queda `UNVERIFIED`.
