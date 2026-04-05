import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, test } from "node:test";

import { and, eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import {
  articles,
  auditLogs,
  authors,
  createDb,
  createPool,
  eventRegistrations,
  events,
  joinApplications,
  permissions,
  rolePermissionBindings,
  roles,
  staffAccounts,
  staffRoleBindings,
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

  test("aligns current staff roles with article editing and registration review routes", async () => {
    const contentEditor = await createSignedInUser(["content_editor"]);
    const author = await directDb.query.authors.findFirst();

    assert.ok(author, "Expected at least one seeded author.");

    const articleSlug = `content-editor-article-${randomUUID()}`;
    const createArticleResult = await requestJson("/api/admin/v1/articles", {
      method: "POST",
      headers: getAuthHeaders(contentEditor.cookie),
      body: JSON.stringify({
        slug: articleSlug,
        title: "内容编辑角色创建的文章",
        excerpt: "用于验证 content_editor 具备当前文章编辑权限。",
        body: "文章正文已经准备完成，可由内容编辑直接创建并发布。",
        status: "draft",
        authorId: author.id,
        branchId: null,
        coverAssetId: null,
        seoTitle: "",
        seoDescription: "",
        scheduledAt: null
      })
    });

    assert.equal(createArticleResult.response.status, 201);

    const articleId = createArticleResult.payload.data.article.id as string;
    const publishArticleResult = await requestJson(`/api/admin/v1/articles/${articleId}/publish`, {
      method: "POST",
      headers: getAuthHeaders(contentEditor.cookie)
    });

    assert.equal(publishArticleResult.response.status, 200);

    const registration = await directDb.query.eventRegistrations.findFirst();

    assert.ok(registration, "Expected at least one seeded event registration.");

    const eventManager = await createSignedInUser(["event_manager"]);
    const registrationListResult = await requestJson(`/api/admin/v1/events/${registration.eventId}/registrations`, {
      headers: {
        cookie: eventManager.cookie
      }
    });

    assert.equal(registrationListResult.response.status, 200);
    assert.ok(Array.isArray(registrationListResult.payload.data.registrations));

    const registrationDetailResult = await requestJson(`/api/admin/v1/registrations/${registration.id}`, {
      headers: {
        cookie: eventManager.cookie
      }
    });

    assert.equal(registrationDetailResult.response.status, 200);
    assert.equal(registrationDetailResult.payload.data.registration.id, registration.id);
  });

  test("returns paginated admin event results with server-side filters and metadata", async () => {
    const eventManager = await createSignedInUser(["event_manager"]);
    const seededEvent = await directDb.query.events.findFirst({
      where: eq(events.slug, "shanghai-ai-leadership-salon")
    });

    assert.ok(seededEvent, "Expected the seeded Shanghai AI event to exist.");
    assert.ok(seededEvent.branchId, "Expected the seeded Shanghai AI event to have a branch.");

    const listResult = await requestJson(
      `/api/admin/v1/events?page=1&pageSize=1&q=${encodeURIComponent("上海 AI")}&status=published&registrationState=open&branchId=${seededEvent.branchId}`,
      {
        headers: {
          cookie: eventManager.cookie
        }
      }
    );

    assert.equal(listResult.response.status, 200);
    assert.equal(listResult.payload.meta.page, 1);
    assert.equal(listResult.payload.meta.pageSize, 1);
    assert.equal(listResult.payload.meta.total, 1);
    assert.equal(listResult.payload.meta.pageCount, 1);
    assert.ok(Array.isArray(listResult.payload.meta.branchOptions));
    assert.equal(listResult.payload.meta.stats.total >= listResult.payload.meta.total, true);
    assert.equal(listResult.payload.data.length, 1);
    assert.equal(listResult.payload.data[0].slug, "shanghai-ai-leadership-salon");
    assert.equal(listResult.payload.data[0].branchId, seededEvent.branchId);
    assert.equal(listResult.payload.data[0].venueName, seededEvent.venueName);
  });

  test("cleans retired permission codes when the seed script reruns", async () => {
    const superAdminRole = await directDb.query.roles.findFirst({
      where: eq(roles.code, "super_admin")
    });

    assert.ok(superAdminRole, "Expected the super_admin role to exist.");

    const [legacyPermission] = await directDb
      .insert(permissions)
      .values({
        code: "registration.read",
        name: "旧报名读取",
        resource: "registration",
        action: "read"
      })
      .returning();

    assert.ok(legacyPermission, "Expected to create a retired permission row.");

    await directDb.insert(rolePermissionBindings).values({
      roleId: superAdminRole.id,
      permissionId: legacyPermission.id
    });

    await seedDatabase(directDb);

    const retiredPermissions = await directDb
      .select()
      .from(permissions)
      .where(
        inArray(permissions.code, [
          "article.manage",
          "registration.read",
          "topic.manage",
          "featured_block.manage",
          "settings.manage"
        ])
      );

    assert.equal(retiredPermissions.length, 0);

    const staleBindings = await directDb
      .select()
      .from(rolePermissionBindings)
      .where(eq(rolePermissionBindings.permissionId, legacyPermission.id));

    assert.equal(staleBindings.length, 0);
  });

  test("removes transient verification articles when the seed script reruns", async () => {
    const transientSlugs = [`auto-article-${randomUUID()}`, `scheduled-smoke-${randomUUID()}`];

    await directDb.insert(articles).values(
      transientSlugs.map((slug, index) => ({
        slug,
        title: `Transient Article ${index + 1}`,
        excerpt: "This article should be removed when the demo seed reruns.",
        bodyRichtext: "Transient body",
        status: index === 0 ? ("published" as const) : ("draft" as const),
        publishedAt: index === 0 ? new Date() : null
      }))
    );

    await seedDatabase(directDb);

    const remainingTransientArticles = await directDb
      .select({ slug: articles.slug })
      .from(articles)
      .where(inArray(articles.slug, transientSlugs));

    assert.equal(remainingTransientArticles.length, 0);
  });

  test("allows article publishing without legacy topic or city bindings", async () => {
    const superAdmin = await createSignedInUser(["super_admin"]);
    const author = await directDb.query.authors.findFirst();

    assert.ok(author, "Expected at least one seeded author.");

    const slug = `article-without-legacy-bindings-${randomUUID()}`;
    const createResult = await requestJson("/api/admin/v1/articles", {
      method: "POST",
      headers: getAuthHeaders(superAdmin.cookie),
      body: JSON.stringify({
        slug,
        title: "无旧字段依赖的文章",
        excerpt: "这篇文章用于验证当前主线下文章发布不再依赖旧 topic/city 绑定。",
        body: "文章正文已经准备完成，可直接发布到公开站。",
        status: "draft",
        authorId: author.id,
        branchId: null,
        coverAssetId: null,
        seoTitle: "",
        seoDescription: "",
        scheduledAt: null
      })
    });

    assert.equal(createResult.response.status, 201);
    assert.equal(createResult.payload.data.article.branchId, null);

    const articleId = createResult.payload.data.article.id as string;
    const publishResult = await requestJson(`/api/admin/v1/articles/${articleId}/publish`, {
      method: "POST",
      headers: getAuthHeaders(superAdmin.cookie)
    });

    assert.equal(publishResult.response.status, 200);
    assert.equal(publishResult.payload.data.article.status, "published");
    assert.equal(publishResult.payload.data.article.branchId, null);

    const savedArticle = await directDb.query.articles.findFirst({
      where: eq(articles.id, articleId)
    });

    assert.ok(savedArticle, "Expected the article to be saved.");
    assert.equal(savedArticle?.status, "published");
  });

  test("supports converged admin flows for join applications and page content management", async () => {
    const superAdmin = await createSignedInUser(["super_admin"]);
    const retiredTopicResult = await request("/api/admin/v1/topics", {
      headers: {
        cookie: superAdmin.cookie
      }
    });
    const retiredFeaturedBlocksResult = await request("/api/admin/v1/featured-blocks/homepage", {
      headers: {
        cookie: superAdmin.cookie
      }
    });
    const retiredSiteSettingsResult = await request("/api/admin/v1/site-settings", {
      headers: {
        cookie: superAdmin.cookie
      }
    });

    assert.equal(retiredTopicResult.status, 404);
    assert.equal(retiredFeaturedBlocksResult.status, 404);
    assert.equal(retiredSiteSettingsResult.status, 404);

    const joinApplicationResult = await requestJson("/api/public/v1/join-applications", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.20",
        "user-agent": "join-application-admin-flow"
      },
      body: JSON.stringify({
        name: "张同学",
        phoneNumber: "13800138000",
        wechatId: "zhangtongxue",
        email: "zhang@example.com",
        introduction: "负责技术团队管理与平台建设，持续关注技术领导者成长与社区连接。",
        applicationMessage: "希望加入上海分会，参与闭门交流和标杆走访活动。"
      })
    });

    assert.equal(joinApplicationResult.response.status, 201);

    const createdApplicationId = joinApplicationResult.payload.data.id as string;

    const applicationListResult = await requestJson("/api/admin/v1/applications", {
      headers: {
        cookie: superAdmin.cookie
      }
    });

    assert.equal(applicationListResult.response.status, 200);
    assert.ok(
      applicationListResult.payload.data.some((application: { id: string }) => application.id === createdApplicationId)
    );

    const applicationDetailResult = await requestJson(`/api/admin/v1/applications/${createdApplicationId}`, {
      headers: {
        cookie: superAdmin.cookie
      }
    });

    assert.equal(applicationDetailResult.response.status, 200);
    assert.equal(applicationDetailResult.payload.data.application.name, "张同学");

    const reviewedApplicationResult = await requestJson(`/api/admin/v1/applications/${createdApplicationId}`, {
      method: "PATCH",
      headers: getAuthHeaders(superAdmin.cookie),
      body: JSON.stringify({
        status: "approved",
        reviewNotes: "已完成初步沟通，进入后续邀请流程。"
      })
    });

    assert.equal(reviewedApplicationResult.response.status, 200);
    assert.equal(reviewedApplicationResult.payload.data.application.status, "approved");
    assert.equal(reviewedApplicationResult.payload.data.application.reviewNotes, "已完成初步沟通，进入后续邀请流程。");

    const savedJoinApplication = await directDb.query.joinApplications.findFirst({
      where: eq(joinApplications.id, createdApplicationId)
    });

    assert.ok(savedJoinApplication, "Expected the join application to exist.");
    assert.equal(savedJoinApplication?.status, "approved");

    const homepageResult = await requestJson("/api/admin/v1/homepage", {
      headers: {
        cookie: superAdmin.cookie
      }
    });

    assert.equal(homepageResult.response.status, 200);
    assert.ok(Array.isArray(homepageResult.payload.data.references.articles));
    assert.ok(Array.isArray(homepageResult.payload.data.references.events));
    assert.ok(Array.isArray(homepageResult.payload.data.references.branches));

    const currentHomepage = homepageResult.payload.data.homepage;
    const updatedHomepageResult = await requestJson("/api/admin/v1/homepage", {
      method: "PATCH",
      headers: getAuthHeaders(superAdmin.cookie),
      body: JSON.stringify({
        heroEyebrow: currentHomepage.heroEyebrow,
        heroTitle: "集成测试首页标题",
        heroSummary: currentHomepage.heroSummary,
        primaryActionLabel: currentHomepage.primaryActionLabel,
        primaryActionHref: currentHomepage.primaryActionHref,
        secondaryActionLabel: currentHomepage.secondaryActionLabel,
        secondaryActionHref: currentHomepage.secondaryActionHref,
        introTitle: currentHomepage.introTitle,
        introSummary: currentHomepage.introSummary,
        audienceTitle: currentHomepage.audienceTitle,
        audienceItems: currentHomepage.audienceItems,
        metrics: currentHomepage.metrics,
        featuredArticleIds: currentHomepage.featuredArticleIds,
        featuredEventIds: currentHomepage.featuredEventIds,
        branchHighlightIds: currentHomepage.branchHighlightIds,
        joinTitle: currentHomepage.joinTitle,
        joinSummary: currentHomepage.joinSummary,
        joinHref: currentHomepage.joinHref
      })
    });

    assert.equal(updatedHomepageResult.response.status, 200);
    assert.equal(updatedHomepageResult.payload.data.homepage.heroTitle, "集成测试首页标题");

    const joinPageResult = await requestJson("/api/admin/v1/pages/join", {
      headers: {
        cookie: superAdmin.cookie
      }
    });

    assert.equal(joinPageResult.response.status, 200);

    const updatedJoinPageResult = await requestJson("/api/admin/v1/pages/join", {
      method: "PATCH",
      headers: getAuthHeaders(superAdmin.cookie),
      body: JSON.stringify({
        title: "加入 TGO 鲲鹏会",
        summary: "通过线上申请与工作人员审核，进入技术领导者交流网络。",
        body: "具备明确的技术管理职责。\n\n认可长期同侪交流的价值。\n\n可持续参与分会活动与专题交流。",
        seoTitle: "加入 TGO 鲲鹏会",
        seoDescription: "加入申请说明与审核流程介绍。",
        status: "published"
      })
    });

    assert.equal(updatedJoinPageResult.response.status, 200);
    assert.equal(updatedJoinPageResult.payload.data.page.slug, "join");
    assert.equal(updatedJoinPageResult.payload.data.page.status, "published");
  });

  test("protects internal jobs and publishes due scheduled articles", async () => {
    const superAdmin = await createSignedInUser(["super_admin"]);
    const author = await directDb.query.authors.findFirst();

    assert.ok(author, "Expected at least one seeded author.");

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
      /excerpt|body|authorId/
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
  test("serves the converged public home, branch, member, join, about, and event routes", async () => {
    const homeResult = await requestJson("/api/public/v1/home");

    assert.equal(homeResult.response.status, 200);
    assert.ok(homeResult.payload.data.hero.title);
    assert.ok(Array.isArray(homeResult.payload.data.branchHighlights));

    const branchesResult = await requestJson("/api/public/v1/branches");

    assert.equal(branchesResult.response.status, 200);
    assert.ok(branchesResult.payload.data.length > 0);

    const branchSlug = branchesResult.payload.data[0].slug as string;
    const branchDetailResult = await requestJson(`/api/public/v1/branches/${branchSlug}`);

    assert.equal(branchDetailResult.response.status, 200);
    assert.equal(branchDetailResult.payload.data.slug, branchSlug);

    const membersResult = await requestJson(`/api/public/v1/members?branchSlug=${branchSlug}`);

    assert.equal(membersResult.response.status, 200);
    assert.ok(
      membersResult.payload.data.every(
        (member: { branch: { slug?: string } | null }) => !member.branch || member.branch.slug === branchSlug
      )
    );

    const joinResult = await requestJson("/api/public/v1/join");
    const aboutResult = await requestJson("/api/public/v1/about");

    assert.equal(joinResult.response.status, 200);
    assert.equal(aboutResult.response.status, 200);
    assert.ok(joinResult.payload.data.hero.title);
    assert.ok(aboutResult.payload.data.sections.length > 0);

    const eventsResult = await requestJson("/api/public/v1/events?upcoming=true");

    assert.equal(eventsResult.response.status, 200);
    assert.ok(eventsResult.payload.data.length > 0);

    const eventSlug = eventsResult.payload.data[0].slug as string;
    const eventDetailResult = await requestJson(`/api/public/v1/events/${eventSlug}`);

    assert.equal(eventDetailResult.response.status, 200);
    assert.equal(eventDetailResult.payload.data.slug, eventSlug);
  });

  test("supports public event pagination meta and city filtering", async () => {
    const pagedResult = await requestJson("/api/public/v1/events?page=1&pageSize=2");

    assert.equal(pagedResult.response.status, 200);
    assert.equal(pagedResult.payload.meta.page, 1);
    assert.equal(pagedResult.payload.meta.pageSize, 2);
    assert.ok(pagedResult.payload.meta.pageCount >= 1);
    assert.ok(Array.isArray(pagedResult.payload.meta.cityOptions));
    assert.ok(pagedResult.payload.data.length <= 2);

    if (pagedResult.payload.data.length >= 2) {
      assert.ok(
        Date.parse(pagedResult.payload.data[0].startsAt) >= Date.parse(pagedResult.payload.data[1].startsAt)
      );
    }

    const cityName = pagedResult.payload.data[0].cityName as string;
    const cityResult = await requestJson(`/api/public/v1/events?city=${encodeURIComponent(cityName)}&page=1&pageSize=5`);

    assert.equal(cityResult.response.status, 200);
    assert.equal(cityResult.payload.meta.page, 1);
    assert.ok(cityResult.payload.meta.total >= cityResult.payload.data.length);
    assert.ok(cityResult.payload.data.every((item: { cityName: string }) => item.cityName === cityName));
  });

  test("lists only published content and hides unpublished article detail routes", async () => {
    const hiddenSlug = `draft-hidden-${randomUUID()}`;
    const transientSlug = `auto-article-${randomUUID()}`;

    await directDb.insert(articles).values({
      slug: hiddenSlug,
      title: "Hidden Draft Article",
      excerpt: "This draft should stay private.",
      bodyRichtext: "Draft body",
      status: "draft"
    });
    await directDb.insert(articles).values({
      slug: transientSlug,
      title: "Auto Article Hidden From Public",
      excerpt: "This generated verification article should stay private.",
      bodyRichtext: "Generated body",
      status: "published",
      publishedAt: new Date()
    });

    const articleListResult = await requestJson("/api/public/v1/articles");

    assert.equal(articleListResult.response.status, 200);
    const visibleArticle = articleListResult.payload.data.find(
      (article: { slug: string }) => article.slug === "shipping-an-editorial-platform"
    ) as Record<string, unknown> | undefined;

    assert.ok(visibleArticle, "Expected a published article in the public list.");
    assert.equal(visibleArticle.authorName, "李墨言");
    assert.ok(!("topicSlugs" in visibleArticle));
    assert.ok(!("city" in visibleArticle));
    assert.ok(
      articleListResult.payload.data.every((article: { slug: string }) => article.slug !== hiddenSlug)
    );
    assert.ok(
      articleListResult.payload.data.every((article: { slug: string }) => article.slug !== transientSlug)
    );

    const visibleDetailResult = await requestJson("/api/public/v1/articles/shipping-an-editorial-platform");

    assert.equal(visibleDetailResult.response.status, 200);
    assert.equal(visibleDetailResult.payload.data.slug, "shipping-an-editorial-platform");
    assert.equal(visibleDetailResult.payload.data.author.name, "李墨言");
    assert.ok(Array.isArray(visibleDetailResult.payload.data.body));
    assert.ok(!("citySummary" in visibleDetailResult.payload.data));
    assert.ok(!("topics" in visibleDetailResult.payload.data));

    const hiddenDetailResult = await request("/api/public/v1/articles/" + hiddenSlug);
    const hiddenDetailPayload = await getJson(hiddenDetailResult);
    const transientDetailResult = await request("/api/public/v1/articles/" + transientSlug);
    const transientDetailPayload = await getJson(transientDetailResult);

    assert.equal(hiddenDetailResult.status, 404);
    assert.equal(hiddenDetailPayload.error.code, "NOT_FOUND");
    assert.equal(transientDetailResult.status, 404);
    assert.equal(transientDetailPayload.error.code, "NOT_FOUND");
  });

  test("retires legacy public routes and supports waitlist registrations", async () => {
    const legacyTopicsResult = await request("/api/public/v1/topics");
    const legacyCitiesResult = await request("/api/public/v1/cities");
    const legacyApplicationsResult = await request("/api/public/v1/applications", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name: "Legacy Applicant"
      })
    });

    assert.equal(legacyTopicsResult.status, 404);
    assert.equal(legacyCitiesResult.status, 404);
    assert.equal(legacyApplicationsResult.status, 404);

    const waitlistEvent = await directDb.query.events.findFirst({
      where: and(eq(events.status, "published"), eq(events.registrationState, "waitlist"))
    });

    assert.ok(waitlistEvent, "Expected a published waitlist event.");

    const waitlistResult = await requestJson(`/api/public/v1/events/${waitlistEvent.slug}/registrations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.11",
        "user-agent": "public-registration-test"
      },
      body: JSON.stringify({
        name: "Waitlist User",
        phoneNumber: "13900139000",
        email: "waitlist.user@example.com"
      })
    });

    assert.equal(waitlistResult.response.status, 201);
    assert.equal(waitlistResult.payload.data.status, "waitlisted");
    assert.equal(waitlistResult.payload.data.event.slug, waitlistEvent.slug);

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
      const closedEvent = await directDb.query.events.findFirst({
        where: and(eq(events.status, "published"), eq(events.registrationState, "not_open"))
      });
      const openEvent = await directDb.query.events.findFirst({
        where: and(eq(events.status, "published"), eq(events.registrationState, "open"))
      });

      assert.ok(closedEvent, "Expected a published not_open event.");
      assert.ok(openEvent, "Expected a published open event.");

      const closedResult = await request(`/api/public/v1/events/${closedEvent.slug}/registrations`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.12",
          "user-agent": "closed-event-test"
        },
        body: JSON.stringify({
          name: "Closed Event User",
          phoneNumber: "13700137000",
          email: "closed@example.com"
        })
      });
      const closedPayload = await getJson(closedResult);

      assert.equal(closedResult.status, 409);
      assert.equal(closedPayload.error.code, "REGISTRATION_CLOSED");

      const firstAttempt = await request(`/api/public/v1/events/${openEvent.slug}/registrations`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.13",
          "user-agent": "rate-limit-test"
        },
        body: JSON.stringify({
          name: "Rate Limit User",
          phoneNumber: "13600136000",
          email: "ratelimit@example.com"
        })
      });
      const firstPayload = await getJson(firstAttempt);

      assert.equal(firstAttempt.status, 201);
      assert.equal(firstPayload.data.status, "submitted");
      assert.equal(firstAttempt.headers.get("X-RateLimit-Limit"), "1");
      assert.equal(firstAttempt.headers.get("X-RateLimit-Remaining"), "0");

      const secondAttempt = await request(`/api/public/v1/events/${openEvent.slug}/registrations`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.13",
          "user-agent": "rate-limit-test"
        },
        body: JSON.stringify({
          name: "Rate Limit User Again",
          phoneNumber: "13600136001",
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
