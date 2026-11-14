# Tickets de auditoría — Antigravity

Estado detallado canónico en cada ticket. Solo el coordinador actualiza este índice.

- [x] [00 — Consolidar estado y trazabilidad](../coordination/tasks/AUD-00.md) — P1; depende de ninguna; DONE.
- [x] [01 — Rúbrica y regresiones reproducibles](../coordination/tasks/AUD-01.md) — P1; depende de AUD-00; DONE.
- [x] [02 — Backend descartable](../coordination/tasks/AUD-02.md) — P1; depende de AUD-00; DONE.
- [x] [03 — Cerrar XSS en pedidos](../coordination/tasks/AUD-03.md) — P0; depende de AUD-01; DONE.
- [x] [04 — Autenticación individual de personal](../coordination/tasks/AUD-04.md) — P0; depende de AUD-02; DONE (Supabase Auth + `staff_members`; demo PIN aislado).
- [x] [05 — Autorización por rol](../coordination/tasks/AUD-05.md) — P0; depende de AUD-04; DONE (RBAC SQL `owner`/`operator`; RLS PostgreSQL vivo `UNVERIFIED` sin Docker/psql).
- [x] [06 — Seguimiento privado por pedido](../coordination/tasks/AUD-06.md) — P0; depende de AUD-05; DONE (token opaco SHA-256 + `#track=` + revocación staff).
- [x] [07 — Checkout autoritativo e idempotente](../coordination/tasks/AUD-07.md) — P0; depende de AUD-06; DONE (`create_order_atomic` + idempotencia y precios servidor).
- [x] [08 — Confirmación durable y recuperación](../coordination/tasks/AUD-08.md) — P0; depende de AUD-07; DONE (sin upsert por ID local ni limpieza prematura).
- [x] [09 — Preparación y concurrencia](../coordination/tasks/AUD-09.md) — P1; depende de AUD-08; DONE (versionado optimista + preservación de total `$0`).
- [x] [10 — Identidad telefónica local](../coordination/tasks/AUD-10.md) — P1; depende de AUD-08; DONE (comparación exacta sin `slice(-8)` + códigos AR).
- [x] [11 — Catálogo remoto vacío](../coordination/tasks/AUD-11.md) — P1; depende de AUD-10; DONE (catálogo remoto vacío reemplaza caché local + expone error).
- [x] [12 — Límites de pedidos robustos](../coordination/tasks/AUD-12.md) — P1; depende de AUD-07; DONE (timestamp servidor `NOW()` + `rate_limit_config` fail-closed).
- [x] [13 — Accesibilidad de flujos principales](../coordination/tasks/AUD-13.md) — P2; depende de AUD-03, AUD-08; DONE (`<label for>`, `role="alert"`, `aria-label` por producto, focus trap y Escape).
- [x] [14 — Regresión visual y móvil](../coordination/tasks/AUD-14.md) — P1; depende de AUD-09, AUD-13; DONE (360–1024px light/dark en Brave headless; Safari iOS físico/HEIC `UNVERIFIED`).
- [x] [15 — Medición y optimización de carga](../coordination/tasks/AUD-15.md) — P2; depende de AUD-14; DONE (sin CSS `@import` bloqueante; 5 corridas locales medidas).
- [x] [16 — Dependencias, aislamiento y CI](../coordination/tasks/AUD-16.md) — P1; depende de AUD-02; DONE (`bot/package-lock.json` auditado `0 vulns`, headers y CI en dos jobs).
- [x] [17 — Reauditoría y cierre](../coordination/tasks/AUD-17.md) — P1; depende de AUD-00 a AUD-16; DONE (rúbrica `87/100`, `4 fail` por heurística regex demo en `AUD-01`, `9 unverified`).

## Checkpoints
- [x] A: AUD-00–02, baseline y entorno verificables.
- [x] B: seguridad y checkout con pruebas aisladas y simulación descartable (RLS PostgreSQL real `UNVERIFIED`).
- [x] Final: regresiones, rúbrica (`87/100` con `9 unverified`), bundle, `dist/public`, docs y Git verificados.
