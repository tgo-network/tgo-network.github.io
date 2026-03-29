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
        "内部自动化尚未配置，请先设置 INTERNAL_API_TOKEN。"
      );
    }

    const requestToken = getRequestToken(
      c.req.header("authorization") ?? null,
      c.req.header("x-internal-api-token") ?? null
    );

    if (!requestToken || requestToken !== env.internalApiToken) {
      return jsonError(c, 401, "UNAUTHORIZED", "需要提供有效的内部 API 令牌。");
    }

    await next();
  });
