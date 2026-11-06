# Limpieza de pruebas — 2 noviembre 2026

Retirados por Codex: worktrees E0, NP-002 y NP-003. Se comprobó status limpio con untracked incluidos antes de cada retiro. NP-003 sólo tenía dist/public generado: cuatro archivos allowlist inspeccionados, sin enlaces/junctions; se retiraron tras verificar ruta absoluta dentro de NP-003. git worktree remove finalizó correctamente. No se usó force para descartar cambios.

Conservados: ramas codex/experiment-E0 (ee61771), codex/np-002-demo (872077b), codex/np-003-static (76a08cb), commits integrados, contratos y resultados en el repositorio principal. Los worktrees pueden recrearse desde esas ramas.

Activos y conservados: repositorio principal nexo-pedidos, quality como ejecutor, review como verificador. MiHuerta y proyectos ajenos intactos.

Proyectos visuales Antigravity: E0, NP-002 y NP-003 aún visibles. Se inspeccionó la opción Delete Project de NP-003; no se pulsó. Se solicitó confirmación puntual por posible borrado de conversaciones y exigencia de la skill Computer Use. No confundir retiro de worktrees con eliminación de proyectos UI. Pendiente respuesta.
