# Contrato previo de catálogo demo y preparación — borrador de implementación

Estado: para revisar con la propuesta visual B; NO autoriza extender rediseño ni conectar datos reales. No es un backend productivo.

## Compatibilidad

Se conservan id, nombre, categoria, unidad_medida (sólo KG/UNIDAD), precio, paso, disponible y detalle. Se agregan codigo/SKU opcional y archivado. No se introduce FRACCIONABLE ni nuevas unidades sin requisitos. El contrato usa paso, como la fuente actual, no step.

Precios finitos no negativos; moneda actual con redondeo coherente, sin introducir conversiones de moneda por UI. Un producto gratuito puede tener precio0; no confundir un cero válido con un campo vacío. Paso de solicitud positivo y finito: UNIDAD1, KG fracción permitida y precisada. Peso real es kg internamente; la UI debe convertir gramos una sola vez e indicar ambas unidades. Cantidad preparada unitaria entera>=0; peso>=0, faltante explícito.

## Identidad e historial

ID estable generado localmente en demo, no reutilizado al archivar. SKU opcional normalizado y único (considerar archivados), nombre/categoría obligatorios con límites. Categorías derivadas de datos y configurables; no un enum fijo por cliente. Escapar al renderizar, conservar texto original en datos.

Pedidos y carrito mantienen sus snapshots. Editar precio/nombre/unidad del producto o archivarlo no reescribe pedidos históricos. Cambiar la modalidad de un producto referenciado debe estar prohibido o requerir crear uno nuevo; resolver explícitamente antes de implementar. Archivar saca del catálogo y del selector de agregar ítems, conserva referencia histórica. No usar delete físico. Una fila de catálogo no es una cantidad de inventario.

## Preparación

Entrantes -> En preparación -> Listos -> Entregados/Cobrados debe representar los estados actuales sin reinterpretar cobro como entrega si no hay registro de pago. Unitario se prepara con cantidad y confirmación, sin campo de balanza. Pesable muestra solicitado estimado y peso real. Mixto combina ambos; total final se confirma al cerrar preparación, incluso unitario puede cambiar por faltante o edición.

Total real0 se conserva con distinción null/undefined vs0; usar validación finita, no || y no aceptar NaN como precio confirmado. Preservar cambiar entrega, sumar/quitar ítems, faltante, cancelación, seguimiento y UI móvil.

## Dependencias de entrega

Primero propuesta visual revisada por Facu, BUG-002 corregido y catálogo corrupto recuperable; después CRUD demo y una porción vertical con pruebas de pedido unitario/peso/mixto, cambios/archivo e historial intacto. RLS/Auth/RPC/DB descartable son necesarios para datos reales; PIN local no los sustituye. La falta de entorno DB no impide diseñar/testear demo, pero impide declarar controles productivos comprobados.
