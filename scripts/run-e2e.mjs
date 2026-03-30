import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const playwrightCommand = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "playwright.cmd" : "playwright"
);
const playwrightArgs = process.argv.slice(2);

const loadEnvironmentFile = (fileName) => {
  const filePath = path.join(repoRoot, fileName);

  try {
    const raw = readFileSync(filePath, "utf8");

    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");

      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing env files so the fallback defaults still apply.
  }
};

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const waitForPort = (host, port, timeoutMs = 30_000) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const attempt = () => {
      const socket = net.createConnection({ host, port });

      socket.once("connect", () => {
        socket.end();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }

        setTimeout(attempt, 500);
      });
    };

    attempt();
  });

loadEnvironmentFile(".env");
loadEnvironmentFile(".env.example");

run(npmCommand, ["run", "infra:up"]);

const databaseUrl = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/tgo_network";
const parsedUrl = new URL(databaseUrl);

await waitForPort(parsedUrl.hostname, Number(parsedUrl.port || "5432"));

run(npmCommand, ["run", "bootstrap:dev"]);

if (existsSync(playwrightCommand)) {
  run(playwrightCommand, ["test", ...playwrightArgs]);
} else {
  run(npmCommand, ["exec", "playwright", "test", ...playwrightArgs]);
}
