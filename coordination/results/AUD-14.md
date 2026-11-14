# Resultado AUD-14 — Regresión visual y móvil

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE (emulación Brave headless; iOS Safari físico y HEIC `UNVERIFIED`)

## 1. Cambios Realizados
- **`tests/test-aud-14-mobile-visual.test.mjs`**:
  - Barrido completo sobre `dist/public` (`bot/serve-demo.js`) en Brave headless para los 6 viewports especificados (`360px`, `375px`, `390px`, `430px`, `768px`, `1024px`) en temas `light` y `dark` (12 combinaciones totales), con productos pesables, unitarios, títulos/descripciones extensas y pedidos mixtos.
  - Verifica vista de seguimiento activo, catálogo, modal/drawer de carrito en modo `DELIVERY`, puesto de preparación de operario, ausencia de desborde horizontal (`scrollWidth <= innerWidth`), altura mínima táctil >=44px, tipografía en inputs >=16px, cero errores JS y cero hosts de red inesperados.

## 2. Verificación Ejecutada
- `node tests/test-aud-14-mobile-visual.test.mjs`: PASS (`exit 0`, 12/12 combinaciones viewport x tema sin regresiones).
- `node tests/test-static-server.test.mjs`: PASS (`exit 0`, sirviendo únicamente `dist/public`).

## 3. Limitaciones Honestamente Reportadas
- Emulación táctil en Brave/Chromium sobre Windows NO equivale a Safari físico en iOS. Navegación real en Safari iOS y captura/subida de imágenes HEIC nativas permanecen estrictamente `UNVERIFIED`.
