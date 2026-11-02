# Servidor Estático Confinado y Raíz Pública (`dist/public`)

Nexo Pedidos separa estrictamente la raíz pública entregada al navegador (`dist/public`) del árbol del repositorio Git. El servidor HTTP estático nunca sirve la raíz del repositorio ni realiza fallback automático a `index.html` ante rutas privadas o inexistentes.

## 1. Construcción de la raíz pública por allowlist (`scripts/build-public.mjs`)

El script [`scripts/build-public.mjs`](file:///d:/Escritorio/nexo-pedidos-worktrees/NP-003/scripts/build-public.mjs) genera `dist/public` limpiando cualquier contenido previo y copiando exclusivamente la lista blanca (`PUBLIC_ALLOWLIST`) de activos necesarios en el navegador:

- `index.html`
- `css/style.css`
- `js/public-config.js`
- `js/bundle.js`

Quedan **fuera de `dist/public`**:
- Variables de entorno y secretos (`.env`, `.env.local`, `bot/.env`).
- Sesiones y estado del conector de WhatsApp (`auth_info_baileys/`, `bot/auth_info_baileys/`, `.cooldowns.json`, `bot/.cooldowns.json`).
- Metadatos de control de versiones y agentes (`.git/`, `.agents/`, `coordination/`).
- Scripts de base de datos (`supabase/*.sql`), código del bot (`bot/*.js`), fuentes modulares (`js/store.js`, `js/views/*`) y suites de prueba (`tests/`).

### Comando para construir `dist/public`

Desde la raíz del repositorio:

```powershell
node scripts/build-public.mjs
```

## 2. Contrato del servidor importable (`bot/static-server.js`)

El módulo [`bot/static-server.js`](file:///d:/Escritorio/nexo-pedidos-worktrees/NP-003/bot/static-server.js) depende únicamente de módulos core de Node.js (`node:http`, `node:fs`, `node:path`). No importa ni inicializa `@whiskeysockets/baileys`, `@supabase/supabase-js`, `dotenv`, `pino` ni `qrcode-terminal`, por lo que puede importarse y probarse sin instalar dependencias del bot.

```js
import { createStaticServer } from "./bot/static-server.js";

const server = createStaticServer({ publicRoot: "dist/public" });
// No ejecuta server.listen() al importar ni al construir la instancia.
```

### Reglas de seguridad y confinamiento

1. **Métodos permitidos:** únicamente `GET` y `HEAD` (`200 OK` con `Content-Type`, `Content-Length` y `X-Content-Type-Options: nosniff`). Cualquier otro método (`POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`) responde `405 Method Not Allowed` con cabecera `Allow: GET, HEAD`.
2. **Validación de URL y decodificación única:**
   - Rechaza con `400 Bad Request` URLs vacías, secuencias `%` malformadas (`URIError`), bytes NUL (`\0` o `%00`), caracteres de control o rutas que inicien con `//`.
   - Ignora la query string (`?demo=1`, `?tel=...`) y el fragmento (`#...`) al resolver rutas en disco.
   - Decodifica `rawPathname` una única vez con `decodeURIComponent` y rechaza con `403 Forbidden` cualquier doble codificación residual (`%252e`, `%252f`, `%255c`, `%2500`).
3. **Bloqueo de traversal, separadores Windows y dotfiles:**
   - Rechaza con `403 Forbidden` barras invertidas literales (`\`) o codificadas (`%5c`), barras codificadas (`%2f`), caracteres `:` (unidades o flujos NTFS `::$DATA`), nombres de dispositivo reservados de Windows (`CON`, `PRN`, `AUX`, `NUL`, `COM1..9`, `LPT1..9`) y segmentos con punto o espacio final.
   - Rechaza con `403 Forbidden` cualquier segmento `.` o `..`, cualquier dotfile o directorio oculto en cualquier nivel (`.env`, `.git`, `.cooldowns.json`, `css/.hidden`), segmentos privados (`auth_info_baileys`, `node_modules`, `supabase`, `coordination`, `bot`) y extensiones sensibles (`.sql`, `.env`, `.pem`, `.key`, `.db`, `.sqlite`, `.ps1`, `.sh`, `.bat`, `.cmd`, `.lock`).
4. **Confinamiento real con `path.relative` + `fs.promises.realpath`:**
   - Verifica la relación padre-hijo mediante `isPathInsideRoot(rootPath, targetPath)` basada en `path.relative`, impidiendo colisiones por prefijo de directorio hermano (por ejemplo, `public` frente a `public-private`).
   - Resuelve `fs.promises.realpath` tanto sobre `publicRoot` como en cada segmento del camino solicitado, bloqueando con `403 Forbidden` cualquier symlink o *directory junction* de Windows que apunte fuera de `publicRoot`.
5. **Sin fallback HTML:**
   - Sólo `/` se resuelve a `/index.html`.
   - Las rutas inexistentes o directorios (`/css/`, `/js/store.js`, `/no-existe`) devuelven `404 Not Found` en `text/plain; charset=utf-8`, nunca el contenido de `index.html`.

## 3. Servidor Demo CLI aislado (`bot/serve-demo.js`)

Para levantar la demo sintética de `NP-002` en un navegador local sin iniciar el bot de WhatsApp ni conectar a Supabase:

```powershell
node bot/serve-demo.js
```

Por defecto:
- Ejecuta `buildPublic()` para actualizar `dist/public` por allowlist.
- Escucha exclusivamente en `127.0.0.1:3000` (configurable con `--port <puerto>`, `--host <host>` o `--no-build`).
- Expone el catálogo en `http://127.0.0.1:3000/` y la barra del simulador de roles en `http://127.0.0.1:3000/?demo=1`.

## 4. Integración en el worker (`bot/index.js`)

`startLocalWebServer()` en [`bot/index.js`](file:///d:/Escritorio/nexo-pedidos-worktrees/NP-003/bot/index.js) construye `dist/public` mediante `buildPublic` y delega el servidor HTTP a `createStaticServer({ publicRoot: DEFAULT_PUBLIC_ROOT })`, eliminando el uso de `path.resolve(__dirname, "..")`.

> [!IMPORTANT]
> Nunca ejecutes `node bot/index.js` para probar el servidor estático, ya que `bot/index.js` inicia el conector de WhatsApp. Utilizá siempre `node bot/serve-demo.js` o la suite `node tests/test-static-server.test.mjs`.

## 5. Verificación automatizada

```powershell
node tests/test-static-server.test.mjs
```

La suite levanta instancias efímeras en `127.0.0.1:0` con fixtures temporales fuera y dentro de la raíz pública, marcadores sintéticos en memoria, *junctions* hacia directorios externos y pruebas de supervivencia tras errores `400`/`403`/`404`/`405`.
