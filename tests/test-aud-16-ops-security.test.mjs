import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(".");

function requestLocal(urlPath, { port, headers = {} }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path: urlPath, method: "GET", headers },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

test("AUD-16 — Dependency Lockfile, Security Headers, Public Root Confinement & CI Integration", async (t) => {
  await t.test("1. bot/package-lock.json matches bot/package.json without git/local tarball risks", () => {
    const pkgPath = path.join(root, "bot/package.json");
    const lockPath = path.join(root, "bot/package-lock.json");
    assert.equal(fs.existsSync(pkgPath), true, "bot/package.json must exist");
    assert.equal(fs.existsSync(lockPath), true, "bot/package-lock.json must exist");

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    assert.ok(lock.lockfileVersion >= 2);
    const deps = Object.keys(pkg.dependencies || {});
    assert.ok(deps.length > 0);
    for (const dep of deps) {
      const entry = lock.packages?.[`node_modules/${dep}`];
      assert.ok(entry && entry.version, `Missing locked package entry for ${dep}`);
      assert.ok(entry.integrity && /^sha(256|384|512)-/.test(entry.integrity), `Missing SRI integrity for ${dep}`);
    }
  });

  await t.test("2. Static server enforces security headers & strict dist/public allowlist", async () => {
    const { buildPublic } = await import(pathToFileURL(path.join(root, "scripts/build-public.mjs")).href);
    const { createStaticServer } = await import(pathToFileURL(path.join(root, "bot/static-server.js")).href);

    const { outDir: publicRoot } = buildPublic({ sourceRoot: root });
    assert.equal(path.basename(publicRoot), "public");

    // Verify zero sensitive files or directories inside dist/public
    const forbiddenInsidePublic = [
      ".git",
      ".env",
      "supabase",
      "bot",
      "coordination",
      "js/store.js",
      "js/config.js"
    ];
    for (const rel of forbiddenInsidePublic) {
      assert.equal(fs.existsSync(path.join(publicRoot, rel)), false, `Sensitive item ${rel} must NOT exist inside dist/public`);
    }

    const server = createStaticServer({ publicRoot });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;

    try {
      const okRes = await requestLocal("/index.html", { port });
      assert.equal(okRes.status, 200);
      assert.equal(okRes.headers["x-content-type-options"], "nosniff");
      assert.equal(okRes.headers["x-frame-options"], "DENY");
      assert.equal(okRes.headers["referrer-policy"], "strict-origin-when-cross-origin");
      assert.equal(okRes.headers["permissions-policy"], "camera=(), microphone=(), geolocation=()");
      assert.ok(okRes.headers["etag"]);

      const revalRes = await requestLocal("/index.html", { port, headers: { "if-none-match": okRes.headers.etag } });
      assert.equal(revalRes.status, 304);
      assert.equal(revalRes.headers["x-content-type-options"], "nosniff");
      assert.equal(revalRes.headers["x-frame-options"], "DENY");

      const blockedDot = await requestLocal("/.env", { port });
      assert.equal(blockedDot.status, 403);
      assert.equal(blockedDot.headers["x-content-type-options"], "nosniff");
      assert.equal(blockedDot.headers["cache-control"], "no-store");
    } finally {
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
    }
  });

  await t.test("3. vercel.json & Dockerfile deploy hygiene", () => {
    const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
    assert.equal(vercel.outputDirectory, "dist/public");
    assert.equal(vercel.buildCommand, "node scripts/build-public.mjs");
    const hdrMap = Object.fromEntries((vercel.headers?.[0]?.headers || []).map((h) => [h.key, h.value]));
    assert.equal(hdrMap["X-Content-Type-Options"], "nosniff");
    assert.equal(hdrMap["X-Frame-Options"], "DENY");

    const dockerfile = fs.readFileSync(path.join(root, "Dockerfile"), "utf8");
    assert.ok(dockerfile.includes("USER node"), "Dockerfile must run as non-root user");
    assert.ok(dockerfile.includes("node scripts/build-public.mjs"));
    assert.ok(dockerfile.includes("bot/serve-demo.js"));
  });

  await t.test("4. CI workflow covers all local + browser AUD suites without Playwright in validate-local", () => {
    const ciYml = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
    const requiredSuites = [
      "test-aud-02",
      "test-aud-03",
      "test-aud-04-06",
      "test-aud-07-08-09-12",
      "test-aud-08-checkout-ui-retry",
      "test-aud-10-11",
      "test-aud-13",
      "test-aud-14",
      "test-aud-15",
      "test-aud-16",
      "test-demo-isolation",
      "test-static-server",
      "test-xss-rendering",
      "test-navigation-scroll",
      "test-iphone-13-pro-layout"
    ];
    for (const suite of requiredSuites) {
      assert.ok(ciYml.includes(suite), `Missing ${suite} in .github/workflows/ci.yml`);
    }
    const localBlock = ciYml.split("validate-browser:")[0];
    for (const browserSuite of [
      "test-aud-03",
      "test-aud-04-06",
      "test-aud-08-checkout-ui-retry",
      "test-aud-13",
      "test-aud-14",
      "test-aud-15",
      "test-xss-rendering",
      "test-navigation-scroll",
      "test-iphone-13-pro-layout"
    ]) {
      assert.equal(localBlock.includes(browserSuite), false, `Browser suite ${browserSuite} must not run in validate-local`);
    }
    assert.equal(/bot\/index\.js|seed\.js|test-mock\.js|test-order-flow\.js/.test(ciYml), false, "CI must never invoke forbidden scripts");
  });
});
