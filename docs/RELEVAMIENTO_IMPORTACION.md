# Relevamiento e Implementación de Carga Masiva (`V2-05` — Implementado)

> **Estado actual (2026-11-10):** Implementado en `js/csv-parser.js`, `js/store.js` (`importCatalogBatch`) y `js/views/admin.js`, verificado por `tests/test-catalog-import.test.mjs` y `tests/test-v2-05-adversarial.test.mjs`.

## Características Implementadas en `V2-05`

1. **Parser RFC 4180 sin dependencias (`js/csv-parser.js`)**:
   - Soporta delimitadores coma (`,`), punto y coma (`;`) y tabulación (`\t` / TSV) con detección automática.
   - Respeta comillas dobles escapadas (`""`), comas dentro de celdas entrecomilladas, saltos de línea embebidos y tildes/UTF-8.
2. **Preservación estricta de SKU (`codigo`)**:
   - Los códigos SKU se mantienen siempre como `String` (conservando ceros a la izquierda como `"00125"` o alfanuméricos como `"VER-001"`).
3. **Normalización de Precios y Unidades**:
   - Soporta formatos numéricos argentinos y anglosajones (ej. `$ 1.800,50`, `1,800.50`, `1800`), signos de moneda y espacios.
   - Unidades normalizadas a `KG` o `UNIDAD` y pasos validados (`0.25`, `0.5`, `1`).
4. **Vista Previa sin Escritura (`buildCatalogImportPreview`)**:
   - Antes de modificar el catálogo, el modal en Admin clasifica cada fila en:
     - **Nuevos (Altas)**: SKU o nombre no existente en el catálogo.
     - **Actualizaciones**: Coincidencia por SKU (o nombre exacto si no tiene SKU), mostrando precio anterior vs. nuevo.
     - **Errores por fila**: Número de fila y motivo exacto (nombre vacío, precio inválido, cambio de unidad prohibido en producto con referencias históricas).
5. **Aplicación en Lote Segura (`store.importCatalogBatch`)**:
   - Guarda un backup automático en `localStorage` antes de escribir.
   - Preserva la inmutabilidad de los snapshots históricos en pedidos existentes.
   - En Modo Producción, sincroniza el lote en `public.productos` exigiendo la cabecera `x-nexo-staff-pin`.
