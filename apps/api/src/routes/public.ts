import {
  articleSummaries,
  citySummaries,
  eventSummaries,
  getArticleDetail,
  getCityDetail,
  getEventDetail,
  getTopicDetail,
  homePayload,
  siteConfig,
  topicSummaries,
  validatePublicApplicationInput,
  validatePublicEventRegistrationInput,
  type PublicEventRegistrationReceipt,
  type PublicApplicationReceipt
} from "@tgo/shared";
import { Hono } from "hono";
import type { Context } from "hono";

import { getEnv } from "../lib/env.js";
import { jsonError } from "../lib/errors.js";
import { ok } from "../lib/http.js";
import { getPublicSiteConfigFromDb } from "../lib/platform-config.js";
import {
  createPublicApplicationFromDb,
  createPublicEventRegistrationFromDb,
  getArticleDetailFromDb,
  getCityDetailFromDb,
  getEventDetailFromDb,
  getHomePayloadFromDb,
  PublicContentError,
  getTopicDetailFromDb,
  listArticleSummariesFromDb,
  listCitySummariesFromDb,
  listEventSummariesFromDb,
  listTopicSummariesFromDb
} from "../lib/public-content.js";
import { checkRateLimit, type RateLimitDecision } from "../lib/rate-limit.js";

export const publicRoutes = new Hono();

const setRateLimitHeaders = (c: Context, decision: RateLimitDecision) => {
  c.header("X-RateLimit-Limit", String(decision.limit));
  c.header("X-RateLimit-Remaining", String(decision.remaining));
  c.header("X-RateLimit-Reset", decision.resetAt);
};

const getRequesterKey = (c: Context) => {
  const forwardedFor = c.req.header("x-forwarded-for");
  const requestIp = forwardedFor?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "anonymous";
  const userAgent = c.req.header("user-agent") ?? "unknown";

  return `${requestIp}:${userAgent}`;
};

const enforcePublicWriteRateLimit = (c: Context, scope: "applications" | "event-registrations") => {
  const env = getEnv();
  const limit =
    scope === "applications" ? env.publicApplicationRateLimitMax : env.publicEventRegistrationRateLimitMax;
  const decision = checkRateLimit({
    scope,
    key: getRequesterKey(c),
    limit,
    windowMs: env.publicWriteRateLimitWindowSeconds * 1000
  });

  setRateLimitHeaders(c, decision);

  if (decision.allowed) {
    return null;
  }

  c.header("Retry-After", String(decision.retryAfterSeconds));

  return jsonError(c, 429, "RATE_LIMITED", "Too many write requests. Please retry later.", {
    limit,
    windowSeconds: env.publicWriteRateLimitWindowSeconds,
    retryAfterSeconds: decision.retryAfterSeconds
  });
};

publicRoutes.get("/site-config", async (c) => {
  try {
    return c.json(ok(await getPublicSiteConfigFromDb()));
  } catch {
    return c.json(ok(siteConfig));
  }
});

publicRoutes.get("/home", async (c) => c.json(ok((await getHomePayloadFromDb()) ?? homePayload)));

publicRoutes.get("/topics", async (c) => {
  const data = (await listTopicSummariesFromDb()) ?? topicSummaries;

  return c.json(ok(data, { total: data.length }));
});

publicRoutes.get("/topics/:slug", async (c) => {
  const topicFromDb = await getTopicDetailFromDb(c.req.param("slug"));
  const topic = topicFromDb === undefined ? getTopicDetail(c.req.param("slug")) : topicFromDb;

  if (!topic) {
    return jsonError(c, 404, "NOT_FOUND", "Topic not found.");
  }

  return c.json(ok(topic));
});

publicRoutes.get("/articles", async (c) => {
  const data = (await listArticleSummariesFromDb()) ?? articleSummaries;

  return c.json(ok(data, { total: data.length }));
});

publicRoutes.get("/articles/:slug", async (c) => {
  const articleFromDb = await getArticleDetailFromDb(c.req.param("slug"));
  const article = articleFromDb === undefined ? getArticleDetail(c.req.param("slug")) : articleFromDb;

  if (!article) {
    return jsonError(c, 404, "NOT_FOUND", "Article not found.");
  }

  return c.json(ok(article));
});

publicRoutes.get("/events", async (c) => {
  const data = (await listEventSummariesFromDb()) ?? eventSummaries;

  return c.json(ok(data, { total: data.length }));
});

publicRoutes.get("/events/:slug", async (c) => {
  const eventFromDb = await getEventDetailFromDb(c.req.param("slug"));
  const event = eventFromDb === undefined ? getEventDetail(c.req.param("slug")) : eventFromDb;

  if (!event) {
    return jsonError(c, 404, "NOT_FOUND", "Event not found.");
  }

  return c.json(ok(event));
});

publicRoutes.post("/events/:eventId/registrations", async (c) => {
  const rateLimitResponse = enforcePublicWriteRateLimit(c, "event-registrations");

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const payload = await c.req.json().catch(() => null);
  const result = validatePublicEventRegistrationInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
      issues: result.issues
    });
  }

  try {
    const receipt =
      (await createPublicEventRegistrationFromDb(c.req.param("eventId"), result.data)) ??
      (() => {
        const event = getEventDetail(c.req.param("eventId"));

        if (!event) {
          throw new PublicContentError(404, "NOT_FOUND", "Event not found.");
        }

        if (event.registrationState !== "open" && event.registrationState !== "waitlist") {
          throw new PublicContentError(409, "REGISTRATION_CLOSED", "Event registration is not currently open.");
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
            ...(result.data.email ? { email: result.data.email } : {}),
            ...(result.data.phoneNumber ? { phoneNumber: result.data.phoneNumber } : {}),
            ...(result.data.company ? { company: result.data.company } : {}),
            ...(result.data.jobTitle ? { jobTitle: result.data.jobTitle } : {})
          }
        } satisfies PublicEventRegistrationReceipt;
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

publicRoutes.get("/cities", async (c) => {
  const data = (await listCitySummariesFromDb()) ?? citySummaries;

  return c.json(ok(data, { total: data.length }));
});

publicRoutes.get("/cities/:slug", async (c) => {
  const cityFromDb = await getCityDetailFromDb(c.req.param("slug"));
  const city = cityFromDb === undefined ? getCityDetail(c.req.param("slug")) : cityFromDb;

  if (!city) {
    return jsonError(c, 404, "NOT_FOUND", "City not found.");
  }

  return c.json(ok(city));
});

publicRoutes.post("/applications", async (c) => {
  const rateLimitResponse = enforcePublicWriteRateLimit(c, "applications");

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const payload = await c.req.json().catch(() => null);
  const result = validatePublicApplicationInput(payload);

  if (!result.valid) {
    return jsonError(c, 400, "VALIDATION_ERROR", "One or more fields are invalid.", {
      issues: result.issues
    });
  }

  const receipt = (await createPublicApplicationFromDb(result.data)) ??
    ({
      id: `demo_${Date.now()}`,
      receivedAt: new Date().toISOString(),
      type: result.data.type,
      applicant: {
        name: result.data.name,
        email: result.data.email,
        ...(result.data.company ? { company: result.data.company } : {}),
        ...(result.data.city ? { city: result.data.city } : {})
      }
    } satisfies PublicApplicationReceipt);

  return c.json(ok(receipt), 201);
});
