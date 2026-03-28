import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

import { getStaffAccess } from "../lib/access.js";
import { getAuth } from "../lib/auth.js";
import { jsonError } from "../lib/errors.js";
import { isAuthConfigured } from "../lib/env.js";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  status?: string | null;
  phoneNumber?: string | null;
  phoneVerifiedAt?: Date | string | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: Date | string;
  token: string;
}

export interface AppVariables {
  authReady: boolean;
  requestId: string;
  requestStartedAt: number;
  user: SessionUser | null;
  session: SessionRecord | null;
  staffAccount: {
    id: string;
    userId: string;
    status: string;
  } | null;
  roleCodes: string[];
  permissionCodes: string[];
}

export const sessionContextMiddleware = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const auth = getAuth();

  c.set("authReady", isAuthConfigured());
  c.set("user", null);
  c.set("session", null);
  c.set("staffAccount", null);
  c.set("roleCodes", []);
  c.set("permissionCodes", []);

  if (!auth) {
    await next();
    return;
  }

  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers
    });

    if (!session) {
      await next();
      return;
    }

    c.set("user", session.user as SessionUser);
    c.set("session", session.session as SessionRecord);

    const access = await getStaffAccess(session.user.id);

    c.set("staffAccount", access.staffAccount);
    c.set("roleCodes", access.roles);
    c.set("permissionCodes", access.permissions);
  } catch {
    c.set("user", null);
    c.set("session", null);
    c.set("staffAccount", null);
    c.set("roleCodes", []);
    c.set("permissionCodes", []);
  }

  await next();
});

export const requireActiveStaff = (requiredPermission?: string): MiddlewareHandler<{ Variables: AppVariables }> =>
  createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    if (!c.get("authReady")) {
      return jsonError(
        c,
        503,
        "AUTH_NOT_CONFIGURED",
        "Authentication is not configured. Set DATABASE_URL and BETTER_AUTH_SECRET."
      );
    }

    if (!c.get("user") || !c.get("session")) {
      return jsonError(c, 401, "UNAUTHENTICATED", "You must sign in to access this resource.");
    }

    const staffAccount = c.get("staffAccount");

    if (!staffAccount || staffAccount.status !== "active") {
      return jsonError(c, 403, "FORBIDDEN", "Active staff access is required.");
    }

    if (requiredPermission && !c.get("permissionCodes").includes(requiredPermission)) {
      return jsonError(c, 403, "FORBIDDEN", `Missing required permission: ${requiredPermission}.`);
    }

    await next();
  });
