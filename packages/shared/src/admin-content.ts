import { eventRegistrationStatusOptions, type EventRegistrationStatus } from "./public-content.js";

export type ContentStatus = "draft" | "in_review" | "scheduled" | "published" | "archived";

export const contentStatusOptions = [
  {
    value: "draft",
    label: "Draft"
  },
  {
    value: "in_review",
    label: "In Review"
  },
  {
    value: "scheduled",
    label: "Scheduled"
  },
  {
    value: "published",
    label: "Published"
  },
  {
    value: "archived",
    label: "Archived"
  }
] as const;

const contentStatusSet = new Set<string>(contentStatusOptions.map((option) => option.value));

export type EventRegistrationState = "not_open" | "open" | "waitlist" | "closed";

export const eventRegistrationStateOptions = [
  {
    value: "not_open",
    label: "Not Open"
  },
  {
    value: "open",
    label: "Open"
  },
  {
    value: "waitlist",
    label: "Waitlist"
  },
  {
    value: "closed",
    label: "Closed"
  }
] as const;

const eventRegistrationStateSet = new Set<string>(eventRegistrationStateOptions.map((option) => option.value));

const eventRegistrationStatusSet = new Set<string>(eventRegistrationStatusOptions.map((option) => option.value));

export type ApplicationStatus = "submitted" | "in_review" | "contacted" | "approved" | "rejected" | "closed";

export const applicationStatusOptions = [
  {
    value: "submitted",
    label: "Submitted"
  },
  {
    value: "in_review",
    label: "In Review"
  },
  {
    value: "contacted",
    label: "Contacted"
  },
  {
    value: "approved",
    label: "Approved"
  },
  {
    value: "rejected",
    label: "Rejected"
  },
  {
    value: "closed",
    label: "Closed"
  }
] as const;

const applicationStatusSet = new Set<string>(applicationStatusOptions.map((option) => option.value));

export type FeaturedBlockStatus = "draft" | "active" | "archived";

export const featuredBlockStatusOptions = [
  {
    value: "draft",
    label: "Draft"
  },
  {
    value: "active",
    label: "Active"
  },
  {
    value: "archived",
    label: "Archived"
  }
] as const;

const featuredBlockStatusSet = new Set<string>(featuredBlockStatusOptions.map((option) => option.value));

export type AssetVisibility = "public" | "private";

export const assetVisibilityOptions = [
  {
    value: "public",
    label: "Public"
  },
  {
    value: "private",
    label: "Private"
  }
] as const;

const assetVisibilitySet = new Set<string>(assetVisibilityOptions.map((option) => option.value));

export type AssetStatus = "uploaded" | "active" | "archived" | "deleted";

export const assetStatusOptions = [
  {
    value: "uploaded",
    label: "Uploaded"
  },
  {
    value: "active",
    label: "Active"
  },
  {
    value: "archived",
    label: "Archived"
  },
  {
    value: "deleted",
    label: "Deleted"
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
    label: "Site Banner"
  },
  {
    value: "topic-cover",
    label: "Topic Cover"
  },
  {
    value: "article-cover",
    label: "Article Cover"
  },
  {
    value: "article-inline",
    label: "Article Inline"
  },
  {
    value: "city-cover",
    label: "City Cover"
  },
  {
    value: "event-poster",
    label: "Event Poster"
  },
  {
    value: "speaker-avatar",
    label: "Speaker Avatar"
  },
  {
    value: "application-attachment",
    label: "Application Attachment"
  },
  {
    value: "generic-file",
    label: "Generic File"
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
          message: "A JSON object is required."
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
      message: "Slug must be between 2 and 120 characters."
    });
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    issues.push({
      field: "slug",
      message: "Slug must use lowercase letters, numbers, and hyphens only."
    });
  }

  if (title.length < 2 || title.length > 160) {
    issues.push({
      field: "title",
      message: "Title must be between 2 and 160 characters."
    });
  }

  if (summary.length > 400) {
    issues.push({
      field: "summary",
      message: "Summary must be 400 characters or fewer."
    });
  }

  if (seoTitle.length > 160) {
    issues.push({
      field: "seoTitle",
      message: "SEO title must be 160 characters or fewer."
    });
  }

  if (seoDescription.length > 320) {
    issues.push({
      field: "seoDescription",
      message: "SEO description must be 320 characters or fewer."
    });
  }

  if (!contentStatusSet.has(status)) {
    issues.push({
      field: "status",
      message: "Status is invalid."
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
          message: "A JSON object is required."
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
      message: "Slug must be between 2 and 120 characters."
    });
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    issues.push({
      field: "slug",
      message: "Slug must use lowercase letters, numbers, and hyphens only."
    });
  }

  if (title.length < 2 || title.length > 200) {
    issues.push({
      field: "title",
      message: "Title must be between 2 and 200 characters."
    });
  }

  if (excerpt.length > 500) {
    issues.push({
      field: "excerpt",
      message: "Excerpt must be 500 characters or fewer."
    });
  }

  if (seoTitle.length > 160) {
    issues.push({
      field: "seoTitle",
      message: "SEO title must be 160 characters or fewer."
    });
  }

  if (seoDescription.length > 320) {
    issues.push({
      field: "seoDescription",
      message: "SEO description must be 320 characters or fewer."
    });
  }

  if (!contentStatusSet.has(status)) {
    issues.push({
      field: "status",
      message: "Status is invalid."
    });
  }

  if (scheduledAt.length > 0 && !isIsoDate(scheduledAt)) {
    issues.push({
      field: "scheduledAt",
      message: "Scheduled publish time must be a valid date."
    });
  }

  if (!Array.isArray(payload.topicIds)) {
    issues.push({
      field: "topicIds",
      message: "Topics must be provided as an array."
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
          message: "A JSON object is required."
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
      message: "Slug must be between 2 and 120 characters."
    });
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    issues.push({
      field: "slug",
      message: "Slug must use lowercase letters, numbers, and hyphens only."
    });
  }

  if (title.length < 2 || title.length > 200) {
    issues.push({
      field: "title",
      message: "Title must be between 2 and 200 characters."
    });
  }

  if (summary.length > 500) {
    issues.push({
      field: "summary",
      message: "Summary must be 500 characters or fewer."
    });
  }

  if (!contentStatusSet.has(status)) {
    issues.push({
      field: "status",
      message: "Status is invalid."
    });
  }

  if (startsAt.length > 0 && !isIsoDate(startsAt)) {
    issues.push({
      field: "startsAt",
      message: "Start time must be a valid date."
    });
  }

  if (endsAt.length > 0 && !isIsoDate(endsAt)) {
    issues.push({
      field: "endsAt",
      message: "End time must be a valid date."
    });
  }

  if (startsAt.length > 0 && endsAt.length > 0 && new Date(endsAt) < new Date(startsAt)) {
    issues.push({
      field: "endsAt",
      message: "End time must be after the start time."
    });
  }

  if (!eventRegistrationStateSet.has(registrationState)) {
    issues.push({
      field: "registrationState",
      message: "Registration state is invalid."
    });
  }

  if (!Array.isArray(payload.topicIds)) {
    issues.push({
      field: "topicIds",
      message: "Topics must be provided as an array."
    });
  }

  if (!Array.isArray(payload.agenda)) {
    issues.push({
      field: "agenda",
      message: "Agenda must be provided as an array."
    });
  }

  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 0)) {
    issues.push({
      field: "capacity",
      message: "Capacity must be a positive whole number."
    });
  }

  for (const [index, item] of agenda.entries()) {
    if (item.title.length === 0) {
      issues.push({
        field: `agenda.${index}.title`,
        message: "Agenda item title is required."
      });
    }

    if (item.startsAt && !isIsoDate(item.startsAt)) {
      issues.push({
        field: `agenda.${index}.startsAt`,
        message: "Agenda item start time must be a valid date."
      });
    }

    if (item.endsAt && !isIsoDate(item.endsAt)) {
      issues.push({
        field: `agenda.${index}.endsAt`,
        message: "Agenda item end time must be a valid date."
      });
    }

    if (item.startsAt && item.endsAt && new Date(item.endsAt) < new Date(item.startsAt)) {
      issues.push({
        field: `agenda.${index}.endsAt`,
        message: "Agenda item end time must be after the start time."
      });
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
          message: "A JSON object is required."
        }
      ]
    };
  }

  const status = getTrimmedString(payload.status) || "submitted";
  const issues: AdminValidationIssue[] = [];

  if (!eventRegistrationStatusSet.has(status)) {
    issues.push({
      field: "status",
      message: "Registration status is invalid."
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
          message: "A JSON object is required."
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
      message: "Application status is invalid."
    });
  }

  if (internalNotes.length > 4000) {
    issues.push({
      field: "internalNotes",
      message: "Internal notes must be 4000 characters or fewer."
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
          message: "A JSON object is required."
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
      message: "Filename is required and must be 240 characters or fewer."
    });
  }

  if (mimeType.length === 0 || mimeType.length > 120 || !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(mimeType)) {
    issues.push({
      field: "mimeType",
      message: "Mime type must be a valid media type."
    });
  }

  if (!adminAssetTypeSet.has(assetType)) {
    issues.push({
      field: "assetType",
      message: "Asset type is invalid."
    });
  }

  if (!assetVisibilitySet.has(visibility)) {
    issues.push({
      field: "visibility",
      message: "Visibility is invalid."
    });
  }

  if (!Number.isInteger(byteSize) || byteSize <= 0) {
    issues.push({
      field: "byteSize",
      message: "Byte size must be a positive whole number."
    });
  }

  if (adminAssetTypeSet.has(assetType)) {
    const normalizedAssetType = assetType as AdminAssetType;
    const isImageAsset = imageAssetTypeSet.has(normalizedAssetType);

    if (isImageAsset && mimeType.length > 0 && !imageMimeTypeSet.has(mimeType)) {
      issues.push({
        field: "mimeType",
        message: "This asset type only supports JPEG, PNG, or WebP images."
      });
    }

    if (!isImageAsset && mimeType.length > 0 && !documentMimeTypeSet.has(mimeType)) {
      issues.push({
        field: "mimeType",
        message: "This asset type only supports PDF or plain text files."
      });
    }

    if (normalizedAssetType === "application-attachment" && visibility !== "private") {
      issues.push({
        field: "visibility",
        message: "Application attachments must be private."
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
          message: "A JSON object is required."
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
      message: "Upload intent token is required."
    });
  }

  if (altText.length > 320) {
    issues.push({
      field: "altText",
      message: "Alt text must be 320 characters or fewer."
    });
  }

  if (checksum.length > 200) {
    issues.push({
      field: "checksum",
      message: "Checksum must be 200 characters or fewer."
    });
  }

  if (width !== null && (!Number.isInteger(width) || width <= 0)) {
    issues.push({
      field: "width",
      message: "Width must be a positive whole number."
    });
  }

  if (height !== null && (!Number.isInteger(height) || height <= 0)) {
    issues.push({
      field: "height",
      message: "Height must be a positive whole number."
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
          message: "A JSON object is required."
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
        message: `Select no more than ${maxSize} items.`
      });
    }

    if (new Set(values).size !== values.length) {
      issues.push({
        field,
        message: "Duplicate selections are not allowed."
      });
    }
  };

  if (!featuredBlockStatusSet.has(status)) {
    issues.push({
      field: "status",
      message: "Status is invalid."
    });
  }

  if (heroEyebrow.length > 80) {
    issues.push({
      field: "payload.heroEyebrow",
      message: "Hero eyebrow must be 80 characters or fewer."
    });
  }

  if (heroTitle.length < 4 || heroTitle.length > 180) {
    issues.push({
      field: "payload.heroTitle",
      message: "Hero title must be between 4 and 180 characters."
    });
  }

  if (heroSummary.length < 12 || heroSummary.length > 400) {
    issues.push({
      field: "payload.heroSummary",
      message: "Hero summary must be between 12 and 400 characters."
    });
  }

  if (primaryActionLabel.length > 0 || primaryActionHref.length > 0) {
    if (primaryActionLabel.length < 2 || primaryActionLabel.length > 60) {
      issues.push({
        field: "payload.primaryActionLabel",
        message: "Primary action label must be between 2 and 60 characters."
      });
    }

    if (primaryActionHref.length < 1 || primaryActionHref.length > 240 || !isRelativeOrAbsoluteHref(primaryActionHref)) {
      issues.push({
        field: "payload.primaryActionHref",
        message: "Primary action link must be a relative path or an absolute http(s) URL."
      });
    }
  }

  if (secondaryActionLabel.length > 0 || secondaryActionHref.length > 0) {
    if (secondaryActionLabel.length < 2 || secondaryActionLabel.length > 60) {
      issues.push({
        field: "payload.secondaryActionLabel",
        message: "Secondary action label must be between 2 and 60 characters."
      });
    }

    if (
      secondaryActionHref.length < 1 ||
      secondaryActionHref.length > 240 ||
      !isRelativeOrAbsoluteHref(secondaryActionHref)
    ) {
      issues.push({
        field: "payload.secondaryActionHref",
        message: "Secondary action link must be a relative path or an absolute http(s) URL."
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
      message: "Application callout title must be between 4 and 140 characters."
    });
  }

  if (applicationSummary.length < 12 || applicationSummary.length > 320) {
    issues.push({
      field: "payload.applicationSummary",
      message: "Application callout summary must be between 12 and 320 characters."
    });
  }

  if (applicationHref.length < 1 || applicationHref.length > 240 || !isRelativeOrAbsoluteHref(applicationHref)) {
    issues.push({
      field: "payload.applicationHref",
      message: "Application callout link must be a relative path or an absolute http(s) URL."
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
          message: "A JSON object is required."
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
      message: "Site name must be between 2 and 120 characters."
    });
  }

  if (footerTagline.length > 240) {
    issues.push({
      field: "footerTagline",
      message: "Footer tagline must be 240 characters or fewer."
    });
  }

  if (supportEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    issues.push({
      field: "supportEmail",
      message: "Support email must be a valid email address."
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
