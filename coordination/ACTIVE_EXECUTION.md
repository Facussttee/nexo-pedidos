# Estado de ejecución — Nexo Pedidos

## Estado comprobado
- Coordinador: D:\Escritorio\nexo-pedidos, rama codex/np-coordination.
- Antigravity: único proyecto Nexo Pedidos; chat QA Plan Nexo Pedidos conservado. E0, NP-002 y NP-003 retirados de la interfaz con autorización, incluidos sus chats de prueba.
- Nuevo chat de teamwork: Coordinación Nexo Pedidos Quality Teamwork. Encargo limitado a revisión y preparación, sin modificar archivos. Modelo principal observado Gemini 3.8 Flash Medium; no afirmar modelos ni resultados de investigadores sin verificarlos.
- Skills deslop, webapp-testing y web-design-guidelines instaladas en ~/.gemini/config/skills y verificadas contra las copias locales. Descubrimiento efectivo por el ejecutor pendiente de su confirmación.
- MiHuerta y sus servicios productivos quedan fuera del alcance.

## Completado
- Demo aislada y servidor estático integrados.
- Scroll aceptado previamente: 48 controles independientes en seis tamaños de pantalla; no prueba de Safari ni de tablet física.
- Propuesta QA-B aprobada por Facu: usar la base visual y ajustar detalles. Falta implementar la UI real de preparación y administración.

## Seguridad QA-E1: NO ACEPTADA para integración
- Antigravity terminó el commit a045bc9 en codex/quality-navigation; worktree limpio observado.
- Revisión independiente de Codex y navegador sobre a045bc9: 7 de 8 controles pasan, pero el catálogo ejecuta el marcador XSS en nombre, detalle y categoría. Resultado XSS_ACCEPTANCE_AFTER_E1.json, pass=false, proceso exit 1.
- No integrar a045bc9 hasta completar cobertura y repetir aceptación. También quedan sin escape item.categoria en carrito y item.nombre en preparación (revisión estática; faltan pruebas específicas).
- El diff además quitó el signo $ en las opciones del selector de productos del operario. Restaurarlo en el seguimiento.
- Pasada deslop: comentarios narrativos y alias escapeAttr sin uso en vistas; no se alteró código durante esta revisión. Deslop no sustituye revisión de seguridad.
- Copia independiente de revisión: D:\Escritorio\nexo-pedidos-worktrees\review, detached a045bc9. La prueba cerró su servidor y navegador en finally.

## Próximo bloque de implementación
1. Completar QA-E1 en Antigravity, un único escritor; revisión independiente antes de integrar.
2. QA-E3: BUG-005, pérdida silenciosa de pedido ante fallo de almacenamiento. Paquete preparado; no despachado para implementación.
3. BUG-006: total final cero mostrado como estimado. Reproducción guardada; sin corrección.
4. QA-E2: BUG-003, catálogo corrupto. Paquete preparado; no despachado.
5. Implementar preparación por unidades/peso y administración sobre QA-B aprobada.
6. Importador definitivo después del relevamiento con el comercio y muestra anonimizada.

## Git y publicación
- E0, NP-002 y NP-003 tienen todos sus cambios equivalentes presentes en origin/main; conservar sus puntas con tags archive/* antes de retirar las ramas locales.
- Publicar coordinación y evidencia en origin/main privado, autorización vigente de Facu. No desplegar.
- Alinear main local con origin/main de Nexo y corregir seguimiento heredado de upstream/MiHuerta.
- Seguridad queda pendiente; no fusionar toda quality-navigation porque contiene historia ya integrada por cherry-pick.

## Límites operativos
Sin DB real, mensajes reales, bot/index.js, seeds, despliegue ni cambios de permisos. PIN local no equivale a autenticación. Próxima etapa Supabase requiere entorno de pruebas y validación real de permisos y persistencia.