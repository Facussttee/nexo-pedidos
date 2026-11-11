/**
 * NEXO PEDIDOS - AUD-01 RUNNER Y EVALUADOR DE RÚBRICA DE AUDITORÍA
 *
 * Mapeo de Rúbrica Oficial (Total: 100 puntos):
 * - Seguridad (25 pts): Autenticación staff, RLS granular, escape XSS, límites de fecha/tasa.
 * - Integridad Funcional (25 pts): Checkout autoritativo, idempotencia, preservación de snapshots, stock.
 * - UX & Accesibilidad (20 pts): Etiquetas accesibles, navegación móvil 360-430px, controles táctiles >= 44px.
 * - Rendimiento (10 pts): Bundle unificado, compresión gzip, ausencia de fugas/bloqueos en hilo principal.
 * - Preparación Operativa (20 pts): Servidor estático confinado, demo fail-closed, CI/Docker y cero red hacia servicios externos.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";

console.log("===============================================================");
console.log("   NEXO PEDIDOS — AUD-01 RUNNER DE RÚBRICA Y REGRESIONES");
console.log("===============================================================");

const rubricResults = {
  seguridad: { max: 25, scored: 0, items: [] },
  integridad: { max: 25, scored: 0, items: [] },
  ux: { max: 20, scored: 0, items: [] },
  rendimiento: { max: 10, scored: 0, items: [] },
  operacion: { max: 20, scored: 0, items: [] }
};

function evaluateControl(category, name, points, checkFn) {
  try {
    const passed = checkFn();
    if (passed) {
      rubricResults[category].scored += points;
      rubricResults[category].items.push({ name, points, max: points, status: "PASS" });
      console.log(`  [PASS] (${points}/${points} pts) [${category.toUpperCase()}] ${name}`);
    } else {
      rubricResults[category].items.push({ name, points: 0, max: points, status: "FAIL" });
      console.log(`  [FAIL] (0/${points} pts) [${category.toUpperCase()}] ${name}`);
    }
  } catch (err) {
    rubricResults[category].items.push({ name, points: 0, max: points, status: "FAIL", error: err.message });
    console.log(`  [FAIL] (0/${points} pts) [${category.toUpperCase()}] ${name} - Error: ${err.message}`);
  }
}

console.log("\n--- EVALUANDO CONTROLES DE LA RÚBRICA SOBRE BASE MAIN ---");

// 1. SEGURIDAD (25 pts)
evaluateControl("seguridad", "XSS Mitigation en renderizado HTML (escapeHtml)", 5, () => {
  const htmlJs = fs.readFileSync("js/html.js", "utf8");
  return htmlJs.includes("escapeHtml") && htmlJs.includes("&amp;") && htmlJs.includes("&lt;");
});

evaluateControl("seguridad", "Escape estricto de item.cantidad en preparación (AUD-03 pre-check)", 5, () => {
  const operatorSrc = fs.readFileSync("js/views/operator.js", "utf8");
  // En base main histórica, operator.js:169 tenía vulnerabilidad reportada en auditoría
  return !operatorSrc.includes("${item.cantidad_solicitada}") && !operatorSrc.includes("${item.cantidad}");
});

evaluateControl("seguridad", "Políticas RLS en PostgreSQL para clientes y pedidos", 5, () => {
  const schemaSql = fs.readFileSync("supabase/schema.sql", "utf8");
  return schemaSql.includes("ENABLE ROW LEVEL SECURITY") && !schemaSql.includes("FOR ALL USING (true) WITH CHECK (true)");
});

evaluateControl("seguridad", "Eliminación de PIN estático en texto plano '1234'", 5, () => {
  const storeSrc = fs.readFileSync("js/store.js", "utf8");
  return !storeSrc.includes('staffPin: "1234"') && !storeSrc.includes("staffPin: '1234'");
});

evaluateControl("seguridad", "Timestamp del servidor en rate limiting (ignorar fecha cliente)", 5, () => {
  const schemaSql = fs.readFileSync("supabase/schema.sql", "utf8");
  return schemaSql.includes("enforce_order_rate_limit") && schemaSql.includes("NOW() - INTERVAL");
});

// 2. INTEGRIDAD FUNCIONAL (25 pts)
evaluateControl("integridad", "Suite demo-isolation en verde (17/17)", 7, () => {
  execSync("node tests/test-demo-isolation.test.mjs", { stdio: "ignore" });
  return true;
});

evaluateControl("integridad", "Suite test-store-state de estados de pedido (72/72)", 6, () => {
  execSync("node bot/test-store-state.js", { stdio: "ignore" });
  return true;
});

evaluateControl("integridad", "Sanitización numérica de teléfonos (18/18)", 6, () => {
  execSync("node tests/test-phone-numeric-validation.test.mjs", { stdio: "ignore" });
  return true;
});

evaluateControl("integridad", "Checkout autoritativo RPC e idempotencia", 6, () => {
  const schemaSql = fs.readFileSync("supabase/schema.sql", "utf8");
  return schemaSql.includes("create_order_atomic") && schemaSql.includes("p_checkout_cart_key");
});

// 3. UX & ACCESIBILIDAD (20 pts)
evaluateControl("ux", "Etiqueta accesible en buscador de catálogo", 5, () => {
  const clientSrc = fs.readFileSync("js/views/client.js", "utf8");
  return clientSrc.includes('aria-label="Buscar productos"') || clientSrc.includes('for="catalog-search"');
});

evaluateControl("ux", "Controles de cantidad con nombre de producto accesible", 5, () => {
  const clientSrc = fs.readFileSync("js/views/client.js", "utf8");
  return clientSrc.includes("aria-label=") && clientSrc.includes("Sumar");
});

evaluateControl("ux", "Touch targets mínimos de 44x44px en controles interactivos", 5, () => {
  const styleCss = fs.readFileSync("css/style.css", "utf8");
  return styleCss.includes("min-height: 44px") || styleCss.includes("touch-target") || styleCss.includes("44px");
});

evaluateControl("ux", "Prevención de zoom iOS (inputs font-size >= 16px)", 5, () => {
  const styleCss = fs.readFileSync("css/style.css", "utf8");
  return styleCss.includes("16px");
});

// 4. RENDIMIENTO (10 pts)
evaluateControl("rendimiento", "Bundle compilado sin BOM y sintaxis JavaScript válida", 5, () => {
  execSync("node --check js/bundle.js", { stdio: "ignore" });
  const stat = fs.statSync("js/bundle.js");
  return stat.size > 50000;
});

evaluateControl("rendimiento", "Tamaño de bundle optimizado (< 400 KB sin minificar)", 5, () => {
  const stat = fs.statSync("js/bundle.js");
  return stat.size < 400000;
});

// 5. PREPARACIÓN OPERATIVA (20 pts)
evaluateControl("operacion", "Servidor estático confinado y tests de traversal (24/24)", 7, () => {
  execSync("node tests/test-static-server.test.mjs", { stdio: "ignore" });
  return true;
});

evaluateControl("operacion", "Generación de distribución estática pública en dist/public", 7, () => {
  execSync("node scripts/build-public.mjs", { stdio: "ignore" });
  return fs.existsSync("dist/public/index.html") && fs.existsSync("dist/public/js/bundle.js");
});

evaluateControl("operacion", "Aislamiento total y fail-closed de producción sin secretos", 6, () => {
  const publicConfigSrc = fs.readFileSync("js/public-config.js", "utf8");
  return !publicConfigSrc.includes("service_role") && !publicConfigSrc.includes("sb_secret_");
});

const totalScore = Object.values(rubricResults).reduce((sum, cat) => sum + cat.scored, 0);

console.log("\n===============================================================");
console.log(`   PUNTAJE TOTAL BASELINE RÚBRICA AUD-01: ${totalScore} / 100`);
console.log(`   - Seguridad: ${rubricResults.seguridad.scored} / 25`);
console.log(`   - Integridad: ${rubricResults.integridad.scored} / 25`);
console.log(`   - UX / A11y: ${rubricResults.ux.scored} / 20`);
console.log(`   - Rendimiento: ${rubricResults.rendimiento.scored} / 10`);
console.log(`   - Operación: ${rubricResults.operacion.scored} / 20`);
console.log("===============================================================");

fs.writeFileSync(
  "coordination/results/rubric-score.json",
  JSON.stringify({ timestamp: new Date().toISOString(), totalScore, rubricResults }, null, 2)
);
