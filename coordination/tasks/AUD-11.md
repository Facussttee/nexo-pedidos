# AUD-11 — Catálogo remoto vacío

Prioridad: P1. Dependencias: AUD-10. Tamaño previsto: S/M, 45–120 minutos de agente sin esperas.

## Objetivo e implementación

Distinguir éxito vacío y error. Respuesta válida [] reemplaza catálogo anterior; fallo muestra estado de sincronización sin aparentar éxito. Revalidar carrito antes de checkout.

## Superficies a inspeccionar y reservar

js/store.js, js/views/client.js, tests. Esta lista orienta; fijar archivos exactos al asignar y respetar reservas de otros tickets.

## Criterios de aceptación

- [ ] Vacío elimina productos obsoletos; error no se declara sincronización; carrito indisponible impide compra inválida.
- [ ] Pruebas de fallo y éxito reproducibles y revisión independiente.
- [ ] Resultado y documentación de cierre registrados sin atribuir pruebas no realizadas.

## Verificación específica

Fixtures catálogo poblado→vacío, error de consulta y producto archivado mientras se compra.

## Reglas de ejecución y entrega

Implementador: Antigravity. Coordinador/revisor independiente: Codex. Estado inicial: BACKLOG; no es una orden de iniciar implementación. Leer AGENTS.md, docs/PRODUCT.md, graphify-out/GRAPH_REPORT.md y graph.json, la auditoría inicial y tasks/plan.md. Verificar fuente real: el grafo es orientación histórica.

1. Solicitar asignación al coordinador: registrar agente, rama, worktree, commit base y archivos reservados. Un escritor por worktree; no editar BOARD, tracker ni documentación global desde el ejecutor.
2. Reproducir el problema antes de corregirlo. No sobrescribir cambios ajenos. Si se necesitan más de cinco archivos principales o cambia un contrato compartido, subdividir/acordar alcance antes de escribir.
3. Usar datos sintéticos. Prohibidos MiHuerta, bases reales, deploy, mensajes reales y bot/index.js, seed.js, test-mock.js, test-order-flow.js. No ampliar permisos ni cambiar modelos.
4. Crear pruebas enfocadas con nombres explícitos y documentar sus comandos exactos en el resultado. Un mock no prueba RLS ni la red real. Un bloqueo no equivale a aprobación.
5. Si cambia JS modular: `powershell -ExecutionPolicy Bypass -File .\build-bundle.ps1`, luego `node --check js/bundle.js`, desde ESTE worktree. Verificar demo con `node tests/test-demo-isolation.test.mjs` y servidor con `node tests/test-static-server.test.mjs` cuando afecten al cambio. `git diff --check` debe pasar.
6. Entregar resultado con pasos de reproducción, cambios, comandos/códigos de retorno, artefactos, limitaciones, qué falta y siguiente acción. El coordinador revisa independientemente e integra, regenera bundle, actualiza documentación y tracker; guardian verifica commit/push solo a origin Nexo. No marcar DONE mientras falte revisión o sincronización obligatoria.

## Registro de trabajo

- Asignación / worktree / rama / commit base: pendiente.
- Hecho: especificación preparada; implementación no iniciada.
- Falta: implementar, verificar, revisar e integrar.
- Bloqueos: comprobar dependencias y capacidades antes de comenzar.
- Resultado: `coordination/results/AUD-11.md` (crear al trabajar, no fingir ejecución).
