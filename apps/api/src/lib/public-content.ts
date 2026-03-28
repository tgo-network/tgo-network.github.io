import { and, asc, desc, eq } from "drizzle-orm";

import {
  applications,
  assets,
  articleTopicBindings,
  articles,
  authors,
  cities,
  cityTopicBindings,
  eventSessions,
  eventRegistrations,
  eventTopicBindings,
  events,
  topics
} from "@tgo/db";
import type {
  ArticleDetail,
  ArticleSummary,
  CityDetail,
  CitySummary,
  EventDetail,
  EventRegistrationStatus,
  EventSummary,
  HomePayload,
  PublicImageAsset,
  PublicApplicationInput,
  PublicApplicationReceipt,
  PublicEventRegistrationInput,
  PublicEventRegistrationReceipt,
  TopicDetail,
  TopicSummary
} from "@tgo/shared";
import { homePayload } from "@tgo/shared";

import { getDb, isDatabaseConfigured } from "./db.js";
import { getActiveHomepageFeaturedBlockPayload } from "./platform-config.js";
import { getAssetPublicUrl } from "./storage.js";

const asIso = (value: Date | null | undefined) => (value ? value.toISOString() : null);
const asRequiredIso = (value: Date | null | undefined, fallback: string) => asIso(value) ?? fallback;
const now = () => new Date();
const toPublicImageAsset = (
  asset: typeof assets.$inferSelect | undefined,
  fallbackAlt: string
): PublicImageAsset | null => {
  if (!asset) {
    return null;
  }

  const url = getAssetPublicUrl(asset.objectKey, asset.visibility);

  if (!url) {
    return null;
  }

  return {
    url,
    alt: asset.altText?.trim() || fallbackAlt,
    width: asset.width,
    height: asset.height
  };
};

export class PublicContentError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "PublicContentError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface PublicDataset {
  citySummaries: CitySummary[];
  cityDetails: CityDetail[];
  citySummaryById: Map<string, CitySummary>;
  topicSummaries: TopicSummary[];
  topicDetails: TopicDetail[];
  topicSummaryById: Map<string, TopicSummary>;
  articleSummaries: ArticleSummary[];
  articleDetails: ArticleDetail[];
  articleSummaryById: Map<string, ArticleSummary>;
  eventSummaries: EventSummary[];
  eventDetails: EventDetail[];
  eventSummaryById: Map<string, EventSummary>;
}

const loadPublicDataset = async (): Promise<PublicDataset | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  try {
    const db = getDb();

    const [
      cityRows,
      topicRows,
      articleRows,
      authorRows,
      articleTopicRows,
      eventRows,
      eventSessionRows,
      eventTopicRows,
      cityTopicRows,
      assetRows
    ] = await Promise.all([
        db.select().from(cities).where(eq(cities.status, "published")).orderBy(asc(cities.name)),
        db.select().from(topics).where(eq(topics.status, "published")).orderBy(asc(topics.title)),
        db
          .select()
          .from(articles)
          .where(eq(articles.status, "published"))
          .orderBy(desc(articles.publishedAt), desc(articles.updatedAt)),
        db.select().from(authors).where(eq(authors.status, "active")).orderBy(asc(authors.displayName)),
        db.select().from(articleTopicBindings),
        db.select().from(events).where(eq(events.status, "published")).orderBy(asc(events.startsAt), asc(events.title)),
        db.select().from(eventSessions).orderBy(asc(eventSessions.sortOrder)),
        db.select().from(eventTopicBindings),
        db.select().from(cityTopicBindings),
        db
          .select()
          .from(assets)
          .where(and(eq(assets.status, "active"), eq(assets.visibility, "public")))
      ]);

    const cityById = new Map(cityRows.map((row) => [row.id, row]));
    const topicById = new Map(topicRows.map((row) => [row.id, row]));
    const authorById = new Map(authorRows.map((row) => [row.id, row]));
    const assetById = new Map(assetRows.map((row) => [row.id, row]));

    const articleRowsByCityId = new Map<string, typeof articleRows>();
    const eventRowsByCityId = new Map<string, typeof eventRows>();
    const articleTopicRowsByArticleId = new Map<string, typeof articleTopicRows>();
    const eventTopicRowsByEventId = new Map<string, typeof eventTopicRows>();
    const cityTopicRowsByCityId = new Map<string, typeof cityTopicRows>();
    const articleRowsByTopicId = new Map<string, typeof articleRows>();
    const eventRowsByTopicId = new Map<string, typeof eventRows>();
    const sessionRowsByEventId = new Map<string, typeof eventSessionRows>();

    for (const row of articleRows) {
      if (row.primaryCityId) {
        articleRowsByCityId.set(row.primaryCityId, [...(articleRowsByCityId.get(row.primaryCityId) ?? []), row]);
      }
    }

    for (const row of eventRows) {
      if (row.cityId) {
        eventRowsByCityId.set(row.cityId, [...(eventRowsByCityId.get(row.cityId) ?? []), row]);
      }
    }

    const articleIdSet = new Set(articleRows.map((row) => row.id));
    const eventIdSet = new Set(eventRows.map((row) => row.id));
    const cityIdSet = new Set(cityRows.map((row) => row.id));
    const topicIdSet = new Set(topicRows.map((row) => row.id));

    for (const row of articleTopicRows) {
      if (!articleIdSet.has(row.articleId) || !topicIdSet.has(row.topicId)) {
        continue;
      }

      articleTopicRowsByArticleId.set(row.articleId, [...(articleTopicRowsByArticleId.get(row.articleId) ?? []), row]);
      const article = articleRows.find((entry) => entry.id === row.articleId);
      if (article) {
        articleRowsByTopicId.set(row.topicId, [...(articleRowsByTopicId.get(row.topicId) ?? []), article]);
      }
    }

    for (const row of eventTopicRows) {
      if (!eventIdSet.has(row.eventId) || !topicIdSet.has(row.topicId)) {
        continue;
      }

      eventTopicRowsByEventId.set(row.eventId, [...(eventTopicRowsByEventId.get(row.eventId) ?? []), row]);
      const event = eventRows.find((entry) => entry.id === row.eventId);
      if (event) {
        eventRowsByTopicId.set(row.topicId, [...(eventRowsByTopicId.get(row.topicId) ?? []), event]);
      }
    }

    for (const row of cityTopicRows) {
      if (!cityIdSet.has(row.cityId) || !topicIdSet.has(row.topicId)) {
        continue;
      }

      cityTopicRowsByCityId.set(row.cityId, [...(cityTopicRowsByCityId.get(row.cityId) ?? []), row]);
    }

    for (const row of eventSessionRows) {
      if (!eventIdSet.has(row.eventId)) {
        continue;
      }

      sessionRowsByEventId.set(row.eventId, [...(sessionRowsByEventId.get(row.eventId) ?? []), row]);
    }

    const citySummaries: CitySummary[] = cityRows.map((row) => ({
      slug: row.slug,
      name: row.name,
      summary: row.summary ?? "",
      articleCount: (articleRowsByCityId.get(row.id) ?? []).length,
      eventCount: (eventRowsByCityId.get(row.id) ?? []).length,
      topicCount: (cityTopicRowsByCityId.get(row.id) ?? []).length,
      coverImage: toPublicImageAsset(assetById.get(row.coverAssetId ?? ""), `${row.name} cover image`)
    }));

    const citySummaryBySlug = new Map(citySummaries.map((row) => [row.slug, row]));
    const citySummaryById = new Map(cityRows.map((row) => [row.id, citySummaryBySlug.get(row.slug)!]));

    const topicSummaries: TopicSummary[] = topicRows.map((row) => ({
      slug: row.slug,
      title: row.title,
      summary: row.summary ?? "",
      articleCount: (articleRowsByTopicId.get(row.id) ?? []).length,
      eventCount: (eventRowsByTopicId.get(row.id) ?? []).length,
      coverImage: toPublicImageAsset(assetById.get(row.coverAssetId ?? ""), `${row.title} cover image`)
    }));

    const topicSummaryBySlug = new Map(topicSummaries.map((row) => [row.slug, row]));
    const topicSummaryById = new Map(topicRows.map((row) => [row.id, topicSummaryBySlug.get(row.slug)!]));

    const articleSummaries: ArticleSummary[] = articleRows.map((row) => {
      const citySummary = row.primaryCityId ? citySummaryById.get(row.primaryCityId) : null;
      const author = row.authorId ? authorById.get(row.authorId) : null;
      const boundTopics = (articleTopicRowsByArticleId.get(row.id) ?? [])
        .map((binding) => topicById.get(binding.topicId)?.slug)
        .filter((value): value is string => Boolean(value));

      return {
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt ?? "",
        publishedAt: asRequiredIso(row.publishedAt, row.updatedAt.toISOString()),
        authorName: author?.displayName ?? "Unknown author",
        topicSlugs: boundTopics,
        coverImage: toPublicImageAsset(assetById.get(row.coverAssetId ?? ""), `${row.title} cover image`),
        city: citySummary
          ? {
              slug: citySummary.slug,
              name: citySummary.name,
              summary: citySummary.summary
            }
          : {
              slug: "unknown",
              name: "Unknown",
              summary: ""
            }
      };
    });

    const articleSummaryBySlug = new Map(articleSummaries.map((row) => [row.slug, row]));
    const articleSummaryById = new Map(articleRows.map((row) => [row.id, articleSummaryBySlug.get(row.slug)!]));

    const eventSummaries: EventSummary[] = eventRows.map((row) => {
      const citySummary = row.cityId ? citySummaryById.get(row.cityId) : null;

      return {
        slug: row.slug,
        title: row.title,
        summary: row.summary ?? "",
        startsAt: asRequiredIso(row.startsAt, row.updatedAt.toISOString()),
        endsAt: asRequiredIso(row.endsAt, row.updatedAt.toISOString()),
        venueName: row.venueName ?? "TBD",
        coverImage: toPublicImageAsset(assetById.get(row.coverAssetId ?? ""), `${row.title} cover image`),
        registrationUrl: row.registrationUrl ?? null,
        city: citySummary
          ? {
              slug: citySummary.slug,
              name: citySummary.name,
              summary: citySummary.summary
            }
          : {
              slug: "unknown",
              name: "Unknown",
              summary: ""
            },
        registrationState: row.registrationState
      };
    });

    const eventSummaryBySlug = new Map(eventSummaries.map((row) => [row.slug, row]));
    const eventSummaryById = new Map(eventRows.map((row) => [row.id, eventSummaryBySlug.get(row.slug)!]));

    const topicDetails: TopicDetail[] = topicRows.map((row) => ({
      ...topicSummaryById.get(row.id)!,
      body: row.bodyRichtext ?? "",
      relatedArticles: (articleRowsByTopicId.get(row.id) ?? []).map((article) => articleSummaryById.get(article.id)!),
      relatedEvents: (eventRowsByTopicId.get(row.id) ?? []).map((event) => eventSummaryById.get(event.id)!)
    }));

    const articleDetails: ArticleDetail[] = articleRows.map((row) => {
      const summary = articleSummaryById.get(row.id)!;
      const citySummary = row.primaryCityId ? citySummaryById.get(row.primaryCityId) : null;
      const author = row.authorId ? authorById.get(row.authorId) : null;

      return {
        ...summary,
        body: (row.bodyRichtext ?? "").split(/\n\n+/).filter(Boolean),
        topics: (articleTopicRowsByArticleId.get(row.id) ?? [])
          .map((binding) => topicSummaryById.get(binding.topicId))
          .filter((value): value is TopicSummary => Boolean(value)),
        citySummary: citySummary ?? {
          slug: "unknown",
          name: "Unknown",
          summary: "",
          articleCount: 0,
          eventCount: 0,
          topicCount: 0,
          coverImage: null
        },
        author: {
          name: author?.displayName ?? summary.authorName,
          role: author?.bio ?? "Contributor"
        }
      };
    });

    const eventDetails: EventDetail[] = eventRows.map((row) => ({
      ...eventSummaryById.get(row.id)!,
      body: row.bodyRichtext ?? "",
      agenda: (sessionRowsByEventId.get(row.id) ?? []).map((session) => ({
        time: session.startsAt ? session.startsAt.toISOString().slice(11, 16) : `${String(session.sortOrder + 1).padStart(2, "0")}:00`,
        title: session.title,
        speaker: session.speakerName ?? "TBD"
      })),
      relatedTopics: (eventTopicRowsByEventId.get(row.id) ?? [])
        .map((binding) => topicSummaryById.get(binding.topicId))
        .filter((value): value is TopicSummary => Boolean(value))
    }));

    const cityDetails: CityDetail[] = cityRows.map((row) => ({
      ...citySummaryById.get(row.id)!,
      body: row.bodyRichtext ?? "",
      featuredArticles: (articleRowsByCityId.get(row.id) ?? []).map((article) => articleSummaryById.get(article.id)!),
      upcomingEvents: (eventRowsByCityId.get(row.id) ?? []).map((event) => eventSummaryById.get(event.id)!),
      featuredTopics: (cityTopicRowsByCityId.get(row.id) ?? [])
        .map((binding) => topicSummaryById.get(binding.topicId))
        .filter((value): value is TopicSummary => Boolean(value))
    }));

    return {
      citySummaries,
      cityDetails,
      citySummaryById,
      topicSummaries,
      topicDetails,
      topicSummaryById,
      articleSummaries,
      articleDetails,
      articleSummaryById,
      eventSummaries,
      eventDetails,
      eventSummaryById
    };
  } catch {
    return undefined;
  }
};

const selectOrderedItems = <T>(ids: string[], byId: Map<string, T>, fallback: T[]) => {
  if (ids.length === 0) {
    return fallback;
  }

  const ordered = ids.map((id) => byId.get(id)).filter((value): value is T => Boolean(value));

  return ordered.length > 0 ? ordered : fallback;
};

export const getHomePayloadFromDb = async (): Promise<HomePayload | undefined> => {
  const dataset = await loadPublicDataset();

  if (!dataset) {
    return undefined;
  }

  const featuredBlock = await getActiveHomepageFeaturedBlockPayload();
  const fallbackPrimaryAction = homePayload.hero.actions[0] ?? {
    label: "Explore articles",
    href: "/articles"
  };
  const fallbackSecondaryAction = homePayload.hero.actions[1] ?? {
    label: "View upcoming events",
    href: "/events"
  };

  return {
    hero: {
      eyebrow: featuredBlock?.heroEyebrow ?? homePayload.hero.eyebrow,
      title: featuredBlock?.heroTitle ?? homePayload.hero.title,
      summary: featuredBlock?.heroSummary ?? homePayload.hero.summary,
      actions: [
        {
          label: featuredBlock?.primaryActionLabel ?? fallbackPrimaryAction.label,
          href: featuredBlock?.primaryActionHref ?? fallbackPrimaryAction.href
        },
        {
          label: featuredBlock?.secondaryActionLabel ?? fallbackSecondaryAction.label,
          href: featuredBlock?.secondaryActionHref ?? fallbackSecondaryAction.href
        }
      ].filter((action) => action.label.trim().length > 0 && action.href.trim().length > 0)
    },
    featuredTopics: selectOrderedItems(
      featuredBlock?.featuredTopicIds ?? [],
      dataset.topicSummaryById,
      dataset.topicSummaries.slice(0, 3)
    ),
    featuredArticles: selectOrderedItems(
      featuredBlock?.featuredArticleIds ?? [],
      dataset.articleSummaryById,
      dataset.articleSummaries.slice(0, 3)
    ),
    upcomingEvents: selectOrderedItems(
      featuredBlock?.featuredEventIds ?? [],
      dataset.eventSummaryById,
      dataset.eventSummaries.slice(0, 3)
    ),
    cityHighlights: selectOrderedItems(
      featuredBlock?.cityHighlightIds ?? [],
      dataset.citySummaryById,
      dataset.citySummaries.slice(0, 3)
    ),
    applicationCallout: {
      title: featuredBlock?.applicationTitle ?? homePayload.applicationCallout.title,
      summary: featuredBlock?.applicationSummary ?? homePayload.applicationCallout.summary,
      href: featuredBlock?.applicationHref ?? homePayload.applicationCallout.href
    }
  };
};

export const listTopicSummariesFromDb = async () => (await loadPublicDataset())?.topicSummaries;
export const listArticleSummariesFromDb = async () => (await loadPublicDataset())?.articleSummaries;
export const listEventSummariesFromDb = async () => (await loadPublicDataset())?.eventSummaries;
export const listCitySummariesFromDb = async () => (await loadPublicDataset())?.citySummaries;

export const getTopicDetailFromDb = async (slug: string) => {
  const dataset = await loadPublicDataset();

  if (!dataset) {
    return undefined;
  }

  return dataset.topicDetails.find((topic) => topic.slug === slug) ?? null;
};

export const getArticleDetailFromDb = async (slug: string) => {
  const dataset = await loadPublicDataset();

  if (!dataset) {
    return undefined;
  }

  return dataset.articleDetails.find((article) => article.slug === slug) ?? null;
};

export const getEventDetailFromDb = async (slug: string) => {
  const dataset = await loadPublicDataset();

  if (!dataset) {
    return undefined;
  }

  return dataset.eventDetails.find((event) => event.slug === slug) ?? null;
};

export const getCityDetailFromDb = async (slug: string) => {
  const dataset = await loadPublicDataset();

  if (!dataset) {
    return undefined;
  }

  return dataset.cityDetails.find((city) => city.slug === slug) ?? null;
};

const resolvePublicEventRegistrationStatus = (registrationState: EventSummary["registrationState"]): EventRegistrationStatus =>
  registrationState === "waitlist" ? "waitlisted" : "submitted";

const getPublishedEventForRegistration = async (eventIdentifier: string) => {
  const db = getDb();
  const normalized = eventIdentifier.trim();

  const bySlug = await db.query.events.findFirst({
    where: and(eq(events.status, "published"), eq(events.slug, normalized))
  });

  if (bySlug) {
    return bySlug;
  }

  return db.query.events.findFirst({
    where: and(eq(events.status, "published"), eq(events.id, normalized))
  });
};

export const createPublicEventRegistrationFromDb = async (
  eventIdentifier: string,
  input: PublicEventRegistrationInput
): Promise<PublicEventRegistrationReceipt | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = getDb();
  const event = await getPublishedEventForRegistration(eventIdentifier);

  if (!event) {
    throw new PublicContentError(404, "NOT_FOUND", "Event not found.");
  }

  if (event.registrationState !== "open" && event.registrationState !== "waitlist") {
    throw new PublicContentError(409, "REGISTRATION_CLOSED", "Event registration is not currently open.");
  }

  const status = resolvePublicEventRegistrationStatus(event.registrationState);
  const [created] = await db
    .insert(eventRegistrations)
    .values({
      eventId: event.id,
      name: input.name,
      phoneNumber: input.phoneNumber,
      email: input.email,
      company: input.company,
      jobTitle: input.jobTitle,
      status,
      source: "public_form",
      answersJson: {
        eventSlug: event.slug
      }
    })
    .returning({
      id: eventRegistrations.id,
      createdAt: eventRegistrations.createdAt
    });

  if (!created) {
    return undefined;
  }

  return {
    id: created.id,
    receivedAt: created.createdAt.toISOString(),
    status,
    event: {
      slug: event.slug,
      title: event.title
    },
    attendee: {
      name: input.name,
      ...(input.email ? { email: input.email } : {}),
      ...(input.phoneNumber ? { phoneNumber: input.phoneNumber } : {}),
      ...(input.company ? { company: input.company } : {}),
      ...(input.jobTitle ? { jobTitle: input.jobTitle } : {})
    }
  };
};

export const createPublicApplicationFromDb = async (
  input: PublicApplicationInput
): Promise<PublicApplicationReceipt | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  try {
    const db = getDb();
    const normalizedCity = input.city?.trim().toLowerCase();
    const city = normalizedCity
      ? await db.query.cities.findFirst({
          where: and(eq(cities.status, "published"), eq(cities.slug, normalizedCity))
        })
      : null;

    const [created] = await db
      .insert(applications)
      .values({
        type: input.type,
        name: input.name,
        email: input.email,
        company: input.company,
        cityId: city?.id ?? null,
        message: input.message,
        sourcePage: "/apply",
        status: "submitted"
      })
      .returning({
        id: applications.id,
        createdAt: applications.createdAt
      });

    if (!created) {
      return undefined;
    }

    return {
      id: created.id,
      receivedAt: created.createdAt.toISOString(),
      type: input.type,
      applicant: {
        name: input.name,
        email: input.email,
        ...(input.company ? { company: input.company } : {}),
        ...(input.city ? { city: input.city } : {})
      }
    };
  } catch {
    return undefined;
  }
};
