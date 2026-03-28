import { Hono } from "hono";
import { cors } from "hono/cors";

import { getAuth } from "./lib/auth.js";
import { getEnv } from "./lib/env.js";
import { jsonError } from "./lib/errors.js";
import {
  createRequestId,
  getRequestId,
  getRequestStartedAt,
  logError,
  logInfo,
  requestIdHeaderName,
  serializeError
} from "./lib/observability.js";
import { sessionContextMiddleware, type AppVariables } from "./middleware/auth.js";
import { adminRoutes } from "./routes/admin.js";
import { internalRoutes } from "./routes/internal.js";
import { publicRoutes } from "./routes/public.js";
import { rootRoutes } from "./routes/root.js";

export const app = new Hono<{ Variables: AppVariables }>();

const env = getEnv();

app.use("*", async (c, next) => {
  const requestId = createRequestId(c.req.header(requestIdHeaderName));
  const startedAt = Date.now();

  c.set("requestId", requestId);
  c.set("requestStartedAt", startedAt);
  c.header(requestIdHeaderName, requestId);

  await next();

  const user = c.get("user");
  const staffAccount = c.get("staffAccount");

  logInfo("request.completed", {
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Date.now() - startedAt,
    userAgent: c.req.header("user-agent"),
    userId: user?.id,
    staffAccountId: staffAccount?.id
  });
});

app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (!origin) {
        return env.corsAllowedOrigins[0] ?? "*";
      }

      return env.corsAllowedOrigins.includes(origin) ? origin : env.corsAllowedOrigins[0] ?? origin;
    },
    allowHeaders: ["Content-Type", "Authorization", requestIdHeaderName],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: [
      "Content-Length",
      "Retry-After",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      requestIdHeaderName
    ],
    credentials: true,
    maxAge: 600
  })
);

app.use("/api/admin/*", sessionContextMiddleware);

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  const auth = getAuth();

  if (!auth) {
    return jsonError(
      c,
      503,
      "AUTH_NOT_CONFIGURED",
      "Authentication is not configured. Set DATABASE_URL and BETTER_AUTH_SECRET."
    );
  }

  return auth.handler(c.req.raw);
});

app.route("/", rootRoutes);
app.route("/api/public/v1", publicRoutes);
app.route("/api/admin/v1", adminRoutes);
app.route("/api/internal/v1", internalRoutes);

app.notFound((c) => jsonError(c, 404, "NOT_FOUND", "Route not found."));

app.onError((error, c) => {
  const { errorMessage, errorName, stack } = serializeError(error);
  const requestId = getRequestId(c);
  const startedAt = getRequestStartedAt(c);
  const user = c.get("user");
  const staffAccount = c.get("staffAccount");

  logError("request.failed", {
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: 500,
    durationMs: startedAt ? Date.now() - startedAt : undefined,
    userAgent: c.req.header("user-agent"),
    userId: user?.id,
    staffAccountId: staffAccount?.id,
    errorName,
    errorMessage,
    stack: env.appEnvironment === "production" ? undefined : stack
  });

  return jsonError(c, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.");
});
