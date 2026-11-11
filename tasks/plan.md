# Plan de mejora — Nexo Pedidos / Antigravity

## Decisiones confirmadas

Antigravity implementa; Codex coordina y revisa. Alcance: app y backend descartable, personal con cuentas individuales owner/operator, cliente invitado con enlace privado por pedido. Sin producción, clientes reales ni WhatsApp real. No implementar funcionalidades V2 ajenas a los hallazgos. El 36/100 es histórico y orientativo: AUD-01 fija controles repetibles antes de cambios.

## Fuentes y organización

Partir de coordination/reviews/AUDITORIA-INICIAL-2026-11-11.md y del tracker original conservado en coordination/references/nexo-auditoria-tracker.xlsx. Las 12 filas se descomponen en 18 tickets; tasks/todo.md es índice, coordination/tasks/AUD-*.md especificaciones y coordination/results/AUD-*.md evidencia. Reutilizar NP-004-PROPOSED, QA-E3, contrato catálogo/preparación, PRODUCT, REPO_MAP y ACTIVE_EXECUTION; sus encabezados históricos no prevalecen sobre fuente verificada.

## Asignación y paralelismo

Coordinador único de tablero, asignaciones y documentación global. Registrar reservas de archivos, worktree, agente y commit. Estados BACKLOG→READY→IN_PROGRESS→IN_REVIEW→DONE; BLOCKED exige causa y desbloqueo. Cada agente pide ticket READY al coordinador; no compiten editando el tracker. Hasta tres trabajadores más coordinador; revisión independiente usa un puesto disponible.

- Preparación: AUD-00 primero; AUD-01 y AUD-02 paralelos.
- Seguridad: AUD-03 en paralelo con cadena AUD-04→05→06; AUD-16 puede avanzar en análisis independiente.
- Pedidos: AUD-07→08→09; AUD-10→11 después de AUD-08 y sin solaparse con AUD-09 sobre store. AUD-12 después de AUD-07, serializando todas las migraciones.
- UX: AUD-13 después de AUD-03/08 y cuando las vistas estén libres; AUD-14 después de AUD-09/13; AUD-15 después de AUD-14.
- Cierre: completar AUD-16 tras AUD-12 y ejecutar AUD-17 después de todos.

Compartir problemas cruzados con coordinador y agente afectado. Worktrees distintos no justifican editar contratos o archivos compartidos simultáneamente. Definir y registrar contrato API antes de liberar consumidor. Checkpoint cada 2–3 integraciones: revisar regresiones y bloquear dependientes si cambia contrato.

## Cierre y límites

Seguridad 25, integridad 25, UX 20, rendimiento 10, operación 20. Reportar puntaje junto a cobertura y controles no verificados; no compensar riesgos críticos con estética. Objetivo: cero críticos/altos abiertos y controles aplicables comprobados. No prometer 100.

El coordinador actualiza README, PROJECT, PRODUCT, REPO_MAP y registros de coordinación en cada integración. El ejecutor entrega notas de actualización en su resultado. devops-git-guardian verifica Git/push solo a origin Nexo sin force ni cambios ajenos. Si permisos, DNS, DB o navegador impiden aceptación, registrar BLOCKED y continuar solo tickets independientes. Sincronizar ramas no significa fusionarlas indiscriminadamente.

## Tracker

Conservar original como referencia. El índice y los tickets son canónicos; una copia futura de seguimiento reflejará IDs/estados y enlaces sin duplicar especificaciones. No inventar fechas ni responsables. Solo coordinador edita la planilla y verifica fórmulas/Gantt tras cambios. No alterar ahora el archivo histórico para aparentar trabajo iniciado.


## Implementaciones previas a revisar

Antes de implementar, inspeccionar los diffs de `feature/v2-01-order-privacy-rls` y `feature/v2-02-authoritative-checkout` contra main, además de otras ramas pertinentes. Existen cambios nominales previos: no prueban aceptación. Registrar qué se reutiliza, qué se descarta y por qué; no fusionar automáticamente ni duplicar soluciones sin revisar.
