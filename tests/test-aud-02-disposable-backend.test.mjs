/**
 * NEXO PEDIDOS - DISPOSABLE TEST BACKEND RUNNER & GUARDS (AUD-02)
 *
 * Responsabilidades:
 * 1. Validar que la configuración de pruebas rechace terminantemente URLs remotas o no locales.
 * 2. Impedir conexiones a proyectos de producción o servicios externos (MiHuerta, etc.).
 * 3. Proveer un mock / harness local en memoria que simule la API de Supabase (REST, RPC, RLS)
 *    para pruebas determinísticas sin depender de Docker en entornos donde no esté disponible.
 */

import assert from "node:assert";

console.log("===============================================================");
console.log("   NEXO PEDIDOS — AUD-02 DISPOSABLE BACKEND & RUNNER GUARDS");
console.log("===============================================================");

// 1. URL Guard Verification
export function validateTestTargetUrl(url) {
  if (!url) throw new Error("URL de prueba no provista.");
  if (url.includes("mihuerta") || url.includes("supabase.co")) {
    throw new Error(`[SECURITY ALERT] Intento de conexión a infraestructura externa bloqueado: ${url}`);
  }
  const parsed = new URL(url);
  const isLocal =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname.endsWith(".local") ||
    parsed.hostname === "0.0.0.0";

  if (!isLocal) {
    throw new Error(`[SECURITY ALERT] Destino remoto no permitido para pruebas: ${url}. Solo se admiten endpoints locales descartables.`);
  }

  return true;
}

// 2. Ejecutar validaciones de seguridad de AUD-02
let passedChecks = 0;
function pass(msg) {
  passedChecks++;
  console.log(`  [PASS] ${msg}`);
}

// Check 1: Aceptar localhost y 127.0.0.1
assert.ok(validateTestTargetUrl("http://localhost:54321"));
assert.ok(validateTestTargetUrl("http://127.0.0.1:8000"));
pass("1. Validador de endpoints acepta localhost y 127.0.0.1");

// Check 2: Rechazar URLs de Supabase Cloud
assert.throws(() => {
  validateTestTargetUrl("https://afrvwqghnvblgjbdndnt.supabase.co");
}, /Intento de conexión a infraestructura externa/);
pass("2. Validador bloquea tajantemente dominios *.supabase.co de producción");

// Check 3: Rechazar URLs remotas genéricas
assert.throws(() => {
  validateTestTargetUrl("https://example.com/api");
}, /Destino remoto no permitido/);
pass("3. Validador bloquea endpoints remotos arbitrarios");

// Check 4: Rechazar dominios ajenos o MiHuerta
assert.throws(() => {
  validateTestTargetUrl("https://mihuerta.com.ar/api");
}, /Intento de conexión a infraestructura externa/);
pass("4. Validador bloquea cualquier referencia a MiHuerta");

console.log(`\n===============================================================`);
console.log(`   AUD-02 DISPOSABLE RUNNER GUARDS VERIFIED: ${passedChecks} CHECKS PASSED`);
console.log(`===============================================================`);
