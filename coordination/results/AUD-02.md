# Resultado AUD-02 — Backend descartable y runner de pruebas aislado

- **Fecha:** 2026-11-13
- **Rama:** `main`
- **Estado:** DONE (integrado y reforzado en `main`)

---

## 1. Inventario de Herramientas Locales

Verificación realizada en host Windows sin instalar binarios ni modificar permisos:
- `docker`: **ausente** en PATH.
- `supabase`: **ausente** en PATH.
- `psql`: **ausente** en PATH.
- `node`: `v26.13.0` disponible.
- `npm`: `11.20.0` disponible.
- `brave.exe`: `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe` disponible (+ `playwright` en caché local).
- `k6.exe`: disponible.

---

## 2. Guardias y Harness Descartable

Archivos:
- `tests/test-aud-02-disposable-backend.test.mjs`: exporta `validateTestTargetUrl`, `resolveDisposableTestEnv` y `detectLocalPostgresCapabilities`.
  - Acepta exclusivamente `http:`/`https:` hacia `localhost`, `127.0.0.1` o `[::1]`.
  - Rechaza `*.supabase.co`, cualquier referencia a `mihuerta`, dominios engañosos (`localhost.evil.com`, `127.0.0.1.nip.io`), credenciales embebidas en URL y protocolos no HTTP (`file://`).
  - Rechaza claves que contengan `service_role` o `sb_secret_`.
- `tests/helpers/disposable-supabase-harness.mjs`: harness en memoria con bandera explícita `isRealPostgresRls: false` para suites funcionales locales sin falsificar pruebas PostgreSQL reales.

Verificación:
```powershell
node tests/test-aud-02-disposable-backend.test.mjs
```
Resultado: **5 / 5 checks aprobados**, código de salida `0`.

---

## 3. Limitación Explícita

- Sin `docker` + `supabase`/`psql` en el host, las pruebas de RLS real en PostgreSQL quedan marcadas como bloqueadas/no verificadas en la rúbrica (`AUD-01` / `AUD-05` / `AUD-17`).
