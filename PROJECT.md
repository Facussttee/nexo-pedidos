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
