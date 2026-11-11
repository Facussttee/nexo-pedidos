# AUD-16 — Dependencias, aislamiento y CI

Prioridad: P1. Dependencias: AUD-02. Tamaño previsto: S/M, 45–120 minutos de agente sin esperas.

## Objetivo e implementación

Auditar dependencias y avisos disponibles, headers y raíz pública. Integrar suites nuevas separando locales y backend. Instalar/actualizar solo con evidencia y dentro de alcance; no ejecutar scripts heredados prohibidos.

## Superficies a inspeccionar y reservar

bot/package-lock.json, .github/workflows/ci.yml, scripts, tests. Esta lista orienta; fijar archivos exactos al asignar y respetar reservas de otros tickets.

## Criterios de aceptación

- [ ] Build reproducible; suites relevantes pasan; secretos/Git no publicados; auditoría sin red queda no verificada.
- [ ] Pruebas de fallo y éxito reproducibles y revisión independiente.
- [ ] Resultado y documentación de cierre registrados sin atribuir pruebas no realizadas.

## Verificación específica

Build público y pruebas de confinamiento; análisis de lockfile y avisos con fecha; completar CI tras AUD-12.

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
- Resultado: `coordination/results/AUD-16.md` (crear al trabajar, no fingir ejecución).
