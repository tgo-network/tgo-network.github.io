import { Hono } from "hono";
import { cors } from "hono/cors";

import { getAuth } from "./lib/auth.js";
import { getEnv } from "./lib/env.js";
import { jsonError } from "./lib/errors.js";
import { sessionContextMiddleware, type AppVariables } from "./middleware/auth.js";
import { adminRoutes } from "./routes/admin.js";
import { publicRoutes } from "./routes/public.js";
import { rootRoutes } from "./routes/root.js";

export const app = new Hono<{ Variables: AppVariables }>();

const env = getEnv();

app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (!origin) {
        return env.corsAllowedOrigins[0] ?? "*";
      }

      return env.corsAllowedOrigins.includes(origin) ? origin : env.corsAllowedOrigins[0] ?? origin;
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: [
      "Content-Length",
      "Retry-After",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset"
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
