// ==============================================================================
// Nexo Pedidos - Configuración PÚBLICA de la instalación (una por comercio)
// ------------------------------------------------------------------------------
// Este archivo se publica tal cual al navegador: NUNCA poner aquí secretos,
// service_role, contraseñas ni credenciales de servidor.
//
// Modo demo (predeterminado): datos sintéticos, sin red, WhatsApp simulado.
// Modo producción: requiere TODOS los campos; si falta alguno la app muestra un
// error claro y no arranca (no hay fallback a demo ni a endpoints heredados).
//
// Ejemplo de producción (ver docs/DEMO.md):
// window.NEXO_PUBLIC_CONFIG = {
//   mode: "production",
//   business: { name: "Mi Comercio", alias: "mi.alias", whatsapp: "54911XXXXXXXX" },
//   supabase: { url: "https://<proyecto>.supabase.co", anonKey: "<clave pública anon>" }
// };
// ==============================================================================
window.NEXO_PUBLIC_CONFIG = {
  mode: "demo"
};
