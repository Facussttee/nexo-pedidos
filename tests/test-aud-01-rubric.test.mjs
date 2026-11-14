/**
 * NEXO PEDIDOS - AUD-01 RUNNER Y EVALUADOR DE RÚBRICA DE AUDITORÍA
 *
 * Rúbrica ponderada (Total: 100 puntos):
 * - Seguridad (25 pts)
 * - Integridad Funcional (25 pts)
 * - UX & Accesibilidad (20 pts)
 * - Rendimiento (10 pts)
 * - Preparación Operativa (20 pts)
 *
 * Regla de honestidad: separa estrictamente PASS, FAIL y UNVERIFIED.
 * Ningún control sin verificación real (p. ej. RLS en PostgreSQL real o Safari iOS físico)
 * puede marcarse PASS ni sumar puntos verificados.
 */

import { execSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import vm from "node:vm";

console.log("===============================================================");
console.log("   NEXO PEDIDOS — AUD-01 RUNNER DE RÚBRICA Y REGRESIONES");
console.log("===============================================================");

function safeGit(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "unknown";
  }
}

function probeBinary(cmd, args = ["--version"]) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split(/\r?\n/)[0];
  } catch {
    return null;
  }
}

const environment = {
  commit: safeGit(["rev-parse", "HEAD"]),
  shortCommit: safeGit(["rev-parse", "--short", "HEAD"]),
  branch: safeGit(["rev-parse", "--abbrev-ref", "HEAD"]),
  node: process.version,
  platform: `${process.platform}/${process.arch}`,
  docker: probeBinary("docker"),
  supabase: probeBinary("supabase"),
  psql: probeBinary("psql"),
  brave: fs.existsSync("C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe")
};

const rubricResults = {
  seguridad: { max: 25, scored: 0, failed: 0, unverified: 0, items: [] },
  integridad: { max: 25, scored: 0, failed: 0, unverified: 0, items: [] },
  ux: { max: 20, scored: 0, failed: 0, unverified: 0, items: [] },
  rendimiento: { max: 10, scored: 0, failed: 0, unverified: 0, items: [] },
  operacion: { max: 20, scored: 0, failed: 0, unverified: 0, items: [] }
};

function evaluateControl(category, name, points, checkFn) {
  try {
    const res = checkFn();
    let status = "FAIL";
    let reason = "";
    if (res === true) {
      status = "PASS";
    } else if (res && typeof res === "object") {
      status = res.status || (res.passed ? "PASS" : "FAIL");
      reason = res.reason || "";
    }

    if (status === "PASS") {
      rubricResults[category].scored += points;
      rubricResults[category].items.push({ name, points, max: points, status: "PASS", reason });
      console.log(`  [PASS]       (${points}/${points} pts) [${category.toUpperCase()}] ${name}${reason ? ` — ${reason}` : ""}`);
    } else if (status === "UNVERIFIED") {
      rubricResults[category].unverified += points;
      rubricResults[category].items.push({ name, points: 0, max: points, status: "UNVERIFIED", reason });
      console.log(`  [UNVERIFIED] (0/${points} pts) [${category.toUpperCase()}] ${name}${reason ? ` — ${reason}` : ""}`);
    } else {
      rubricResults[category].failed += points;
      rubricResults[category].items.push({ name, points: 0, max: points, status: "FAIL", reason });
      console.log(`  [FAIL]       (0/${points} pts) [${category.toUpperCase()}] ${name}${reason ? ` — ${reason}` : ""}`);
    }
  } catch (err) {
    rubricResults[category].failed += points;
    rubricResults[category].items.push({ name, points: 0, max: points, status: "FAIL", error: err.message });
    console.log(`  [FAIL]       (0/${points} pts) [${category.toUpperCase()}] ${name} — Error: ${err.message}`);
  }
}

console.log(`\nCommit: ${environment.shortCommit} (${environment.branch}) | Node: ${environment.node} | Brave: ${environment.brave}`);
console.log("--- EVALUANDO CONTROLES DE LA RÚBRICA ---");

// 1. SEGURIDAD (25 pts)
evaluateControl("seguridad", "XSS Mitigation en pedidos (escapeHtml + AUD-03 tests)", 4, () => {
  const operatorSrc = fs.readFileSync("js/views/operator.js", "utf8");
  const clientSrc = fs.readFileSync("js/views/client.js", "utf8");
  const htmlJs = fs.readFileSync("js/html.js", "utf8");
  const hasHelper = htmlJs.includes("escapeHtml") && htmlJs.includes("&amp;") && htmlJs.includes("&lt;");
  const hasRawQtyOp = /\$\{\s*i\.cantidad_solicitada\s*\}/.test(operatorSrc);
  const hasRawIdOp = /#\$\{\s*order\.id\s*\}/.test(operatorSrc);
  const hasRawStateCli = /\$\{\s*currentOrder\.estado\s*\}/.test(clientSrc);
  const hasRawWeightCli = /\$\{\s*item\.peso_real\s*\}/.test(clientSrc) || /\$\{\s*item\.cantidad_solicitada\s*\}/.test(clientSrc);
  if (!hasHelper || hasRawQtyOp || hasRawIdOp || hasRawStateCli || hasRawWeightCli) {
    return { status: "FAIL", reason: "Interpolaciones sin escape en operator.js/client.js" };
  }
  if (!fs.existsSync("tests/test-aud-03-xss-orders.test.mjs")) {
    return { status: "FAIL", reason: "Falta suite dedicada tests/test-aud-03-xss-orders.test.mjs" };
  }
  execSync("node tests/test-aud-03-xss-orders.test.mjs", { stdio: "ignore" });
  return true;
});

evaluateControl("seguridad", "Autenticación individual staff sin PIN estático '1234' en API/producción", 4, () => {
  const storeSrc = fs.readFileSync("js/store.js", "utf8");
  const appSrc = fs.readFileSync("js/app.js", "utf8");
  const schemaSql = fs.readFileSync("supabase/schema.sql", "utf8");
  const hasPinFallback = /staffPin\s*:\s*.*["']1234["']/.test(storeSrc) || /verify_staff_pin_header/.test(schemaSql);
  const hasSqlDefaultPin = /'staff_pin'\s*,\s*'1234'/.test(schemaSql);
  const hasUiDefault1234 = /Por defecto:\s*<strong>1234<\/strong>/.test(appSrc);
  const hasSupabaseAuthSignIn = /signInWithPassword/.test(storeSrc) && /staff_members/.test(schemaSql);
  if (hasPinFallback || hasSqlDefaultPin || hasUiDefault1234 || !hasSupabaseAuthSignIn) {
    return { status: "FAIL", reason: "Sigue presente PIN estático '1234' o falta Supabase Auth + staff_members" };
  }
  return true;
});

evaluateControl("seguridad", "Autorización RBAC en SQL sin USING(true) público ni headers spoofables", 4, () => {
  const schemaSql = fs.readFileSync("supabase/schema.sql", "utf8");
  const clientReadOpen = /clientes_read_public[\s\S]*?USING\s*\(\s*true\s*\)/i.test(schemaSql);
  const clientUpdateOpen = /clientes_update_valid[\s\S]*?USING\s*\(\s*true\s*\)/i.test(schemaSql);
  const orderReadOpen = /pedidos_read_public[\s\S]*?USING\s*\(\s*true\s*\)/i.test(schemaSql);
  const orderUpdateOpen = /pedidos_update_valid[\s\S]*?USING\s*\(\s*true\s*\)/i.test(schemaSql);
  const hasRbacHelper = /is_active_owner|current_staff_role/.test(schemaSql);
  if (clientReadOpen || clientUpdateOpen || orderReadOpen || orderUpdateOpen || !hasRbacHelper) {
    return { status: "FAIL", reason: "Políticas RLS permisivas USING(true) o falta RBAC owner/operator" };
  }
  return true;
});

evaluateControl("seguridad", "Verificación real de RLS en PostgreSQL descartable", 5, () => {
  if (!environment.docker || (!environment.supabase && !environment.psql)) {
    return { status: "UNVERIFIED", reason: "Sin docker/supabase/psql en host para ejecutar RLS real" };
  }
  if (process.env.NEXO_REAL_POSTGRES_RLS_VERIFIED === "1") {
    return true;
  }
  return { status: "UNVERIFIED", reason: "Suite PostgreSQL real no ejecutada en esta corrida" };
});

evaluateControl("seguridad", "Seguimiento privado por token opaco (hash SHA-256 + fragment #track=)", 4, () => {
  const schemaSql = fs.readFileSync("supabase/schema.sql", "utf8");
  const storeSrc = fs.readFileSync("js/store.js", "utf8");
  const clientSrc = fs.readFileSync("js/views/client.js", "utf8");
  const hasTokenHashCol = /tracking_token_hash/.test(schemaSql);
  const hasLookupRpc = /get_order_by_tracking_token/.test(schemaSql);
  const hasHashFragment = /#track=|track=/.test(clientSrc) || /#track=/.test(storeSrc);
  const queriesOrdersByPhoneDirect = /\.from\(["']pedidos["']\)\.select\([^)]*\)\.eq\(["']cliente_telefono["']/.test(storeSrc);
  if (!hasTokenHashCol || !hasLookupRpc || !hasHashFragment || queriesOrdersByPhoneDirect) {
    return { status: "FAIL", reason: "Falta tracking_token_hash / RPC o aún consulta pedidos por teléfono" };
  }
  return true;
});

evaluateControl("seguridad", "Timestamp servidor forzado NOW() y rate limit atómico fail-closed", 4, () => {
  const schemaSql = fs.readFileSync("supabase/schema.sql", "utf8");
  const forcesServerFecha = /NEW\.fecha\s*:=\s*NOW\(\)/i.test(schemaSql);
  const hasRateLimitConfig = /rate_limit_config|order_rate_limit/.test(schemaSql);
  if (!forcesServerFecha || !hasRateLimitConfig) {
    return { status: "FAIL", reason: "Trigger/RPC no fuerza NEW.fecha := NOW() con límites configurables fail-closed" };
  }
  return true;
});

// 2. INTEGRIDAD FUNCIONAL (25 pts)
evaluateControl("integridad", "Suites base aisladas (demo-isolation 17/17 + store-state 72/72)", 6, () => {
  execSync("node tests/test-demo-isolation.test.mjs", { stdio: "ignore" });
  execSync("node bot/test-store-state.js", { stdio: "ignore" });
  return true;
});

evaluateControl("integridad", "Checkout autoritativo RPC, idempotencia con conflicto y confirmación durable", 5, () => {
  const schemaSql = fs.readFileSync("supabase/schema.sql", "utf8");
  const storeSrc = fs.readFileSync("js/store.js", "utf8");
  const hasAtomicRpc = /create_order_atomic/.test(schemaSql) && /checkout_cart_key/.test(schemaSql);
  const hasForShare = /FOR SHARE/i.test(schemaSql);
  const hasConflictCheck = /CONFLICT|idempotency|payload_hash/i.test(schemaSql);
  const hasUpsertFallback = /if \(order\._isNew && order\.id\)[\s\S]*?\.upsert/.test(storeSrc);
  if (!hasAtomicRpc || !hasForShare || !hasConflictCheck || hasUpsertFallback) {
    return { status: "FAIL", reason: "Falta create_order_atomic completo o persiste fallback upsert con ID local" };
  }
  if (!fs.existsSync("tests/test-aud-07-08-09-12-orders.test.mjs")) {
    return { status: "FAIL", reason: "Falta suite tests/test-aud-07-08-09-12-orders.test.mjs" };
  }
  execSync("node tests/test-aud-07-08-09-12-orders.test.mjs", { stdio: "ignore" });
  return true;
});

evaluateControl("integridad", "Concurrencia optimista en preparación (version) y preservación de 0", 4, () => {
  execSync("node tests/test-preparation-input.test.mjs", { stdio: "ignore" });
  const schemaSql = fs.readFileSync("supabase/schema.sql", "utf8");
  const storeSrc = fs.readFileSync("js/store.js", "utf8");
  const hasVersionSql = /\bversion\b\s+INT/i.test(schemaSql) && /finalize_order_preparation|update_order_preparation/.test(schemaSql);
  const checksVersionStore = /expected_version|p_expected_version|\.version/.test(storeSrc);
  if (!hasVersionSql || !checksVersionStore) {
    return { status: "FAIL", reason: "Falta versionado optimista y RPCs de preparación" };
  }
  return true;
});

evaluateControl("integridad", "Identidad telefónica local completa (sin slice(-8) en isSameCustomer)", 5, () => {
  execSync("node tests/test-phone-numeric-validation.test.mjs", { stdio: "ignore" });
  const storeSrc = fs.readFileSync("js/store.js", "utf8");
  const match = storeSrc.match(/isSameCustomer\s*\([\s\S]{0,400}\)/);
  const usesSlice8 = match && /\.slice\(-8\)/.test(match[0]);
  if (usesSlice8 || !fs.existsSync("tests/test-aud-10-11-identity-catalog.test.mjs")) {
    return { status: "FAIL", reason: "isSameCustomer sigue comparando .slice(-8) o falta suite AUD-10/11" };
  }
  execSync("node tests/test-aud-10-11-identity-catalog.test.mjs", { stdio: "ignore" });
  return true;
});

evaluateControl("integridad", "Catálogo remoto vacío reemplaza caché local y expone errores de red", 5, () => {
  const storeSrc = fs.readFileSync("js/store.js", "utf8");
  const ignoresEmptyCatalog = /if\s*\(\s*prodRes\.data\s*&&\s*prodRes\.data\.length\s*>\s*0\s*\)/.test(storeSrc);
  if (ignoresEmptyCatalog) {
    return { status: "FAIL", reason: "pullFromSupabase ignora prodRes.data=[] y deja catálogo obsoleto" };
  }
  return true;
});

// 3. UX & ACCESIBILIDAD (20 pts)
evaluateControl("ux", "Etiquetas accesibles en buscador, teléfono y entrega", 4, () => {
  const clientSrc = fs.readFileSync("js/views/client.js", "utf8");
  const hasSearchAria = /id="search-input"[\s\S]{0,200}aria-label=/m.test(clientSrc) || /for="search-input"/.test(clientSrc);
  const hasPhoneFor = /for="phone-input"/.test(clientSrc);
  const hasAddressFor = /for="address-input"/.test(clientSrc);
  const hasDeliveryFor = /for="delivery-address-input"/.test(clientSrc);
  if (!hasSearchAria || !hasPhoneFor || !hasAddressFor || !hasDeliveryFor) {
    return { status: "FAIL", reason: "Faltan etiquetas for/aria-label en buscador, teléfono o dirección" };
  }
  return true;
});

evaluateControl("ux", "Controles de cantidad con nombre de producto y suite a11y", 4, () => {
  const clientSrc = fs.readFileSync("js/views/client.js", "utf8");
  const hasNamedDec = /btn-qty-dec[\s\S]{0,400}aria-label="Restar \$\{escapeHtml\(product\.nombre\)\}"/.test(clientSrc);
  const hasNamedInc = /btn-qty-inc[\s\S]{0,400}aria-label="Sumar \$\{escapeHtml\(product\.nombre\)\}"/.test(clientSrc);
  if (!hasNamedDec || !hasNamedInc || !fs.existsSync("tests/test-aud-13-a11y.test.mjs")) {
    return { status: "FAIL", reason: "Botones de cantidad genéricos o falta suite AUD-13" };
  }
  execSync("node tests/test-aud-13-a11y.test.mjs", { stdio: "ignore" });
  return true;
});

evaluateControl("ux", "Ergonomía táctil mínima (>=44px y >=16px en inputs)", 4, () => {
  const styleCss = fs.readFileSync("css/style.css", "utf8");
  const has44 = styleCss.includes("--touch-target-min: 44px") && styleCss.includes("min-height: 44px");
  const has16 = styleCss.includes("font-size: 16px");
  return has44 && has16;
});

evaluateControl("ux", "Regresión móvil/visual Chromium/Brave (360-1024px)", 4, () => {
  if (!fs.existsSync("tests/test-aud-14-mobile-visual.test.mjs")) {
    return { status: "FAIL", reason: "Falta suite tests/test-aud-14-mobile-visual.test.mjs" };
  }
  execSync("node tests/test-aud-14-mobile-visual.test.mjs", { stdio: "ignore" });
  return true;
});

evaluateControl("ux", "Validación en navegador iOS Safari físico y captura HEIC", 4, () => {
  return { status: "UNVERIFIED", reason: "Sin dispositivo iOS/macOS Safari físico en este host Windows" };
});

// 4. RENDIMIENTO (10 pts)
evaluateControl("rendimiento", "Bundle válido sin BOM (<400 KB) y sin CSS @import bloqueante", 5, () => {
  execSync("node --check js/bundle.js", { stdio: "ignore" });
  const buf = fs.readFileSync("js/bundle.js");
  const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  const styleCss = fs.readFileSync("css/style.css", "utf8");
  const hasBlockingImport = /@import\s+url\(/i.test(styleCss);
  if (hasBom || buf.length >= 400000 || buf.length < 50000 || hasBlockingImport) {
    return { status: "FAIL", reason: hasBlockingImport ? "css/style.css mantiene @import bloqueante" : "Bundle inválido o fuera de tamaño" };
  }
  return true;
});

evaluateControl("rendimiento", "Medición reproducible 5 corridas en navegador headless (AUD-15)", 5, () => {
  if (!fs.existsSync("tests/test-aud-15-performance.test.mjs")) {
    return { status: "FAIL", reason: "Falta suite reproducible tests/test-aud-15-performance.test.mjs" };
  }
  execSync("node tests/test-aud-15-performance.test.mjs", { stdio: "ignore" });
  return true;
});

// 5. PREPARACIÓN OPERATIVA (20 pts)
evaluateControl("operacion", "Servidor estático confinado (dist/public + traversals 24/24)", 6, () => {
  execSync("node scripts/build-public.mjs", { stdio: "ignore" });
  execSync("node tests/test-static-server.test.mjs", { stdio: "ignore" });
  return fs.existsSync("dist/public/index.html") && fs.existsSync("dist/public/js/bundle.js");
});

evaluateControl("operacion", "Aislamiento config pública sin secretos runtime y fail-closed producción", 6, () => {
  const publicConfigSrc = fs.readFileSync("js/public-config.js", "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(publicConfigSrc, sandbox);
  const cfg = sandbox.window.NEXO_PUBLIC_CONFIG;
  const serialized = JSON.stringify(cfg || {});
  if (!cfg || cfg.mode !== "demo" || /service_role|sb_secret_/i.test(serialized)) {
    return { status: "FAIL", reason: "NEXO_PUBLIC_CONFIG no está en demo o contiene secretos en runtime" };
  }
  return true;
});

evaluateControl("operacion", "Runner descartable y guardias contra endpoints remotos/MiHuerta (AUD-02)", 4, () => {
  execSync("node tests/test-aud-02-disposable-backend.test.mjs", { stdio: "ignore" });
  return true;
});

evaluateControl("operacion", "CI actualizado con suites AUD, lockfile presente y auditoría deps", 4, () => {
  const hasLock = fs.existsSync("bot/package-lock.json");
  const ciYml = fs.existsSync(".github/workflows/ci.yml") ? fs.readFileSync(".github/workflows/ci.yml", "utf8") : "";
  const hasAudInCi = ciYml.includes("test-aud-03") && ciYml.includes("test-aud-07") && ciYml.includes("test-aud-13");
  if (!hasLock || !hasAudInCi) {
    return { status: "FAIL", reason: "Falta cobertura de suites AUD en .github/workflows/ci.yml" };
  }
  if (!fs.existsSync("tests/test-aud-16-ops-security.test.mjs")) {
    return { status: "FAIL", reason: "Falta suite tests/test-aud-16-ops-security.test.mjs" };
  }
  execSync("node tests/test-aud-16-ops-security.test.mjs", { stdio: "ignore" });
  return true;
});

const totalScore = Object.values(rubricResults).reduce((sum, c) => sum + c.scored, 0);
const totalFailed = Object.values(rubricResults).reduce((sum, c) => sum + c.failed, 0);
const totalUnverified = Object.values(rubricResults).reduce((sum, c) => sum + c.unverified, 0);

console.log("\n===============================================================");
console.log(`   PUNTAJE VERIFICADO: ${totalScore} / 100  (Fallido: ${totalFailed} | No verificado: ${totalUnverified})`);
console.log(`   - Seguridad:   ${rubricResults.seguridad.scored} / 25 (Fail: ${rubricResults.seguridad.failed}, Unverified: ${rubricResults.seguridad.unverified})`);
console.log(`   - Integridad:  ${rubricResults.integridad.scored} / 25 (Fail: ${rubricResults.integridad.failed}, Unverified: ${rubricResults.integridad.unverified})`);
console.log(`   - UX / A11y:   ${rubricResults.ux.scored} / 20 (Fail: ${rubricResults.ux.failed}, Unverified: ${rubricResults.ux.unverified})`);
console.log(`   - Rendimiento: ${rubricResults.rendimiento.scored} / 10 (Fail: ${rubricResults.rendimiento.failed}, Unverified: ${rubricResults.rendimiento.unverified})`);
console.log(`   - Operación:   ${rubricResults.operacion.scored} / 20 (Fail: ${rubricResults.operacion.failed}, Unverified: ${rubricResults.operacion.unverified})`);
console.log("===============================================================");

fs.writeFileSync(
  "coordination/results/rubric-score.json",
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      environment,
      summary: {
        verifiedScore: totalScore,
        failedPoints: totalFailed,
        unverifiedPoints: totalUnverified,
        totalPossible: 100
      },
      rubricResults
    },
    null,
    2
  )
);
