import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(mkdtempSync(path.join(tmpdir(), "nexo-mobile-layout-")), "report.json");
try {
  execFileSync(process.execPath, [
    path.join(root, "coordination/reviews/mobile-acceptance.cjs"),
    "--root", root, "--out", output, ...process.argv.slice(2),
  ], { cwd: root, stdio: "inherit" });
} catch (error) {
  process.exitCode = error.status || 1;
}
