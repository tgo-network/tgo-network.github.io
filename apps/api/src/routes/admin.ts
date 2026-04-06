import {
  implementationMilestones,
  type AdminArticleListMeta,
  type AdminAssetListMeta,
  type AdminAuditLogListMeta,
  type AdminBranchListMeta,
  type AdminMePayload,
  type AdminEventListQueryV2,
  type AdminEventRegistrationListMetaV2,
  type AdminJoinApplicationListMeta,
  type AdminMemberListMeta,
  type AdminRolesListMeta,
  type AdminStaffListMeta,
  type PaginationMeta,
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

const getQueryValue = (c: AdminContext, key: string) => c.req.query(key)?.trim() ?? "";

const getPositiveIntQuery = (c: AdminContext, key: string) => {
  const value = Number.parseInt(getQueryValue(c, key), 10);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : undefined;
};

const defaultAdminListPageSize = 20;
const maxAdminListPageSize = 100;

type AdminListPagination = {
  page: number;
  pageSize: number;
};

const getListPagination = (c: AdminContext): AdminListPagination | null => {
  const page = getPositiveIntQuery(c, "page");
  const pageSize = getPositiveIntQuery(c, "pageSize");

  if (page === undefined && pageSize === undefined) {
    return null;
  }

  return {
    page: page ?? 1,
    pageSize: Math.min(pageSize ?? defaultAdminListPageSize, maxAdminListPageSize)
  };
};

const buildPaginationMeta = (total: number, pagination: AdminListPagination | null): PaginationMeta => {
  if (!pagination) {
    return {
      total,
      page: 1,
      pageSize: total > 0 ? total : defaultAdminListPageSize,
      pageCount: 1
    };
  }

  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));
  const page = Math.min(pagination.page, pageCount);

  return {
    total,
    page,
    pageSize: pagination.pageSize,
    pageCount
  };
};

const paginateItems = <T>(items: T[], pagination: AdminListPagination | null) => {
  const meta = buildPaginationMeta(items.length, pagination);

  if (!pagination) {
    return {
      data: items,
      meta
    };
  }

  const start = (meta.page - 1) * meta.pageSize;

  return {
    data: items.slice(start, start + meta.pageSize),
    meta
  };
};

const uniqueSortedValues = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))).sort((left, right) =>
    left.localeCompare(right, "zh-CN")
  );

const getAdminEventListQuery = (c: AdminContext): AdminEventListQueryV2 => ({
  page: getPositiveIntQuery(c, "page"),
  pageSize: getPositiveIntQuery(c, "pageSize"),
  q: getQueryValue(c, "q") || undefined,
  status: (getQueryValue(c, "status") || undefined) as AdminEventListQueryV2["status"],
  registrationState: (getQueryValue(c, "registrationState") || undefined) as AdminEventListQueryV2["registrationState"],
  branchId: (getQueryValue(c, "branchId") || undefined) as AdminEventListQueryV2["branchId"]
});

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
  const pagination = getListPagination(c);
  const query = getQueryValue(c, "q").toLowerCase();
  const status = getQueryValue(c, "status") || "all";
  const branch = getQueryValue(c, "branch") || "all";
  const rows = await listAdminArticles();
  const branchOptions = uniqueSortedValues(rows.map((row) => row.branchName));
  const filtered = rows.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      [row.title, row.slug, row.authorName ?? "", row.branchName ?? ""].some((value) => value.toLowerCase().includes(query));
    const matchesStatus = status === "all" || row.status === status;
    const matchesBranch = branch === "all" || row.branchName === branch;

    return matchesQuery && matchesStatus && matchesBranch;
  });
  const result = paginateItems(filtered, pagination);
  const meta: AdminArticleListMeta = {
    ...result.meta,
    branchOptions,
    stats: {
      published: rows.filter((row) => row.status === "published").length
    }
  };

  return c.json(ok(result.data, meta));
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
  const result = await listAdminEventsV2(getAdminEventListQuery(c));

  return c.json(ok(result.data, result.meta));
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
    const pagination = getListPagination(c);
    const payload = await listAdminEventRegistrationsV2(c.req.param("id"));
    const result = paginateItems(payload.registrations, pagination);
    const meta: AdminEventRegistrationListMetaV2 = {
      ...result.meta,
      reviewedCount: payload.registrations.filter((row) => Boolean(row.reviewedAt)).length,
      pendingCount: payload.registrations.filter((row) => !row.reviewedAt).length
    };

    return c.json(
      ok(
        {
          ...payload,
          registrations: result.data
        },
        meta
      )
    );
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
  const pagination = getListPagination(c);
  const query = getQueryValue(c, "q").toLowerCase();
  const status = getQueryValue(c, "status") || "all";
  const branch = getQueryValue(c, "branch") || "all";
  const rows = await listAdminJoinApplications();
  const branchOptions = uniqueSortedValues(rows.map((row) => row.targetBranchName));
  const filtered = rows.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      [row.name, row.phoneNumber, row.wechatId || "", row.email || "", row.targetBranchName || ""].some((value) =>
        value.toLowerCase().includes(query)
      );
    const matchesStatus = status === "all" || row.status === status;
    const matchesBranch = branch === "all" || row.targetBranchName === branch;

    return matchesQuery && matchesStatus && matchesBranch;
  });
  const result = paginateItems(filtered, pagination);
  const meta: AdminJoinApplicationListMeta = {
    ...result.meta,
    branchOptions,
    stats: {
      pending: rows.filter((row) => row.status === "submitted" || row.status === "in_review").length
    }
  };

  return c.json(ok(result.data, meta));
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
  const pagination = getListPagination(c);
  const query = getQueryValue(c, "q").toLowerCase();
  const membershipStatus = getQueryValue(c, "membershipStatus") || "all";
  const visibility = getQueryValue(c, "visibility") || "all";
  const branch = getQueryValue(c, "branch") || "all";
  const rows = await listAdminMembers();
  const branchOptions = uniqueSortedValues(rows.map((row) => row.branchName));
  const filtered = rows.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      [row.name, row.slug, row.company, row.title, row.branchName || ""].some((value) => value.toLowerCase().includes(query));
    const matchesMembership = membershipStatus === "all" || row.membershipStatus === membershipStatus;
    const matchesVisibility = visibility === "all" || row.visibility === visibility;
    const matchesBranch = branch === "all" || row.branchName === branch;

    return matchesQuery && matchesMembership && matchesVisibility && matchesBranch;
  });
  const result = paginateItems(filtered, pagination);
  const meta: AdminMemberListMeta = {
    ...result.meta,
    branchOptions,
    stats: {
      active: rows.filter((row) => row.membershipStatus === "active").length,
      public: rows.filter((row) => row.visibility === "public").length
    }
  };

  return c.json(ok(result.data, meta));
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
  const pagination = getListPagination(c);
  const query = getQueryValue(c, "q").toLowerCase();
  const status = getQueryValue(c, "status") || "all";
  const region = getQueryValue(c, "region") || "all";
  const rows = await listAdminBranches();
  const regionOptions = uniqueSortedValues(rows.map((row) => row.region));
  const filtered = rows.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      [row.name, row.slug, row.cityName, row.region].some((value) => value.toLowerCase().includes(query));
    const matchesStatus = status === "all" || row.status === status;
    const matchesRegion = region === "all" || row.region === region;

    return matchesQuery && matchesStatus && matchesRegion;
  });
  const result = paginateItems(filtered, pagination);
  const meta: AdminBranchListMeta = {
    ...result.meta,
    regionOptions,
    stats: {
      published: rows.filter((row) => row.status === "published").length
    }
  };

  return c.json(ok(result.data, meta));
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
  const pagination = getListPagination(c);
  const query = getQueryValue(c, "q").toLowerCase();
  const assetType = getQueryValue(c, "assetType") || "all";
  const visibility = getQueryValue(c, "visibility") || "all";
  const status = getQueryValue(c, "status") || "all";
  const rows = await listAdminAssets();
  const filtered = rows.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      [
        row.originalFilename,
        row.objectKey,
        row.altText,
        row.mimeType,
        row.assetType,
        row.visibility,
        row.status
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesAssetType = assetType === "all" || row.assetType === assetType;
    const matchesVisibility = visibility === "all" || row.visibility === visibility;
    const matchesStatus = status === "all" || row.status === status;

    return matchesQuery && matchesAssetType && matchesVisibility && matchesStatus;
  });
  const result = paginateItems(filtered, pagination);
  const meta: AdminAssetListMeta = {
    ...result.meta,
    stats: {
      public: rows.filter((row) => row.visibility === "public").length,
      private: rows.filter((row) => row.visibility === "private").length,
      active: rows.filter((row) => row.status === "active").length
    }
  };

  return c.json(ok(result.data, meta));
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
  const pagination = getListPagination(c);
  const query = getQueryValue(c, "q").toLowerCase();
  const targetType = getQueryValue(c, "targetType") || "all";
  const action = getQueryValue(c, "action") || "all";
  const actionFamily = getQueryValue(c, "actionFamily") || "all";
  const rows = await listAdminAuditLogs(pagination ? undefined : 50);
  const filtered = rows.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      [row.action, row.targetType, row.actor.name ?? "", row.actor.email ?? "", row.targetId ?? ""].some((value) =>
        value.toLowerCase().includes(query)
      );
    const matchesTargetType = targetType === "all" || row.targetType === targetType;
    const matchesAction = action === "all" || row.action === action;
    const matchesActionFamily = actionFamily === "all" || row.action.endsWith(`.${actionFamily}`);

    return matchesQuery && matchesTargetType && matchesAction && matchesActionFamily;
  });
  const result = paginateItems(filtered, pagination);
  const meta: AdminAuditLogListMeta = {
    ...result.meta,
    targetTypeOptions: uniqueSortedValues(rows.map((row) => row.targetType)),
    actionOptions: uniqueSortedValues(rows.map((row) => row.action))
  };

  return c.json(ok(result.data, meta));
});

adminRoutes.get("/staff", requireActiveStaff("staff.manage"), async (c) => {
  const pagination = getListPagination(c);
  const status = getQueryValue(c, "status") || "all";
  const roleId = getQueryValue(c, "roleId") || "all";
  const payload = await listAdminStaff();
  const filtered = payload.staff.filter((row) => {
    const matchesStatus = status === "all" || row.status === status;
    const matchesRole = roleId === "all" || row.roles.some((role) => role.id === roleId);

    return matchesStatus && matchesRole;
  });
  const result = paginateItems(filtered, pagination);
  const meta: AdminStaffListMeta = {
    ...result.meta,
    stats: {
      active: payload.staff.filter((row) => row.status === "active").length,
      suspended: payload.staff.filter((row) => row.status === "suspended").length,
      disabled: payload.staff.filter((row) => row.status === "disabled").length
    }
  };

  return c.json(
    ok(
      {
        ...payload,
        staff: result.data
      },
      meta
    )
  );
});

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

adminRoutes.get("/roles", requireActiveStaff("role.manage"), async (c) => {
  const pagination = getListPagination(c);
  const scope = getQueryValue(c, "scope") || "all";
  const payload = await listAdminRoles();
  const filtered = payload.roles.filter(
    (role) =>
      scope === "all" ||
      (scope === "system" && role.isSystem) ||
      (scope === "assigned" && role.assignedStaffCount > 0) ||
      (scope === "empty" && role.permissionIds.length === 0)
  );
  const result = paginateItems(filtered, pagination);
  const meta: AdminRolesListMeta = {
    ...result.meta,
    stats: {
      system: payload.roles.filter((role) => role.isSystem).length,
      assigned: payload.roles.filter((role) => role.assignedStaffCount > 0).length
    }
  };

  return c.json(
    ok(
      {
        ...payload,
        roles: result.data
      },
      meta
    )
  );
});

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
