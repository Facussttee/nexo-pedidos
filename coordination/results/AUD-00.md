# Resultado AUD-00 — Consolidar estado y trazabilidad

- **Fecha:** 11 de noviembre de 2026
- **Agente Ejecutor:** Antigravity (Auditoría & Trazabilidad)
- **Worktree:** `D:\Escritorio\nexo-pedidos-worktrees\aud-00`
- **Rama:** `feature/aud-00-traceability`
- **Commit Base:** `38cc0a593772c636597ae9681299a63e6c99eb53` (sobre `main`)
- **Estado:** IN_REVIEW (listo para revisión independiente de Codex)

---

## 1. Resumen Ejecutivo y Metodología

Se realizó una inspección sistemática cruzando:
1. Las **12 filas originales** del tracker de auditoría (`coordination/references/nexo-auditoria-tracker.xlsx`).
2. El informe de auditoría inicial (`coordination/reviews/AUDITORIA-INICIAL-2026-11-11.md`).
3. El plan de trabajo (`tasks/plan.md`) y el backlog descompuesto en los 18 tickets (`tasks/todo.md` y `coordination/tasks/AUD-*.md`).
4. El árbol de código de la rama base de trabajo `main` (commit `38cc0a5`) y la rama paralela `V2` / ramas feature históricas (`feature/v2-01` a `feature/v2-07`).

El objetivo es asegurar que **ningún hallazgo quede sin resolver**, que las **soluciones previas sean analizadas y no asumidas a ciegas**, y que se establezca la trazabilidad exacta de **Fila Original -> Ticket AUD -> Evidencia / Estado en Código**.

---

## 2. Matriz Canónica de Trazabilidad (12 Filas -> Tickets AUD -> Evidencia)

| # Fila | Workstream | Tarea Original Tracker (`nexo-auditoria-tracker.xlsx`) | Prioridad | Ticket(s) AUD Asignado(s) | Estado en `main` | Dónde existe solución previa / Evidencia | Destino y Plan de Ejecución |
|---|---|---|---|---|---|---|---|
| **1** | Seguridad | Restringir acceso a clientes y pedidos | P0 | **AUD-04**, **AUD-05**, **AUD-06** | Vulnerable (`schema.sql` permite SELECT/UPDATE abiertos con `USING(true)`) | Implementado parcialmente en `feature/v2-01-order-privacy-rls` (commit `82799a7`, test `test-v2-01-privacy-rls.test.mjs`). Requiere cuentas staff individuales y tokens de seguimiento por pedido. | AUD-04 (cuentas staff), AUD-05 (roles owner/operator), AUD-06 (enlace/token privado cliente). |
| **2** | Seguridad | Corregir XSS en cantidades de pedido | P0 | **AUD-03** | Vulnerable (`js/views/operator.js:169` sin escape de `item.cantidad` en tabla/modal) | Identificado en auditoría inicial con script `Chromium` aislado. Reproducible. | AUD-03 cerrará el escape estricto con `escapeHtml` en todas las interpolaciones de cantidades y detalles de pedidos. |
| **3** | Seguridad | Eliminar PIN inicial conocido y proteger intentos | P0 | **AUD-04**, **AUD-05** | Vulnerable (PIN estático `1234` en `nexo_secrets` y validación en cliente) | En `feature/v2-01` se agregó RPC `update_staff_pin`. Sin embargo, el diseño acordado para la auditoría es autenticación individual de personal (owner/operator). | AUD-04 elimina el PIN compartido e introduce autenticación individual; AUD-05 establece RBAC. |
| **4** | Pedidos | Confirmar guardado remoto antes de cerrar compra | P0 | **AUD-07**, **AUD-08** | Vulnerable (`js/store.js:958` limpia carrito y confirma local antes de respuesta remota) | QA-E3 abordó resiliencia local. `feature/v2-02-authoritative-checkout` creó RPC `create_order_atomic`. | AUD-07 consolida el checkout autoritativo con pre-validación de stock; AUD-08 asegura confirmación remota antes de limpiar carrito y recovery. |
| **5** | Pedidos | Evitar sobrescritura por upsert con ID local | P0 | **AUD-07**, **AUD-08** | Vulnerable (`syncOrderToSupabase` hace fallback con upsert por ID local si falla insert) | `feature/v2-02` sustituyó el insert client-side por `create_order_atomic` retornando el ID correlativo de PostgreSQL. | AUD-07 prohíbe el cálculo client-side de IDs de pedidos en producción; AUD-08 evita colisiones. |
| **6** | Privacidad | Corregir identificación por teléfono | P1 | **AUD-10** | Vulnerable (`js/store.js:850` compara sólo últimos 8 dígitos; falsos positivos) | Identificado en auditoría inicial (`1133334444` vs `2233334444` dan true). | AUD-10 normalizará teléfonos con formato E.164 estricto y comparación completa. |
| **7** | Catálogo | Sincronizar catálogo remoto vacío | P1 | **AUD-11** | Vulnerable (`pullFromSupabase` en catálogo vacío mantiene los 17 mock iniciales) | Identificado en auditoría inicial. | AUD-11 implementa sincronización exacta de catálogo remoto (vacío = catálogo sin productos, no fallback a mock). |
| **8** | Seguridad | Revisar límite de pedidos y fecha manipulable | P1 | **AUD-12** | Vulnerable (trigger `enforce_order_rate_limit` usa `NEW.fecha` que el cliente puede enviar) | Trigger existente en `supabase/schema.sql:194`. | AUD-12 forzará `NOW()` en PostgreSQL ignorando timestamps enviados por el cliente. |
| **9** | Accesibilidad | Etiquetar buscador y controles por producto | P2 | **AUD-13** | Vulnerable (buscador `client.js:424` sin aria-label/label; botones de cantidad sin nombre de producto) | Detectado en auditoría de interfaz. | AUD-13 agregará labels accesibles, `aria-label` descriptivos y contraste AA. |
| **10** | Calidad | Repetir pruebas móviles en navegador operativo | P1 | **AUD-14** | Pendiente (auditoría inicial reportó bloqueo de red local en Chromium) | Tests Playwright preexistentes en `coordination/reviews/` (`scroll-acceptance.cjs`, `mobile-acceptance.cjs`). | AUD-14 estandarizará suite de regresión móvil en Chromium en 360px, 390px y 430px. |
| **11** | Rendimiento | Medir experiencia bajo condiciones representativas | P2 | **AUD-15** | Pendiente (solo se midieron tamaños estáticos de bundle, no CWV reales) | Bundle actual: 266 KB (sin minificar). | AUD-15 medirá LCP, CLS, INP y optimizará payload y renderizado. |
| **12** | Documentación | Corregir afirmaciones de demo sin conexión | P2 | **AUD-16** | Corregido parcialmente en docs v2; demo usa fuentes/CDN externas | Documentado en `docs/PRODUCT.md` y `docs/DEMO.md`. | AUD-16 formaliza límites de red en CI, Dockerfile y documentación de aislamiento. |

---

## 3. Estado de Tickets Metodológicos y de Entorno (AUD-00, AUD-01, AUD-02, AUD-17)

| Ticket | Objetivo | Dependencias | Estado | Destino y Rol |
|---|---|---|---|---|
| **AUD-00** | Consolidar estado y trazabilidad | Ninguna | **IN_REVIEW (Completado en este turno)** | Fija la matriz fila -> ticket -> evidencia, analiza el estado actual y desbloquea el despacho paralelo. |
| **AUD-01** | Rúbrica y pruebas de regresión reproducibles | AUD-00 | **READY (Despachar en Paso 2)** | Estandariza el runner de pruebas, la matriz de puntuación (25/25/20/10/20) y los scripts de fallo preexistentes. |
| **AUD-02** | Backend descartable y runner de pruebas aislado | AUD-00 | **READY (Despachar en Paso 2)** | Configura Supabase local / contenedor descartable para validar RLS, triggers y RPCs reales sin tocar producción ni MiHuerta. |
| **AUD-17** | Reauditoría y cierre | AUD-00 a AUD-16 | **BACKLOG** | Ejecución final completa, medición de puntuación post-remediación y balance documental. |

---

## 4. Análisis de Artefactos Históricos y Contradicciones Explicadas

1. **Sobre QA-E3 (Resiliencia de almacenamiento local):**
   - El encabezado de QA-E3 es histórico del checkpoint de demo local (2026-11-04). Su contenido abordó fallos de `localStorage` y respaldos en el cliente.
   - **No debe reabrirse QA-E3**, sino que sus pruebas de almacenamiento (`checkout-storage-acceptance.mjs`, `catalog-recovery-acceptance.mjs`) se reutilizan en **AUD-08** para complementar la confirmación transaccional con el backend.
2. **Sobre los cambios en rama `V2` (`feature/v2-01` a `feature/v2-07`):**
   - La rama `V2` implementó funcionalidades avanzadas (como stock cuantitativo y outbox de WhatsApp).
   - En `main`, el esquema y el store siguen en su versión previa a esas ramas para asegurar que cada fix de seguridad y backend sea auditado y probado de forma independiente mediante la suite AUD.
   - Los diffs de `feature/v2-01` y `feature/v2-02` sirven como referencia técnica probada, pero AUD-04..07 elevan la barra sustituyendo el PIN compartido por cuentas individuales y tokens privados.

---

## 5. Próximo Paso Recomendado

Con AUD-00 completado y documentado:
1. Proceder de inmediato al **Paso 2**:
   - Worktree 1: `feature/aud-01-rubric-regression` para **AUD-01** (Rúbrica y regresiones reproducibles).
   - Worktree 2: `feature/aud-02-disposable-backend` para **AUD-02** (Backend descartable y runner aislado).
