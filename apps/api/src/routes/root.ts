import { apiName } from "@tgo/shared";
import { Hono } from "hono";

import { ok } from "../lib/http.js";

export const rootRoutes = new Hono();

rootRoutes.get("/", (c) =>
  c.json(
    ok({
      service: apiName,
      status: "ok"
    })
  )
);

rootRoutes.get("/health", (c) =>
  c.json(
    ok({
      service: apiName,
      status: "ok"
    })
  )
);
