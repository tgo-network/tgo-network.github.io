import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

import { getEnv } from "../lib/env.js";
import { jsonError } from "../lib/errors.js";

const getRequestToken = (authorizationHeader: string | null, internalTokenHeader: string | null) => {
  const bearerToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : "";

  return bearerToken || internalTokenHeader?.trim() || "";
};

export const requireInternalAccess = (): MiddlewareHandler =>
  createMiddleware(async (c, next) => {
    const env = getEnv();

    if (!env.internalApiToken) {
      return jsonError(
        c,
        503,
        "INTERNAL_API_NOT_CONFIGURED",
        "Internal automation is not configured. Set INTERNAL_API_TOKEN first."
      );
    }

    const requestToken = getRequestToken(
      c.req.header("authorization") ?? null,
      c.req.header("x-internal-api-token") ?? null
    );

    if (!requestToken || requestToken !== env.internalApiToken) {
      return jsonError(c, 401, "UNAUTHORIZED", "A valid internal API token is required.");
    }

    await next();
  });
