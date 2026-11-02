/**
 * Nexo Pedidos — Servidor HTTP Estático Confinado
 *
 * Módulo puro de Node.js (sin dependencias externas ni efectos colaterales al
 * importar). Sirve exclusivamente archivos públicos dentro de `publicRoot`
 * verificando confinamiento real mediante `path.relative` y `fs.promises.realpath`.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";

export const MIME_TYPES = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp"
});

const FORBIDDEN_SEGMENTS = new Set([
  "auth_info_baileys",
  "node_modules",
  "coordination",
  "supabase",
  "bot"
]);

const FORBIDDEN_EXTENSIONS = new Set([
  ".sql",
  ".env",
  ".pem",
  ".key",
  ".db",
  ".sqlite",
  ".ps1",
  ".sh",
  ".bat",
  ".cmd",
  ".lock"
]);

const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

/**
 * Verifica que `targetPath` esté estrictamente dentro de `rootPath` usando
 * `path.relative` (nunca `startsWith` textual, evitando colisión por prefijo
 * hermano como `public` vs `public-secret`).
 */
export function isPathInsideRoot(rootPath, targetPath) {
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

function sendPlainText(res, method, statusCode, bodyText, extraHeaders = {}) {
  const payload = Buffer.from(bodyText, "utf8");
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": String(payload.byteLength),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  if (method === "HEAD") {
    res.end();
  } else {
    res.end(payload);
  }
}

/**
 * Crea una instancia de `http.Server` confinada a `publicRoot` sin ejecutar
 * `.listen()`.
 *
 * @param {{ publicRoot: string }} options
 * @returns {http.Server}
 */
export function createStaticServer({ publicRoot } = {}) {
  if (typeof publicRoot !== "string" || !publicRoot.trim() || publicRoot.includes("\0")) {
    throw new TypeError("createStaticServer requires a non-empty string { publicRoot }.");
  }

  const resolvedRoot = path.resolve(publicRoot);

  const server = http.createServer(async (req, res) => {
    const method = req.method || "GET";
    try {
      // 1. Sólo se permiten métodos de lectura GET y HEAD
      if (method !== "GET" && method !== "HEAD") {
        return sendPlainText(res, method, 405, "405 Method Not Allowed", {
          Allow: "GET, HEAD"
        });
      }

      // 2. Validación de URL cruda y bloqueo de bytes NUL / caracteres de control
      const rawUrl = req.url;
      if (typeof rawUrl !== "string" || rawUrl.length === 0 || rawUrl.length > 2048) {
        return sendPlainText(res, method, 400, "400 Bad Request");
      }
      if (rawUrl.includes("\0") || /%00/i.test(rawUrl)) {
        return sendPlainText(res, method, 400, "400 Bad Request");
      }

      // Separar query string y fragmento (nunca se usan para resolver archivos)
      const qIndex = rawUrl.indexOf("?");
      const hIndex = rawUrl.indexOf("#");
      let cutIndex = rawUrl.length;
      if (qIndex !== -1 && qIndex < cutIndex) cutIndex = qIndex;
      if (hIndex !== -1 && hIndex < cutIndex) cutIndex = hIndex;
      const rawPathname = rawUrl.slice(0, cutIndex);

      if (!rawPathname.startsWith("/") || rawPathname.startsWith("//")) {
        return sendPlainText(res, method, 400, "400 Bad Request");
      }
      if (/[\x00-\x1f\x7f]/.test(rawPathname)) {
        return sendPlainText(res, method, 400, "400 Bad Request");
      }

      // 3. Rechazar backslashes de Windows y separadores codificados (%2f, %5c) antes de decodificar
      if (rawPathname.includes("\\") || /%(?:2f|5c)/i.test(rawPathname)) {
        return sendPlainText(res, method, 403, "403 Forbidden");
      }

      // Decodificar una sola vez (sin doble decoding para resolver rutas)
      let decodedPath;
      try {
        decodedPath = decodeURIComponent(rawPathname);
      } catch {
        return sendPlainText(res, method, 400, "400 Bad Request");
      }

      if (decodedPath.includes("\0") || /[\x00-\x1f\x7f]/.test(decodedPath)) {
        return sendPlainText(res, method, 400, "400 Bad Request");
      }

      // Rechazar backslashes, dos puntos (unidades/ADS Windows) o doble codificación residual
      if (
        decodedPath.includes("\\") ||
        decodedPath.includes(":") ||
        /%(?:2e|2f|5c|00)/i.test(decodedPath)
      ) {
        return sendPlainText(res, method, 403, "403 Forbidden");
      }

      // 4. Resolución del documento raíz ("/" -> "/index.html") sin fallback HTML
      const effectivePath = decodedPath === "/" ? "/index.html" : decodedPath;
      const rawSegments = effectivePath.slice(1).split("/");

      // Evaluar todos los segmentos no vacíos primero para detectar traversal y dotfiles
      for (const seg of rawSegments) {
        if (!seg) continue;
        if (seg === "." || seg === "..") {
          return sendPlainText(res, method, 403, "403 Forbidden");
        }
        // Bloquear dotfiles/dotdirs en cualquier segmento y trucos NTFS de punto/espacio final
        if (seg.startsWith(".") || seg.endsWith(".") || seg.endsWith(" ")) {
          return sendPlainText(res, method, 403, "403 Forbidden");
        }
        if (FORBIDDEN_SEGMENTS.has(seg.toLowerCase())) {
          return sendPlainText(res, method, 403, "403 Forbidden");
        }
        const baseDeviceName = seg.split(".")[0];
        if (WINDOWS_RESERVED_NAMES.test(baseDeviceName)) {
          return sendPlainText(res, method, 403, "403 Forbidden");
        }
      }

      // Si hay segmentos vacíos (ej. "/css/" o "/css//style.css"), no es un archivo válido
      if (rawSegments.some((seg) => seg.length === 0)) {
        return sendPlainText(res, method, 404, "404 Not Found");
      }

      const lastSegment = rawSegments[rawSegments.length - 1];
      const ext = path.extname(lastSegment).toLowerCase();
      if (FORBIDDEN_EXTENSIONS.has(ext)) {
        return sendPlainText(res, method, 403, "403 Forbidden");
      }

      // 5. Verificación léxica inicial con path.resolve + path.relative
      const candidatePath = path.resolve(resolvedRoot, ...rawSegments);
      if (!isPathInsideRoot(resolvedRoot, candidatePath)) {
        return sendPlainText(res, method, 403, "403 Forbidden");
      }

      // 6. Verificación física canónica con fs.promises.realpath segmento por segmento
      let realRoot;
      try {
        realRoot = await fs.promises.realpath(resolvedRoot);
      } catch (err) {
        if (err && err.code === "ENOENT") {
          return sendPlainText(res, method, 404, "404 Not Found");
        }
        return sendPlainText(res, method, 500, "500 Internal Server Error");
      }

      let currentPath = realRoot;
      for (const seg of rawSegments) {
        currentPath = path.join(currentPath, seg);
        if (!isPathInsideRoot(realRoot, currentPath)) {
          return sendPlainText(res, method, 403, "403 Forbidden");
        }

        let lstat;
        try {
          lstat = await fs.promises.lstat(currentPath);
        } catch (err) {
          if (err && (err.code === "ENOENT" || err.code === "ENOTDIR")) {
            return sendPlainText(res, method, 404, "404 Not Found");
          }
          return sendPlainText(res, method, 403, "403 Forbidden");
        }

        let stepReal;
        try {
          stepReal = await fs.promises.realpath(currentPath);
        } catch {
          return sendPlainText(res, method, 403, "403 Forbidden");
        }

        if (!isPathInsideRoot(realRoot, stepReal)) {
          return sendPlainText(res, method, 403, "403 Forbidden");
        }

        const relParts = path.relative(realRoot, stepReal).split(path.sep);
        if (
          relParts.some(
            (part) =>
              !part ||
              part === "." ||
              part === ".." ||
              part.startsWith(".") ||
              FORBIDDEN_SEGMENTS.has(part.toLowerCase())
          )
        ) {
          return sendPlainText(res, method, 403, "403 Forbidden");
        }

        if (lstat.isSymbolicLink()) {
          currentPath = stepReal;
        }
      }

      const realTarget = await fs.promises.realpath(currentPath);
      if (!isPathInsideRoot(realRoot, realTarget)) {
        return sendPlainText(res, method, 403, "403 Forbidden");
      }

      const finalStat = await fs.promises.stat(realTarget);
      if (!finalStat.isFile()) {
        return sendPlainText(res, method, 404, "404 Not Found");
      }

      const finalExt = path.extname(realTarget).toLowerCase();
      if (FORBIDDEN_EXTENSIONS.has(finalExt)) {
        return sendPlainText(res, method, 403, "403 Forbidden");
      }

      const contentType = MIME_TYPES[finalExt] || "application/octet-stream";
      let content;
      try {
        content = await fs.promises.readFile(realTarget);
      } catch (err) {
        if (err && (err.code === "ENOENT" || err.code === "EISDIR")) {
          return sendPlainText(res, method, 404, "404 Not Found");
        }
        return sendPlainText(res, method, 403, "403 Forbidden");
      }

      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": String(content.byteLength),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache"
      });

      if (method === "HEAD") {
        res.end();
      } else {
        res.end(content);
      }
    } catch {
      if (!res.headersSent) {
        sendPlainText(res, method, 500, "500 Internal Server Error");
      } else {
        res.end();
      }
    }
  });

  return server;
}
