# Entrega móvil de Nexo — 2026-11-04

Estado: integrada y verificada para demo local sintética. Fuente canónica: D:/Escritorio/nexo-pedidos, sin commit/push/deploy. La raíz pública regenerada coincide byte por byte con el bundle probado y con el servidor activo en puerto3000.

## Cambios entregados

- Cliente y Precios: grillas desde360px; controles de búsqueda/filtros fijos y encabezados compactos. Operario conserva una columna. Zoom permitido y controles táctiles legibles.
- Carrito: un único acceso, cierre visible/fondo/Escape/arrastre, cancelación y reversión del gesto, foco y scroll restaurados, fondo inerte. Cambiar de identidad entre pestañas reinicia la presentación y los datos de entrega.
- Mis pedidos: en curso e historial propios, selección explícita, detalle y estado estable al llegar otros pedidos. En la comprobación por extensión del navegador habitual aparecieron los tres pedidos guardados, sin crear ni eliminar pedidos.
- Imágenes opcionales desde administración: foto/archivo, preview, reemplazo/quitar/cancelar, persistencia IDB separada del catálogo, rollback, cuota y carreras de procesamiento. Durante guardado el formulario queda bloqueado y recupera los estados de controles tras un fallo.
- Precios: edición directa de importe y Editar; disponibilidad, ajustes de precio y archivo/restauración dentro del formulario. Archivo conserva campos pendientes. Se corrigió el contraste del rol activo.
- La descripción secundaria se conserva en escritorio y se oculta en tarjetas móviles. Se mantuvieron snapshots, validaciones, total estimado/provisional/final y garantías locales de checkout.

## Evidencia independiente

| Verificación | Resultado |
|---|---|
| Móvil claro / oscuro, seis anchos360/375/390/430/768/1024 |54/54 por tema|
| Imágenes, incluido Quitar durante conversión |19/19|
| Contraste activo claro / oscuro |1/1 por tema,17.85:1|
| Checkout UI con fallos/reintentos |5/5 escenarios|
| Persistencia de checkout |106/106|
| Recuperación de catálogo |69/69|
| Renderizado seguro, snapshots e IDs especiales |10/10|
| Base de dominio y servidor |demo17/static24/store72/phone18/dominio15/helper8/preparación2 y XSS8 aprobados|
| Extensión de Brave |catálogo390, filtros tras scroll, cierre/foco y Mis pedidos comprobados|
| HTTP activo |index/bundle200 y rutas Git/worker403|

Los reportes y capturas están en [bugs/mobile-release](bugs/mobile-release). No sumar estos números como cobertura: verifican capas distintas. La prueba de layout ahora usa navegador real con tamaños emulados; el nombre iPhone13Pro no significa prueba en hardware Safari.

Bundle SHA-256: `e5992b1a929ee933dd5e87459a920edd61dd80bbe47f11595ee43e69f024b65f`. [Manifiesto](reviews/MOBILE_RELEASE_MANIFEST.json).

## Trabajo y revisión

Antigravity implementó los paquetes principales en worktree mobile-images. Codex coordinó, detuvo al escritor antes de integrar, revisó y corrigió identidad entre pestañas, bloqueo al quitar durante procesamiento y contraste activo. Agentes independientes de UX y QA reprodujeron fallos antes y después. Se usaron Ponytail/Deslop para acotar el diff y retirar una referencia DOM muerta y BOMs nuevos; security-review, webapp-testing, computer-use y graphify (búsqueda directa porque Nexo no tiene grafo). Sin dependencias nuevas ni cambios de modelo/permisos.

La integración verificó hashes previos de cada archivo de la fuente para conservar cambios ajenos. Sólo se copiaron archivos de producto/pruebas/documentación del encargo, no los worktrees completos. Se preservaron quality/review/mobile-images. MiHuerta no se modificó.

## Lo que falta validar con Facu

Probar en Safari del iPhone13Pro: barras expandidas/retraídas, teclado, rotación, arrastre y selección/orientación de fotos reales. HEIC real no se verificó. [Recorrido breve](../docs/MOBILE_DEMO.md).

Catálogo, pedidos y fotos siguen siendo locales por navegador y origen. No se implementó sincronización PC/teléfono, autenticación de servidor ni WhatsApp real. Los recursos de diseño siguen usando CDN/fuentes. No hay despliegue productivo ni importador nuevo.


Publicación posterior: Facu autorizó guardar y actualizar GitHub con esta candidata el 2026-11-04. Las menciones sin commit/push describen el checkpoint previo; consultar el historial Git para la publicación. No se autorizó ni ejecutó despliegue en este cierre.
