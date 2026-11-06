# Informe de Entrega: QA-B-PROPOSAL — Propuesta Visual Revisable

**Fecha:** 2 de noviembre de 2026
**Worktree:** `D:\Escritorio\nexo-pedidos-worktrees\quality`
**Rama:** `codex/quality-navigation`
**Base:** `1a27cd1`
**Ejecutor:** Antigravity (Gemini 3.8 Flash Medium)
**Configuración:** Un solo escritor, sin subagentes, sin mutación de código de aplicación ni bundle.
**Estado:** PROPUESTA ENTREGADA PARA REVISIÓN DE FACU Y CODEX (No se declara implementada la UI real; prototipo visual autocontenido).

---

## 1. Alcance y Límites Observados

En estricto cumplimiento de las directivas de `coordination/tasks/QA-B-PROPOSAL.md`:
1. **Archivos estrictamente acotados:** Se crearon y modificaron exclusivamente los 3 archivos autorizados:
   - `docs/UX_COMPARISON.md` (Corrección de hechos técnicos y contrato de datos)
   - `docs/proposals/QA-B.html` (Prototipo visual interactivo y autocontenido)
   - `coordination/results/QA-B-PROPOSAL.md` (Informe de entrega y decisiones)
2. **Sin mutación de producto:** No se modificaron `css/style.css`, `js/app.js`, `js/store.js`, las vistas de la aplicación, el bundle ni las suites de tests automatizados.
3. **Sin servicios reales:** Sin llamadas de red, sin base de datos Supabase, sin WhatsApp y sin tocar `D:\Escritorio\miHuerta`.
4. **Sin paralelismo adicional:** Tarea realizada secuencialmente por el ejecutor principal bajo Gemini 3.8 Flash Medium sin invocar subagentes.

---

## 2. Correcciones en la Comparativa Técnica (`docs/UX_COMPARISON.md`)

Se rectificaron las imprecisiones señaladas en la revisión independiente de Codex:
1. **Línea Base de Scroll:** Se eliminó la afirmación subjetiva de que MiHuerta contaba con scroll fluido; se constató que ambos repositorios compartían la misma regla `html, body { max-width: 100vw; overflow-x: hidden; position: relative; }` en su baseline.
2. **Tema Claro / Oscuro:** Se aclaró que el modo oscuro no es una novedad creada por Nexo, sino que ya existía en MiHuerta (`miHuerta/css/style.css:76`, `miHuerta/index.html:13`). Nexo Pedidos aportó el aislamiento de claves de almacenamiento (`nexo_theme_v1` en lugar de `mihuerta_theme_v3`) en NP-002.
3. **Tratamiento Unitario en Código Vigente:** Se identificó que la lógica de negocio ya maneja productos unitarios de forma automática:
   - `js/store.js:654`: `peso_real: item.unidad_medida === "UNIDAD" ? item.cantidad : null` al crear pedido.
   - `js/store.js:862`: `peso_real: product.unidad_medida === "UNIDAD" ? qty : null` al sumar ítems.
   - `js/views/operator.js:289-293`: `isWeight` conmuta pasos entre `0.1` (kg) y `1` (unidades).
   Por ende, **la limitación era visual y de vocabulario** (pantallas rotuladas como "Puesto de Balanza", tarjetas etiquetadas como `.item-weigh-card` y placeholders en gramos), no una exigencia funcional del backend.
4. **Contrato de Datos Estricto y Retrocompatible:**
   - Se descartaron conceptos ficticios (`FRACCIONABLE`, litros, docenas o modalidades incongruentes como unitarios con kg y paso 0.5).
   - Se ratificó el contrato real: `unidad_medida`: strictly `"KG"` | `"UNIDAD"` y `paso`: `0.25`, `0.5`, `1`.
5. **Cierre de Precio y Total Cero:**
   - Se explicitó que el precio final sólo se confirma al finalizar la preparación, dado que incluso los artículos unitarios pueden sufrir faltantes o modificaciones en mostrador.
   - Se validó el total cero (`$0`) como un importe legítimo para evitar fallbacks erróneos por falsy.

---

## 3. Prototipo Visual Autocontenido (`docs/proposals/QA-B.html`)

Se construyó un prototipo visual interactivo, autocontenido y sin dependencias externas:
- **Cero dependencias remotas:** Sin Tailwind CDN, sin fuentes externas, sin fetch, sin localStorage.
- **Responsividad verificada:** Diseño fluido verificado con Playwright en Chromium/Brave a **390x844** (mobile) y **1024x768** (tablet/desktop) con **0 errores de consola**.
- **Ergonomía táctil:** Controles con hitbox >= 44x44 px (`.stepper-btn`, botones de acción, tabs) e inputs con `font-size: 16px` para evitar autozoom en dispositivos móviles.

### Pantalla 1: Puesto de Preparación Adaptable
- **Selector de Presets:** Permite conmutar con un clic entre tres ejemplos reales:
  1. *Pedido Mixto:* Pollería / Almacén (pechuga al peso + maple de huevos unitario + aceite unitario).
  2. *Pedido 100% Unitario:* Panadería / Kiosco (pan de campo + medialunas + mermelada).
  3. *Pedido 100% Pesable:* Verdulería tradicional (tomate + bananas + papas).
- **Tratamiento Diferenciado por Ítem:**
  - **Unitarios (`UNIDAD`):** Stepper de enteros `[ - ]` `cantidad` `[ + ]`, botón de confirmación de un toque (`✓ Listo`) y subtotal reactivo. Sin pedir balanza ni gramos.
  - **Pesables (`KG`):** Input numérico en kilogramos con cálculo automático del equivalente en gramos (`1620 g`) y subtotal reactivo.
- **Barra de Progreso:** Contador reactivo ("2 de 3 ítems preparados") con indicador cromático.
- **Totales Claros:** Total Estimado vs Total Final Preparado.
- **Flexibilidad Operativa:** Botones para marcar faltante / "Sin Stock" ($0), quitar ítem, editar entrega, sumar ítem y cancelar pedido (`cancelOrder`).

### Pantalla 2: Catálogo y CRUD de Administración
- **Listado y Filtros:** Tabla de productos con visualización clara de modalidad (`Por Unidad` vs `Por Kilo`), precios y categorías.
- **Control de Disponibilidad:** Toggle directo activo/pausado.
- **Acción Nuevo Producto:** Abre modal interactivo con formulario completo (Nombre, Categoría, SKU opcional, Modalidad `UNIDAD`/`KG`, Paso y Precio).
- **Archivo Lógico:** Demostración de descarte no destructivo (`archivado: true`) que oculta el ítem del catálogo activo preservando snapshots históricos.

---

## 4. Cómo Abrir y Revisar la Propuesta

El prototipo es 100% compatible con ejecución local directa (doble clic o protocolo `file:///`) sin requerir servidor web activo:

1. **Apertura Directa en Navegador:**
   - Abrir en Chrome, Brave, Edge o Safari la ruta:
     ```text
     file:///D:/Escritorio/nexo-pedidos-worktrees/quality/docs/proposals/QA-B.html
     ```
2. **Inspección en Diferentes Resoluciones:**
   - En las herramientas de desarrollo (F12 / Inspeccionar), conmutar a emulación móvil (ej. iPhone 13 / 390x844) o tablet (iPad / 1024x768).
   - Probar los botones de preset ("Pedido Mixto", "100% Unitario", "100% Pesable") para observar cómo cambia la tarjeta de preparación.
   - Conmutar a la pestaña "2. Catálogo & CRUD" y presionar "+ Nuevo Producto" para probar el formulario.

---

## 5. Próximos Pasos

El paquete QA-B-PROPOSAL queda cerrado en su fase de diseño y propuesta. No se avanzará sobre la implementación del rediseño en la aplicación real (`js/views/operator.js` ni `js/views/admin.js`) hasta tanto Facu y Codex revisen este prototipo y definan las pautas de aceptación para la fase de desarrollo.
