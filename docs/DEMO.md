# Configuración y Modos de Ejecución (`NEXO_PUBLIC_CONFIG`)

Nexo Pedidos cuenta con dos modos de operación claramente diferenciados: **Modo Demo (aislado)** y **Modo Producción (Supabase + Realtime)**.

---

## 1. Modo Producción (Nube y Tiempo Real)

En Modo Producción, la aplicación se conecta a **Supabase** para sincronizar pedidos, catálogo y clientes entre todos los dispositivos en tiempo real.

### Declaración en `js/public-config.js`
Este archivo se genera automáticamente en Vercel a través de [`scripts/build-public.mjs`](../scripts/build-public.mjs) a partir de las variables de entorno, o puede configurarse manualmente:

```javascript
window.NEXO_PUBLIC_CONFIG = {
  mode: "production",
  business: {
    name: "Nombre del Comercio",
    alias: "alias.bancario.mp",
    whatsapp: "54911XXXXXXXX",
    whatsappDisplay: "+54 11 XXXX-XXXX"
  },
  supabase: {
    url: "https://<tu-proyecto>.supabase.co",
    anonKey: "sb_publishable_... o eyJ..."
  }
};
```

### Características en Producción
* **Conexión Supabase**: Carga la librería oficial `@supabase/supabase-js` desde CDN y establece conexión REST y WebSocket Realtime.
* **Sincronización multi-dispositivo**:
  * Un pedido creado por un cliente en su teléfono sube a la tabla `pedidos` en Supabase y aparece al instante en la pantalla del operador en la PC con alerta sonora.
  * Los cambios de precio o stock realizados por el administrador en la tabla `productos` se reflejan en tiempo real en los clientes.
* **Numeración oficial de pedidos**: Supabase asigna el identificador correlativo (`id SERIAL` a partir de #101) garantizando unicidad sin colisiones entre múltiples compradores simultáneos.
* **Seguridad (Fail-Closed)**: Si falta algún campo obligatorio (`business.name`, `supabase.url` con `https://`, o `supabase.anonKey`), o si se intenta colar una clave secreta (`service_role`, `sb_secret_`), la aplicación se bloquea con una pantalla de error explícita y no permite operar localmente en falso.

---

## 2. Modo Demo (Aislado y Sintético)

Cuando no se define configuración o se especifica `mode: "demo"`, Nexo Pedidos opera de manera 100% aislada:

```javascript
window.NEXO_PUBLIC_CONFIG = {
  mode: "demo"
};
```

### Comportamiento en Modo Demo
* **Bloqueo estricto de APIs de datos**: Un guard en runtime intercepta y bloquea `fetch`, `WebSocket`, `XMLHttpRequest`, `EventSource` y `window.open` para garantizar que no se realicen conexiones no deseadas a servidores externos.
* **Datos sintéticos locales**: Catálogo predeterminado de 17 productos, clientes de prueba (`Ana Demo`, `Bruno Demo`), pedidos iniciales (#101, #102) y perfil sintético (`Comercio Demo Nexo`).
* **WhatsApp simulado**: Los mensajes de pedidos listos y consultas no abren WhatsApp real, sino que se registran localmente en el historial de simulación.
* **Namespace aislado**: Almacenamiento exclusivo en `nexo_demo_v1_*`, sin alterar datos productivos.
* **Cartel indicador**: Barra superior persistente indicando que se encuentra en modo demostración.

---

## 3. Despliegue en Vercel

En Vercel, el builder [`scripts/build-public.mjs`](../scripts/build-public.mjs) inspecciona las variables de entorno de producción:
* `NEXT_PUBLIC_SUPABASE_URL` o `SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` o `NEXT_PUBLIC_SUPABASE_ANON_KEY`
* `BUSINESS_NAME` (opcional, por defecto "Nexo Pedidos")
* `BUSINESS_ALIAS` (opcional)
* `BUSINESS_WHATSAPP` (opcional)

Con ellas genera `dist/public/js/public-config.js` antes de servir los activos estáticos, asegurando que el cliente navegador reciba la configuración productiva sin exponer ningún secreto del servidor.
