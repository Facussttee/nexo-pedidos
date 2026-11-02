# Estrategia independiente de revisión — primer tramo

Autor Codex. Ejecutar tras fin confirmado de cada escritor; no mutar worktree activo.

NP-002: inspeccionar todo diff fuente y build; buscar endpoints originales por coincidencias sin imprimir claves; verificar namespace y rutas de configuración; ejecutar tests de autor y heredados; regenerar bundle en checkout de revisión y comprobar determinismo. Prueba en navegador local con todas las salidas de red externas interceptadas: demo visible, login sintético, producto/carrito/confirmación, vista operario/pesaje/listo y cero conexiones Supabase/WhatsApp. Probar modo producción incompleto. Distinguir intentos de assets CDN de requests de datos; no afirmar offline visual completo.

NP-003: fixtures HTTP con marcador secreto fuera de raíz y públicos dentro; GET/HEAD/métodos; .env/.git/auth/SQL; traversal ../ literal y percent-encoded simple/doble, %5c y rutas Windows, NUL, escapes inválidos, sibling-prefix y symlink/junction. Inyectar request-target crudo cuando fetch normaliza traversal. Tras 4xx, pedir index para demostrar supervivencia. Importar servidor en proceso con límites sin worker/DB; build-public sólo allowlist. Nunca escuchar interfaces externas en QA.

Integración: commits en orden E0 → NP-002 → NP-003. Ver estado limpio, archivos fuera de alcance y pruebas pertinentes; comparar MiHuerta original HEAD/status final con evidencia inicial. Sin push, deploy o servicios reales. Auth/RLS/stock/outbox siguen pendientes del siguiente tramo.
