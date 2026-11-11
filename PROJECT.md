# Project: Nexo Pedidos v1 — Mobile Order, Scale Weighing & Realtime Cloud System

## Architecture Overview
- **Client & Staff PWA**: Single Page Application with dynamic views (`client.js`, `operator.js`, `admin.js`), orchestrated by `app.js` and styled via `css/style.css` and Tailwind CSS Play CDN.
- **Design System & Ergonomics**: Plus Jakarta Sans typography, min 44x44px touch targets on all interactive elements, min 16px font inputs to prevent iOS auto-zoom, zero horizontal overflow (`overflow-x: clip`/`hidden`) across 360px-430px mobile viewports, and light/dark theme synchronization (`nexo_theme_v1`).
- **Cloud Backend & Realtime**: Integrated with **Supabase** (PostgreSQL + Realtime WebSockets):
  - `public.clientes`: Customer registry (`telefono`, `nombre`, `direccion`).
  - `public.productos`: Dynamic catalog with categories, SKU/codes, weight steps, availability, archiving, and local image IDs.
  - `public.pedidos`: Header and items JSONB with auto-incrementing serial ID (starting at #101) to eliminate multi-client order collision.
  - Realtime WebSockets: Immediate order push to Operator Kanban with audio alert; instant catalog updates across all views.
- **Dual WhatsApp Notification**:
  - Direct web dispatch (`wa.me`) without server dependencies, formatting exact weighed items, totals, and payment alias.
  - Autonomous Node.js daemon (`bot/index.js` using `@whiskeysockets/baileys`) subscribing to Supabase Realtime `LISTO` events.
- **Image Pipeline**: In-browser client-side image compression (max 512px, <= 512 KiB) stored in IndexedDB with local session cleanup, preventing local storage bloat.
- **Packaging & Confinement**: `build-bundle.ps1` consolidates modular JavaScript into `js/bundle.js` with UTF-8 encoding. Public build allowlist (`scripts/build-public.mjs`) confines output exclusively to `dist/public` for zero-cost serverless deployment on Vercel.

## Feature Inventory
| # | Feature | Description | State | Layer |
|---|---------|-------------|-------|-------|
| 1 | Client Catalog & Weight Stepper | Responsive 2-column mobile catalog with unit and fractional kg steppers (0.25 / 0.5 kg) | LIVE | `client.js`, `store.js` |
| 2 | Mobile Cart & Estimated Total | Side drawer cart with quick discard (×), delivery selection, and estimate disclaimer | LIVE | `client.js` |
| 3 | Operator Kanban Mostrador | Live order board categorized into Pendiente, En preparación, and Listo | LIVE | `operator.js` |
| 4 | Live Scale Weighing Flow | Real-weight input in kg with live gram readout, calculating exact balance total | LIVE | `operator.js`, `store.js` |
| 5 | Operational Item Flexibility | Mark item sin stock ($0 subtotal), add/remove items, adjust delivery mode | LIVE | `operator.js` |
| 6 | Admin Catalog & SKU Management | Add products, edit prices, pause availability, logical archive, and SKU codes | LIVE | `admin.js`, `store.js` |
| 7 | Product Image Optimization | Camera/gallery upload, client-side resize to 512px, IndexedDB blob storage | LIVE | `images.js`, `admin.js` |
| 8 | Cloud Persistence (Supabase) | PostgreSQL tables (`clientes`, `productos`, `pedidos`) with RLS and triggers | LIVE | `schema.sql`, `store.js` |
| 9 | Realtime WebSockets & Alerts | Bi-directional sync between Client, Operator, and Admin with audio chime on new orders | LIVE | `store.js`, Supabase |
| 10 | Serial Order ID Generation | Database-assigned sequential order numbers (#101+) avoiding client collisions | LIVE | `store.js`, Supabase |
| 11 | WhatsApp Assisted Web Dispatch | Direct `wa.me` URL generation with full weighed ticket, delivery info, and alias | LIVE | `operator.js`, `store.js` |
| 12 | Autonomous WhatsApp Bot | Baileys daemon with QR pairing, listening to Supabase Realtime `LISTO` events | LIVE | `bot/index.js` |
| 13 | Isolated Demo Mode Fallback | Zero-network synthetic mode for offline presentations and testing | LIVE | `config.js`, `demo-data.js` |
| 14 | Vercel Serverless Build | Build script generating public root allowlist with environment variable resolution | LIVE | `build-public.mjs` |

## Code Layout
- `js/app.js`: Application lifecycle, view router, theme listeners, staff PIN modal.
- `js/config.js`: Public configuration parser, strict production validation, demo network guard.
- `js/public-config.js`: Runtime public configuration (free of secrets).
- `js/store.js`: Reactive central state store, Supabase Realtime client, local storage cache.
- `js/images.js`: IndexedDB image storage and processing pipeline.
- `js/html.js`: HTML entity sanitizer mitigating XSS injections.
- `js/views/client.js`: Mobile customer catalog, interactive cart drawer, order history.
- `js/views/operator.js`: Kanban preparation board, weighing modal, live scale controls.
- `js/views/admin.js`: Product CRUD, category pills, price steppers, PIN lock settings.
- `supabase/schema.sql`: Production DDL script with RLS, triggers, indexes, and Realtime publications.
- `bot/`: WhatsApp connection service (`index.js`), demo server (`serve-demo.js`), static server (`static-server.js`).
- `scripts/build-public.mjs`: Strict allowlist builder for `dist/public`.
- `tests/`: Automated test suites for store logic, static server confinement, demo isolation, and cloud sync.

---

## Estado Actual de Sincronización (Auditoría Arquitectónica — 2026-11-09)

> [!IMPORTANT]
> **Aviso para todos los agentes y chats**:
> Los documentos históricos en `coordination/` (`BOARD.md`, `ACTIVE_EXECUTION.md`, `DELIVERY_STATUS.md`) reflejan el corte del **2026-11-04** (demo local) y los documentos `docs/01` a `docs/05` conservan textos heredados de MiHuerta. **La referencia canónica actualizada del estado v1 vs. v2 es esta sección y `docs/PRODUCT.md`.**
>
> **Estado de ramas y worktrees**:
> - **Raíz canónica (`D:\Escritorio\nexo-pedidos`)**: Rama `quality-audit-remediation` (`d2fb02a`) está 1 commit adelante de `main` (`4a6f49a`), incorporando remediaciones de calidad (deslop, ETag en servidor estático, security headers, RLS con `nexo_secrets` + `verify_staff_pin_header()` y rate-limiting de pedidos en DB), además de archivos nuevos sin trackear (`Dockerfile`, `.github/workflows/ci.yml`, `tests/load/`).
> - **Worktrees de Agent Orchestrator (`~/.ao/data/worktrees/nexo-pedidos/...`)**: Apuntan a `origin/main` (`4a6f49a`). Antes de despachar nuevas tareas v2, se debe fusionar `quality-audit-remediation` en `main` y actualizar los worktrees.
> - **Worktree `quality` (`D:\Escritorio\nexo-pedidos-worktrees\quality`)**: Contiene un snapshot previo (`b3e5111`) con ajustes locales de deslop sin comitear.

---

## Comparativa: Lo Hecho (v1 + Hardening) vs. Lo Pendiente (Roadmap v2)

| Área | Hecho en v1 + Remediación (`d2fb02a`) | Pendiente para v2 |
|---|---|---|
| **UX / Catálogo y Carrito** | Grilla móvil 2 col (360px+), steppers KG/UNIDAD, carrito con detección de cambios de precio/stock, historial por teléfono, modo claro/oscuro, touch >=44px, scroll validado. | Búsqueda avanzada, filtros combinados y sincronización de carrito/seguimiento por token seguro. |
| **Mostrador y Preparación** | Kanban en tiempo real, alerta sonora, pesaje en kg con gramos en vivo, confirmación unitaria, faltantes ($0 real respetado), edición de ítems y modalidad de entrega. | Toma exclusiva de pedido por operario (bloqueo optimista en servidor para que dos empleados no pesen el mismo pedido). |
| **Administración y Fotos** | CRUD de productos, SKU con ceros iniciales, categorías dinámicas, archivado lógico, fotos 512px en IndexedDB local. | **Imágenes en la nube (Supabase Storage)** para que las fotos subidas por el dueño se vean en los celulares de los clientes; configuración del perfil comercial en DB. |
| **Seguridad y Datos (RLS)** | Sanitización XSS (`escapeHtml`), persistencia durable en checkout, tabla `nexo_secrets`, RPC `verify_staff_pin_header()` para escritura de productos y trigger `enforce_order_rate_limit()`. | **Privacidad RLS en lectura/edición de pedidos y clientes** (`SELECT`/`UPDATE` en `pedidos` aún abiertos a `anon`), precios calculados autoritativamente en servidor y Auth real por roles (`owner`/`operator`). |
| **Pagos y Entregas** | Estado único lineal (`PENDIENTE` -> `EN_PREPARACION` -> `LISTO` -> `ENTREGADO` / `CANCELADO`). | **Separar Entrega y Pago**: permitir pedido entregado pendiente de cobro o pagado por transferencia antes de retirar (`estado_pago`, `metodo_pago`). |
| **Inventario** | Switch booleano (`disponible: true/false`). | **Stock cuantitativo opcional**: existencias físicas, reserva al pedir, ajuste en balanza y liberación al cancelar. |
| **Carga Masiva** | Contrato de relevamiento documentado (`docs/RELEVAMIENTO_IMPORTACION.md`). | **Importador CSV/Excel** con vista previa, validación por fila y actualización por SKU sin romper historial. |
| **WhatsApp y Bot** | Envío web asistido (`wa.me`) + Bot Baileys QR con reconexión, auto-purga 401 y alias dinámico. | **Outbox transaccional** con reintentos, lease atómico y estado de fallo visible en el tablero del operador. |

---

## Plan de Tareas para Nexo Pedidos v2 (Backlog Ordenado para Agentes)

Cada tarea está diseñada para ejecutarse en un worktree aislado siguiendo la filosofía Ponytail (cambio mínimo directo, pruebas aisladas y regeneración de `js/bundle.js`).

### Fase 0 — Higiene y Unificación de Base (Completada)
- **`V2-00` (Unificación Git, Deslop final y CI) — `DONE`**:
  - **Resultado**: Rama `quality-audit-remediation` (`d2fb02a`) y mejoras de deslop/accesibilidad (`app.js`, `operator.js`, `bot/index.js`, `bot/package.json`), junto con `Dockerfile`, `.dockerignore` y `.github/workflows/ci.yml`, unificados en `main` y sincronizados en los worktrees activos.
  - **Verificación**: 8 suites aisladas en verde (`test-production-supabase-sync`, `test-demo-isolation`, `test-static-server`, `test-delivery-store`, `test-phone-numeric-validation`, `test-store-state`, `test-html-escaping`, `test-preparation-input`).

### Fase 1 — Seguridad Autoritativa y Privacidad en Base de Datos (Prioridad Alta)
- **`V2-01` (Privacidad de Pedidos y RLS de Operador — ex NP-004)**:
  - **Problema**: En `supabase/schema.sql`, `pedidos_read_public` y `pedidos_update_valid` tienen `USING (true)` para `anon`. Cualquier cliente puede leer los últimos 50 pedidos o modificar estados vía API REST.
  - **Alcance**: `supabase/schema.sql`, `js/store.js`, `tests/test-production-supabase-sync.test.mjs`.
  - **Implementación**:
    1. Restringir `UPDATE` en `public.pedidos` exclusivamente a peticiones con `public.verify_staff_pin_header() = true` (o RPC de cancelación del propio cliente con token).
    2. Reemplazar lectura global de pedidos en vista cliente por consulta filtrada/token de seguimiento (`tracking_token` o RPC `get_customer_orders(telefono, token)`), permitiendo listado completo sólo cuando `verify_staff_pin_header()` sea válido.
    3. Permitir cambio de PIN de staff desde la vista Admin invocando RPC segura.
- **`V2-02` (Checkout Autoritativo en Servidor y Toma Exclusiva — ex NP-005 / NP-008)**:
  - **Problema**: El cliente envía precios y subtotales desde el navegador; dos operarios pueden tomar el mismo pedido a la vez.
  - **Alcance**: `supabase/schema.sql`, `js/store.js`, `js/views/operator.js`.
  - **Implementación**:
    1. Función RPC `create_order_atomic` que valide disponibilidad real en `public.productos`, tome el precio unitario de la base de datos (no del payload del cliente), garantice idempotencia por `checkout_cart_key` y calcule `total_estimado`.
    2. Agregar columna `version INT DEFAULT 1` y `tomado_por VARCHAR(60)` en `public.pedidos` para bloqueo optimista al pasar a `EN_PREPARACION`.

### Fase 2 — Operativa Comercial Real y Nube (Prioridad Media-Alta)
- **`V2-03` (Imágenes en Supabase Storage y Perfil Comercial en DB — ex NP-006)**:
  - **Problema**: Las fotos guardadas en `IndexedDB` solo existen en el dispositivo donde se cargaron; el nombre del local, alias y WhatsApp requieren rebuild/variables de entorno.
  - **Alcance**: `supabase/schema.sql`, `js/images.js`, `js/store.js`, `js/views/admin.js`, `js/views/client.js`.
  - **Implementación**:
    1. Soporte híbrido en `images.js`: en modo demo usa IndexedDB; en modo producción sube el blob comprimido (512px WebP/JPEG) al bucket público `product-images` de Supabase Storage y guarda `imagen_url` en `public.productos`.
    2. Tabla `public.comercio_config` (nombre, alias, teléfono WhatsApp, costo envío, compra mínima, horarios) editable desde Admin con PIN de staff.
- **`V2-04` (Separación de Entrega y Pago — ex NP-009)**:
  - **Problema**: Marcar un pedido como `ENTREGADO` no distingue si fue abonado o si queda pendiente de verificación de transferencia.
  - **Alcance**: `supabase/schema.sql`, `js/store.js`, `js/views/operator.js`, `js/views/client.js`.
  - **Implementación**:
    1. Añadir columnas `estado_pago` (`PENDIENTE`, `INFORMADO`, `COBRADO`) y `metodo_pago` (`EFECTIVO`, `TRANSFERENCIA`, `OTRO`) en `public.pedidos`.
    2. Controles rápidos en tarjeta de Operador para marcar cobro independiente de la entrega y filtro de pedidos con cobro pendiente.

### Fase 3 — Escalabilidad de Catálogo, Stock y Mensajería (Prioridad Media)
- **`V2-05` (Importador Masivo CSV/Planilla con Vista Previa — ex Paquete D)**:
  - **Alcance**: `js/views/admin.js`, `js/store.js`, `tests/test-catalog-import.test.mjs`.
  - **Implementación**: Parser local de CSV/TSV sin dependencias pesadas -> mapeo de columnas (`codigo`, `nombre`, `categoria`, `unidad_medida`, `precio`, `paso`, `disponible`) -> modal de previsualización (altas, actualizaciones por SKU, errores de fila) -> aplicación transaccional respetando snapshots de pedidos históricos.
- **`V2-06` (Inventario Cuantitativo y Reservas Opcionales — ex NP-007)**:
  - **Alcance**: `supabase/schema.sql`, `js/store.js`, `js/views/admin.js`, `js/views/operator.js`.
  - **Implementación**: Columnas opcionales `controlar_stock BOOLEAN DEFAULT FALSE`, `stock_actual NUMERIC(10,3)`, `stock_reservado NUMERIC(10,3)`. Reserva al crear pedido, ajuste al confirmar pesaje real y liberación única al cancelar.
- **`V2-07` (Outbox Durable de WhatsApp y Estado de Notificación — ex NP-010)**:
  - **Alcance**: `supabase/schema.sql`, `bot/index.js`, `js/views/operator.js`.
  - **Implementación**: Tabla `public.whatsapp_outbox` con estado (`PENDING`, `PROCESSING`, `SENT`, `FAILED`), contador de intentos, último error visible en la tarjeta del pedido en `operator.js` y botón de reintento manual.



## Auditoría inicial — 2026-11-11

Línea de base preliminar: **36/100**, con riesgos críticos en XSS y políticas del esquema, además de fallas de confirmación de pedidos. Consultar [la revisión y sus límites](coordination/reviews/AUDITORIA-INICIAL-2026-11-11.md). No equivale a una evaluación de una base desplegada.


## Tickets para Antigravity — 2026-11-11

[Plan de mejora](tasks/plan.md): 18 tickets AUD-00–17 preparados, implementación no iniciada. Índice en tasks/todo.md; especificaciones y evidencias en coordination/tasks y coordination/results. Base histórica conservada en coordination/references/nexo-auditoria-tracker.xlsx.
