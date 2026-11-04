# Nexo Pedidos

Hito actual: demo funcional local para validar con el comercio, con datos sintéticos y mensajes simulados. Una instalación por comercio, mismo código configurable; pilotos futuros unitarios, pesables y mixtos.

## Producto de la demo

- Cliente: catálogo dinámico, carrito y estimado; revisión explícita si cambia precio, paso o disponibilidad antes de confirmar; retiro o envío y seguimiento.
- Preparación: UNIDAD con cantidad y confirmación explícita; KG con kilos reales y gramos visibles; pedidos mixtos, progreso y cierre validado. Faltantes, agregar/quitar ítems, editar entrega y cancelar se conservan.
- Catálogo: alta, edición, códigos/SKU, categorías, pausa y archivo lógico. Cambio de unidad bloqueado si existen referencias; pedidos conservan snapshots.
- Datos locales: guardado crítico, error visible y reintento; recibo durable para recuperar un checkout aceptado tras limpieza parcial; catálogo corrupto bloqueado con recuperación y respaldo explícitos.
- Precio: estimado desde cantidad solicitada y precio histórico, provisional durante preparación y final al cerrar. Cero es un final válido; no se reemplaza por estimado.

El estado técnico comprobado y sus límites están en [el estado de entrega](../coordination/DELIVERY_STATUS.md). La aceptación comercial requiere recorrer la demo con el comercio; una suite automatizada no reemplaza esa validación.

## Mejora móvil e imágenes — 2026-11-04

- Cliente/Precios con grillas responsivas y búsqueda/filtros fijos; Operario mantiene una columna. Acceso único al carrito y cierre por controles accesibles o arrastre.
- Mis pedidos muestra todos los pedidos propios guardados, en curso e historial; el detalle seleccionado no cambia al llegar otro pedido.
- Una imagen opcional por producto, cargada desde archivo/foto en administración. Referencia `imagen_id` en catálogo y blobs JPEG en IndexedDB, sin base64 en localStorage. Alta, reemplazo y eliminación esperan confirmación durable; cancelación conserva la versión anterior.
- Límite entrada 15 MiB/25 megapíxeles, salida máxima 512 px por lado y 512 KiB. HEIC depende de decodificación nativa. No hay conversor, nube de imágenes ni archivos compartidos entre dispositivos.
- Cambio de identidad entre pestañas reinicia la presentación del carrito y los datos de entrega; no elimina el carrito nuevo de otro contexto.

Safari/iPhone físico y HEIC real quedan para validación del usuario. La emulación y Brave no prueban compatibilidad física de Safari.

## Etapas posteriores

Antes de pedidos reales: entorno propio de pruebas, Auth/RLS, aceptación transaccional e idempotente del servidor, concurrencia, inventario/reservas si se acuerdan, perfil de negocio, entrega/pago separados y outbox WhatsApp. El PIN local no resuelve permisos y la disponibilidad booleana no es inventario.

El importador definitivo espera relevamiento y muestra anonimizada del cliente; no hay parser Excel prometido. Fuera de esta demo: SaaS multicliente, fiscal, lotes, vencimientos, múltiples depósitos, IA conversacional y despliegue productivo. No se promete stock cuantitativo, operación transaccional sin red ni entrega de mensajes exactamente una vez.
