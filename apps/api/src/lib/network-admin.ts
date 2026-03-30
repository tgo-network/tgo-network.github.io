import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import {
  articles,
  assets,
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
  AdminBranchDetailPayload,
  AdminBranchListItem,
  AdminBranchRecord,
  AdminBranchUpsertInput,
  AdminDashboardPayloadV2,
  AdminEventDetailPayloadV2,
  AdminEventListItemV2,
  AdminEventListMetaV2,
  AdminEventListQueryV2,
  AdminEventRecordV2,
  AdminEventReferencesV2,
  AdminEventRegistrationDetailPayloadV2,
  AdminEventRegistrationListItemV2,
  AdminEventRegistrationListPayloadV2,
  AdminEventRegistrationRecordV2,
  AdminEventRegistrationUpdateInputV2,
  AdminEventUpsertInputV2,
  AdminHomepageDetailPayload,
  AdminHomepageRecord,
  AdminHomepageUpsertInput,
  AdminJoinApplicationDetailPayload,
  AdminJoinApplicationListItem,
  AdminJoinApplicationRecord,
  AdminJoinApplicationUpdateInput,
  AdminMemberDetailPayload,
  AdminMemberListItem,
  AdminMemberRecord,
  AdminMemberUpsertInput,
  AdminSitePageDetailPayloadV2,
  AdminSitePageRecordV2,
  AdminSitePageUpsertInputV2,
  AdminValidationIssue,
  PublicHomePayloadV2
} from "@tgo/shared";
import { contentStatusOptions, eventRegistrationStateOptions, publicHomePayloadV2 } from "@tgo/shared";

import { type AuditActorContext, writeAuditLog } from "./audit.js";
import { AdminContentError } from "./admin-content.js";
import { getDb } from "./db.js";
import { getEnv } from "./env.js";

const asIso = (value: Date | null | undefined) => (value ? value.toISOString() : null);
const now = () => new Date();
const defaultAdminEventListPageSize = 25;
const maxAdminEventListPageSize = 100;

const adminEventStatusSet = new Set<string>(["all", ...contentStatusOptions.map((option) => option.value)]);
const adminEventRegistrationStateSet = new Set<string>([
  "all",
  ...eventRegistrationStateOptions.map((option) => option.value)
]);

const isUniqueViolation = (error: unknown): error is { code: string } =>
  typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";

const getActorStaffAccountId = (actor: AuditActorContext) => {
  if (!actor.actorStaffAccountId) {
    throw new AdminContentError(403, "FORBIDDEN", "需要启用中的员工账号权限。");
  }

  return actor.actorStaffAccountId;
};

const validationError = (issues: AdminValidationIssue[]) =>
  new AdminContentError(400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
    issues
  });

type NormalizedAdminEventListQuery = {
  page: number;
  pageSize: number;
  q: string;
  status: AdminEventListQueryV2["status"];
  registrationState: AdminEventListQueryV2["registrationState"];
  branchId: string | "all";
};

const toPositiveInt = (value: number | undefined, fallback: number, max: number) => {
  if (!Number.isFinite(value) || Number(value) < 1) {
    return fallback;
  }

  return Math.min(max, Math.trunc(Number(value)));
};

const normalizeAdminEventListQuery = (query: AdminEventListQueryV2 = {}): NormalizedAdminEventListQuery => {
  const status = query.status && adminEventStatusSet.has(query.status) ? query.status : "all";
  const registrationState =
    query.registrationState && adminEventRegistrationStateSet.has(query.registrationState)
      ? query.registrationState
      : "all";
  const branchId = typeof query.branchId === "string" && query.branchId.trim().length > 0 ? query.branchId.trim() : "all";

  return {
    page: toPositiveInt(query.page, 1, Number.MAX_SAFE_INTEGER),
    pageSize: toPositiveInt(query.pageSize, defaultAdminEventListPageSize, maxAdminEventListPageSize),
    q: typeof query.q === "string" ? query.q.trim() : "",
    status,
    registrationState,
    branchId
  };
};

const buildAdminEventListWhere = (query: NormalizedAdminEventListQuery) => {
  const conditions = [];

  if (query.q.length > 0) {
    const keyword = `%${query.q}%`;
    conditions.push(or(ilike(events.title, keyword), ilike(events.slug, keyword), ilike(events.venueName, keyword), ilike(branches.name, keyword)));
  }

  if (query.status && query.status !== "all") {
    conditions.push(eq(events.status, query.status));
  }

  if (query.registrationState && query.registrationState !== "all") {
    conditions.push(eq(events.registrationState, query.registrationState));
  }

  if (query.branchId !== "all") {
    conditions.push(eq(events.branchId, query.branchId));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
};

const withUniqueGuard = async <T>(work: () => Promise<T>) => {
  try {
    return await work();
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AdminContentError(409, "CONFLICT", "已存在相同 URL 标识的记录。");
    }

    throw error;
  }
};

const getHomepageDefaultPayload = (): AdminHomepageRecord => ({
  id: null,
  heroEyebrow: publicHomePayloadV2.hero.eyebrow,
  heroTitle: publicHomePayloadV2.hero.title,
  heroSummary: publicHomePayloadV2.hero.summary,
  primaryActionLabel: publicHomePayloadV2.hero.actions[0]?.label ?? "",
  primaryActionHref: publicHomePayloadV2.hero.actions[0]?.href ?? "",
  secondaryActionLabel: publicHomePayloadV2.hero.actions[1]?.label ?? "",
  secondaryActionHref: publicHomePayloadV2.hero.actions[1]?.href ?? "",
  introTitle: publicHomePayloadV2.intro.title,
  introSummary: publicHomePayloadV2.intro.summary,
  audienceTitle: publicHomePayloadV2.audience.title,
  audienceItems: [...publicHomePayloadV2.audience.items],
  metrics: publicHomePayloadV2.metrics.map((item) => ({ ...item })),
  featuredArticleIds: [],
  featuredEventIds: [],
  branchHighlightIds: [],
  joinTitle: publicHomePayloadV2.joinCallout.title,
  joinSummary: publicHomePayloadV2.joinCallout.summary,
  joinHref: publicHomePayloadV2.joinCallout.href,
  updatedAt: null
});

const mapBranchListItem = (
  branch: typeof branches.$inferSelect,
  boardMemberCount: number
): AdminBranchListItem => ({
  id: branch.id,
  slug: branch.slug,
  name: branch.name,
  cityName: branch.cityName,
  region: branch.region ?? "",
  status: branch.status,
  boardMemberCount,
  updatedAt: branch.updatedAt.toISOString()
});

const mapMemberListItem = (
  member: typeof members.$inferSelect,
  branchName: string | null
): AdminMemberListItem => ({
  id: member.id,
  slug: member.slug,
  name: member.name,
  company: member.company,
  title: member.title,
  branchName,
  membershipStatus: member.membershipStatus,
  visibility: member.visibility,
  joinedAt: asIso(member.joinedAt),
  updatedAt: member.updatedAt.toISOString()
});

const mapMemberRecord = (member: typeof members.$inferSelect): AdminMemberRecord => ({
  id: member.id,
  slug: member.slug,
  name: member.name,
  company: member.company,
  title: member.title,
  bio: member.bio ?? "",
  joinedAt: asIso(member.joinedAt),
  branchId: member.branchId,
  avatarAssetId: member.avatarAssetId,
  featured: member.featured,
  membershipStatus: member.membershipStatus,
  visibility: member.visibility,
  sortOrder: member.sortOrder,
  seoTitle: member.seoTitle ?? "",
  seoDescription: member.seoDescription ?? "",
  createdAt: member.createdAt.toISOString(),
  updatedAt: member.updatedAt.toISOString()
});

const mapBranchRecord = (
  branch: typeof branches.$inferSelect,
  boardMembers: AdminBranchRecord["boardMembers"]
): AdminBranchRecord => ({
  id: branch.id,
  slug: branch.slug,
  name: branch.name,
  cityName: branch.cityName,
  region: branch.region ?? "",
  summary: branch.summary ?? "",
  body: branch.bodyRichtext ?? "",
  coverAssetId: branch.coverAssetId,
  seoTitle: branch.seoTitle ?? "",
  seoDescription: branch.seoDescription ?? "",
  sortOrder: branch.sortOrder,
  status: branch.status,
  publishedAt: asIso(branch.publishedAt),
  createdAt: branch.createdAt.toISOString(),
  updatedAt: branch.updatedAt.toISOString(),
  boardMembers
});

const mapJoinApplicationRecord = (
  application: typeof joinApplications.$inferSelect,
  targetBranchName: string | null
): AdminJoinApplicationRecord => ({
  id: application.id,
  name: application.name,
  phoneNumber: application.phoneNumber,
  wechatId: application.wechatId ?? "",
  email: application.email ?? "",
  targetBranchName,
  status: application.status,
  createdAt: application.createdAt.toISOString(),
  introduction: application.introduction,
  applicationMessage: application.applicationMessage,
  targetBranchId: application.targetBranchId,
  reviewedByStaffId: application.reviewedByStaffId,
  reviewedAt: asIso(application.reviewedAt),
  reviewNotes: application.reviewNotes ?? "",
  updatedAt: application.updatedAt.toISOString()
});

const mapSitePageRecord = (
  slug: "join" | "about",
  page: typeof sitePages.$inferSelect | null
): AdminSitePageRecordV2 => ({
  id: page?.id ?? null,
  slug,
  title: page?.title ?? (slug === "join" ? "加入 TGO 鲲鹏会" : "关于我们"),
  summary: page?.summary ?? "",
  body: page?.bodyRichtext ?? "",
  seoTitle: page?.seoTitle ?? "",
  seoDescription: page?.seoDescription ?? "",
  status: (page?.status ?? "draft") as AdminSitePageRecordV2["status"],
  createdAt: asIso(page?.createdAt),
  updatedAt: asIso(page?.updatedAt)
});

const mapHomepageRecord = (section: typeof homepageSections.$inferSelect | null): AdminHomepageRecord => {
  const fallback = getHomepageDefaultPayload();
  const payload = (section?.payloadJson as Record<string, unknown> | null) ?? {};
  const readString = (key: keyof AdminHomepageUpsertInput, fallbackValue: string) =>
    typeof payload[key] === "string" && payload[key].trim().length > 0 ? payload[key].trim() : fallbackValue;
  const readStringArray = (key: keyof AdminHomepageUpsertInput, fallbackValue: string[]) =>
    Array.isArray(payload[key])
      ? payload[key].filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : fallbackValue;
  const readMetrics = () => {
    if (!Array.isArray(payload.metrics)) {
      return fallback.metrics;
    }

    const metrics = payload.metrics
      .filter((item): item is { label?: string; value?: string; description?: string } => typeof item === "object" && item !== null)
      .map((item) => ({
        label: typeof item.label === "string" ? item.label : "",
        value: typeof item.value === "string" ? item.value : "",
        description: typeof item.description === "string" ? item.description : ""
      }))
      .filter((item) => item.label.length > 0 && item.value.length > 0);

    return metrics.length > 0 ? metrics : fallback.metrics;
  };

  return {
    id: section?.id ?? null,
    heroEyebrow: readString("heroEyebrow", fallback.heroEyebrow),
    heroTitle: readString("heroTitle", fallback.heroTitle),
    heroSummary: readString("heroSummary", fallback.heroSummary),
    primaryActionLabel: readString("primaryActionLabel", fallback.primaryActionLabel),
    primaryActionHref: readString("primaryActionHref", fallback.primaryActionHref),
    secondaryActionLabel: readString("secondaryActionLabel", fallback.secondaryActionLabel),
    secondaryActionHref: readString("secondaryActionHref", fallback.secondaryActionHref),
    introTitle: readString("introTitle", fallback.introTitle),
    introSummary: readString("introSummary", fallback.introSummary),
    audienceTitle: readString("audienceTitle", fallback.audienceTitle),
    audienceItems: readStringArray("audienceItems", fallback.audienceItems),
    metrics: readMetrics(),
    featuredArticleIds: readStringArray("featuredArticleIds", fallback.featuredArticleIds),
    featuredEventIds: readStringArray("featuredEventIds", fallback.featuredEventIds),
    branchHighlightIds: readStringArray("branchHighlightIds", fallback.branchHighlightIds),
    joinTitle: readString("joinTitle", fallback.joinTitle),
    joinSummary: readString("joinSummary", fallback.joinSummary),
    joinHref: readString("joinHref", fallback.joinHref),
    updatedAt: asIso(section?.updatedAt)
  };
};

const mapEventRecord = (
  event: typeof events.$inferSelect,
  agenda: AdminEventRecordV2["agenda"]
): AdminEventRecordV2 => ({
  id: event.id,
  slug: event.slug,
  title: event.title,
  summary: event.summary ?? "",
  body: event.bodyRichtext ?? "",
  status: event.status,
  branchId: event.branchId,
  coverAssetId: event.coverAssetId,
  venueName: event.venueName ?? "",
  venueAddress: event.venueAddress ?? "",
  startsAt: asIso(event.startsAt),
  endsAt: asIso(event.endsAt),
  timezone: event.timezone,
  capacity: event.capacity,
  registrationState: event.registrationState,
  registrationUrl: event.registrationUrl ?? "",
  agenda,
  publishedAt: asIso(event.publishedAt),
  createdAt: event.createdAt.toISOString(),
  updatedAt: event.updatedAt.toISOString()
});

const mapEventRegistrationRecord = (
  registration: typeof eventRegistrations.$inferSelect,
  matchedMemberName: string | null
): AdminEventRegistrationRecordV2 => ({
  id: registration.id,
  eventId: registration.eventId,
  name: registration.name,
  phoneNumber: registration.phoneNumber ?? "",
  wechatId: registration.wechatId ?? "",
  email: registration.email ?? "",
  company: registration.company ?? "",
  title: registration.jobTitle ?? "",
  status: registration.status,
  createdAt: registration.createdAt.toISOString(),
  reviewedAt: asIso(registration.reviewedAt),
  note: registration.note ?? "",
  reviewNotes: registration.reviewNotes ?? "",
  matchedMemberId: registration.matchedMemberId,
  matchedMemberName,
  reviewedByStaffId: registration.reviewedByStaffId,
  submittedIp: registration.submittedIp ?? "",
  submittedUserAgent: registration.submittedUserAgent ?? ""
});

const getPublishableEventIssues = (event: typeof events.$inferSelect, agendaCount: number): AdminValidationIssue[] => {
  const issues: AdminValidationIssue[] = [];

  if (event.title.trim().length < 2) {
    issues.push({ field: "title", message: "发布前必须填写活动标题。" });
  }
  if (event.slug.trim().length < 2) {
    issues.push({ field: "slug", message: "发布前必须填写 URL 标识。" });
  }
  if ((event.summary ?? "").trim().length === 0) {
    issues.push({ field: "summary", message: "发布前必须填写摘要。" });
  }
  if ((event.bodyRichtext ?? "").trim().length === 0) {
    issues.push({ field: "body", message: "发布前必须填写正文。" });
  }
  if (!event.branchId) {
    issues.push({ field: "branchId", message: "发布前必须选择分会。" });
  }
  if (!event.startsAt) {
    issues.push({ field: "startsAt", message: "发布前必须填写开始时间。" });
  }
  if ((event.venueName ?? "").trim().length === 0) {
    issues.push({ field: "venueName", message: "发布前必须填写场地名称。" });
  }
  if (agendaCount === 0) {
    issues.push({ field: "agenda", message: "发布前至少需要一条议程。" });
  }

  return issues;
};

export const getDashboardStatsV2 = async (): Promise<AdminDashboardPayloadV2["stats"]> => {
  const db = getDb();
  const [articleCount, eventCount, applicationCount, pendingApplicationCount, pendingRegistrationCount, memberCount, branchCount] =
    await Promise.all([
      db.select({ value: count() }).from(articles),
      db.select({ value: count() }).from(events),
      db.select({ value: count() }).from(joinApplications),
      db.select({ value: count() }).from(joinApplications).where(eq(joinApplications.status, "submitted")),
      db
        .select({ value: count() })
        .from(eventRegistrations)
        .where(eq(eventRegistrations.status, "submitted")),
      db.select({ value: count() }).from(members),
      db.select({ value: count() }).from(branches)
    ]);

  return {
    articleCount: articleCount[0]?.value ?? 0,
    eventCount: eventCount[0]?.value ?? 0,
    applicationCount: applicationCount[0]?.value ?? 0,
    pendingApplicationCount: pendingApplicationCount[0]?.value ?? 0,
    pendingRegistrationCount: pendingRegistrationCount[0]?.value ?? 0,
    memberCount: memberCount[0]?.value ?? 0,
    branchCount: branchCount[0]?.value ?? 0,
    systemHealth: "healthy",
    appVersion: getEnv().appVersion ?? "dev"
  };
};

export const listAdminMembers = async (): Promise<AdminMemberListItem[]> => {
  const db = getDb();
  const [memberRows, branchRows] = await Promise.all([
    db.select().from(members).orderBy(desc(members.featured), asc(members.sortOrder), asc(members.name)),
    db.select().from(branches)
  ]);
  const branchById = new Map(branchRows.map((row) => [row.id, row]));

  return memberRows.map((member) => mapMemberListItem(member, branchById.get(member.branchId ?? "")?.name ?? null));
};

export const getAdminMember = async (id: string): Promise<AdminMemberDetailPayload | null> => {
  const db = getDb();
  const [member, branchRows] = await Promise.all([
    db.query.members.findFirst({ where: eq(members.id, id.trim()) }),
    db.select().from(branches).orderBy(asc(branches.sortOrder), asc(branches.name))
  ]);

  if (!member) {
    return null;
  }

  return {
    member: mapMemberRecord(member),
    references: {
      branches: branchRows.map((branch) => ({
        id: branch.id,
        label: branch.name,
        description: branch.summary ?? null
      }))
    }
  };
};

export const createAdminMember = async (
  input: AdminMemberUpsertInput,
  actor: AuditActorContext
): Promise<AdminMemberDetailPayload> => {
  const db = getDb();
  const created = await withUniqueGuard(async () => {
    const [row] = await db
      .insert(members)
      .values({
        slug: input.slug,
        name: input.name,
        company: input.company,
        title: input.title,
        bio: input.bio,
        joinedAt: input.joinedAt ? new Date(input.joinedAt) : null,
        branchId: input.branchId,
        avatarAssetId: input.avatarAssetId,
        featured: input.featured,
        membershipStatus: input.membershipStatus,
        visibility: input.visibility,
        sortOrder: input.sortOrder,
        seoTitle: input.seoTitle || null,
        seoDescription: input.seoDescription || null
      })
      .returning();

    return row;
  });

  if (!created) {
    throw new AdminContentError(500, "INTERNAL_ERROR", "无法创建成员记录。");
  }

  await writeAuditLog(actor, {
    action: "member.create",
    targetType: "member",
    targetId: created.id,
    after: created
  });

  return (await getAdminMember(created.id))!;
};

export const updateAdminMember = async (
  id: string,
  input: AdminMemberUpsertInput,
  actor: AuditActorContext
): Promise<AdminMemberDetailPayload> => {
  const db = getDb();
  const existing = await db.query.members.findFirst({ where: eq(members.id, id.trim()) });

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "成员不存在。");
  }

  const [updated] = await withUniqueGuard(async () =>
    db
      .update(members)
      .set({
        slug: input.slug,
        name: input.name,
        company: input.company,
        title: input.title,
        bio: input.bio,
        joinedAt: input.joinedAt ? new Date(input.joinedAt) : null,
        branchId: input.branchId,
        avatarAssetId: input.avatarAssetId,
        featured: input.featured,
        membershipStatus: input.membershipStatus,
        visibility: input.visibility,
        sortOrder: input.sortOrder,
        seoTitle: input.seoTitle || null,
        seoDescription: input.seoDescription || null,
        updatedAt: now()
      })
      .where(eq(members.id, existing.id))
      .returning()
  );

  await writeAuditLog(actor, {
    action: "member.update",
    targetType: "member",
    targetId: existing.id,
    before: existing,
    after: updated ?? null
  });

  return (await getAdminMember(existing.id))!;
};

export const listAdminBranches = async (): Promise<AdminBranchListItem[]> => {
  const db = getDb();
  const [branchRows, boardRows] = await Promise.all([
    db.select().from(branches).orderBy(asc(branches.sortOrder), asc(branches.name)),
    db.select().from(branchBoardMembers)
  ]);
  const boardCountByBranchId = new Map<string, number>();
  for (const row of boardRows) {
    boardCountByBranchId.set(row.branchId, (boardCountByBranchId.get(row.branchId) ?? 0) + 1);
  }

  return branchRows.map((branch) => mapBranchListItem(branch, boardCountByBranchId.get(branch.id) ?? 0));
};

export const getAdminBranch = async (id: string): Promise<AdminBranchDetailPayload | null> => {
  const db = getDb();
  const [branch, boardRows, memberRows] = await Promise.all([
    db.query.branches.findFirst({ where: eq(branches.id, id.trim()) }),
    db.select().from(branchBoardMembers).where(eq(branchBoardMembers.branchId, id.trim())).orderBy(asc(branchBoardMembers.sortOrder)),
    db.select().from(members).orderBy(asc(members.name))
  ]);

  if (!branch) {
    return null;
  }

  return {
    branch: mapBranchRecord(
      branch,
      boardRows.map((row) => ({
        id: row.id,
        memberId: row.memberId,
        displayName: row.displayName,
        company: row.company,
        title: row.title,
        bio: row.bio ?? "",
        avatarAssetId: row.avatarAssetId,
        sortOrder: row.sortOrder,
        status: row.status
      }))
    ),
    references: {
      members: memberRows.map((member) => ({
        id: member.id,
        label: member.name,
        description: `${member.company} · ${member.title}`
      }))
    }
  };
};

const syncBranchBoardMembers = async (branchId: string, boardMembers: AdminBranchUpsertInput["boardMembers"]) => {
  const db = getDb();
  await db.delete(branchBoardMembers).where(eq(branchBoardMembers.branchId, branchId));

  if (boardMembers.length === 0) {
    return;
  }

  await db.insert(branchBoardMembers).values(
    boardMembers.map((member, index) => ({
      branchId,
      memberId: member.memberId,
      displayName: member.displayName,
      company: member.company,
      title: member.title,
      bio: member.bio,
      avatarAssetId: member.avatarAssetId,
      sortOrder: member.sortOrder ?? index,
      status: member.status
    }))
  );
};

export const createAdminBranch = async (
  input: AdminBranchUpsertInput,
  actor: AuditActorContext
): Promise<AdminBranchDetailPayload> => {
  const db = getDb();
  const [created] = await withUniqueGuard(async () =>
    db
      .insert(branches)
      .values({
        slug: input.slug,
        name: input.name,
        cityName: input.cityName,
        region: input.region || null,
        summary: input.summary || null,
        bodyRichtext: input.body || null,
        coverAssetId: input.coverAssetId,
        seoTitle: input.seoTitle || null,
        seoDescription: input.seoDescription || null,
        sortOrder: input.sortOrder,
        status: input.status,
        publishedAt: input.status === "published" ? now() : null
      })
      .returning()
  );

  if (!created) {
    throw new AdminContentError(500, "INTERNAL_ERROR", "无法创建分会记录。");
  }

  await syncBranchBoardMembers(created.id, input.boardMembers);

  await writeAuditLog(actor, {
    action: "branch.create",
    targetType: "branch",
    targetId: created.id,
    after: created
  });

  return (await getAdminBranch(created.id))!;
};

export const updateAdminBranch = async (
  id: string,
  input: AdminBranchUpsertInput,
  actor: AuditActorContext
): Promise<AdminBranchDetailPayload> => {
  const db = getDb();
  const existing = await db.query.branches.findFirst({ where: eq(branches.id, id.trim()) });

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "分会不存在。");
  }

  const [updated] = await withUniqueGuard(async () =>
    db
      .update(branches)
      .set({
        slug: input.slug,
        name: input.name,
        cityName: input.cityName,
        region: input.region || null,
        summary: input.summary || null,
        bodyRichtext: input.body || null,
        coverAssetId: input.coverAssetId,
        seoTitle: input.seoTitle || null,
        seoDescription: input.seoDescription || null,
        sortOrder: input.sortOrder,
        status: input.status,
        publishedAt: input.status === "published" ? existing.publishedAt ?? now() : null,
        updatedAt: now()
      })
      .where(eq(branches.id, existing.id))
      .returning()
  );

  await syncBranchBoardMembers(existing.id, input.boardMembers);

  await writeAuditLog(actor, {
    action: "branch.update",
    targetType: "branch",
    targetId: existing.id,
    before: existing,
    after: updated ?? null
  });

  return (await getAdminBranch(existing.id))!;
};

export const listAdminJoinApplications = async (): Promise<AdminJoinApplicationListItem[]> => {
  const db = getDb();
  const [applicationRows, branchRows] = await Promise.all([
    db.select().from(joinApplications).orderBy(desc(joinApplications.createdAt)),
    db.select().from(branches)
  ]);
  const branchById = new Map(branchRows.map((row) => [row.id, row]));

  return applicationRows.map((application) => ({
    id: application.id,
    name: application.name,
    phoneNumber: application.phoneNumber,
    wechatId: application.wechatId ?? "",
    email: application.email ?? "",
    targetBranchName: branchById.get(application.targetBranchId ?? "")?.name ?? null,
    status: application.status,
    createdAt: application.createdAt.toISOString()
  }));
};

export const getAdminJoinApplication = async (id: string): Promise<AdminJoinApplicationDetailPayload | null> => {
  const db = getDb();
  const [application, branchRows] = await Promise.all([
    db.query.joinApplications.findFirst({ where: eq(joinApplications.id, id.trim()) }),
    db.select().from(branches)
  ]);

  if (!application) {
    return null;
  }

  const branchById = new Map(branchRows.map((row) => [row.id, row]));

  return {
    application: mapJoinApplicationRecord(application, branchById.get(application.targetBranchId ?? "")?.name ?? null)
  };
};

export const updateAdminJoinApplication = async (
  id: string,
  input: AdminJoinApplicationUpdateInput,
  actor: AuditActorContext
): Promise<AdminJoinApplicationDetailPayload> => {
  const db = getDb();
  const existing = await db.query.joinApplications.findFirst({ where: eq(joinApplications.id, id.trim()) });

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "申请记录不存在。");
  }

  await db
    .update(joinApplications)
    .set({
      status: input.status,
      reviewNotes: input.reviewNotes || null,
      reviewedByStaffId: getActorStaffAccountId(actor),
      reviewedAt: now(),
      updatedAt: now()
    })
    .where(eq(joinApplications.id, existing.id));

  const updated = await getAdminJoinApplication(existing.id);

  await writeAuditLog(actor, {
    action: "join_application.update",
    targetType: "join_application",
    targetId: existing.id,
    before: existing,
    after: updated?.application ?? null
  });

  return updated!;
};

export const getAdminSitePage = async (slug: "join" | "about"): Promise<AdminSitePageDetailPayloadV2> => {
  const db = getDb();
  const page = await db.query.sitePages.findFirst({ where: eq(sitePages.slug, slug) });

  return {
    page: mapSitePageRecord(slug, page ?? null)
  };
};

export const updateAdminSitePage = async (
  slug: "join" | "about",
  input: AdminSitePageUpsertInputV2,
  actor: AuditActorContext
): Promise<AdminSitePageDetailPayloadV2> => {
  const db = getDb();
  const existing = await db.query.sitePages.findFirst({ where: eq(sitePages.slug, slug) });
  const values = {
    slug,
    title: input.title,
    summary: input.summary || null,
    bodyRichtext: input.body || null,
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
    status: input.status,
    publishedAt: input.status === "published" ? existing?.publishedAt ?? now() : null,
    updatedByStaffId: getActorStaffAccountId(actor),
    updatedAt: now()
  };

  if (existing) {
    await db.update(sitePages).set(values).where(eq(sitePages.id, existing.id));
  } else {
    await db.insert(sitePages).values(values);
  }

  const updated = await getAdminSitePage(slug);

  await writeAuditLog(actor, {
    action: "site_page.update",
    targetType: "site_page",
    targetId: updated.page.id,
    before: existing,
    after: updated.page
  });

  return updated;
};

export const getAdminHomepage = async (): Promise<AdminHomepageDetailPayload> => {
  const db = getDb();
  const [section, articleRows, eventRows, branchRows] = await Promise.all([
    db.query.homepageSections.findFirst({ where: eq(homepageSections.code, "home") }),
    db.select({ id: articles.id, label: articles.title, description: articles.excerpt }).from(articles).orderBy(desc(articles.updatedAt)),
    db.select({ id: events.id, label: events.title, description: events.summary }).from(events).orderBy(desc(events.updatedAt)),
    db.select({ id: branches.id, label: branches.name, description: branches.summary }).from(branches).orderBy(asc(branches.sortOrder), asc(branches.name))
  ]);

  return {
    homepage: mapHomepageRecord(section ?? null),
    references: {
      articles: articleRows.map((row) => ({ id: row.id, label: row.label, description: row.description ?? null })),
      events: eventRows.map((row) => ({ id: row.id, label: row.label, description: row.description ?? null })),
      branches: branchRows.map((row) => ({ id: row.id, label: row.label, description: row.description ?? null }))
    }
  };
};

export const updateAdminHomepage = async (
  input: AdminHomepageUpsertInput,
  actor: AuditActorContext
): Promise<AdminHomepageDetailPayload> => {
  const db = getDb();
  const existing = await db.query.homepageSections.findFirst({ where: eq(homepageSections.code, "home") });
  const values = {
    code: "home",
    payloadJson: input,
    status: "published" as const,
    updatedByStaffId: getActorStaffAccountId(actor),
    updatedAt: now()
  };

  if (existing) {
    await db.update(homepageSections).set(values).where(eq(homepageSections.id, existing.id));
  } else {
    await db.insert(homepageSections).values(values);
  }

  const updated = await getAdminHomepage();

  await writeAuditLog(actor, {
    action: "homepage.update",
    targetType: "homepage",
    targetId: updated.homepage.id,
    before: existing,
    after: updated.homepage
  });

  return updated;
};

const getAdminEventListStats = async (): Promise<AdminEventListMetaV2["stats"]> => {
  const db = getDb();
  const [statsRow] = await db
    .select({
      total: count(),
      open: sql<number>`coalesce(sum(case when ${events.registrationState} = 'open' then 1 else 0 end), 0)`,
      waitlist: sql<number>`coalesce(sum(case when ${events.registrationState} = 'waitlist' then 1 else 0 end), 0)`,
      published: sql<number>`coalesce(sum(case when ${events.status} = 'published' then 1 else 0 end), 0)`
    })
    .from(events);

  return {
    total: Number(statsRow?.total ?? 0),
    open: Number(statsRow?.open ?? 0),
    waitlist: Number(statsRow?.waitlist ?? 0),
    published: Number(statsRow?.published ?? 0)
  };
};

export const listAdminEventsV2 = async (
  query: AdminEventListQueryV2 = {}
): Promise<{ data: AdminEventListItemV2[]; meta: AdminEventListMetaV2 }> => {
  const db = getDb();
  const normalizedQuery = normalizeAdminEventListQuery(query);
  const where = buildAdminEventListWhere(normalizedQuery);

  const totalQuery = db
    .select({
      value: count()
    })
    .from(events)
    .leftJoin(branches, eq(events.branchId, branches.id));

  const [references, stats, totalRows] = await Promise.all([
    getAdminEventReferencesV2(),
    getAdminEventListStats(),
    (where ? totalQuery.where(where) : totalQuery)
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / normalizedQuery.pageSize));
  const page = Math.min(normalizedQuery.page, pageCount);
  const eventListQuery = db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      status: events.status,
      branchId: events.branchId,
      branchName: branches.name,
      venueName: events.venueName,
      registrationState: events.registrationState,
      startsAt: events.startsAt,
      updatedAt: events.updatedAt
    })
    .from(events)
    .leftJoin(branches, eq(events.branchId, branches.id));

  const eventRows = await (where ? eventListQuery.where(where) : eventListQuery)
    .orderBy(desc(events.startsAt), desc(events.updatedAt), asc(events.title))
    .limit(normalizedQuery.pageSize)
    .offset((page - 1) * normalizedQuery.pageSize);

  return {
    data: eventRows.map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      status: event.status,
      branchId: event.branchId,
      branchName: event.branchName ?? null,
      venueName: event.venueName ?? "",
      registrationState: event.registrationState,
      startsAt: asIso(event.startsAt),
      updatedAt: event.updatedAt.toISOString()
    })),
    meta: {
      total,
      page,
      pageSize: normalizedQuery.pageSize,
      pageCount,
      branchOptions: references.branches,
      stats
    }
  };
};

export const getAdminEventReferencesV2 = async (): Promise<AdminEventReferencesV2> => {
  const db = getDb();
  const branchRows = await db.select().from(branches).orderBy(asc(branches.sortOrder), asc(branches.name));

  return {
    branches: branchRows.map((branch) => ({
      id: branch.id,
      label: branch.name,
      description: branch.summary ?? null
    }))
  };
};

export const getAdminEventV2 = async (id: string): Promise<AdminEventDetailPayloadV2 | null> => {
  const db = getDb();
  const [event, agenda, references] = await Promise.all([
    db.query.events.findFirst({ where: eq(events.id, id.trim()) }),
    db.select().from(eventSessions).where(eq(eventSessions.eventId, id.trim())).orderBy(asc(eventSessions.sortOrder)),
    getAdminEventReferencesV2()
  ]);

  if (!event) {
    return null;
  }

  return {
    event: mapEventRecord(
      event,
      agenda.map((item) => ({
        title: item.title,
        summary: item.summary ?? "",
        startsAt: asIso(item.startsAt),
        endsAt: asIso(item.endsAt),
        speakerName: item.speakerName ?? ""
      }))
    ),
    references
  };
};

const syncEventAgenda = async (eventId: string, agenda: AdminEventUpsertInputV2["agenda"]) => {
  const db = getDb();
  await db.delete(eventSessions).where(eq(eventSessions.eventId, eventId));

  if (agenda.length === 0) {
    return;
  }

  await db.insert(eventSessions).values(
    agenda.map((item, index) => ({
      eventId,
      title: item.title,
      summary: item.summary || null,
      startsAt: item.startsAt ? new Date(item.startsAt) : null,
      endsAt: item.endsAt ? new Date(item.endsAt) : null,
      speakerName: item.speakerName || null,
      sortOrder: index
    }))
  );
};

export const createAdminEventV2 = async (
  input: AdminEventUpsertInputV2,
  actor: AuditActorContext
): Promise<AdminEventDetailPayloadV2> => {
  const db = getDb();
  const [created] = await withUniqueGuard(async () =>
    db
      .insert(events)
      .values({
        slug: input.slug,
        title: input.title,
        summary: input.summary || null,
        bodyRichtext: input.body || null,
        status: input.status,
        branchId: input.branchId,
        coverAssetId: input.coverAssetId,
        venueName: input.venueName || null,
        venueAddress: input.venueAddress || null,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        timezone: input.timezone,
        capacity: input.capacity,
        registrationState: input.registrationState,
        registrationUrl: input.registrationUrl || null,
        createdByStaffId: getActorStaffAccountId(actor),
        updatedByStaffId: getActorStaffAccountId(actor)
      })
      .returning()
  );

  if (!created) {
    throw new AdminContentError(500, "INTERNAL_ERROR", "无法创建活动记录。");
  }

  await syncEventAgenda(created.id, input.agenda);

  await writeAuditLog(actor, {
    action: "event.create",
    targetType: "event",
    targetId: created.id,
    after: created
  });

  return (await getAdminEventV2(created.id))!;
};

export const updateAdminEventV2 = async (
  id: string,
  input: AdminEventUpsertInputV2,
  actor: AuditActorContext
): Promise<AdminEventDetailPayloadV2> => {
  const db = getDb();
  const existing = await db.query.events.findFirst({ where: eq(events.id, id.trim()) });

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "活动不存在。");
  }

  const [updated] = await withUniqueGuard(async () =>
    db
      .update(events)
      .set({
        slug: input.slug,
        title: input.title,
        summary: input.summary || null,
        bodyRichtext: input.body || null,
        status: input.status,
        branchId: input.branchId,
        coverAssetId: input.coverAssetId,
        venueName: input.venueName || null,
        venueAddress: input.venueAddress || null,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        timezone: input.timezone,
        capacity: input.capacity,
        registrationState: input.registrationState,
        registrationUrl: input.registrationUrl || null,
        updatedByStaffId: getActorStaffAccountId(actor),
        updatedAt: now()
      })
      .where(eq(events.id, existing.id))
      .returning()
  );

  await syncEventAgenda(existing.id, input.agenda);

  await writeAuditLog(actor, {
    action: "event.update",
    targetType: "event",
    targetId: existing.id,
    before: existing,
    after: updated ?? null
  });

  return (await getAdminEventV2(existing.id))!;
};

export const publishAdminEventV2 = async (
  id: string,
  actor: AuditActorContext
): Promise<AdminEventDetailPayloadV2> => {
  const db = getDb();
  const existing = await db.query.events.findFirst({ where: eq(events.id, id.trim()) });

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "活动不存在。");
  }

  const agendaRows = await db.select().from(eventSessions).where(eq(eventSessions.eventId, existing.id));
  const issues = getPublishableEventIssues(existing, agendaRows.length);

  if (issues.length > 0) {
    throw validationError(issues);
  }

  const [updated] = await db
    .update(events)
    .set({
      status: "published",
      publishedAt: existing.publishedAt ?? now(),
      updatedByStaffId: getActorStaffAccountId(actor),
      updatedAt: now()
    })
    .where(eq(events.id, existing.id))
    .returning();

  await writeAuditLog(actor, {
    action: "event.publish",
    targetType: "event",
    targetId: existing.id,
    before: existing,
    after: updated ?? null
  });

  return (await getAdminEventV2(existing.id))!;
};

export const archiveAdminEventV2 = async (
  id: string,
  actor: AuditActorContext
): Promise<AdminEventDetailPayloadV2> => {
  const db = getDb();
  const existing = await db.query.events.findFirst({ where: eq(events.id, id.trim()) });

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "活动不存在。");
  }

  const [updated] = await db
    .update(events)
    .set({
      status: "archived",
      updatedByStaffId: getActorStaffAccountId(actor),
      updatedAt: now()
    })
    .where(eq(events.id, existing.id))
    .returning();

  await writeAuditLog(actor, {
    action: "event.archive",
    targetType: "event",
    targetId: existing.id,
    before: existing,
    after: updated ?? null
  });

  return (await getAdminEventV2(existing.id))!;
};

export const listAdminEventRegistrationsV2 = async (
  eventId: string
): Promise<AdminEventRegistrationListPayloadV2> => {
  const db = getDb();
  const [event, registrationRows] = await Promise.all([
    db.query.events.findFirst({ where: eq(events.id, eventId.trim()) }),
    db.select().from(eventRegistrations).where(eq(eventRegistrations.eventId, eventId.trim())).orderBy(desc(eventRegistrations.createdAt))
  ]);

  if (!event) {
    throw new AdminContentError(404, "NOT_FOUND", "活动不存在。");
  }

  return {
    event: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      registrationState: event.registrationState,
      startsAt: asIso(event.startsAt),
      venueName: event.venueName ?? ""
    },
    registrations: registrationRows.map((registration): AdminEventRegistrationListItemV2 => ({
      id: registration.id,
      eventId: registration.eventId,
      name: registration.name,
      phoneNumber: registration.phoneNumber ?? "",
      wechatId: registration.wechatId ?? "",
      email: registration.email ?? "",
      company: registration.company ?? "",
      title: registration.jobTitle ?? "",
      status: registration.status,
      createdAt: registration.createdAt.toISOString(),
      reviewedAt: asIso(registration.reviewedAt)
    }))
  };
};

export const getAdminEventRegistrationV2 = async (
  id: string
): Promise<AdminEventRegistrationDetailPayloadV2 | null> => {
  const db = getDb();
  const registration = await db.query.eventRegistrations.findFirst({ where: eq(eventRegistrations.id, id.trim()) });

  if (!registration) {
    return null;
  }

  const [event, memberRows] = await Promise.all([
    db.query.events.findFirst({ where: eq(events.id, registration.eventId) }),
    db.select().from(members).orderBy(asc(members.name))
  ]);

  if (!event) {
    throw new AdminContentError(404, "NOT_FOUND", "活动不存在。");
  }

  const matchedMemberName = memberRows.find((member) => member.id === registration.matchedMemberId)?.name ?? null;

  return {
    event: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      registrationState: event.registrationState,
      startsAt: asIso(event.startsAt),
      venueName: event.venueName ?? ""
    },
    registration: mapEventRegistrationRecord(registration, matchedMemberName),
    references: {
      members: memberRows.map((member) => ({
        id: member.id,
        label: member.name,
        description: `${member.company} · ${member.title}`
      }))
    }
  };
};

export const updateAdminEventRegistrationV2 = async (
  id: string,
  input: AdminEventRegistrationUpdateInputV2,
  actor: AuditActorContext
): Promise<AdminEventRegistrationDetailPayloadV2> => {
  const db = getDb();
  const existing = await db.query.eventRegistrations.findFirst({ where: eq(eventRegistrations.id, id.trim()) });

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "报名记录不存在。");
  }

  await db
    .update(eventRegistrations)
    .set({
      status: input.status,
      reviewNotes: input.reviewNotes || null,
      matchedMemberId: input.matchedMemberId,
      reviewedByStaffId: getActorStaffAccountId(actor),
      reviewedAt: now(),
      updatedAt: now()
    })
    .where(eq(eventRegistrations.id, existing.id));

  const updated = await getAdminEventRegistrationV2(existing.id);

  await writeAuditLog(actor, {
    action: "event_registration.update",
    targetType: "event_registration",
    targetId: existing.id,
    before: existing,
    after: updated?.registration ?? null
  });

  return updated!;
};
