# NP-002 — recuperación tras cuota (intento 2)

Worktree D:\Escritorio\nexo-pedidos-worktrees\NP-002; rama codex/np-002-demo. Base parcial exacta ef38cd41d61aab80b00c70d872fc724dd72bb750.
Autor de cambios principales parciales: Antigravity con Claude Opus 5.5 Medium. Turno terminó por cuota; no sigue activo. Codex sólo regeneró bundle y guardó este checkpoint WIP; NO completó implementación.
Modelo de recuperación: Gemini 4 Argon Medium, observado disponible; cuota visible 78% semanal Argon, Gemini 47% semanal/100% 5h. Claude/GPT 0% semanal. No compras, excedentes ni cambios de permisos. No cambiar modelo durante turno.

Leer AGENTS y contrato NP-002 original. Alcance idéntico MÁS js/views/operator.js únicamente para aislar WhatsApp y perfil sintético (ampliación aprobada por coordinador). NO rehacer configuración/store ya creados sin un bug concreto.
Estado parcial: config.js, demo-data.js, public-config.js, store.js y builder editados; bundle regenerado y node --check 0. HTML/vistas/app todavía heredados; NO abrir HTML con red, NO se acepta aún como demo.

Paquete reducido a terminar la integración pendiente:
1. index.html carga public-config antes del bundle, quita SDK Supabase predeterminado, lee tema Nexo y muestra demo/error persistente.
2. Actualizar llamadas heredadas de configuración en admin/app; no permitir configurar conexión en demo. Adaptar quick-demo a sintéticos. Consulta/envío WhatsApp en cliente y operario simulado por store, sin enlaces reales en demo; perfil desde config. No rediseño.
3. Corregir comentario de demo-data que afirma rango telefónico reservado/no asignado: sólo decir valores sintéticos usados con mensajería bloqueada; no se verificó asignación de esos números.
4. Agregar tests Node de aislamiento según contrato original: cero createClient/red en demo con almacenamiento heredado, producción incompleta falla claro, carrito→pedido→peso→listo, namespace propio. Regenerar bundle, node --check y tests heredados. No efectos externos.
5. Resultado coordination/results/NP-002.md con autoría de ambos modelos, cambios/comandos/resultados/límites y commit local. No BOARD, push, bot, SQL ni MiHuerta. Si faltan permisos/capacidad, informar bloqueo sin reemplazar evidencia por suposiciones.
