# Nexo Pedidos v2

Sistema ágil y móvil de pedidos en línea, pesaje de mostrador, inventario cuantitativo y administración de catálogo para comercios de cercanía (verdulerías, carnicerías, dietéticas, fiambrerías y tiendas de alimentos).

Desarrollado como una Progressive Web App (PWA) de una sola instalación por comercio, sin costos fijos de servidor propio: funciona sobre arquitectura serverless (**Vercel**) y Backend as a Service (**Supabase PostgreSQL + Storage + Realtime**).

---

## 🚀 Características Principales (v1 + v2)

### 1. Vista Cliente (Catálogo y Pedido)
* **Catálogo móvil optimizado**: Grilla adaptable (2 columnas desde 360 px) con fotos de productos, categorías dinámicas y buscador en tiempo real por nombre o SKU.
* **Productos por peso y unidad**: Admite venta fraccionada (pasos de 0.25 o 0.5 kg) y productos unitarios (paso 1 u).
* **Control de stock cuantitativo**: Límite automático de compra según disponibilidad real (`stock_actual - stock_reservado`) e indicador "Sin Stock" cuando se agota.
* **Carrito, mínimo de compra y envío**: Muestra horarios comerciales, valida monto mínimo de compra configurable, calcula costo de envío y permite elegir medio de pago (`EFECTIVO`, `TRANSFERENCIA`, `OTRO`).
* **Checkout autoritativo e idempotente (`V2-02`)**: En producción, el RPC `create_order_atomic` calcula los precios reales desde `public.productos`, reserva stock y evita pedidos duplicados mediante `checkout_cart_key`.
* **Privacidad de pedidos (`V2-01`)**: Cada cliente consulta únicamente sus propios pedidos mediante políticas RLS y cabecera `x-nexo-client-phone`.

### 2. Vista Operador (Balanza, Mostrador y Cobros)
* **Tablero Kanban en tiempo real**: Columnas de pedidos *Entrantes*, *En preparación*, *Listos*, *Entregados* y *Cancelados*, con timbre sonoro instantáneo vía Supabase Realtime.
* **Toma exclusiva con bloqueo optimista (`V2-02`)**: Control de concurrencia (`version` y `tomado_por`) para impedir que dos operarios tomen el mismo pedido simultáneamente.
* **Pesaje en balanza y ajuste de inventario (`V2-06`)**: Ajuste de peso real en kilogramos (con gramos visibles) o confirmación unitaria. Al finalizar el pesaje, se libera la reserva y se descuenta el peso real del `stock_actual`.
* **Separación de Entrega y Pago (`V2-04`)**: Estado de cobro independiente (`PENDIENTE`, `INFORMADO`, `COBRADO`), selector de medio de pago y filtro rápido de "Pendientes de cobro" en todas las columnas.
* **Estado de WhatsApp Outbox y Reintento (`V2-07`)**: En la columna *Listos*, cada tarjeta muestra el estado de envío (`En cola`, `Procesando`, `Enviado`, `Falló envío`), cantidad de intentos, detalle del último error y botón manual de **Reintentar envío**.

### 3. Vista Administrador (Catálogo, Importación y Configuración)
* **Gestión total de productos e inventario (`V2-06`)**: Alta, edición de precios, activación/pausa, archivo lógico y control opcional de stock cuantitativo (`controlar_stock`, `stock_actual`, `stock_reservado` y disponible).
* **Importador masivo CSV/TSV con vista previa (`V2-05`)**: Parser local RFC 4180 (`js/csv-parser.js`) que preserva códigos SKU con ceros a la izquierda, muestra vista previa de altas/actualizaciones/errores sin escribir en la base y aplica el lote con backup automático y protección de snapshots históricos.
* **Imágenes híbridas (`V2-03`)**: Compresión en navegador a 512x512 px; almacenamiento en IndexedDB en Modo Demo y subida al bucket público `product-images` de Supabase Storage en Modo Producción.
* **Perfil comercial en base de datos (`V2-03`)**: Tabla singleton `public.comercio_config` editable desde Admin (nombre, alias bancario, WhatsApp, costo de envío, compra mínima y horarios).
* **PIN de seguridad en servidor (`V2-01`)**: Validación en PostgreSQL mediante `verify_staff_pin_header()` y cambio seguro de PIN con el RPC `update_staff_pin(p_old_pin, p_new_pin)`.

### 4. Mensajería WhatsApp (2 modalidades de operación)
* **Opción A — Web Asistida (Sin instalación ni backend)**: Al marcar un pedido como *Listo*, el operador toca "Enviar WhatsApp" y se abre la conversación con el cliente conteniendo el desglose detallado de balanza, total exacto, dirección/retiro y alias de transferencia bancaria.
* **Opción B — Bot Autónomo con Outbox Durable (`V2-07`)**: Servicio en [`bot/`](bot/) que reclama lotes de `public.whatsapp_outbox` de forma atómica (`claim_whatsapp_outbox_batch` con `FOR UPDATE SKIP LOCKED`), aplica backoff exponencial ante fallos y actualiza el estado en tiempo real.

---

## 🛠️ Arquitectura Técnica

```
[ Cliente PWA ] <───────┐
[ Operador Kanban ] <───┼──> (Supabase Realtime WebSockets + Storage)
[ Administrador ] <─────┘         │
                                  ▼
                     [ Supabase PostgreSQL (RLS + RPCs) ]
                     ├── public.clientes
                     ├── public.productos (+ stock_actual / stock_reservado)
                     ├── public.pedidos (id SERIAL #101+, version, estado_pago)
                     ├── public.comercio_config (singleton id=1)
                     ├── public.whatsapp_outbox (cola transaccional)
                     └── public.nexo_secrets (PIN de staff)
                                  ▲
                                  │ (claim_whatsapp_outbox_batch + Realtime)
                     [ Bot WhatsApp / Baileys ] (Opcional)
```

* **Frontend**: Vanilla JS modular empaquetado en [`js/bundle.js`](js/bundle.js) (sin frameworks pesados), CSS con Tailwind CSS Play CDN y diseño responsivo móvil (touch targets >= 44 px, inputs >= 16 px anti-zoom).
* **Persistencia**: Híbrida local (`localStorage` + `IndexedDB`) con backend en la nube (**Supabase**) gobernado por Row Level Security (RLS).
* **Hosting**: **Vercel** sirviendo la raíz estática confinada [`dist/public`](dist/public) generada por [`scripts/build-public.mjs`](scripts/build-public.mjs).

---

## 📋 Puesta en Marcha

### 1. Base de datos en Supabase
1. Creá un proyecto gratuito en [supabase.com](https://supabase.com).
2. Andá a **SQL Editor** -> **New query**.
3. Copiá y ejecutá el script completo de [`supabase/schema.sql`](supabase/schema.sql). Esto crea las tablas, índices, triggers de actualización, políticas de seguridad RLS, canales de Realtime y una semilla inicial de 17 productos.
4. En **Project Settings** -> **API**, copiá tu **Project URL** y tu **anon public key** (`sb_publishable_...` o `eyJ...`).

### 2. Despliegue en Vercel
1. Importá el repositorio [Facussttee/nexo-pedidos](https://github.com/Facussttee/nexo-pedidos) en tu cuenta de Vercel.
2. En la configuración del proyecto (**Settings** -> **Environment Variables**), configurá:
   * `NEXT_PUBLIC_SUPABASE_URL` = `https://<tu-proyecto>.supabase.co`
   * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `<tu-anon-key>`
   * `BUSINESS_NAME` = `Nombre de tu Comercio` (opcional)
   * `BUSINESS_ALIAS` = `tu.alias.mp` (opcional)
   * `BUSINESS_WHATSAPP` = `54911XXXXXXXX` (opcional)
3. Al desplegar, el comando de build genera automáticamente la configuración pública en `dist/public/js/public-config.js`.

### 3. Ejecución Local (Desarrollo y Pruebas)
Para probar localmente conectado a Supabase:
```powershell
# En PowerShell:
$env:VERCEL="1"
$env:NEXT_PUBLIC_SUPABASE_URL="https://<tu-proyecto>.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<tu-anon-key>"
node scripts/build-public.mjs
node bot/serve-demo.js --host 127.0.0.1 --port 3000
```
Abrir `http://127.0.0.1:3000` en el navegador.

### 4. Servicio de Bot de WhatsApp (Opcional)
Para tener envío automático desatendido por WhatsApp:
```powershell
cd bot
npm install
# Crear archivo bot/.env basándose en bot/.env.example con tus credenciales
npm start
```
Escaneá el código QR que aparece en la terminal desde WhatsApp (**Dispositivos vinculados**) y el bot quedará escuchando los pedidos listos en tiempo real.

---

## 🧪 Verificación y Tests Automatizados

La suite de pruebas valida integridad de estado, aislamiento de demo, seguridad contra inyección y sincronización en la nube:

```powershell
# Compilar bundle y chequear sintaxis:
powershell -ExecutionPolicy Bypass -File .\build-bundle.ps1
node --check js/bundle.js

# Construir directorio público:
node scripts/build-public.mjs

# Ejecutar suites base y v1:
node tests/test-production-supabase-sync.test.mjs    # Sincronización completa con Supabase
node tests/test-demo-isolation.test.mjs             # Aislamiento y fail-closed de demo
node tests/test-static-server.test.mjs              # Servidor estático y confinamiento
node tests/test-delivery-store.mjs                  # Lógica de pesaje, balanza y subtotales
node tests/test-phone-numeric-validation.test.mjs   # Sanitización de teléfonos de clientes
node bot/test-store-state.js                        # Máquina de estados de pedidos
node tests/test-html-escaping.test.mjs              # Mitigación de XSS en renderizado

# Ejecutar suites de Nexo Pedidos v2 (V2-01 a V2-07):
node tests/test-v2-01-privacy-rls.test.mjs          # Privacidad RLS y RPC update_staff_pin
node tests/test-v2-02-authoritative-checkout.test.mjs # Checkout atómico y concurrencia optimista
node tests/test-v2-03-storage-and-config.test.mjs   # Imágenes Storage y comercio_config
node tests/test-v2-04-payment-separation.test.mjs   # Separación de entrega y cobro
node tests/test-catalog-import.test.mjs             # Importador CSV/TSV RFC 4180 con preview
node tests/test-inventory-stock.test.mjs            # Inventario cuantitativo y reservas
node tests/test-v2-07-whatsapp-outbox.test.mjs      # Cola durable whatsapp_outbox y reintentos
```

---

## 📁 Estructura del Repositorio

* `js/`
  * `app.js`: Enrutador de vistas y eventos de navegación.
  * `config.js`: Resolución y validación estricta de configuración pública (demo vs producción).
  * `public-config.js`: Declaración de configuración pública para el navegador (sin secretos).
  * `csv-parser.js`: Parser RFC 4180 sin dependencias para importación de catálogo CSV/TSV (`V2-05`).
  * `store.js`: Gestor central reactivo de estado, almacenamiento local y cliente Supabase Realtime.
  * `images.js`: Pipeline híbrido de imágenes (IndexedDB en demo + Supabase Storage `product-images` en producción).
  * `bundle.js`: Archivo compilado unificado para producción y ejecución universal.
  * `views/`: Vistas de interfaz (`client.js`, `operator.js`, `admin.js`).
* `supabase/`
  * `schema.sql`: Script DDL completo de PostgreSQL (`clientes`, `productos`, `pedidos`, `comercio_config`, `whatsapp_outbox`, `nexo_secrets`), RPCs transaccionales, RLS, Realtime y semilla.
  * `001_pilot.sql`: Migración de base de datos piloto.
* `bot/`: Servicio de mensajería Baileys WhatsApp con escucha de eventos de balanza.
* `scripts/`: Scripts de build y generación de raíz pública estática (`build-public.mjs`).
* `tests/`: Suites de pruebas unitarias, de integración y seguridad.
* `docs/`: Documentación de producto, comparativas de UX y arquitectura.

---

## 📄 Licencia y Créditos

Nexo Pedidos es una evolución independiente derivada del proyecto original [MiHuerta](https://github.com/Facussttee/MiHuerta) de Facundo Argüello.
Repositorio oficial: [Facussttee/nexo-pedidos](https://github.com/Facussttee/nexo-pedidos).
