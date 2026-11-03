# QA-A — scroll y diagnóstico inicial

Autorizado por Facu: implementar PLAN_DE_ACCION_CALIDAD_Y_EVOLUCION, con Antigravity como ejecutor principal, modelos económicos y revisión Codex. Leer AGENTS.md y el plan; esta autorización reemplaza la prohibición histórica de iniciar otra fase. Sin DB/WhatsApp productivos, push/deploy o cambios en MiHuerta.
Worktree exclusivo: D:\Escritorio\nexo-pedidos-worktrees\quality. Rama codex/quality-navigation. Base: commit de coordinación inmediatamente anterior a la creación del worktree, comprobable en git log.

Primero usar plan/teamwork según sus instrucciones reales: reportar comportamiento, agentes y modelo antes de ampliar paralelismo. Modelo inicial solicitado Gemini 3.8 Flash Medium si está disponible; no Argon para implementación rutinaria. No cambiar modelo activo ni permisos. Máximo un escritor de UI y un diagnóstico de seguridad de sólo lectura, con límites de archivos; no crear seis agentes ni worktrees por rutina.

Entrega inicial:
1. Reproducir scroll de catálogo/carrito/operario/admin en navegador real (escritorio, tablet vertical/horizontal y móvil). No confundir scroll programático con wheel/touch ni emulación con hardware físico. Registrar hipótesis si falta capacidad, no inventar éxito.
2. Identificar causa verificable y corregir mínimamente; conservar diseño y funciones. Probar apertura/cierre de carrito, formularios largos y acceso a controles inferiores. Agregar regresión significativa y registrar BUG-001 en coordination/bugs.
3. Diagnóstico de seguridad/robustez (lectura): hallazgos concretos, escenarios y referencias; diferenciar deuda heredada de regresión nueva. No ejecutar tests cloud ni bot.
4. Inventario de diferencias de UX respecto a MiHuerta sólo por lectura. Proponer UI unitario/peso/mixto y CRUD catálogo para los paquetes siguientes; no rediseñar ni implementar importador todavía.

Archivos permitidos para el escritor: css/style.css, js/app.js, js/views/client.js, index.html, js/bundle.js si cambia modular, tests nuevos de navegación, coordination/bugs/BUG-001.md, coordination/results/QA-A.md, docs/UX_COMPARISON.md. Si el bug exige otro archivo, explicar ampliación antes. Seguridad sólo escribe coordination/results/QA-SECURITY-DIAG.md; no toca fuente ni archivos del otro escritor. No cambiar BOARD/AGENTS ni otros paquetes.
Pruebas: build-bundle.ps1 si JS cambia; node --check bundle; 17/24/71/18 suites existentes; navegador real. Guardar comandos/resultados, modelo real, límites y commit local acotado. Codex revisará y probará independientemente. No marcar DONE ni push.
