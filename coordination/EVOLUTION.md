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

## Cierre e integración completa de Nexo Pedidos v2 (`V2-00` a `V2-07`) — 2026-11-10

Todos los paquetes del roadmap v2 fueron implementados en ramas independientes, verificados con suites de prueba dedicadas y fusionados (`--no-ff`) en la rama `V2` (paralela a `main`):

- **V2-00 (`fe1f5e9`)**: Unificación Git (`quality-audit-remediation`), deslop de vistas/bot y configuración `Dockerfile` / CI (`.github/workflows/ci.yml`).
- **V2-01 (`82799a7` -> merge `028e994`)**: Privacidad de pedidos y clientes mediante RLS (`verify_staff_pin_header()` y `x-nexo-client-phone`), más RPC `update_staff_pin(p_old_pin, p_new_pin)` con bloqueo `FOR UPDATE` (71/71 tests).
- **V2-02 (`156bacc` -> merge `ca20e5b`)**: Checkout autoritativo `create_order_atomic` en PostgreSQL (precios desde `public.productos`, idempotencia por `checkout_cart_key`) y toma exclusiva de pedidos con bloqueo optimista (`version` y `tomado_por`) (131/131 tests).
- **V2-03 (`19d13a8` -> merge `8becd00`)**: Pipeline híbrido de imágenes (IndexedDB en demo, bucket `product-images` de Supabase Storage en producción) y tabla singleton `public.comercio_config` editable desde Admin (138/138 tests).
- **V2-04 (`6e173b0` -> merge `fbaec63`)**: Separación de estado de entrega (`PENDIENTE`, `EN_PREPARACION`, `LISTO`, `ENTREGADO`) y cobro (`estado_pago`: `PENDIENTE`, `INFORMADO`, `COBRADO`; `metodo_pago`: `EFECTIVO`, `TRANSFERENCIA`, `OTRO`), con filtro de pendientes de cobro en Operador (35/35 tests).
- **V2-05 (`8122876` -> merge `72a4aae`)**: Importador local CSV/TSV RFC 4180 (`js/csv-parser.js`) con preservación de SKU con ceros iniciales, modal de vista previa sin escritura y aplicación por lote (`importCatalogBatch`) con backup e inmutabilidad de snapshots históricos (48/48 tests).
- **V2-06 (`9de9d59` -> merge `28a61d8`)**: Inventario cuantitativo opcional (`controlar_stock`, `stock_actual`, `stock_reservado`), reserva en checkout, descuento por peso real en balanza (`finalizeOrderWeighing` / `finalize_order_stock_rpc`) y liberación única al cancelar (`cancelOrder` / `release_order_stock_rpc`) (16/16 tests).
- **V2-07 (`85c4c62` -> merge `41be40a`)**: Cola durable `public.whatsapp_outbox` con claim atómico (`claim_whatsapp_outbox_batch` con `FOR UPDATE SKIP LOCKED`), reintentos con backoff exponencial en `bot/index.js`, badge de estado/error en tarjeta de Operador y botón de reintento manual (`retryWhatsAppOutbox`) (13/13 tests).
