import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, test } from "node:test";

import { and, eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import {
  applications,
  articleTopicBindings,
  articles,
  auditLogs,
  authors,
  cities,
  createDb,
  createPool,
  eventRegistrations,
  events,
  permissions,
  rolePermissionBindings,
  roles,
  staffAccounts,
  staffRoleBindings,
  topics,
  users
} from "@tgo/db";

import { seedDatabase } from "../../../../packages/db/src/seed.js";

type TestApp = typeof import("../../src/app.js").app;
type TestDbModule = typeof import("../../src/lib/db.js");

interface SignedInUser {
  cookie: string;
  userId: string;
  staffAccountId: string | null;
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const migrationsFolder = resolve(repoRoot, "packages/db/drizzle");
const baseUrl = "http://localhost:8787";
const internalApiToken = "integration-test-internal-token";

let app: TestApp;
let closeDb: TestDbModule["closeDb"];
let resetRateLimitBuckets: typeof import("../../src/lib/rate-limit.js").resetRateLimitBuckets;
let testDatabaseUrl = "";
let testDatabaseName = "";
let adminDatabaseUrl = "";
let adminPool: ReturnType<typeof createPool> | null = null;
let directDb: ReturnType<typeof createDb>["db"];
let directPool: ReturnType<typeof createDb>["pool"];

const createDatabaseName = () =>
  `tgo_api_test_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;

const getJson = async (response: Response) => response.json() as Promise<Record<string, any>>;

const getCookieHeader = (response: Response) => {
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter((value): value is string => Boolean(value));

  return setCookies.map((value) => value.split(";", 1)[0]).join("; ");
};

const request = (path: string, init?: RequestInit) => app.request(`${baseUrl}${path}`, init);

const requestJson = async (path: string, init?: RequestInit) => {
  const response = await request(path, init);
  const payload = await getJson(response);

  return {
    response,
    payload
  };
};

const createSignedInUser = async (
  roleCodes: string[] = [],
  staffStatus: "invited" | "active" | "suspended" | "disabled" = "active"
): Promise<SignedInUser> => {
  const suffix = randomUUID();
  const email = `integration-${suffix}@example.com`;
  const password = `Pass-${suffix}`;
  const name = `Integration ${suffix.slice(0, 8)}`;

  const signUpResponse = await request("/api/auth/sign-up/email", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email,
      password,
      name
    })
  });

  assert.equal(signUpResponse.status, 200);

  const cookie = getCookieHeader(signUpResponse);
  assert.notEqual(cookie, "");

  const user = await directDb.query.users.findFirst({
    where: eq(users.email, email)
  });

  assert.ok(user, "Expected the newly signed-up user to exist.");

  if (roleCodes.length === 0) {
    return {
      cookie,
      userId: user.id,
      staffAccountId: null
    };
  }

  const roleRows = await directDb.select().from(roles).where(inArray(roles.code, roleCodes));
  assert.equal(roleRows.length, roleCodes.length, "Expected all requested roles to exist.");

  const [staffAccount] = await directDb
    .insert(staffAccounts)
    .values({
      userId: user.id,
      status: staffStatus,
      invitedAt: new Date(),
      activatedAt: staffStatus === "active" ? new Date() : null,
      notes: "Integration test staff account"
    })
    .returning();

  assert.ok(staffAccount, "Expected the staff account to be created.");

  await directDb.insert(staffRoleBindings).values(
    roleRows.map((role) => ({
      staffAccountId: staffAccount.id,
      roleId: role.id
    }))
  );

  return {
    cookie,
    userId: user.id,
    staffAccountId: staffAccount.id
  };
};

const getAuthHeaders = (cookie: string) => ({
  cookie,
  "content-type": "application/json"
});

before(async () => {
  const sourceUrl = process.env.DATABASE_URL;

  assert.ok(sourceUrl, "DATABASE_URL must be set before running integration tests.");

  const adminUrl = new URL(sourceUrl);
  adminUrl.pathname = "/postgres";

  const ephemeralName = createDatabaseName();
  const ephemeralUrl = new URL(sourceUrl);
  ephemeralUrl.pathname = `/${ephemeralName}`;

  adminDatabaseUrl = adminUrl.toString();
  testDatabaseName = ephemeralName;
  testDatabaseUrl = ephemeralUrl.toString();
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.APP_ENV = "test";
  process.env.APP_VERSION = "test-version";
  process.env.GIT_SHA = "integration-sha";
  process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? "integration-secret-change-me";
  process.env.BETTER_AUTH_URL = baseUrl;
  process.env.PUBLIC_API_BASE_URL = baseUrl;
  process.env.INTERNAL_API_TOKEN = internalApiToken;

  adminPool = createPool(adminDatabaseUrl);
  await adminPool.query(`CREATE DATABASE "${testDatabaseName}"`);

  const created = createDb(testDatabaseUrl);
  directDb = created.db;
  directPool = created.pool;

  await migrate(directDb as Parameters<typeof migrate>[0], {
    migrationsFolder
  });
  await seedDatabase(directDb);

  ({ app } = await import("../../src/app.js"));
  ({ closeDb } = await import("../../src/lib/db.js"));
  ({ resetRateLimitBuckets } = await import("../../src/lib/rate-limit.js"));
});

after(async () => {
  if (closeDb) {
    await closeDb();
  }

  if (directPool) {
    await directPool.end();
  }

  if (adminPool) {
    await adminPool.query(`DROP DATABASE IF EXISTS "${testDatabaseName}" WITH (FORCE)`);
    await adminPool.end();
  }
});

describe("admin and internal API integration", () => {
  test("rejects unauthenticated, non-staff, suspended, and missing-permission admin access", async () => {
    const unauthenticated = await request("/api/admin/v1/dashboard");
    const unauthenticatedPayload = await getJson(unauthenticated);

    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticatedPayload.error.code, "UNAUTHENTICATED");

    const plainUser = await createSignedInUser();
    const plainUserResult = await request("/api/admin/v1/dashboard", {
      headers: {
        cookie: plainUser.cookie
      }
    });
    const plainUserPayload = await getJson(plainUserResult);

    assert.equal(plainUserResult.status, 403);
    assert.equal(plainUserPayload.error.code, "FORBIDDEN");

    const suspendedStaff = await createSignedInUser(["super_admin"], "suspended");
    const suspendedResult = await request("/api/admin/v1/dashboard", {
      headers: {
        cookie: suspendedStaff.cookie
      }
    });
    const suspendedPayload = await getJson(suspendedResult);

    assert.equal(suspendedResult.status, 403);
    assert.equal(suspendedPayload.error.code, "FORBIDDEN");

    const reviewer = await createSignedInUser(["reviewer"]);
    const reviewerResult = await request("/api/admin/v1/staff", {
      headers: {
        cookie: reviewer.cookie
      }
    });
    const reviewerPayload = await getJson(reviewerResult);

    assert.equal(reviewerResult.status, 403);
    assert.equal(reviewerPayload.error.code, "FORBIDDEN");
    assert.match(reviewerPayload.error.message, /staff\.manage/);
  });

  test("supports staff create/update and role update flows for privileged operators", async () => {
    const superAdmin = await createSignedInUser(["super_admin"]);

    const rolesResult = await requestJson("/api/admin/v1/roles", {
      headers: {
        cookie: superAdmin.cookie
      }
    });

    assert.equal(rolesResult.response.status, 200);

    const reviewerRole = rolesResult.payload.data.roles.find((role: { code: string }) => role.code === "reviewer");
    const mediaManagerRole = rolesResult.payload.data.roles.find(
      (role: { code: string }) => role.code === "media_manager"
    );

    assert.ok(reviewerRole, "Expected reviewer role to exist.");
    assert.ok(mediaManagerRole, "Expected media_manager role to exist.");

    const staffEmail = `staff-${randomUUID()}@example.com`;
    const createStaffResult = await requestJson("/api/admin/v1/staff", {
      method: "POST",
      headers: getAuthHeaders(superAdmin.cookie),
      body: JSON.stringify({
        email: staffEmail,
        name: "Staff Integration User",
        password: "StaffIntegration123!",
        status: "active",
        roleIds: [reviewerRole.id],
        notes: "Created by integration test"
      })
    });

    assert.equal(createStaffResult.response.status, 201);
    assert.equal(createStaffResult.payload.data.email, staffEmail);
    assert.equal(createStaffResult.payload.data.roles.length, 1);
    assert.equal(createStaffResult.payload.data.roles[0].code, "reviewer");

    const createdStaffId = createStaffResult.payload.data.id as string;
    const updateStaffResult = await requestJson(`/api/admin/v1/staff/${createdStaffId}`, {
      method: "PATCH",
      headers: getAuthHeaders(superAdmin.cookie),
      body: JSON.stringify({
        email: staffEmail,
        name: "Staff Integration User Updated",
        status: "suspended",
        roleIds: [mediaManagerRole.id],
        notes: "Updated by integration test"
      })
    });

    assert.equal(updateStaffResult.response.status, 200);
    assert.equal(updateStaffResult.payload.data.status, "suspended");
    assert.equal(updateStaffResult.payload.data.roles.length, 1);
    assert.equal(updateStaffResult.payload.data.roles[0].code, "media_manager");

    const staffListResult = await requestJson("/api/admin/v1/staff", {
      headers: {
        cookie: superAdmin.cookie
      }
    });

    assert.equal(staffListResult.response.status, 200);
    const updatedStaff = staffListResult.payload.data.staff.find((staff: { id: string }) => staff.id === createdStaffId);

    assert.ok(updatedStaff, "Expected the updated staff account in the staff list.");
    assert.equal(updatedStaff.status, "suspended");

    const reviewerPermissionIds = reviewerRole.permissionIds as string[];
    const roleUpdateResult = await requestJson(`/api/admin/v1/roles/${reviewerRole.id}`, {
      method: "PATCH",
      headers: getAuthHeaders(superAdmin.cookie),
      body: JSON.stringify({
        name: reviewerRole.name,
        description: "Integration test reviewer bundle",
        permissionIds: reviewerPermissionIds
      })
    });

    assert.equal(roleUpdateResult.response.status, 200);
    assert.equal(roleUpdateResult.payload.data.description, "Integration test reviewer bundle");

    const persistedRoleBindings = await directDb
      .select()
      .from(rolePermissionBindings)
      .where(eq(rolePermissionBindings.roleId, reviewerRole.id));

    assert.equal(persistedRoleBindings.length, reviewerPermissionIds.length);
  });

  test("protects internal jobs and publishes due scheduled articles", async () => {
    const superAdmin = await createSignedInUser(["super_admin"]);
    const author = await directDb.query.authors.findFirst();
    const topic = await directDb.query.topics.findFirst();

    assert.ok(author, "Expected at least one seeded author.");
    assert.ok(topic, "Expected at least one seeded topic.");

    const validSlug = `scheduled-valid-${randomUUID()}`;
    const invalidSlug = `scheduled-invalid-${randomUUID()}`;
    const pastDueTime = new Date(Date.now() - 60_000);

    const [validArticle] = await directDb
      .insert(articles)
      .values({
        slug: validSlug,
        title: "Scheduled Valid Article",
        excerpt: "A valid scheduled article for integration testing.",
        bodyRichtext: "Body content for the valid scheduled article.",
        status: "scheduled",
        authorId: author.id,
        scheduledAt: pastDueTime
      })
      .returning();

    assert.ok(validArticle, "Expected a valid scheduled article to be created.");

    await directDb.insert(articleTopicBindings).values({
      articleId: validArticle.id,
      topicId: topic.id
    });

    const [invalidArticle] = await directDb
      .insert(articles)
      .values({
        slug: invalidSlug,
        title: "Scheduled Invalid Article",
        status: "scheduled",
        scheduledAt: pastDueTime
      })
      .returning();

    assert.ok(invalidArticle, "Expected an invalid scheduled article to be created.");

    const unauthorizedResult = await request("/api/internal/v1/publish-scheduled-content", {
      method: "POST"
    });
    const unauthorizedPayload = await getJson(unauthorizedResult);

    assert.equal(unauthorizedResult.status, 401);
    assert.equal(unauthorizedPayload.error.code, "UNAUTHORIZED");

    const publishResult = await requestJson("/api/internal/v1/publish-scheduled-content", {
      method: "POST",
      headers: {
        authorization: `Bearer ${internalApiToken}`
      }
    });

    assert.equal(publishResult.response.status, 200);
    assert.equal(publishResult.payload.data.totalDue, 2);
    assert.equal(publishResult.payload.data.totalPublished, 1);
    assert.equal(publishResult.payload.data.totalSkipped, 1);
    assert.equal(publishResult.payload.data.published[0].id, validArticle.id);
    assert.equal(publishResult.payload.data.skipped[0].id, invalidArticle.id);
    assert.match(
      publishResult.payload.data.skipped[0].issues.map((issue: { field: string }) => issue.field).join(","),
      /excerpt|body|authorId|topicIds/
    );

    const publishedArticleResult = await requestJson(`/api/admin/v1/articles/${validArticle.id}`, {
      headers: {
        cookie: superAdmin.cookie
      }
    });

    assert.equal(publishedArticleResult.response.status, 200);
    assert.equal(publishedArticleResult.payload.data.article.status, "published");
    assert.ok(publishedArticleResult.payload.data.article.publishedAt);

    const scheduledAuditLog = await directDb.query.auditLogs.findFirst({
      where: and(eq(auditLogs.action, "article.publish_scheduled"), eq(auditLogs.targetId, validArticle.id))
    });

    assert.ok(scheduledAuditLog, "Expected a scheduled publish audit log entry.");
  });
});

describe("public API integration", () => {
  test("lists only published content and hides unpublished article detail routes", async () => {
    const hiddenSlug = `draft-hidden-${randomUUID()}`;

    await directDb.insert(articles).values({
      slug: hiddenSlug,
      title: "Hidden Draft Article",
      excerpt: "This draft should stay private.",
      bodyRichtext: "Draft body",
      status: "draft"
    });

    const articleListResult = await requestJson("/api/public/v1/articles");

    assert.equal(articleListResult.response.status, 200);
    assert.ok(
      articleListResult.payload.data.some(
        (article: { slug: string }) => article.slug === "shipping-an-editorial-platform"
      )
    );
    assert.ok(
      articleListResult.payload.data.every((article: { slug: string }) => article.slug !== hiddenSlug)
    );

    const hiddenDetailResult = await request("/api/public/v1/articles/" + hiddenSlug);
    const hiddenDetailPayload = await getJson(hiddenDetailResult);

    assert.equal(hiddenDetailResult.status, 404);
    assert.equal(hiddenDetailPayload.error.code, "NOT_FOUND");
  });

  test("persists public applications with city mapping and supports waitlist registrations", async () => {
    const applicationResult = await requestJson("/api/public/v1/applications", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "public-application-test"
      },
      body: JSON.stringify({
        type: "membership",
        name: "Public Applicant",
        email: "public.applicant@example.com",
        company: "North Studio",
        city: "SHANGHAI",
        message: "I would like to join the network."
      })
    });

    assert.equal(applicationResult.response.status, 201);
    assert.equal(applicationResult.payload.data.type, "membership");
    assert.equal(applicationResult.payload.data.applicant.city, "SHANGHAI");

    const savedApplication = await directDb.query.applications.findFirst({
      where: eq(applications.id, applicationResult.payload.data.id)
    });
    const shanghaiCity = await directDb.query.cities.findFirst({
      where: eq(cities.slug, "shanghai")
    });

    assert.ok(savedApplication, "Expected the application to be saved.");
    assert.ok(shanghaiCity, "Expected the Shanghai city seed.");
    assert.equal(savedApplication?.cityId, shanghaiCity?.id ?? null);
    assert.equal(savedApplication?.sourcePage, "/apply");

    const waitlistResult = await requestJson("/api/public/v1/events/content-ops-roundtable/registrations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.11",
        "user-agent": "public-registration-test"
      },
      body: JSON.stringify({
        name: "Waitlist User",
        email: "waitlist.user@example.com"
      })
    });

    assert.equal(waitlistResult.response.status, 201);
    assert.equal(waitlistResult.payload.data.status, "waitlisted");
    assert.equal(waitlistResult.payload.data.event.slug, "content-ops-roundtable");

    const savedRegistration = await directDb.query.eventRegistrations.findFirst({
      where: eq(eventRegistrations.id, waitlistResult.payload.data.id)
    });

    assert.ok(savedRegistration, "Expected the waitlist registration to be saved.");
    assert.equal(savedRegistration?.status, "waitlisted");
  });

  test("enforces public write rate limits and rejects closed event registration", async () => {
    const previousLimit = process.env.PUBLIC_EVENT_REGISTRATION_RATE_LIMIT_MAX;
    process.env.PUBLIC_EVENT_REGISTRATION_RATE_LIMIT_MAX = "1";
    resetRateLimitBuckets();

    try {
      const closedResult = await request("/api/public/v1/events/city-chapter-kickoff/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.12",
          "user-agent": "closed-event-test"
        },
        body: JSON.stringify({
          name: "Closed Event User",
          email: "closed@example.com"
        })
      });
      const closedPayload = await getJson(closedResult);

      assert.equal(closedResult.status, 409);
      assert.equal(closedPayload.error.code, "REGISTRATION_CLOSED");

      const firstAttempt = await request("/api/public/v1/events/spring-platform-workshop/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.13",
          "user-agent": "rate-limit-test"
        },
        body: JSON.stringify({
          name: "Rate Limit User",
          email: "ratelimit@example.com"
        })
      });
      const firstPayload = await getJson(firstAttempt);

      assert.equal(firstAttempt.status, 201);
      assert.equal(firstPayload.data.status, "submitted");
      assert.equal(firstAttempt.headers.get("X-RateLimit-Limit"), "1");
      assert.equal(firstAttempt.headers.get("X-RateLimit-Remaining"), "0");

      const secondAttempt = await request("/api/public/v1/events/spring-platform-workshop/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.13",
          "user-agent": "rate-limit-test"
        },
        body: JSON.stringify({
          name: "Rate Limit User Again",
          email: "ratelimit-again@example.com"
        })
      });
      const secondPayload = await getJson(secondAttempt);

      assert.equal(secondAttempt.status, 429);
      assert.equal(secondPayload.error.code, "RATE_LIMITED");
      assert.equal(secondAttempt.headers.get("X-RateLimit-Limit"), "1");
      assert.equal(secondAttempt.headers.get("X-RateLimit-Remaining"), "0");
      assert.ok(secondAttempt.headers.get("Retry-After"));
    } finally {
      if (previousLimit === undefined) {
        delete process.env.PUBLIC_EVENT_REGISTRATION_RATE_LIMIT_MAX;
      } else {
        process.env.PUBLIC_EVENT_REGISTRATION_RATE_LIMIT_MAX = previousLimit;
      }

      resetRateLimitBuckets();
    }
  });
});

describe("runtime probes", () => {
  test("exposes health, readiness, and version metadata", async () => {
    const rootResult = await requestJson("/");

    assert.equal(rootResult.response.status, 200);
    assert.equal(rootResult.payload.data.service, "@tgo/api");
    assert.equal(rootResult.payload.data.status, "ok");
    assert.equal(rootResult.payload.data.environment, "test");
    assert.equal(rootResult.payload.data.version, "test-version");

    const healthResult = await requestJson("/health");

    assert.equal(healthResult.response.status, 200);
    assert.equal(healthResult.payload.data.service, "@tgo/api");
    assert.equal(healthResult.payload.data.status, "ok");
    assert.ok(healthResult.payload.data.checkedAt);

    const versionResult = await requestJson("/version");

    assert.equal(versionResult.response.status, 200);
    assert.equal(versionResult.payload.data.service, "@tgo/api");
    assert.equal(versionResult.payload.data.environment, "test");
    assert.equal(versionResult.payload.data.version, "test-version");
    assert.equal(versionResult.payload.data.gitSha, "integration-sha");
    assert.ok(versionResult.payload.data.checkedAt);

    const readinessResult = await requestJson("/ready");

    assert.equal(readinessResult.response.status, 200);
    assert.equal(readinessResult.payload.data.service, "@tgo/api");
    assert.equal(readinessResult.payload.data.environment, "test");
    assert.equal(readinessResult.payload.data.ready, true);
    assert.equal(readinessResult.payload.data.components.database.required, true);
    assert.equal(readinessResult.payload.data.components.database.ready, true);
    assert.equal(readinessResult.payload.data.components.auth.ready, true);
    assert.equal(readinessResult.payload.data.components.cors.ready, true);
    assert.equal(readinessResult.payload.data.components.storage.configured, true);
    assert.equal(readinessResult.payload.data.components.internalAutomation.configured, true);
  });

  test("echoes or generates request ids for success and error responses", async () => {
    const incomingRequestId = "req-123456";
    const healthResponse = await request("/health", {
      headers: {
        "x-request-id": incomingRequestId
      }
    });
    const healthPayload = await getJson(healthResponse);

    assert.equal(healthResponse.status, 200);
    assert.equal(healthResponse.headers.get("X-Request-ID"), incomingRequestId);
    assert.equal(healthPayload.data.status, "ok");

    const missingRoute = await request("/missing-route");
    const missingPayload = await getJson(missingRoute);
    const missingRequestId = missingRoute.headers.get("X-Request-ID");

    assert.equal(missingRoute.status, 404);
    assert.equal(missingPayload.error.code, "NOT_FOUND");
    assert.ok(missingRequestId);
    assert.equal(missingPayload.error.requestId, missingRequestId);

    const unauthenticated = await request("/api/admin/v1/dashboard");
    const unauthenticatedPayload = await getJson(unauthenticated);
    const unauthenticatedRequestId = unauthenticated.headers.get("X-Request-ID");

    assert.equal(unauthenticated.status, 401);
    assert.ok(unauthenticatedRequestId);
    assert.equal(unauthenticatedPayload.error.requestId, unauthenticatedRequestId);
  });
});
