# Resultado AUD-01 — Rúbrica y regresiones reproducibles

- **Fecha:** 2026-11-13
- **Rama / Commit:** `main` (tras remediación del runner de rúbrica; reemplaza el falso positivo inicial `83/100`)
- **Estado:** DONE (integrado y corregido en `main`)

---

## 1. Objetivo y Correcciones Realizadas

Se corrigió `tests/test-aud-01-rubric.test.mjs` para eliminar falsos positivos por coincidencia de subcadenas y separar estrictamente:
- **`PASS`**: controles verificados en el entorno actual.
- **`FAIL`**: brechas abiertas reproducibles sobre `main`.
- **`UNVERIFIED`**: controles que requieren infraestructura o hardware ausente (`docker`/`supabase`/`psql` para RLS PostgreSQL real: 5 pts; dispositivo físico iOS Safari / HEIC: 4 pts).

Distribución de pesos (total **100 puntos**):
- **Seguridad:** 25 pts (4 + 4 + 4 + 5 + 4 + 4)
- **Integridad Funcional:** 25 pts (6 + 5 + 4 + 5 + 5)
- **UX & Accesibilidad:** 20 pts (4 + 4 + 4 + 4 + 4)
- **Rendimiento:** 10 pts (5 + 5)
- **Preparación Operativa:** 20 pts (6 + 6 + 4 + 4)

---

## 2. Evaluación Baseline Honesta (antes de AUD-03..16)

Comando ejecutado:
```powershell
node tests/test-aud-01-rubric.test.mjs
```
- **Salida:** código `0`, generado `coordination/results/rubric-score.json`.
- **Puntaje Verificado:** **26 / 100** | **Fallido:** **65 / 100** | **No verificado:** **9 / 100**
  - Seguridad: **0 / 25** (20 fail, 5 unverified)
  - Integridad: **6 / 25** (19 fail)
  - UX / A11y: **4 / 20** (12 fail, 4 unverified)
  - Rendimiento: **0 / 10** (10 fail)
  - Operación: **16 / 20** (4 fail)

Principales errores corregidos respecto al borrador previo de `AUD-01`:
- `operator.js:169` usa `i.cantidad_solicitada` (antes se buscaba `${item.cantidad_solicitada}`, dando falso PASS).
- `schema.sql` usa `USING (true)` en `FOR SELECT`/`FOR UPDATE` (antes se buscaba `FOR ALL USING (true)`, dando falso PASS).
- `js/public-config.js` sólo mencionaba `service_role` en comentario, no en `window.NEXO_PUBLIC_CONFIG` (ahora se evalúa el objeto en sandbox VM).

---

## 3. Limitaciones

- La validación en vivo de RLS contra PostgreSQL real y Safari iOS físico se reporta explícitamente como `UNVERIFIED` hasta disponer de Docker/Supabase CLI y hardware iOS.
