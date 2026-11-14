# Resultado AUD-03 — Cerrar XSS en pedidos

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE

---

## 1. Reproducción Inicial

Antes del cambio:
- `js/views/operator.js:169` interpolaba `${i.cantidad_solicitada}` sin `escapeHtml` en la tarjeta de pedidos entrantes, y varios renderizados interpolaban `${order.id}` sin escapar.
- `js/views/client.js` interpolaba `${currentOrder.estado}`, `${item.peso_real}` y `${item.cantidad_solicitada}` sin escape ni validación de finitud.
- `js/store.js` devolvía `getOrders()` y mapeaba `pullFromSupabase()` sin validar tipo ni finitud de campos numéricos en pedidos/ítems.
- `node tests/test-aud-03-xss-orders.test.mjs` falló al reproducir la vulnerabilidad (`exit 1`).

---

## 2. Cambios Realizados

- **`js/store.js`**:
  - Agregados `validateOrderItem`, `validateOrderRecord`, `parseStrictRemoteNumber` y `getOrdersError`.
  - `getOrders()` y `pullFromSupabase()` validan cada pedido e ítem (números finitos positivos/no negativos, estados e identificadores permitidos); registros corruptos o maliciosos se excluyen/cuarentenan exponiendo alerta en `ordersError` en lugar de convertirlos silenciosamente en compras válidas.
- **`js/views/operator.js`**:
  - Escapados con `escapeHtml(...)` `cantidad_solicitada`, `order.id`, `order.items.length`, `timeAgo(order.fecha)` y montos formateados mediante `formatMoney` en todas las columnas (`PENDIENTE`, `EN_PREPARACION`, `LISTO`, `ENTREGADO`, `CANCELADO` y modal de edición).
  - Expuesto `store.getOrdersError()` en `#operator-error`.
- **`js/views/client.js`**:
  - Escapados `order.id`, `currentOrder.estado`, `item.peso_real`, `item.cantidad_solicitada`, `item.subtotal`, fechas y etiquetas de resumen en lista y seguimiento de pedido.
- **`tests/test-aud-03-xss-orders.test.mjs`**, **`tests/test-aud-01-rubric.test.mjs`**:
  - Suite reproducible sobre `Store`, módulo ES directo (`operator.js` / `client.js`) y `dist/public` (`js/bundle.js`) en Brave headless.

---

## 3. Verificación Real Ejecutada

| Comando | Resultado | Código |
| --- | --- | --- |
| `powershell -ExecutionPolicy Bypass -File .\build-bundle.ps1` | Bundle sin BOM (271898 bytes) | `0` |
| `node --check js/bundle.js` | Sintaxis OK | `0` |
| `node scripts/build-public.mjs` | `dist/public` regenerado | `0` |
| `node tests/test-aud-03-xss-orders.test.mjs` | 5 / 5 PASS (Brave + Store + ES modules + bundle) | `0` |
| `node tests/test-html-escaping.test.mjs` | 8 / 8 PASS | `0` |
| `node tests/test-xss-rendering.test.mjs` | 8 / 8 PASS | `0` |
| `node tests/test-demo-isolation.test.mjs` | 17 / 17 PASS | `0` |
| `node tests/test-static-server.test.mjs` | 24 / 24 PASS | `0` |
| `node bot/test-store-state.js` | 72 / 72 PASS | `0` |
| `git diff --check` | Limpio | `0` |

---

## 4. Limitaciones

- Validado contra almacenamiento local y Brave headless; la validación sobre registros devueltos por PostgreSQL real depende de infraestructura local (`docker`/`supabase`).
