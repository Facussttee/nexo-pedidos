# QA-DELIVERY-CATALOG — catálogo funcional de demo

Autor: Codex. Estado: preparado, NO despachado. Facu eligió una demo funcional para validar.
Antigravity implementa como escritor único, secuencialmente; Codex revisa y prueba por separado.
Este documento prepara el paquete posterior: no implementa producto ni acepta uso productivo.
Sin commits, push, deploy, servicios ni cambios en quality durante esta preparación documental.

## Base y dependencias

Usar la base visual QA-B aprobada, con ajustes puntuales, sin proponer otra variante de app por comercio.
Leer AGENTS.md, QA-B-PROPOSAL.md, docs/CONTRATO_CATALOGO_PREPARACION_DEMO.md y resultados de QA-E1/E3/E2.
Despachar después de integrar y revisar las correcciones previas de seguridad, persistencia y catálogo corrupto.
Verificar HEAD, worktree limpio y ausencia de otro escritor antes de empezar; no copiar código de un checkout activo.
Decisión conservadora propuesta para la demo: bloquear cambio de modalidad si hay referencias; crear otro producto y archivar el anterior.

## Datos y operaciones

Implementar alta, edición y archivo lógico booleano de productos de demo; no eliminar filas físicamente.
Conservar id, nombre, categoria, unidad_medida, precio, paso, disponible y detalle; agregar codigo/SKU opcional y archivado.
Mantener productos existentes sin archivado como no archivados; no regenerar sus IDs al cargar o editar.
Para altas usar UUID local estándar con crypto.randomUUID; reutilizar un fallback local compatible si existe.
Si randomUUID no está disponible y no existe fallback pertinente, usar UUID con Web Crypto disponible, sin dependencia nueva.
Comprobar colisión contra todo el catálogo, incluidos archivados; no reutilizar IDs ni derivarlos de nombre/SKU.
Nombre y categoría obligatorios con límites explícitos; SKU opcional normalizado y único, incluidos archivados.
Conservar SKU como texto y ceros iniciales; no usarlo como ID ni inventar códigos automáticamente.
Sólo KG y UNIDAD. Precio numérico finito >= 0; cero válido, campo vacío y NaN inválidos.
Paso positivo y finito: UNIDAD = 1; KG admite fracción con las reglas actuales y precisión documentada.
Mantener peso real en kg y cantidades unitarias enteras; no agregar litros, variantes, conversiones ni inventario.
Categorías dinámicas derivadas del catálogo, incluyendo nuevas altas y ediciones; eliminar listas cerradas que las oculten.
Escapar textos al renderizar, conservando sus valores originales en datos; cubrir nombre, detalle, categoría y SKU.

## Estados, unidad e historial

Mostrar Activo (disponible y no archivado), Pausado (no disponible y no archivado) y Archivado con distinción clara.
Administración permite inspeccionar archivados y pausados; activar disponibilidad no desarchiva silenciosamente.
Archivo saca el producto del catálogo de compra y del selector de agregar ítems a nuevos pedidos o pedidos vigentes.
Pausado impide nuevas cantidades/selecciones con feedback claro; no presentarlo como existencia física cero.
No borrar ni modificar pedidos vigentes/históricos por editar precio, nombre, categoría, SKU o archivar producto.
Cada ítem conserva su snapshot de unidad, nombre, precio, cantidades y subtotales; preparación usa ese snapshot.
Permitir editar KG <-> UNIDAD sólo si el producto no tiene referencias en ningún pedido vigente/histórico ni en el carrito de demo.
Si existen referencias, rechazar el cambio de unidad sin guardar, con aviso claro: crear otro producto y archivar el anterior; nunca reinterpretar cantidades o pesos.
Antes de confirmar un carrito, revalidar producto, precio, disponibilidad, archivo, unidad y paso actuales.
Si cambió precio, informar y pedir revisión del total antes de confirmar; no aceptar automáticamente el importe nuevo.
Si el carrito presenta una unidad incompatible, bloquear confirmación con aviso; no convertir ni migrar la línea automáticamente. Un paso incompatible exige revisión explícita.
Si está pausado/archivado, bloquear esa línea y ofrecer resolución explícita; no descartarla silenciosamente.
Revalidación de carrito no reescribe snapshots de pedidos ya aceptados; conservar edición operativa y faltantes.

## Persistencia y alcance técnico

Guardar catálogo es una operación con resultado explícito; integrar el patrón aceptado de QA-E3/E2 sin rehacerlo.
Si falla setItem, conservar catálogo previo y formulario ingresado; mostrar error y reintento, sin éxito ni fila fantasma.
Comprobar lectura por getters y recarga: no confundir fallback temporal en memoria con producto guardado durablemente.
Aplicar el mismo contrato a alta, edición, pausa y archivo; conservar otras claves y registros anteriores.
Archivos permitidos: js/store.js y js/views/admin.js para CRUD/estado/validación y persistencia de catálogo.
js/views/client.js sólo categorías, filtros, avisos/revalidación de carrito necesarios; operator.js sólo filtro de selección.
Si preparación necesita corregir lectura de snapshot fuera del filtro, explicar ampliación concreta antes de editarla.
También js/bundle.js generado, regresiones acotadas y coordination/results/QA-DELIVERY-CATALOG.md.
Sin nuevas dependencias, DB, SQL, bot/index.js, red real, importador definitivo, prototipo, BOARD ni MiHuerta.
No agregar stock cuantitativo, reservas, historial de inventario ni una aplicación distinta para cada comercio.

## Aceptación vertical y cierre

Crear producto con categoría nueva -> verlo en cliente -> pedir -> preparar -> cambiar precio/archivar -> revisar historial.
Pedidos aceptados antes del cambio conservan snapshots, total estimado/final y preparación; archivo no elimina pedido vigente.
Después del archivo no se puede seleccionar ni agregar el producto a una compra o como ítem nuevo; pedidos previos siguen operables.
Repetir flujo UNIDAD, KG y mixto; probar precio cero, SKU con ceros iniciales, SKU duplicado y categoría nueva filtrable.
Probar rechazo de cambio KG/UNIDAD con referencia en carrito, pedido vigente y pedido histórico: aviso claro, producto/carrito/snapshots intactos.
Probar cambio KG/UNIDAD sin referencias y creación de otro producto/archivo del anterior cuando sí las haya, sin reutilizar IDs.
Probar carrito previo a edición de precio/paso, pausa y archivo; mantener revisión explícita sin conversión de unidad.
Inyectar fallo de persistencia en cada operación; reintentar y recargar sin duplicados, pérdida de datos ni éxito simulado.
Probar controles >=44px e inputs >=16px, formularios/errores legibles en tema claro/oscuro a 390px y 1024px, sin scroll bloqueado.
Verificar XSS de campos nuevos, snapshots antes/después, navegación y regresiones aisladas vigentes con resultados actuales.
Regenerar bundle desde ESTE worktree y ejecutar node --check js/bundle.js; registrar comandos, evidencias, modelo y límites.
Codex revisa y prueba independientemente antes de integrar; presentar checkpoint para validar la demo funcional.
No afirmar Auth/RLS, transacciones remotas, inventario, WhatsApp real ni aptitud productiva por aprobar este paquete.
