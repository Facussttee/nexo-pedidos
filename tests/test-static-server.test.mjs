/**
 * NEXO PEDIDOS — TEST SUITE: STATIC SERVER & PUBLIC ROOT CONFINEMENT (NP-003)
 *
 * Pruebas empíricas HTTP reales con módulos core de Node.js (sin levantar bot,
 * Baileys ni Supabase):
 * 1. Contrato de importación y factory `createStaticServer({ publicRoot })`
 *    sin efectos colaterales ni listen automático y rechazo de raíz Git.
 * 2. Construcción de `<sourceRoot>/dist/public` por allowlist (`scripts/build-public.mjs`)
 *    y regresiones con marcadores intactos ante `outDir` fuente/ancestro/arbitrario
 *    y padres `junction` en entrada (`css`/`js`) o salida (`dist`/`dist/public`).
 * 3. Respuestas GET/HEAD con MIME correcto y reproducción de la demo NP-002.
 * 4. Rechazo de métodos distintos de GET/HEAD (405).
 * 5. Confinamiento adversarial con fixtures temporales y marcadores sintéticos:
 *    dotfiles, .env, sesión Baileys, SQL, traversal literal/codificado/doble,
 *    backslashes Windows, colisión de prefijo hermano y junction/symlink externo.
 * 6. URLs malformadas, bytes NUL, rutas inexistentes sin fallback HTML y
 *    supervivencia del servidor tras errores.
 * 7. CLI demo aislado (`bot/serve-demo.js`) en 127.0.0.1, rechazo de `--public-root`
 *    fuera de `<sourceRoot>/dist/public` incluso con `--no-build`, y verificación de `bot/index.js`.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { createStaticServer, isPathInsideRoot, MIME_TYPES } from "../bot/static-server.js";
import { buildPublic, PUBLIC_ALLOWLIST } from "../scripts/build-public.mjs";
import { startDemoServer, parseDemoCliArgs } from "../bot/serve-demo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

let passed = 0;
function pass(label) {
  passed++;
  console.log(`  [PASS] ${label}`);
}

/**
 * Crea un `sourceRoot` sintético temporal con los 4 activos públicos de la allowlist
 * copiados desde REPO_ROOT para ejecutar `buildPublic` de forma aislada sobre `<sourceRoot>/dist/public`.
 */
function createSyntheticSourceRoot(targetSourceRoot) {
  fs.mkdirSync(targetSourceRoot, { recursive: true });
  for (const relPath of PUBLIC_ALLOWLIST) {
    const src = path.join(REPO_ROOT, relPath);
    const dst = path.join(targetSourceRoot, relPath);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
  return targetSourceRoot;
}

/**
 * Realiza una petición HTTP cruda preservando exactamente `rawPath` en la línea
 * de solicitud (sin normalización previa del cliente URL).
 */
function rawHttpRequest({ host = "127.0.0.1", port, method = "GET", rawPath = "/" }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        method,
        path: rawPath,
        headers: { Connection: "close" }
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            bodyBuffer: buffer,
            bodyText: buffer.toString("utf8")
          });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function listenOnEphemeralPort(server, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, () => {
      const addr = server.address();
      resolve(typeof addr === "object" && addr ? addr.port : 0);
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    if (!server || !server.listening) return resolve();
    server.close(() => resolve());
  });
}

function listFilesRecursive(dir, baseDir = dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(full, baseDir));
    } else {
      results.push(path.relative(baseDir, full).replace(/\\/g, "/"));
    }
  }
  return results.sort();
}

console.log("===============================================================");
console.log("   NEXO PEDIDOS — STATIC SERVER & CONFINEMENT SUITE (NP-003)");
console.log("===============================================================\n");

// ===========================================================================
// SUITE 1: CONTRATO DE IMPORTACIÓN Y AISLAMIENTO DE MÓDULOS
// ===========================================================================
console.log("--- SUITE 1: Module Isolation & Factory Contract ---");

{
  const staticServerSource = fs.readFileSync(path.join(REPO_ROOT, "bot", "static-server.js"), "utf8");
  const serveDemoSource = fs.readFileSync(path.join(REPO_ROOT, "bot", "serve-demo.js"), "utf8");
  const buildPublicSource = fs.readFileSync(path.join(REPO_ROOT, "scripts", "build-public.mjs"), "utf8");

  const forbiddenImports = [
    "@whiskeysockets/baileys",
    "@supabase/supabase-js",
    "dotenv",
    "qrcode-terminal",
    "pino"
  ];
  for (const modName of forbiddenImports) {
    assert.ok(!staticServerSource.includes(modName), `bot/static-server.js no debe importar ${modName}`);
    assert.ok(!serveDemoSource.includes(modName), `bot/serve-demo.js no debe importar ${modName}`);
    assert.ok(!buildPublicSource.includes(modName), `scripts/build-public.mjs no debe importar ${modName}`);
  }
  pass("1.1 bot/static-server.js, bot/serve-demo.js y scripts/build-public.mjs usan sólo módulos core sin Baileys/Supabase/dotenv");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nexo-np003-contract-"));
  try {
    const server = createStaticServer({ publicRoot: tempDir });
    assert.ok(server instanceof http.Server, "createStaticServer debe devolver instancia de http.Server");
    assert.equal(server.listening, false, "createStaticServer NO debe ejecutar listen() al construirse");
    pass("1.2 createStaticServer({ publicRoot }) devuelve http.Server sin hacer listen automático");

    assert.throws(() => createStaticServer(), TypeError);
    assert.throws(() => createStaticServer({ publicRoot: "" }), TypeError);
    assert.throws(() => createStaticServer({ publicRoot: "bad\0path" }), TypeError);
    assert.throws(
      () => createStaticServer({ publicRoot: REPO_ROOT }),
      /Refusing to serve repository root/
    );
    pass("1.3 createStaticServer rechaza publicRoot vacíos, con NUL o apuntando a la raíz del repositorio Git");

    // Verificación unitaria directa de isPathInsideRoot frente a prefijo hermano
    const rootA = path.resolve(tempDir, "public");
    const siblingB = path.resolve(tempDir, "public-secret", "file.txt");
    const childA = path.resolve(tempDir, "public", "index.html");
    assert.equal(isPathInsideRoot(rootA, childA), true);
    assert.equal(isPathInsideRoot(rootA, rootA), false);
    assert.equal(isPathInsideRoot(rootA, siblingB), false);
    pass("1.4 isPathInsideRoot bloquea colisión por prefijo hermano (public vs public-secret)");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// ===========================================================================
// SUITE 2: ALLOWLIST PUBLIC BUILD, CONFINAMIENTO DE BUILD Y REPRODUCCIÓN DEMO NP-002
// ===========================================================================
console.log("\n--- SUITE 2: Public Build Allowlist, Build Confinement & NP-002 Demo over HTTP ---");

{
  const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "nexo-np003-build-"));
  const syntheticSource = createSyntheticSourceRoot(path.join(tempWorkspace, "repo"));
  const expectedOutDir = path.join(syntheticSource, "dist", "public");

  try {
    // Sembrar un archivo residual previo dentro de <sourceRoot>/dist/public para comprobar limpieza
    fs.mkdirSync(expectedOutDir, { recursive: true });
    fs.writeFileSync(path.join(expectedOutDir, "stale-secret.txt"), "stale");

    const buildRes = buildPublic({ sourceRoot: syntheticSource });
    const builtFiles = listFilesRecursive(expectedOutDir);
    const expectedFiles = [...PUBLIC_ALLOWLIST].sort();

    assert.equal(buildRes.outDir, fs.realpathSync(expectedOutDir));
    assert.deepEqual(builtFiles, expectedFiles, "dist/public sólo debe contener los archivos de PUBLIC_ALLOWLIST");
    assert.equal(fs.existsSync(path.join(expectedOutDir, "stale-secret.txt")), false, "buildPublic debe limpiar archivos previos en dist/public");
    pass("2.1 buildPublic genera exclusivamente la allowlist en <sourceRoot>/dist/public");

    const server = createStaticServer({ publicRoot: buildRes.outDir });
    const port = await listenOnEphemeralPort(server);

    try {
      // GET / y GET /index.html
      const resRoot = await rawHttpRequest({ port, method: "GET", rawPath: "/" });
      const resIndex = await rawHttpRequest({ port, method: "GET", rawPath: "/index.html" });
      const resQuery = await rawHttpRequest({ port, method: "GET", rawPath: "/?demo=1&tel=1100000001" });

      assert.equal(resRoot.statusCode, 200);
      assert.equal(resRoot.headers["content-type"], MIME_TYPES[".html"]);
      assert.equal(resRoot.headers["x-content-type-options"], "nosniff");
      assert.equal(resIndex.statusCode, 200);
      assert.equal(resRoot.bodyText, resIndex.bodyText);
      assert.equal(resQuery.statusCode, 200);
      assert.equal(resQuery.bodyText, resIndex.bodyText);
      assert.ok(resRoot.bodyText.includes('id="nexo-demo-banner"'));
      pass("2.2 GET /, /index.html y /?demo=1 responden 200 con MIME text/html; charset=utf-8");

      // GET CSS y JS
      const resCss = await rawHttpRequest({ port, method: "GET", rawPath: "/css/style.css" });
      const resCfg = await rawHttpRequest({ port, method: "GET", rawPath: "/js/public-config.js" });
      const resBundle = await rawHttpRequest({ port, method: "GET", rawPath: "/js/bundle.js" });

      assert.equal(resCss.statusCode, 200);
      assert.equal(resCss.headers["content-type"], MIME_TYPES[".css"]);
      assert.ok(resCss.bodyText.includes(".nexo-demo-banner"));

      assert.equal(resCfg.statusCode, 200);
      assert.equal(resCfg.headers["content-type"], MIME_TYPES[".js"]);
      assert.ok(resCfg.bodyText.includes("NEXO_PUBLIC_CONFIG"));

      assert.equal(resBundle.statusCode, 200);
      assert.equal(resBundle.headers["content-type"], MIME_TYPES[".js"]);
      assert.equal(
        resBundle.bodyBuffer.byteLength,
        fs.statSync(path.join(REPO_ROOT, "js", "bundle.js")).size
      );
      pass("2.3 GET /css/style.css, /js/public-config.js y /js/bundle.js responden 200 con MIME correcto y bytes exactos");

      // HEAD para HTML, CSS y JS
      const headHtml = await rawHttpRequest({ port, method: "HEAD", rawPath: "/index.html" });
      const headCss = await rawHttpRequest({ port, method: "HEAD", rawPath: "/css/style.css" });
      const headJs = await rawHttpRequest({ port, method: "HEAD", rawPath: "/js/bundle.js" });

      assert.equal(headHtml.statusCode, 200);
      assert.equal(headHtml.headers["content-type"], MIME_TYPES[".html"]);
      assert.equal(Number(headHtml.headers["content-length"]), resIndex.bodyBuffer.byteLength);
      assert.equal(headHtml.bodyBuffer.byteLength, 0);

      assert.equal(headCss.statusCode, 200);
      assert.equal(headCss.headers["content-type"], MIME_TYPES[".css"]);
      assert.equal(headCss.bodyBuffer.byteLength, 0);

      assert.equal(headJs.statusCode, 200);
      assert.equal(headJs.headers["content-type"], MIME_TYPES[".js"]);
      assert.equal(headJs.bodyBuffer.byteLength, 0);
      pass("2.4 HEAD devuelve código 200, MIME y Content-Length exactos sin cuerpo");

      // Reproducir la demo NP-002 evaluando los activos servidos por HTTP en un sandbox VM
      const makeEl = (id = "") => ({
        id,
        innerHTML: "",
        textContent: "",
        value: "",
        dataset: {},
        style: { setProperty() {} },
        offsetHeight: 32,
        classList: {
          _set: new Set(id === "nexo-demo-banner" || id === "simulator-bar" ? ["hidden"] : []),
          add(...c) { c.forEach((x) => this._set.add(x)); },
          remove(...c) { c.forEach((x) => this._set.delete(x)); },
          toggle(c, force) {
            if (force === undefined) {
              if (this._set.has(c)) this._set.delete(c); else this._set.add(c);
            } else if (force) this._set.add(c); else this._set.delete(c);
          },
          contains(c) { return this._set.has(c); }
        },
        addEventListener() {},
        setAttribute() {},
        removeAttribute() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        appendChild() {},
        focus() {}
      });
      const elements = {
        "app-content": makeEl("app-content"),
        "nexo-top-stack": makeEl("nexo-top-stack"),
        "nexo-demo-banner": makeEl("nexo-demo-banner"),
        "simulator-bar": makeEl("simulator-bar"),
        "btn-lock-pin": makeEl("btn-lock-pin")
      };
      const storageMap = new Map();
      const windowMock = {
        URL,
        URLSearchParams,
        localStorage: {
          getItem(k) { return storageMap.has(k) ? storageMap.get(k) : null; },
          setItem(k, v) { storageMap.set(k, String(v)); },
          removeItem(k) { storageMap.delete(k); }
        },
        location: { search: "?demo=1", hash: "", href: `http://127.0.0.1:${port}/?demo=1` },
        navigator: { vibrate() {}, sendBeacon() { return false; } },
        matchMedia() { return { matches: false, addEventListener() {} }; },
        addEventListener() {},
        scrollTo() {},
        document: {
          readyState: "complete",
          documentElement: makeEl("html"),
          body: makeEl("body"),
          head: makeEl("head"),
          getElementById(id) { return elements[id] || null; },
          querySelector() { return null; },
          querySelectorAll() { return []; },
          addEventListener() {},
          createElement(t) { return { tagName: t.toUpperCase() }; }
        },
        fetch() { throw new Error("fetch should be guarded"); },
        WebSocket: function () {},
        XMLHttpRequest: function () {},
        open() { return null; }
      };
      windowMock.window = windowMock;
      windowMock.globalThis = windowMock;

      const ctx = vm.createContext(windowMock);
      vm.runInContext(resCfg.bodyText, ctx, { filename: "public-config.js" });
      vm.runInContext(resBundle.bodyText, ctx, { filename: "bundle.js" });

      assert.equal(windowMock.NEXO_PUBLIC_CONFIG.mode, "demo");
      assert.equal(elements["nexo-demo-banner"].classList.contains("hidden"), false);
      assert.equal(elements["simulator-bar"].classList.contains("hidden"), false);
      assert.ok(elements["app-content"].innerHTML.includes("Comercio Demo Nexo"));
      assert.ok(elements["app-content"].innerHTML.includes('id="btn-quick-demo-user"'));
      pass("2.5 Los activos servidos desde dist/public reproducen íntegramente la demo aislada NP-002");
    } finally {
      await closeServer(server);
    }

    // 2.6 Regresión: outDir apuntando a sourceRoot, ancestro, <sourceRoot>/dist o directorio arbitrario
    //     falla ANTES de rmSync y conserva todos los marcadores KEEP_* intactos.
    const ancestorMarker = path.join(tempWorkspace, "KEEP_ANCESTOR.txt");
    const sourceMarker = path.join(syntheticSource, "KEEP_SOURCE.txt");
    const distSiblingMarker = path.join(syntheticSource, "dist", "KEEP_DIST_PARENT.txt");
    const arbitraryDir = path.join(tempWorkspace, "arbitrary-target");
    const arbitraryMarker = path.join(arbitraryDir, "KEEP_ARBITRARY.txt");

    fs.mkdirSync(arbitraryDir, { recursive: true });
    fs.writeFileSync(ancestorMarker, "KEEP_ANCESTOR");
    fs.writeFileSync(sourceMarker, "KEEP_SOURCE");
    fs.writeFileSync(distSiblingMarker, "KEEP_DIST_PARENT");
    fs.writeFileSync(arbitraryMarker, "KEEP_ARBITRARY");

    assert.throws(
      () => buildPublic({ sourceRoot: syntheticSource, outDir: syntheticSource }),
      /Refusing outDir/
    );
    assert.throws(
      () => buildPublic({ sourceRoot: syntheticSource, outDir: tempWorkspace }),
      /Refusing outDir/
    );
    assert.throws(
      () => buildPublic({ sourceRoot: syntheticSource, outDir: path.join(syntheticSource, "dist") }),
      /Refusing outDir/
    );
    assert.throws(
      () => buildPublic({ sourceRoot: syntheticSource, outDir: arbitraryDir }),
      /Refusing outDir/
    );
    assert.throws(
      () => buildPublic({ sourceRoot: syntheticSource, outDir: `${syntheticSource}${path.sep}dist${path.sep}..${path.sep}dist${path.sep}public` }),
      /Refusing outDir/
    );

    assert.equal(fs.existsSync(ancestorMarker), true, "El marcador en directorio ancestro debe permanecer intacto");
    assert.equal(fs.existsSync(sourceMarker), true, "El marcador KEEP_SOURCE en sourceRoot debe permanecer intacto");
    assert.equal(fs.existsSync(distSiblingMarker), true, "El marcador en dist/ debe permanecer intacto");
    assert.equal(fs.existsSync(arbitraryMarker), true, "El marcador en directorio arbitrario debe permanecer intacto");
    assert.equal(fs.existsSync(path.join(syntheticSource, "index.html")), true, "index.html en sourceRoot debe permanecer intacto");
    pass("2.6 buildPublic rechaza outDir fuente, ancestro, dist/ o arbitrario sin borrar ningún archivo marcador (KEEP_SOURCE intacto)");

    // 2.7 Regresión: padre de entrada (css/ o js/) reemplazado por junction hacia fuera
    const junctionInputWs = fs.mkdtempSync(path.join(os.tmpdir(), "nexo-np003-in-junc-"));
    try {
      const repoWithBadParent = createSyntheticSourceRoot(path.join(junctionInputWs, "repo"));
      const outsideCssDir = path.join(junctionInputWs, "outside-css");
      fs.mkdirSync(outsideCssDir, { recursive: true });
      fs.writeFileSync(path.join(outsideCssDir, "style.css"), "/* outside secret css */");

      // Reemplazar repo/css por una junction apuntando a outsideCssDir
      fs.rmSync(path.join(repoWithBadParent, "css"), { recursive: true, force: true });
      fs.symlinkSync(outsideCssDir, path.join(repoWithBadParent, "css"), process.platform === "win32" ? "junction" : "dir");

      // Sembrar marcador en repo/dist/public para comprobar que no se toca antes de abortar
      const preExistingOut = path.join(repoWithBadParent, "dist", "public");
      fs.mkdirSync(preExistingOut, { recursive: true });
      const keepOutMarker = path.join(preExistingOut, "KEEP_EXISTING_OUT.txt");
      fs.writeFileSync(keepOutMarker, "KEEP_EXISTING_OUT");

      assert.throws(
        () => buildPublic({ sourceRoot: repoWithBadParent }),
        /Unsafe source parent/
      );
      assert.equal(fs.existsSync(keepOutMarker), true, "No debe ejecutar rmSync en dist/public cuando falla validación de entrada");
      pass("2.7 buildPublic detecta y rechaza padre de entrada (css/ o js/) que sea junction/symlink hacia fuera antes de rmSync");
    } finally {
      fs.rmSync(junctionInputWs, { recursive: true, force: true });
    }

    // 2.8 Regresión: padre de salida (dist o dist/public) reemplazado por junction hacia fuera
    const junctionOutWs = fs.mkdtempSync(path.join(os.tmpdir(), "nexo-np003-out-junc-"));
    try {
      const repoA = createSyntheticSourceRoot(path.join(junctionOutWs, "repo-a"));
      const repoB = createSyntheticSourceRoot(path.join(junctionOutWs, "repo-b"));
      const externalVictim = path.join(junctionOutWs, "external-victim");
      fs.mkdirSync(externalVictim, { recursive: true });
      const victimMarker = path.join(externalVictim, "KEEP_EXTERNAL_VICTIM.txt");
      fs.writeFileSync(victimMarker, "KEEP_EXTERNAL_VICTIM");

      // Caso A: <sourceRoot>/dist es una junction apuntando a externalVictim
      fs.symlinkSync(externalVictim, path.join(repoA, "dist"), process.platform === "win32" ? "junction" : "dir");
      assert.throws(
        () => buildPublic({ sourceRoot: repoA }),
        /Unsafe output parent/
      );
      assert.equal(fs.existsSync(victimMarker), true, "KEEP_EXTERNAL_VICTIM debe permanecer intacto cuando dist es junction");

      // Caso B: <sourceRoot>/dist/public es una junction apuntando a externalVictim
      fs.mkdirSync(path.join(repoB, "dist"), { recursive: true });
      fs.symlinkSync(externalVictim, path.join(repoB, "dist", "public"), process.platform === "win32" ? "junction" : "dir");
      assert.throws(
        () => buildPublic({ sourceRoot: repoB }),
        /Unsafe output directory/
      );
      assert.equal(fs.existsSync(victimMarker), true, "KEEP_EXTERNAL_VICTIM debe permanecer intacto cuando dist/public es junction");

      // Caso C: <sourceRoot>/dist/public/css es una junction anidada apuntando a externalVictim
      const repoC = createSyntheticSourceRoot(path.join(junctionOutWs, "repo-c"));
      fs.mkdirSync(path.join(repoC, "dist", "public"), { recursive: true });
      fs.symlinkSync(externalVictim, path.join(repoC, "dist", "public", "css"), process.platform === "win32" ? "junction" : "dir");
      assert.throws(
        () => buildPublic({ sourceRoot: repoC }),
        /Unsafe symlink\/junction found inside output tree/
      );
      assert.equal(fs.existsSync(victimMarker), true, "KEEP_EXTERNAL_VICTIM debe permanecer intacto cuando dist/public/css es junction");
      pass("2.8 buildPublic detecta y rechaza padres/subdirectorios de salida (dist, dist/public, dist/public/css) que sean junction/symlink sin borrar el destino externo");
    } finally {
      fs.rmSync(junctionOutWs, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(tempWorkspace, { recursive: true, force: true });
  }
}

// ===========================================================================
// SUITE 3: CONFINAMIENTO ADVERSARIAL (TRAVERSAL, DOTFILES, PREFIJO HERMANO, JUNCTION)
// ===========================================================================
console.log("\n--- SUITE 3: Adversarial Confinement, Dotfiles, Sibling Prefix & Junctions ---");

{
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nexo-np003-adv-"));
  const syntheticSource = createSyntheticSourceRoot(path.join(fixtureRoot, "repo"));
  const publicRoot = path.join(syntheticSource, "dist", "public");
  const siblingPrefixDir = path.join(syntheticSource, "dist", "public-private");
  const outsideSecretDir = path.join(fixtureRoot, "outside-vault");

  // Marcador sintético en memoria para verificar que ningún byte privado se filtre jamás
  const SECRET_MARKER = ["NEXO", "SYNTHETIC", "PRIVATE", "MARKER", "998877"].join("_");

  try {
    // 1. Construir raíz pública legítima en <syntheticSource>/dist/public
    buildPublic({ sourceRoot: syntheticSource });

    // 2. Crear archivos privados FUERA de publicRoot con el marcador sintético
    fs.mkdirSync(siblingPrefixDir, { recursive: true });
    fs.mkdirSync(outsideSecretDir, { recursive: true });
    fs.mkdirSync(path.join(syntheticSource, ".git"), { recursive: true });
    fs.mkdirSync(path.join(syntheticSource, "bot", "auth_info_baileys"), { recursive: true });
    fs.mkdirSync(path.join(syntheticSource, "supabase"), { recursive: true });
    fs.mkdirSync(path.join(syntheticSource, "coordination"), { recursive: true });

    fs.writeFileSync(path.join(syntheticSource, ".env"), `TOKEN=${SECRET_MARKER}\n`);
    fs.writeFileSync(path.join(syntheticSource, "dist", ".env"), `DIST_TOKEN=${SECRET_MARKER}\n`);
    fs.writeFileSync(path.join(syntheticSource, ".cooldowns.json"), `{"secret":"${SECRET_MARKER}"}`);
    fs.writeFileSync(path.join(syntheticSource, ".git", "config"), `[core]\nmarker = ${SECRET_MARKER}\n`);
    fs.writeFileSync(path.join(syntheticSource, "bot", ".env"), `BOT_SECRET=${SECRET_MARKER}\n`);
    fs.writeFileSync(path.join(syntheticSource, "bot", ".cooldowns.json"), `{"bot":"${SECRET_MARKER}"}`);
    fs.writeFileSync(path.join(syntheticSource, "bot", "auth_info_baileys", "creds.json"), `{"me":"${SECRET_MARKER}"}`);
    fs.writeFileSync(path.join(syntheticSource, "supabase", "schema.sql"), `-- ${SECRET_MARKER}`);
    fs.writeFileSync(path.join(syntheticSource, "coordination", "secret.md"), SECRET_MARKER);
    fs.writeFileSync(path.join(siblingPrefixDir, "leak.txt"), SECRET_MARKER);
    fs.writeFileSync(path.join(outsideSecretDir, "vault.txt"), SECRET_MARKER);
    fs.writeFileSync(path.join(outsideSecretDir, "index.html"), `<html>${SECRET_MARKER}</html>`);

    // 3. Sembrar también dotfiles, SQL, sesión y junction DENTRO de publicRoot
    //    para comprobar defensa en profundidad del servidor aunque el directorio fuera contaminado
    fs.mkdirSync(path.join(publicRoot, ".git"), { recursive: true });
    fs.mkdirSync(path.join(publicRoot, "auth_info_baileys"), { recursive: true });
    fs.writeFileSync(path.join(publicRoot, ".env"), SECRET_MARKER);
    fs.writeFileSync(path.join(publicRoot, ".cooldowns.json"), SECRET_MARKER);
    fs.writeFileSync(path.join(publicRoot, ".git", "HEAD"), SECRET_MARKER);
    fs.writeFileSync(path.join(publicRoot, "css", ".hidden.css"), SECRET_MARKER);
    fs.writeFileSync(path.join(publicRoot, "dump.sql"), SECRET_MARKER);
    fs.writeFileSync(path.join(publicRoot, "auth_info_baileys", "creds.json"), SECRET_MARKER);

    // Crear junction de directorio hacia outsideSecretDir dentro de publicRoot
    const junctionPath = path.join(publicRoot, "linked-outside");
    let junctionCreated = false;
    try {
      fs.symlinkSync(outsideSecretDir, junctionPath, process.platform === "win32" ? "junction" : "dir");
      junctionCreated = true;
    } catch {
      junctionCreated = false;
    }

    // Intentar crear symlink de archivo si el SO lo permite sin privilegios elevados
    const fileSymlinkPath = path.join(publicRoot, "linked-env.txt");
    let fileSymlinkCreated = false;
    try {
      fs.symlinkSync(path.join(syntheticSource, ".env"), fileSymlinkPath, "file");
      fileSymlinkCreated = true;
    } catch {
      fileSymlinkCreated = false;
    }

    const server = createStaticServer({ publicRoot });
    const port = await listenOnEphemeralPort(server);

    try {
      const assertBlocked = async (rawPath, expectedStatuses = [403, 404]) => {
        const res = await rawHttpRequest({ port, method: "GET", rawPath });
        assert.ok(
          expectedStatuses.includes(res.statusCode),
          `Ruta ${rawPath} esperaba ${expectedStatuses.join("/")} pero devolvió ${res.statusCode}`
        );
        assert.equal(
          res.bodyText.includes(SECRET_MARKER),
          false,
          `Ruta ${rawPath} NUNCA debe devolver bytes privados`
        );
        assert.equal(
          res.bodyText.includes("<!DOCTYPE html>"),
          false,
          `Ruta ${rawPath} NUNCA debe hacer fallback a index.html`
        );
        // Probar también con HEAD
        const headRes = await rawHttpRequest({ port, method: "HEAD", rawPath });
        assert.equal(headRes.statusCode, res.statusCode);
        assert.equal(headRes.bodyBuffer.byteLength, 0);
      };

      // 3.1 Dotfiles en raíz y subdirectorios (literales, codificados y con punto final NTFS)
      const dotfileVectors = [
        "/.env",
        "/.env.",
        "/.cooldowns.json",
        "/.git",
        "/.git/",
        "/.git/config",
        "/.git/HEAD",
        "/css/.hidden.css",
        "/%2eenv",
        "/%2ecooldowns.json",
        "/%2egit/HEAD",
        "/css/%2ehidden.css",
        "/.env?demo=1",
        "/.git/HEAD#client"
      ];
      for (const vec of dotfileVectors) {
        await assertBlocked(vec, [403]);
      }
      pass("3.1 Dotfiles (.env, .git, .cooldowns.json, sub/.hidden) bloqueados con 403 y 0 bytes privados");

      // 3.2 Rutas de sesión Baileys, SQL, bot y coordinación
      const privateAssetVectors = [
        "/dump.sql",
        "/supabase/schema.sql",
        "/auth_info_baileys/creds.json",
        "/bot/.env",
        "/bot/.cooldowns.json",
        "/bot/index.js",
        "/coordination/secret.md",
        "/node_modules/pkg/index.js"
      ];
      for (const vec of privateAssetVectors) {
        await assertBlocked(vec, [403]);
      }
      pass("3.2 Archivos SQL, sesiones auth_info_baileys, bot y coordinación bloqueados con 403");

      // 3.3 Traversal literal, codificado, doble codificado y prefijo hermano
      const traversalVectors = [
        "/..",
        "/../",
        "/../.env",
        "/../../.env",
        "/css/../../.env",
        "/js/../../../bot/.env",
        "/../public/index.html",
        "/../public-private/leak.txt",
        "/../../../outside-vault/vault.txt",
        "/css/../../../../outside-vault/vault.txt",
        "/%2e%2e/.env",
        "/%2e%2e/%2e%2e/.env",
        "/..%2f.env",
        "/%2e%2e%2f.env",
        "/%2e%2e/public-private/leak.txt",
        "/%2e%2e/%2e%2e/%2e%2e/outside-vault/vault.txt",
        "/css/%2e%2e/%2e%2e/%2e%2e/%2e%2e/outside-vault/vault.txt",
        "/%252e%252e/.env",
        "/%252e%252e%252f.env",
        "/..%252f.env",
        "/..%255c.env",
        "/%252eenv"
      ];
      for (const vec of traversalVectors) {
        await assertBlocked(vec, [403]);
      }
      pass("3.3 Traversal literal, URL-encoded, doble decoding y prefijo hermano (public-private) bloqueados con 403");

      // 3.4 Backslashes de Windows y dos puntos (unidades / NTFS ADS / dispositivos)
      const windowsVectors = [
        "/\\..\\.env",
        "/css\\..\\..\\.env",
        "/..\\.env",
        "/%5c..%5c.env",
        "/..%5c.env",
        "/%2e%2e%5c.env",
        "/css%5cstyle.css",
        "/\\index.html",
        "/C:/Windows/win.ini",
        "/c%3a/Windows/win.ini",
        "/index.html::$DATA",
        "/CON",
        "/NUL.txt",
        "/AUX.js"
      ];
      for (const vec of windowsVectors) {
        await assertBlocked(vec, [403]);
      }
      pass("3.4 Backslashes de Windows (literales y %5c), dispositivos reservados y ':' bloqueados con 403");

      // 3.5 Junction y symlink apuntando fuera de publicRoot
      assert.equal(junctionCreated, true, "Debe haberse creado la junction de prueba hacia el directorio externo");
      await assertBlocked("/linked-outside", [403]);
      await assertBlocked("/linked-outside/", [403, 404]);
      await assertBlocked("/linked-outside/vault.txt", [403]);
      await assertBlocked("/linked-outside/index.html", [403]);
      await assertBlocked("/linked-outside/nonexistent.txt", [403]);

      if (fileSymlinkCreated) {
        await assertBlocked("/linked-env.txt", [403]);
      }
      pass("3.5 Junction/symlink hacia directorio externo fuera de publicRoot bloqueado con 403 por realpath + path.relative");
    } finally {
      await closeServer(server);
    }
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

// ===========================================================================
// SUITE 4: URLS MALFORMADAS, NUL, MÉTODOS NO PERMITIDOS, 404 SIN FALLBACK Y SUPERVIVENCIA
// ===========================================================================
console.log("\n--- SUITE 4: Malformed URLs, NUL Bytes, 405 Methods, 404 No-Fallback & Survival ---");

{
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nexo-np003-malformed-"));
  const syntheticSource = createSyntheticSourceRoot(path.join(tempRoot, "repo"));
  try {
    const { outDir: pubDir } = buildPublic({ sourceRoot: syntheticSource });
    const server = createStaticServer({ publicRoot: pubDir });
    const port = await listenOnEphemeralPort(server);

    try {
      // 4.1 URLs malformadas, secuencias % inválidas y bytes NUL -> 400 Bad Request
      const malformedVectors = [
        "/%",
        "/%2",
        "/%G0",
        "/%ZZ",
        "/%E0%A4%A",
        "/%c0%af",
        "/%c1%9c",
        "/index.html%00",
        "/index.html%00.jpg",
        "/%00/.env",
        "/?q=%00",
        "//evil.example.com/index.html"
      ];
      for (const vec of malformedVectors) {
        const res = await rawHttpRequest({ port, method: "GET", rawPath: vec });
        assert.equal(res.statusCode, 400, `Vector malformado ${vec} debe devolver 400 pero devolvió ${res.statusCode}`);
        assert.equal(res.bodyText.includes("<!DOCTYPE html>"), false);
      }
      pass("4.1 Escapes malformados, UTF-8 inválido, bytes %00 y rutas '//' devuelven 400 Bad Request");

      // 4.2 Rutas públicas inexistentes y directorios -> 404 Not Found sin fallback a index.html
      const notFoundVectors = [
        "/no-existe.html",
        "/js/store.js",
        "/js/app.js",
        "/js/config.js",
        "/css",
        "/css/",
        "/js",
        "/js/",
        "/css//style.css",
        "/ruta/inventada/123"
      ];
      for (const vec of notFoundVectors) {
        const res = await rawHttpRequest({ port, method: "GET", rawPath: vec });
        assert.equal(res.statusCode, 404, `Ruta inexistente ${vec} debe devolver 404 pero devolvió ${res.statusCode}`);
        assert.ok(res.headers["content-type"].startsWith("text/plain"));
        assert.equal(res.bodyText.includes("<!DOCTYPE html>"), false, `Ruta ${vec} no debe hacer fallback a index.html`);
      }
      pass("4.2 Archivos no incluidos en allowlist (ej. /js/store.js) y rutas inexistentes devuelven 404 texto plano sin fallback HTML");

      // 4.3 Métodos distintos de GET/HEAD -> 405 Method Not Allowed
      for (const method of ["POST", "PUT", "DELETE", "PATCH", "OPTIONS"]) {
        const res = await rawHttpRequest({ port, method, rawPath: "/index.html" });
        assert.equal(res.statusCode, 405, `Método ${method} debe devolver 405`);
        assert.equal(res.headers["allow"], "GET, HEAD");
      }
      pass("4.3 Métodos POST, PUT, DELETE, PATCH y OPTIONS rechazados con 405 Method Not Allowed");

      // 4.4 Supervivencia del servidor tras ráfaga de errores 400/403/404/405
      const okHtml = await rawHttpRequest({ port, method: "GET", rawPath: "/index.html" });
      const okCss = await rawHttpRequest({ port, method: "GET", rawPath: "/css/style.css" });
      const okJs = await rawHttpRequest({ port, method: "GET", rawPath: "/js/bundle.js" });

      assert.equal(okHtml.statusCode, 200);
      assert.ok(okHtml.bodyText.includes("<title>Nexo Pedidos</title>"));
      assert.equal(okCss.statusCode, 200);
      assert.equal(okJs.statusCode, 200);
      pass("4.4 El servidor sigue atendiendo peticiones legítimas 200 OK después de todos los errores 4xx");
    } finally {
      await closeServer(server);
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

// ===========================================================================
// SUITE 5: CLI DEMO AISLADO (bot/serve-demo.js) Y WORKER (bot/index.js)
// ===========================================================================
console.log("\n--- SUITE 5: Isolated Demo CLI & Worker Root Verification ---");

{
  const parsedDefaults = parseDemoCliArgs([], {});
  assert.equal(parsedDefaults.host, "127.0.0.1");
  assert.equal(parsedDefaults.port, 3000);
  assert.equal(parsedDefaults.build, true);

  const parsedCustom = parseDemoCliArgs(["--port", "4123", "--host", "127.0.0.1", "--no-build"], {});
  assert.equal(parsedCustom.host, "127.0.0.1");
  assert.equal(parsedCustom.port, 4123);
  assert.equal(parsedCustom.build, false);

  // Rechazar --public-root fuera de <sourceRoot>/dist/public incluso con --no-build
  assert.throws(
    () => parseDemoCliArgs(["--public-root", REPO_ROOT], {}),
    /Refusing outDir/
  );
  assert.throws(
    () => parseDemoCliArgs(["--no-build", "--public-root", REPO_ROOT], {}),
    /Refusing outDir/
  );
  assert.throws(
    () => parseDemoCliArgs(["--no-build", "--public-root", path.resolve(REPO_ROOT, "..")], {}),
    /Refusing outDir/
  );
  pass("5.1 bot/serve-demo.js usa 127.0.0.1:3000 por defecto y rechaza --public-root fuera de dist/public incluso con --no-build");

  const tempCliDir = fs.mkdtempSync(path.join(os.tmpdir(), "nexo-np003-cli-"));
  const syntheticSource = createSyntheticSourceRoot(path.join(tempCliDir, "repo"));
  const tempPublic = path.join(syntheticSource, "dist", "public");
  try {
    // Verificar que startDemoServer rechaza publicRoot inválido incluso con build: false
    assert.throws(
      () =>
        startDemoServer({
          host: "127.0.0.1",
          port: 0,
          sourceRoot: syntheticSource,
          publicRoot: syntheticSource,
          build: false
        }),
      /Refusing outDir/
    );
    assert.throws(
      () =>
        startDemoServer({
          host: "127.0.0.1",
          port: 0,
          sourceRoot: syntheticSource,
          publicRoot: tempCliDir,
          build: false
        }),
      /Refusing outDir/
    );

    const running = await startDemoServer({
      host: "127.0.0.1",
      port: 0,
      sourceRoot: syntheticSource,
      publicRoot: tempPublic,
      build: true
    });
    try {
      assert.equal(running.host, "127.0.0.1");
      assert.ok(running.port > 0);
      const res = await rawHttpRequest({ host: "127.0.0.1", port: running.port, method: "GET", rawPath: "/?demo=1" });
      assert.equal(res.statusCode, 200);
      assert.ok(res.bodyText.includes("Nexo Pedidos"));

      const blocked = await rawHttpRequest({ host: "127.0.0.1", port: running.port, method: "GET", rawPath: "/../.env" });
      assert.equal(blocked.statusCode, 403);
      pass("5.2 startDemoServer construye <sourceRoot>/dist/public, escucha en 127.0.0.1 y rechaza destinos arbitrarios con o sin build");
    } finally {
      await closeServer(running.server);
    }
  } finally {
    fs.rmSync(tempCliDir, { recursive: true, force: true });
  }

  // Verificar que bot/index.js usa createStaticServer y DEFAULT_PUBLIC_ROOT en vez de la raíz del repositorio
  const botIndexCode = fs.readFileSync(path.join(REPO_ROOT, "bot", "index.js"), "utf8");
  assert.ok(botIndexCode.includes('from "./static-server.js"'), "bot/index.js debe importar createStaticServer");
  assert.ok(botIndexCode.includes('from "../scripts/build-public.mjs"'), "bot/index.js debe importar buildPublic");
  assert.ok(!botIndexCode.includes('path.resolve(__dirname, "..")'), "bot/index.js NUNCA debe usar la raíz del repo como rootDir web");
  assert.ok(!botIndexCode.includes("safePath.startsWith(rootDir)"), "bot/index.js no debe tener el chequeo inseguro startsWith");
  pass("5.3 bot/index.js delega el servidor web a createStaticServer con dist/public y elimina la raíz del repositorio");
}

console.log("\n===============================================================");
console.log(`   ALL STATIC SERVER TESTS PASSED: ${passed} / ${passed}`);
console.log("===============================================================");
