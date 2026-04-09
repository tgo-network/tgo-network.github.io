import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const port = Number(process.env.DESIGN_DEMOS_PORT ?? 4311);
const rootDir = process.cwd();

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"]
]);

const normalizePathname = (pathname) => {
  const decoded = decodeURIComponent(pathname);
  return decoded.endsWith("/") ? `${decoded}index.html` : decoded;
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    const pathname = normalizePathname(requestUrl.pathname);
    const filePath = path.normalize(path.join(rootDir, pathname));

    if (!filePath.startsWith(rootDir)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    const file = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();

    response.writeHead(200, {
      "Content-Type": mimeTypes.get(extension) ?? "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  const baseUrl = `http://127.0.0.1:${port}/design-demos/`;

  console.log(`Design demos server ready: ${baseUrl}`);
  console.log(`- Atlas Ink: ${baseUrl}atlas-ink/`);
  console.log(`- Summit Signal: ${baseUrl}summit-signal/`);
  console.log(`- Member House: ${baseUrl}member-house/`);
  console.log(`- Pro Community: ${baseUrl}pro-community/`);
});
