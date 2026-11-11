# Auditoría inicial — 11 de noviembre de 2026

Base revisada: `main` en `f862a5a`, más archivos sin seguimiento preexistentes. Revisión colaborativa de seguridad, flujos y UX/rendimiento. No se modificó código ni se accedió a servicios reales. Puntaje orientativo: **36/100**, no certificación ni evaluación de una instalación desplegada. Las categorías son juicio profesional para priorización: seguridad 4/25, integridad funcional 9/25, UX/accesibilidad 12/20, rendimiento 4/10 y preparación operativa 7/20. Las áreas sin medición reducen la confianza del puntaje; no equivalen a una prueba fallida.

## Hallazgos priorizados

1. **Crítico — XSS en vista de preparación:** `js/views/operator.js:169` interpola cantidad sin escape. En Chromium aislado, la vista real con store simulado y pedido sintético ejecutó un marcador (`executed: 1`). El esquema acepta campos de items sin validación individual (`supabase/schema.sql:288`) y el store los conserva (`js/store.js:337`); la cadena completa con PostgreSQL no fue probada.
2. **Crítico — privacidad y autorización:** las políticas del esquema del repositorio permiten SELECT y UPDATE anónimos de clientes y pedidos (`supabase/schema.sql:252`, `:283`). No se comprobó si ese esquema está desplegado.
3. **Alto — confirmación prematura:** el checkout guarda localmente y limpia el carrito antes de conocer el resultado remoto (`js/store.js:958`, `js/views/client.js:1167`); un error puede dejar el pedido solo en el dispositivo. Ante fallo de inserción hay un upsert con ID local (`js/store.js:416`), reproducido con mock; sobrescritura real condicionada a colisión y error no fue probada.
4. **Alto — acceso al catálogo:** el PIN inicial `1234` es conocido y protege escritura de productos (`supabase/schema.sql:152`, `:239`); el bloqueo de intentos local no controla solicitudes directas. El límite de pedidos usa una fecha que el insert permite aportar (`supabase/schema.sql:194`); bypass inferido, sin prueba en PostgreSQL.
5. **Alto/medio — identidad y catálogo:** teléfonos distintos con los mismos últimos ocho dígitos se consideran iguales; `1133334444` y `2233334444` dieron `true` con datos sintéticos (`js/store.js:850`). La respuesta de catálogo vacía conserva 17 productos anteriores en un mock (`js/store.js:307`).
6. **Medio — accesibilidad:** buscador sin etiqueta accesible explícita (`js/views/client.js:424`) y controles de cantidad sin identificación del producto (`js/views/client.js:639`).
7. **Documentación:** la demo depende de CDN visual y fuentes (`index.html:39`, `:67`), de modo que no se debe prometer funcionamiento totalmente desconectado. El plan de producto y sus afirmaciones históricas requieren distinguir lo implementado de lo verificado.

## Verificaciones y límites

- Agente funcional: pruebas aisladas de catálogo y preparación 15 escenarios, sincronización simulada 10 pruebas, estado heredado 72 verificaciones, teléfonos 18 y peso 2; no prueban la base o red reales. El test heredado incluye mensajes relativos a código antiguo.
- Agente de interfaz: validación de preparación 2/2; pruebas de layout y scroll en localhost bloqueadas por `ERR_NETWORK_ACCESS_DENIED`. El XSS se verificó aparte en Chromium aislado sin red.
- Tamaños locales: bundle 266.109 bytes, 56.087 bytes gzip; CSS 10.760/3.430; HTML 6.324/2.348. No se midieron LCP, INP, CLS, carga real ni consultas SQL.
- No se probó una base desplegada, un dispositivo físico, WhatsApp ni seguridad integral. No se iniciaron los scripts prohibidos.
- Git: `main` y la referencia local `origin/main` apuntaban a `f862a5a`; no se pudo consultar GitHub por DNS. Las referencias locales de V2 y siete ramas feature coincidían con sus correspondientes refs locales de origin. No se demuestra sincronización remota actual.

## Próximo orden propuesto

1. Definir alcance de la siguiente fase y cerrar riesgos de XSS, privacidad/autorización y PIN, con pruebas aisladas.
2. Resolver confirmación durable, colisiones, identidad de cliente y catálogo vacío; validar con fallos y concurrencia reproducibles.
3. Verificar accesibilidad y flujos móviles en navegador/dispositivos; medir rendimiento con condiciones representativas.
4. Volver a puntuar usando los mismos pesos, registrando pruebas y limitaciones. No despachar NP-004 ni implementación sin indicación de alcance del usuario.
