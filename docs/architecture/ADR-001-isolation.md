# Contratos del primer tramo

Demo es el modo predeterminado. No leer namespace mihuerta_* ni conectar endpoints heredados aunque existan datos locales viejos. Configuración pública explícita sin service-role/secreto; producción incompleta falla claramente, sin fallback local disfrazado de éxito.
Demo conserva catálogo/carrito/pedido/preparación sintéticos; toda acción de mensajería simulada. No abrir enlaces wa.me reales.
Servidor importable sin dependencias de worker, sockets WhatsApp ni Supabase. Raíz pública generada por allowlist; .env, auth, SQL, .git y fuentes privadas afuera. Rechazar dotfiles, traversal codificado, separadores Windows, URLs inválidas y symlinks/junctions fuera de raíz. Confinamiento por path.relative/realpath, no startsWith textual. Nunca fallback HTML para rutas privadas.
Sólo localhost para pruebas; fixtures temporales. No iniciar bot real.
