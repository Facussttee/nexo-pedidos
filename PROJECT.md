# Project: Nexo Pedidos v2 — Production Hardening & Feature Delivery

## Architecture
- **Client & Staff PWA**: Single Page Application with dynamic views (`client.js`, `operator.js`, `admin.js`), orchestrated by `app.js` and styled via `css/style.css` and Tailwind CSS Play CDN.
- **Design System & Ergonomics**: Plus Jakarta Sans typography, min 44x44px touch targets on all interactive elements, min 16px font inputs to prevent iOS auto-zoom, zero horizontal overflow (`overflow-x: clip`/`hidden`) across 360px-430px mobile viewports, and light/dark theme synchronization (`nexo_theme_v1`).
- **Cloud Backend & Database**: Supabase (PostgreSQL + Storage + Realtime):
  - `public.clientes`: Customer registry (`telefono`, `nombre`, `direccion`), restricted by phone-matching RLS and staff PIN header.
  - `public.productos`: Dynamic catalog with categories, SKU/codes, weight steps, availability, quantitative inventory (`controlar_stock`, `stock_actual`, `stock_reservado`), and public Supabase Storage images (`imagen_url`).
  - `public.pedidos`: Header and items JSONB with auto-incrementing serial ID (#101+), authoritative server pricing via `create_order_atomic`, optimistic concurrency locking (`version`, `tomado_por`), and independent payment status (`estado_pago`, `metodo_pago`).
  - `public.comercio_config`: Singleton store configuration (`nombre`, `alias`, `whatsapp`, `costo_envio`, `compra_minima`, `horarios`) with RLS protected by staff PIN.
  - `public.whatsapp_outbox`: Transactional messaging outbox with states (`PENDING`, `PROCESSING`, `SENT`, `FAILED`), retry counters, and operator retry controls.
- **Packaging & Confinement**: `build-bundle.ps1` consolidates modular JavaScript into `js/bundle.js` with UTF-8 encoding. Public build allowlist (`scripts/build-public.mjs`) confines output exclusively to `dist/public` for zero-cost serverless deployment on Vercel.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Order Privacy & RLS Closure | Restrict SELECT/UPDATE on `pedidos` and `clientes` to authenticated staff (`verify_staff_pin_header`) or customer phone header | M1 (V2-01) | Survey / R2 |
| 2 | Staff PIN Update RPC | Secure RPC `update_staff_pin(old_pin, new_pin)` validating current PIN and updating `nexo_secrets` | M1 (V2-01) | Survey / R2 |
| 3 | Authoritative Checkout RPC | PostgreSQL RPC `create_order_atomic` with real product price lookup, availability check, and cart idempotency | M2 (V2-02) | Survey / R2 |
| 4 | Order Concurrency Locking | Add `version INT DEFAULT 1` and `tomado_por VARCHAR(60)` to `pedidos` for optimistic locking in preparation | M2 (V2-02) | Survey / R2 |
| 5 | Hybrid Image Pipeline | Upload 512px compressed image to Supabase Storage `product-images` in production; IndexedDB in demo | M3 (V2-03) | Survey / R3 |
| 6 | Commercial Profile Table | Create `public.comercio_config` (name, alias, whatsapp, shipping, min purchase, schedules) editable via Admin | M3 (V2-03) | Survey / R3 |
| 7 | Payment Separation | Add `estado_pago` and `metodo_pago` to `pedidos`, with independent operator card controls and pending filter | M4 (V2-04) | Survey / R3 |
| 8 | Catalog CSV/TSV Importer | Local zero-dependency CSV/TSV parser with accents/commas/quotes support and SKU string preservation | M5 (V2-05) | Survey / R4 |
| 9 | Import Preview & Safe Batch | Non-persisting preview modal classifying new vs updates vs errors, with backup and snapshot protection | M5 (V2-05) | Survey / R4 |
| 10 | Quantitative Inventory Control | Optional inventory in `productos` (`controlar_stock`, `stock_actual`, `stock_reservado`) with order reservation | M6 (V2-06) | Survey / R4 |
| 11 | Stock Scale Adjustment & Release | Adjust physical stock on real scale weighing; release reservation on cancellation | M6 (V2-06) | Survey / R4 |
| 12 | Transactional WhatsApp Outbox | Table `whatsapp_outbox` tracking message delivery states, attempts, and errors | M7 (V2-07) | Survey / R4 |
| 13 | Operator Outbox Controls | Visible delivery status badge on operator order card with manual retry button | M7 (V2-07) | Survey / R4 |
| 14 | Integration & Full Verification | Clean merge into branch `V2`, bundle build, public dist check, and full test suite pass | M8 (Integration) | Survey / R1, R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | V2-01 Order Privacy & RLS | RLS on `pedidos`/`clientes`, `update_staff_pin`, client phone header | None | DONE (commit 82799a7, 71/71 tests pass) |
| M2 | V2-02 Authoritative Checkout | `create_order_atomic`, `version`, `tomado_por`, store checkout sync | M1 | DONE (commit 156bacc, 131/131 tests pass) |
| M3 | V2-03 Storage Images & Config | `product-images` bucket upload, `public.comercio_config`, Admin form | M1 | DONE (36/36 V2 tests pass) |
| M4 | V2-04 Payment Separation | `estado_pago`, `metodo_pago`, operator card buttons & pending filter | M1 | PLANNED |
| M5 | V2-05 Catalog CSV/TSV Import | `js/csv-parser.js`, Admin preview modal, batch apply preserving snapshots | None | PLANNED |
| M6 | V2-06 Inventory & Stock Res. | `controlar_stock`, `stock_actual`, `stock_reservado`, scale adjust/release | M2, M5 | PLANNED |
| M7 | V2-07 WhatsApp Outbox | `public.whatsapp_outbox`, operator card retry UI, bot integration pattern | M1, M2 | PLANNED |
| M8 | Final Integration into `V2` | Merge all task branches into `V2`, bundle build & full test pass | M1-M7 | PLANNED |

## Interface Contracts

### M1 ↔ Client/Operator Store Access
- Client requests include header `x-nexo-client-phone: <telefono>`.
- Staff requests include header `x-nexo-staff-pin: <pin>`.
- RPC `public.update_staff_pin(old_pin TEXT, new_pin TEXT)` returns `jsonb`.

### M2 ↔ Store Checkout
- RPC `public.create_order_atomic(p_cliente_telefono TEXT, p_cliente_nombre TEXT, p_cliente_direccion TEXT, p_tipo_entrega TEXT, p_direccion_entrega TEXT, p_items JSONB, p_checkout_cart_key TEXT)` returns JSONB of created/idempotent order.
- Optimistic locking update: `UPDATE pedidos SET estado = 'EN_PREPARACION', tomado_por = :operator, version = version + 1 WHERE id = :id AND version = :expected_version;`

### M3 ↔ Images & Config
- In demo: `putImage(blob)` -> returns `img_${time}_${rnd}`.
- In prod: `supabase.storage.from("product-images").upload(...)` -> returns public HTTPS URL saved to `imagen_url` and `imagen_id`.
- Table `public.comercio_config`: singleton `id = 1`, read by all, modified only with `verify_staff_pin_header()`.

### M4 ↔ Operator Kanban
- `pedidos.estado_pago`: `'PENDIENTE'`, `'INFORMADO'`, `'COBRADO'`.
- `pedidos.metodo_pago`: `'EFECTIVO'`, `'TRANSFERENCIA'`, `'OTRO'`.
- `store.updateOrderPayment(orderId, { estado_pago, metodo_pago })` syncs independently from order delivery status.

### M5 ↔ Catalog Data
- Parser: `parseDelimitedText(text, options)` returns `{ rows, errors, delimiter }`.
- SKU (`codigo`) strictly preserved as `String` with leading zeros intact.
- Historical snapshots: changing product unit of measure prohibited if SKU exists in past orders.

### M6 ↔ Order & Weighing Lifecycle
- Checkout (`createOrder` / `create_order_atomic`): reserve stock `stock_reservado += qty` if `controlar_stock`.
- Scale confirmation (`finalizeOrderWeighing`): release reservation `stock_reservado -= qty` and decrement physical `stock_actual -= peso_real`.
- Cancellation (`cancelOrder`): release reservation `stock_reservado -= qty`.

### M7 ↔ Outbox & Operator UI
- Table `public.whatsapp_outbox`: `id, pedido_id, telefono, mensaje, estado, intentos, ultimo_error, created_at, updated_at`.
- Operator card in "Listos" displays status badge and triggers retry setting status back to `'PENDING'`.

## Code Layout
- `js/app.js`: Application lifecycle, view router, theme listeners, staff PIN modal.
- `js/config.js`: Public configuration parser, strict production validation, demo network guard.
- `js/public-config.js`: Runtime public configuration (free of secrets).
- `js/store.js`: Reactive central state store, Supabase Realtime client, local storage cache.
- `js/images.js`: Hybrid IndexedDB and Supabase Storage pipeline.
- `js/csv-parser.js`: Pure JavaScript RFC 4180 CSV/TSV parser.
- `js/html.js`: HTML entity sanitizer mitigating XSS injections.
- `js/views/client.js`: Mobile customer catalog, interactive cart drawer, order history.
- `js/views/operator.js`: Kanban preparation board, weighing modal, live scale controls, payment controls, outbox status.
- `js/views/admin.js`: Product CRUD, category pills, price steppers, PIN lock settings, catalog importer, comercio config.
- `supabase/schema.sql`: Production DDL script with RLS, triggers, indexes, and Realtime publications.
- `bot/`: WhatsApp connection service (`index.js`), demo server (`serve-demo.js`), static server (`static-server.js`).
- `scripts/build-public.mjs`: Strict allowlist builder for `dist/public`.
- `tests/`: Automated test suites for store logic, static server confinement, demo isolation, and cloud sync.
