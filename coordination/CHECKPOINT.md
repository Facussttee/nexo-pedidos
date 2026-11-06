# Checkpoint — primer tramo local completado

Fecha: 2 de noviembre de 2026. Zona: America/Buenos_Aires.
Ruta de trabajo: D:\Escritorio\nexo-pedidos. Rama integrada: codex/np-coordination.
Commit de código aceptado del primer tramo: e2bf8f3 (documentación de entrega posterior en la misma rama).

## Qué se puede usar

Demo sintética local con catálogo, carrito, pedidos, preparación/pesaje, diferencia estimado/final y mensajes WhatsApp simulados. Configuración explícita en js/public-config.js, demo predeterminada, almacenamiento Nexo independiente; producción incompleta falla claramente y producción válida no ofrece identidades demo.
Servidor importable sin worker/DB, publicación limitada a cuatro archivos en dist/public. HTTP rechaza privados, dotfiles, traversal literal/codificado, rutas Windows y junctions externas; URLs malformadas no tumban el servicio. Builder confinado al destino exacto sourceRoot/dist/public antes de borrar/copiar, con entradas y padres canónicos verificados.

Desde esta carpeta:

```powershell
node bot/serve-demo.js --host 127.0.0.1 --port 3000
```

Abrir http://127.0.0.1:3000/?demo=1. Cliente sintético de acceso rápido; PIN local inicial de personal 1234. Ctrl+C para detener. El servidor efímero de QA quedó cerrado; este checkpoint no deja un bot ni servicio de prueba activo.

## Qué hizo cada participante

- Codex: diagnóstico, clone/worktrees, contratos y documentación, selección observada de modelos, revisión, pruebas independientes y cherry-picks. Preservó un WIP tras cuota y regeneró bundle; no reemplazó la implementación principal de Antigravity.
- E0, Antigravity / Claude Sonnet 5.5 Low: mapa real en dos archivos permitidos, 58 s iniciales y una devolución de precisión; commits 6943b95 y ee61771, aceptados e integrados.
- NP-002, Antigravity / Claude Opus 5.5 Medium: configuración/store/demo-data parciales; turno terminó por cuota tras unos 6 minutos. Codex guardó WIP ef38cd4. View Usage: Claude/GPT 0% semanal; Gemini Models 47% semanal/100% ventana 5h y Argon 78% semanal observados al fallback. Sin compras, excedentes o cambios de permisos.
- NP-002 recuperación, Antigravity / Gemini 4 Argon Medium: completó demo y pruebas, commit 5157308; corrigió acceso rápido demo en producción y precisión sobre CDN en 872077b. Integrado como fa3b561. Cambio de modelo sólo tras turno terminado y estado guardado.
- NP-003, Antigravity / Gemini 4 Argon Medium: b50097b y corrección 76a08cb; integrados como 23cc269/e2bf8f3. La revisión independiente detectó borrado de fuente con outDir ancestro dentro de un fixture temporal; el ejecutor corrigió destino, padres junction y CLI. El mismo test pasó después, preservando marcadores.

Modo de coordinación validado: A, interfaz nativa Windows mediante computer-use y @oai/sky. Workspace/rama/modelo, envío único, inicio y fin observados. No se contó una delegación simulada/manual como ejecución nativa. No hubo escritores simultáneos por worktree ni cambio de modelo dentro de un turno activo. Todos los turnos finalizaron; NP-004 sin despachar.

## Pruebas comprobadas por Codex

| Verificación | Resultado |
|---|---|
| node tests/test-demo-isolation.test.mjs | 17/17, también en checkout integrado |
| node tests/test-static-server.test.mjs | 24/24, también en checkout integrado |
| node bot/test-store-state.js | 71/71, también en checkout integrado |
| node tests/test-phone-numeric-validation.test.mjs | 18/18, también en checkout integrado |
| build-probes.cjs independiente | 8 checks: allowlist, limpieza de salida, destinos inválidos y junctions de entrada/salida |
| static-probes.cjs independiente | 56 checks, 23 targets HTTP crudos, junction externa, cero bytes privados y supervivencia |
| live-demo.cjs + navegador real a 390x844 sobre HTTP localhost | PASS: pedido 103 LISTO, total real 2070, dos mensajes simulados, error producción incompleta y CTA demo ausente en producción válida |
| Observación de red/JS del navegador | createClient demo=0, requests Supabase/WhatsApp=0, pageErrors=[]; producción válida usa cliente falso que falla antes de red |
| Bundle | builder PowerShell ejecutado en checkout integrado, hash idéntico al aceptado, node --check 0, UTF-8 sin BOM |
| Git | diff --check limpio; archivos de código idénticos a revisión 76a08cb; sin cambios sin confirmar antes del cierre documental |

El navegador interceptó nueve recursos externos entre tres páginas (CDN/fuentes); prueba funcional, no QA visual completa ni autonomía offline. Los avisos de Supabase no disponible en tests corresponden al caso mock productivo aislado; no hubo conexión real.

## Repositorios y estado externo

Copia fresca desde https://github.com/Facussttee/MiHuerta, baseline bb05bf7e5a5c5dca073f80d97387f83927deef02. Original D:\Escritorio\miHuerta se mantuvo en fix/iphone-13-pro-layout, HEAD e994abf4d6be8cb0be4f75fbdb2c675ec23e3cea y limpio, revalidado al cierre; su árbol coincide con baseline.
Upstream fetch original; push DISABLED_NO_PUSH_TO_MIHUERTA. Actualización posterior al checkpoint local: remoto privado Facussttee/nexo-pedidos creado y origin configurado; la versión integrada se publica en main para continuar desde otra computadora. Sin deploy ni piloto. El conector GitHub no expone creación y gh no está instalado; se creó el remoto privado mediante la interfaz de GitHub en la sesión existente del usuario. La API confirmó propietario Facussttee, visibilidad private y permisos push/admin. Revisión previa al push: 261 blobs del historial alcanzable, sin coincidencias de los patrones de secretos revisados; las claves JWT anon públicas heredadas se conservan en el historial. Esto no equivale a una auditoría exhaustiva de secretos.
No se copiaron .env ni sesiones locales. Búsqueda de nombres sensibles en historial no equivale a auditoría exhaustiva. No se asignó LICENSE nueva (ausente en baseline); resolver procedencia/licencia antes de distribuir. No se consultó DB productiva ni inició bot/WhatsApp ni enviaron mensajes reales.
SO observado: Microsoft Windows NT 10.0.26100.0. Git 2.56.0.windows.4; Node v26.13.0; navegador de pruebas Brave/Chromium 156.0.8078.80 con Playwright empaquetado. Sin instalación de herramientas o conexiones adicionales.

## Rutas para retomar

- Coordinador: D:\Escritorio\nexo-pedidos / codex/np-coordination.
- E0: D:\Escritorio\nexo-pedidos-worktrees\E0 / codex/experiment-E0, final ee61771.
- NP-002: D:\Escritorio\nexo-pedidos-worktrees\NP-002 / codex/np-002-demo, final 872077b.
- NP-003: D:\Escritorio\nexo-pedidos-worktrees\NP-003 / codex/np-003-static, final 76a08cb.
- Revisión Codex: D:\Escritorio\nexo-pedidos-worktrees\review, detached 76a08cb.

## Límites y siguiente paquete propuesto

Implementado, probado local e integrado. No desplegado ni validado en piloto. Mantiene dependencias visuales CDN; PIN local, persistencia autoritativa, Auth/RLS, IDs servidor, inventario cuantitativo, entrega/pago separados y outbox siguen pendientes. El resumen heredado del operario aún usa total_real || total_estimado: caso total final cero registrado como deuda del tramo de pesaje, no corregido fuera de alcance.
Siguiente propuesta: coordination/tasks/NP-004-PROPOSED.md — Auth/roles/RLS y seguimiento por token acotado, con pruebas positivas/negativas contra DB descartable. Sin ejecutor ni servicios iniciados. Mostrar este checkpoint y seguir las indicaciones de Facu antes de otra fase.
