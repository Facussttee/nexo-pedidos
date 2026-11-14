# Resultado AUD-15 — Rendimiento, CSS sin @import bloqueante y protocolo de 5 corridas

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE (medición sintética local headless Brave sobre loopback; NO equivale a INP de campo)

## 1. Cambios Realizados
- **`css/style.css`**: Se eliminó el `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');` bloqueante en cascada de CSS, manteniendo únicamente `<link>` con `preconnect` en `index.html`.
- **`dist/public`**: Reconstruido con `node scripts/build-public.mjs`.
- **`tests/test-aud-15-performance.test.mjs`**: Suite automatizada que verifica ausencia de `@import url(` en `css/style.css`, presencia de artefactos en `dist/public` e instrumenta 5 corridas limpias en Brave headless midiendo `fontCssRequests`, `dclMs`, `loadMs`, `fcpMs` e `interactionMs` (latencia sintética de respuesta ante clic).

## 2. Comparativa Antes vs. Después (Protocolo idéntico de 5 corridas)

### ANTES (con `@import url(...)` en `css/style.css`)
- Run 1: `fontCssRequests=1`, `dclMs=196`, `loadMs=197`, `fcpMs=172`, `interactionMs=118`
- Run 2: `fontCssRequests=1`, `dclMs=210`, `loadMs=211`, `fcpMs=184`, `interactionMs=124`
- Run 3: `fontCssRequests=1`, `dclMs=181`, `loadMs=182`, `fcpMs=156`, `interactionMs=103`
- Run 4: `fontCssRequests=1`, `dclMs=187`, `loadMs=189`, `fcpMs=152`, `interactionMs=97`
- Run 5: `fontCssRequests=1`, `dclMs=178`, `loadMs=179`, `fcpMs=152`, `interactionMs=112`
- **Resumen:** `dclMs` mediana `187 ms` (IQR `15`), `loadMs` mediana `189 ms` (IQR `15`), `fcpMs` mediana `156 ms` (IQR `20`), `interactionMs` mediana `112 ms` (IQR `15`). Test falló por presencia de `@import url(`.

### DESPUÉS (sin `@import url(...)` + `dist/public` reconstruido)
- Run 1: `fontCssRequests=1`, `dclMs=223`, `loadMs=224`, `fcpMs=188`, `interactionMs=133`
- Run 2: `fontCssRequests=1`, `dclMs=188`, `loadMs=189`, `fcpMs=164`, `interactionMs=110`
- Run 3: `fontCssRequests=1`, `dclMs=190`, `loadMs=191`, `fcpMs=164`, `interactionMs=118`
- Run 4: `fontCssRequests=1`, `dclMs=182`, `loadMs=183`, `fcpMs=144`, `interactionMs=112`
- Run 5: `fontCssRequests=1`, `dclMs=181`, `loadMs=182`, `fcpMs=156`, `interactionMs=112`
- **Resumen:** `dclMs` mediana `188 ms` (IQR `8`), `loadMs` mediana `189 ms` (IQR `8`), `fcpMs` mediana `164 ms` (IQR `8`), `interactionMs` mediana `112 ms` (IQR `6`).
- **Resultado:** `node tests/test-aud-15-performance.test.mjs` -> PASS (`exit 0`, 1/1).

## 3. Limitaciones Honestamente Reportadas
- Chromium/Brave ya coalescía la petición duplicada de `fonts.googleapis.com` entre `<link>` y `@import`, por lo que `fontCssRequests=1` no cambió y las medianas de loopback muestran jitter local normal; la ganancia real es eliminar el parsing bloqueante CSSOM `@import`.
- Mediciones sintéticas en loopback headless NO representan Web Vitals / INP reales en dispositivos móviles de campo, ni el tamaño en bytes del bundle equivale por sí solo a velocidad de ejecución.
