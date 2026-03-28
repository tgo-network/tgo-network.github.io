import { apiName } from "@tgo/shared";
import { Hono } from "hono";

import { ok } from "../lib/http.js";
import { getRuntimeReadiness, getRuntimeVersion } from "../lib/runtime-status.js";

export const rootRoutes = new Hono();

rootRoutes.get("/", (c) =>
  c.json(
    ok({
      service: apiName,
      status: "ok",
      environment: getRuntimeVersion().environment,
      version: getRuntimeVersion().version
    })
  )
);

rootRoutes.get("/health", (c) =>
  c.json(
    ok({
      service: apiName,
      status: "ok",
      checkedAt: new Date().toISOString()
    })
  )
);

rootRoutes.get("/ready", async (c) => {
  const readiness = await getRuntimeReadiness();

  return c.json(ok(readiness), readiness.ready ? 200 : 503);
});

rootRoutes.get("/version", (c) => c.json(ok(getRuntimeVersion())));
