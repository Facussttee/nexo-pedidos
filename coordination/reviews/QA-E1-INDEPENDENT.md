# QA-E1 — revisión independiente de integración

Commit revisado: a045bc9, base edf0d0b. Decisión: no integrar todavía.

Prueba: node coordination/reviews/xss-acceptance.cjs <worktree-review> coordination/bugs/XSS_ACCEPTANCE_AFTER_E1.json --expect-fixed
Resultado: exit 1; siete controles aprobados y uno fallido. Catálogo: marker=1, img[onerror]=3. Sin errores JavaScript ni destinos externos inesperados.

Cobertura faltante en js/views/client.js: líneas 585 (categoría), 599 (nombre), 603 (detalle), 892 (categoría del carrito). En js/views/operator.js:315 falta escapar nombre del ítem. Revisar también atributos de productos del selector, manteniendo los valores originales en datos y escapando al renderizar.

Regresión introducida en operator.js:450: falta el signo $ antes del precio del producto en el selector.

Seguimiento para Antigravity: completar los campos, ampliar pruebas de catálogo/carrito/preparación, restaurar moneda, aplicar deslop de alcance limitado y regenerar bundle desde el worktree propio. No modificar store ni mezclar QA-E3. No publicar hasta aceptación independiente.

Deslop: js/html.js contiene comentarios que repiten la implementación y escapeAttr es un alias usado por tests pero no por vistas. No cambié código: simplificar comentarios es neutral; decidir el contrato del alias antes de retirarlo. No existe una invocación autoreview comprobada en este entorno; la revisión de corrección se hizo explícitamente, sin inventar comandos.

Esta ejecución no modifica la tarea principal de Antigravity ni atribuye al ejecutor las comprobaciones de Codex.