# Mapa real del repositorio — Nexo Pedidos v2

Base actualizada: rama `V2` (2026-11-10) con todos los paquetes `V2-00` a `V2-07` integrados y verificados.

## Componentes Principales

| Ruta | Rol |
|---|---|
| `index.html`, `css/style.css` | Shell web / SPA móvil (touch targets >= 44 px, inputs >= 16 px, cero overflow horizontal) |
| `js/app.js` | Router de vistas (`cliente`, `operario`, `admin`), compuerta de PIN y sincronización de tema |
| `js/config.js` / `js/public-config.js` | Resolución y validación fail-closed de configuración pública (`demo` vs `production`) |
| `js/products-data.js` | Catálogo semilla `INITIAL_PRODUCTS` con campos de inventario (`controlar_stock`, `stock_actual`, `stock_reservado`) |
| `js/csv-parser.js` | Parser RFC 4180 sin dependencias (`parseCatalogTabular`, `buildCatalogImportPreview`) para importación CSV/TSV (`V2-05`) |
| `js/images.js` | Pipeline híbrido de imágenes: compresión WebP/JPEG a 512 px, IndexedDB en demo y bucket `product-images` en Supabase Storage en producción (`V2-03`) |
| `js/store.js` | Estado central reactivo (`localStorage` + Supabase REST/RPC + Realtime) |
| `js/views/client.js` | Catálogo móvil, control de stock disponible, horarios/mínimo de compra, medio de pago y seguimiento de pedidos |
| `js/views/operator.js` | Kanban de preparación, toma exclusiva (`version`/`tomado_por`), balanza kg/g, controles de cobro y estado/reintento de WhatsApp Outbox |
| `js/views/admin.js` | CRUD de catálogo e inventario, importador masivo con vista previa, editor de `comercio_config` y cambio de PIN (`update_staff_pin`) |
| `js/bundle.js` | Bundle unificado en UTF-8 sin BOM generado por `build-bundle.ps1` |
| `supabase/schema.sql` | Esquema completo v2 (`clientes`, `productos`, `pedidos`, `comercio_config`, `whatsapp_outbox`, `nexo_secrets`), RPCs transaccionales, triggers, RLS y Realtime |
| `bot/index.js` | Worker de WhatsApp (Baileys) con procesamiento de `whatsapp_outbox` (`claim_whatsapp_outbox_batch`), backoff exponencial y servidor local |
| `scripts/build-public.mjs` | Builder de allowlist estricta hacia `dist/public` |

## Flujo Real en Nexo Pedidos v2

1. **Catálogo e Inventario (`V2-03`, `V2-05`, `V2-06`)**:
   - `js/store.js` carga `productos` y `comercio_config`.
   - En Admin (`js/views/admin.js`), el usuario puede crear/editar productos individualmente (incluyendo `controlar_stock` y `stock_actual`) o importar planillas CSV/TSV mediante `js/csv-parser.js` con vista previa sin escritura y aplicación por lote (`importCatalogBatch`) que preserva snapshots históricos.
2. **Carrito y Checkout Autoritativo (`V2-02`, `V2-04`, `V2-06`)**:
   - `client.js` valida topes de stock disponible (`stock_actual - stock_reservado`), monto de `compra_minima` y selección de `metodo_pago`.
   - En producción, `syncOrderToSupabase` invoca el RPC `public.create_order_atomic`, que verifica disponibilidad, reserva stock atómicamente (`stock_reservado`), toma el precio real desde `public.productos` y garantiza idempotencia por `checkout_cart_key`.
3. **Privacidad y Seguridad RLS (`V2-01`)**:
   - Las tablas `pedidos`, `clientes`, `productos`, `comercio_config` y `whatsapp_outbox` tienen RLS activo.
   - Las operaciones de personal verifican `public.verify_staff_pin_header()` (`x-nexo-staff-pin`) contra `public.nexo_secrets`.
   - Las consultas de clientes filtran por `x-nexo-client-phone`.
4. **Preparación, Toma Exclusiva y Balanza (`V2-02`, `V2-04`, `V2-06`)**:
   - `store.takeOrder` aplica bloqueo optimista (`version` + `tomado_por`) para que dos operarios no tomen el mismo pedido.
   - Al finalizar el pesaje (`finalizeOrderWeighing` / `finalize_order_stock_rpc`), se libera `stock_reservado` y se descuenta el peso/cantidad real de `stock_actual`. Si se cancela (`cancelOrder` / `release_order_stock_rpc`), se libera la reserva una sola vez.
   - El cobro (`estado_pago`: `PENDIENTE`, `INFORMADO`, `COBRADO`) se gestiona de forma desacoplada de la entrega (`updateOrderPayment`).
5. **WhatsApp Outbox Durable (`V2-07`)**:
   - Al pasar un pedido a `LISTO`, el trigger `trigger_order_ready_outbox` encola el mensaje en `public.whatsapp_outbox`.
   - `bot/index.js` reclama mensajes con `claim_whatsapp_outbox_batch` (`FOR UPDATE SKIP LOCKED`), marca `SENT` o `FAILED` con backoff exponencial y registra `ultimo_error`.
   - `operator.js` muestra el badge de estado de outbox, intentos, último error y el botón de reintento manual (`store.retryWhatsAppOutbox`).
