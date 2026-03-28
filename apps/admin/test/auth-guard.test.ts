import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveAdminRouteAccess } from "../src/lib/auth-guard.js";

test("allows routes that do not require authentication", async () => {
  const result = await resolveAdminRouteAccess(false, async () => ({
    data: null
  }));

  assert.equal(result, true);
});

test("redirects to login when a protected route has no session", async () => {
  const result = await resolveAdminRouteAccess(true, async () => ({
    data: null
  }));

  assert.deepEqual(result, {
    name: "login"
  });
});

test("allows protected routes when a session exists", async () => {
  const result = await resolveAdminRouteAccess(true, async () => ({
    data: {
      session: {
        id: "session-1"
      }
    }
  }));

  assert.equal(result, true);
});

test("redirects to login when session lookup throws", async () => {
  const result = await resolveAdminRouteAccess(true, async () => {
    throw new Error("network down");
  });

  assert.deepEqual(result, {
    name: "login"
  });
});
