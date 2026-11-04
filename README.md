# Nexo Pedidos

Demo funcional para validar pedidos con un comercio. Una instalación independiente por negocio, derivada de [MiHuerta](https://github.com/Facussttee/MiHuerta).

El cliente arma un pedido estimado; el operario prepara productos por unidad o peso y confirma el total final. Administración permite crear, editar, pausar y archivar productos, con categorías y códigos/SKU. Los pedidos conservan sus nombres, unidades y precios históricos cuando cambia el catálogo.

## Abrir la demo

Con Node.js disponible, desde la carpeta de este proyecto:

```powershell
node bot/serve-demo.js --host 127.0.0.1 --port 3000
```

Abrir `http://127.0.0.1:3000/?demo=1`. Usar el cliente sintético de acceso rápido o completar un cliente de prueba. Las pestañas superiores cambian entre Cliente, Operario y Precios. El PIN inicial del personal es `1234`; es un bloqueo local de interfaz.

No hace falta instalar las dependencias del bot ni configurar Supabase. Para detener el servidor, Ctrl+C. La demo guarda en el navegador y usa datos sintéticos y WhatsApp simulado. No ingresar datos reales.

## Experiencia móvil e imágenes

Cliente y Precios muestran dos productos por fila desde 360 px; búsqueda y filtros quedan arriba al desplazarse. El carrito tiene un único acceso y admite Cerrar, Escape, fondo y arrastre hacia abajo. Mis pedidos separa pedidos en curso e historial del cliente actual.

En Precios → Editar (o Nuevo producto), usar Agregar foto, elegir archivo y Guardar. Permite reemplazar y quitar la foto; Cancelar conserva la versión anterior. La selección del teléfono puede ofrecer cámara o galería según el navegador. JPEG, PNG y WebP; HEIC sólo si el navegador puede decodificarlo. Las imágenes se optimizan localmente.

Pedidos, catálogo y fotos pertenecen al navegador y origen actuales: no se comparten entre PC y teléfono. Cambiar IP/puerto o borrar los datos del navegador puede hacer que dejen de estar disponibles. No es un respaldo ni sincronización entre dispositivos.

Guía y límites: [demo móvil](docs/MOBILE_DEMO.md). Evidencia de la revisión: [entrega móvil](coordination/DELIVERY_MOBILE.md).

## Recorrido para validar con el comercio

1. En Precios, crear un producto por unidad y otro por kilo; probar una categoría nueva y un SKU con ceros iniciales.
2. En Cliente, agregar ambos al carrito, revisar el estimado y confirmar retiro o envío.
3. En Operario, tomar el pedido. Confirmar las unidades con Listo e ingresar el peso real en kg; el equivalente en gramos aparece debajo.
4. Probar un faltante, agregar/quitar un ítem y corregir entrega. No se permite finalizar con ítems sin resolver.
5. Finalizar y comparar el estimado con el total preparado. Un total final de cero sigue siendo cero.
6. Usar WhatsApp simulado y marcar el pedido entregado. Después editar o archivar el producto y comprobar que el pedido conserva sus datos.

Si falla el guardado del pedido, el carrito permanece disponible para reintentar. Si se guardó el pedido pero falló la limpieza posterior, la demo identifica el pedido recibido y evita duplicarlo al reintentar. Estas garantías son locales; no equivalen a transacciones entre dispositivos.

Si el catálogo está corrupto, se muestra un aviso y una recuperación explícita. Antes de recuperar se guarda una copia del original; se conservan las filas válidas y, si no hay ninguna, se usa el catálogo sintético.

## Build y pruebas locales

Probado en el entorno local con Node.js 26.13.0:

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
```

Las pruebas de navegador y sus reportes están en `coordination/reviews` y `coordination/bugs`; usan Playwright/Brave del entorno de QA. No son requisitos para iniciar la demo.

`index.html` carga el bundle clásico para conservar compatibilidad con apertura local. Regenerarlo siempre que cambie un módulo JS. El servidor publica exclusivamente `dist/public`, construido mediante una lista de cuatro activos; nunca servir la raíz Git.

## Alcance de esta entrega

Es una demo local para validar experiencia y operación. Disponibilidad significa activo/pausado, no inventario cuantitativo. El PIN no es autenticación de servidor. Auth/RLS, transacciones remotas, reservas, pagos separados y WhatsApp durable quedan para una etapa posterior; el checkout real está bloqueado en esta entrega.

La presentación utiliza Tailwind Play CDN y Google Fonts. Necesita conexión para esos recursos visuales; no se promete funcionamiento autónomo sin red.

No ejecutar `bot/index.js`, `bot/seed.js`, `bot/test-mock.js` ni `bot/test-order-flow.js` para probar esta demo: son rutas de integración con efectos externos. MiHuerta y sus servicios quedan fuera de este proyecto.

## Documentación

- [Estado de entrega, evidencia y atención requerida](coordination/DELIVERY_STATUS.md)
- [Producto y límites](docs/PRODUCT.md)
- [Demo y configuración pública](docs/DEMO.md)
- [Servidor estático](docs/STATIC_SERVER.md)
- [Tablero](coordination/BOARD.md)
- [Historial del primer checkpoint](coordination/CHECKPOINT.md)
- [Relevamiento para una futura importación](docs/RELEVAMIENTO_IMPORTACION.md)

Los documentos `docs/01` a `docs/05`, `PROJECT.md` y `AGENT.md` conservan contexto histórico de MiHuerta. Las reglas de esta copia están en `AGENTS.md`. El repositorio independiente es privado: [Facussttee/nexo-pedidos](https://github.com/Facussttee/nexo-pedidos). No se asignó una licencia nueva.
