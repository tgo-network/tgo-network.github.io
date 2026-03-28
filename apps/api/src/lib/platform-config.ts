import { and, asc, desc, eq, inArray } from "drizzle-orm";

import {
  articles,
  cities,
  featuredBlocks,
  events,
  siteSettings,
  topics
} from "@tgo/db";
import type {
  AdminEditorReferenceOption,
  AdminFeaturedBlockDetailPayload,
  AdminFeaturedBlockRecord,
  AdminFeaturedBlockReferences,
  AdminFeaturedBlockUpsertInput,
  AdminHomepageFeaturedBlockPayload,
  AdminSiteSettingsInput,
  AdminSiteSettingsPayload,
  AdminSiteSettingsRecord,
  AdminValidationIssue,
  PublicSiteConfig
} from "@tgo/shared";
import { homePayload, platformName, publicNav, siteConfig as defaultSiteConfig } from "@tgo/shared";

import { type AuditActorContext, writeAuditLog } from "./audit.js";
import { getDb } from "./db.js";
import { AdminContentError } from "./admin-content.js";

const HOMEPAGE_BLOCK_CODE = "homepage";
const HOMEPAGE_BLOCK_NAME = "Homepage Featured Content";

const SITE_NAME_KEY = "site.name";
const SITE_FOOTER_TAGLINE_KEY = "site.footerTagline";
const SITE_SUPPORT_EMAIL_KEY = "site.supportEmail";

const asIso = (value: Date | null | undefined) => (value ? value.toISOString() : null);
const now = () => new Date();
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const toEditorReferenceOption = (
  id: string,
  label: string,
  description?: string | null
): AdminEditorReferenceOption => ({
  id,
  label,
  description: description ?? null
});

const getStringSettingValue = (value: unknown) => {
  if (!isRecord(value)) {
    return "";
  }

  const normalized = typeof value.value === "string" ? value.value.trim() : "";
  return normalized;
};

const getDefaultHomepagePayload = async (): Promise<AdminHomepageFeaturedBlockPayload> => {
  const db = getDb();
  const [topicRows, articleRows, eventRows, cityRows] = await Promise.all([
    db.select({ id: topics.id }).from(topics).where(eq(topics.status, "published")).orderBy(asc(topics.title)),
    db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.publishedAt), desc(articles.updatedAt)),
    db.select({ id: events.id }).from(events).where(eq(events.status, "published")).orderBy(asc(events.startsAt), asc(events.title)),
    db.select({ id: cities.id }).from(cities).where(eq(cities.status, "published")).orderBy(asc(cities.name))
  ]);

  return {
    heroEyebrow: homePayload.hero.eyebrow,
    heroTitle: homePayload.hero.title,
    heroSummary: homePayload.hero.summary,
    primaryActionLabel: homePayload.hero.actions[0]?.label ?? "",
    primaryActionHref: homePayload.hero.actions[0]?.href ?? "",
    secondaryActionLabel: homePayload.hero.actions[1]?.label ?? "",
    secondaryActionHref: homePayload.hero.actions[1]?.href ?? "",
    featuredTopicIds: topicRows.slice(0, 3).map((row) => row.id),
    featuredArticleIds: articleRows.slice(0, 3).map((row) => row.id),
    featuredEventIds: eventRows.slice(0, 3).map((row) => row.id),
    cityHighlightIds: cityRows.slice(0, 3).map((row) => row.id),
    applicationTitle: homePayload.applicationCallout.title,
    applicationSummary: homePayload.applicationCallout.summary,
    applicationHref: homePayload.applicationCallout.href
  };
};

const normalizeHomepagePayload = async (value: unknown): Promise<AdminHomepageFeaturedBlockPayload> => {
  const fallback = await getDefaultHomepagePayload();

  if (!isRecord(value)) {
    return fallback;
  }

  const readString = (key: keyof AdminHomepageFeaturedBlockPayload, fallbackValue: string) =>
    typeof value[key] === "string" && value[key].trim().length > 0 ? value[key].trim() : fallbackValue;
  const readIdArray = (key: keyof AdminHomepageFeaturedBlockPayload, fallbackValue: string[]) =>
    Array.isArray(value[key])
      ? value[key]
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      : fallbackValue;

  return {
    heroEyebrow: readString("heroEyebrow", fallback.heroEyebrow),
    heroTitle: readString("heroTitle", fallback.heroTitle),
    heroSummary: readString("heroSummary", fallback.heroSummary),
    primaryActionLabel: readString("primaryActionLabel", fallback.primaryActionLabel),
    primaryActionHref: readString("primaryActionHref", fallback.primaryActionHref),
    secondaryActionLabel: readString("secondaryActionLabel", fallback.secondaryActionLabel),
    secondaryActionHref: readString("secondaryActionHref", fallback.secondaryActionHref),
    featuredTopicIds: readIdArray("featuredTopicIds", fallback.featuredTopicIds),
    featuredArticleIds: readIdArray("featuredArticleIds", fallback.featuredArticleIds),
    featuredEventIds: readIdArray("featuredEventIds", fallback.featuredEventIds),
    cityHighlightIds: readIdArray("cityHighlightIds", fallback.cityHighlightIds),
    applicationTitle: readString("applicationTitle", fallback.applicationTitle),
    applicationSummary: readString("applicationSummary", fallback.applicationSummary),
    applicationHref: readString("applicationHref", fallback.applicationHref)
  };
};

const mapHomepageBlockRecord = async (
  block: typeof featuredBlocks.$inferSelect | null
): Promise<AdminFeaturedBlockRecord> => ({
  id: block?.id ?? null,
  code: HOMEPAGE_BLOCK_CODE,
  name: HOMEPAGE_BLOCK_NAME,
  status: (block?.status ?? "active") as AdminFeaturedBlockRecord["status"],
  payload: await normalizeHomepagePayload(block?.payloadJson),
  createdAt: asIso(block?.createdAt),
  updatedAt: asIso(block?.updatedAt)
});

const listHomepageReferences = async (): Promise<AdminFeaturedBlockReferences> => {
  const db = getDb();
  const [topicRows, articleRows, eventRows, cityRows] = await Promise.all([
    db
      .select({ id: topics.id, label: topics.title, description: topics.summary })
      .from(topics)
      .where(eq(topics.status, "published"))
      .orderBy(asc(topics.title)),
    db
      .select({ id: articles.id, label: articles.title, description: articles.excerpt })
      .from(articles)
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.publishedAt), desc(articles.updatedAt)),
    db
      .select({ id: events.id, label: events.title, description: events.summary })
      .from(events)
      .where(eq(events.status, "published"))
      .orderBy(asc(events.startsAt), asc(events.title)),
    db
      .select({ id: cities.id, label: cities.name, description: cities.summary })
      .from(cities)
      .where(eq(cities.status, "published"))
      .orderBy(asc(cities.name))
  ]);

  return {
    topics: topicRows.map((row) => toEditorReferenceOption(row.id, row.label, row.description)),
    articles: articleRows.map((row) => toEditorReferenceOption(row.id, row.label, row.description)),
    events: eventRows.map((row) => toEditorReferenceOption(row.id, row.label, row.description)),
    cities: cityRows.map((row) => toEditorReferenceOption(row.id, row.label, row.description))
  };
};

const assertSelectedReferences = async (payload: AdminHomepageFeaturedBlockPayload) => {
  const db = getDb();
  const issues: AdminValidationIssue[] = [];

  const verifyIds = async (
    field: string,
    ids: string[],
    loadRows: () => Promise<Array<{ id: string }>>
  ) => {
    if (ids.length === 0) {
      return;
    }

    const rows = await loadRows();

    if (rows.length !== ids.length) {
      issues.push({
        field,
        message: "One or more selected items are missing or not currently published."
      });
    }
  };

  await Promise.all([
    verifyIds(
      "payload.featuredTopicIds",
      payload.featuredTopicIds,
      () =>
        db
          .select({ id: topics.id })
          .from(topics)
          .where(and(eq(topics.status, "published"), inArray(topics.id, payload.featuredTopicIds)))
    ),
    verifyIds(
      "payload.featuredArticleIds",
      payload.featuredArticleIds,
      () =>
        db
          .select({ id: articles.id })
          .from(articles)
          .where(and(eq(articles.status, "published"), inArray(articles.id, payload.featuredArticleIds)))
    ),
    verifyIds(
      "payload.featuredEventIds",
      payload.featuredEventIds,
      () =>
        db
          .select({ id: events.id })
          .from(events)
          .where(and(eq(events.status, "published"), inArray(events.id, payload.featuredEventIds)))
    ),
    verifyIds(
      "payload.cityHighlightIds",
      payload.cityHighlightIds,
      () =>
        db
          .select({ id: cities.id })
          .from(cities)
          .where(and(eq(cities.status, "published"), inArray(cities.id, payload.cityHighlightIds)))
    )
  ]);

  if (issues.length > 0) {
    throw new AdminContentError(400, "VALIDATION_ERROR", "Homepage featured selections are invalid.", {
      issues
    });
  }
};

const loadHomepageBlock = async () => {
  const db = getDb();
  return db.query.featuredBlocks.findFirst({
    where: eq(featuredBlocks.code, HOMEPAGE_BLOCK_CODE)
  });
};

const loadSiteSettingRows = async () => {
  const db = getDb();
  return db
    .select()
    .from(siteSettings)
    .where(inArray(siteSettings.key, [SITE_NAME_KEY, SITE_FOOTER_TAGLINE_KEY, SITE_SUPPORT_EMAIL_KEY]));
};

const mapSiteSettingsRecord = (rows: Array<typeof siteSettings.$inferSelect>): AdminSiteSettingsRecord => {
  const byKey = new Map(rows.map((row) => [row.key, row.valueJson]));

  return {
    siteName: getStringSettingValue(byKey.get(SITE_NAME_KEY)) || platformName,
    footerTagline: getStringSettingValue(byKey.get(SITE_FOOTER_TAGLINE_KEY)) || defaultSiteConfig.footerTagline,
    supportEmail: getStringSettingValue(byKey.get(SITE_SUPPORT_EMAIL_KEY))
  };
};

const upsertSiteSetting = async (key: string, valueJson: Record<string, string>, staffAccountId: string) => {
  const db = getDb();
  const existing = await db.query.siteSettings.findFirst({
    where: eq(siteSettings.key, key)
  });

  if (existing) {
    await db
      .update(siteSettings)
      .set({
        valueJson,
        updatedByStaffId: staffAccountId,
        updatedAt: now()
      })
      .where(eq(siteSettings.id, existing.id));
    return;
  }

  await db.insert(siteSettings).values({
    key,
    valueJson,
    updatedByStaffId: staffAccountId,
    updatedAt: now()
  });
};

export const getAdminHomepageFeaturedBlock = async (): Promise<AdminFeaturedBlockDetailPayload> => {
  const [block, references] = await Promise.all([loadHomepageBlock(), listHomepageReferences()]);

  return {
    block: await mapHomepageBlockRecord(block ?? null),
    references
  };
};

export const updateAdminHomepageFeaturedBlock = async (
  input: AdminFeaturedBlockUpsertInput,
  actor: AuditActorContext
): Promise<AdminFeaturedBlockDetailPayload> => {
  await assertSelectedReferences(input.payload);

  if (!actor.actorStaffAccountId) {
    throw new AdminContentError(403, "FORBIDDEN", "Active staff access is required.");
  }

  const db = getDb();
  const existing = await loadHomepageBlock();
  const before = await mapHomepageBlockRecord(existing ?? null);
  const timestamp = now();

  if (existing) {
    await db
      .update(featuredBlocks)
      .set({
        name: HOMEPAGE_BLOCK_NAME,
        status: input.status,
        payloadJson: input.payload,
        updatedByStaffId: actor.actorStaffAccountId,
        updatedAt: timestamp
      })
      .where(eq(featuredBlocks.id, existing.id));
  } else {
    await db.insert(featuredBlocks).values({
      code: HOMEPAGE_BLOCK_CODE,
      name: HOMEPAGE_BLOCK_NAME,
      status: input.status,
      payloadJson: input.payload,
      createdByStaffId: actor.actorStaffAccountId,
      updatedByStaffId: actor.actorStaffAccountId,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }

  const result = await getAdminHomepageFeaturedBlock();

  await writeAuditLog(actor, {
    action: "featured_block.update",
    targetType: "featured_block",
    targetId: result.block.id,
    before,
    after: result.block
  });

  return result;
};

export const getActiveHomepageFeaturedBlockPayload = async (): Promise<AdminHomepageFeaturedBlockPayload | null> => {
  const block = await loadHomepageBlock();

  if (!block || block.status !== "active") {
    return null;
  }

  return normalizeHomepagePayload(block.payloadJson);
};

export const getAdminSiteSettings = async (): Promise<AdminSiteSettingsPayload> => ({
  settings: mapSiteSettingsRecord(await loadSiteSettingRows())
});

export const updateAdminSiteSettings = async (
  input: AdminSiteSettingsInput,
  actor: AuditActorContext
): Promise<AdminSiteSettingsPayload> => {
  if (!actor.actorStaffAccountId) {
    throw new AdminContentError(403, "FORBIDDEN", "Active staff access is required.");
  }

  const before = mapSiteSettingsRecord(await loadSiteSettingRows());
  await Promise.all([
    upsertSiteSetting(SITE_NAME_KEY, { value: input.siteName }, actor.actorStaffAccountId),
    upsertSiteSetting(SITE_FOOTER_TAGLINE_KEY, { value: input.footerTagline }, actor.actorStaffAccountId),
    upsertSiteSetting(SITE_SUPPORT_EMAIL_KEY, { value: input.supportEmail }, actor.actorStaffAccountId)
  ]);

  const result = await getAdminSiteSettings();

  await writeAuditLog(actor, {
    action: "site_settings.update",
    targetType: "site_settings",
    before,
    after: result.settings
  });

  return result;
};

export const getPublicSiteConfigFromDb = async (): Promise<PublicSiteConfig> => {
  const settings = mapSiteSettingsRecord(await loadSiteSettingRows());

  return {
    platformName: settings.siteName || defaultSiteConfig.platformName,
    navigation: [...publicNav],
    contentCollections: [...defaultSiteConfig.contentCollections],
    footerTagline: settings.footerTagline || defaultSiteConfig.footerTagline,
    supportEmail: settings.supportEmail || null
  };
};
