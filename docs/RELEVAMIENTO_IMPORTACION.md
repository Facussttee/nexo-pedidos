# Relevamiento para futura carga masiva

No hay parser implementado ni formato elegido. Completar con el cliente y una muestra anonimizada antes de decidir dependencias o mapear su catálogo real.

- Origen: Excel/CSV/exportación de sistema, hojas relevantes y tamaño típico/máximo.
- Identificador estable: SKU/código de barras/interno; unicidad, ceros iniciales y cambios de código. Nunca convertir códigos numéricos a números si puede perderse información.
- Columnas: nombre, categoría, modalidad KG/UNIDAD, unidad y base de precio, paso de solicitud, moneda, precio, disponibilidad. Separar existencia cuantitativa de disponibilidad.
- Formatos: decimal coma/punto, miles, moneda, blancos, fórmulas vs valores, codificación y delimitadores. No ejecutar fórmulas ni macros; tratar el archivo como datos.
- Política: crear/actualizar/ignorar, campo de coincidencia, duplicados dentro/entre archivos, productos ausentes y archivados, cambios de unidad, precio0 y filas inválidas.
- Operación: volumen, frecuencia, responsables, permiso de publicar, vigencia de precio y posibilidad de volver atrás.

Contrato de preview futuro: encabezados/hoja -> mapeo de columnas -> filas normalizadas con origen/fila y errores por campo -> conteo de altas/actualizaciones/ignoradas/errores -> confirmación explícita -> resumen con IDs/versiones. Ensayo sin escrituras; no ejecutar cargas parciales ambiguas ni prometer atomicidad sin un mecanismo probado. Reimportar no debe duplicar inadvertidamente. Preservar snapshots de pedidos y el catálogo previo al aplicar el lote.

La vista previa del prototipo es ilustrativa: no lee Excel ni escribe productos. El diseño final depende de las respuestas anteriores.
