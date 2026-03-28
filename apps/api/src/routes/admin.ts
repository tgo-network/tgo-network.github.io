import {
  implementationMilestones,
  type AdminMePayload,
  validateAdminApplicationInput,
  validateAdminAssetUploadCompleteInput,
  validateAdminAssetUploadIntentInput,
  validateAdminArticleInput,
  validateAdminEventInput,
  validateAdminEventRegistrationInput,
  validateAdminFeaturedBlockInput,
  validateAdminRoleInput,
  validateAdminSiteSettingsInput,
  validateAdminStaffCreateInput,
  validateAdminStaffUpdateInput,
  validateAdminTopicInput
} from "@tgo/shared";
import { Hono, type Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import {
  AdminContentError,
  archiveAdminArticle,
  archiveAdminEvent,
  archiveAdminTopic,
  completeAdminAssetUpload,
  createAdminArticle,
  createAdminAssetUploadIntent,
  createAdminEvent,
  createAdminTopic,
  getAdminEventRegistration,
  getAdminApplication,
  getAdminArticle,
  getAdminArticleReferencesPayload,
  getAdminEvent,
  getAdminEventReferencesPayload,
  getAdminTopic,
  listAdminApplications,
  listAdminAssets,
  listAdminArticles,
  listAdminEvents,
  listAdminEventRegistrations,
  listAdminTopics,
  publishAdminArticle,
  publishAdminEvent,
  publishAdminTopic,
  updateAdminApplication,
  updateAdminArticle,
  updateAdminEvent,
  updateAdminEventRegistration,
  updateAdminTopic
} from "../lib/admin-content.js";
import {
  createAdminStaff,
  listAdminRoles,
  listAdminStaff,
  updateAdminRole,
  updateAdminStaff
} from "../lib/admin-staff.js";
import { getDashboardStats } from "../lib/access.js";
import { listAdminAuditLogs } from "../lib/audit.js";
import { jsonError } from "../lib/errors.js";
import { ok } from "../lib/http.js";
import {
  getAdminHomepageFeaturedBlock,
  getAdminSiteSettings,
  updateAdminHomepageFeaturedBlock,
  updateAdminSiteSettings
} from "../lib/platform-config.js";
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
    throw new AdminContentError(403, "FORBIDDEN", "Active staff access is required.");
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
      stats: await getDashboardStats()
    })
  )
);

adminRoutes.get("/topics", requireActiveStaff("topic.manage"), async (c) => {
  const data = await listAdminTopics();

  return c.json(ok(data, { total: data.length }));
});

adminRoutes.post("/topics", requireActiveStaff("topic.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminTopicInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await createAdminTopic(result.data, getAuditActor(c))), 201);
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/topics/:id", requireActiveStaff("topic.manage"), async (c) => {
  const topic = await getAdminTopic(c.req.param("id"));

  if (!topic) {
    return jsonError(c, 404, "NOT_FOUND", "Topic not found.");
  }

  return c.json(ok(topic));
});

adminRoutes.patch("/topics/:id", requireActiveStaff("topic.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminTopicInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminTopic(c.req.param("id"), result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.post("/topics/:id/publish", requireActiveStaff("topic.manage"), async (c) => {
  try {
    return c.json(ok(await publishAdminTopic(c.req.param("id"), getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.post("/topics/:id/archive", requireActiveStaff("topic.manage"), async (c) => {
  try {
    return c.json(ok(await archiveAdminTopic(c.req.param("id"), getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

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
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
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
    return jsonError(c, 404, "NOT_FOUND", "Article not found.");
  }

  return c.json(ok(article));
});

adminRoutes.patch("/articles/:id", requireActiveStaff("article.write"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminArticleInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
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
  const data = await listAdminEvents();

  return c.json(ok(data, { total: data.length }));
});

adminRoutes.get("/events/references", requireActiveStaff("event.manage"), async (c) =>
  c.json(ok(await getAdminEventReferencesPayload()))
);

adminRoutes.post("/events", requireActiveStaff("event.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminEventInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await createAdminEvent(result.data, getAuditActor(c))), 201);
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/events/:id", requireActiveStaff("event.manage"), async (c) => {
  const event = await getAdminEvent(c.req.param("id"));

  if (!event) {
    return jsonError(c, 404, "NOT_FOUND", "Event not found.");
  }

  return c.json(ok(event));
});

adminRoutes.patch("/events/:id", requireActiveStaff("event.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminEventInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminEvent(c.req.param("id"), result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.post("/events/:id/publish", requireActiveStaff("event.manage"), async (c) => {
  try {
    return c.json(ok(await publishAdminEvent(c.req.param("id"), getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.post("/events/:id/archive", requireActiveStaff("event.manage"), async (c) => {
  try {
    return c.json(ok(await archiveAdminEvent(c.req.param("id"), getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/events/:id/registrations", requireActiveStaff("registration.read"), async (c) => {
  try {
    return c.json(ok(await listAdminEventRegistrations(c.req.param("id"))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/registrations/:id", requireActiveStaff("registration.read"), async (c) => {
  try {
    const registration = await getAdminEventRegistration(c.req.param("id"));

    if (!registration) {
      return jsonError(c, 404, "NOT_FOUND", "Registration not found.");
    }

    return c.json(ok(registration));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.patch("/registrations/:id", requireActiveStaff("registration.read"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminEventRegistrationInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminEventRegistration(c.req.param("id"), result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/applications", requireActiveStaff("application.review"), async (c) => {
  const data = await listAdminApplications();

  return c.json(ok(data, { total: data.length }));
});

adminRoutes.get("/applications/:id", requireActiveStaff("application.review"), async (c) => {
  const application = await getAdminApplication(c.req.param("id"));

  if (!application) {
    return jsonError(c, 404, "NOT_FOUND", "Application not found.");
  }

  return c.json(ok(application));
});

adminRoutes.patch("/applications/:id", requireActiveStaff("application.review"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminApplicationInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminApplication(c.req.param("id"), result.data, getAuditActor(c))));
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
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
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
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
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
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
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
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
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
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminRole(c.req.param("id"), result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/featured-blocks/homepage", requireActiveStaff("featured_block.manage"), async (c) =>
  c.json(ok(await getAdminHomepageFeaturedBlock()))
);

adminRoutes.patch("/featured-blocks/homepage", requireActiveStaff("featured_block.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminFeaturedBlockInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminHomepageFeaturedBlock(result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});

adminRoutes.get("/site-settings", requireActiveStaff("settings.manage"), async (c) =>
  c.json(ok(await getAdminSiteSettings()))
);

adminRoutes.patch("/site-settings", requireActiveStaff("settings.manage"), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const result = validateAdminSiteSettingsInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
      issues: result.issues
    });
  }

  try {
    return c.json(ok(await updateAdminSiteSettings(result.data, getAuditActor(c))));
  } catch (error) {
    return handleAdminError(c, error);
  }
});
