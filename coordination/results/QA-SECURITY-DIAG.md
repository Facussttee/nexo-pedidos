# Diagnóstico de Seguridad y Robustez (QA-SECURITY-DIAG)

**Repositorio:** Nexo Pedidos (`D:\Escritorio\nexo-pedidos-worktrees\quality`)
**Rama:** `codex/quality-navigation`
**Fecha:** 2 de noviembre de 2026
**Auditor:** Agente Especializado de Seguridad (Subagente `research` - Gemini 3.8 Flash Medium, sólo lectura de código)
**Alcance:** Auditoría estática y diagnóstica de código fuente y esquemas SQL.
*Nota de rigor técnico:* El análisis de base de datos y RLS constituye un **riesgo estático condicionado a los permisos y roles realmente desplegados en Supabase**. No representa una prueba de acceso real, ataque de red ni penetración contra servicios productivos.

---

## 1. Resumen Ejecutivo y Diferenciación Estructural

El análisis del repositorio evidencia dos realidades técnicas marcadamente distintas:

1. **Avances y Robustez introducidos en Nexo Pedidos (NP-001 a NP-003):**
   - **Confinamiento estático robusto (NP-003):** Servidor HTTP puro (`bot/static-server.js`) con verificación canónica estricta (`fs.promises.realpath` + `path.relative`), denegación por defecto, bloqueo de traversal (URL-encoded y doble decoding), protección contra junctions/symlinks de NTFS, y rechazo de nombres reservados de Windows y dotfiles. Publicación confinada exclusivamente a `dist/public` creada por allowlist (`scripts/build-public.mjs`).
   - **Aislamiento de Demo y Fallo Seguro (NP-002):** Aislamiento total de almacenamiento (`nexo_demo_v1_*` vs `mihuerta_*`), neutralización activa de APIs de red en modo demo (`installDemoNetworkGuard`) y fail-closed en producción ante parámetros faltantes o presencia de credenciales prohibidas (bloqueo de `service_role` y `sb_secret_`).

2. **Deuda Técnica Crítica Heredada (de MiHuerta MVP):**
   - **XSS Almacenado en Vistas:** Renderizado directo de entradas no confiables (nombre de cliente, dirección, productos) mediante plantillas literales `${...}` asignadas a `.innerHTML` sin sanitización ni escape de entidades HTML en `client.js`, `operator.js` y `admin.js`.
   - **Riesgo Estático en Esquema SQL Supabase (`USING (true) WITH CHECK (true)`):** En `supabase/schema.sql`, las políticas MVP declaran acceso irrestricto para cualquier cliente con `anonKey`. Si se despliega este esquema sin modificaciones, la base de datos queda abierta a manipulaciones anónimas.
   - **Ausencia de Autenticación y Autorización en Servidor (PIN Gate en Frontend):** El acceso de operario y administrador descansa en un PIN de 4 dígitos guardado en texto plano en `localStorage`, sin distinción de roles entre pesaje y administración de precios, y eludible mediante consola de navegador.
   - **Exposición de PII en Cliente:** Consulta directa `select * from pedidos limit 50` en `store.js` que en modo producción descarga pedidos y teléfonos de clientes en el navegador.

---

## 2. Análisis Detallado por Vectores y Superficies

### Vector 1: Exposición de Configuración y Secretos
*Archivos inspeccionados: `js/public-config.js`, `js/config.js`, `bot/.env.example`, `bot/index.js`*

- **Implementación Nexo Pedidos:**
  - `js/public-config.js` está desacoplado del bundle (`window.NEXO_PUBLIC_CONFIG`). En modo demo predeterminado, no expone URLs ni claves.
  - `js/config.js` implementa `findForbiddenFields()` con 11 claves sensibles bloqueadas (`service_role`, `secret`, `jwtsecret`, `password`, `databaseurl`, etc.) y decodifica el token JWT para certificar que el rol sea exclusivamente `"anon"`.
  - Si se intenta arrancar en producción con campos faltantes o secretos, `renderConfigErrorGate` aborta el arranque sin fallback a demo ni a credenciales heredadas.
- **Riesgos y Hallazgos:**
  - *Deuda Heredada:* El modelo Supabase para SPA exige exponer `supabaseAnonKey` en el navegador del cliente. Dado que las políticas RLS están abiertas en el esquema MVP (ver Vector 3), la exposición de la `anonKey` condiciona la seguridad de la base de datos.
  - *Riesgo Operativo:* `js/public-config.js` está bajo seguimiento Git. Si un comercio completa sus credenciales directamente sobre el archivo en el repositorio en lugar de inyectarlo en despliegue, existe riesgo de divulgación en repositorios de control de versiones.
  - *Servicio Bot Heredado:* `bot/index.js` (no ejecutado) lee `SUPABASE_URL` y `SUPABASE_ANON_KEY` desde `bot/.env` y escucha en `0.0.0.0` (red local/LAN).

---

### Vector 2: Autenticación, Autorización y Roles
*Archivos inspeccionados: `js/app.js`, `js/store.js`, `js/views/client.js`, `js/views/operator.js`, `js/views/admin.js`*

- **Implementación Actual:**
  - El PIN del personal se almacena en `localStorage` bajo `nexo_[mode]_v1_local_settings` (por defecto `"1234"`).
  - Al validar el PIN, se guarda `nexo_[mode]_v1_pin_unlocked = true`.
- **Riesgos y Hallazgos Críticos (Deuda Técnica Heredada):**
  1. **Autenticación Ficticia en Frontend:** No existe sesión de backend, token de autorización ni cookie `HttpOnly`. Un usuario malicioso puede abrir la consola DevTools y ejecutar `localStorage.setItem('nexo_demo_v1_pin_unlocked', 'true')` o leer directamente el PIN almacenado en el navegador.
  2. **Ausencia de Separación de Privilegios (Falta de RBAC):** El estado `isStaffUnlocked()` es único y global. Quien desbloquea el Puesto de Balanza (`operator`) queda automáticamente habilitado para acceder al Panel de Precios y Configuración (`admin`).
  3. **Suplantación de Identidad de Clientes:** En `client.js` y `store.js`, el cliente se identifica únicamente por su número telefónico. No hay validación OTP ni verificación de posesión; cualquier tercero puede visualizar el pedido activo (`store.getActiveOrder`) y dirección de otro cliente ingresando su número.

---

### Vector 3: RLS y Acceso a Base de Datos (Riesgo Estático Condicionado)
*Archivos inspeccionados: `supabase/schema.sql`, `js/store.js`*

- **Políticas en `supabase/schema.sql` (Líneas 83-105):**
  ```sql
  ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Permitir acceso publico a clientes MVP" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Permitir acceso publico a productos MVP" ON public.productos FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Permitir acceso publico a pedidos MVP" ON public.pedidos FOR ALL USING (true) WITH CHECK (true);
  ```
- **Evaluación de Riesgo Estático:**
  1. **Dependencia Crítica del Despliegue Real:** Las directivas `FOR ALL USING (true) WITH CHECK (true)` declaran formalmente acceso irrestricto anónimo. El impacto real en producción depende de si la instancia desplegada de Supabase aplica este esquema literal o cuenta con políticas administradas externamente.
  2. **Manipulación Potencial de Catálogo:** En `store.js` (líneas 419 y 434), se invoca `supabase.from("productos").update(...)` desde el cliente frontend, asumiendo permisos de escritura anónimos en catálogo.
  3. **Fuga Masiva de PII en Código Cliente:** En `store.js` línea 253, la llamada `this.supabase.from("pedidos").select("*").order("id", { ascending: false }).limit(50)` intentará descargar los pedidos de todos los clientes si la base de datos lo autoriza.
- **Protección Nexo Pedidos en Local:** En modo demo, `installDemoNetworkGuard` y la ausencia de cliente Supabase neutralizan por completo este vector en local. El riesgo queda condicionado a un eventual paso a producción con Supabase activo.

---

### Vector 4: Saneamiento de Entradas No Confiables (XSS en Plantillas HTML)
*Archivos inspeccionados: `js/views/client.js`, `js/views/operator.js`, `js/views/admin.js`*

- **Implementación Actual:**
  Las vistas interpolan variables en plantillas de cadenas (`${...}`) e inyectan el resultado mediante `container.innerHTML = ...` sin función de escape (`escapeHtml`) ni sanitización.
- **Vectores de Inyección Detectados (XSS Almacenado):**
  1. **Nombre del Cliente (`order.cliente.nombre`):**
     - En `operator.js` (Kanban de mostrador), se renderiza en HTML crudo en múltiples ubicaciones (líneas 198, 267, 539, 598).
     - Si un cliente ingresa etiquetas `<script>` o `<img>` maliciosas en su nombre, se ejecutarían en el contexto del navegador del mostrador al listar pedidos.
  2. **Dirección de Entrega (`order.direccion_entrega`):**
     - En `client.js` línea 1274 y en `operator.js`, se inyecta en tarjetas y modales de edición sin sanitización.
  3. **Nombre y Categoría de Productos (`p.nombre`, `p.categoria`):**
     - En `client.js` y `admin.js`, se renderizan directamente en las tarjetas y encabezados de producto.

---

### Vector 5: Confinamiento Estático y Rutas del Servidor
*Archivos inspeccionados: `bot/static-server.js`, `scripts/build-public.mjs`, `bot/serve-demo.js`*

- **Evaluación de Confinamiento (Nexo Pedidos NP-003):**
  - **Estado:** **BLINDADO / VERIFICADO.**
  - `build-public.mjs` valida canónicamente que `sourceRoot` y `outDir` sean directorios reales, comprobando la inexistencia de enlaces simbólicos o junctions de NTFS tanto en directorios padres como hijos.
  - `static-server.js` implementa denegación por defecto:
    - Métodos permitidos: únicamente `GET` y `HEAD` (405 para el resto).
    - Verificación `isPathInsideRoot` con `path.relative` inmune a colisiones de prefijo hermano.
    - Resolución física paso a paso con `fs.promises.realpath`.
    - Bloqueo de traversal: `..`, `%2e`, backslashes (`%5c`), NUL bytes (`%00`), nombres reservados de Windows (`CON`, `NUL`, `AUX`, `COM1-9`, `LPT1-9`) y dos puntos NTFS (`:`).
    - Bloqueo explícito de dotfiles (`.env`, `.git`), extensiones críticas (`.sql`, `.pem`, `.key`, `.ps1`) y directorios sensibles (`bot`, `supabase`, `auth_info_baileys`).
    - Cabeceras de seguridad: `X-Content-Type-Options: nosniff`, `Cache-Control: no-cache` / `no-store`.
    - `serve-demo.js` vincula a `127.0.0.1` (loopback).

---

### Vector 6: Almacenamiento Local (LocalStorage)
*Archivos inspeccionados: `js/config.js`, `js/store.js`, `tests/test-demo-isolation.test.mjs`*

- **Evaluación de Almacenamiento (Nexo Pedidos NP-001/NP-002):**
  - **Estado:** **AISLADO Y DEFENSIVO.**
  - `buildStorageKeys()` segmenta el espacio por modo y versión: `nexo_demo_v1_*`, `nexo_prod_v1_*`, `nexo_theme_v1`.
  - Erradicada la lectura, escritura y migración de claves heredadas de MiHuerta.
  - Mecanismo de contingencia `memoryFallback` si `localStorage` no está disponible.
- **Riesgo Residual:**
  - `localStorage` no está cifrado; el PIN de staff y los teléfonos de clientes no deben considerarse secretos protegidos frente a accesos físicos al dispositivo.

---

## 3. Tabla Resumen de Hallazgos y Matriz de Riesgo

| # | Vector | Hallazgo Principal | Severidad | Origen | Naturaleza |
|---|---|---|---|---|---|
| **H-01** | Base de Datos / RLS | Políticas RLS abiertas con `USING (true)` en `schema.sql` | **CRÍTICA** | Deuda MiHuerta | Riesgo estático condicionado a despliegue real |
| **H-02** | Privacidad / PII | `pullFromSupabase()` descarga los últimos 50 pedidos y teléfonos de clientes | **ALTA** | Deuda MiHuerta | Riesgo en cliente condicionado a permisos Supabase |
| **H-03** | Frontend / XSS | Ausencia de escape HTML en plantillas `.innerHTML` (`cliente.nombre`, `direccion`) | **ALTA** | Deuda MiHuerta | Vulnerabilidad estática confirmada en código |
| **H-04** | Auth / Autorización | PIN gate en frontend en texto plano en `localStorage`; rol único compartido | **MEDIA** | Deuda MiHuerta | Vulnerabilidad lógica en cliente |
| **H-05** | Auth / Identidad | Identificación de cliente exclusivamente por número de teléfono | **MEDIA** | Deuda MiHuerta | Limitación de diseño MVP |
| **H-06** | Configuración | Posible commit accidental de `public-config.js` con credenciales reales | **BAJA** | Riesgo Operativo | Riesgo de gestión de configuración |
| **H-07** | Confinamiento Servidor | Servidor estático y builder confinados en `dist/public` con allowlist | **CORREGIDO** | Nexo Pedidos NP-003 | Superficie blindada y probada |
| **H-08** | Almacenamiento Local | Namespace aislado `nexo_demo_v1_*`, cero lecturas `mihuerta_*` | **CORREGIDO** | Nexo Pedidos NP-002 | Aislamiento de estado garantizado |

---

## 4. Recomendaciones de Mitigación y Hoja de Ruta (NP-004+)

1. **Higienización de UI (paquete inmediato):**
   - Incorporar helper liviano de escape de entidades HTML (`escapeHtml`) y aplicarlo en todos los puntos donde se interpolen datos de usuario o catálogo dentro de `.innerHTML`.
2. **Arquitectura de Base de Datos (previo a cualquier activación productiva de Supabase):**
   - Reformular `supabase/schema.sql` con políticas RLS restrictivas por rol y eliminar consultas masivas sin filtro en `store.js`.
3. **Autenticación y Roles:**
   - Desacoplar el rol de `operario` (pesaje) del rol de `admin` (precios) y migrar el PIN a un mecanismo de sesión validado por servidor en producción.
4. **Higiene de Despliegue:**
   - Evitar versionar credenciales reales en `js/public-config.js`, inyectándolas en variables de entorno durante el build.
