# Nexo Pedidos v1

Sistema ágil y móvil de pedidos en línea, pesaje de mostrador y administración de catálogo para comercios de cercanía (verdulerías, dietéticas, fiambrerías y tiendas de alimentos).

Desarrollado como una Progressive Web App (PWA) de una sola instalación por comercio, sin costos fijos de servidor propio: funciona sobre arquitectura serverless (**Vercel**) y Backend as a Service (**Supabase PostgreSQL + Realtime**).

---

## 🚀 Características Principales

### 1. Vista Cliente (Catálogo y Pedido)
* **Catálogo móvil optimizado**: Grilla adaptable (2 columnas desde 360 px) con fotos de productos, categorías dinámicas y buscador en tiempo real.
* **Productos por peso y unidad**: Admite venta fraccionada (pasos de 0.25 o 0.5 kg) y productos unitarios (paso 1 u).
* **Carrito y estimación clara**: Calcula el importe estimado previo, informando al cliente que los pesables tendrán su valor exacto al pasar por la balanza del local.
* **Entrega flexible**: Selección entre retiro en mostrador o envío a domicilio con dirección y teléfono de contacto.
* **Seguimiento e historial**: Pestaña "Mis pedidos" para seguir el estado en curso y consultar compras anteriores.

### 2. Vista Operador (Balanza y Mostrador)
* **Tablero Kanban en tiempo real**: Columnas automáticas de pedidos *Pendientes*, *En preparación* y *Listos*.
* **Alerta sonora instantánea**: Beep sonoro automático al ingresar un nuevo pedido vía Supabase Realtime WebSocket.
* **Pesaje en balanza**: Ajuste de peso real en kilogramos con visualización inmediata del equivalente en gramos.
* **Flexibilidad operativa**: Posibilidad de marcar artículos sin stock/faltantes, sumar o quitar ítems y corregir la modalidad de entrega sobre la marcha.
* **Cálculo de importe real**: Diferencia exacta entre total estimado y total real pesado.

### 3. Vista Administrador (Precios y Catálogo)
* **Gestión total de productos**: Alta, edición de precios, control de disponibilidad (pausar/activar stock) y archivado lógico.
* **Fotos de productos**: Carga de imágenes desde cámara o galería móvil, optimizadas automáticamente en IndexedDB (512x512 px) para máximo rendimiento sin saturar almacenamiento.
* **Códigos SKU y categorías**: Organización por códigos comerciales y categorías configurables según el rubro del negocio.
* **Sincronización en la nube**: Cualquier cambio de precio o producto se actualiza inmediatamente en Supabase y se refleja en los clientes conectados.
* **PIN de seguridad**: Bloqueo de acceso local para proteger la vista de precios y configuración en dispositivos compartidos.

### 4. Mensajería WhatsApp (2 modalidades de operación)
* **Opción A — Web Asistida (Sin instalación ni backend)**: Al marcar un pedido como *Listo*, el operador toca "Enviar WhatsApp" y se abre la conversación con el cliente conteniendo el desglose detallado de balanza, total exacto, dirección/retiro y alias de transferencia bancaria.
* **Opción B — Bot Autónomo (Baileys + Node.js)**: Servicio complementario en [`bot/`](bot/) que vincula una línea de WhatsApp mediante código QR, escucha los pedidos listos en Supabase por WebSockets y dispara los mensajes de forma 100% automática, además de responder con el catálogo a quien escriba al número del comercio.

---

## 🛠️ Arquitectura Técnica

```
[ Cliente PWA ] <───────┐
[ Operador Kanban ] <───┼──> (Supabase Realtime WebSockets)
[ Administrador ] <─────┘         │
                                  ▼
                     [ Supabase PostgreSQL ]
                     ├── public.clientes
                     ├── public.productos
                     └── public.pedidos (id SERIAL #101+)
                                  ▲
                                  │ (WebSocket Listener)
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

# Ejecutar suites de test:
node tests/test-production-supabase-sync.test.mjs    # Sincronización completa con Supabase
node tests/test-demo-isolation.test.mjs             # Aislamiento y fail-closed de demo
node tests/test-static-server.test.mjs              # Servidor estático y confinamiento
node tests/test-delivery-store.mjs                  # Lógica de pesaje, balanza y subtotales
node tests/test-phone-numeric-validation.test.mjs   # Sanitización de teléfonos de clientes
node bot/test-store-state.js                        # Máquina de estados de pedidos
node tests/test-html-escaping.test.mjs              # Mitigación de XSS en renderizado
```

---

## 📁 Estructura del Repositorio

* `js/`
  * `app.js`: Enrutador de vistas y eventos de navegación.
  * `config.js`: Resolución y validación estricta de configuración pública (demo vs producción).
  * `public-config.js`: Declaración de configuración pública para el navegador (sin secretos).
  * `store.js`: Gestor central reactivo de estado, almacenamiento local y cliente Supabase Realtime.
  * `images.js`: Procesamiento, compresión y almacenamiento IndexedDB de fotos de productos.
  * `bundle.js`: Archivo compilado unificado para producción y ejecución universal.
  * `views/`: Vistas de interfaz (`client.js`, `operator.js`, `admin.js`).
* `supabase/`
  * `schema.sql`: Script DDL completo de PostgreSQL, tablas, RLS, Realtime y semilla.
  * `001_pilot.sql`: Migración de base de datos piloto.
* `bot/`: Servicio de mensajería Baileys WhatsApp con escucha de eventos de balanza.
* `scripts/`: Scripts de build y generación de raíz pública estática (`build-public.mjs`).
* `tests/`: Suites de pruebas unitarias, de integración y seguridad.
* `docs/`: Documentación de producto, comparativas de UX y arquitectura.

---

## 📄 Licencia y Créditos

Nexo Pedidos es una evolución independiente derivada del proyecto original [MiHuerta](https://github.com/Facussttee/MiHuerta) de Facundo Argüello.
Repositorio oficial: [Facussttee/nexo-pedidos](https://github.com/Facussttee/nexo-pedidos).
