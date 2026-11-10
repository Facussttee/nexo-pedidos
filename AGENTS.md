# Nexo Pedidos — reglas de trabajo

Producto derivado de Facussttee/MiHuerta. Leer docs/PRODUCT.md y coordination/tasks/<ID>.md.
- **Contexto de repositorio y Grafo de Conocimiento obligatorio:** Cualquier agente o IA que opere en este repositorio DEBE consultar graphify-out/GRAPH_REPORT.md (resumen global, clusters arquitectónicos y dependencias cruzadas) y graphify-out/graph.json antes de planificar o modificar flujos en el código. La visualización interactiva navegable está disponible en graphify-out/graph.html.
- **Detección y Ubicación de Raíz Canónica:** Antes de iniciar auditorías, tareas de orquestación o invocaciones multi-agente, verificar si la raíz de trabajo es el repositorio principal (`D:\Escritorio\nexo-pedidos`) o un worktree secundario.
- **Filosofía Ponytail & Backend Patterns:** Aplicar la solución más simple y directa sin sobre-ingeniería (ponytail), manteniendo patrones limpios de backend (ETag, validación estricta y separación de servicios).
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

## Verificaciones vigentes del primer checkpoint
- Demo/config: node tests/test-demo-isolation.test.mjs. HTTP/build: node tests/test-static-server.test.mjs. Son aisladas; no requieren DB ni dependencias del worker.
- Publicar sólo dist/public, creado por node scripts/build-public.mjs. El builder sólo admite sourceRoot/dist/public y rechaza padres symlink/junction antes de mutar.
- Probar con node bot/serve-demo.js --host 127.0.0.1 --port 3000; no iniciar bot/index.js para probar archivos web. El CLI valida la raíz también con --no-build.
- La configuración demo bloquea APIs de datos/Supabase y simula WhatsApp; CDN visual y fuentes siguen como dependencia externa. No prometer cero red total ni offline autónomo.
- No despachar NP-004 ni otra fase hasta mostrar el checkpoint y recibir las indicaciones de alcance de Facu.
