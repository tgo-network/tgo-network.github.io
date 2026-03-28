import { Hono } from "hono";

import { publishScheduledContent } from "../lib/internal-jobs.js";
import { ok } from "../lib/http.js";
import { requireInternalAccess } from "../middleware/internal.js";

export const internalRoutes = new Hono();

internalRoutes.use("*", requireInternalAccess());

internalRoutes.post("/publish-scheduled-content", async (c) => {
  const forwardedFor = c.req.header("x-forwarded-for");
  const requestIp = forwardedFor?.split(",")[0]?.trim() || c.req.header("x-real-ip") || null;

  const result = await publishScheduledContent({
    actorUserId: null,
    actorStaffAccountId: null,
    requestIp,
    userAgent: c.req.header("user-agent") ?? null
  });

  return c.json(ok(result));
});
