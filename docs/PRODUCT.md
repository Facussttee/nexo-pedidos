# Nexo Pedidos v2 — Especificación de Producto

Nexo Pedidos es una solución móvil integral de toma de pedidos, preparación en balanza, inventario cuantitativo y administración de catálogo para comercios de cercanía (verdulerías, carnicerías, dietéticas, fiambrerías y afines).

Diseñado bajo la premisa de **una instalación por comercio con costo cero de mantenimiento fijo**: opera como una Progressive Web App (PWA) serverless alojada en **Vercel** con backend en **Supabase** (PostgreSQL + Storage + Realtime).

---

## 🎯 Pilares del Producto

### 1. Experiencia del Cliente (Catálogo y Compra)
- **Catálogo móvil adaptable**: Navegación en 2 columnas desde 360 px, buscador reactivo por nombre o código SKU, y filtros por categorías configurables.
- **Doble modalidad de venta**:
  - *Pesables (KG)*: Selección por pasos fraccionados (ej. 0.25 kg o 0.5 kg).
  - *Unitarios (UNIDAD)*: Selección por enteros (paso 1 u).
- **Disponibilidad e inventario cuantitativo (`V2-06`)**: En productos con control de stock activo, el catálogo y el carrito aplican topes según el disponible real (`stock_actual - stock_reservado`) y exhiben el estado "Sin Stock".
- **Transparencia en precios y perfil del local (`V2-03`)**: Exhibición de horarios de atención, validación de compra mínima, cálculo automático de costo de envío y elección de medio de pago (`EFECTIVO`, `TRANSFERENCIA`, `OTRO`).
- **Checkout autoritativo e idempotente (`V2-02`)**: Confirmación atómica en servidor (`create_order_atomic`) que consulta los precios reales vigentes en `public.productos` y previene duplicados por reintentos de red (`checkout_cart_key`).
- **Privacidad e historial (`V2-01`)**: Identificación por número telefónico y consulta protegida por Row Level Security (`x-nexo-client-phone`) para que ningún tercero vea pedidos ajenos.

### 2. Mostrador, Balanza y Cobros (Operador)
- **Tablero Kanban en tiempo real**: Columnas *Entrantes*, *Preparación*, *Listos*, *Entregados* y *Cancelados* con alerta sonora inmediata vía Supabase Realtime.
- **Toma exclusiva de pedidos (`V2-02`)**: Bloqueo optimista (`version` y `tomado_por`) al comenzar preparación para evitar que dos operarios preparen el mismo pedido en simultáneo.
- **Proceso de pesaje y descuento físico de stock (`V2-06`)**:
  - Para productos en `KG`: ingreso de kilos reales pesados con equivalente en gramos y recálculo exacto.
  - Para productos en `UNIDAD`: confirmación rápida de cantidad.
  - Al finalizar el pesaje, se libera el `stock_reservado` y se descuenta el peso/cantidad real del `stock_actual`.
- **Separación de Entrega y Pago (`V2-04`)**:
  - Estado de cobro independiente (`PENDIENTE`, `INFORMADO`, `COBRADO`) y medio de pago editable en cada tarjeta.
  - Filtro rápido en cabecera para ver **Solo pendientes de cobro** en cualquier columna.
- **Resolución de contingencias en el local**:
  - *Faltantes*: opción de marcar ítem "Sin stock" (subtotal \$0 automático y respeto estricto de total \$0 final).
  - *Ajustes de pedido*: sumar productos olvidados, quitar ítems, corregir modalidad de entrega o cancelar liberando stock reservado una única vez.

### 3. Administración Comercial
- **Control de catálogo e inventario (`V2-06`)**: Alta, edición de precios, activación/pausa, archivado lógico y configuración de stock cuantitativo (`controlar_stock`, `stock_actual`, `stock_reservado` y disponible).
- **Importador masivo CSV/TSV con vista previa (`V2-05`)**: Carga masiva mediante parser RFC 4180 sin dependencias (`js/csv-parser.js`), preservando ceros iniciales en SKU, con modal de vista previa sin escritura (altas, actualizaciones y errores por fila), backup previo e inmutabilidad de snapshots históricos.
- **Imágenes híbridas Cloud/Local (`V2-03`)**: Foto por producto procesada y comprimida en el navegador (512x512 px), almacenada en IndexedDB en Modo Demo y en el bucket público `product-images` de Supabase Storage en Modo Producción.
- **Configuración del comercio en DB (`V2-03`)**: Edición desde Admin de nombre comercial, alias bancario, WhatsApp, costo de envío, compra mínima y horarios (`public.comercio_config`).
- **PIN de mostrador en servidor (`V2-01`)**: Protección verificada en PostgreSQL (`verify_staff_pin_header()`) y cambio de PIN transaccional mediante el RPC `update_staff_pin`.

### 4. Notificaciones y WhatsApp Outbox (`V2-07`)
- **Despacho Web Asistido**: Apertura de enlace directo `https://wa.me/...` con el mensaje del ticket completo ya redactado (detalle pesado ítem por ítem, total exacto, modalidad y alias bancario).
- **Cola Transaccional `whatsapp_outbox` y Bot Autónomo**: Al pasar un pedido a *Listo*, un trigger encola el aviso en `public.whatsapp_outbox`. El servicio `bot/index.js` reclama lotes atómicamente (`claim_whatsapp_outbox_batch` con `FOR UPDATE SKIP LOCKED`), aplica reintentos con backoff exponencial y reporta el estado (`PENDING`, `PROCESSING`, `SENT`, `FAILED`) y el último error en la tarjeta del operador, con botón de **Reintentar envío**.

---

## 🗄️ Modelo de Datos en Supabase (Producción v2)

1. **`public.clientes`**: Registro de clientes (`telefono` PK, `nombre`, `direccion`, `updated_at`), protegido por RLS (`clientes_select_restricted`, `clientes_update_restricted`).
2. **`public.productos`**: Catálogo comercial (`id` PK, `nombre`, `categoria`, `unidad_medida`, `precio`, `disponible`, `paso`, `codigo`, `detalle`, `archivado`, `imagen_id`, `imagen_url`, `controlar_stock`, `stock_actual`, `stock_reservado`, `updated_at`).
3. **`public.pedidos`**: Cabecera y detalle de pedidos (`id SERIAL` PK iniciando en 101, `cliente_telefono`, `cliente_nombre`, `tipo_entrega`, `direccion_entrega`, `estado`, `estado_pago`, `metodo_pago`, `total_estimado`, `total_real`, `items JSONB`, `checkout_cart_key`, `version`, `tomado_por`, `notificado_whatsapp`, `fecha`, `updated_at`).
4. **`public.comercio_config`**: Configuración singleton (`id = 1`, `nombre`, `alias`, `whatsapp`, `costo_envio`, `compra_minima`, `horarios`, `updated_at`).
5. **`public.whatsapp_outbox`**: Cola transaccional de notificaciones (`id SERIAL` PK, `pedido_id` UNIQUE FK, `telefono`, `mensaje`, `estado`, `intentos`, `ultimo_error`, `next_retry_at`, `created_at`, `updated_at`).
6. **`public.nexo_secrets`**: Almacén privado de secretos de servidor (`key` PK, `value`) sin acceso directo desde `anon`/`authenticated`, consultado por funciones `SECURITY DEFINER` (`verify_staff_pin_header`, `update_staff_pin`).
7. **Publicación Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos, public.productos, public.comercio_config, public.whatsapp_outbox;` con `REPLICA IDENTITY FULL`.

---

## 📦 Despliegue y Confinamiento

- **Vercel Serverless**: Servidor estático confinado sirviendo exclusivamente los archivos de `dist/public`.
- **Configuración pública sin secretos**: La configuración del navegador (`js/public-config.js`) solo contiene URLs y claves públicas anon; los secretos (`service_role`, contraseñas de DB) están estrictamente prohibidos y fallan el inicio si son detectados.
- **Modo Demo Aislado**: Capacidad de operar 100% desconectado con datos sintéticos (`mode: "demo"`) para demostraciones comerciales o entornos de pruebas sin red.

---

## 🗺️ Estado de Evolución: v1 (Entregado) vs. v2 (Próximas Tareas)

> [!NOTE]
> **Guía para chats y agentes de trabajo**:
> - **v1 + Hardening inicial (`d2fb02a`) está implementado**: Catálogo móvil 2 columnas, carrito con revalidación, Kanban en tiempo real, balanza en kg/g, total cero preservado, CRUD de catálogo con SKU y archivo lógico, fotos en IndexedDB, sanitización XSS (`escapeHtml`), ETag en servidor estático, `nexo_secrets` + `verify_staff_pin_header()` para proteger escritura de productos y trigger `enforce_order_rate_limit()` en Supabase.
> - Los documentos `docs/01` a `docs/05` son referencia histórica heredada de MiHuerta; los archivos en `coordination/` registran el checkpoint de demo local del 2026-11-04. Para el backlog vigente de **Nexo Pedidos v2**, guiarse por la tabla siguiente y por `PROJECT.md`.

### Backlog de Tareas v2

| ID | Paquete v2 | Estado | Qué resuelve / Criterio de aceptación |
|---|---|---|---|
| **V2-00** | Unificación Git, Deslop final y CI | **DONE** | Fusionados `quality-audit-remediation` (`d2fb02a`), deslop de vistas/bot y `Dockerfile`/CI en `main`; worktrees sincronizados y 8 suites en verde. |
| **V2-01** | Privacidad de Pedidos y RLS de Staff (ex NP-004) | **DONE** | Cerrados `SELECT`/`UPDATE` abiertos en `public.pedidos` y `public.clientes`. Exige `verify_staff_pin_header()` para mutaciones de operador, RPC `update_staff_pin` y cabecera de cliente (`82799a7`). |
| **V2-02** | Checkout Autoritativo y Toma Exclusiva (ex NP-005/008) | **DONE** | RPC transaccional `create_order_atomic` en PostgreSQL que calcula precios desde `public.productos`, valida idempotencia y aplica bloqueo optimista (`version`/`tomado_por`) (`156bacc`). |
| **V2-03** | Imágenes Cloud (Supabase Storage) y Perfil en DB (ex NP-006) | **DONE** | Subida de imágenes comprimidas (512px) a Supabase Storage (`product-images`) en producción (IndexedDB en demo) y tabla singleton `public.comercio_config` editable desde Admin (`19d13a8`). |
| **V2-04** | Separación de Entrega y Pago (ex NP-009) | **DONE** | Desacoplado estado de entrega (`PENDIENTE`, `EN_PREPARACION`, `LISTO`, `ENTREGADO`) de `estado_pago` (`PENDIENTE`, `INFORMADO`, `COBRADO`) y `metodo_pago` (`EFECTIVO`, `TRANSFERENCIA`, `OTRO`) (`6e173b0`). |
| **V2-05** | Importador Masivo CSV/Planilla (ex Paquete D) | **DONE** | Parser local RFC 4180 (`js/csv-parser.js`), modal de vista previa en Admin sin escritura previa, lote seguro `importCatalogBatch` y preservación de snapshots históricos (`8122876`). |
| **V2-06** | Inventario Cuantitativo y Reservas (ex NP-007) | **DONE** | Stock numérico opcional por producto (`controlar_stock`, `stock_actual`, `stock_reservado`), reserva al pedir, ajuste real en balanza y liberación única al cancelar (`9de9d59`). |
| **V2-07** | Outbox Durable de WhatsApp (ex NP-010) | **DONE** | Cola `public.whatsapp_outbox` con claim atómico (`FOR UPDATE SKIP LOCKED`), reintentos con backoff y estado/botón de reintento visible en la tarjeta del pedido (`85c4c62`). |

