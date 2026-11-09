/**
 * Nexo Pedidos — CLI de Servidor Demo Local Aislado
 *
 * Construye `<sourceRoot>/dist/public` mediante allowlist y sirve únicamente
 * esa raíz pública en `127.0.0.1` por defecto. Rechaza cualquier `publicRoot`
 * fuera de `<sourceRoot>/dist/public` incluso cuando se usa `--no-build`.
 * Usa exclusivamente módulos core de Node.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStaticServer } from "./static-server.js";
import {
  buildPublic,
  resolveAndValidateOutputRoot,
  DEFAULT_PUBLIC_ROOT,
  DEFAULT_SOURCE_ROOT
} from "../scripts/build-public.mjs";

const __filename = fileURLToPath(import.meta.url);

export function parseDemoCliArgs(argv = process.argv.slice(2), env = process.env) {
  let host = env.HOST || "127.0.0.1";
  let port = env.PORT !== undefined ? Number(env.PORT) : 3000;
  let build = true;
  let sourceRoot = DEFAULT_SOURCE_ROOT;
  let publicRoot;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--no-build") {
      build = false;
    } else if (arg === "--port" && argv[i + 1]) {
      port = Number(argv[++i]);
    } else if (arg.startsWith("--port=")) {
      port = Number(arg.slice("--port=".length));
    } else if (arg === "--host" && argv[i + 1]) {
      host = argv[++i];
    } else if (arg.startsWith("--host=")) {
      host = arg.slice("--host=".length);
    } else if (arg === "--source-root" && argv[i + 1]) {
      sourceRoot = path.resolve(argv[++i]);
    } else if (arg.startsWith("--source-root=")) {
      sourceRoot = path.resolve(arg.slice("--source-root=".length));
    } else if (arg === "--public-root" && argv[i + 1]) {
      publicRoot = argv[++i];
    } else if (arg.startsWith("--public-root=")) {
      publicRoot = arg.slice("--public-root=".length);
    }
  }

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new RangeError(`Invalid port: ${port}`);
  }

  const expectedDefaultOut = path.resolve(sourceRoot, "dist", "public");
  const effectivePublicRoot = publicRoot !== undefined ? publicRoot : expectedDefaultOut;

  // Validar que publicRoot coincida exactamente con <sourceRoot>/dist/public incluso con --no-build
  const { canonicalExpectedOut } = resolveAndValidateOutputRoot({
    sourceRoot,
    outDir: effectivePublicRoot,
    requireExists: false
  });

  return {
    host,
    port,
    build,
    sourceRoot: path.resolve(sourceRoot),
    publicRoot: canonicalExpectedOut
  };
}

export function startDemoServer({
  host = "127.0.0.1",
  port = 3000,
  publicRoot,
  sourceRoot = DEFAULT_SOURCE_ROOT,
  build = true
} = {}) {
  const { canonicalExpectedOut } = resolveAndValidateOutputRoot({
    sourceRoot,
    outDir: publicRoot,
    requireExists: !build
  });

  if (build) {
    buildPublic({ sourceRoot, outDir: canonicalExpectedOut });
  }

  const server = createStaticServer({ publicRoot: canonicalExpectedOut });

  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.removeListener("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      server.removeListener("error", onError);
      server.on("error", (err) => {
        console.error("[serve-demo] Error en el servidor demo:", err && err.message ? err.message : err);
      });
      const addr = server.address();
      const actualPort = typeof addr === "object" && addr ? addr.port : port;
      resolve({
        server,
        host,
        port: actualPort,
        publicRoot: canonicalExpectedOut,
        url: `http://${host}:${actualPort}`
      });
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

const isMain =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === __filename;

if (isMain) {
  try {
    const options = parseDemoCliArgs();
    startDemoServer(options)
      .then(({ server, url, publicRoot }) => {
        console.log("========================================================");
        console.log("[NEXO PEDIDOS — SERVIDOR DEMO LOCAL AISLADO]");
        console.log(`* Raíz pública confinada: ${publicRoot}`);
        console.log(`* Catálogo cliente (demo): ${url}/`);
        console.log(`* Simulador de vistas:     ${url}/?demo=1`);
        console.log("* Sin servicios externos ni mensajería activa.");
        console.log("========================================================");

        const shutdown = () => {
          server.close(() => process.exit(0));
        };
        process.once("SIGINT", shutdown);
        process.once("SIGTERM", shutdown);
      })
      .catch((err) => {
        console.error("[ERROR] No se pudo iniciar el servidor demo:", err.message);
        process.exit(1);
      });
  } catch (err) {
    console.error("[ERROR] Argumentos de servidor demo inválidos:", err.message);
    process.exit(1);
  }
}
