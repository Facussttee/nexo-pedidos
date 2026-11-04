# QA-E3 — fallo de persistencia en checkout (BUG-005)

Preparado, NO enviado. Ejecutar secuencialmente tras revisar E1 y comprobar worktree limpio; priorizar antes de E2 por pérdida de carrito P1. Antigravity único escritor, FlashMedium observado o modelo económico verificado antes del turno. No ampliar UI visual/CRUD ni tocar DB/WhatsApp reales.

Leer BUG-005.md y PERSISTENCE_BEFORE.json del coordinador. Codex reprodujo error con1 fallo de setItem de orders:2 pedidos antes/después y carrito borrado, sin aviso. No sustituir este fallo por una prueba de parseo ni por logs silenciosos.

Resultado requerido:
- Persistir pedido local de demo es un paso crítico con resultado explícito. Si falla, no marcar creado, no vaciar carrito, no cambiar activeOrder, no sync/sonido/notificaciones ni dejar pedido fantasma en fallback. Mostrar error visible con reintento; preservar datos previos y cantidades.
- Restaurar almacenamiento y reintentar crea exactamente1pedido y limpia carrito sólo después de guardar. Repetir confirmación/reintento no crea duplicados por el mismo intento. Probar error en orders solo y bloqueo de todas las escrituras al confirmar, con datos ya sembrados.
- Si se mantiene fallback de demo para otras claves, distinguir memoria temporal de almacenamiento durable con aviso claro y getters coherentes; no usarlo para simular confirmación de pedido. No rehacer safeGet indiscriminadamente ni borrar catálogo/pedidos/clientes/config.
- Si falla cleanup posterior (quitar carrito/guardar activeId) después de guardar orden, no anunciar que el pedido falló ni permitir duplicarlo por reintentar ciegamente: identificar pedido ya aceptado y guiar recuperación. Exponer límites de atomicidad local; no prometer transacción multiclave en localStorage.
- Producción sigue condicionada a confirmación/transacción de servidor; NO presentar esta mejora local como solución de Auth/RLS/idempotencia remota. Sin endpoints ni migraciones.

Archivos permitidos: js/store.js (persistencia crítica/resultado y checkout), js/views/client.js sólo resultado/error/reintento checkout, js/app.js sólo aviso de memoria temporal si hace falta, js/bundle.js generado, tests nuevos de persistencia/checkout y coordinación QA-E3/BUG005. No prototipo, SQL/bot/BOARD ni red real. Explicar ampliación concreta antes de tocar otros archivos.

Pruebas de navegador con fallos inyectados en almacenamiento local, estado antes/después y recarga; contrato de no pérdida/no duplicado comprobado, no sólo buscar strings. Probar éxito normal y fallo crítico/reintento/caso cleanup fallido. Regresiones aisladas demo17 static24 store71 phone18, XSS/navegación/catálogo pertinentes. Build de ESTEworktree y sintaxis bundle. Commit local e informe con modelo, evidencias y límites. Codex revisa y prueba por separado antes de integrar.


Checkpoint 2026-11-04: E1 aceptado e integrado sin commit; se permite continuar sobre ese diff aceptado en quality, único escritor. Prueba independiente ya escrita y roja: coordination/reviews/checkout-storage-acceptance.mjs, baseline CHECKOUT_STORAGE_BASELINE.json (15 fallos). No rehacerla ni confundir con UI; Codex verificará aviso/reintento en navegador. En este turno no hacer commit. Preservar E1 y no tocar sus tests ni ampliar UI.
