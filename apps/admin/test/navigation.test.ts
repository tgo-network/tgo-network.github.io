import assert from "node:assert/strict";
import { test } from "node:test";

import { adminModules, implementationMilestones } from "@tgo/shared";
import type { AdminMePayload } from "@tgo/shared";

import { getVisibleAdminModules } from "../src/lib/navigation.js";

const buildMePayload = (permissions: string[]): AdminMePayload => ({
  user: null,
  session: null,
  staffAccount: null,
  roles: [],
  permissions,
  nextMilestones: implementationMilestones
});

test("shows all modules while the shell is loading", () => {
  const result = getVisibleAdminModules(null, true);

  assert.deepEqual(result, adminModules);
});

test("shows all modules before /me payload is available", () => {
  const result = getVisibleAdminModules(null, false);

  assert.deepEqual(result, adminModules);
});

test("filters modules by granted permissions once /me has loaded", () => {
  const result = getVisibleAdminModules(
    buildMePayload(["dashboard.read", "article.read", "application.review"]),
    false
  );

  assert.deepEqual(
    result.map((item) => item.to),
    ["/dashboard", "/articles", "/applications"]
  );
});
