# Ejecución activa — evolución completa (no finalizada)

Objetivo de Facu: implementar PLAN_DE_ACCION_CALIDAD_Y_EVOLUCION, trabajo pesado Antigravity, modelos económicos, Codex coordina/revisa/prueba y puede escribir código. No redefinir éxito como sólo QA-A. Próximos B/C/E/F siguen pendientes; D definitivo condicionado a relevamiento real.

Coordinador: D:\Escritorio\nexo-pedidos / codex/np-coordination.
Ejecutor exclusivo: D:\Escritorio\nexo-pedidos-worktrees\quality / codex/quality-navigation, base47c05b3.
Antigravity UI: ventana retornada id788326, app process:C:\Users\Facu\AppData\Local\Programs\antigravity\Antigravity.exe (rehidratar con list_windows/get_window si cambió). Conversación 3023025a-3d96-41eb-9d96-db248c93baf3, título QA Plan Nexo Pedidos, proyecto quality. No repetir envíos ni iniciar otro escritor antes de verificar fin.
Modelo observado: Gemini3.8 Flash Medium. plan seleccionado desde slash menu y ejecutado; plan leído en C:\Users\Facu\.gemini\antigravity\brain\3023025a-3d96-41eb-9d96-db248c93baf3\plan-qa-a.md. Aprobación con ajustes enviada una vez; último estado UI confirmó Cancel/Working, lectura de BASELINE_SCROLL y SCROLL_EXPERIMENT y comando verify Playwright in runtime. Turno vivo, todavía sin cambios locales al último status. No interpretar espera o timeout como fin.

Ajustes de aceptación enviados: máximo1 escritorUI +1 auditor seguridad Flash; auditor sin escrituras durante UI salvo worktree propio, o secuencial si no se pueden controlar modelos. No preservar regex/tests de strings que impongan overflow-x:hidden defectuoso; ampliación autorizada tests/test-adversarial-r1.cjs. Scroll real wheel/touch, no sólo DOM simulado; no pan-y en categorías que necesitan scroll horizontal. Equipo aún no observado como lanzado: no afirmar teamwork exitoso por intención.

Evidencia independiente ya obtenida con HTTP/navegador reales y Tailwind200:
- coordination/bugs/BASELINE_SCROLL.json: rueda800px no mueve window.scrollY en escritorio1366x768,tablet768x1024/1024x768,móvil390x844; alturas3856/3958px, cero erroresJS y cargas fallidas.
- SCROLL_EXPERIMENT.json: override sólo en navegador html overflow-x:clip/overflow-y:auto; body overflow-x:clip/overflow-y:visible restaura800px en todos. NO se modificó CSS de aplicación. Falta carrito/otras vistas/touch/hardware físico.
- Script propio coordination/reviews/scroll-baseline.cjs y análisis QA-A-BASELINE.md. Servidor/navegador propios cerrados. Compartidos por ruta absoluta al ejecutor, no copiados al worktree activo.

Siguiente acción: observar MISMA conversación/ventana, revisar resultado/diff al terminar, ejecutar regresión propia sobre CSS corregido sin override. No marcar resuelto por el experimento. Después integrar paquete aceptado y continuar B(propuesta revisable y preparaciónunidad/peso/mixto),C(CRUD),D(contrato/vista previa sin parserdefinitivo),E(seguridad/robustez con DBdescartable si disponible),F(limpieza de antiguos proyectos/worktrees conservandohistoria). Leer EVOLUTION.md y plan completo.

Skill review-agent fue leída; aplicar revisión directa de defectos introducidos y evidencia en call sites. La autorización explícita del usuario de implementar y escribir código prevalece sobre el modo sólo lectura de esa skill cuando no se está haciendo una revisión. No usar skill para cancelar el objetivo global.
Sin push de evolución todavía. Original MiHuerta no modificado. No DB, WhatsApp o deploy reales. No limpieza ejecutada todavía ni cambios de permisos/suscripción.
