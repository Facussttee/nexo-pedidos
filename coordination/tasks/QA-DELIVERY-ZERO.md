# QA-DELIVERY-ZERO — total final cero en demo (BUG-006)

Autor: Codex. Estado: preparado, NO despachado. Antigravity es el implementador principal; ejecutar secuencialmente después de revisar QA-E1 y comprobar worktree limpio. No superponer escritores ni iniciar otro paquete mientras este siga activo. Sin commits, push ni despliegue en este encargo.

Leer coordination/bugs/BUG-006.md, ZERO_TOTAL_BEFORE.json y zero-total-probe.cjs del coordinador. La reproducción sintética confirma total_real = 0 almacenado, pero Listos, Cobrados y WhatsApp simulado muestran el estimado de $1.200.

Resultado requerido:
- Corregir únicamente los tres fallbacks de js/views/operator.js: tarjetas de Listos y Cobrados y generateWhatsAppSummary (actualmente líneas 544, 602 y 721). Elegir total_estimado sólo si total_real es null o undefined; conservar 0 y cualquier total final positivo válido. No usar truthiness ni convertir un cero en ausencia.
- Mantener datos originales y snapshots del pedido: no modificar total_real, total_estimado, importes por ítem, cantidades, historial ni estado para arreglar la presentación. No cambiar diseño, etiquetas, estados de pago/entrega ni preparación. La etiqueta Cobrados heredada no constituye una implementación de pagos separados.
- Mantener simulación aislada: vista previa y registro del mensaje simulado deben usar el mismo total correcto. No abrir wa.me, enviar mensajes ni conectar Supabase o worker.

Archivos permitidos para implementar: js/views/operator.js, js/bundle.js generado desde ESTE worktree, regresión acotada para BUG-006, coordination/results/QA-DELIVERY-ZERO.md y actualización puntual de coordination/bugs/BUG-006.md. No store/config/CRUD/importador/prototipo/SQL/bot/BOARD ni archivos de MiHuerta. Si falta alcance, explicar el cambio necesario antes de editar otros archivos.

Aceptación:
1. Repetir flujo original: pedido sintético unitario con estimado $1.200 -> iniciar preparación -> marcar único ítem Sin Stock -> finalizar -> Listos -> simular WhatsApp -> marcar cobrado -> Cobrados. Las dos tarjetas, vista previa y texto registrado muestran $0; almacenamiento conserva total_real = 0 y snapshots previos. Recargar y verificar que sigue en cero.
2. Cubrir total_real positivo distinto del estimado, total_real = null y total_real ausente. Verificar ambos estados y resumen simulado: positivo conserva final; null/undefined usan estimado como fallback. No crear valores inválidos ni resolver NaN por sustitución silenciosa; si aparece un caso no finito, registrarlo por separado.
3. La regresión debe fallar contra el código anterior y pasar con la corrección. Registrar estado antes/después, texto real del mensaje simulado y ausencia de solicitudes externas de datos/pageerror; una búsqueda de strings no basta.
4. Regenerar bundle con powershell -ExecutionPolicy Bypass -File .\build-bundle.ps1 y validar node --check js/bundle.js. Ejecutar regresiones aisladas demo/static/store/phone y XSS/navegación pertinentes; informar resultados actuales, sin copiar conteos como prueba. Codex revisa y reproduce por separado antes de integrar.

Pendiente bloqueante para uso real: bot/index.js:222 contiene el fallback equivalente total_real || total_estimado || 0 (también aparece en su log, línea 335). Este paquete NO lo corrige y NO ejecuta bot/index.js. Su corrección y prueba aislada del renderer pertenecen a un paquete explícito del worker; faltan además Auth/RLS, confirmación transaccional e idempotente y outbox. La corrección de la demo no habilita producción ni demuestra entrega de WhatsApp.
