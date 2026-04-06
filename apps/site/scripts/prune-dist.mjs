import { access, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const importsDir = path.resolve(scriptDir, "..", "dist", "imports");

try {
  await access(importsDir);
  await rm(importsDir, { recursive: true, force: true });
  console.log(`pruned ${importsDir}`);
} catch {
  // Nothing to prune.
}
