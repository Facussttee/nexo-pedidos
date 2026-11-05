/**
 * Nexo Pedidos — Public Static Root Builder (Allowlist-only)
 *
 * Construye exclusivamente `<sourceRoot>/dist/public` copiando únicamente la
 * lista blanca explícita de activos públicos necesarios para el navegador.
 * Valida confinamiento canónico (`realpath` + `path.relative`) y ausencia de
 * symlinks/junctions en todos los directorios padres de entrada y salida ANTES
 * de ejecutar cualquier `rmSync`, `mkdirSync` o `copyFileSync`.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_SOURCE_ROOT = path.resolve(__dirname, "..");
export const DEFAULT_PUBLIC_ROOT = path.join(DEFAULT_SOURCE_ROOT, "dist", "public");

export const PUBLIC_ALLOWLIST = Object.freeze([
  "index.html",
  "css/style.css",
  "js/public-config.js",
  "js/bundle.js"
]);

function isPathInsideRoot(rootPath, targetPath) {
  const rel = path.relative(rootPath, targetPath);
  if (!rel || rel === "." || rel === "") {
    return false;
  }
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return false;
  }
  const parts = rel.split(path.sep);
  if (parts.some((p) => p === ".." || p === "." || !p)) {
    return false;
  }
  return true;
}

function validateRelativeAssetPath(relPath) {
  if (typeof relPath !== "string" || !relPath.trim()) {
    throw new TypeError("Relative asset path must be a non-empty string.");
  }
  if (relPath.includes("\0") || relPath.includes("\\") || path.isAbsolute(relPath)) {
    throw new Error(`Invalid allowlist entry "${relPath}".`);
  }
  const segments = relPath.split("/");
  if (segments.some((seg) => !seg || seg === "." || seg === ".." || seg.startsWith("."))) {
    throw new Error(`Unsafe segment in allowlist entry "${relPath}".`);
  }
}

function verifyNoSymlinksInExistingDir(dirRealPath, rootRealPath) {
  const entries = fs.readdirSync(dirRealPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirRealPath, entry.name);
    const lstat = fs.lstatSync(fullPath);
    if (lstat.isSymbolicLink()) {
      throw new Error(`Unsafe symlink/junction found inside output tree: "${fullPath}"`);
    }
    const realEntry = fs.realpathSync(fullPath);
    if (!isPathInsideRoot(rootRealPath, realEntry)) {
      throw new Error(`Entry inside output tree escapes sourceRoot: "${fullPath}"`);
    }
    if (lstat.isDirectory()) {
      verifyNoSymlinksInExistingDir(realEntry, rootRealPath);
    }
  }
}

/**
 * Valida que `sourceRoot` sea un directorio real (no symlink/junction) y que
 * `outDir` apunte exactamente a `<sourceRoot>/dist/public`, sin symlinks ni
 * junctions en `dist` ni en `dist/public`.
 */
export function resolveAndValidateOutputRoot({
  sourceRoot = DEFAULT_SOURCE_ROOT,
  outDir,
  requireExists = false
} = {}) {
  if (typeof sourceRoot !== "string" || !sourceRoot.trim() || sourceRoot.includes("\0")) {
    throw new TypeError("sourceRoot must be a non-empty string.");
  }

  const resolvedSource = path.resolve(sourceRoot);
  let sourceLstat;
  try {
    sourceLstat = fs.lstatSync(resolvedSource);
  } catch {
    throw new Error(`sourceRoot does not exist: "${resolvedSource}"`);
  }
  if (sourceLstat.isSymbolicLink() || !sourceLstat.isDirectory()) {
    throw new Error(`sourceRoot must be a real directory (not a symlink/junction): "${resolvedSource}"`);
  }

  const realSourceRoot = fs.realpathSync(resolvedSource);
  const lexicalExpectedOut = path.resolve(resolvedSource, "dist", "public");
  const canonicalExpectedDist = path.join(realSourceRoot, "dist");
  const canonicalExpectedOut = path.join(realSourceRoot, "dist", "public");

  const targetOut = outDir === undefined ? lexicalExpectedOut : outDir;
  if (typeof targetOut !== "string" || !targetOut.trim() || targetOut.includes("\0")) {
    throw new TypeError("outDir must be a non-empty string.");
  }

  // Rechazar traversal explícito en outDir (ej. dist/../dist/public)
  const rawOutParts = targetOut.split(/[\\/]+/).filter(Boolean);
  if (rawOutParts.includes("..")) {
    throw new Error(`Refusing outDir with traversal segments: "${targetOut}"`);
  }

  const resolvedOut = path.resolve(targetOut);
  const matchesLexical = path.relative(lexicalExpectedOut, resolvedOut) === "";
  const matchesCanonical = path.relative(canonicalExpectedOut, resolvedOut) === "";

  if (!matchesLexical && !matchesCanonical) {
    throw new Error(
      `Refusing outDir "${resolvedOut}": must be exact "<sourceRoot>/dist/public" ("${canonicalExpectedOut}").`
    );
  }

  // Verificar padre <sourceRoot>/dist antes de cualquier operación en disco
  let distLstat = null;
  try {
    distLstat = fs.lstatSync(canonicalExpectedDist);
  } catch (err) {
    if (!err || err.code !== "ENOENT") throw err;
  }

  if (distLstat) {
    if (distLstat.isSymbolicLink() || !distLstat.isDirectory()) {
      throw new Error(
        `Unsafe output parent "${canonicalExpectedDist}": must be a real directory, not a symlink/junction or file.`
      );
    }
    const realDist = fs.realpathSync(canonicalExpectedDist);
    if (
      !isPathInsideRoot(realSourceRoot, realDist) ||
      path.relative(realSourceRoot, realDist) !== "dist"
    ) {
      throw new Error(`Output parent "${canonicalExpectedDist}" escapes sourceRoot via realpath.`);
    }
  } else if (requireExists) {
    throw new Error(`Output parent "${canonicalExpectedDist}" does not exist.`);
  }

  // Verificar <sourceRoot>/dist/public antes de cualquier operación en disco
  let pubLstat = null;
  try {
    pubLstat = fs.lstatSync(canonicalExpectedOut);
  } catch (err) {
    if (!err || err.code !== "ENOENT") throw err;
  }

  if (pubLstat) {
    if (pubLstat.isSymbolicLink() || !pubLstat.isDirectory()) {
      throw new Error(
        `Unsafe output directory "${canonicalExpectedOut}": must be a real directory, not a symlink/junction or file.`
      );
    }
    const realPub = fs.realpathSync(canonicalExpectedOut);
    const expectedRel = path.join("dist", "public");
    if (
      !isPathInsideRoot(realSourceRoot, realPub) ||
      path.relative(realSourceRoot, realPub) !== expectedRel
    ) {
      throw new Error(`Output directory "${canonicalExpectedOut}" escapes sourceRoot via realpath.`);
    }
    verifyNoSymlinksInExistingDir(realPub, realSourceRoot);
  } else if (requireExists) {
    throw new Error(`Public root "${canonicalExpectedOut}" does not exist. Run buildPublic first.`);
  }

  return {
    realSourceRoot,
    canonicalExpectedDist,
    canonicalExpectedOut
  };
}

export function buildPublic({
  sourceRoot = DEFAULT_SOURCE_ROOT,
  outDir,
  allowlist = PUBLIC_ALLOWLIST
} = {}) {
  if (!Array.isArray(allowlist) || allowlist.length === 0) {
    throw new TypeError("allowlist must be a non-empty array.");
  }

  // 1. Validar sourceRoot, outDir exacto (<sourceRoot>/dist/public) y padres de salida sin tocar el disco
  const { realSourceRoot, canonicalExpectedDist, canonicalExpectedOut } =
    resolveAndValidateOutputRoot({ sourceRoot, outDir, requireExists: false });

  // 2. Validar entradas de la allowlist y todos sus directorios padres dentro de realSourceRoot
  const verifiedEntries = [];
  for (const relPath of allowlist) {
    validateRelativeAssetPath(relPath);
    const segments = relPath.split("/");

    let currentDir = realSourceRoot;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      currentDir = path.join(currentDir, seg);
      if (!isPathInsideRoot(realSourceRoot, currentDir)) {
        throw new Error(`Source parent escapes sourceRoot: "${relPath}"`);
      }

      let parentLstat;
      try {
        parentLstat = fs.lstatSync(currentDir);
      } catch {
        throw new Error(`Required source parent directory not found: "${currentDir}"`);
      }
      if (parentLstat.isSymbolicLink() || !parentLstat.isDirectory()) {
        throw new Error(
          `Unsafe source parent "${currentDir}": must be a real directory (not symlink/junction).`
        );
      }

      const realParent = fs.realpathSync(currentDir);
      const expectedParentRel = segments.slice(0, i + 1).join(path.sep);
      if (
        !isPathInsideRoot(realSourceRoot, realParent) ||
        path.relative(realSourceRoot, realParent) !== expectedParentRel
      ) {
        throw new Error(`Source parent "${currentDir}" escapes sourceRoot via realpath.`);
      }
    }

    const srcFile = path.join(currentDir, segments[segments.length - 1]);
    if (!isPathInsideRoot(realSourceRoot, srcFile)) {
      throw new Error(`Source file escapes sourceRoot: "${relPath}"`);
    }

    let fileLstat;
    try {
      fileLstat = fs.lstatSync(srcFile);
    } catch {
      throw new Error(`Required public asset not found: "${srcFile}"`);
    }
    if (fileLstat.isSymbolicLink() || !fileLstat.isFile()) {
      throw new Error(`Public asset must be a regular file (not symlink/junction/dir): "${srcFile}"`);
    }

    const realSrcFile = fs.realpathSync(srcFile);
    const expectedFileRel = segments.join(path.sep);
    if (
      !isPathInsideRoot(realSourceRoot, realSrcFile) ||
      path.relative(realSourceRoot, realSrcFile) !== expectedFileRel
    ) {
      throw new Error(`Public asset "${srcFile}" escapes sourceRoot via realpath.`);
    }

    verifiedEntries.push({ relPath, segments, srcFile: realSrcFile });
  }

  // 3. Limpiar únicamente <realSourceRoot>/dist/public ya verificado y recrearlo
  fs.rmSync(canonicalExpectedOut, { recursive: true, force: true });
  fs.mkdirSync(canonicalExpectedOut, { recursive: true });

  const distAfterLstat = fs.lstatSync(canonicalExpectedDist);
  const outAfterLstat = fs.lstatSync(canonicalExpectedOut);
  if (
    distAfterLstat.isSymbolicLink() ||
    !distAfterLstat.isDirectory() ||
    outAfterLstat.isSymbolicLink() ||
    !outAfterLstat.isDirectory()
  ) {
    throw new Error("Output directory verification failed after mkdir.");
  }
  const realOutDir = fs.realpathSync(canonicalExpectedOut);
  if (
    !isPathInsideRoot(realSourceRoot, realOutDir) ||
    path.relative(realSourceRoot, realOutDir) !== path.join("dist", "public")
  ) {
    throw new Error("Output directory realpath escaped sourceRoot.");
  }

  // 4. Copiar archivos verificados dentro de realOutDir
  const copiedFiles = [];
  for (const { relPath, segments, srcFile } of verifiedEntries) {
    let destCurr = realOutDir;
    for (let i = 0; i < segments.length - 1; i++) {
      destCurr = path.join(destCurr, segments[i]);
      fs.mkdirSync(destCurr, { recursive: true });
      const dirStat = fs.lstatSync(destCurr);
      if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) {
        throw new Error(`Unsafe destination parent directory: "${destCurr}"`);
      }
      const realDestCurr = fs.realpathSync(destCurr);
      if (!isPathInsideRoot(realOutDir, realDestCurr)) {
        throw new Error(`Destination parent directory escaped outDir: "${destCurr}"`);
      }
    }

    const destFile = path.join(destCurr, segments[segments.length - 1]);
    if (!isPathInsideRoot(realOutDir, destFile)) {
      throw new Error(`Destination file escapes outDir: "${relPath}"`);
    }
    fs.copyFileSync(srcFile, destFile);
    copiedFiles.push(relPath);
  }

  return {
    sourceRoot: realSourceRoot,
    outDir: realOutDir,
    files: copiedFiles
  };
}

const isMain =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === __filename;

if (isMain) {
  const result = buildPublic();
  if (process.env.VERCEL) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || new URL(url).protocol !== "https:" || !/^sb_publishable_[\w-]+$/.test(anonKey || "")) {
      throw new Error("Vercel requiere la URL de Supabase y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
    }
    const config = { mode: "production", business: { name: "Nexo Piloto" }, supabase: { url, anonKey } };
    fs.writeFileSync(path.join(result.outDir, "js/public-config.js"),
      `window.NEXO_PUBLIC_CONFIG = ${JSON.stringify(config)};\n`);
  }
  console.log(`[BUILD PUBLIC] Raíz pública generada en: ${result.outDir}`);
  for (const file of result.files) {
    console.log(`  - ${file}`);
  }
}
