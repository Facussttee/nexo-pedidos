# QA-E2 — recuperación de catálogo local corrupto (BUG-003)

Preparado, NO enviado. Ejecutar luego de integrar/revisar QA-E1; un escritor en quality limpio, mismo Flash Medium si disponible y sin cambio activo. Leé BUG-003 y SECURITY_ROBUSTNESS_BEFORE.json en el repositorio coordinador.

Entrega mínima: almacenamiento de catálogo leído con validación de tipo/esquema antes de renderizar. Cadenas no JSON, objetos en vez de array, null, array con entradas incompletas e importes no finitos no deben causar products.filter/map/toLowerCase is not a function. No tratar una recuperación como éxito productivo, no borrar pedidos, clientes ni configuración. Demo puede recuperar catálogo sintético con aviso claro y dato original recuperable, o mostrar estado de error con acción explícita. Producción debe fallar de forma visible sin sembrar catálogo demo. Conservar productos válidos y su precio real; no inventar recuperación de pedidos corruptos todavía.

No hacer que safeGet cambie indiscriminadamente el tipo de datos de todas las claves; la validación pertenece al contrato de catálogo. Demostrar recarga después de recuperar y ausencia de pageerror. Si localStorage falla/quota, no prometer durabilidad; distinguir memoria temporal y dato persistido.

Archivos permitidos: js/store.js para acceso/recuperación de catálogo, js/views/client.js y js/views/admin.js sólo estado/aviso/acción de recuperación, js/app.js sólo aviso global si se justifica, js/bundle.js generado, tests nuevos de catálogo corrupto, coordination/results/QA-E2.md, coordination/bugs/BUG-003.md. build-bundle.ps1 sólo si interfaz de módulos lo exige, sin cambiar arquitectura/builderinnecesario. No CRUD/importador/SQL/bot/miHuerta/BOARD ni red productiva. Si falta contrato explicar ampliación antes de cambiarlo.

Tests: casos inválidos mencionados y catálogo válido conservado; navegador real reproduciendo el archivo marcador not-json, recuperación y recarga. Repetir suites aisladas demo17 static24 store71 phone18 más XSS/navegación pertinente y bundledeESTEworktree. Commit local e informe con comandos, modelo y límites. Codex revisa/prueba antes de integrar.
