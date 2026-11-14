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

## Estado Actual de Sincronización (Cierre de Auditoría — 2026-11-13)

> [!IMPORTANT]
> **Estado canónico actual (`main` — Cierre de Auditoría AUD-00–17, 2026-11-13)**:
> - **Remediación completa AUD-00 a AUD-17 integrada en `main`**: XSS en vistas/órdenes cerrado (`escapeHtml`), autenticación individual de personal por Supabase Auth (`staff_members`, RBAC `owner`/`operator`) separada del PIN local demo (`1234`), seguimiento privado de cliente por token opaco (`tracking_token_hash`, fragmento `#track=`), checkout autoritativo/idempotente (`create_order_atomic`), concurrencia optimista (`version`), identidad telefónica exacta sin `slice(-8)`, sincronización de catálogo vacío sin fallback mock, rate limit con `NOW()`, accesibilidad en vistas principales, regresión móvil 360–1024px en Brave headless, CSS sin `@import` bloqueante y CI en dos jobs (`validate-local` + `validate-browser`).
> - **Límites honestos (`UNVERIFIED` = 9 pts)**: En este host Windows no están disponibles Docker, Supabase CLI ni `psql`, ni dispositivo físico iOS Safari; por lo tanto la ejecución de RLS contra PostgreSQL real (5 pts) y la validación física en Safari iOS / captura HEIC (4 pts) permanecen **`UNVERIFIED`**.
> - **Rama `V2`**: Los módulos funcionales v2 adicionales (`V2-03` Storage/Comercio Config, `V2-04` Pagos, `V2-05` Importador CSV, `V2-06` Stock cuantitativo, `V2-07` Outbox WhatsApp) residen en rama `V2` (tag `v2.0.0`), mientras `main` consolida v1 endurecida + `AUD-00`–`17`.

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

### Fase 1 — Seguridad Autoritativa y Privacidad en Base de Datos (`DONE` en `main` vía `AUD-04`..`AUD-09`)
- **`V2-01` / `AUD-04`–`AUD-06` (Privacidad de Pedidos y RBAC — `DONE` local, RLS vivo `UNVERIFIED`)**:
  - **Implementado en `main`**: Cerradas políticas abiertas `USING (true)` en `public.pedidos` y `public.clientes`; autenticación individual por `staff_members` (Supabase Auth, roles `owner`/`operator`, sin PIN en producción) y seguimiento privado de clientes vía `get_order_by_tracking_token` + fragmento `#track=`.
- **`V2-02` / `AUD-07`–`AUD-09` (Checkout Autoritativo y Toma Exclusiva — `DONE`)**:
  - **Implementado en `main`**: RPC `create_order_atomic` con `FOR SHARE`, precios calculados desde `public.productos`, idempotencia por `checkout_cart_key` + `payload_hash`, y versionado optimista (`version`, `tomado_por`) en `take_order`, `update_order_preparation` y `finalize_order_preparation`.

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



## Cierre de Auditoría (AUD-00–17) — 2026-11-13

- **Baseline inicial (2026-11-11):** `36/100` orientativo en [la revisión y sus límites](coordination/reviews/AUDITORIA-INICIAL-2026-11-11.md).
- **Cierre post-remediación:** Ver [tasks/todo.md](tasks/todo.md) y [coordination/results/AUD-17.md](coordination/results/AUD-17.md) (todos los tickets `AUD-00`–`AUD-17` cerrados en `main`; `87/100` en `test-aud-01-rubric.test.mjs`, donde 4 pts fallan por regex estático heredado sobre la rama demo-only mientras `test-aud-04-06` verifica 10/10 la separación productiva, y 9 pts permanecen `UNVERIFIED` por falta de PostgreSQL/Docker local y Safari iOS físico). Base histórica conservada en `coordination/references/nexo-auditoria-tracker.xlsx`.
