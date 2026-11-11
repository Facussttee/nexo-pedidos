# Tickets de auditoría — Antigravity

Estado detallado canónico en cada ticket. Solo el coordinador actualiza este índice.

- [x] [00 — Consolidar estado y trazabilidad](../coordination/tasks/AUD-00.md) — P1; depende de ninguna; IN_REVIEW.
- [ ] [01 — Rúbrica y regresiones reproducibles](../coordination/tasks/AUD-01.md) — P1; depende de AUD-00; READY.
- [ ] [02 — Backend descartable](../coordination/tasks/AUD-02.md) — P1; depende de AUD-00; READY.
- [ ] [03 — Cerrar XSS en pedidos](../coordination/tasks/AUD-03.md) — P0; depende de AUD-01; BACKLOG.
- [ ] [04 — Autenticación individual de personal](../coordination/tasks/AUD-04.md) — P0; depende de AUD-02; BACKLOG.
- [ ] [05 — Autorización por rol](../coordination/tasks/AUD-05.md) — P0; depende de AUD-04; BACKLOG.
- [ ] [06 — Seguimiento privado por pedido](../coordination/tasks/AUD-06.md) — P0; depende de AUD-05; BACKLOG.
- [ ] [07 — Checkout autoritativo e idempotente](../coordination/tasks/AUD-07.md) — P0; depende de AUD-06; BACKLOG.
- [ ] [08 — Confirmación durable y recuperación](../coordination/tasks/AUD-08.md) — P0; depende de AUD-07; BACKLOG.
- [ ] [09 — Preparación y concurrencia](../coordination/tasks/AUD-09.md) — P1; depende de AUD-08; BACKLOG.
- [ ] [10 — Identidad telefónica local](../coordination/tasks/AUD-10.md) — P1; depende de AUD-08; BACKLOG.
- [ ] [11 — Catálogo remoto vacío](../coordination/tasks/AUD-11.md) — P1; depende de AUD-10; BACKLOG.
- [ ] [12 — Límites de pedidos robustos](../coordination/tasks/AUD-12.md) — P1; depende de AUD-07; BACKLOG.
- [ ] [13 — Accesibilidad de flujos principales](../coordination/tasks/AUD-13.md) — P2; depende de AUD-03, AUD-08; BACKLOG.
- [ ] [14 — Regresión visual y móvil](../coordination/tasks/AUD-14.md) — P1; depende de AUD-09, AUD-13; BACKLOG.
- [ ] [15 — Medición y optimización de carga](../coordination/tasks/AUD-15.md) — P2; depende de AUD-14; BACKLOG.
- [ ] [16 — Dependencias, aislamiento y CI](../coordination/tasks/AUD-16.md) — P1; depende de AUD-02; BACKLOG.
- [ ] [17 — Reauditoría y cierre](../coordination/tasks/AUD-17.md) — P1; depende de AUD-00 a AUD-16; BACKLOG.

## Checkpoints
- [ ] A: AUD-00–02, baseline y entorno verificables.
- [ ] B: seguridad y checkout con pruebas reales aisladas.
- [ ] Final: regresiones, rúbrica y Git verificados.
