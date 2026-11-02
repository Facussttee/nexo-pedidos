# Nexo Pedidos — reglas de trabajo

Producto derivado de Facussttee/MiHuerta. Leer docs/PRODUCT.md y coordination/tasks/<ID>.md.
- Nunca modificar D:\Escritorio\miHuerta ni sus servicios, DB o WhatsApp. Datos sintéticos; cero mensajes reales, push o deploy.
- Un escritor por worktree. Antigravity implementa paquetes; Codex coordina, revisa y prueba independientemente. No editar BOARD desde el ejecutor.
- Mantener UX móvil (controles 44 px, inputs >=16 px), pesables estimados/finales y flexibilidad operativa: cancelar, quitar/sumar ítems y corregir entrega.
- Nombre, categorías, alias y perfil serán configurables. Una instalación por comercio. No prometer costos cero: documentar costos y límites, sin contratar servicios.
- Al cambiar JS modular, regenerar js/bundle.js desde ESTE worktree: powershell -ExecutionPolicy Bypass -File .\build-bundle.ps1; validar node --check js/bundle.js. Nunca ejecutar el builder del original.
- No cargar el HTML heredado con red antes de NP-002. No ejecutar bot/index.js, seed.js, test-mock.js ni test-order-flow.js: pueden activar efectos reales.
- Verificaciones heredadas aisladas: node bot/test-store-state.js; node tests/test-phone-numeric-validation.test.mjs. No prueban seguridad ni navegador.
- Config pública sin secretos; demo predeterminada sin Supabase; producción explícita sin fallback. Servir sólo raíz pública generada, nunca raíz Git.
- No cambiar permisos, revisiones de comandos o modelo durante tarea activa. Ante alcance insuficiente, informar bloqueo; no ampliar silenciosamente.
- AGENT.md es referencia histórica heredada, no autoridad para ejecutar rutas o servicios originales. Este archivo reemplaza sus reglas incompatibles en esta copia.
