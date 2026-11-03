# Nexo Pedidos — plan de acción de calidad y evolución

Fecha: 2 de noviembre de 2026.
Estado: plan preparado para revisión; no inicia implementación, agentes, limpieza ni servicios.
Repositorio de trabajo: D:\Escritorio\nexo-pedidos. MiHuerta se conserva como referencia de lectura, sin modificar sus archivos o servicios.

## 1. Objetivo

Recuperar una experiencia de uso al menos equivalente a MiHuerta, corregir los problemas de navegación y desarrollar un producto configurable para comercios unitarios, pesables y mixtos. Ampliar administración y preparar una futura carga masiva basada en el relevamiento real del cliente.

La búsqueda activa de bugs es parte de cada entrega. Una suite aprobada no demuestra ausencia de fallos ni reemplaza revisar el producto en uso. No se promete corregir todos los bugs posibles: se registran los detectados, su impacto y su resolución o pendiente explícito.

## 2. Punto de partida y grado de certeza

| Observación | Estado | Acción |
|---|---|---|
| El usuario no puede hacer scroll en navegador/tablet | Reportado, pendiente de reproducción técnica | Prioridad inicial: identificar pantalla, dispositivo, entrada y condiciones exactas |
| Nexo se siente más pobre que MiHuerta | Evaluación del usuario; no hay todavía inventario comparativo de regresiones | Comparar recorridos, funciones, jerarquía visual y estados, preservando lo útil |
| Administración insuficiente para agregar productos | Necesidad funcional confirmada | Diseñar y desarrollar catálogo administrable |
| Operario excesivamente orientado a balanza | Problema de adecuación al dominio identificado | Preparación adaptable por tipo de ítem |
| Importación de Excel u otro formato | Necesidad futura; formato y reglas aún desconocidos | Relevar antes de fijar estructura o desarrollar un importador definitivo |
| Resumen del operario usa total_real || total_estimado | Deuda registrada en el checkpoint anterior; revalidar línea vigente | Probar y corregir el caso de total final cero dentro del paquete de preparación |
| Auth/RLS, transacciones, inventario y outbox | Pendientes del roadmap, no capacidades resueltas | Mantener separados de la demo y exigir controles antes de operar con datos reales |

Las capturas recibidas muestran comandos y skills de Antigravity. No prueban sus instrucciones completas, precio ni disponibilidad actual. No convertir sus textos en autorizaciones adicionales.

## 3. Coordinación, skills y costo

Codex define contratos, observa el estado, revisa diffs, ejecuta pruebas independientes e integra. Antigravity sigue siendo el implementador principal. No reemplazar silenciosamente al ejecutor si falla.

Antes de invocar comandos de Antigravity, leer sus instrucciones reales y comprobar workspace, modelo, cuotas y tareas activas:

- plan: primera opción para cerrar alcance, dependencias y aceptación de cada entrega.
- teamwork: para paquetes independientes con propietarios y límites explícitos; comprobar cuántos agentes crea y qué modelos asigna. No invocarlo sin controlar ese alcance.
- goal: sólo para un objetivo pequeño con condición de finalización verificable. No dejar una transformación abierta indefinida.
- Skills especializadas de accesibilidad, Chrome DevTools o troubleshooting: usar si están realmente disponibles y aportan evidencia al problema; no asumir instalaciones o conexiones por verlas en una captura.

Política de modelos solicitada por Facu:

1. Elegir el modelo de menor costo adecuado entre los realmente disponibles; verificar información visible de precio/cuota y registrar lo desconocido. Flash es candidato inicial, no una afirmación de precio comprobado.
2. Usar modelos económicos para correcciones acotadas, implementación rutinaria, tests y documentación.
3. Reservar Argon u otro modelo más costoso para planificación o problemas que justifiquen escalamiento. Seguridad crítica requiere capacidad suficiente y revisión independiente, no necesariamente el modelo más caro en cada paso.
4. Limitar el paralelismo: más agentes pueden aumentar consumo y conflictos. Registrar modelo, motivo, intentos, duración observada y correcciones.
5. Nunca cambiar modelo durante un turno activo, activar excedentes, comprar créditos o cambiar suscripciones por cuenta propia. Ante fallos repetidos, reducir el paquete antes de insistir.

Un escritor por worktree. Los tests que escriben, builds e instalaciones se ejecutan en revisión separada o cuando el ejecutor haya terminado. Sólo Codex marca DONE tras revisar y probar.

## 4. Secuencia de entregas

Estos identificadores de planificación no sustituyen los NP existentes. Al comenzar se vincularán al tablero sin renumerar ni borrar la historia previa.

### A. Diagnóstico activo y corrección del scroll — prioridad inmediata

- Reproducir el problema en catálogo, carrito, preparación y administración; incluir modales, formularios largos y teclado virtual cuando sea posible.
- Inspeccionar overflow, height/min-height, unidades de viewport, contenedores anidados, listeners que cancelan eventos, bloqueo del body y elementos sticky/fixed. Son hipótesis, no causas comprobadas.
- Comprobar rueda, trackpad, teclado y desplazamiento táctil. Automatización táctil no equivale a una tablet física.
- Comparar con MiHuerta mediante lectura/copia aislada y datos sintéticos; no cargar su versión productiva para generar pedidos de prueba.
- Aplicar una corrección mínima y sumar una regresión que demuestre desplazamiento real y acceso a acciones inferiores, no sólo buscar reglas CSS.

Aceptación: se puede llegar al final de cada pantalla y volver arriba; abrir/cerrar el carrito o un modal no deja la página bloqueada; los botones esenciales siguen accesibles con listas largas. Registrar cada dispositivo/input realmente probado.

### B. Recuperación visual y UI de preparación

Primero producir una comparación y propuesta visual revisable; después implementar una porción vertical completa.

- Nombre principal: Pedidos / Preparación. La balanza aparece según el ítem, sin imponer vocabulario de pesaje a todos los comercios.
- Unitarios: cantidad solicitada, cantidad preparada y confirmación clara. No exigir peso.
- Pesables: cantidad estimada, peso real y cálculo final, con unidades inequívocas.
- Mixtos: ambos comportamientos en el mismo pedido y totales comprensibles.
- Mantener edición de entrega, faltantes, cancelación, quitar/agregar productos y seguimiento de estado.
- Preservar contraste, controles táctiles de al menos 44 px, inputs de al menos 16 px, jerarquía visual, estados vacíos y feedback de acciones.
- Verificar total final cero, redondeo, pesos vacíos o inválidos y cantidades cero/negativas. No reemplazar un cero válido por el estimado.

Aceptación: completar un pedido unitario sin balanza, uno pesable y uno mixto; todos con faltante o edición y total correcto. Comparación visual explícita con la experiencia anterior y revisión del usuario antes de extender el rediseño.

### C. Administración de catálogo

- Alta, edición y archivo/desactivación de productos; evitar borrar referencias históricas de pedidos.
- Nombre, categoría, código/SKU si corresponde, modalidad de venta, unidad base, precio, paso permitido y disponibilidad.
- Categorías y campos adaptables al comercio, sin multiplicar variantes del código por cliente.
- Validar campos obligatorios, precios y cantidades finitas, duplicados y cambios entre unidad/peso cuando existan referencias.
- Diferenciar disponibilidad booleana de inventario cuantitativo: no mostrar una existencia como confiable hasta implementar movimientos y reservas.

Aceptación: agregar un producto, verlo en catálogo, pedirlo, prepararlo y modificar/archivar después sin alterar los datos históricos del pedido. En demo, todo local y sintético; con datos reales, permisos y validación de servidor son una dependencia obligatoria.

### D. Relevamiento e importación masiva

Puede prepararse el contrato y la interfaz de vista previa; la adaptación definitiva espera la conversación con el cliente y una muestra anonimizada.

Relevar: Excel/CSV/sistema de origen, hojas y encabezados, código estable, nombres, categorías, unidades, separadores decimales, moneda, precios, disponibilidad, existencias, actualizaciones y volumen esperado.

Flujo propuesto: seleccionar archivo → asociar columnas → validar → mostrar altas/actualizaciones/errores → confirmar → entregar resumen. Definir antes si se crea, actualiza o ignora un duplicado y cómo se revierte una carga fallida.

Aceptación futura: ensayo sin escritura, errores por fila, duplicados controlados, reimportación sin duplicaciones involuntarias y tratamiento explícito de cargas parciales. No implementar un parser ni elegir dependencias hasta conocer requisitos y límites.

### E. Seguridad y robustez

La revisión participa desde A; la implementación de controles productivos conserva las dependencias del roadmap NP-004 y siguientes.

- Seguridad: exposición de archivos/configuración, entradas no confiables, XSS, acceso directo a API, autenticación, roles y RLS. PIN o teléfono no autorizan acceso a datos.
- Datos: errores de persistencia visibles, doble confirmación, IDs, idempotencia, toma de pedidos y concurrencia; probar fallos además de casos exitosos.
- Operación: desconexión, recarga, almacenamiento bloqueado/corrupto, cancelación repetida, pedidos vacíos y recuperación tras error.
- Backend/DB: tests contra una base descartable propia antes de afirmar que permisos, transacciones o stock concurrente funcionan. Si no está disponible, marcar esa validación como pendiente.
- Mensajería: proveedor falso; cero números reales, QR productivo o notificaciones indirectas.

Aceptación: cada hallazgo tiene evidencia y prioridad; fallos críticos o de pérdida/exposición de datos bloquean la entrega afectada. No declarar aptitud productiva sólo por pasar tests de navegador o inspecciones de strings.

### F. Limpieza de espacios de prueba

Inventariar proyectos de Antigravity, chats, ramas y worktrees E0/NP-002/NP-003 creados para el experimento. Un proyecto visual no es lo mismo que un repositorio Git o worktree.

Antes de retirar cada elemento: identificar ruta/ID exactos, comprobar que no haya turno activo o cambios sin integrar y conservar commits, contratos, informes y evidencia en Nexo. Retirar lo descartable del experimento; preservar Nexo, MiHuerta y proyectos ajenos. Usar archivo o desvinculación cuando sea suficiente. Respetar cualquier confirmación obligatoria de la herramienta para borrados irreversibles.

Aceptación: lista de elementos retirados/conservados y motivos; repositorio principal íntegro y trazabilidad accesible. Esta fase todavía no se ejecutó.

## 5. Distribución del trabajo entre agentes

| Rol | Responsabilidad | Frontera |
|---|---|---|
| Coordinador Codex | Contratos, alcance, costos, revisión, pruebas independientes e integración | No editar simultáneamente la tarea del ejecutor |
| UI cliente/navegación | Scroll, catálogo y carrito | Coordinar fronteras CSS/app con UI operario |
| UI preparación | Flujo unitario/peso/mixto y feedback | No redefinir por su cuenta datos o estados |
| Administración | CRUD y contrato de futura importación | Usar contratos compartidos; sin inventario ficticio |
| Seguridad | Revisión de permisos, datos y exposición | Inicialmente lectura; correcciones en paquetes propios |
| Robustez/QA | Casos adversariales, regresiones y recuperación | No operar servicios reales |

Son roles, no una orden de ejecutar seis agentes a la vez. Empezar con scroll y revisión; paralelizar sólo tareas realmente independientes. Los cambios compartidos en store, app, CSS y bundle se secuencian o se integran con un propietario claro.

## 6. Metodología de pruebas y búsqueda activa de bugs

### Registro de hallazgos

Crear al iniciar la ejecución un registro en coordination/bugs con ID, fecha, versión/commit, entorno, pasos mínimos, esperado, observado, evidencia, severidad, propietario, estado y regresión asociada. Distinguir reportado, reproducido, corregido y verificado; un resumen del agente no prueba resolución.

Prioridades: P0 exposición/pérdida de datos o indisponibilidad crítica; P1 flujo esencial bloqueado, incluido scroll que impide operar; P2 comportamiento parcial o inconsistente; P3 detalle visual menor. Ajustar impacto al reproducir, no asignar severidad sólo por intuición.

### Matriz mínima

- Escritorio: viewport amplio, rueda/teclado y navegación completa.
- Tablet: vertical y horizontal, emulación táctil y teclado; validación física cuando Facu pueda realizarla o el dispositivo sea accesible.
- Móvil: 360, 390 y 430 px, listas largas, carrito, formularios y mensajes.
- Chromium real disponible; otros motores sólo si están instalados/configurados. No afirmar pruebas en Safari/iPad real por usar un viewport parecido.
- Producto unitario, pesable y mixto; faltantes, cancelación, modificación y total final cero.
- Recarga, pérdida de conexión, errores de almacenamiento y persistencia; no confirmar operaciones remotas no aceptadas por servidor.

### Capas de evidencia

1. Exploración manual asistida en navegador real: buscar problemas activamente y verificar lo que se ve y se puede accionar.
2. Automatización funcional: flujos completos y regresiones significativas con datos sintéticos, verificando estado y resultados.
3. Pruebas de dominio: cantidades, importes, unidades, estados e idempotencia donde corresponda.
4. HTTP/archivos: conservar cobertura de rutas privadas, malformadas, traversal y junctions.
5. DB/roles: positivas y negativas en entorno descartable; no sustituir por mocks o lectura de SQL.
6. Revisión visual y accesibilidad: scroll, foco, teclado, contraste, acciones tapadas y feedback. Capturas sólo si documentan un hallazgo o una comparación útil.

Registrar navegador/runtime y comandos reales. Separar externos visuales de conexiones de datos; el HTML aún usa CDN/fuentes. La emulación y las pruebas sintéticas tienen límites explícitos.

Comandos aislados ya conocidos, a revalidar contra el commit de cada entrega:

```powershell
powershell -ExecutionPolicy Bypass -File .\build-bundle.ps1
node --check js/bundle.js
node tests/test-demo-isolation.test.mjs
node tests/test-static-server.test.mjs
node bot/test-store-state.js
node tests/test-phone-numeric-validation.test.mjs
```

Servir la demo mediante bot/serve-demo.js en localhost; no iniciar bot/index.js, seed.js, test-mock.js ni test-order-flow.js. Regenerar bundle siempre que cambie JS modular y revisar también la distribución pública.

## 7. Criterio de cierre por entrega

- Resultado de Antigravity accesible, turno terminado y diff dentro de alcance.
- Revisión independiente del cambio y de sus riesgos relevantes.
- Bug reproducible antes de la corrección cuando sea viable y regresión que falle sin ella.
- Pruebas pertinentes aprobadas, navegación/scroll comprobados y sin regresiones críticas conocidas.
- Build/bundle sincronizados, configuración aislada y cero efectos productivos.
- Registro de modelo/consumo visible y límites de las pruebas.
- Checkpoint con cambios, evidencia, pendientes y siguiente paquete; integrar antes de iniciar dependientes.

## 8. Próximo paso al comenzar

Verificar Git y que Antigravity esté inactivo; leer plan/teamwork reales y opciones económicas; asignar el paquete A con alcance pequeño y aceptación de scroll. En paralelo, revisión de seguridad/robustez de lectura en otro agente, si hay capacidad disponible. Mostrar después el primer resultado antes de ampliar el rediseño.

Este archivo autoriza únicamente la planificación que solicitó Facu en este turno. No se ejecutó todavía ninguna de las nuevas fases, limpiezas o delegaciones.
