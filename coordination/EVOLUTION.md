# Registro de evolución — activo

A ACCEPTED: Antigravity 1a27cd1 integrado como a39c703. Scroll real verificado por Codex: 48/48 en seis viewports, rueda, teclado y gesto táctil emulado, carrito largo/operario/admin; demo17 static24 store71 phone18. Ver coordination/reviews/QA-A-INDEPENDENT.md. Hardware físico/Safari pendientes.
B READY_TO_DISPATCH: contrato QA-B-PROPOSAL.md, propuesta concreta para revisión antes de ampliar UI real. Pendiente corregir inexactitudes de comparación y mostrar prototipo. Modelo Flash Medium.
C PENDING: CRUD de catálogo demo, categorías, validaciones y snapshots históricos; depende del contrato revisado y correcciones de seguridad.
D PENDING_REQUIREMENTS: contrato/vista previa propuesto; parser definitivo después de relevamiento del cliente.
E DIAGNOSED/PENDING_FIXES: auditoría estática integrada; reproducir XSS y fallos de persistencia con datos sintéticos. Auth/RLS productivos sin validar: no hay docker/psql/supabase en PATH observados; no hubo conexión a DB. No usar producción.
F PARTIAL: retirados worktrees E0/NP-002/NP-003 limpios, commits/ramas conservados. Proyectos UI aún visibles, confirmación Delete Project pendiente por conversaciones. Ver results/QA-CLEANUP.md.

Objetivo completo sigue activo, no equivale a sólo QA-A. Un escritor por worktree. Antigravity cambios principales; Codex contratos/revisión/pruebas/integración. Original MiHuerta intacto.

B PROPOSED/WAITING_VISUAL_REVIEW: edf0d0b integrado70487f5, dos ajustes puntuales Codex (escape y confirmación unitaria),14/14 controles en dos viewports. Prototipo docs/proposals/QA-B.html y capturas. Pregunta visual pendiente; NO extender UI real hasta respuesta. E1 listo para delegación secuencial ahora que terminó B.

E1 RUNNING: despacho único observado10:12PM en qualityedf0d0b, FlashMedium. Contrato QA-E1; no store/SQL/prototipo. E2 preparado no enviado. Preguntas visual y Delete Project pendientes. Publicación de propuesta/main d651f57 verificada. Ver ACTIVE_EXECUTION.md.

## Cierre técnico de demo — 2026-11-04

Facu eligió demo funcional para validar con el comercio. E1/E3/E2/BUG-006 y UI real de preparación/catálogo aceptados localmente. Flujo22, scroll48, checkout106+5, catálogo69, rendering10 y regresiones base verdes. Revisión final corrigió estimados contaminados por peso real; reflow/sticky corregidos sin offsets fijos. Canónica: coordinador sin commit; no publicada. D/importador sigue condicionado al relevamiento; backend real fuera de esta entrega. Ver DELIVERY_STATUS.md. Este estado prevalece sobre puertas y tareas históricas de los apartados anteriores.
