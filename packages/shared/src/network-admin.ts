import type { EventRegistrationStatus } from "./public-content.js";
import type {
  AdminEditorReferenceOption,
  AdminValidationIssue,
  ApplicationStatus,
  ContentStatus,
  EventRegistrationState
} from "./admin-content.js";

export interface AdminDashboardPayloadV2 {
  stats: {
    articleCount: number;
    eventCount: number;
    applicationCount: number;
    pendingApplicationCount: number;
    pendingRegistrationCount: number;
    memberCount: number;
    branchCount: number;
    systemHealth: string;
    appVersion: string;
  };
}

export interface AdminBoardMemberRecord {
  id: string;
  memberId: string | null;
  displayName: string;
  company: string;
  title: string;
  bio: string;
  avatarAssetId: string | null;
  sortOrder: number;
  status: ContentStatus;
}

export interface AdminBoardMemberUpsertInput {
  id?: string;
  memberId: string | null;
  displayName: string;
  company: string;
  title: string;
  bio: string;
  avatarAssetId: string | null;
  sortOrder: number;
  status: ContentStatus;
}

export interface AdminBranchListItem {
  id: string;
  slug: string;
  name: string;
  cityName: string;
  region: string;
  status: ContentStatus;
  boardMemberCount: number;
  updatedAt: string | Date;
}

export interface AdminBranchRecord {
  id: string;
  slug: string;
  name: string;
  cityName: string;
  region: string;
  summary: string;
  body: string;
  coverAssetId: string | null;
  seoTitle: string;
  seoDescription: string;
  sortOrder: number;
  status: ContentStatus;
  publishedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  boardMembers: AdminBoardMemberRecord[];
}

export interface AdminBranchDetailPayload {
  branch: AdminBranchRecord;
  references: {
    members: AdminEditorReferenceOption[];
  };
}

export interface AdminBranchUpsertInput {
  slug: string;
  name: string;
  cityName: string;
  region: string;
  summary: string;
  body: string;
  coverAssetId: string | null;
  seoTitle: string;
  seoDescription: string;
  sortOrder: number;
  status: ContentStatus;
  boardMembers: AdminBoardMemberUpsertInput[];
}

export interface AdminMemberListItem {
  id: string;
  slug: string;
  name: string;
  company: string;
  title: string;
  branchName: string | null;
  membershipStatus: string;
  visibility: string;
  joinedAt: string | Date | null;
  updatedAt: string | Date;
}

export interface AdminMemberRecord {
  id: string;
  slug: string;
  name: string;
  company: string;
  title: string;
  bio: string;
  joinedAt: string | Date | null;
  branchId: string | null;
  avatarAssetId: string | null;
  featured: boolean;
  membershipStatus: string;
  visibility: string;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AdminMemberDetailPayload {
  member: AdminMemberRecord;
  references: {
    branches: AdminEditorReferenceOption[];
  };
}

export interface AdminMemberUpsertInput {
  slug: string;
  name: string;
  company: string;
  title: string;
  bio: string;
  joinedAt: string | null;
  branchId: string | null;
  avatarAssetId: string | null;
  featured: boolean;
  membershipStatus: string;
  visibility: string;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  status?: string;
}

export interface AdminJoinApplicationListItem {
  id: string;
  name: string;
  phoneNumber: string;
  wechatId: string;
  email: string;
  targetBranchName: string | null;
  status: ApplicationStatus;
  createdAt: string | Date;
}

export interface AdminJoinApplicationRecord extends AdminJoinApplicationListItem {
  introduction: string;
  applicationMessage: string;
  targetBranchId: string | null;
  reviewedByStaffId: string | null;
  reviewedAt: string | Date | null;
  reviewNotes: string;
  updatedAt: string | Date;
}

export interface AdminJoinApplicationDetailPayload {
  application: AdminJoinApplicationRecord;
}

export interface AdminJoinApplicationUpdateInput {
  status: ApplicationStatus;
  reviewNotes: string;
}

export interface AdminSitePageRecordV2 {
  id: string | null;
  slug: "join" | "about";
  title: string;
  summary: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  status: ContentStatus;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface AdminSitePageDetailPayloadV2 {
  page: AdminSitePageRecordV2;
}

export interface AdminSitePageUpsertInputV2 {
  title: string;
  summary: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  status: ContentStatus;
}

export interface AdminHomepageMetricInput {
  label: string;
  value: string;
  description: string;
}

export interface AdminHomepageRecord {
  id: string | null;
  heroEyebrow: string;
  heroTitle: string;
  heroSummary: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel: string;
  secondaryActionHref: string;
  introTitle: string;
  introSummary: string;
  audienceTitle: string;
  audienceItems: string[];
  metrics: AdminHomepageMetricInput[];
  featuredArticleIds: string[];
  featuredEventIds: string[];
  branchHighlightIds: string[];
  joinTitle: string;
  joinSummary: string;
  joinHref: string;
  updatedAt: string | Date | null;
}

export interface AdminHomepageDetailPayload {
  homepage: AdminHomepageRecord;
  references: {
    articles: AdminEditorReferenceOption[];
    events: AdminEditorReferenceOption[];
    branches: AdminEditorReferenceOption[];
  };
}

export interface AdminHomepageUpsertInput {
  heroEyebrow: string;
  heroTitle: string;
  heroSummary: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel: string;
  secondaryActionHref: string;
  introTitle: string;
  introSummary: string;
  audienceTitle: string;
  audienceItems: string[];
  metrics: AdminHomepageMetricInput[];
  featuredArticleIds: string[];
  featuredEventIds: string[];
  branchHighlightIds: string[];
  joinTitle: string;
  joinSummary: string;
  joinHref: string;
}

export interface AdminEventListItemV2 {
  id: string;
  slug: string;
  title: string;
  status: ContentStatus;
  branchName: string | null;
  registrationState: EventRegistrationState;
  startsAt: string | Date | null;
  updatedAt: string | Date;
}

export interface AdminEventAgendaItemV2 {
  title: string;
  summary: string;
  startsAt: string | null;
  endsAt: string | null;
  speakerName: string;
}

export interface AdminEventRecordV2 {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  status: ContentStatus;
  branchId: string | null;
  coverAssetId: string | null;
  venueName: string;
  venueAddress: string;
  startsAt: string | Date | null;
  endsAt: string | Date | null;
  timezone: string;
  capacity: number | null;
  registrationState: EventRegistrationState;
  registrationUrl: string;
  agenda: AdminEventAgendaItemV2[];
  publishedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AdminEventReferencesV2 {
  branches: AdminEditorReferenceOption[];
}

export interface AdminEventDetailPayloadV2 {
  event: AdminEventRecordV2;
  references: AdminEventReferencesV2;
}

export interface AdminEventUpsertInputV2 {
  slug: string;
  title: string;
  summary: string;
  body: string;
  status: ContentStatus;
  branchId: string | null;
  coverAssetId: string | null;
  venueName: string;
  venueAddress: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  capacity: number | null;
  registrationState: EventRegistrationState;
  registrationUrl: string;
  agenda: AdminEventAgendaItemV2[];
}

export interface AdminEventRegistrationListItemV2 {
  id: string;
  eventId: string;
  name: string;
  phoneNumber: string;
  wechatId: string;
  email: string;
  company: string;
  title: string;
  status: EventRegistrationStatus;
  createdAt: string | Date;
  reviewedAt: string | Date | null;
}

export interface AdminEventRegistrationRecordV2 extends AdminEventRegistrationListItemV2 {
  note: string;
  reviewNotes: string;
  matchedMemberId: string | null;
  matchedMemberName: string | null;
  reviewedByStaffId: string | null;
  submittedIp: string;
  submittedUserAgent: string;
}

export interface AdminEventRegistrationListPayloadV2 {
  event: {
    id: string;
    slug: string;
    title: string;
    registrationState: EventRegistrationState;
    startsAt: string | Date | null;
    venueName: string;
  };
  registrations: AdminEventRegistrationListItemV2[];
}

export interface AdminEventRegistrationDetailPayloadV2 {
  event: {
    id: string;
    slug: string;
    title: string;
    registrationState: EventRegistrationState;
    startsAt: string | Date | null;
    venueName: string;
  };
  registration: AdminEventRegistrationRecordV2;
  references: {
    members: AdminEditorReferenceOption[];
  };
}

export interface AdminEventRegistrationUpdateInputV2 {
  status: EventRegistrationStatus;
  reviewNotes: string;
  matchedMemberId: string | null;
}

type ValidationResult<T> =
  | {
      valid: true;
      data: T;
    }
  | {
      valid: false;
      issues: AdminValidationIssue[];
    };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const getTrimmedString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const getNullableId = (value: unknown) => {
  const normalized = getTrimmedString(value);

  return normalized.length > 0 ? normalized : null;
};
const getStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => getTrimmedString(item))
    .filter((item) => item.length > 0);
};
const isIsoDate = (value: string) => !Number.isNaN(Date.parse(value));
const isRelativeOrAbsoluteHref = (value: string) =>
  value.length === 0 || value.startsWith("/") || /^https?:\/\//.test(value);
const contentStatusSet = new Set<string>(["draft", "in_review", "scheduled", "published", "archived"]);
const eventRegistrationStateSet = new Set<string>(["not_open", "open", "waitlist", "closed"]);
const eventRegistrationStatusSet = new Set<string>([
  "submitted",
  "approved",
  "rejected",
  "waitlisted",
  "cancelled"
]);
const applicationStatusSet = new Set<string>(["submitted", "in_review", "contacted", "approved", "rejected", "closed"]);

export const validateAdminBranchInput = (payload: unknown): ValidationResult<AdminBranchUpsertInput> => {
  if (!isRecord(payload)) {
    return {
      valid: false,
      issues: [
        {
          field: "payload",
          message: "请求体必须是 JSON 对象。"
        }
      ]
    };
  }

  const boardMembers = Array.isArray(payload.boardMembers)
    ? payload.boardMembers
        .filter((item) => isRecord(item))
        .map((item, index) => ({
          id: getTrimmedString(item.id) || undefined,
          memberId: getNullableId(item.memberId),
          displayName: getTrimmedString(item.displayName),
          company: getTrimmedString(item.company),
          title: getTrimmedString(item.title),
          bio: getTrimmedString(item.bio),
          avatarAssetId: getNullableId(item.avatarAssetId),
          sortOrder: typeof item.sortOrder === "number" ? Math.trunc(item.sortOrder) : index,
          status: (getTrimmedString(item.status) || "published") as ContentStatus
        }))
    : [];

  const data: AdminBranchUpsertInput = {
    slug: getTrimmedString(payload.slug),
    name: getTrimmedString(payload.name),
    cityName: getTrimmedString(payload.cityName),
    region: getTrimmedString(payload.region),
    summary: getTrimmedString(payload.summary),
    body: getTrimmedString(payload.body),
    coverAssetId: getNullableId(payload.coverAssetId),
    seoTitle: getTrimmedString(payload.seoTitle),
    seoDescription: getTrimmedString(payload.seoDescription),
    sortOrder: typeof payload.sortOrder === "number" ? Math.trunc(payload.sortOrder) : 0,
    status: (getTrimmedString(payload.status) || "draft") as ContentStatus,
    boardMembers
  };
  const issues: AdminValidationIssue[] = [];

  if (data.slug.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
    issues.push({ field: "slug", message: "Slug 只能包含小写字母、数字和连字符。" });
  }
  if (data.name.length < 2) {
    issues.push({ field: "name", message: "分会名称至少需要 2 个字符。" });
  }
  if (data.cityName.length < 2) {
    issues.push({ field: "cityName", message: "请填写城市名称。" });
  }
  if (!contentStatusSet.has(data.status)) {
    issues.push({ field: "status", message: "状态无效。" });
  }

  return issues.length > 0 ? { valid: false, issues } : { valid: true, data };
};

export const validateAdminMemberInput = (payload: unknown): ValidationResult<AdminMemberUpsertInput> => {
  if (!isRecord(payload)) {
    return {
      valid: false,
      issues: [{ field: "payload", message: "请求体必须是 JSON 对象。" }]
    };
  }

  const data: AdminMemberUpsertInput = {
    slug: getTrimmedString(payload.slug),
    name: getTrimmedString(payload.name),
    company: getTrimmedString(payload.company),
    title: getTrimmedString(payload.title),
    bio: getTrimmedString(payload.bio),
    joinedAt: getTrimmedString(payload.joinedAt) || null,
    branchId: getNullableId(payload.branchId),
    avatarAssetId: getNullableId(payload.avatarAssetId),
    featured: Boolean(payload.featured),
    membershipStatus: getTrimmedString(payload.membershipStatus) || "active",
    visibility: getTrimmedString(payload.visibility) || "public",
    sortOrder: typeof payload.sortOrder === "number" ? Math.trunc(payload.sortOrder) : 0,
    seoTitle: getTrimmedString(payload.seoTitle),
    seoDescription: getTrimmedString(payload.seoDescription)
  };
  const issues: AdminValidationIssue[] = [];

  if (data.slug.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
    issues.push({ field: "slug", message: "Slug 只能包含小写字母、数字和连字符。" });
  }
  if (data.name.length < 2) {
    issues.push({ field: "name", message: "姓名至少需要 2 个字符。" });
  }
  if (data.joinedAt && !isIsoDate(data.joinedAt)) {
    issues.push({ field: "joinedAt", message: "加入时间必须是有效日期。" });
  }

  return issues.length > 0 ? { valid: false, issues } : { valid: true, data };
};

export const validateAdminJoinApplicationUpdateInput = (
  payload: unknown
): ValidationResult<AdminJoinApplicationUpdateInput> => {
  if (!isRecord(payload)) {
    return {
      valid: false,
      issues: [{ field: "payload", message: "请求体必须是 JSON 对象。" }]
    };
  }

  const data: AdminJoinApplicationUpdateInput = {
    status: (getTrimmedString(payload.status) || "submitted") as ApplicationStatus,
    reviewNotes: getTrimmedString(payload.reviewNotes)
  };
  const issues: AdminValidationIssue[] = [];

  if (!applicationStatusSet.has(data.status)) {
    issues.push({ field: "status", message: "状态无效。" });
  }

  return issues.length > 0 ? { valid: false, issues } : { valid: true, data };
};

export const validateAdminSitePageInputV2 = (
  payload: unknown
): ValidationResult<AdminSitePageUpsertInputV2> => {
  if (!isRecord(payload)) {
    return {
      valid: false,
      issues: [{ field: "payload", message: "请求体必须是 JSON 对象。" }]
    };
  }

  const data: AdminSitePageUpsertInputV2 = {
    title: getTrimmedString(payload.title),
    summary: getTrimmedString(payload.summary),
    body: getTrimmedString(payload.body),
    seoTitle: getTrimmedString(payload.seoTitle),
    seoDescription: getTrimmedString(payload.seoDescription),
    status: (getTrimmedString(payload.status) || "draft") as ContentStatus
  };
  const issues: AdminValidationIssue[] = [];

  if (data.title.length < 2) {
    issues.push({ field: "title", message: "标题至少需要 2 个字符。" });
  }
  if (!contentStatusSet.has(data.status)) {
    issues.push({ field: "status", message: "状态无效。" });
  }

  return issues.length > 0 ? { valid: false, issues } : { valid: true, data };
};

export const validateAdminHomepageInput = (payload: unknown): ValidationResult<AdminHomepageUpsertInput> => {
  if (!isRecord(payload)) {
    return {
      valid: false,
      issues: [{ field: "payload", message: "请求体必须是 JSON 对象。" }]
    };
  }

  const metrics = Array.isArray(payload.metrics)
    ? payload.metrics
        .filter((item) => isRecord(item))
        .map((item) => ({
          label: getTrimmedString(item.label),
          value: getTrimmedString(item.value),
          description: getTrimmedString(item.description)
        }))
    : [];

  const data: AdminHomepageUpsertInput = {
    heroEyebrow: getTrimmedString(payload.heroEyebrow),
    heroTitle: getTrimmedString(payload.heroTitle),
    heroSummary: getTrimmedString(payload.heroSummary),
    primaryActionLabel: getTrimmedString(payload.primaryActionLabel),
    primaryActionHref: getTrimmedString(payload.primaryActionHref),
    secondaryActionLabel: getTrimmedString(payload.secondaryActionLabel),
    secondaryActionHref: getTrimmedString(payload.secondaryActionHref),
    introTitle: getTrimmedString(payload.introTitle),
    introSummary: getTrimmedString(payload.introSummary),
    audienceTitle: getTrimmedString(payload.audienceTitle),
    audienceItems: getStringArray(payload.audienceItems),
    metrics,
    featuredArticleIds: getStringArray(payload.featuredArticleIds),
    featuredEventIds: getStringArray(payload.featuredEventIds),
    branchHighlightIds: getStringArray(payload.branchHighlightIds),
    joinTitle: getTrimmedString(payload.joinTitle),
    joinSummary: getTrimmedString(payload.joinSummary),
    joinHref: getTrimmedString(payload.joinHref)
  };
  const issues: AdminValidationIssue[] = [];

  if (data.heroTitle.length < 2) {
    issues.push({ field: "heroTitle", message: "请填写首页主标题。" });
  }
  if (!isRelativeOrAbsoluteHref(data.primaryActionHref)) {
    issues.push({ field: "primaryActionHref", message: "主按钮链接必须是站内路径或绝对地址。" });
  }
  if (!isRelativeOrAbsoluteHref(data.secondaryActionHref)) {
    issues.push({ field: "secondaryActionHref", message: "次按钮链接必须是站内路径或绝对地址。" });
  }
  if (!isRelativeOrAbsoluteHref(data.joinHref)) {
    issues.push({ field: "joinHref", message: "加入按钮链接必须是站内路径或绝对地址。" });
  }

  return issues.length > 0 ? { valid: false, issues } : { valid: true, data };
};

export const validateAdminEventInputV2 = (payload: unknown): ValidationResult<AdminEventUpsertInputV2> => {
  if (!isRecord(payload)) {
    return {
      valid: false,
      issues: [{ field: "payload", message: "请求体必须是 JSON 对象。" }]
    };
  }

  const agenda = Array.isArray(payload.agenda)
    ? payload.agenda
        .filter((item) => isRecord(item))
        .map((item) => ({
          title: getTrimmedString(item.title),
          summary: getTrimmedString(item.summary),
          startsAt: getTrimmedString(item.startsAt) || null,
          endsAt: getTrimmedString(item.endsAt) || null,
          speakerName: getTrimmedString(item.speakerName)
        }))
    : [];

  const rawCapacity = payload.capacity;
  const capacity =
    rawCapacity === null || rawCapacity === undefined || rawCapacity === ""
      ? null
      : typeof rawCapacity === "number"
        ? Math.trunc(rawCapacity)
        : Number(rawCapacity);

  const data: AdminEventUpsertInputV2 = {
    slug: getTrimmedString(payload.slug),
    title: getTrimmedString(payload.title),
    summary: getTrimmedString(payload.summary),
    body: getTrimmedString(payload.body),
    status: (getTrimmedString(payload.status) || "draft") as ContentStatus,
    branchId: getNullableId(payload.branchId),
    coverAssetId: getNullableId(payload.coverAssetId),
    venueName: getTrimmedString(payload.venueName),
    venueAddress: getTrimmedString(payload.venueAddress),
    startsAt: getTrimmedString(payload.startsAt) || null,
    endsAt: getTrimmedString(payload.endsAt) || null,
    timezone: getTrimmedString(payload.timezone) || "Asia/Shanghai",
    capacity: Number.isFinite(capacity) ? capacity : null,
    registrationState: (getTrimmedString(payload.registrationState) || "not_open") as EventRegistrationState,
    registrationUrl: getTrimmedString(payload.registrationUrl),
    agenda
  };
  const issues: AdminValidationIssue[] = [];

  if (data.slug.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
    issues.push({ field: "slug", message: "Slug 只能包含小写字母、数字和连字符。" });
  }
  if (data.title.length < 2) {
    issues.push({ field: "title", message: "标题至少需要 2 个字符。" });
  }
  if (!contentStatusSet.has(data.status)) {
    issues.push({ field: "status", message: "状态无效。" });
  }
  if (!eventRegistrationStateSet.has(data.registrationState)) {
    issues.push({ field: "registrationState", message: "报名状态无效。" });
  }
  if (data.startsAt && !isIsoDate(data.startsAt)) {
    issues.push({ field: "startsAt", message: "开始时间必须是有效日期。" });
  }
  if (data.endsAt && !isIsoDate(data.endsAt)) {
    issues.push({ field: "endsAt", message: "结束时间必须是有效日期。" });
  }
  if (data.startsAt && data.endsAt && new Date(data.endsAt) < new Date(data.startsAt)) {
    issues.push({ field: "endsAt", message: "结束时间必须晚于开始时间。" });
  }
  if (data.registrationUrl.length > 0 && !isRelativeOrAbsoluteHref(data.registrationUrl)) {
    issues.push({ field: "registrationUrl", message: "报名链接必须是站内路径或绝对地址。" });
  }

  return issues.length > 0 ? { valid: false, issues } : { valid: true, data };
};

export const validateAdminEventRegistrationInputV2 = (
  payload: unknown
): ValidationResult<AdminEventRegistrationUpdateInputV2> => {
  if (!isRecord(payload)) {
    return {
      valid: false,
      issues: [{ field: "payload", message: "请求体必须是 JSON 对象。" }]
    };
  }

  const data: AdminEventRegistrationUpdateInputV2 = {
    status: (getTrimmedString(payload.status) || "submitted") as EventRegistrationStatus,
    reviewNotes: getTrimmedString(payload.reviewNotes),
    matchedMemberId: getNullableId(payload.matchedMemberId)
  };
  const issues: AdminValidationIssue[] = [];

  if (!eventRegistrationStatusSet.has(data.status)) {
    issues.push({ field: "status", message: "状态无效。" });
  }

  return issues.length > 0 ? { valid: false, issues } : { valid: true, data };
};
