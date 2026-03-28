import { serve } from "@hono/node-server";

import { app } from "./app.js";
import { getEnv } from "./lib/env.js";
import { logInfo } from "./lib/observability.js";

const port = Number(process.env.PORT ?? 8787);
const env = getEnv();

serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    logInfo("server.started", {
      port: info.port,
      version: env.appVersion ?? "dev",
      gitSha: env.gitSha
    });
  }
);
