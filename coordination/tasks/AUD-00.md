# AUD-00 — Consolidar estado y trazabilidad

Prioridad: P1. Dependencias: ninguna. Tamaño previsto: S/M, 45–120 minutos de agente sin esperas.

## Objetivo e implementación

Comparar fuente vigente, resultados históricos y las 12 filas del tracker. Identificar soluciones ya integradas; no reabrir QA-E3 por su encabezado histórico. Registrar commit y cambios ajenos. Vincular cada fila original a tickets AUD.

## Superficies a inspeccionar y reservar

coordination/ACTIVE_EXECUTION.md, coordination/tasks, docs/PRODUCT.md. Esta lista orienta; fijar archivos exactos al asignar y respetar reservas de otros tickets.

## Criterios de aceptación

- [x] Todas las filas tienen destino; las contradicciones históricas están explicadas; estado inicial verificable.
- [x] Pruebas de fallo y éxito reproducibles y revisión independiente.
- [x] Resultado y documentación de cierre registrados sin atribuir pruebas no realizadas.

## Verificación específica

Inspección de Git, documentos y fuente; guardar matriz fila original → ticket → evidencia.

## Reglas de ejecución y entrega

Implementador: Antigravity. Coordinador/revisor independiente: Codex. Estado inicial: IN_PROGRESS. Leer AGENTS.md, docs/PRODUCT.md, graphify-out/GRAPH_REPORT.md y graph.json, la auditoría inicial y tasks/plan.md. Verificar fuente real: el grafo es orientación histórica.

1. Solicitar asignación al coordinador: registrar agente, rama, worktree, commit base y archivos reservados. Un escritor por worktree; no editar BOARD, tracker ni documentación global desde el ejecutor.
2. Reproducir el problema antes de corregirlo. No sobrescribir cambios ajenos. Si se necesitan más de cinco archivos principales o cambia un contrato compartido, subdividir/acordar alcance antes de escribir.
3. Usar datos sintéticos. Prohibidos MiHuerta, bases reales, deploy, mensajes reales y bot/index.js, seed.js, test-mock.js, test-order-flow.js. No ampliar permisos ni cambiar modelos.
4. Crear pruebas enfocadas con nombres explícitos y documentar sus comandos exactos en el resultado. Un mock no prueba RLS ni la red real. Un bloqueo no equivale a aprobación.
5. Si cambia JS modular: `powershell -ExecutionPolicy Bypass -File .\build-bundle.ps1`, luego `node --check js/bundle.js`, desde ESTE worktree. Verificar demo con `node tests/test-demo-isolation.test.mjs` y servidor con `node tests/test-static-server.test.mjs` cuando afecten al cambio. `git diff --check` debe pasar.
6. Entregar resultado con pasos de reproducción, cambios, comandos/códigos de retorno, artefactos, limitaciones, qué falta y siguiente acción. El coordinador revisa independientemente e integra, regenera bundle, actualiza documentación y tracker; guardian verifica commit/push solo a origin Nexo. No marcar DONE mientras falte revisión o sincronización obligatoria.

## Registro de trabajo

- Asignación / worktree / rama / commit base:
  - Agente: Antigravity (devops/audit worker)
  - Worktree: `D:\Escritorio\nexo-pedidos-worktrees\aud-00`
  - Rama: `feature/aud-00-traceability`
  - Commit base: `38cc0a593772c636597ae9681299a63e6c99eb53` (sobre `main`)
  - Archivos reservados: `coordination/results/AUD-00.md`, `coordination/tasks/AUD-00.md`, `tasks/todo.md`
- Hecho: Inspección exhaustiva de las 12 filas del tracker xlsx contra los 18 tickets AUD, la rama main y las ramas v2/features. Matriz de trazabilidad y reporte de resultados consolidados en `coordination/results/AUD-00.md`.
- Falta: Revisión independiente y cierre de AUD-00 para desbloquear AUD-01 y AUD-02.
- Bloqueos: Ninguno.
- Resultado: `coordination/results/AUD-00.md`.
