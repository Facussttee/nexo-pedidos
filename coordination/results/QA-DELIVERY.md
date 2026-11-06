# QA de entrega — 2026-11-04

Resultado: candidata local de demo funcional aceptada técnicamente, pendiente validación con el comercio. Fuente canónica: coordinador, working tree sin commit sobre cea4d0e. Ver [estado de entrega](../DELIVERY_STATUS.md) y [manifiesto](../reviews/DELIVERY_MANIFEST_2026-11-04.json).

## Comandos ejecutados

Desde D:/Escritorio/nexo-pedidos:

```powershell
powershell -ExecutionPolicy Bypass -File .\build-bundle.ps1
node --check js/bundle.js
node scripts/build-public.mjs
node tests/test-delivery-store.mjs
node tests/test-preparation-input.test.mjs
node tests/test-demo-isolation.test.mjs
node tests/test-static-server.test.mjs
node bot/test-store-state.js
node tests/test-phone-numeric-validation.test.mjs
node tests/test-html-escaping.test.mjs
node tests/test-xss-rendering.test.mjs
node coordination/reviews/demo-release-acceptance.cjs . coordination/bugs/DEMO_RELEASE_AFTER_2026-11-04.json --expect-fixed
node coordination/reviews/scroll-acceptance.cjs . coordination/bugs/SCROLL_RELEASE_2026-11-04.json
node coordination/reviews/catalog-recovery-acceptance.mjs . coordination/bugs/CATALOG_RECOVERY_AFTER_2026-11-04.json --expect-fixed
node coordination/reviews/checkout-storage-acceptance.mjs . coordination/bugs/CHECKOUT_STORAGE_RELEASE_2026-11-04.json --expect-fixed
node coordination/reviews/checkout-ui-acceptance.cjs . coordination/bugs/CHECKOUT_UI_RELEASE_2026-11-04.json --expect-fixed
node coordination/reviews/delivery-rendering-acceptance.cjs . coordination/bugs/DELIVERY_RENDERING_RELEASE_2026-11-04.json --expect-fixed
node coordination/reviews/zero-total-probe.cjs . coordination/bugs/ZERO_TOTAL_RELEASE_2026-11-04.json --expect-fixed
git diff --check
```

Resultados: todas esas verificaciones aprobaron. Hay advertencias esperadas de localStorage experimental de Node y del SDK Supabase ausente en una prueba productiva simulada; no hubo conexión real ni se interpretaron esas advertencias como pruebas de backend.

## Revisión y correcciones finales

- Revisión independiente: sin Critical/Important pendientes para esta demo. Reprodujo seis asserts de estimado/provisional antes/después de agregar/quitar tras pesar; corrección aceptada.
- Fuente de estimados: cantidades solicitadas y precios del snapshot; preparación real separada. Dos expectativas heredadas incorrectas se corrigieron a7600 y11000 sin cambiar reales.
- Caso de sumas finitas que desbordan: rechazo explícito y estado previo intacto.
- PIN local con fallo de escritura: error y valor anterior conservado.
- Cabeceras: altura observada, sin override46 heredado ni contenedor hidden que desplazaba sticky. Reflow root/body/real coincidente; rótulo móvil completo con separación40.69px.
- Test harness: textContent para preservar literal sin transformación uppercase; carrito vacío admite clave eliminada/null; select de paso se opera como select. Se conservaron las aserciones de datos y errores.

## Límites

Brave headless, datos sintéticos, dos viewports verticales y seis de scroll. No extensión (deshabilitada), Safari, teléfono físico, DB ni WhatsApp real. No commits/push/deploy; el servidor local queda en http://127.0.0.1:3000/?demo=1 y se limita a dist/public. MiHuerta intacta.
