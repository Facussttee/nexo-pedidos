# Mapa real del repositorio — Nexo Pedidos (E0)

Base: commit `169247d`, rama `codex/experiment-E0`. Mapa por lectura estática local; no se ejecutó código, ni red, ni Supabase, ni WhatsApp. Lo que sigue describe lo que el código *hace*, no que esté desplegado ni que sea seguro.

## Componentes

| Ruta | Rol |
|---|---|
| `index.html`, `css/style.css` | Shell de la PWA |
| `js/app.js` | Router de vistas y compuerta de PIN (`renderPinGate` L103, `navigate` L195) |
| `js/products-data.js` | Catálogo semilla `INITIAL_PRODUCTS` |
| `js/store.js` | Estado híbrido localStorage + Supabase + Realtime (clase única, 1023 líneas) |
| `js/views/client.js` / `operator.js` / `admin.js` | Vistas cliente, mostrador/balanza, administración |
| `js/bundle.js` | Bundle generado (no se editó) |
| `supabase/schema.sql` | Tablas `clientes`, `productos`, `pedidos`, RLS, Realtime, semilla |
| `bot/index.js` | Bot WhatsApp (Baileys) + servidor web local + listener Realtime |

## Flujo real: catálogo → store → Supabase → bot

1. **Catálogo.** `js/store.js` L1 importa `INITIAL_PRODUCTS`; `init()` (L83) lo guarda en localStorage si no existe (L88-90). `getProducts()` (L437) lo lee; lo consumen `client.js` (L314, L736), `operator.js` (L248) y `admin.js` (L12).
2. **Carrito.** `addToCart` (L525), `setCartQuantity` (L559), `getCartSummary` (L588). Todo local.
3. **Pedido.** `client.js` L1145 llama `createOrder` (store L661): id local `max(id)+1` o 101 (L666), estado `PENDIENTE`, `total_real: null`, ítems con `sin_stock:false`. Guarda local (L691) y llama `syncOrderToSupabase` (L692).
4. **Sync a Supabase.** `syncOrderToSupabase` (L396): `upsert` en `clientes` (L402) y luego en `pedidos` (L410). Errores sólo `console.warn`; sin reintento ni cola. Se invoca desde cada mutación (L692, 710, 740, 771, 811, 844, 871, 917, 941).
5. **Conexión.** `init()` llama `initSupabaseConnection` (L298) cuando hay configuración cloud (L242-245); `pullFromSupabase` (L316) lee `productos`, `clientes` por teléfono y los últimos 50 `pedidos`; `subscribeToSupabaseRealtime` (L376) escucha `pedidos` y `productos` y vuelve a hacer pull completo.
6. **Operación.** `operator.js`: `updateOrderStatus` (L742, L1007), `cancelOrder` (L757), `finalizeOrderWeighing` (L997); store: `updateItemWeight` L714, `toggleItemOutOfStock` L746, `removeItemFromOrder` L852, `addProductToOrder` L876, `updateOrderDetails` L922. Existe la flexibilidad cancelar / quitar / sumar ítems / pesar.
7. **Bot.** `bot/index.js` crea el cliente Supabase (L183), `setupSupabaseRealtimeListener` (L425) escucha `pedidos`; si `estado === "LISTO"` y no `notificado_whatsapp` (L447) llama `notifyOrderReady` (L365), que envía por WhatsApp y marca `notificado_whatsapp` (L380-388). `reconcilePendingReadyOrders` (L397) recupera pedidos LISTO sin notificar. `startWhatsAppBot()` se invoca al cargar el módulo (L455: efecto inmediato al importarlo/ejecutarlo).
8. **Esquema.** `supabase/schema.sql`: `pedidos` L32-47 con `items JSONB`; RLS habilitada L83-85; políticas `FOR ALL USING (true) WITH CHECK (true)` L89-104; Realtime y semilla L106-155.

## Diferencias concretas entre docs y código

1. **Modelo de datos.** `docs/03_ARQUITECTURA_Y_DATOS.md` L160-170 define una tabla `pedido_items` con `sin_stock`, `peso_real`, etc. `supabase/schema.sql` no la tiene: los ítems son una columna `items JSONB` en `pedidos` (L41), y `store.js` escribe `items` directamente (L419).
2. **Seguridad/RLS.** `docs/05_PLAN_DE_DESARROLLO_MVP.md` L47 habla de esquema "con políticas RLS" y L43 de PIN de admin. En código las políticas son abiertas a todos (`schema.sql` L89-104). El PIN por defecto está en el cliente (`store.js` L223, L253, L282-286: comparación en el navegador) y la configuración cloud por defecto está embebida en `store.js` L220-223 y L250-253. El PIN es sólo control de interfaz, no autorización de datos.
3. **Rutas/estado de despliegue.** `README.md` L84-85 y `docs/05` L47, L52 enlazan a rutas absolutas del repo original (`miHuerta`), y `docs/05` L26 afirma "100% Operativo" para un proyecto cloud concreto. Este repo no puede verificarlo y el código lo contradice como garantía (sin Auth, sin transacciones, sin reintentos).

Observación adicional: los ids de pedido se calculan en el cliente (`store.js` L666) mientras `schema.sql` L33 define `SERIAL`; con varios dispositivos puede haber colisión o sobrescritura por `upsert`.

## Límites

- No se verificó despliegue, estado de la base remota, seguridad, ni comportamiento en navegador o WhatsApp.
- Sin Auth, idempotencia, transacciones ni outbox; la notificación depende de un bot activo y del flag `notificado_whatsapp` (no es entrega exactamente-una-vez).
- No hay stock cuantitativo: `disponible` y `sin_stock` son booleanos.
- No se copiaron claves, endpoints, teléfonos ni direcciones; sólo referencias a línea.
- Números de línea válidos para `169247d`.
