# Resultado AUD-10 — Normalización de teléfonos argentinos (sin colisión por últimos 8 dígitos) y separación de identidad

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE

## 1. Cambios Realizados
- **`js/store.js`**, **`js/views/client.js`**:
  - Implementado y exportado `normalizeArPhone(raw)` cubriendo código de país `54`/`0054`, prefijo móvil `9`, `0` troncal, `15` interno para AMBA (`11`) y códigos de 3 y 4 dígitos del interior, rechazando números ambiguos (`15...` u 8 dígitos sin código de área).
  - Reemplazado `.slice(-8)` en `isSameCustomer(phoneA, phoneB)` por igualdad canónica de 10 dígitos nacionales.
  - Eliminado auto-login desde query parameter `?tel=` (sólo precompleta `prefilledPhone`); `saveCustomer()` nunca escribe en `clientes` mediante `anon` en producción.

## 2. Verificación Ejecutada
- `node tests/test-aud-10-11-identity-catalog.test.mjs` (`AUD-10.1`, `AUD-10.2`, `AUD-10.3`): PASS (`exit 0`).
- `node tests/test-phone-numeric-validation.test.mjs`: PASS (`exit 0`, 19/19).

## 3. Limitaciones Honestamente Reportadas
- Cubre formatos numéricos argentinos estándar de 10 dígitos nacionales; formatos especiales internacionales fuera de +54 se rechazan explícitamente como no normalizables.
