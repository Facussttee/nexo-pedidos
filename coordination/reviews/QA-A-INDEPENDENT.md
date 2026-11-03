# QA-A — revisión independiente Codex

Commit del ejecutor: 1a27cd1 (a4556cc antes de precisar tests e informes). El CSS de ambos es idéntico. Antigravity terminó el turno; modelo observado Gemini 3.8 Flash Medium, un escritor y un auditor research. El modelo del auditor figura en el informe del ejecutor; su selector no fue inspeccionado por Codex. Precio monetario no visible.

Resultado funcional aceptado: separación html/body overflow-x:clip con desplazamiento vertical del viewport. Sin cambios JS modulares ni diferencia de bundle.

Evidencia independiente:
- BASELINE_SCROLL.json y SCROLL_EXPERIMENT.json: bloqueo previo en cuatro viewports y experimento causal sólo en navegador.
- SCROLL_ACCEPTANCE_AFTER.json: 48 controles aprobados (8 por viewport: 1366x768, 768x1024, 1024x768, 360x800, 390x844, 430x932), Chromium/Brave 156.0.8078.80, HTTP real y Tailwind200. Sin CSS inyectado; cero pageerrors y solicitudes inesperadas. Rueda ida/vuelta con desplazamiento visual, PageDown, gesto táctil emulado mediante protocolo del navegador, carrito de 12 ítems con wheel scrollTop y recuperación al cerrar, 16 pedidos extra y catálogo admin largo. No es hardware físico.
- La ejecución inicial tenía una fixture equivocada: al recargar, Ana Demo tiene un pedido activo y se abre seguimiento. Se corrigió volviendo al catálogo por su botón real. SCROLL_ACCEPTANCE_FIXTURE_ERROR.json conserva ese resultado; no es un defecto de producto. Primer intento sin resultados parciales se detuvo con su árbol de procesos propio; no se usa como evidencia.
- Suites aisladas repetidas por Codex: demo17, static24, store71, phone18; sintaxis bundle válida. Los avisos de Supabase no disponible son de un mock/config incompleta del test; no hubo llamadas a servicios reales.

Revisión del código productivo: sin defectos nuevos accionables identificados en el cambio CSS. La aserción heredada de strings se flexibilizó; las pruebas funcionales proporcionan la evidencia principal. No considerar los 26 checks del ejecutor prueba de touch físico ni seguridad productiva.

Límites: sin Safari/WebKit, tablet física, trackpad, teclado virtual ni DB descartable. No hay Auth/RLS real validado. No se ejecutaron bot/index.js ni tests cloud. La auditoría estática contiene riesgos heredados, no acceso comprobado a la instalación de MiHuerta.

Observaciones para la propuesta B/C: UX_COMPARISON todavía contiene afirmaciones sin demostrar (MiHuerta scroll fluido, pesaje obligatorio en unidades, modo oscuro como novedad), y su ejemplo UNITARIO/kg/paso0.5 contradice el contrato. Corregirlo antes de tomarlo como diseño aprobado. El contraste visual requiere propuesta concreta y revisión del usuario; no está autorizado extender un rediseño por inferencias del informe.
