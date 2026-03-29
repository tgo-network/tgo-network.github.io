import {
  aboutPagePayload,
  branchDetails,
  getBranchDetail,
  getMemberDetail,
  getPublicArticleDetailV2,
  getPublicEventDetailV2,
  joinPagePayload,
  memberSummaries,
  publicArticleSummariesV2,
  publicEventSummariesV2,
  publicHomePayloadV2,
  siteConfig,
  validateJoinApplicationInput,
  validatePublicEventRegistrationInputV2,
  type JoinApplicationReceipt,
  type MemberSummary,
  type PublicEventRegistrationReceiptV2,
  type PublicEventSummaryV2
} from "@tgo/shared";
import { Hono } from "hono";
import type { Context } from "hono";

import { getEnv } from "../lib/env.js";
import { jsonError } from "../lib/errors.js";
import { ok } from "../lib/http.js";
import {
  createJoinApplicationFromDb,
  getArticleDetailV2FromDb,
  createPublicEventRegistrationV2FromDb,
  getAboutPageFromDb,
  getEventDetailV2FromDb,
  getHomePayloadV2FromDb,
  getJoinPageFromDb,
  getMemberDetailFromDb,
  listArticlesV2FromDb,
  listBranchesFromDb,
  listEventsV2FromDb,
  listMembersFromDb
} from "../lib/network-public.js";
import { getPublicSiteConfigFromDb } from "../lib/platform-config.js";
import { PublicContentError } from "../lib/public-content.js";
import { checkRateLimit, type RateLimitDecision } from "../lib/rate-limit.js";

export const publicRoutes = new Hono();

const setRateLimitHeaders = (c: Context, decision: RateLimitDecision) => {
  c.header("X-RateLimit-Limit", String(decision.limit));
  c.header("X-RateLimit-Remaining", String(decision.remaining));
  c.header("X-RateLimit-Reset", decision.resetAt);
};

const getRequesterContext = (c: Context) => {
  const forwardedFor = c.req.header("x-forwarded-for");
  const requestIp = forwardedFor?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "anonymous";
  const userAgent = c.req.header("user-agent") ?? "unknown";

  return {
    requestIp,
    userAgent,
    key: `${requestIp}:${userAgent}`
  };
};

const getQueryValue = (c: Context, key: string) => c.req.query(key)?.trim() ?? "";

const enforcePublicWriteRateLimit = (c: Context, scope: "applications" | "event-registrations") => {
  const env = getEnv();
  const limit =
    scope === "applications" ? env.publicApplicationRateLimitMax : env.publicEventRegistrationRateLimitMax;
  const decision = checkRateLimit({
    scope,
    key: getRequesterContext(c).key,
    limit,
    windowMs: env.publicWriteRateLimitWindowSeconds * 1000
  });

  setRateLimitHeaders(c, decision);

  if (decision.allowed) {
    return null;
  }

  c.header("Retry-After", String(decision.retryAfterSeconds));

  return jsonError(c, 429, "RATE_LIMITED", "写入请求过于频繁，请稍后再试。", {
    limit,
    windowSeconds: env.publicWriteRateLimitWindowSeconds,
    retryAfterSeconds: decision.retryAfterSeconds
  });
};

const matchesKeyword = (keyword: string, ...fields: Array<string | null | undefined>) => {
  if (!keyword) {
    return true;
  }

  const normalized = keyword.toLowerCase();
  return fields.some((field) => field?.toLowerCase().includes(normalized));
};

const filterMembers = (members: MemberSummary[], c: Context) => {
  const keyword = getQueryValue(c, "q").toLowerCase();
  const branchSlug = getQueryValue(c, "branchSlug").toLowerCase();
  const city = getQueryValue(c, "city").toLowerCase();

  return members.filter((member) => {
    const branch = member.branch;

    if (branchSlug && branch?.slug.toLowerCase() !== branchSlug) {
      return false;
    }

    if (city && branch?.cityName.toLowerCase() !== city) {
      return false;
    }

    return matchesKeyword(keyword, member.name, member.company, member.title, branch?.name, branch?.cityName);
  });
};

const filterEvents = (events: PublicEventSummaryV2[], c: Context) => {
  const branchSlug = getQueryValue(c, "branchSlug").toLowerCase();
  const city = getQueryValue(c, "city").toLowerCase();
  const upcoming = getQueryValue(c, "upcoming").toLowerCase() === "true";
  const now = Date.now();

  return events.filter((event) => {
    if (branchSlug && event.branch?.slug.toLowerCase() !== branchSlug) {
      return false;
    }

    if (city && event.branch?.cityName.toLowerCase() !== city) {
      return false;
    }

    if (upcoming) {
      const endsAt = Date.parse(event.endsAt || event.startsAt);
      if (!Number.isNaN(endsAt) && endsAt < now) {
        return false;
      }
    }

    return true;
  });
};

publicRoutes.get("/site-config", async (c) => {
  try {
    return c.json(ok(await getPublicSiteConfigFromDb()));
  } catch {
    return c.json(ok(siteConfig));
  }
});

publicRoutes.get("/home", async (c) => c.json(ok((await getHomePayloadV2FromDb()) ?? publicHomePayloadV2)));

publicRoutes.get("/branches", async (c) => {
  const data = (await listBranchesFromDb()) ?? branchDetails;

  return c.json(ok(data, { total: data.length }));
});

publicRoutes.get("/branches/:slug", async (c) => {
  const branchRows = await listBranchesFromDb();
  const branch = branchRows === undefined ? getBranchDetail(c.req.param("slug")) : branchRows.find((item) => item.slug === c.req.param("slug")) ?? null;

  if (!branch) {
    return jsonError(c, 404, "NOT_FOUND", "分会不存在。");
  }

  return c.json(ok(branch));
});

publicRoutes.get("/members", async (c) => {
  const data = filterMembers((await listMembersFromDb()) ?? memberSummaries, c);

  return c.json(ok(data, { total: data.length }));
});

publicRoutes.get("/members/:slug", async (c) => {
  const memberFromDb = await getMemberDetailFromDb(c.req.param("slug"));
  const member = memberFromDb === undefined ? getMemberDetail(c.req.param("slug")) : memberFromDb;

  if (!member) {
    return jsonError(c, 404, "NOT_FOUND", "成员不存在。");
  }

  return c.json(ok(member));
});

publicRoutes.get("/join", async (c) => c.json(ok((await getJoinPageFromDb()) ?? joinPagePayload)));

publicRoutes.get("/about", async (c) => c.json(ok((await getAboutPageFromDb()) ?? aboutPagePayload)));

publicRoutes.get("/articles", async (c) => {
  const data = (await listArticlesV2FromDb()) ?? publicArticleSummariesV2;

  return c.json(ok(data, { total: data.length }));
});

publicRoutes.get("/articles/:slug", async (c) => {
  const articleFromDb = await getArticleDetailV2FromDb(c.req.param("slug"));
  const article =
    articleFromDb === undefined ? getPublicArticleDetailV2(c.req.param("slug")) : articleFromDb;

  if (!article) {
    return jsonError(c, 404, "NOT_FOUND", "文章不存在。");
  }

  return c.json(ok(article));
});

publicRoutes.get("/events", async (c) => {
  const data = filterEvents((await listEventsV2FromDb()) ?? publicEventSummariesV2, c);

  return c.json(ok(data, { total: data.length }));
});

publicRoutes.get("/events/:slug", async (c) => {
  const eventFromDb = await getEventDetailV2FromDb(c.req.param("slug"));
  const event = eventFromDb === undefined ? getPublicEventDetailV2(c.req.param("slug")) : eventFromDb;

  if (!event) {
    return jsonError(c, 404, "NOT_FOUND", "活动不存在。");
  }

  return c.json(ok(event));
});

publicRoutes.post("/events/:eventId/registrations", async (c) => {
  const rateLimitResponse = enforcePublicWriteRateLimit(c, "event-registrations");

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const payload = await c.req.json().catch(() => null);
  const result = validatePublicEventRegistrationInputV2(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  try {
    const requester = getRequesterContext(c);
    const receipt =
      (await createPublicEventRegistrationV2FromDb(c.req.param("eventId"), result.data, {
        submittedIp: requester.requestIp,
        submittedUserAgent: requester.userAgent
      })) ??
      (() => {
        const event = getPublicEventDetailV2(c.req.param("eventId"));

        if (!event) {
          throw new PublicContentError(404, "NOT_FOUND", "活动不存在。");
        }

        if (event.registrationState !== "open" && event.registrationState !== "waitlist") {
          throw new PublicContentError(409, "REGISTRATION_CLOSED", "当前活动尚未开放报名。");
        }

        const status = event.registrationState === "waitlist" ? "waitlisted" : "submitted";

        return {
          id: `demo_registration_${Date.now()}`,
          receivedAt: new Date().toISOString(),
          status,
          event: {
            slug: event.slug,
            title: event.title
          },
          attendee: {
            name: result.data.name,
            phoneNumber: result.data.phoneNumber,
            ...(result.data.wechatId ? { wechatId: result.data.wechatId } : {}),
            ...(result.data.email ? { email: result.data.email } : {}),
            ...(result.data.company ? { company: result.data.company } : {}),
            ...(result.data.title ? { title: result.data.title } : {}),
            ...(result.data.note ? { note: result.data.note } : {})
          }
        } satisfies PublicEventRegistrationReceiptV2;
      })();

    return c.json(ok(receipt), 201);
  } catch (error) {
    if (error instanceof PublicContentError) {
      return jsonError(
        c,
        error.status as import("hono/utils/http-status").ContentfulStatusCode,
        error.code,
        error.message,
        error.details
      );
    }

    throw error;
  }
});

publicRoutes.post("/join-applications", async (c) => {
  const rateLimitResponse = enforcePublicWriteRateLimit(c, "applications");

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const payload = await c.req.json().catch(() => null);
  const result = validateJoinApplicationInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
      issues: result.issues
    });
  }

  const receipt =
    (await createJoinApplicationFromDb(result.data)) ??
    ({
      id: `demo_join_${Date.now()}`,
      receivedAt: new Date().toISOString(),
      applicant: {
        name: result.data.name,
        phoneNumber: result.data.phoneNumber,
        ...(result.data.wechatId ? { wechatId: result.data.wechatId } : {}),
        ...(result.data.email ? { email: result.data.email } : {})
      }
    } satisfies JoinApplicationReceipt);

  return c.json(ok(receipt), 201);
});
