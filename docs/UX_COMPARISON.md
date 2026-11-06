# Comparativa de Experiencia de Usuario: Nexo Pedidos vs MiHuerta

**Fecha:** 2 de noviembre de 2026 (Actualizado en QA-B-PROPOSAL)
**Documento:** `docs/UX_COMPARISON.md`
**Paquete:** QA-A / QA-B-PROPOSAL
**Método:** Inspección estática de código fuente y referencias exactas en ambos repositorios (sin mutación de `D:\Escritorio\miHuerta`).

---

## 1. Alcance y Límites de la Comparación Estática

La evaluación inicial del usuario señaló que *«Nexo se siente más pobre que MiHuerta»*. Una inspección estática de código fuente no constituye una demostración objetiva de preferencias estéticas individuales ni reemplaza la prueba de usuario en campo; sin embargo, permite contrastar hechos verificables en el código:

1. **Scroll en Línea Base:**
   Ambos repositorios compartían en su baseline la regla `html, body { max-width: 100vw; overflow-x: hidden; position: relative; }` (`css/style.css:200` en Nexo y `miHuerta/css/style.css:200`). No existe evidencia empírica registrada de que MiHuerta tuviera un desplazamiento fluido en hardware físico bajo las mismas condiciones de desborde; el bloqueo fue reproducido causalmente en Nexo (BUG-001) y resuelto en QA-A con `overflow-x: clip`.
2. **Tema Claro / Oscuro:**
   El modo oscuro no es una novedad originada en Nexo Pedidos. Ya formaba parte de MiHuerta (`miHuerta/css/style.css:76-132`, `miHuerta/index.html:13-36`). El aporte de Nexo en NP-002 consistió en aislar las claves de almacenamiento (`nexo_theme_v1` en lugar de `mihuerta_theme_v3`) para evitar colisiones con el proyecto original.
3. **Tratamiento Unitario Existente en el Código:**
   A nivel de lógica interna, Nexo Pedidos y MiHuerta ya contemplan productos unitarios:
   - En `js/store.js:654`: al crear el pedido, `peso_real: item.unidad_medida === "UNIDAD" ? item.cantidad : null`.
   - En `js/store.js:862`: al agregar un producto al pedido, `peso_real: product.unidad_medida === "UNIDAD" ? qty : null`.
   - En `js/views/operator.js:289-293`: `const isWeight = item.unidad_medida === "KG"; const stepFine = isWeight ? 0.1 : 1;`.
   Por ende, **no existe una exigencia funcional en el backend que impida despachar artículos por unidad**. El problema radica en la **presentación visual y el vocabulario**: la pantalla se titula *"Puesto de Balanza (Operario)"* (`app.js:161`), todas las tarjetas se etiquetan internamente como `.item-weigh-card` (`operator.js:295`), y los inputs numéricos sugieren pesaje gramo a gramo (`placeholder="ej: 2150"`), generando la percepción de que todo artículo debe pesarse.

---

## 2. Inventario Comparativo de Pantallas y Recorridos

### 2.1 Vista Cliente (Catálogo y Pedido)
- **MiHuerta:**
  - Identidad visual fija enfocada en verdulería ("Mi Huerta"), insignia "Abierto", selector de categorías por scroll horizontal.
  - Catálogo de productos con pasos fraccionarios (`step: 0.5` para KG) y enteros (`step: 1` para UNIDAD, ej. Palta Hass en `products-data.js:61`).
  - Carrito bottom-sheet con confirmación de pedido y cálculo estimado.
- **Nexo Pedidos:**
  - Preserva la arquitectura visual base, paleta Slate/Emerald y tipografía Plus Jakarta Sans.
  - Incorporó banner persistente de advertencia en Modo Demo (`index.html:76`) y aislamiento de almacenamiento (`nexo_demo_v1_*`).
  - **Oportunidad de Evolución (Paquetes B y C):**
    - Desacoplar la identidad rígida de verdulería para admitir nombres de fantasía, categorías y rubros diversos sin reescribir código.
    - Clarificar visualmente en la tarjeta si el precio es `$ / kg` o `$ / u`.

### 2.2 Vista Operario (Preparación en Mostrador)
- **Código Vigente (`js/views/operator.js`):**
  - Mantiene 4 columnas Kanban: *Entrantes*, *En Balanza*, *Listos*, *Cobrados*.
  - En la tarjeta de pesaje (`lines 295-385`), aunque `isWeight` conmuta los pasos entre `0.1` y `1`, el contenedor y las leyendas mantienen la semántica de balanza.
  - Permite marcar faltantes (`sin_stock`), eliminar ítems (`removeItemFromOrder`), agregar ítems en preparación (`addProductToOrder`) y cancelación suave (`cancelOrder` en `store.js:818`).
- **Problema de UX Detectado:**
  - Para un comercio unitario o mixto, obligar al operario a interactuar con un input de balanza para ítems unitarios cerrados resulta antinatural.
  - La propuesta B debe proveer un flujo donde el ítem unitario se confirme con un toque ("Listo") o ajuste de unidades preparadas, reservando el pesaje únicamente a ítems con `unidad_medida === "KG"`.

### 2.3 Vista Administración (Precios y Catálogo)
- **Código Vigente (`js/views/admin.js:12-385`):**
  - Permite modificar precios vigentes mediante botones +/- o input numérico, y pausar disponibilidad (`disponible: true/false`).
  - **Carencia confirmada:** No existe interfaz para dar de alta nuevos productos, editar nombres o descripciones, ni archivar ítems sin romper la integridad de pedidos históricos.

---

## 3. Contrato de Datos Compatible con la Fuente Actual

Para asegurar total compatibilidad con `js/products-data.js`, `js/store.js` y las suites de prueba existentes (17, 24, 71, 18), **no se inventan modalidades ficticias ni unidades complejas** (como litros, docenas o fraccionables). El contrato formal es:

```javascript
// Contrato de Producto (Extensible y Retrocompatible)
{
  id: "prod-101",             // string unívoco (ej: "prod-101")
  codigo: "ART-0101",         // string opcional (código interno o SKU para comercio/importación)
  nombre: "Pan Francés",      // string obligatorio saneado
  categoria: "Panadería",     // string obligatorio
  unidad_medida: "UNIDAD",    // estrictamente "KG" o "UNIDAD"
  precio: 2400,               // número entero positivo finito
  paso: 1,                    // número positivo: 1 para UNIDAD; 0.5 o 0.25 para KG
  disponible: true,           // booleano: activo en catálogo cliente
  archivado: false            // booleano: borrado lógico en admin (preserva historial)
}
```

### Reglas de Negocio en Preparación y Precios:
1. **Ítem Unitario (`unidad_medida: "UNIDAD"`):**
   - Cantidad solicitada: número entero (`paso: 1`).
   - Preparación: confirmación de cantidad entera preparada (`0`, `1`, `2`...).
   - No se exige balanza ni se muestran campos en gramos.
2. **Ítem Pesable (`unidad_medida: "KG"`):**
   - Cantidad solicitada: estimación en kilogramos (`paso: 0.5` o `0.25`).
   - Preparación: ingreso de peso real en kilogramos con visualización dual inequívoca (ej: `1.450 kg` / `1450 g`).
3. **Confirmación del Precio Final:**
   - **El precio final de un pedido sólo se confirma al cerrar la preparación**, incluso en pedidos puramente unitarios. Esto responde a la realidad operativa del comercio: un ítem unitario puede sufrir faltantes (`sin_stock`), reducción de cantidad acordada o reemplazo en mostrador.
4. **Validez del Total Cero:**
   - Un pedido cuyo `total_real` resulte `$0` (por bonificación total o falta de stock de todos sus ítems) es **estrictamente válido**. Se debe evitar la expresión `total_real || total_estimado` y evaluar `typeof order.total_real === "number" ? order.total_real : order.total_estimado`.

---

## 4. Delimitación del CRUD y Relevamiento de Importación Masiva

### 4.1 CRUD en Modo Demo (Paquete C)
- **Alta de Producto:** Modal accesible con validación de campos obligatorios (`nombre`, `categoria`, `unidad_medida`, `precio`, `paso`).
- **Edición Rápida:** Modificación de precio en línea y toggle de disponibilidad.
- **Borrado Lógico / Archivo:** Marcar `archivado: true`. **Prohibido el borrado físico (`delete`)** en la base de datos para no invalidar pedidos pasados que referencien ese `producto_id`.
- **Delimitación de Inventario:** La disponibilidad es estrictamente booleana (`disponible: true/false`). No se promete ni implementa control cuantitativo de existencias (stock por unidades o kilos) hasta tanto no se desarrolle un módulo formal de movimientos y reservas.

### 4.2 Relevamiento de Importación Masiva (Paquete D)
No se incorporan dependencias externas ni parsers en esta etapa. El diseño se delimita al flujo interactivo de 4 pasos para relevar con el cliente:
1. **Carga de Archivo:** Recepción de archivo CSV/Excel.
2. **Asociación de Columnas:** Mapeo de encabezados del archivo del cliente hacia los campos de Nexo (`codigo`, `nombre`, `categoria`, `unidad_medida`, `precio`).
3. **Validación y Previsualización:** Detección de duplicados, precios no numéricos y filas con errores antes de impactar el almacén.
4. **Confirmación:** Aplicación de altas/actualizaciones y resumen con posibilidad de revertir la carga.
