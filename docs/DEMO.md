# Modo Demo y Configuración Pública (`NEXO_PUBLIC_CONFIG`)

Nexo Pedidos inicia **por defecto en Modo Demo aislado** con datos sintéticos. Ninguna instalación nueva se conecta a proyectos heredados ni envía mensajes reales.

## 1. Comportamiento del Modo Demo (predeterminado)

Cuando `window.NEXO_PUBLIC_CONFIG` no está definido o tiene `mode: "demo"`:

- **Cero conexiones externas:** no se carga el SDK de Supabase, no se invoca `supabase.createClient` y un guard en runtime bloquea `fetch`, `WebSocket`, `EventSource`, `XMLHttpRequest`, `navigator.sendBeacon` y `window.open`.
- **Namespace propio:** todos los datos locales se guardan bajo el prefijo `nexo_demo_v1_*` (y `nexo_theme_v1` para el tema visual). Cualquier dato preexistente bajo `mihuerta_*` en el navegador es ignorado por completo y nunca se migra.
- **Datos sintéticos:** el catálogo, los clientes (`Ana Demo (sintética)` — `1100000001`, `Bruno Demo (sintético)` — `1100000002`), los pedidos iniciales (`#101`, `#102`) y el perfil del comercio (`Comercio Demo Nexo`, alias `alias.demo.nexo`) son valores sintéticos de demostración.
- **WhatsApp simulado:** tanto la consulta del cliente como el botón de aviso de pedido pesado registran el mensaje en memoria/almacenamiento local (`nexo_demo_v1_simulated_messages`) y muestran confirmación visual de simulación sin abrir enlaces `wa.me`.
- **Aviso persistente:** la barra superior muestra en todo momento el cartel `MODO DEMO · Datos sintéticos · WhatsApp simulado · Sin conexión a servicios reales`.
- **Panel de administración acotado:** desde la interfaz no se pueden ingresar URLs ni claves de Supabase; sólo se permite ajustar precios/disponibilidad y el PIN local de interfaz.

## 2. Archivo de configuración pública (`js/public-config.js`)

La configuración pública vive en `js/public-config.js` y se carga en `index.html` **antes** de `js/bundle.js` (compatible con `file:///` y servidor estático sin duplicar configuración dentro del bundle).

### Ejemplo en Modo Demo (valor por defecto del repositorio)

```js
window.NEXO_PUBLIC_CONFIG = {
  mode: "demo"
};
```

Opcionalmente se puede personalizar el perfil sintético en demo:

```js
window.NEXO_PUBLIC_CONFIG = {
  mode: "demo",
  business: {
    name: "Fiambrería Demo Nexo",
    alias: "fiambreria.demo.nexo",
    whatsapp: "5491100000000",
    whatsappDisplay: "+54 11 0000-0000 (demo)"
  }
};
```

### Ejemplo en Modo Producción (una instalación por comercio)

```js
window.NEXO_PUBLIC_CONFIG = {
  mode: "production",
  business: {
    name: "Nombre del Comercio",
    alias: "alias.bancario.comercio",
    whatsapp: "54911XXXXXXXX"
  },
  supabase: {
    url: "https://<tu-proyecto>.supabase.co",
    anonKey: "<clave-publica-anon-o-publishable>"
  }
};
```

## 3. Reglas de seguridad y fallo cerrado en Producción

1. **Separación estricta de secretos:** `js/public-config.js` es público y llega al navegador. **Nunca** coloques allí `service_role`, `sb_secret_*`, secretos JWT, contraseñas de base de datos ni tokens de WhatsApp/Meta. Si el validador detecta un JWT con `role !== "anon"`, un prefijo `sb_secret_` o propiedades prohibidas (`serviceRoleKey`, `secret`, `password`, `databaseUrl`), bloquea el arranque.
2. **Sin fallback silencioso:** si `mode` es `"production"` y falta `business.name`, `supabase.url` (debe ser `https://`) o `supabase.anonKey`, la aplicación **no inicia**, muestra el detalle de errores en pantalla y bloquea la creación de pedidos para no simular éxito local.
3. **Límites actuales (previos a NP-004..NP-009):** este paquete aísla la demo y el contrato de configuración pública; la autenticación de personal con RLS, la creación transaccional idempotente y el outbox de WhatsApp se implementan en sus paquetes dedicados posteriores.
