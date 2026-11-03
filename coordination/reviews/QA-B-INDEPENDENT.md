# QA-B-PROPOSAL — revisión independiente y ajustes Codex

Entrega Antigravity: edf0d0b, integrada como70487f5. Modelo observado Flash Medium; tres archivos dentro del alcance. La UI real no se modificó. La comparación fue rectificada para reconocer el soporte unitario previo y limitar conclusiones de una lectura estática.

Hallazgos introducidos por el prototipo:
- P2: nombre/SKU de un nuevo producto se interpolaban sin escape en innerHTML. Ingresando un marcador img/onerror desde el formulario se ejecutó en ambos viewports. Se agregó escape de texto para nombre/SKU/categoría/ítem. Datos del prototipo sólo en memoria, sin red externa ni acceso a datos reales.
- P2: el cálculo isReady || cantidad>0 impedía desmarcar Listo en artículos unitarios con cantidad positiva. Se cambió a confirmación explícita y editar cantidad invalida esa confirmación.

Las dos correcciones puntuales las hizo Codex sobre la copia coordinadora después de terminar Antigravity. No se atribuyen al ejecutor ni se ocultó el fallo inicial. QA-B-PREVIEW-BEFORE.json reproduce ambos; QA-B-PREVIEW-AFTER.json aprueba14/14 controles a390x844 y1024x768, cero pageerrors y cero peticiones externas. Capturas generadas para revisión visual. El helper del prototipo no corrige BUG-002 de la app real; ese cambio va en QA-E1 por Antigravity.

Aceptación técnica del prototipo, pendiente aceptación visual de Facu. Se solicitó elegir esta base o cambiar dirección. No implementa CRUD real, persistencia, historial, permisos, importación ni notificación; acciones ilustrativas rotuladas. Guardar/archivar son estado efímero y algunas acciones sólo muestran alertas. Los recuentos por categoría y límites del formulario son ilustrativos; la implementación debe seguir contrato C, incluyendo precio0, paso, SKU único y categorías configurables. No usar esta propuesta como especificación productiva completa ni prometer funcionalidades por la captura.

Pruebas de scroll/UI real siguen correspondientes a QA-A. No hubo DB/WhatsApp, deploy ni cambios en MiHuerta.
