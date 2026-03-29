import { eventRegistrationStatusOptions, type EventRegistrationStatus } from "./public-content.js";

export type ContentStatus = "draft" | "in_review" | "scheduled" | "published" | "archived";

export const contentStatusOptions = [
  {
    value: "draft",
    label: "草稿"
  },
  {
    value: "in_review",
    label: "审核中"
  },
  {
    value: "scheduled",
    label: "定时发布"
  },
  {
    value: "published",
    label: "已发布"
  },
  {
    value: "archived",
    label: "已归档"
  }
] as const;

const contentStatusSet = new Set<string>(contentStatusOptions.map((option) => option.value));

export type EventRegistrationState = "not_open" | "open" | "waitlist" | "closed";

export const eventRegistrationStateOptions = [
  {
    value: "not_open",
    label: "未开放"
  },
  {
    value: "open",
    label: "开放中"
  },
  {
    value: "waitlist",
    label: "候补中"
  },
  {
    value: "closed",
    label: "已关闭"
  }
] as const;

const eventRegistrationStateSet = new Set<string>(eventRegistrationStateOptions.map((option) => option.value));

const eventRegistrationStatusSet = new Set<string>(eventRegistrationStatusOptions.map((option) => option.value));

export type ApplicationStatus = "submitted" | "in_review" | "contacted" | "approved" | "rejected" | "closed";

export const applicationStatusOptions = [
  {
    value: "submitted",
    label: "已提交"
  },
  {
    value: "in_review",
    label: "审核中"
  },
  {
    value: "contacted",
    label: "已联系"
  },
  {
    value: "approved",
    label: "已通过"
  },
  {
    value: "rejected",
    label: "已拒绝"
  },
  {
    value: "closed",
    label: "已关闭"
  }
] as const;

const applicationStatusSet = new Set<string>(applicationStatusOptions.map((option) => option.value));

export type StaffAccountStatus = "invited" | "active" | "suspended" | "disabled";

export const staffAccountStatusOptions = [
  {
    value: "invited",
    label: "已邀请"
  },
  {
    value: "active",
    label: "启用中"
  },
  {
    value: "suspended",
    label: "已暂停"
  },
  {
    value: "disabled",
    label: "已停用"
  }
] as const;

const staffAccountStatusSet = new Set<string>(staffAccountStatusOptions.map((option) => option.value));

export type FeaturedBlockStatus = "draft" | "active" | "archived";

export const featuredBlockStatusOptions = [
  {
    value: "draft",
    label: "草稿"
  },
  {
    value: "active",
    label: "启用中"
  },
  {
    value: "archived",
    label: "已归档"
  }
] as const;

const featuredBlockStatusSet = new Set<string>(featuredBlockStatusOptions.map((option) => option.value));

export type AssetVisibility = "public" | "private";

export const assetVisibilityOptions = [
  {
    value: "public",
    label: "公开"
  },
  {
    value: "private",
    label: "私有"
  }
] as const;

const assetVisibilitySet = new Set<string>(assetVisibilityOptions.map((option) => option.value));

export type AssetStatus = "uploaded" | "active" | "archived" | "deleted";

export const assetStatusOptions = [
  {
    value: "uploaded",
    label: "已上传"
  },
  {
    value: "active",
    label: "启用中"
  },
  {
    value: "archived",
    label: "已归档"
  },
  {
    value: "deleted",
    label: "已删除"
  }
] as const;

export type AdminAssetType =
  | "site-banner"
  | "topic-cover"
  | "article-cover"
  | "article-inline"
  | "city-cover"
  | "event-poster"
  | "speaker-avatar"
  | "application-attachment"
  | "generic-file";

export const adminAssetTypeOptions = [
  {
    value: "site-banner",
    label: "站点横幅"
  },
  {
    value: "topic-cover",
    label: "主题封面"
  },
  {
    value: "article-cover",
    label: "文章封面"
  },
  {
    value: "article-inline",
    label: "文章内图"
  },
  {
    value: "city-cover",
    label: "城市封面"
  },
  {
    value: "event-poster",
    label: "活动海报"
  },
  {
    value: "speaker-avatar",
    label: "嘉宾头像"
  },
  {
    value: "application-attachment",
    label: "申请附件"
  },
  {
    value: "generic-file",
    label: "通用文件"
  }
] as const;

const adminAssetTypeSet = new Set<string>(adminAssetTypeOptions.map((option) => option.value));
const imageAssetTypeSet = new Set<AdminAssetType>([
  "site-banner",
  "topic-cover",
  "article-cover",
  "article-inline",
  "city-cover",
  "event-poster",
  "speaker-avatar"
]);
const imageMimeTypeSet = new Set(["image/jpeg", "image/png", "image/webp"]);
const documentMimeTypeSet = new Set(["application/pdf", "text/plain"]);

export interface AdminSessionUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  status?: string | null;
  phoneNumber?: string | null;
  phoneVerifiedAt?: string | Date | null;
}

export interface AdminSessionRecord {
  id: string;
  userId: string;
  expiresAt: string | Date;
}

export interface AdminStaffAccount {
  id: string;
  userId: string;
  status: string;
}

export interface AdminMilestone {
  code: string;
  title: string;
  summary: string;
}

export interface AdminMePayload {
  user: AdminSessionUser | null;
  session: AdminSessionRecord | null;
  staffAccount: AdminStaffAccount | null;
  roles: string[];
  permissions: string[];
  nextMilestones: ReadonlyArray<AdminMilestone>;
}

export interface AdminDashboardPayload {
  stats: {
    articles: number;
    events: number;
    applications: number;
    assets: number;
    auditLogs: number;
    staff: number;
    roles: number;
  };
}

export interface AdminAuditLogRecord {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  actor: {
    userId: string | null;
    staffAccountId: string | null;
    name: string | null;
    email: string | null;
  };
  requestIp: string;
  userAgent: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  createdAt: string | Date;
}

export interface AdminRoleSummary {
  id: string;
  code: string;
  name: string;
}

export interface AdminStaffListItem {
  id: string;
  userId: string;
  email: string;
  name: string;
  status: StaffAccountStatus;
  roles: AdminRoleSummary[];
  notes: string;
  invitedAt: string | Date | null;
  activatedAt: string | Date | null;
  lastLoginAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AdminStaffListPayload {
  staff: AdminStaffListItem[];
  roles: AdminRoleSummary[];
}

export interface AdminStaffCreateInput {
  email: string;
  name: string;
  password: string;
  status: StaffAccountStatus;
  roleIds: string[];
  notes: string;
}

export interface AdminStaffUpdateInput {
  email: string;
  name: string;
  status: StaffAccountStatus;
  roleIds: string[];
  notes: string;
}

export interface AdminPermissionRecord {
  id: string;
  code: string;
  name: string;
  resource: string;
  action: string;
}

export interface AdminRoleListItem {
  id: string;
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionIds: string[];
  permissionCodes: string[];
  assignedStaffCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AdminRolesPayload {
  roles: AdminRoleListItem[];
  permissions: AdminPermissionRecord[];
}

export interface AdminRoleUpdateInput {
  name: string;
  description: string;
  permissionIds: string[];
}

export interface AdminEditorReferenceOption {
  id: string;
  label: string;
  description?: string | null;
}

export interface AdminTopicListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  articleCount: number;
  eventCount: number;
  updatedAt: string | Date;
}

export interface AdminTopicRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  coverAssetId: string | null;
  seoTitle: string;
  seoDescription: string;
  status: ContentStatus;
  publishedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AdminTopicDetailPayload {
  topic: AdminTopicRecord;
}

export interface AdminTopicUpsertInput {
  slug: string;
  title: string;
  summary: string;
  body: string;
  coverAssetId: string | null;
  seoTitle: string;
  seoDescription: string;
  status: ContentStatus;
}

export interface AdminArticleListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  authorName: string | null;
  cityName: string | null;
  topicCount: number;
  publishedAt: string | Date | null;
  updatedAt: string | Date;
}

export interface AdminArticleRecord {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  status: ContentStatus;
  authorId: string | null;
  primaryCityId: string | null;
  coverAssetId: string | null;
  topicIds: string[];
  seoTitle: string;
  seoDescription: string;
  scheduledAt: string | Date | null;
  publishedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AdminArticleReferences {
  authors: AdminEditorReferenceOption[];
  cities: AdminEditorReferenceOption[];
  topics: AdminEditorReferenceOption[];
}

export interface AdminArticleReferencesPayload {
  references: AdminArticleReferences;
}

export interface AdminArticleDetailPayload {
  article: AdminArticleRecord;
  references: AdminArticleReferences;
}

export interface AdminArticleUpsertInput {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  status: ContentStatus;
  authorId: string | null;
  primaryCityId: string | null;
  coverAssetId: string | null;
  topicIds: string[];
  seoTitle: string;
  seoDescription: string;
  scheduledAt: string | null;
}

export interface AdminEventAgendaItem {
  title: string;
  summary: string;
  startsAt: string | null;
  endsAt: string | null;
  speakerName: string;
}

export interface AdminEventListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  cityName: string | null;
  registrationState: EventRegistrationState;
  startsAt: string | Date | null;
  updatedAt: string | Date;
}

export interface AdminEventRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  status: ContentStatus;
  cityId: string | null;
  coverAssetId: string | null;
  venueName: string;
  venueAddress: string;
  startsAt: string | Date | null;
  endsAt: string | Date | null;
  timezone: string;
  capacity: number | null;
  registrationState: EventRegistrationState;
  registrationUrl: string;
  topicIds: string[];
  agenda: AdminEventAgendaItem[];
  publishedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AdminEventReferences {
  cities: AdminEditorReferenceOption[];
  topics: AdminEditorReferenceOption[];
}

export interface AdminEventReferencesPayload {
  references: AdminEventReferences;
}

export interface AdminEventDetailPayload {
  event: AdminEventRecord;
  references: AdminEventReferences;
}

export interface AdminEventUpsertInput {
  slug: string;
  title: string;
  summary: string;
  body: string;
  status: ContentStatus;
  cityId: string | null;
  coverAssetId: string | null;
  venueName: string;
  venueAddress: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  capacity: number | null;
  registrationState: EventRegistrationState;
  registrationUrl: string;
  topicIds: string[];
  agenda: AdminEventAgendaItem[];
}

export interface AdminEventRegistrationListItem {
  id: string;
  eventId: string;
  name: string;
  phoneNumber: string;
  email: string;
  company: string;
  jobTitle: string;
  status: EventRegistrationStatus;
  createdAt: string | Date;
  reviewedAt: string | Date | null;
}

export interface AdminEventRegistrationRecord extends AdminEventRegistrationListItem {
  source: string;
  answersJson: Record<string, unknown> | null;
  reviewedByStaffId: string | null;
}

export interface AdminEventRegistrationListPayload {
  event: {
    id: string;
    slug: string;
    title: string;
    registrationState: EventRegistrationState;
    startsAt: string | Date | null;
    venueName: string;
  };
  registrations: AdminEventRegistrationListItem[];
}

export interface AdminEventRegistrationDetailPayload {
  event: {
    id: string;
    slug: string;
    title: string;
    registrationState: EventRegistrationState;
    startsAt: string | Date | null;
    venueName: string;
  };
  registration: AdminEventRegistrationRecord;
}

export interface AdminEventRegistrationUpdateInput {
  status: EventRegistrationStatus;
}

export interface AdminApplicationListItem {
  id: string;
  type: string;
  name: string;
  email: string | null;
  company: string | null;
  cityName: string | null;
  status: string;
  createdAt: string | Date;
}

export interface AdminApplicationRecord {
  id: string;
  type: string;
  name: string;
  phoneNumber: string;
  email: string;
  company: string;
  jobTitle: string;
  cityId: string | null;
  cityName: string;
  message: string;
  sourcePage: string;
  status: ApplicationStatus;
  assignedToStaffId: string | null;
  reviewedByStaffId: string | null;
  reviewedAt: string | Date | null;
  internalNotes: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AdminApplicationDetailPayload {
  application: AdminApplicationRecord;
}

export interface AdminApplicationUpdateInput {
  status: ApplicationStatus;
  internalNotes: string;
}

export interface AdminAssetListItem {
  id: string;
  originalFilename: string;
  assetType: AdminAssetType;
  visibility: AssetVisibility;
  mimeType: string;
  byteSize: number;
  status: AssetStatus;
  altText: string;
  objectKey: string;
  url: string | null;
  uploadedByStaffId: string | null;
  createdAt: string | Date;
}

export interface AdminAssetRecord extends AdminAssetListItem {
  storageProvider: string;
  bucket: string;
  width: number | null;
  height: number | null;
  checksum: string;
  updatedAt: string | Date;
}

export interface AdminAssetDetailPayload {
  asset: AdminAssetRecord;
}

export interface AdminAssetUploadIntentInput {
  filename: string;
  mimeType: string;
  byteSize: number;
  assetType: AdminAssetType;
  visibility: AssetVisibility;
}

export interface AdminAssetUploadIntent {
  assetId: string;
  objectKey: string;
  uploadUrl: string;
  uploadMethod: "PUT";
  uploadHeaders: Record<string, string>;
  intentToken: string;
  expiresAt: string | Date;
  previewUrl: string | null;
}

export interface AdminAssetUploadIntentPayload {
  upload: AdminAssetUploadIntent;
}

export interface AdminAssetUploadCompleteInput {
  intentToken: string;
  altText: string;
  width: number | null;
  height: number | null;
  checksum: string;
}

export interface AdminHomepageFeaturedBlockPayload {
  heroEyebrow: string;
  heroTitle: string;
  heroSummary: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel: string;
  secondaryActionHref: string;
  featuredTopicIds: string[];
  featuredArticleIds: string[];
  featuredEventIds: string[];
  cityHighlightIds: string[];
  applicationTitle: string;
  applicationSummary: string;
  applicationHref: string;
}

export interface AdminFeaturedBlockRecord {
  id: string | null;
  code: string;
  name: string;
  status: FeaturedBlockStatus;
  payload: AdminHomepageFeaturedBlockPayload;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface AdminFeaturedBlockReferences {
  topics: AdminEditorReferenceOption[];
  articles: AdminEditorReferenceOption[];
  events: AdminEditorReferenceOption[];
  cities: AdminEditorReferenceOption[];
}

export interface AdminFeaturedBlockDetailPayload {
  block: AdminFeaturedBlockRecord;
  references: AdminFeaturedBlockReferences;
}

export interface AdminFeaturedBlockUpsertInput {
  status: FeaturedBlockStatus;
  payload: AdminHomepageFeaturedBlockPayload;
}

export interface AdminSiteSettingsRecord {
  siteName: string;
  footerTagline: string;
  supportEmail: string;
}

export interface AdminSiteSettingsPayload {
  settings: AdminSiteSettingsRecord;
}

export interface AdminSiteSettingsInput {
  siteName: string;
  footerTagline: string;
  supportEmail: string;
}

export interface AdminValidationIssue {
  field: string;
  message: string;
}

type AdminValidationResult<T> =
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
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const getUniqueStringArray = (value: unknown) => Array.from(new Set(getStringArray(value)));

const isIsoDate = (value: string) => !Number.isNaN(Date.parse(value));
const isRelativeOrAbsoluteHref = (value: string) =>
  value.length === 0 || value.startsWith("/") || /^https?:\/\//.test(value);
const getNullableInteger = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN;
  }

  return Number.NaN;
};

export const validateAdminTopicInput = (payload: unknown): AdminValidationResult<AdminTopicUpsertInput> => {
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

  const slug = getTrimmedString(payload.slug);
  const title = getTrimmedString(payload.title);
  const summary = getTrimmedString(payload.summary);
  const body = getTrimmedString(payload.body);
  const coverAssetId = getNullableId(payload.coverAssetId);
  const seoTitle = getTrimmedString(payload.seoTitle);
  const seoDescription = getTrimmedString(payload.seoDescription);
  const status = getTrimmedString(payload.status) || "draft";
  const issues: AdminValidationIssue[] = [];

  if (slug.length < 2 || slug.length > 120) {
    issues.push({
      field: "slug",
      message: "Slug 长度必须在 2 到 120 个字符之间。"
    });
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    issues.push({
      field: "slug",
      message: "Slug 只能包含小写字母、数字和连字符。"
    });
  }

  if (title.length < 2 || title.length > 160) {
    issues.push({
      field: "title",
      message: "标题长度必须在 2 到 160 个字符之间。"
    });
  }

  if (summary.length > 400) {
    issues.push({
      field: "summary",
      message: "摘要不能超过 400 个字符。"
    });
  }

  if (seoTitle.length > 160) {
    issues.push({
      field: "seoTitle",
      message: "SEO 标题不能超过 160 个字符。"
    });
  }

  if (seoDescription.length > 320) {
    issues.push({
      field: "seoDescription",
      message: "SEO 描述不能超过 320 个字符。"
    });
  }

  if (!contentStatusSet.has(status)) {
    issues.push({
      field: "status",
      message: "状态无效。"
    });
  }

  if (status === "published" && summary.length === 0) {
    issues.push({
      field: "summary",
      message: "发布前必须填写摘要。"
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues
    };
  }

  return {
    valid: true,
    data: {
      slug,
      title,
      summary,
      body,
      coverAssetId,
      seoTitle,
      seoDescription,
      status: status as ContentStatus
    }
  };
};

export const validateAdminArticleInput = (payload: unknown): AdminValidationResult<AdminArticleUpsertInput> => {
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

  const slug = getTrimmedString(payload.slug);
  const title = getTrimmedString(payload.title);
  const excerpt = getTrimmedString(payload.excerpt);
  const body = getTrimmedString(payload.body);
  const seoTitle = getTrimmedString(payload.seoTitle);
  const seoDescription = getTrimmedString(payload.seoDescription);
  const status = getTrimmedString(payload.status) || "draft";
  const authorId = getNullableId(payload.authorId);
  const primaryCityId = getNullableId(payload.primaryCityId);
  const coverAssetId = getNullableId(payload.coverAssetId);
  const scheduledAt = getTrimmedString(payload.scheduledAt);
  const rawTopicIds = Array.isArray(payload.topicIds) ? payload.topicIds : [];
  const topicIds = Array.from(
    new Set(
      rawTopicIds
        .map((entry) => getTrimmedString(entry))
        .filter(Boolean)
    )
  );
  const issues: AdminValidationIssue[] = [];

  if (slug.length < 2 || slug.length > 120) {
    issues.push({
      field: "slug",
      message: "Slug 长度必须在 2 到 120 个字符之间。"
    });
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    issues.push({
      field: "slug",
      message: "Slug 只能包含小写字母、数字和连字符。"
    });
  }

  if (title.length < 2 || title.length > 200) {
    issues.push({
      field: "title",
      message: "标题长度必须在 2 到 200 个字符之间。"
    });
  }

  if (excerpt.length > 500) {
    issues.push({
      field: "excerpt",
      message: "摘要不能超过 500 个字符。"
    });
  }

  if (seoTitle.length > 160) {
    issues.push({
      field: "seoTitle",
      message: "SEO 标题不能超过 160 个字符。"
    });
  }

  if (seoDescription.length > 320) {
    issues.push({
      field: "seoDescription",
      message: "SEO 描述不能超过 320 个字符。"
    });
  }

  if (!contentStatusSet.has(status)) {
    issues.push({
      field: "status",
      message: "状态无效。"
    });
  }

  if (scheduledAt.length > 0 && !isIsoDate(scheduledAt)) {
    issues.push({
      field: "scheduledAt",
      message: "定时发布时间必须是有效日期。"
    });
  }

  if (!Array.isArray(payload.topicIds)) {
    issues.push({
      field: "topicIds",
      message: "主题必须以数组形式提供。"
    });
  }

  if ((status === "published" || status === "scheduled") && excerpt.length === 0) {
    issues.push({
      field: "excerpt",
      message: "发布前必须填写摘要。"
    });
  }

  if ((status === "published" || status === "scheduled") && body.length === 0) {
    issues.push({
      field: "body",
      message: "发布前必须填写正文内容。"
    });
  }

  if ((status === "published" || status === "scheduled") && !authorId) {
    issues.push({
      field: "authorId",
      message: "发布前必须选择作者。"
    });
  }

  if ((status === "published" || status === "scheduled") && topicIds.length === 0) {
    issues.push({
      field: "topicIds",
      message: "发布前至少需要关联一个主题。"
    });
  }

  if (status === "scheduled" && scheduledAt.length === 0) {
    issues.push({
      field: "scheduledAt",
      message: "状态为定时发布时，必须填写发布时间。"
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues
    };
  }

  return {
    valid: true,
    data: {
      slug,
      title,
      excerpt,
      body,
      status: status as ContentStatus,
      authorId,
      primaryCityId,
      coverAssetId,
      topicIds,
      seoTitle,
      seoDescription,
      scheduledAt: scheduledAt.length > 0 ? new Date(scheduledAt).toISOString() : null
    }
  };
};

export const validateAdminEventInput = (payload: unknown): AdminValidationResult<AdminEventUpsertInput> => {
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

  const slug = getTrimmedString(payload.slug);
  const title = getTrimmedString(payload.title);
  const summary = getTrimmedString(payload.summary);
  const body = getTrimmedString(payload.body);
  const status = getTrimmedString(payload.status) || "draft";
  const cityId = getNullableId(payload.cityId);
  const coverAssetId = getNullableId(payload.coverAssetId);
  const venueName = getTrimmedString(payload.venueName);
  const venueAddress = getTrimmedString(payload.venueAddress);
  const startsAt = getTrimmedString(payload.startsAt);
  const endsAt = getTrimmedString(payload.endsAt);
  const timezone = getTrimmedString(payload.timezone) || "Asia/Shanghai";
  const registrationState = getTrimmedString(payload.registrationState) || "not_open";
  const registrationUrl = getTrimmedString(payload.registrationUrl);
  const rawCapacity = payload.capacity;
  const capacity =
    rawCapacity === null || rawCapacity === undefined || rawCapacity === ""
      ? null
      : typeof rawCapacity === "number"
        ? rawCapacity
        : Number(rawCapacity);
  const rawTopicIds = Array.isArray(payload.topicIds) ? payload.topicIds : [];
  const topicIds = Array.from(
    new Set(
      rawTopicIds
        .map((entry) => getTrimmedString(entry))
        .filter(Boolean)
    )
  );
  const rawAgenda = Array.isArray(payload.agenda) ? payload.agenda : [];
  const agenda = rawAgenda
    .filter((entry) => isRecord(entry))
    .map((entry) => ({
      title: getTrimmedString(entry.title),
      summary: getTrimmedString(entry.summary),
      startsAt: getTrimmedString(entry.startsAt) || null,
      endsAt: getTrimmedString(entry.endsAt) || null,
      speakerName: getTrimmedString(entry.speakerName)
    }));
  const issues: AdminValidationIssue[] = [];

  if (slug.length < 2 || slug.length > 120) {
    issues.push({
      field: "slug",
      message: "Slug 长度必须在 2 到 120 个字符之间。"
    });
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    issues.push({
      field: "slug",
      message: "Slug 只能包含小写字母、数字和连字符。"
    });
  }

  if (title.length < 2 || title.length > 200) {
    issues.push({
      field: "title",
      message: "标题长度必须在 2 到 200 个字符之间。"
    });
  }

  if (summary.length > 500) {
    issues.push({
      field: "summary",
      message: "摘要不能超过 500 个字符。"
    });
  }

  if (!contentStatusSet.has(status)) {
    issues.push({
      field: "status",
      message: "状态无效。"
    });
  }

  if (startsAt.length > 0 && !isIsoDate(startsAt)) {
    issues.push({
      field: "startsAt",
      message: "开始时间必须是有效日期。"
    });
  }

  if (endsAt.length > 0 && !isIsoDate(endsAt)) {
    issues.push({
      field: "endsAt",
      message: "结束时间必须是有效日期。"
    });
  }

  if (startsAt.length > 0 && endsAt.length > 0 && new Date(endsAt) < new Date(startsAt)) {
    issues.push({
      field: "endsAt",
      message: "结束时间必须晚于开始时间。"
    });
  }

  if (!eventRegistrationStateSet.has(registrationState)) {
    issues.push({
      field: "registrationState",
      message: "报名状态无效。"
    });
  }

  if (!Array.isArray(payload.topicIds)) {
    issues.push({
      field: "topicIds",
      message: "主题必须以数组形式提供。"
    });
  }

  if (!Array.isArray(payload.agenda)) {
    issues.push({
      field: "agenda",
      message: "议程必须以数组形式提供。"
    });
  }

  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 0)) {
    issues.push({
      field: "capacity",
      message: "容量必须是正整数。"
    });
  }

  for (const [index, item] of agenda.entries()) {
    if (item.title.length === 0) {
      issues.push({
        field: `agenda.${index}.title`,
        message: "议程项标题不能为空。"
      });
    }

    if (item.startsAt && !isIsoDate(item.startsAt)) {
      issues.push({
        field: `agenda.${index}.startsAt`,
        message: "议程项开始时间必须是有效日期。"
      });
    }

    if (item.endsAt && !isIsoDate(item.endsAt)) {
      issues.push({
        field: `agenda.${index}.endsAt`,
        message: "议程项结束时间必须是有效日期。"
      });
    }

    if (item.startsAt && item.endsAt && new Date(item.endsAt) < new Date(item.startsAt)) {
      issues.push({
        field: `agenda.${index}.endsAt`,
        message: "议程项结束时间必须晚于开始时间。"
      });
    }
  }

  if (status === "published" && !cityId) {
    issues.push({
      field: "cityId",
      message: "发布前必须选择城市。"
    });
  }

  if (status === "published" && (!startsAt || !endsAt)) {
    issues.push({
      field: "startsAt",
      message: "发布前必须填写开始与结束时间。"
    });
  }

  if (status === "published" && topicIds.length === 0) {
    issues.push({
      field: "topicIds",
      message: "发布前至少需要关联一个主题。"
    });
  }

  if (status === "published" && agenda.length === 0) {
    issues.push({
      field: "agenda",
      message: "发布前至少需要一个议程项。"
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues
    };
  }

  return {
    valid: true,
    data: {
      slug,
      title,
      summary,
      body,
      status: status as ContentStatus,
      cityId,
      coverAssetId,
      venueName,
      venueAddress,
      startsAt: startsAt.length > 0 ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt.length > 0 ? new Date(endsAt).toISOString() : null,
      timezone,
      capacity,
      registrationState: registrationState as EventRegistrationState,
      registrationUrl,
      topicIds,
      agenda
    }
  };
};

export const validateAdminEventRegistrationInput = (
  payload: unknown
): AdminValidationResult<AdminEventRegistrationUpdateInput> => {
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

  const status = getTrimmedString(payload.status) || "submitted";
  const issues: AdminValidationIssue[] = [];

  if (!eventRegistrationStatusSet.has(status)) {
    issues.push({
      field: "status",
      message: "报名结果状态无效。"
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues
    };
  }

  return {
    valid: true,
    data: {
      status: status as EventRegistrationStatus
    }
  };
};

export const validateAdminApplicationInput = (
  payload: unknown
): AdminValidationResult<AdminApplicationUpdateInput> => {
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

  const status = getTrimmedString(payload.status) || "submitted";
  const internalNotes = getTrimmedString(payload.internalNotes);
  const issues: AdminValidationIssue[] = [];

  if (!applicationStatusSet.has(status)) {
    issues.push({
      field: "status",
      message: "申请状态无效。"
    });
  }

  if (internalNotes.length > 4000) {
    issues.push({
      field: "internalNotes",
      message: "内部备注不能超过 4000 个字符。"
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues
    };
  }

  return {
    valid: true,
    data: {
      status: status as ApplicationStatus,
      internalNotes
    }
  };
};

export const validateAdminAssetUploadIntentInput = (
  payload: unknown
): AdminValidationResult<AdminAssetUploadIntentInput> => {
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

  const filename = getTrimmedString(payload.filename);
  const mimeType = getTrimmedString(payload.mimeType).toLowerCase();
  const assetType = getTrimmedString(payload.assetType);
  const visibility = getTrimmedString(payload.visibility) || "public";
  const byteSize =
    typeof payload.byteSize === "number"
      ? Math.trunc(payload.byteSize)
      : typeof payload.byteSize === "string" && payload.byteSize.trim().length > 0
        ? Math.trunc(Number(payload.byteSize))
        : Number.NaN;
  const issues: AdminValidationIssue[] = [];

  if (filename.length === 0 || filename.length > 240) {
    issues.push({
      field: "filename",
      message: "文件名不能为空，且不能超过 240 个字符。"
    });
  }

  if (mimeType.length === 0 || mimeType.length > 120 || !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(mimeType)) {
    issues.push({
      field: "mimeType",
      message: "MIME 类型必须是有效的媒体类型。"
    });
  }

  if (!adminAssetTypeSet.has(assetType)) {
    issues.push({
      field: "assetType",
      message: "资源类型无效。"
    });
  }

  if (!assetVisibilitySet.has(visibility)) {
    issues.push({
      field: "visibility",
      message: "可见性无效。"
    });
  }

  if (!Number.isInteger(byteSize) || byteSize <= 0) {
    issues.push({
      field: "byteSize",
      message: "文件大小必须是正整数。"
    });
  }

  if (adminAssetTypeSet.has(assetType)) {
    const normalizedAssetType = assetType as AdminAssetType;
    const isImageAsset = imageAssetTypeSet.has(normalizedAssetType);

    if (isImageAsset && mimeType.length > 0 && !imageMimeTypeSet.has(mimeType)) {
      issues.push({
        field: "mimeType",
        message: "该资源类型仅支持 JPEG、PNG 或 WebP 图片。"
      });
    }

    if (!isImageAsset && mimeType.length > 0 && !documentMimeTypeSet.has(mimeType)) {
      issues.push({
        field: "mimeType",
        message: "该资源类型仅支持 PDF 或纯文本文件。"
      });
    }

    if (normalizedAssetType === "application-attachment" && visibility !== "private") {
      issues.push({
        field: "visibility",
        message: "申请附件必须为私有资源。"
      });
    }

    if (Number.isInteger(byteSize)) {
      const maxSize = isImageAsset ? 10 * 1024 * 1024 : 20 * 1024 * 1024;

      if (byteSize > maxSize) {
        issues.push({
          field: "byteSize",
          message: isImageAsset
            ? "Image assets must be 10 MB or smaller."
            : "Document assets must be 20 MB or smaller."
        });
      }
    }
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues
    };
  }

  return {
    valid: true,
    data: {
      filename,
      mimeType,
      byteSize,
      assetType: assetType as AdminAssetType,
      visibility: visibility as AssetVisibility
    }
  };
};

export const validateAdminAssetUploadCompleteInput = (
  payload: unknown
): AdminValidationResult<AdminAssetUploadCompleteInput> => {
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

  const intentToken = getTrimmedString(payload.intentToken);
  const altText = getTrimmedString(payload.altText);
  const checksum = getTrimmedString(payload.checksum);
  const width = getNullableInteger(payload.width);
  const height = getNullableInteger(payload.height);
  const issues: AdminValidationIssue[] = [];

  if (intentToken.length < 24) {
    issues.push({
      field: "intentToken",
      message: "必须提供上传意图令牌。"
    });
  }

  if (altText.length > 320) {
    issues.push({
      field: "altText",
      message: "替代文本不能超过 320 个字符。"
    });
  }

  if (checksum.length > 200) {
    issues.push({
      field: "checksum",
      message: "校验和不能超过 200 个字符。"
    });
  }

  if (width !== null && (!Number.isInteger(width) || width <= 0)) {
    issues.push({
      field: "width",
      message: "宽度必须是正整数。"
    });
  }

  if (height !== null && (!Number.isInteger(height) || height <= 0)) {
    issues.push({
      field: "height",
      message: "高度必须是正整数。"
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues
    };
  }

  return {
    valid: true,
    data: {
      intentToken,
      altText,
      width,
      height,
      checksum
    }
  };
};

export const validateAdminFeaturedBlockInput = (
  payload: unknown
): AdminValidationResult<AdminFeaturedBlockUpsertInput> => {
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

  const status = getTrimmedString(payload.status) || "draft";
  const blockPayload = isRecord(payload.payload) ? payload.payload : {};
  const heroEyebrow = getTrimmedString(blockPayload.heroEyebrow);
  const heroTitle = getTrimmedString(blockPayload.heroTitle);
  const heroSummary = getTrimmedString(blockPayload.heroSummary);
  const primaryActionLabel = getTrimmedString(blockPayload.primaryActionLabel);
  const primaryActionHref = getTrimmedString(blockPayload.primaryActionHref);
  const secondaryActionLabel = getTrimmedString(blockPayload.secondaryActionLabel);
  const secondaryActionHref = getTrimmedString(blockPayload.secondaryActionHref);
  const featuredTopicIds = getStringArray(blockPayload.featuredTopicIds);
  const featuredArticleIds = getStringArray(blockPayload.featuredArticleIds);
  const featuredEventIds = getStringArray(blockPayload.featuredEventIds);
  const cityHighlightIds = getStringArray(blockPayload.cityHighlightIds);
  const applicationTitle = getTrimmedString(blockPayload.applicationTitle);
  const applicationSummary = getTrimmedString(blockPayload.applicationSummary);
  const applicationHref = getTrimmedString(blockPayload.applicationHref);
  const issues: AdminValidationIssue[] = [];

  const pushUniqueArrayIssues = (field: string, values: string[], maxSize: number) => {
    if (values.length > maxSize) {
      issues.push({
        field,
        message: `最多只能选择 ${maxSize} 项。`
      });
    }

    if (new Set(values).size !== values.length) {
      issues.push({
        field,
        message: "不允许重复选择。"
      });
    }
  };

  if (!featuredBlockStatusSet.has(status)) {
    issues.push({
      field: "status",
      message: "状态无效。"
    });
  }

  if (heroEyebrow.length > 80) {
    issues.push({
      field: "payload.heroEyebrow",
      message: "Hero 眉标不能超过 80 个字符。"
    });
  }

  if (heroTitle.length < 4 || heroTitle.length > 180) {
    issues.push({
      field: "payload.heroTitle",
      message: "Hero 标题长度必须在 4 到 180 个字符之间。"
    });
  }

  if (heroSummary.length < 12 || heroSummary.length > 400) {
    issues.push({
      field: "payload.heroSummary",
      message: "Hero 摘要长度必须在 12 到 400 个字符之间。"
    });
  }

  if (primaryActionLabel.length > 0 || primaryActionHref.length > 0) {
    if (primaryActionLabel.length < 2 || primaryActionLabel.length > 60) {
      issues.push({
        field: "payload.primaryActionLabel",
        message: "主按钮文案长度必须在 2 到 60 个字符之间。"
      });
    }

    if (primaryActionHref.length < 1 || primaryActionHref.length > 240 || !isRelativeOrAbsoluteHref(primaryActionHref)) {
      issues.push({
        field: "payload.primaryActionHref",
        message: "主按钮链接必须是相对路径或绝对 http(s) URL。"
      });
    }
  }

  if (secondaryActionLabel.length > 0 || secondaryActionHref.length > 0) {
    if (secondaryActionLabel.length < 2 || secondaryActionLabel.length > 60) {
      issues.push({
        field: "payload.secondaryActionLabel",
        message: "次按钮文案长度必须在 2 到 60 个字符之间。"
      });
    }

    if (
      secondaryActionHref.length < 1 ||
      secondaryActionHref.length > 240 ||
      !isRelativeOrAbsoluteHref(secondaryActionHref)
    ) {
      issues.push({
        field: "payload.secondaryActionHref",
        message: "次按钮链接必须是相对路径或绝对 http(s) URL。"
      });
    }
  }

  pushUniqueArrayIssues("payload.featuredTopicIds", featuredTopicIds, 6);
  pushUniqueArrayIssues("payload.featuredArticleIds", featuredArticleIds, 6);
  pushUniqueArrayIssues("payload.featuredEventIds", featuredEventIds, 6);
  pushUniqueArrayIssues("payload.cityHighlightIds", cityHighlightIds, 6);

  if (applicationTitle.length < 4 || applicationTitle.length > 140) {
    issues.push({
      field: "payload.applicationTitle",
      message: "申请引导标题长度必须在 4 到 140 个字符之间。"
    });
  }

  if (applicationSummary.length < 12 || applicationSummary.length > 320) {
    issues.push({
      field: "payload.applicationSummary",
      message: "申请引导摘要长度必须在 12 到 320 个字符之间。"
    });
  }

  if (applicationHref.length < 1 || applicationHref.length > 240 || !isRelativeOrAbsoluteHref(applicationHref)) {
    issues.push({
      field: "payload.applicationHref",
      message: "申请引导链接必须是相对路径或绝对 http(s) URL。"
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues
    };
  }

  return {
    valid: true,
    data: {
      status: status as FeaturedBlockStatus,
      payload: {
        heroEyebrow,
        heroTitle,
        heroSummary,
        primaryActionLabel,
        primaryActionHref,
        secondaryActionLabel,
        secondaryActionHref,
        featuredTopicIds,
        featuredArticleIds,
        featuredEventIds,
        cityHighlightIds,
        applicationTitle,
        applicationSummary,
        applicationHref
      }
    }
  };
};

export const validateAdminSiteSettingsInput = (
  payload: unknown
): AdminValidationResult<AdminSiteSettingsInput> => {
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

  const siteName = getTrimmedString(payload.siteName);
  const footerTagline = getTrimmedString(payload.footerTagline);
  const supportEmail = getTrimmedString(payload.supportEmail);
  const issues: AdminValidationIssue[] = [];

  if (siteName.length < 2 || siteName.length > 120) {
    issues.push({
      field: "siteName",
      message: "站点名称长度必须在 2 到 120 个字符之间。"
    });
  }

  if (footerTagline.length > 240) {
    issues.push({
      field: "footerTagline",
      message: "页脚标语不能超过 240 个字符。"
    });
  }

  if (supportEmail.length > 0 && !emailPattern.test(supportEmail)) {
    issues.push({
      field: "supportEmail",
      message: "支持邮箱必须是有效的邮箱地址。"
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues
    };
  }

  return {
    valid: true,
    data: {
      siteName,
      footerTagline,
      supportEmail
    }
  };
};

export const validateAdminStaffCreateInput = (
  payload: unknown
): AdminValidationResult<AdminStaffCreateInput> => {
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

  const email = getTrimmedString(payload.email).toLowerCase();
  const name = getTrimmedString(payload.name);
  const password = getTrimmedString(payload.password);
  const status = getTrimmedString(payload.status) || "invited";
  const roleIds = getUniqueStringArray(payload.roleIds);
  const notes = getTrimmedString(payload.notes);
  const issues: AdminValidationIssue[] = [];

  if (!emailPattern.test(email)) {
    issues.push({
      field: "email",
      message: "邮箱必须是有效的邮箱地址。"
    });
  }

  if (name.length < 2 || name.length > 120) {
    issues.push({
      field: "name",
      message: "名称长度必须在 2 到 120 个字符之间。"
    });
  }

  if (password.length < 12 || password.length > 128) {
    issues.push({
      field: "password",
      message: "密码长度必须在 12 到 128 个字符之间。"
    });
  }

  if (!staffAccountStatusSet.has(status)) {
    issues.push({
      field: "status",
      message: "状态无效。"
    });
  }

  if (!Array.isArray(payload.roleIds)) {
    issues.push({
      field: "roleIds",
      message: "角色必须以数组形式提供。"
    });
  } else if (roleIds.length === 0) {
    issues.push({
      field: "roleIds",
      message: "至少需要选择一个角色。"
    });
  }

  if (notes.length > 1000) {
    issues.push({
      field: "notes",
      message: "备注不能超过 1000 个字符。"
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues
    };
  }

  return {
    valid: true,
    data: {
      email,
      name,
      password,
      status: status as StaffAccountStatus,
      roleIds,
      notes
    }
  };
};

export const validateAdminStaffUpdateInput = (
  payload: unknown
): AdminValidationResult<AdminStaffUpdateInput> => {
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

  const email = getTrimmedString(payload.email).toLowerCase();
  const name = getTrimmedString(payload.name);
  const status = getTrimmedString(payload.status) || "invited";
  const roleIds = getUniqueStringArray(payload.roleIds);
  const notes = getTrimmedString(payload.notes);
  const issues: AdminValidationIssue[] = [];

  if (!emailPattern.test(email)) {
    issues.push({
      field: "email",
      message: "邮箱必须是有效的邮箱地址。"
    });
  }

  if (name.length < 2 || name.length > 120) {
    issues.push({
      field: "name",
      message: "名称长度必须在 2 到 120 个字符之间。"
    });
  }

  if (!staffAccountStatusSet.has(status)) {
    issues.push({
      field: "status",
      message: "状态无效。"
    });
  }

  if (!Array.isArray(payload.roleIds)) {
    issues.push({
      field: "roleIds",
      message: "角色必须以数组形式提供。"
    });
  } else if (roleIds.length === 0) {
    issues.push({
      field: "roleIds",
      message: "至少需要选择一个角色。"
    });
  }

  if (notes.length > 1000) {
    issues.push({
      field: "notes",
      message: "备注不能超过 1000 个字符。"
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues
    };
  }

  return {
    valid: true,
    data: {
      email,
      name,
      status: status as StaffAccountStatus,
      roleIds,
      notes
    }
  };
};

export const validateAdminRoleInput = (payload: unknown): AdminValidationResult<AdminRoleUpdateInput> => {
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

  const name = getTrimmedString(payload.name);
  const description = getTrimmedString(payload.description);
  const permissionIds = getUniqueStringArray(payload.permissionIds);
  const issues: AdminValidationIssue[] = [];

  if (name.length < 2 || name.length > 120) {
    issues.push({
      field: "name",
      message: "角色名称长度必须在 2 到 120 个字符之间。"
    });
  }

  if (description.length > 320) {
    issues.push({
      field: "description",
      message: "描述不能超过 320 个字符。"
    });
  }

  if (!Array.isArray(payload.permissionIds)) {
    issues.push({
      field: "permissionIds",
      message: "权限必须以数组形式提供。"
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues
    };
  }

  return {
    valid: true,
    data: {
      name,
      description,
      permissionIds
    }
  };
};
