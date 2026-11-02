/**
 * Nexo Pedidos — Public Static Root Builder (Allowlist-only)
 *
 * Construye `dist/public` copiando únicamente la lista blanca explícita de
 * activos públicos necesarios para el navegador. Nunca copia la raíz del
 * repositorio en forma recursiva ni expone `.env`, sesiones de WhatsApp,
 * archivos SQL, `.git`, scripts del bot ni documentos de coordinación.
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

export function buildPublic({
  sourceRoot = DEFAULT_SOURCE_ROOT,
  outDir = path.join(path.resolve(sourceRoot), "dist", "public"),
  allowlist = PUBLIC_ALLOWLIST
} = {}) {
  const resolvedSource = path.resolve(sourceRoot);
  const resolvedOut = path.resolve(outDir);

  const relOutToSource = path.relative(resolvedSource, resolvedOut);
  if (!relOutToSource || relOutToSource === "." || relOutToSource === "") {
    throw new Error("Refusing to use sourceRoot as outDir.");
  }

  // Verificar que todos los archivos de la allowlist existan y sean archivos regulares
  const verifiedEntries = [];
  for (const relPath of allowlist) {
    validateRelativeAssetPath(relPath);
    const srcFile = path.resolve(resolvedSource, relPath);
    const relCheck = path.relative(resolvedSource, srcFile);
    if (!relCheck || relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
      throw new Error(`Source file escapes sourceRoot: "${relPath}"`);
    }
    if (!fs.existsSync(srcFile)) {
      throw new Error(`Required public asset not found: "${srcFile}"`);
    }
    const stat = fs.lstatSync(srcFile);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`Public asset must be a regular file (not symlink/dir): "${srcFile}"`);
    }
    verifiedEntries.push({ relPath, srcFile });
  }

  // Limpiar y recrear el directorio público de salida
  fs.rmSync(resolvedOut, { recursive: true, force: true });
  fs.mkdirSync(resolvedOut, { recursive: true });

  const copiedFiles = [];
  for (const { relPath, srcFile } of verifiedEntries) {
    const destFile = path.resolve(resolvedOut, relPath);
    const relDest = path.relative(resolvedOut, destFile);
    if (!relDest || relDest.startsWith("..") || path.isAbsolute(relDest)) {
      throw new Error(`Destination file escapes outDir: "${relPath}"`);
    }
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    fs.copyFileSync(srcFile, destFile);
    copiedFiles.push(relPath);
  }

  return {
    sourceRoot: resolvedSource,
    outDir: resolvedOut,
    files: copiedFiles
  };
}

const isMain =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === __filename;

if (isMain) {
  const result = buildPublic();
  console.log(`[BUILD PUBLIC] Raíz pública generada en: ${result.outDir}`);
  for (const file of result.files) {
    console.log(`  - ${file}`);
  }
}
