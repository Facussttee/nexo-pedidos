/**
 * NEXO PEDIDOS - DISPOSABLE TEST BACKEND RUNNER & GUARDS (AUD-02)
 *
 * Responsabilidades:
 * 1. Validar que la configuración de pruebas rechace terminantemente URLs remotas o no locales.
 * 2. Impedir conexiones a proyectos de producción o servicios externos (MiHuerta, supabase.co, etc.).
 * 3. Proveer helpers determinísticos de entorno descartable para suites aisladas
 *    sin mutar infraestructura ni instalar binarios silenciosamente.
 */

import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const ALLOWED_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Valida que una URL destino de prueba sea exclusivamente local/loopback descartable.
 * Rechaza credenciales embebidas, protocolos no HTTP(S), dominios *.supabase.co,
 * cualquier referencia a MiHuerta y hosts remotos o engañosos (ej. localhost.evil.com).
 */
export function validateTestTargetUrl(url) {
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("URL de prueba no provista.");
  }

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes("mihuerta") || lower.includes("supabase.co")) {
    throw new Error(`[SECURITY ALERT] Intento de conexión a infraestructura externa bloqueado: ${trimmed}`);
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`[SECURITY ALERT] URL de prueba inválida: ${trimmed}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`[SECURITY ALERT] Protocolo no permitido para pruebas: ${parsed.protocol}`);
  }

  if (parsed.username || parsed.password) {
    throw new Error("[SECURITY ALERT] URL de prueba no debe contener credenciales embebidas.");
  }

  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_LOCAL_HOSTS.has(host)) {
    throw new Error(
      `[SECURITY ALERT] Destino remoto o no loopback prohibido para pruebas: ${trimmed}. Solo se admite localhost/127.0.0.1/[::1].`
    );
  }

  return true;
}

export function resolveDisposableTestEnv(env = {}) {
  const url = env.NEXO_TEST_SUPABASE_URL || "http://127.0.0.1:54321";
  const anonKey = env.NEXO_TEST_SUPABASE_ANON_KEY || "sb_publishable_local_disposable_anon_key";
  validateTestTargetUrl(url);
  if (/service_role|sb_secret_/i.test(String(anonKey))) {
    throw new Error("[SECURITY ALERT] La clave anon de prueba no puede contener secretos de servidor.");
  }
  return { url, anonKey, isDisposableLocal: true };
}

export function detectLocalPostgresCapabilities() {
  const probe = (cmd) => {
    try {
      const out = execFileSync(cmd, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      return out.trim().split(/\r?\n/)[0] || "detected";
    } catch {
      return null;
    }
  };
  const docker = probe("docker");
  const supabase = probe("supabase");
  const psql = probe("psql");
  return {
    docker,
    supabase,
    psql,
    realPostgresAvailable: Boolean(docker && (supabase || psql))
  };
}

function runSelfChecks() {
  console.log("===============================================================");
  console.log("   NEXO PEDIDOS — AUD-02 DISPOSABLE BACKEND & RUNNER GUARDS");
  console.log("===============================================================");

  let passedChecks = 0;
  function pass(msg) {
    passedChecks++;
    console.log(`  [PASS] ${msg}`);
  }

  assert.ok(validateTestTargetUrl("http://localhost:54321"));
  assert.ok(validateTestTargetUrl("http://127.0.0.1:8000"));
  assert.ok(validateTestTargetUrl("http://[::1]:54321"));
  pass("1. Validador acepta exclusivamente endpoints loopback locales (localhost, 127.0.0.1, [::1])");

  assert.throws(() => {
    validateTestTargetUrl("https://afrvwqghnvblgjbdndnt.supabase.co");
  }, /infraestructura externa/);
  pass("2. Validador bloquea dominios *.supabase.co de producción");

  assert.throws(() => {
    validateTestTargetUrl("https://mihuerta.com.ar/api");
  }, /infraestructura externa/);
  pass("3. Validador bloquea referencias a MiHuerta");

  assert.throws(() => {
    validateTestTargetUrl("https://example.com/api");
  }, /Destino remoto o no loopback/);
  assert.throws(() => {
    validateTestTargetUrl("http://localhost.evil.com:54321");
  }, /Destino remoto o no loopback/);
  assert.throws(() => {
    validateTestTargetUrl("http://127.0.0.1.nip.io:54321");
  }, /Destino remoto o no loopback/);
  assert.throws(() => {
    validateTestTargetUrl("file:///etc/passwd");
  }, /Protocolo no permitido/);
  assert.throws(() => {
    validateTestTargetUrl("http://user:secret@127.0.0.1:54321");
  }, /credenciales embebidas/);
  pass("4. Validador bloquea dominios remotos, spoofed localhost, credenciales y protocolos no HTTP");

  const cfg = resolveDisposableTestEnv({});
  assert.equal(cfg.url, "http://127.0.0.1:54321");
  assert.equal(cfg.isDisposableLocal, true);
  assert.throws(() => {
    resolveDisposableTestEnv({
      NEXO_TEST_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXO_TEST_SUPABASE_ANON_KEY: "service_role_leak"
    });
  }, /secretos de servidor/);
  pass("5. Resolución de config descartable local rechaza claves secretas");

  const caps = detectLocalPostgresCapabilities();
  console.log(
    `  [INFO] Capacidades backend reales en host: docker=${caps.docker || "absent"}, supabase=${caps.supabase || "absent"}, psql=${caps.psql || "absent"}`
  );

  console.log(`\n===============================================================`);
  console.log(`   AUD-02 DISPOSABLE RUNNER GUARDS VERIFIED: ${passedChecks} CHECKS PASSED`);
  console.log(`===============================================================`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSelfChecks();
}
