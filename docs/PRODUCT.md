# Nexo Pedidos v1 — Especificación de Producto

Nexo Pedidos es una solución móvil integral de toma de pedidos, preparación en balanza y administración de catálogo para comercios de cercanía (verdulerías, carnicerías, dietéticas, fiambrerías y afines).

Diseñado bajo la premisa de **una instalación por comercio con costo cero de mantenimiento fijo**: opera como una Progressive Web App (PWA) serverless alojada en **Vercel** con backend en **Supabase** (PostgreSQL + Realtime).

---

## 🎯 Pilares del Producto

### 1. Experiencia del Cliente (Catálogo y Compra)
- **Catálogo móvil adaptable**: Navegación en 2 columnas desde 360 px, buscador reactivo por nombre o código SKU, y filtros por categorías configurables.
- **Doble modalidad de venta**:
  - *Pesables (KG)*: Selección por pasos fraccionados (ej. 0.25 kg o 0.5 kg).
  - *Unitarios (UNIDAD)*: Selección por enteros (paso 1 u).
- **Transparencia en precios**: El cliente comprende que el importe del pedido es un **estimado previo**, sujeto al pesaje final en la balanza del local.
- **Carrito con control de cambios**: Detección de modificaciones de catálogo previas a la confirmación (si un precio o disponibilidad cambia mientras el cliente armaba el carrito, se solicita confirmación explícita para evitar discrepancias).
- **Historial e identidad**: Identificación por número telefónico y consulta en tiempo real de pedidos en curso y compras anteriores.

### 2. Mostrador y Balanza (Operador)
- **Tablero Kanban en tiempo real**: Los pedidos ingresan automáticamente en la columna *Pendientes* sin necesidad de recargar la página.
- **Alerta sonora**: Chime de audio inmediato al recibir un nuevo pedido vía Supabase Realtime.
- **Proceso de pesaje en balanza**:
  - Para productos en `KG`: el operario ingresa los kilos reales pesados; el sistema muestra el equivalente en gramos y recalcula el subtotal exacto.
  - Para productos en `UNIDAD`: confirmación rápida de cantidad.
- **Resolución de contingencias en el local**:
  - *Faltantes*: opción de marcar ítem "Sin stock" (subtotal $0 automático).
  - *Ajustes de pedido*: sumar productos olvidados o quitar ítems a pedido del cliente.
  - *Modalidad de entrega*: cambiar entre Retiro en Mostrador y Envío a Domicilio.
- **Cierre y Total Real**: Cálculo final riguroso en balanza. Si un pedido queda en $0 por faltantes, el total final de cero se respeta sin fallback a estimaciones anteriores.

### 3. Administración Comercial
- **Control de catálogo**: Alta, edición de precios, activación/pausa de stock y archivado lógico.
- **Integridad de pedidos históricos**: La edición de precio o unidad en un producto no altera los nombres, precios ni subtotales históricos de pedidos ya confirmados.
- **Imágenes optimizadas**: Admite foto por producto desde cámara o archivo, procesada y comprimida en el navegador (512x512 px) y almacenada en IndexedDB local.
- **PIN de mostrador**: Protección con PIN numérico para evitar manipulaciones no autorizadas en dispositivos del local.

### 4. Notificaciones y WhatsApp
- **Despacho Web Asistido**: Apertura de enlace directo `https://wa.me/...` con el mensaje del ticket completo ya redactado (detalle pesado ítem por ítem, total exacto, modalidad y alias bancario). No requiere dependencias de servidor.
- **Bot Autónomo en Segundo Plano**: Servicio Node.js opcional (`bot/index.js`) con conexión Baileys QR que escucha eventos de Supabase Realtime y despacha los mensajes de WhatsApp sin intervención humana al momento de marcar el pedido como *Listo*.

---

## 🗄️ Modelo de Datos en Supabase (Producción)

1. **`public.clientes`**: Registro de clientes (`telefono` PK, `nombre`, `direccion`, `updated_at`).
2. **`public.productos`**: Catálogo comercial (`id` PK, `nombre`, `categoria`, `unidad_medida`, `precio`, `disponible`, `paso`, `codigo`, `detalle`, `archivado`, `imagen_id`, `updated_at`).
3. **`public.pedidos`**: Cabecera y detalle de pedidos (`id SERIAL` PK iniciando en 101, `cliente_telefono`, `cliente_nombre`, `tipo_entrega`, `direccion_entrega`, `estado`, `total_estimado`, `total_real`, `items JSONB`, `checkout_cart_key`, `notificado_whatsapp`, `fecha`, `updated_at`).
4. **Seguridad y Políticas**: Row Level Security (RLS) activo con políticas de acceso público controladas para la clave `anon`/`publishable`.
5. **Publicación Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos, public.productos;` con `REPLICA IDENTITY FULL`.

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

