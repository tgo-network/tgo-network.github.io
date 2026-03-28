import { asc, desc, eq, inArray } from "drizzle-orm";

import {
  applications,
  assets,
  articleTopicBindings,
  articles,
  authors,
  cities,
  eventSessions,
  eventRegistrations,
  eventTopicBindings,
  events,
  topics
} from "@tgo/db";
import type {
  AdminApplicationDetailPayload,
  AdminApplicationListItem,
  AdminApplicationRecord,
  AdminApplicationUpdateInput,
  AdminAssetDetailPayload,
  AdminAssetListItem,
  AdminAssetRecord,
  AdminAssetUploadCompleteInput,
  AdminAssetUploadIntentInput,
  AdminAssetUploadIntentPayload,
  AdminArticleDetailPayload,
  AdminArticleListItem,
  AdminArticleReferences,
  AdminArticleReferencesPayload,
  AdminArticleRecord,
  AdminArticleUpsertInput,
  AdminEventAgendaItem,
  AdminEventDetailPayload,
  AdminEventListItem,
  AdminEventRegistrationDetailPayload,
  AdminEventRegistrationListItem,
  AdminEventRegistrationListPayload,
  AdminEventRegistrationRecord,
  AdminEventRegistrationUpdateInput,
  AdminEventRecord,
  AdminEventReferences,
  AdminEventReferencesPayload,
  AdminEventUpsertInput,
  AdminTopicDetailPayload,
  AdminTopicListItem,
  AdminTopicRecord,
  AdminTopicUpsertInput,
  AdminValidationIssue
} from "@tgo/shared";

import { type AuditActorContext, writeAuditLog } from "./audit.js";
import { getDb } from "./db.js";
import { getEnv } from "./env.js";
import {
  StorageError,
  createSignedAssetUpload,
  getAssetPublicUrl,
  getConfiguredStorageProvider,
  inspectUploadedObject,
  readAssetUploadIntent
} from "./storage.js";

const asIso = (value: Date | null | undefined) => (value ? value.toISOString() : null);
const asNullableText = (value: string) => {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
};
const now = () => new Date();
const getActorStaffAccountId = (actor: AuditActorContext) => {
  if (!actor.actorStaffAccountId) {
    throw new AdminContentError(403, "FORBIDDEN", "Active staff access is required.");
  }

  return actor.actorStaffAccountId;
};
const imageAssetTypes = new Set([
  "site-banner",
  "topic-cover",
  "article-cover",
  "article-inline",
  "city-cover",
  "event-poster",
  "speaker-avatar"
]);

export class AdminContentError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AdminContentError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const isUniqueViolation = (error: unknown): error is { code: string } =>
  typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";

const mapTopicRecord = (topic: typeof topics.$inferSelect): AdminTopicRecord => ({
  id: topic.id,
  slug: topic.slug,
  title: topic.title,
  summary: topic.summary ?? "",
  body: topic.bodyRichtext ?? "",
  coverAssetId: topic.coverAssetId,
  seoTitle: topic.seoTitle ?? "",
  seoDescription: topic.seoDescription ?? "",
  status: topic.status,
  publishedAt: asIso(topic.publishedAt),
  createdAt: topic.createdAt.toISOString(),
  updatedAt: topic.updatedAt.toISOString()
});

const mapArticleRecord = (
  article: typeof articles.$inferSelect,
  topicIds: string[]
): AdminArticleRecord => ({
  id: article.id,
  slug: article.slug,
  title: article.title,
  excerpt: article.excerpt ?? "",
  body: article.bodyRichtext ?? "",
  status: article.status,
  authorId: article.authorId,
  primaryCityId: article.primaryCityId,
  coverAssetId: article.coverAssetId,
  topicIds,
  seoTitle: article.seoTitle ?? "",
  seoDescription: article.seoDescription ?? "",
  scheduledAt: asIso(article.scheduledAt),
  publishedAt: asIso(article.publishedAt),
  createdAt: article.createdAt.toISOString(),
  updatedAt: article.updatedAt.toISOString()
});

const mapEventRecord = (
  event: typeof events.$inferSelect,
  topicIds: string[],
  agenda: AdminEventAgendaItem[]
): AdminEventRecord => ({
  id: event.id,
  slug: event.slug,
  title: event.title,
  summary: event.summary ?? "",
  body: event.bodyRichtext ?? "",
  status: event.status,
  cityId: event.cityId,
  coverAssetId: event.coverAssetId,
  venueName: event.venueName ?? "",
  venueAddress: event.venueAddress ?? "",
  startsAt: asIso(event.startsAt),
  endsAt: asIso(event.endsAt),
  timezone: event.timezone,
  capacity: event.capacity,
  registrationState: event.registrationState,
  registrationUrl: event.registrationUrl ?? "",
  topicIds,
  agenda,
  publishedAt: asIso(event.publishedAt),
  createdAt: event.createdAt.toISOString(),
  updatedAt: event.updatedAt.toISOString()
});

const mapApplicationRecord = (
  application: typeof applications.$inferSelect,
  cityName: string | null
): AdminApplicationRecord => ({
  id: application.id,
  type: application.type,
  name: application.name,
  phoneNumber: application.phoneNumber ?? "",
  email: application.email ?? "",
  company: application.company ?? "",
  jobTitle: application.jobTitle ?? "",
  cityId: application.cityId,
  cityName: cityName ?? "",
  message: application.message ?? "",
  sourcePage: application.sourcePage,
  status: application.status,
  assignedToStaffId: application.assignedToStaffId,
  reviewedByStaffId: application.reviewedByStaffId,
  reviewedAt: asIso(application.reviewedAt),
  internalNotes: application.internalNotes ?? "",
  createdAt: application.createdAt.toISOString(),
  updatedAt: application.updatedAt.toISOString()
});

const mapEventRegistrationRecord = (
  registration: typeof eventRegistrations.$inferSelect
): AdminEventRegistrationRecord => ({
  id: registration.id,
  eventId: registration.eventId,
  name: registration.name,
  phoneNumber: registration.phoneNumber ?? "",
  email: registration.email ?? "",
  company: registration.company ?? "",
  jobTitle: registration.jobTitle ?? "",
  status: registration.status,
  source: registration.source,
  answersJson: (registration.answersJson as Record<string, unknown> | null) ?? null,
  reviewedByStaffId: registration.reviewedByStaffId,
  reviewedAt: asIso(registration.reviewedAt),
  createdAt: registration.createdAt.toISOString()
});

const mapEventRegistrationListItem = (
  registration: typeof eventRegistrations.$inferSelect
): AdminEventRegistrationListItem => ({
  id: registration.id,
  eventId: registration.eventId,
  name: registration.name,
  phoneNumber: registration.phoneNumber ?? "",
  email: registration.email ?? "",
  company: registration.company ?? "",
  jobTitle: registration.jobTitle ?? "",
  status: registration.status,
  reviewedAt: asIso(registration.reviewedAt),
  createdAt: registration.createdAt.toISOString()
});

const mapAssetRecord = (asset: typeof assets.$inferSelect): AdminAssetRecord => ({
  id: asset.id,
  storageProvider: asset.storageProvider,
  bucket: asset.bucket,
  objectKey: asset.objectKey,
  visibility: asset.visibility,
  assetType: asset.assetType as AdminAssetRecord["assetType"],
  mimeType: asset.mimeType,
  byteSize: asset.byteSize,
  width: asset.width,
  height: asset.height,
  checksum: asset.checksum ?? "",
  originalFilename: asset.originalFilename,
  altText: asset.altText ?? "",
  uploadedByStaffId: asset.uploadedByStaffId,
  status: asset.status,
  url: getAssetPublicUrl(asset.objectKey, asset.visibility),
  createdAt: asset.createdAt.toISOString(),
  updatedAt: asset.updatedAt.toISOString()
});

const withUniqueGuard = async <T>(work: () => Promise<T>) => {
  try {
    return await work();
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AdminContentError(409, "CONFLICT", "A record with the same slug already exists.");
    }

    throw error;
  }
};

const toAdminContentError = (error: StorageError) => {
  switch (error.code) {
    case "STORAGE_NOT_CONFIGURED":
      return new AdminContentError(503, error.code, error.message);
    case "UPLOAD_INTENT_INVALID":
    case "UPLOAD_INTENT_EXPIRED":
    case "UPLOAD_NOT_FOUND":
      return new AdminContentError(400, error.code, error.message);
    case "STORAGE_UNAVAILABLE":
      return new AdminContentError(502, error.code, error.message);
    default:
      return new AdminContentError(500, "INTERNAL_ERROR", error.message);
  }
};

const getArticleReferences = async (): Promise<AdminArticleReferences> => {
  const db = getDb();
  const [authorRows, cityRows, topicRows] = await Promise.all([
    db.select().from(authors).orderBy(asc(authors.displayName)),
    db.select().from(cities).orderBy(asc(cities.name)),
    db.select().from(topics).orderBy(asc(topics.title))
  ]);

  return {
    authors: authorRows.map((author) => ({
      id: author.id,
      label: author.displayName,
      description: author.bio ?? null
    })),
    cities: cityRows.map((city) => ({
      id: city.id,
      label: city.name,
      description: city.summary ?? null
    })),
    topics: topicRows.map((topic) => ({
      id: topic.id,
      label: topic.title,
      description: topic.summary ?? null
    }))
  };
};

const getEventReferences = async (): Promise<AdminEventReferences> => {
  const db = getDb();
  const [cityRows, topicRows] = await Promise.all([
    db.select().from(cities).orderBy(asc(cities.name)),
    db.select().from(topics).orderBy(asc(topics.title))
  ]);

  return {
    cities: cityRows.map((city) => ({
      id: city.id,
      label: city.name,
      description: city.summary ?? null
    })),
    topics: topicRows.map((topic) => ({
      id: topic.id,
      label: topic.title,
      description: topic.summary ?? null
    }))
  };
};

const validatePublishableTopic = (topic: typeof topics.$inferSelect) => {
  const issues: AdminValidationIssue[] = [];

  if (topic.title.trim().length < 2) {
    issues.push({
      field: "title",
      message: "Title is required before publishing."
    });
  }

  if (topic.slug.trim().length < 2) {
    issues.push({
      field: "slug",
      message: "Slug is required before publishing."
    });
  }

  if ((topic.summary ?? "").trim().length === 0) {
    issues.push({
      field: "summary",
      message: "Summary is required before publishing."
    });
  }

  if (issues.length > 0) {
    throw new AdminContentError(400, "VALIDATION_ERROR", "Topic is not ready to publish.", {
      issues
    });
  }
};

const validatePublishableArticle = (article: typeof articles.$inferSelect, topicIds: string[]) => {
  const issues: AdminValidationIssue[] = [];

  if (article.title.trim().length < 2) {
    issues.push({
      field: "title",
      message: "Title is required before publishing."
    });
  }

  if (article.slug.trim().length < 2) {
    issues.push({
      field: "slug",
      message: "Slug is required before publishing."
    });
  }

  if ((article.excerpt ?? "").trim().length === 0) {
    issues.push({
      field: "excerpt",
      message: "Excerpt is required before publishing."
    });
  }

  if ((article.bodyRichtext ?? "").trim().length === 0) {
    issues.push({
      field: "body",
      message: "Body content is required before publishing."
    });
  }

  if (!article.authorId) {
    issues.push({
      field: "authorId",
      message: "Author is required before publishing."
    });
  }

  if (topicIds.length === 0) {
    issues.push({
      field: "topicIds",
      message: "At least one topic is required before publishing."
    });
  }

  if (issues.length > 0) {
    throw new AdminContentError(400, "VALIDATION_ERROR", "Article is not ready to publish.", {
      issues
    });
  }
};

const validatePublishableEvent = (
  event: typeof events.$inferSelect,
  topicIds: string[],
  agenda: AdminEventAgendaItem[]
) => {
  const issues: AdminValidationIssue[] = [];

  if (event.title.trim().length < 2) {
    issues.push({
      field: "title",
      message: "Title is required before publishing."
    });
  }

  if (event.slug.trim().length < 2) {
    issues.push({
      field: "slug",
      message: "Slug is required before publishing."
    });
  }

  if (!event.cityId) {
    issues.push({
      field: "cityId",
      message: "City is required before publishing."
    });
  }

  if (!event.startsAt || !event.endsAt) {
    issues.push({
      field: "startsAt",
      message: "Start and end time are required before publishing."
    });
  }

  if (topicIds.length === 0) {
    issues.push({
      field: "topicIds",
      message: "At least one topic is required before publishing."
    });
  }

  if (agenda.length === 0) {
    issues.push({
      field: "agenda",
      message: "At least one agenda item is required before publishing."
    });
  }

  if (issues.length > 0) {
    throw new AdminContentError(400, "VALIDATION_ERROR", "Event is not ready to publish.", {
      issues
    });
  }
};

const assertArticleReferences = async (input: AdminArticleUpsertInput) => {
  const db = getDb();
  const issues: AdminValidationIssue[] = [];

  const [authorRows, cityRows, topicRows] = await Promise.all([
    input.authorId ? db.select({ id: authors.id }).from(authors).where(eq(authors.id, input.authorId)) : Promise.resolve([]),
    input.primaryCityId
      ? db.select({ id: cities.id }).from(cities).where(eq(cities.id, input.primaryCityId))
      : Promise.resolve([]),
    input.topicIds.length > 0
      ? db.select({ id: topics.id }).from(topics).where(inArray(topics.id, input.topicIds))
      : Promise.resolve([])
  ]);

  if (input.authorId && authorRows.length === 0) {
    issues.push({
      field: "authorId",
      message: "Selected author does not exist."
    });
  }

  if (input.primaryCityId && cityRows.length === 0) {
    issues.push({
      field: "primaryCityId",
      message: "Selected city does not exist."
    });
  }

  if (input.topicIds.length > 0) {
    const existingTopicIds = new Set(topicRows.map((row) => row.id));
    const missingTopicCount = input.topicIds.filter((topicId) => !existingTopicIds.has(topicId)).length;

    if (missingTopicCount > 0) {
      issues.push({
        field: "topicIds",
        message: "One or more selected topics do not exist."
      });
    }
  }

  if (issues.length > 0) {
    throw new AdminContentError(400, "VALIDATION_ERROR", "Article references are invalid.", {
      issues
    });
  }
};

const assertEventReferences = async (input: AdminEventUpsertInput) => {
  const db = getDb();
  const issues: AdminValidationIssue[] = [];
  const [cityRows, topicRows] = await Promise.all([
    input.cityId ? db.select({ id: cities.id }).from(cities).where(eq(cities.id, input.cityId)) : Promise.resolve([]),
    input.topicIds.length > 0
      ? db.select({ id: topics.id }).from(topics).where(inArray(topics.id, input.topicIds))
      : Promise.resolve([])
  ]);

  if (input.cityId && cityRows.length === 0) {
    issues.push({
      field: "cityId",
      message: "Selected city does not exist."
    });
  }

  if (input.topicIds.length > 0) {
    const existingTopicIds = new Set(topicRows.map((row) => row.id));
    const missingTopicCount = input.topicIds.filter((topicId) => !existingTopicIds.has(topicId)).length;

    if (missingTopicCount > 0) {
      issues.push({
        field: "topicIds",
        message: "One or more selected topics do not exist."
      });
    }
  }

  if (issues.length > 0) {
    throw new AdminContentError(400, "VALIDATION_ERROR", "Event references are invalid.", {
      issues
    });
  }
};

const assertCoverAsset = async (coverAssetId: string | null) => {
  if (!coverAssetId) {
    return;
  }

  const db = getDb();
  const coverAsset = await db.query.assets.findFirst({
    where: eq(assets.id, coverAssetId)
  });
  const issues: AdminValidationIssue[] = [];

  if (!coverAsset) {
    issues.push({
      field: "coverAssetId",
      message: "Selected cover asset does not exist."
    });
  } else {
    if (coverAsset.status !== "active") {
      issues.push({
        field: "coverAssetId",
        message: "Selected cover asset must be active."
      });
    }

    if (coverAsset.visibility !== "public") {
      issues.push({
        field: "coverAssetId",
        message: "Selected cover asset must be public."
      });
    }

    if (!coverAsset.mimeType.startsWith("image/")) {
      issues.push({
        field: "coverAssetId",
        message: "Selected cover asset must be an image."
      });
    }
  }

  if (issues.length > 0) {
    throw new AdminContentError(400, "VALIDATION_ERROR", "Cover asset selection is invalid.", {
      issues
    });
  }
};

export const listAdminTopics = async (): Promise<AdminTopicListItem[]> => {
  const db = getDb();
  const [topicRows, articleTopicRows, eventTopicRows] = await Promise.all([
    db.select().from(topics).orderBy(desc(topics.updatedAt), asc(topics.title)),
    db.select().from(articleTopicBindings),
    db.select().from(eventTopicBindings)
  ]);

  return topicRows.map((topic) => ({
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    status: topic.status,
    articleCount: articleTopicRows.filter((row) => row.topicId === topic.id).length,
    eventCount: eventTopicRows.filter((row) => row.topicId === topic.id).length,
    updatedAt: topic.updatedAt.toISOString()
  }));
};

export const getAdminTopic = async (id: string): Promise<AdminTopicDetailPayload | null> => {
  const db = getDb();
  const topic = await db.query.topics.findFirst({
    where: eq(topics.id, id)
  });

  if (!topic) {
    return null;
  }

  return {
    topic: mapTopicRecord(topic)
  };
};

export const createAdminTopic = async (
  input: AdminTopicUpsertInput,
  actor: AuditActorContext
): Promise<AdminTopicDetailPayload> =>
  withUniqueGuard(async () => {
    await assertCoverAsset(input.coverAssetId);
    const db = getDb();
    const publishedAt = input.status === "published" ? now() : null;
    const [topic] = await db
      .insert(topics)
      .values({
        slug: input.slug,
        title: input.title,
        summary: asNullableText(input.summary),
        bodyRichtext: asNullableText(input.body),
        status: input.status,
        coverAssetId: input.coverAssetId,
        seoTitle: asNullableText(input.seoTitle),
        seoDescription: asNullableText(input.seoDescription),
        publishedAt
      })
      .returning();

    await writeAuditLog(actor, {
      action: "topic.create",
      targetType: "topic",
      targetId: topic.id,
      after: mapTopicRecord(topic)
    });

    return {
      topic: mapTopicRecord(topic)
    };
  });

export const updateAdminTopic = async (
  id: string,
  input: AdminTopicUpsertInput,
  actor: AuditActorContext
): Promise<AdminTopicDetailPayload> =>
  withUniqueGuard(async () => {
    await assertCoverAsset(input.coverAssetId);
    const db = getDb();
    const existing = await db.query.topics.findFirst({
      where: eq(topics.id, id)
    });

    if (!existing) {
      throw new AdminContentError(404, "NOT_FOUND", "Topic not found.");
    }

    const [topic] = await db
      .update(topics)
      .set({
        slug: input.slug,
        title: input.title,
        summary: asNullableText(input.summary),
        bodyRichtext: asNullableText(input.body),
        status: input.status,
        coverAssetId: input.coverAssetId,
        seoTitle: asNullableText(input.seoTitle),
        seoDescription: asNullableText(input.seoDescription),
        publishedAt: input.status === "published" ? existing.publishedAt ?? now() : existing.publishedAt,
        updatedAt: now()
      })
      .where(eq(topics.id, id))
      .returning();

    await writeAuditLog(actor, {
      action: "topic.update",
      targetType: "topic",
      targetId: topic.id,
      before: mapTopicRecord(existing),
      after: mapTopicRecord(topic)
    });

    return {
      topic: mapTopicRecord(topic)
    };
  });

export const publishAdminTopic = async (id: string, actor: AuditActorContext): Promise<AdminTopicDetailPayload> => {
  const db = getDb();
  const existing = await db.query.topics.findFirst({
    where: eq(topics.id, id)
  });

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "Topic not found.");
  }

  validatePublishableTopic(existing);

  const [topic] = await db
    .update(topics)
    .set({
      status: "published",
      publishedAt: existing.publishedAt ?? now(),
      updatedAt: now()
    })
    .where(eq(topics.id, id))
    .returning();

  await writeAuditLog(actor, {
    action: "topic.publish",
    targetType: "topic",
    targetId: topic.id,
    before: mapTopicRecord(existing),
    after: mapTopicRecord(topic)
  });

  return {
    topic: mapTopicRecord(topic)
  };
};

export const archiveAdminTopic = async (id: string, actor: AuditActorContext): Promise<AdminTopicDetailPayload> => {
  const db = getDb();
  const existing = await db.query.topics.findFirst({
    where: eq(topics.id, id)
  });

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "Topic not found.");
  }

  const [topic] = await db
    .update(topics)
    .set({
      status: "archived",
      updatedAt: now()
    })
    .where(eq(topics.id, id))
    .returning();

  await writeAuditLog(actor, {
    action: "topic.archive",
    targetType: "topic",
    targetId: topic.id,
    before: mapTopicRecord(existing),
    after: mapTopicRecord(topic)
  });

  return {
    topic: mapTopicRecord(topic)
  };
};

export const listAdminArticles = async (): Promise<AdminArticleListItem[]> => {
  const db = getDb();
  const [articleRows, authorRows, cityRows, articleTopicRows] = await Promise.all([
    db.select().from(articles).orderBy(desc(articles.updatedAt), desc(articles.publishedAt)),
    db.select().from(authors),
    db.select().from(cities),
    db.select().from(articleTopicBindings)
  ]);

  const authorById = new Map(authorRows.map((row) => [row.id, row]));
  const cityById = new Map(cityRows.map((row) => [row.id, row]));

  return articleRows.map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    status: article.status,
    authorName: article.authorId ? authorById.get(article.authorId)?.displayName ?? null : null,
    cityName: article.primaryCityId ? cityById.get(article.primaryCityId)?.name ?? null : null,
    topicCount: articleTopicRows.filter((row) => row.articleId === article.id).length,
    publishedAt: asIso(article.publishedAt),
    updatedAt: article.updatedAt.toISOString()
  }));
};

export const getAdminArticleReferencesPayload = async (): Promise<AdminArticleReferencesPayload> => ({
  references: await getArticleReferences()
});

export const getAdminArticle = async (id: string): Promise<AdminArticleDetailPayload | null> => {
  const db = getDb();
  const [article, bindings, references] = await Promise.all([
    db.query.articles.findFirst({
      where: eq(articles.id, id)
    }),
    db.select().from(articleTopicBindings).where(eq(articleTopicBindings.articleId, id)),
    getArticleReferences()
  ]);

  if (!article) {
    return null;
  }

  return {
    article: mapArticleRecord(
      article,
      bindings.map((binding) => binding.topicId)
    ),
    references
  };
};

export const createAdminArticle = async (
  input: AdminArticleUpsertInput,
  actor: AuditActorContext
): Promise<AdminArticleDetailPayload> => {
  await Promise.all([assertArticleReferences(input), assertCoverAsset(input.coverAssetId)]);

  return withUniqueGuard(async () => {
    const db = getDb();
    const staffAccountId = getActorStaffAccountId(actor);
    const created = await db.transaction(async (tx) => {
      const publishAt = input.status === "published" ? now() : null;
      const [article] = await tx
        .insert(articles)
        .values({
          slug: input.slug,
          title: input.title,
          excerpt: asNullableText(input.excerpt),
          bodyRichtext: asNullableText(input.body),
          status: input.status,
          authorId: input.authorId,
          primaryCityId: input.primaryCityId,
          coverAssetId: input.coverAssetId,
          seoTitle: asNullableText(input.seoTitle),
          seoDescription: asNullableText(input.seoDescription),
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          publishedAt: publishAt,
          createdByStaffId: staffAccountId,
          updatedByStaffId: staffAccountId
        })
        .returning();

      if (input.topicIds.length > 0) {
        await tx.insert(articleTopicBindings).values(
          input.topicIds.map((topicId) => ({
            articleId: article.id,
            topicId
          }))
        );
      }

      return article;
    });

    const references = await getArticleReferences();
    const record = mapArticleRecord(created, input.topicIds);

    await writeAuditLog(actor, {
      action: "article.create",
      targetType: "article",
      targetId: created.id,
      after: record
    });

    return {
      article: record,
      references
    };
  });
};

export const updateAdminArticle = async (
  id: string,
  input: AdminArticleUpsertInput,
  actor: AuditActorContext
): Promise<AdminArticleDetailPayload> => {
  await Promise.all([assertArticleReferences(input), assertCoverAsset(input.coverAssetId)]);

  return withUniqueGuard(async () => {
    const db = getDb();
    const staffAccountId = getActorStaffAccountId(actor);
    const [existing, existingBindings] = await Promise.all([
      db.query.articles.findFirst({
        where: eq(articles.id, id)
      }),
      db.select().from(articleTopicBindings).where(eq(articleTopicBindings.articleId, id))
    ]);

    if (!existing) {
      throw new AdminContentError(404, "NOT_FOUND", "Article not found.");
    }

    const updated = await db.transaction(async (tx) => {
      const [article] = await tx
        .update(articles)
        .set({
          slug: input.slug,
          title: input.title,
          excerpt: asNullableText(input.excerpt),
          bodyRichtext: asNullableText(input.body),
          status: input.status,
          authorId: input.authorId,
          primaryCityId: input.primaryCityId,
          coverAssetId: input.coverAssetId,
          seoTitle: asNullableText(input.seoTitle),
          seoDescription: asNullableText(input.seoDescription),
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          publishedAt: input.status === "published" ? existing.publishedAt ?? now() : existing.publishedAt,
          updatedByStaffId: staffAccountId,
          updatedAt: now()
        })
        .where(eq(articles.id, id))
        .returning();

      await tx.delete(articleTopicBindings).where(eq(articleTopicBindings.articleId, id));

      if (input.topicIds.length > 0) {
        await tx.insert(articleTopicBindings).values(
          input.topicIds.map((topicId) => ({
            articleId: id,
            topicId
          }))
        );
      }

      return article;
    });

    const references = await getArticleReferences();
    const before = mapArticleRecord(existing, existingBindings.map((binding) => binding.topicId));
    const after = mapArticleRecord(updated, input.topicIds);

    await writeAuditLog(actor, {
      action: "article.update",
      targetType: "article",
      targetId: updated.id,
      before,
      after
    });

    return {
      article: after,
      references
    };
  });
};

export const publishAdminArticle = async (
  id: string,
  actor: AuditActorContext
): Promise<AdminArticleDetailPayload> => {
  const db = getDb();
  const staffAccountId = getActorStaffAccountId(actor);
  const [existing, bindings] = await Promise.all([
    db.query.articles.findFirst({
      where: eq(articles.id, id)
    }),
    db.select().from(articleTopicBindings).where(eq(articleTopicBindings.articleId, id))
  ]);

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "Article not found.");
  }

  const topicIds = bindings.map((binding) => binding.topicId);
  validatePublishableArticle(existing, topicIds);

  const [article] = await db
    .update(articles)
    .set({
      status: "published",
      publishedAt: existing.publishedAt ?? now(),
      updatedByStaffId: staffAccountId,
      updatedAt: now()
    })
    .where(eq(articles.id, id))
    .returning();

  await writeAuditLog(actor, {
    action: "article.publish",
    targetType: "article",
    targetId: article.id,
    before: mapArticleRecord(existing, topicIds),
    after: mapArticleRecord(article, topicIds)
  });

  return {
    article: mapArticleRecord(article, topicIds),
    references: await getArticleReferences()
  };
};

export const archiveAdminArticle = async (
  id: string,
  actor: AuditActorContext
): Promise<AdminArticleDetailPayload> => {
  const db = getDb();
  const staffAccountId = getActorStaffAccountId(actor);
  const [existing, bindings] = await Promise.all([
    db.query.articles.findFirst({
      where: eq(articles.id, id)
    }),
    db.select().from(articleTopicBindings).where(eq(articleTopicBindings.articleId, id))
  ]);

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "Article not found.");
  }

  const [article] = await db
    .update(articles)
    .set({
      status: "archived",
      updatedByStaffId: staffAccountId,
      updatedAt: now()
    })
    .where(eq(articles.id, id))
    .returning();

  const topicIds = bindings.map((binding) => binding.topicId);
  await writeAuditLog(actor, {
    action: "article.archive",
    targetType: "article",
    targetId: article.id,
    before: mapArticleRecord(existing, topicIds),
    after: mapArticleRecord(article, topicIds)
  });

  return {
    article: mapArticleRecord(
      article,
      topicIds
    ),
    references: await getArticleReferences()
  };
};

export const listAdminEvents = async (): Promise<AdminEventListItem[]> => {
  const db = getDb();
  const [eventRows, cityRows] = await Promise.all([
    db.select().from(events).orderBy(asc(events.startsAt), desc(events.updatedAt)),
    db.select().from(cities)
  ]);

  const cityById = new Map(cityRows.map((row) => [row.id, row]));

  return eventRows.map((event) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    status: event.status,
    cityName: event.cityId ? cityById.get(event.cityId)?.name ?? null : null,
    registrationState: event.registrationState,
    startsAt: asIso(event.startsAt),
    updatedAt: event.updatedAt.toISOString()
  }));
};

export const getAdminEventReferencesPayload = async (): Promise<AdminEventReferencesPayload> => ({
  references: await getEventReferences()
});

export const getAdminEvent = async (id: string): Promise<AdminEventDetailPayload | null> => {
  const db = getDb();
  const [event, bindings, sessions, references] = await Promise.all([
    db.query.events.findFirst({
      where: eq(events.id, id)
    }),
    db.select().from(eventTopicBindings).where(eq(eventTopicBindings.eventId, id)),
    db.select().from(eventSessions).where(eq(eventSessions.eventId, id)).orderBy(asc(eventSessions.sortOrder)),
    getEventReferences()
  ]);

  if (!event) {
    return null;
  }

  return {
    event: mapEventRecord(
      event,
      bindings.map((binding) => binding.topicId),
      sessions.map((session) => ({
        title: session.title,
        summary: session.summary ?? "",
        startsAt: asIso(session.startsAt),
        endsAt: asIso(session.endsAt),
        speakerName: session.speakerName ?? ""
      }))
    ),
    references
  };
};

export const createAdminEvent = async (
  input: AdminEventUpsertInput,
  actor: AuditActorContext
): Promise<AdminEventDetailPayload> => {
  await Promise.all([assertEventReferences(input), assertCoverAsset(input.coverAssetId)]);

  return withUniqueGuard(async () => {
    const db = getDb();
    const staffAccountId = getActorStaffAccountId(actor);
    const created = await db.transaction(async (tx) => {
      const publishAt = input.status === "published" ? now() : null;
      const [event] = await tx
        .insert(events)
        .values({
          slug: input.slug,
          title: input.title,
          summary: asNullableText(input.summary),
          bodyRichtext: asNullableText(input.body),
          status: input.status,
          cityId: input.cityId,
          coverAssetId: input.coverAssetId,
          venueName: asNullableText(input.venueName),
          venueAddress: asNullableText(input.venueAddress),
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          timezone: input.timezone,
          capacity: input.capacity,
          registrationState: input.registrationState,
          registrationUrl: asNullableText(input.registrationUrl),
          publishedAt: publishAt,
          createdByStaffId: staffAccountId,
          updatedByStaffId: staffAccountId
        })
        .returning();

      if (input.topicIds.length > 0) {
        await tx.insert(eventTopicBindings).values(
          input.topicIds.map((topicId) => ({
            eventId: event.id,
            topicId
          }))
        );
      }

      if (input.agenda.length > 0) {
        await tx.insert(eventSessions).values(
          input.agenda.map((item, index) => ({
            eventId: event.id,
            title: item.title,
            summary: asNullableText(item.summary),
            startsAt: item.startsAt ? new Date(item.startsAt) : null,
            endsAt: item.endsAt ? new Date(item.endsAt) : null,
            speakerName: asNullableText(item.speakerName),
            sortOrder: index
          }))
        );
      }

      return event;
    });

    const record = mapEventRecord(created, input.topicIds, input.agenda);
    await writeAuditLog(actor, {
      action: "event.create",
      targetType: "event",
      targetId: created.id,
      after: record
    });

    return {
      event: record,
      references: await getEventReferences()
    };
  });
};

export const updateAdminEvent = async (
  id: string,
  input: AdminEventUpsertInput,
  actor: AuditActorContext
): Promise<AdminEventDetailPayload> => {
  await Promise.all([assertEventReferences(input), assertCoverAsset(input.coverAssetId)]);

  return withUniqueGuard(async () => {
    const db = getDb();
    const staffAccountId = getActorStaffAccountId(actor);
    const [existing, existingBindings, existingSessions] = await Promise.all([
      db.query.events.findFirst({
        where: eq(events.id, id)
      }),
      db.select().from(eventTopicBindings).where(eq(eventTopicBindings.eventId, id)),
      db.select().from(eventSessions).where(eq(eventSessions.eventId, id)).orderBy(asc(eventSessions.sortOrder))
    ]);

    if (!existing) {
      throw new AdminContentError(404, "NOT_FOUND", "Event not found.");
    }

    const updated = await db.transaction(async (tx) => {
      const [event] = await tx
        .update(events)
        .set({
          slug: input.slug,
          title: input.title,
          summary: asNullableText(input.summary),
          bodyRichtext: asNullableText(input.body),
          status: input.status,
          cityId: input.cityId,
          coverAssetId: input.coverAssetId,
          venueName: asNullableText(input.venueName),
          venueAddress: asNullableText(input.venueAddress),
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          timezone: input.timezone,
          capacity: input.capacity,
          registrationState: input.registrationState,
          registrationUrl: asNullableText(input.registrationUrl),
          publishedAt: input.status === "published" ? existing.publishedAt ?? now() : existing.publishedAt,
          updatedByStaffId: staffAccountId,
          updatedAt: now()
        })
        .where(eq(events.id, id))
        .returning();

      await tx.delete(eventTopicBindings).where(eq(eventTopicBindings.eventId, id));
      await tx.delete(eventSessions).where(eq(eventSessions.eventId, id));

      if (input.topicIds.length > 0) {
        await tx.insert(eventTopicBindings).values(
          input.topicIds.map((topicId) => ({
            eventId: id,
            topicId
          }))
        );
      }

      if (input.agenda.length > 0) {
        await tx.insert(eventSessions).values(
          input.agenda.map((item, index) => ({
            eventId: id,
            title: item.title,
            summary: asNullableText(item.summary),
            startsAt: item.startsAt ? new Date(item.startsAt) : null,
            endsAt: item.endsAt ? new Date(item.endsAt) : null,
            speakerName: asNullableText(item.speakerName),
            sortOrder: index
          }))
        );
      }

      return event;
    });

    const before = mapEventRecord(
      existing,
      existingBindings.map((binding) => binding.topicId),
      existingSessions.map((session) => ({
        title: session.title,
        summary: session.summary ?? "",
        startsAt: asIso(session.startsAt),
        endsAt: asIso(session.endsAt),
        speakerName: session.speakerName ?? ""
      }))
    );
    const after = mapEventRecord(updated, input.topicIds, input.agenda);
    await writeAuditLog(actor, {
      action: "event.update",
      targetType: "event",
      targetId: updated.id,
      before,
      after
    });

    return {
      event: after,
      references: await getEventReferences()
    };
  });
};

export const publishAdminEvent = async (
  id: string,
  actor: AuditActorContext
): Promise<AdminEventDetailPayload> => {
  const db = getDb();
  const staffAccountId = getActorStaffAccountId(actor);
  const [existing, bindings, sessions] = await Promise.all([
    db.query.events.findFirst({
      where: eq(events.id, id)
    }),
    db.select().from(eventTopicBindings).where(eq(eventTopicBindings.eventId, id)),
    db.select().from(eventSessions).where(eq(eventSessions.eventId, id)).orderBy(asc(eventSessions.sortOrder))
  ]);

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "Event not found.");
  }

  const topicIds = bindings.map((binding) => binding.topicId);
  const agenda = sessions.map((session) => ({
    title: session.title,
    summary: session.summary ?? "",
    startsAt: asIso(session.startsAt),
    endsAt: asIso(session.endsAt),
    speakerName: session.speakerName ?? ""
  }));
  validatePublishableEvent(existing, topicIds, agenda);

  const [event] = await db
    .update(events)
    .set({
      status: "published",
      publishedAt: existing.publishedAt ?? now(),
      updatedByStaffId: staffAccountId,
      updatedAt: now()
    })
    .where(eq(events.id, id))
    .returning();

  await writeAuditLog(actor, {
    action: "event.publish",
    targetType: "event",
    targetId: event.id,
    before: mapEventRecord(existing, topicIds, agenda),
    after: mapEventRecord(event, topicIds, agenda)
  });

  return {
    event: mapEventRecord(event, topicIds, agenda),
    references: await getEventReferences()
  };
};

export const archiveAdminEvent = async (
  id: string,
  actor: AuditActorContext
): Promise<AdminEventDetailPayload> => {
  const db = getDb();
  const staffAccountId = getActorStaffAccountId(actor);
  const [existing, bindings, sessions] = await Promise.all([
    db.query.events.findFirst({
      where: eq(events.id, id)
    }),
    db.select().from(eventTopicBindings).where(eq(eventTopicBindings.eventId, id)),
    db.select().from(eventSessions).where(eq(eventSessions.eventId, id)).orderBy(asc(eventSessions.sortOrder))
  ]);

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "Event not found.");
  }

  const [event] = await db
    .update(events)
    .set({
      status: "archived",
      updatedByStaffId: staffAccountId,
      updatedAt: now()
    })
    .where(eq(events.id, id))
    .returning();

  const topicIds = bindings.map((binding) => binding.topicId);
  const agenda = sessions.map((session) => ({
    title: session.title,
    summary: session.summary ?? "",
    startsAt: asIso(session.startsAt),
    endsAt: asIso(session.endsAt),
    speakerName: session.speakerName ?? ""
  }));

  await writeAuditLog(actor, {
    action: "event.archive",
    targetType: "event",
    targetId: event.id,
    before: mapEventRecord(existing, topicIds, agenda),
    after: mapEventRecord(event, topicIds, agenda)
  });

  return {
    event: mapEventRecord(
      event,
      topicIds,
      agenda
    ),
    references: await getEventReferences()
  };
};

const mapEventRegistrationEventSummary = (event: typeof events.$inferSelect) => ({
  id: event.id,
  slug: event.slug,
  title: event.title,
  registrationState: event.registrationState,
  startsAt: asIso(event.startsAt),
  venueName: event.venueName ?? ""
});

export const listAdminEventRegistrations = async (eventId: string): Promise<AdminEventRegistrationListPayload> => {
  const db = getDb();
  const [event, registrationRows] = await Promise.all([
    db.query.events.findFirst({
      where: eq(events.id, eventId)
    }),
    db.select().from(eventRegistrations).where(eq(eventRegistrations.eventId, eventId)).orderBy(desc(eventRegistrations.createdAt))
  ]);

  if (!event) {
    throw new AdminContentError(404, "NOT_FOUND", "Event not found.");
  }

  return {
    event: mapEventRegistrationEventSummary(event),
    registrations: registrationRows.map(mapEventRegistrationListItem)
  };
};

export const getAdminEventRegistration = async (id: string): Promise<AdminEventRegistrationDetailPayload | null> => {
  const db = getDb();
  const registration = await db.query.eventRegistrations.findFirst({
    where: eq(eventRegistrations.id, id)
  });

  if (!registration) {
    return null;
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, registration.eventId)
  });

  if (!event) {
    throw new AdminContentError(404, "NOT_FOUND", "Event not found.");
  }

  return {
    event: mapEventRegistrationEventSummary(event),
    registration: mapEventRegistrationRecord(registration)
  };
};

export const updateAdminEventRegistration = async (
  id: string,
  input: AdminEventRegistrationUpdateInput,
  actor: AuditActorContext
): Promise<AdminEventRegistrationDetailPayload> => {
  const db = getDb();
  const staffAccountId = getActorStaffAccountId(actor);
  const existing = await db.query.eventRegistrations.findFirst({
    where: eq(eventRegistrations.id, id)
  });

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "Registration not found.");
  }

  const [registration] = await db
    .update(eventRegistrations)
    .set({
      status: input.status,
      reviewedByStaffId: staffAccountId,
      reviewedAt: now(),
      updatedAt: now()
    })
    .where(eq(eventRegistrations.id, id))
    .returning();

  const event = await db.query.events.findFirst({
    where: eq(events.id, registration.eventId)
  });

  if (!event) {
    throw new AdminContentError(404, "NOT_FOUND", "Event not found.");
  }

  await writeAuditLog(actor, {
    action: "event_registration.update",
    targetType: "event_registration",
    targetId: registration.id,
    before: mapEventRegistrationRecord(existing),
    after: mapEventRegistrationRecord(registration)
  });

  return {
    event: mapEventRegistrationEventSummary(event),
    registration: mapEventRegistrationRecord(registration)
  };
};

export const listAdminApplications = async (): Promise<AdminApplicationListItem[]> => {
  const db = getDb();
  const [applicationRows, cityRows] = await Promise.all([
    db.select().from(applications).orderBy(desc(applications.createdAt)),
    db.select().from(cities)
  ]);

  const cityById = new Map(cityRows.map((row) => [row.id, row]));

  return applicationRows.map((application) => ({
    id: application.id,
    type: application.type,
    name: application.name,
    email: application.email ?? null,
    company: application.company ?? null,
    cityName: application.cityId ? cityById.get(application.cityId)?.name ?? null : null,
    status: application.status,
    createdAt: application.createdAt.toISOString()
  }));
};

export const getAdminApplication = async (id: string): Promise<AdminApplicationDetailPayload | null> => {
  const db = getDb();
  const [application, cityRows] = await Promise.all([
    db.query.applications.findFirst({
      where: eq(applications.id, id)
    }),
    db.select().from(cities)
  ]);

  if (!application) {
    return null;
  }

  const cityById = new Map(cityRows.map((row) => [row.id, row.name]));

  return {
    application: mapApplicationRecord(application, application.cityId ? cityById.get(application.cityId) ?? null : null)
  };
};

export const updateAdminApplication = async (
  id: string,
  input: AdminApplicationUpdateInput,
  actor: AuditActorContext
): Promise<AdminApplicationDetailPayload> => {
  const db = getDb();
  const staffAccountId = getActorStaffAccountId(actor);
  const [existing, cityRows] = await Promise.all([
    db.query.applications.findFirst({
      where: eq(applications.id, id)
    }),
    db.select().from(cities)
  ]);

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "Application not found.");
  }

  const [application] = await db
    .update(applications)
    .set({
      status: input.status,
      internalNotes: asNullableText(input.internalNotes),
      reviewedByStaffId: staffAccountId,
      reviewedAt: now(),
      updatedAt: now()
    })
    .where(eq(applications.id, id))
    .returning();

  const cityById = new Map(cityRows.map((row) => [row.id, row.name]));
  const before = mapApplicationRecord(
    existing,
    existing.cityId ? cityById.get(existing.cityId) ?? null : null
  );
  const after = mapApplicationRecord(
    application,
    application.cityId ? cityById.get(application.cityId) ?? null : null
  );

  await writeAuditLog(actor, {
    action: "application.update",
    targetType: "application",
    targetId: application.id,
    before,
    after
  });

  return {
    application: after
  };
};

export const listAdminAssets = async (): Promise<AdminAssetListItem[]> => {
  const db = getDb();
  const rows = await db.select().from(assets).orderBy(desc(assets.createdAt));

  return rows.map(mapAssetRecord);
};

export const createAdminAssetUploadIntent = async (
  input: AdminAssetUploadIntentInput,
  staffAccountId: string
): Promise<AdminAssetUploadIntentPayload> => {
  try {
    return {
      upload: await createSignedAssetUpload(input, staffAccountId)
    };
  } catch (error) {
    if (error instanceof StorageError) {
      throw toAdminContentError(error);
    }

    throw error;
  }
};

export const completeAdminAssetUpload = async (
  input: AdminAssetUploadCompleteInput,
  actor: AuditActorContext
): Promise<AdminAssetDetailPayload> => {
  try {
    const intent = readAssetUploadIntent(input.intentToken);
    const staffAccountId = getActorStaffAccountId(actor);
    const env = getEnv();
    const isImageAsset = imageAssetTypes.has(intent.assetType);

    if (intent.uploadedByStaffId !== staffAccountId) {
      throw new AdminContentError(403, "FORBIDDEN", "This upload intent belongs to a different staff member.");
    }

    if (isImageAsset && (input.width === null || input.height === null)) {
      throw new AdminContentError(400, "VALIDATION_ERROR", "Image uploads must include width and height metadata.", {
        issues: [
          {
            field: "width",
            message: "Image uploads must include width metadata."
          },
          {
            field: "height",
            message: "Image uploads must include height metadata."
          }
        ]
      });
    }

    if (!isImageAsset && (input.width !== null || input.height !== null)) {
      throw new AdminContentError(
        400,
        "VALIDATION_ERROR",
        "Document uploads must not include image dimensions.",
        {
          issues: [
            {
              field: "width",
              message: "Document uploads must not include image dimensions."
            },
            {
              field: "height",
              message: "Document uploads must not include image dimensions."
            }
          ]
        }
      );
    }

    if (isImageAsset && input.width !== null && input.height !== null) {
      if (input.width > env.assetImageMaxDimension || input.height > env.assetImageMaxDimension) {
        throw new AdminContentError(
          400,
          "VALIDATION_ERROR",
          "Image dimensions exceed the configured upload limit.",
          {
            issues: [
              {
                field: "width",
                message: `Image dimensions must be ${env.assetImageMaxDimension}px or smaller on each side.`
              }
            ]
          }
        );
      }

      if (input.width * input.height > env.assetImageMaxPixels) {
        throw new AdminContentError(
          400,
          "VALIDATION_ERROR",
          "Image pixel count exceeds the configured upload limit.",
          {
            issues: [
              {
                field: "width",
                message: `Image pixel count must be ${env.assetImageMaxPixels.toLocaleString()} or fewer.`
              }
            ]
          }
        );
      }
    }

    const uploadedObject = await inspectUploadedObject(intent);

    if (uploadedObject.byteSize !== null && uploadedObject.byteSize !== intent.byteSize) {
      throw new AdminContentError(
        400,
        "UPLOAD_MISMATCH",
        "Uploaded object size does not match the upload intent.",
        {
          expectedByteSize: intent.byteSize,
          actualByteSize: uploadedObject.byteSize
        }
      );
    }

    if (
      uploadedObject.mimeType &&
      uploadedObject.mimeType.trim().toLowerCase() !== intent.mimeType.trim().toLowerCase()
    ) {
      throw new AdminContentError(
        400,
        "UPLOAD_MISMATCH",
        "Uploaded object media type does not match the upload intent.",
        {
          expectedMimeType: intent.mimeType,
          actualMimeType: uploadedObject.mimeType
        }
      );
    }

    const db = getDb();

    try {
      const [asset] = await db
        .insert(assets)
        .values({
          id: intent.assetId,
          storageProvider: getConfiguredStorageProvider(),
          bucket: intent.bucket,
          objectKey: intent.objectKey,
          visibility: intent.visibility,
          assetType: intent.assetType,
          mimeType: intent.mimeType,
          byteSize: intent.byteSize,
          width: input.width,
          height: input.height,
          checksum: asNullableText(input.checksum) ?? uploadedObject.checksum,
          originalFilename: intent.originalFilename,
          altText: asNullableText(input.altText),
          uploadedByStaffId: staffAccountId,
          status: "active"
        })
        .returning();

      await writeAuditLog(actor, {
        action: "asset.complete_upload",
        targetType: "asset",
        targetId: asset.id,
        after: mapAssetRecord(asset)
      });

      return {
        asset: mapAssetRecord(asset)
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AdminContentError(409, "CONFLICT", "This upload has already been finalized.");
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof StorageError) {
      throw toAdminContentError(error);
    }

    throw error;
  }
};
