# QA-DELIVERY-PREPARATION — preparación de la demo funcional

Estado: contrato técnico para implementación; la propuesta visual QA-B ya fue aprobada por Facu.
Hito: DEMO FUNCIONAL PARA VALIDAR CON EL COMERCIO, local y con datos sintéticos.
Antigravity es el único implementador; Codex revisa y prueba independientemente antes de integrar.
Orden: completar/revisar QA-E1, QA-E3 y QA-E2 antes de ejecutar este paquete; no repetir su trabajo de almacenamiento.
Fuentes: AGENTS.md, docs/PRODUCT.md, docs/UX_COMPARISON.md §2.2/§3 y docs/proposals/QA-B.html.
No ejecutar este contrato mientras otro paquete tenga el worktree en escritura.

## Alcance de producto ya aprobado

- Implementar la pantalla real de Preparación sobre QA-B, con pedidos UNIDAD, KG y mixtos.
- Vocabulario de preparación; reservar balanza/gramos para KG. Mantener estados existentes.
- Mostrar contador de ítems resueltos / total, solicitado, preparado, subtotal y acciones por ítem.
- Mantener editar entrega/cliente, agregar/quitar ítems, faltante, cancelación y separación estimado/final.
- No implementar aquí CRUD/importador, inventario, pagos nuevos, backend, DB, worker ni mensajes reales.
- Controles táctiles >=44 px e inputs >=16 px; validar a 390x844 y 1024x768.

## Dato mínimo y compatibilidad

- Conservar snapshots y campos actuales: unidad_medida KG|UNIDAD, cantidad_solicitada, precio_unitario,
  peso_real, subtotal y sin_stock. No leer precios/nombres vigentes para recalcular snapshots históricos.
- Agregar sólo `confirmado_preparacion: boolean` al ítem UNIDAD del snapshot de pedido demo.
- Reutilizar peso_real como cantidad preparada UNIDAD (entero >0); no renombrar ni duplicar ese dato.
- La cantidad precargada al crear/agregar UNIDAD es una propuesta editable, nunca confirmación implícita.
- Nuevos ítems UNIDAD nacen con confirmado_preparacion=false; sólo la acción explícita Listo lo vuelve true.
- En pedidos PENDIENTE/EN_PREPARACION antiguos, ausencia del booleano equivale a false para UNIDAD.
  Un peso_real precargado no prueba preparación física. No migrar ni borrar pedidos para normalizarlo.
- KG conserva peso_real como kg reales: número finito >0. No necesita otro booleano.
- Pedidos antiguos LISTO/ENTREGADO no se reabren ni se bloquean por ausencia del nuevo campo:
  mostrar sus snapshots y total_real registrados, incluido 0, sin recomputarlos desde catálogo o estimado.
  Si falta total_real, mostrar que el final no está registrado; el estimado conserva su etiqueta.
- CANCELADO conserva su tratamiento actual. Sin nuevos estados ni cambios de esquema remoto.

## Interacción e invariantes de preparación

- UNIDAD: contador editable con pasos enteros y mínimo 1; botón Listo por ítem. Rechazar fracciones,
  cero, negativos y no finitos; no redondearlos silenciosamente. Cantidad cero se resuelve con Sin Stock.
- KG: input rotulado kg y equivalente g derivado visible (1,450 kg = 1450 g). Aceptar decimal coma/punto;
  no interpretar un entero como gramos según su magnitud. La unidad de entrada siempre es explícita.
- Un ítem está resuelto si sin_stock=true, o si es UNIDAD con cantidad válida y confirmado_preparacion=true,
  o si es KG con peso_real válido positivo. El contador usa exactamente esta regla.
- Cambiar cantidad preparada/solicitada de UNIDAD invalida su confirmación; requiere otro toque Listo.
  Restaurar un UNIDAD faltante también invalida su confirmación. Conservar confirmaciones de otros ítems.
- Agregar un ítem no hereda confirmación: UNIDAD sin confirmar; KG sin peso. Recalcular el contador.
  Quitar un ítem lo excluye del contador y total; no marcar los restantes como preparados automáticamente.
- KG vacío, 0, negativo, texto o no finito queda sin resolver. Si se edita un KG válido y se deja vacío o
  inválido, bloquear cierre: no reutilizar silenciosamente el peso previo ni la cantidad solicitada.
- Sin Stock excluye el ítem de importes y permite resolver faltantes; al restaurar, validar su dato actual.
- No habilitar cierre con cero ítems: agregar un ítem o cancelar. Todos los ítems faltantes sí pueden cerrar en $0.
- Editar dirección/modalidad/cliente no invalida cantidades preparadas de ítems sin cambios.

## Cierre y garantía de precio

- Conservar el contrato numérico existente: total_real puede acumular importes durante preparación.
  Mostrar estimado y total de preparación/provisional con etiquetas distintas; sólo el cierre válido confirma el final.
- Finalizar requiere todos los ítems resueltos. Validar en UI y dentro de finalizeOrderWeighing;
  bloquear también llamadas directas/datos inválidos, sin cambiar estado/total ni emitir order_ready.
- Eliminar el fallback de KG a cantidad_solicitada al cerrar. No convertir entradas inválidas en cero.
- Un cierre válido recalcula subtotales desde cantidades reales confirmadas y precios de snapshot,
  suma los no faltantes, confirma total_real como final y pasa a LISTO. Total 0 es válido, nunca fallback por falsy.
- Conservar el cálculo monetario existente y la simulación demo; no agregar bonificaciones ni cobro nuevo.

## Aceptación y evidencia requerida

- Navegador real: unitario con confirmación explícita, cambio/reconfirmación y cero resuelto con Sin Stock; KG con coma/punto,
  equivalente g, vacío/0/negativo/no finito y edición que invalida un peso antes válido; pedido mixto.
- Verificar bloqueo UI y store, contador tras agregar/quitar/faltante/restaurar, editar entrega, cancelar,
  cierre de todos faltantes en $0 y seguimiento cliente sin confundir estimado/provisional/final.
- Recargar pedido en preparación conserva confirmaciones válidas; antiguos en preparación requieren
  confirmar UNIDAD y antiguos LISTO/ENTREGADO siguen visibles sin reapertura ni alteración de snapshots.
- Probar mobile+tablet; errores reproducibles, cero pageerrors inesperados y cero destinos externos de datos.
- Agregar pruebas de comportamiento para invariantes/cierre y conservar suites existentes pertinentes,
  incluida aceptación XSS y navegación. Datos sintéticos; sólo raíz pública temporal/confinada.
- Regenerar js/bundle.js desde ESTE worktree con build-bundle.ps1 y ejecutar node --check js/bundle.js.
- Entregar diff, comandos/resultados reales y límites. No declarar validación con comercio antes de hacerla.
