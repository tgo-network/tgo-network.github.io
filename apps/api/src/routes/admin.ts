import {
  implementationMilestones,
  type AdminMePayload,
  validateAdminBranchInput,
  validateAdminAssetUploadCompleteInput,
  validateAdminAssetUploadIntentInput,
  validateAdminArticleInput,
  validateAdminEventInputV2,
  validateAdminEventRegistrationInputV2,
  validateAdminHomepageInput,
  validateAdminJoinApplicationUpdateInput,
  validateAdminMemberInput,
  validateAdminRoleInput,
  validateAdminSitePageInputV2,
  validateAdminStaffCreateInput,
  validateAdminStaffUpdateInput
} from "@tgo/shared";
import { Hono, type Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import {
  AdminContentError,
  archiveAdminArticle,
  completeAdminAssetUpload,
  createAdminArticle,
  createAdminAssetUploadIntent,
  getAdminArticle,
  getAdminArticleReferencesPayload,
  listAdminAssets,
  listAdminArticles,
  publishAdminArticle,
  updateAdminArticle,
} from "../lib/admin-content.js";
import {
  archiveAdminEventV2,
  createAdminBranch,
  createAdminEventV2,
  createAdminMember,
  getAdminBranch,
  getAdminEventReferencesV2,
  getAdminEventRegistrationV2,
  getAdminEventV2,
  getAdminHomepage,
  getAdminJoinApplication,
  getAdminMember,
  getAdminSitePage,
  getDashboardStatsV2,
  listAdminBranches,
  listAdminEventRegistrationsV2,
  listAdminEventsV2,
  listAdminJoinApplications,
  listAdminMembers,
  publishAdminEventV2,
  updateAdminBranch,
  updateAdminEventRegistrationV2,
  updateAdminEventV2,
  updateAdminHomepage,
  updateAdminJoinApplication,
  updateAdminMember,
  updateAdminSitePage
} from "../lib/network-admin.js";
import {
  createAdminStaff,
  listAdminRoles,
  listAdminStaff,
  updateAdminRole,
  updateAdminStaff
} from "../lib/admin-staff.js";
import { listAdminAuditLogs } from "../lib/audit.js";
import { jsonError } from "../lib/errors.js";
import { ok } from "../lib/http.js";
import type { AppVariables } from "../middleware/auth.js";
import { requireActiveStaff } from "../middleware/auth.js";

export const adminRoutes = new Hono<{ Variables: AppVariables }>();

type AdminContext = Context<{ Variables: AppVariables }>;

const handleAdminError = (c: AdminContext, error: unknown) => {
  if (error instanceof AdminContentError) {
    return jsonError(
      c,
      error.status as ContentfulStatusCode,
      error.code,
      error.message,
      error.details
    );
  }

  throw error;
};

const getStaffAccountId = (c: AdminContext) => {
  const staffAccount = c.get("staffAccount");

  if (!staffAccount) {
    throw new AdminContentError(403, "FORBIDDEN", "需要启用中的员工账号权限。");
  }

  return staffAccount.id;
};

const getAuditActor = (c: AdminContext) => {
  const forwardedFor = c.req.header("x-forwarded-for");
  const requestIp = forwardedFor?.split(",")[0]?.trim() || c.req.header("x-real-ip") || null;

  return {
    actorUserId: c.get("user")?.id ?? null,
    actorStaffAccountId: getStaffAccountId(c),
    requestIp,
    userAgent: c.req.header("user-agent") ?? null
  };
};

adminRoutes.use("*", requireActiveStaff());

adminRoutes.get("/me", (c) => {
  const payload: AdminMePayload = {
    user: c.get("user"),
    session: c.get("session"),
    staffAccount: c.get("staffAccount"),
    roles: c.get("roleCodes"),
    permissions: c.get("permissionCodes"),
    nextMilestones: implementationMilestones
  };

  return c.json(ok(payload));
});

adminRoutes.get("/dashboard", requireActiveStaff("dashboard.read"), async (c) =>
  c.json(
    ok({
      stats: await getDashboardStatsV2()
    })
  )
);

adminRoutes.get("/articles/references", requireActiveStaff("article.read"), async (c) =>
  c.json(ok(await getAdminArticleReferencesPayload()))
);

adminRoutes.get("/articles", requireActiveStaff("article.read"), async (c) => {
  const data = await listAdminArticles();

  return c.json(ok(data, { total: data.length }));
});

adminRoutes.post("/articles", requireActiveStaff("article.write"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminArticleInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await createAdminArticle(result.data, getAuditActor(c))), 201);
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/articles/:id", requireActiveStaff("article.read"), async (c) => {
  const article = await getAdminArticle(c.req.param("id"));

  if (!article) {
    return jsonError(c, 404, "NOT_FOUND", "文章不存在。");
  }

  return c.json(ok(article));
});

adminRoutes.patch("/articles/:id", requireActiveStaff("article.write"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminArticleInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminArticle(c.req.param("id"), result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.post("/articles/:id/publish", requireActiveStaff("article.publish"), async (c) => {
  try {
    return c.json(ok(await publishAdminArticle(c.req.param("id"), getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.post("/articles/:id/archive", requireActiveStaff("article.publish"), async (c) => {
  try {
    return c.json(ok(await archiveAdminArticle(c.req.param("id"), getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/events", requireActiveStaff("event.manage"), async (c) => {
  const data = await listAdminEventsV2();

  return c.json(ok(data, { total: data.length }));
});

adminRoutes.get("/events/references", requireActiveStaff("event.manage"), async (c) =>
  c.json(
    ok({
      references: await getAdminEventReferencesV2()
    })
  )
);

adminRoutes.post("/events", requireActiveStaff("event.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminEventInputV2(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await createAdminEventV2(result.data, getAuditActor(c))), 201);
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/events/:id", requireActiveStaff("event.manage"), async (c) => {
  const event = await getAdminEventV2(c.req.param("id"));

  if (!event) {
    return jsonError(c, 404, "NOT_FOUND", "活动不存在。");
  }

  return c.json(ok(event));
});

adminRoutes.patch("/events/:id", requireActiveStaff("event.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminEventInputV2(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminEventV2(c.req.param("id"), result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.post("/events/:id/publish", requireActiveStaff("event.manage"), async (c) => {
  try {
    return c.json(ok(await publishAdminEventV2(c.req.param("id"), getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.post("/events/:id/archive", requireActiveStaff("event.manage"), async (c) => {
  try {
    return c.json(ok(await archiveAdminEventV2(c.req.param("id"), getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/events/:id/registrations", requireActiveStaff("registration.review"), async (c) => {
  try {
    return c.json(ok(await listAdminEventRegistrationsV2(c.req.param("id"))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/registrations/:id", requireActiveStaff("registration.review"), async (c) => {
  try {
    const registration = await getAdminEventRegistrationV2(c.req.param("id"));

    if (!registration) {
      return jsonError(c, 404, "NOT_FOUND", "报名记录不存在。");
    }

    return c.json(ok(registration));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.patch("/registrations/:id", requireActiveStaff("registration.review"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminEventRegistrationInputV2(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminEventRegistrationV2(c.req.param("id"), result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/applications", requireActiveStaff("application.review"), async (c) => {
  const data = await listAdminJoinApplications();

  return c.json(ok(data, { total: data.length }));
});

adminRoutes.get("/applications/:id", requireActiveStaff("application.review"), async (c) => {
  const application = await getAdminJoinApplication(c.req.param("id"));

  if (!application) {
    return jsonError(c, 404, "NOT_FOUND", "申请记录不存在。");
  }

  return c.json(ok(application));
});

adminRoutes.patch("/applications/:id", requireActiveStaff("application.review"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminJoinApplicationUpdateInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminJoinApplication(c.req.param("id"), result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/members", requireActiveStaff("member.manage"), async (c) => {
  const data = await listAdminMembers();

  return c.json(ok(data, { total: data.length }));
});

adminRoutes.post("/members", requireActiveStaff("member.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminMemberInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await createAdminMember(result.data, getAuditActor(c))), 201);
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/members/:id", requireActiveStaff("member.manage"), async (c) => {
  const member = await getAdminMember(c.req.param("id"));

  if (!member) {
    return jsonError(c, 404, "NOT_FOUND", "成员不存在。");
  }

  return c.json(ok(member));
});

adminRoutes.patch("/members/:id", requireActiveStaff("member.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminMemberInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminMember(c.req.param("id"), result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/branches", requireActiveStaff("branch.manage"), async (c) => {
  const data = await listAdminBranches();

  return c.json(ok(data, { total: data.length }));
});

adminRoutes.post("/branches", requireActiveStaff("branch.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminBranchInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await createAdminBranch(result.data, getAuditActor(c))), 201);
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/branches/:id", requireActiveStaff("branch.manage"), async (c) => {
  const branch = await getAdminBranch(c.req.param("id"));

  if (!branch) {
    return jsonError(c, 404, "NOT_FOUND", "分会不存在。");
  }

  return c.json(ok(branch));
});

adminRoutes.patch("/branches/:id", requireActiveStaff("branch.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminBranchInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminBranch(c.req.param("id"), result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/homepage", requireActiveStaff("page.manage"), async (c) => c.json(ok(await getAdminHomepage())));

adminRoutes.patch("/homepage", requireActiveStaff("page.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminHomepageInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminHomepage(result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/pages/:slug", requireActiveStaff("page.manage"), async (c) => {
  const slug = c.req.param("slug");

  if (slug !== "join" && slug !== "about") {
    return jsonError(c, 404, "NOT_FOUND", "页面不存在。");
  }

  return c.json(ok(await getAdminSitePage(slug)));
});

adminRoutes.patch("/pages/:slug", requireActiveStaff("page.manage"), async (c) => {
  const slug = c.req.param("slug");

  if (slug !== "join" && slug !== "about") {
    return jsonError(c, 404, "NOT_FOUND", "页面不存在。");
  }

  const payload = await c.req.json().catch(() => null);
  const result = validateAdminSitePageInputV2(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminSitePage(slug, result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/assets", requireActiveStaff("asset.manage"), async (c) => {
  const data = await listAdminAssets();

  return c.json(ok(data, { total: data.length }));
});

adminRoutes.post("/assets/uploads", requireActiveStaff("asset.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminAssetUploadIntentInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await createAdminAssetUploadIntent(result.data, getStaffAccountId(c))), 201);
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.post("/assets/uploads/complete", requireActiveStaff("asset.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminAssetUploadCompleteInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await completeAdminAssetUpload(result.data, getAuditActor(c))), 201);
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/audit-logs", requireActiveStaff("audit_log.read"), async (c) => {
  const data = await listAdminAuditLogs();

  return c.json(ok(data, { total: data.length }));
});

adminRoutes.get("/staff", requireActiveStaff("staff.manage"), async (c) => c.json(ok(await listAdminStaff())));

adminRoutes.post("/staff", requireActiveStaff("staff.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminStaffCreateInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await createAdminStaff(result.data, getAuditActor(c))), 201);
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.patch("/staff/:id", requireActiveStaff("staff.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminStaffUpdateInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminStaff(c.req.param("id"), result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/roles", requireActiveStaff("role.manage"), async (c) => c.json(ok(await listAdminRoles())));

adminRoutes.patch("/roles/:id", requireActiveStaff("role.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminRoleInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminRole(c.req.param("id"), result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});
