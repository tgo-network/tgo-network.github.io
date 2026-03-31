import { and, asc, desc, eq } from "drizzle-orm";

import {
  articles,
  assets,
  authors,
  branchBoardMembers,
  branches,
  eventRegistrations,
  eventSessions,
  events,
  homepageSections,
  joinApplications,
  members,
  sitePages
} from "@tgo/db";
import type {
  AboutPagePayload,
  BranchDetail,
  BranchSummary,
  JoinApplicationInput,
  JoinApplicationReceipt,
  JoinPagePayload,
  MemberDetail,
  MemberSummary,
  PublicArticleDetailV2,
  PublicArticleSummaryV2,
  PublicEventDetailV2,
  PublicEventRegistrationInputV2,
  PublicEventRegistrationReceiptV2,
  PublicEventSummaryV2,
  PublicHomePayloadV2,
  PublicImageAsset
} from "@tgo/shared";
import {
  aboutPagePayload,
  branchDetails,
  filterVisiblePublicArticleSummaries,
  getMemberDetail,
  getPublicArticleDetailV2,
  getPublicEventDetailV2,
  isTransientPublicArticleSlug,
  joinPagePayload,
  memberSummaries,
  publicArticleSummariesV2,
  publicEventSummariesV2,
  publicHomePayloadV2,
  siteConfig
} from "@tgo/shared";

import { getDb, isDatabaseConfigured } from "./db.js";
import { PublicContentError } from "./public-errors.js";
import { getAssetPublicUrl } from "./storage.js";

const asIso = (value: Date | null | undefined) => (value ? value.toISOString() : null);
const asRequiredIso = (value: Date | null | undefined, fallback: string) => asIso(value) ?? fallback;
const nowIso = () => new Date().toISOString();
const knownEventCities = [
  "北京",
  "上海",
  "杭州",
  "广州",
  "深圳",
  "成都",
  "硅谷",
  "南京",
  "武汉",
  "台北",
  "厦门",
  "苏州",
  "合肥",
  "天津",
  "福州",
  "西安",
  "珠海",
  "新加坡",
  "青岛"
] as const;

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

const toBranchReference = (branch: typeof branches.$inferSelect | null) =>
  branch
    ? {
        slug: branch.slug,
        name: branch.name,
        cityName: branch.cityName
      }
    : null;

const inferCityNameFromText = (...fields: Array<string | null | undefined>) => {
  const merged = fields.filter((value): value is string => Boolean(value && value.trim())).join(" ");

  for (const cityName of knownEventCities) {
    if (merged.includes(cityName)) {
      return cityName;
    }
  }

  const match = merged.match(/^([\u4e00-\u9fa5]{2,6})(?:市|国际|软件|创新|会展|会客|中心|园|馆|大厦|酒店|广场|路|区)/);
  return match?.[1] ?? "待定";
};

const getEventCityName = (
  event: Pick<typeof events.$inferSelect, "venueName" | "venueAddress" | "title">,
  branch: typeof branches.$inferSelect | null
) => branch?.cityName ?? inferCityNameFromText(event.venueAddress, event.venueName, event.title);

const listPublishedArticleSummariesFromDb = async (): Promise<Array<{ id: string; summary: PublicArticleSummaryV2 }> | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = getDb();
  const [articleRows, authorRows, assetRows, branchRows] = await Promise.all([
    db
      .select()
      .from(articles)
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.publishedAt), desc(articles.updatedAt)),
    db.select().from(authors),
    db.select().from(assets).where(and(eq(assets.status, "active"), eq(assets.visibility, "public"))),
    db.select().from(branches)
  ]);

  const authorById = new Map(authorRows.map((row) => [row.id, row]));
  const assetById = new Map(assetRows.map((row) => [row.id, row]));
  const branchById = new Map(branchRows.map((row) => [row.id, row]));

  return articleRows
    .map((article) => {
    const author = article.authorId ? authorById.get(article.authorId) : null;
    const branch = article.branchId ? branchById.get(article.branchId) ?? null : null;

    return {
      id: article.id,
      summary: {
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt ?? "",
        publishedAt: asRequiredIso(article.publishedAt, article.updatedAt.toISOString()),
        authorName: author?.displayName ?? "TGO 编辑部",
        coverImage: toPublicImageAsset(assetById.get(article.coverAssetId ?? ""), `${article.title} cover image`),
        branch: toBranchReference(branch)
      }
    };
    })
    .filter((row) => filterVisiblePublicArticleSummaries([row.summary]).length > 0);
};

const listPublishedBranchSummariesFromDb = async (): Promise<Array<{ id: string; summary: BranchSummary }> | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = getDb();
  const [branchRows, boardRows, assetRows] = await Promise.all([
    db.select().from(branches).where(eq(branches.status, "published")).orderBy(asc(branches.sortOrder), asc(branches.name)),
    db.select().from(branchBoardMembers).where(eq(branchBoardMembers.status, "published")).orderBy(asc(branchBoardMembers.sortOrder)),
    db.select().from(assets).where(and(eq(assets.status, "active"), eq(assets.visibility, "public")))
  ]);

  const boardCountByBranchId = new Map<string, number>();
  for (const row of boardRows) {
    boardCountByBranchId.set(row.branchId, (boardCountByBranchId.get(row.branchId) ?? 0) + 1);
  }
  const assetById = new Map(assetRows.map((row) => [row.id, row]));

  return branchRows.map((branch) => ({
    id: branch.id,
    summary: {
      slug: branch.slug,
      name: branch.name,
      cityName: branch.cityName,
      region: branch.region ?? "",
      summary: branch.summary ?? "",
      boardMemberCount: boardCountByBranchId.get(branch.id) ?? 0,
      coverImage: toPublicImageAsset(assetById.get(branch.coverAssetId ?? ""), `${branch.name} cover image`)
    }
  }));
};

const listPublishedEventSummariesFromDb = async (): Promise<Array<{ id: string; summary: PublicEventSummaryV2 }> | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = getDb();
  const [eventRows, branchRows, assetRows] = await Promise.all([
    db.select().from(events).where(eq(events.status, "published")).orderBy(desc(events.startsAt), asc(events.title)),
    db.select().from(branches),
    db.select().from(assets).where(and(eq(assets.status, "active"), eq(assets.visibility, "public")))
  ]);

  const branchById = new Map(branchRows.map((row) => [row.id, row]));
  const assetById = new Map(assetRows.map((row) => [row.id, row]));

  return eventRows.map((event) => {
    const branch = event.branchId ? branchById.get(event.branchId) : null;

    return {
      id: event.id,
      summary: {
        slug: event.slug,
        title: event.title,
        summary: event.summary ?? "",
        startsAt: asRequiredIso(event.startsAt, event.updatedAt.toISOString()),
        endsAt: asRequiredIso(event.endsAt, event.updatedAt.toISOString()),
        cityName: getEventCityName(event, branch ?? null),
        venueName: event.venueName ?? "待定",
        venueAddress: event.venueAddress ?? "",
        coverImage: toPublicImageAsset(assetById.get(event.coverAssetId ?? ""), `${event.title} cover image`),
        registrationUrl: event.registrationUrl ?? null,
        branch: branch
          ? {
              slug: branch.slug,
              name: branch.name,
              cityName: branch.cityName
            }
          : null,
        registrationState: event.registrationState
      }
    };
  });
};

export const listBranchesFromDb = async (): Promise<BranchDetail[] | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = getDb();
  const [branchRows, boardRows, memberRows, assetRows] = await Promise.all([
    db.select().from(branches).where(eq(branches.status, "published")).orderBy(asc(branches.sortOrder), asc(branches.name)),
    db.select().from(branchBoardMembers).where(eq(branchBoardMembers.status, "published")).orderBy(asc(branchBoardMembers.sortOrder)),
    db.select().from(members),
    db.select().from(assets).where(and(eq(assets.status, "active"), eq(assets.visibility, "public")))
  ]);

  const assetById = new Map(assetRows.map((row) => [row.id, row]));
  const memberById = new Map(memberRows.map((row) => [row.id, row]));
  const boardByBranchId = new Map<string, typeof boardRows>();

  for (const row of boardRows) {
    boardByBranchId.set(row.branchId, [...(boardByBranchId.get(row.branchId) ?? []), row]);
  }

  return branchRows.map((branch) => ({
    slug: branch.slug,
    name: branch.name,
    cityName: branch.cityName,
    region: branch.region ?? "",
    summary: branch.summary ?? "",
    boardMemberCount: (boardByBranchId.get(branch.id) ?? []).length,
    coverImage: toPublicImageAsset(assetById.get(branch.coverAssetId ?? ""), `${branch.name} cover image`),
    body: branch.bodyRichtext ?? "",
    boardMembers: (boardByBranchId.get(branch.id) ?? []).map((member) => ({
      displayName: member.displayName,
      company: member.company,
      title: member.title,
      bio: member.bio ?? memberById.get(member.memberId ?? "")?.bio ?? "",
      avatar: toPublicImageAsset(assetById.get(member.avatarAssetId ?? ""), `${member.displayName} avatar`)
    }))
  }));
};

export const listMembersFromDb = async (): Promise<MemberSummary[] | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = getDb();
  const [memberRows, branchRows, assetRows] = await Promise.all([
    db
      .select()
      .from(members)
      .where(eq(members.visibility, "public"))
      .orderBy(desc(members.featured), asc(members.sortOrder), asc(members.name)),
    db.select().from(branches),
    db.select().from(assets).where(and(eq(assets.status, "active"), eq(assets.visibility, "public")))
  ]);

  const branchById = new Map(branchRows.map((row) => [row.id, row]));
  const assetById = new Map(assetRows.map((row) => [row.id, row]));

  return memberRows.map((member) => {
    const branch = member.branchId ? branchById.get(member.branchId) : null;

    return {
      slug: member.slug,
      name: member.name,
      company: member.company,
      title: member.title,
      avatar: toPublicImageAsset(assetById.get(member.avatarAssetId ?? ""), `${member.name} avatar`),
      branch: branch
        ? {
            slug: branch.slug,
            name: branch.name,
            cityName: branch.cityName
          }
        : null,
      joinedAt: asRequiredIso(member.joinedAt, member.createdAt.toISOString())
    };
  });
};

export const getMemberDetailFromDb = async (slug: string): Promise<MemberDetail | null | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = getDb();
  const member = await db.query.members.findFirst({
    where: and(eq(members.slug, slug.trim()), eq(members.visibility, "public"))
  });

  if (!member) {
    return null;
  }

  const [branch, avatar] = await Promise.all([
    member.branchId ? db.query.branches.findFirst({ where: eq(branches.id, member.branchId) }) : Promise.resolve(null),
    member.avatarAssetId ? db.query.assets.findFirst({ where: eq(assets.id, member.avatarAssetId) }) : Promise.resolve(null)
  ]);

  return {
    slug: member.slug,
    name: member.name,
    company: member.company,
    title: member.title,
    bio: member.bio ?? "",
    avatar: toPublicImageAsset(avatar ?? undefined, `${member.name} avatar`),
    branch: branch
      ? {
          slug: branch.slug,
          name: branch.name,
          cityName: branch.cityName
        }
      : null,
    joinedAt: asRequiredIso(member.joinedAt, member.createdAt.toISOString())
  };
};

export const listArticlesV2FromDb = async (): Promise<PublicArticleSummaryV2[] | undefined> => {
  const rows = await listPublishedArticleSummariesFromDb();

  return rows?.map((row) => row.summary);
};

export const getArticleDetailV2FromDb = async (slug: string): Promise<PublicArticleDetailV2 | null | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = getDb();
  const article = await db.query.articles.findFirst({
    where: and(eq(articles.status, "published"), eq(articles.slug, slug.trim()))
  });

  if (!article) {
    return null;
  }

  if (isTransientPublicArticleSlug(article.slug)) {
    return null;
  }

  const [author, coverAsset, branch] = await Promise.all([
    article.authorId ? db.query.authors.findFirst({ where: eq(authors.id, article.authorId) }) : Promise.resolve(null),
    article.coverAssetId ? db.query.assets.findFirst({ where: eq(assets.id, article.coverAssetId) }) : Promise.resolve(null),
    article.branchId ? db.query.branches.findFirst({ where: eq(branches.id, article.branchId) }) : Promise.resolve(null)
  ]);

  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt ?? "",
    publishedAt: asRequiredIso(article.publishedAt, article.updatedAt.toISOString()),
    authorName: author?.displayName ?? "TGO 编辑部",
    coverImage: toPublicImageAsset(coverAsset ?? undefined, `${article.title} cover image`),
    branch: toBranchReference(branch ?? null),
    body: (article.bodyRichtext ?? "")
      .split(/\n\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
    author: {
      name: author?.displayName ?? "TGO 编辑部",
      role: author?.bio ?? "工作人员"
    }
  };
};

export const listEventsV2FromDb = async (): Promise<PublicEventSummaryV2[] | undefined> => {
  const rows = await listPublishedEventSummariesFromDb();

  return rows?.map((row) => row.summary);
};

export const getEventDetailV2FromDb = async (slug: string): Promise<PublicEventDetailV2 | null | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = getDb();
  const event = await db.query.events.findFirst({
    where: and(eq(events.status, "published"), eq(events.slug, slug.trim()))
  });

  if (!event) {
    return null;
  }

  const [branch, coverAsset, sessionRows] = await Promise.all([
    event.branchId ? db.query.branches.findFirst({ where: eq(branches.id, event.branchId) }) : Promise.resolve(null),
    event.coverAssetId ? db.query.assets.findFirst({ where: eq(assets.id, event.coverAssetId) }) : Promise.resolve(null),
    db.select().from(eventSessions).where(eq(eventSessions.eventId, event.id)).orderBy(asc(eventSessions.sortOrder))
  ]);

  return {
    slug: event.slug,
    title: event.title,
    summary: event.summary ?? "",
    startsAt: asRequiredIso(event.startsAt, event.updatedAt.toISOString()),
    endsAt: asRequiredIso(event.endsAt, event.updatedAt.toISOString()),
    cityName: getEventCityName(event, branch ?? null),
    venueName: event.venueName ?? "待定",
    venueAddress: event.venueAddress ?? "",
    coverImage: toPublicImageAsset(coverAsset ?? undefined, `${event.title} cover image`),
    registrationUrl: event.registrationUrl ?? null,
    branch: branch
      ? {
          slug: branch.slug,
          name: branch.name,
          cityName: branch.cityName
        }
      : null,
    registrationState: event.registrationState,
    body: event.bodyRichtext ?? "",
    agenda: sessionRows.map((item, index) => ({
      time: item.startsAt ? item.startsAt.toISOString().slice(11, 16) : `${String(index + 9).padStart(2, "0")}:00`,
      title: item.title,
      speaker: item.speakerName ?? "待定",
      summary: item.summary ?? ""
    }))
  };
};

const defaultPageTitle = {
  join: joinPagePayload.hero.title,
  about: aboutPagePayload.hero.title
} as const;

const mapJoinPagePayload = (row: typeof sitePages.$inferSelect | null): JoinPagePayload => {
  const summary = row?.summary?.trim() || joinPagePayload.hero.summary;
  const body = (row?.bodyRichtext ?? "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    hero: {
      eyebrow: "加入 TGO 鲲鹏会",
      title: row?.title?.trim() || defaultPageTitle.join,
      summary
    },
    conditions: body.slice(0, 3).length > 0 ? body.slice(0, 3) : joinPagePayload.conditions,
    benefits: body.slice(3, 6).length > 0 ? body.slice(3, 6) : joinPagePayload.benefits,
    process: body.slice(6, 9).length > 0 ? body.slice(6, 9) : joinPagePayload.process,
    faq: joinPagePayload.faq,
    cta: joinPagePayload.cta
  };
};

const mapAboutPagePayload = (row: typeof sitePages.$inferSelect | null): AboutPagePayload => {
  const summary = row?.summary?.trim() || aboutPagePayload.hero.summary;
  const body = (row?.bodyRichtext ?? "").trim();
  const structuredSections = body
    ? body
        .split(/\n(?=##\s+)/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => {
          const [headingLine, ...restLines] = block.split("\n");
          const title = headingLine.replace(/^##\s*/, "").trim();
          const paragraphs = restLines
            .join("\n")
            .split(/\n{2,}/)
            .map((item) => item.trim())
            .filter(Boolean);

          if (!title) {
            return null;
          }

          return {
            title,
            body: paragraphs
          };
        })
        .filter(
          (
            item
          ): item is {
            title: string;
            body: string[];
          } => Boolean(item && item.body.length > 0)
        )
    : [];

  return {
    hero: {
      eyebrow: aboutPagePayload.hero.eyebrow,
      title: row?.title?.trim() || defaultPageTitle.about,
      summary
    },
    sections:
      structuredSections.length > 0
        ? structuredSections
        : aboutPagePayload.sections
  };
};

export const getJoinPageFromDb = async (): Promise<JoinPagePayload | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = getDb();
  const row = await db.query.sitePages.findFirst({
    where: and(eq(sitePages.slug, "join"), eq(sitePages.status, "published"))
  });

  return mapJoinPagePayload(row ?? null);
};

export const getAboutPageFromDb = async (): Promise<AboutPagePayload | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = getDb();
  const row = await db.query.sitePages.findFirst({
    where: and(eq(sitePages.slug, "about"), eq(sitePages.status, "published"))
  });

  return mapAboutPagePayload(row ?? null);
};

export const getHomePayloadV2FromDb = async (): Promise<PublicHomePayloadV2 | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = getDb();
  const homepage = await db.query.homepageSections.findFirst({
    where: and(eq(homepageSections.code, "home"), eq(homepageSections.status, "published"))
  });

  const articleRows = (await listPublishedArticleSummariesFromDb()) ?? [];
  const eventRows = (await listPublishedEventSummariesFromDb()) ?? [];
  const branchRows = (await listPublishedBranchSummariesFromDb()) ?? [];

  if (!homepage) {
    return {
      ...publicHomePayloadV2,
      featuredArticles: articleRows.map((row) => row.summary).slice(0, 3),
      featuredEvents: eventRows.map((row) => row.summary).slice(0, 3),
      branchHighlights: branchRows.map((row) => row.summary).slice(0, 3)
    };
  }

  const payload = (homepage.payloadJson as Record<string, unknown> | null) ?? {};
  const featuredArticleIds = Array.isArray(payload.featuredArticleIds)
    ? payload.featuredArticleIds.filter((item): item is string => typeof item === "string")
    : [];
  const featuredEventIds = Array.isArray(payload.featuredEventIds)
    ? payload.featuredEventIds.filter((item): item is string => typeof item === "string")
    : [];
  const branchHighlightIds = Array.isArray(payload.branchHighlightIds)
    ? payload.branchHighlightIds.filter((item): item is string => typeof item === "string")
    : [];

  const articleById = new Map(articleRows.map((row) => [row.id, row.summary]));
  const eventById = new Map(eventRows.map((row) => [row.id, row.summary]));
  const branchById = new Map(branchRows.map((row) => [row.id, row.summary]));
  const fallbackFeaturedArticles = articleRows.map((row) => row.summary).slice(0, 3);
  const fallbackFeaturedEvents = eventRows.map((row) => row.summary).slice(0, 3);
  const fallbackBranchHighlights = branchRows.map((row) => row.summary).slice(0, 3);
  const featuredArticles = featuredArticleIds
    .map((id) => articleById.get(id))
    .filter((value): value is PublicArticleSummaryV2 => Boolean(value));
  const featuredEvents = featuredEventIds
    .map((id) => eventById.get(id))
    .filter((value): value is PublicEventSummaryV2 => Boolean(value));
  const branchHighlights = branchHighlightIds
    .map((id) => branchById.get(id))
    .filter((value): value is BranchSummary => Boolean(value));
  const metrics = Array.isArray(payload.metrics)
    ? payload.metrics
        .filter((item): item is { label?: string; value?: string; description?: string } => typeof item === "object" && item !== null)
        .map((item) => ({
          label: typeof item.label === "string" ? item.label : "",
          value: typeof item.value === "string" ? item.value : "",
          description: typeof item.description === "string" ? item.description : ""
        }))
        .filter((item) => item.label.length > 0 && item.value.length > 0)
    : publicHomePayloadV2.metrics;

  return {
    hero: {
      eyebrow: typeof payload.heroEyebrow === "string" && payload.heroEyebrow.trim().length > 0 ? payload.heroEyebrow : publicHomePayloadV2.hero.eyebrow,
      title: typeof payload.heroTitle === "string" && payload.heroTitle.trim().length > 0 ? payload.heroTitle : publicHomePayloadV2.hero.title,
      summary: typeof payload.heroSummary === "string" && payload.heroSummary.trim().length > 0 ? payload.heroSummary : publicHomePayloadV2.hero.summary,
      actions: [
        {
          label: typeof payload.primaryActionLabel === "string" && payload.primaryActionLabel.trim().length > 0 ? payload.primaryActionLabel : publicHomePayloadV2.hero.actions[0]?.label ?? "了解加入方式",
          href: typeof payload.primaryActionHref === "string" && payload.primaryActionHref.trim().length > 0 ? payload.primaryActionHref : publicHomePayloadV2.hero.actions[0]?.href ?? "/join"
        },
        {
          label: typeof payload.secondaryActionLabel === "string" && payload.secondaryActionLabel.trim().length > 0 ? payload.secondaryActionLabel : publicHomePayloadV2.hero.actions[1]?.label ?? "查看近期活动",
          href: typeof payload.secondaryActionHref === "string" && payload.secondaryActionHref.trim().length > 0 ? payload.secondaryActionHref : publicHomePayloadV2.hero.actions[1]?.href ?? "/events"
        }
      ]
    },
    intro: {
      title: typeof payload.introTitle === "string" && payload.introTitle.trim().length > 0 ? payload.introTitle : publicHomePayloadV2.intro.title,
      summary: typeof payload.introSummary === "string" && payload.introSummary.trim().length > 0 ? payload.introSummary : publicHomePayloadV2.intro.summary
    },
    audience: {
      title: typeof payload.audienceTitle === "string" && payload.audienceTitle.trim().length > 0 ? payload.audienceTitle : publicHomePayloadV2.audience.title,
      items: Array.isArray(payload.audienceItems)
        ? payload.audienceItems.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : publicHomePayloadV2.audience.items
    },
    metrics: metrics.length > 0 ? metrics : publicHomePayloadV2.metrics,
    featuredArticles: featuredArticles.length > 0 ? featuredArticles : fallbackFeaturedArticles,
    featuredEvents: featuredEvents.length > 0 ? featuredEvents : fallbackFeaturedEvents,
    branchHighlights: branchHighlights.length > 0 ? branchHighlights : fallbackBranchHighlights,
    joinCallout: {
      title: typeof payload.joinTitle === "string" && payload.joinTitle.trim().length > 0 ? payload.joinTitle : publicHomePayloadV2.joinCallout.title,
      summary: typeof payload.joinSummary === "string" && payload.joinSummary.trim().length > 0 ? payload.joinSummary : publicHomePayloadV2.joinCallout.summary,
      href: typeof payload.joinHref === "string" && payload.joinHref.trim().length > 0 ? payload.joinHref : publicHomePayloadV2.joinCallout.href
    }
  };
};

export const createJoinApplicationFromDb = async (
  input: JoinApplicationInput
): Promise<JoinApplicationReceipt | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = getDb();
  const [created] = await db
    .insert(joinApplications)
    .values({
      name: input.name,
      phoneNumber: input.phoneNumber,
      wechatId: input.wechatId,
      email: input.email,
      introduction: input.introduction,
      applicationMessage: input.applicationMessage,
      targetBranchId: input.targetBranchId ?? null,
      status: "submitted"
    })
    .returning({
      id: joinApplications.id,
      createdAt: joinApplications.createdAt
    });

  if (!created) {
    return undefined;
  }

  return {
    id: created.id,
    receivedAt: created.createdAt.toISOString(),
    applicant: {
      name: input.name,
      phoneNumber: input.phoneNumber,
      ...(input.wechatId ? { wechatId: input.wechatId } : {}),
      ...(input.email ? { email: input.email } : {})
    }
  };
};

const resolveRegistrationStatus = (registrationState: PublicEventSummaryV2["registrationState"]) =>
  registrationState === "waitlist" ? "waitlisted" : "submitted";

export const createPublicEventRegistrationV2FromDb = async (
  eventIdentifier: string,
  input: PublicEventRegistrationInputV2,
  context?: {
    submittedIp?: string | null;
    submittedUserAgent?: string | null;
  }
): Promise<PublicEventRegistrationReceiptV2 | undefined> => {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = getDb();
  const normalized = eventIdentifier.trim();
  const event =
    (await db.query.events.findFirst({
      where: and(eq(events.status, "published"), eq(events.slug, normalized))
    })) ??
    (await db.query.events.findFirst({
      where: and(eq(events.status, "published"), eq(events.id, normalized))
    }));

  if (!event) {
    throw new PublicContentError(404, "NOT_FOUND", "活动不存在。");
  }

  if (event.registrationState !== "open" && event.registrationState !== "waitlist") {
    throw new PublicContentError(409, "REGISTRATION_CLOSED", "当前活动尚未开放报名。");
  }

  const status = resolveRegistrationStatus(event.registrationState);
  const [created] = await db
    .insert(eventRegistrations)
    .values({
      eventId: event.id,
      name: input.name,
      phoneNumber: input.phoneNumber,
      wechatId: input.wechatId,
      email: input.email,
      company: input.company,
      jobTitle: input.title,
      note: input.note,
      status,
      source: "public_form",
      reviewNotes: null,
      submittedIp: context?.submittedIp ?? null,
      submittedUserAgent: context?.submittedUserAgent ?? null
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
      phoneNumber: input.phoneNumber,
      ...(input.wechatId ? { wechatId: input.wechatId } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...(input.company ? { company: input.company } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.note ? { note: input.note } : {})
    }
  };
};

export const publicFallback = {
  branches: branchDetails,
  members: memberSummaries,
  getMemberDetail,
  articles: publicArticleSummariesV2,
  getArticleDetail: getPublicArticleDetailV2,
  events: publicEventSummariesV2,
  getEventDetail: getPublicEventDetailV2,
  joinPage: joinPagePayload,
  aboutPage: aboutPagePayload,
  home: publicHomePayloadV2,
  nowIso
};
