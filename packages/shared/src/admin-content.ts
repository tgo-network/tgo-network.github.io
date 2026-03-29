import { eventRegistrationStatusOptions } from "./public-content.js";

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
  | "branch-cover"
  | "member-avatar"
  | "article-cover"
  | "article-inline"
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
    value: "branch-cover",
    label: "分会封面"
  },
  {
    value: "member-avatar",
    label: "成员头像"
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

export const adminAssetUploadTypeOptions = adminAssetTypeOptions;

const adminAssetTypeSet = new Set<string>(adminAssetTypeOptions.map((option) => option.value));
const imageAssetTypeSet = new Set<AdminAssetType>([
  "site-banner",
  "branch-cover",
  "member-avatar",
  "article-cover",
  "article-inline",
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

export interface AdminArticleListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  authorName: string | null;
  branchName: string | null;
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
  branchId: string | null;
  coverAssetId: string | null;
  seoTitle: string;
  seoDescription: string;
  scheduledAt: string | Date | null;
  publishedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AdminArticleReferences {
  authors: AdminEditorReferenceOption[];
  branches: AdminEditorReferenceOption[];
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
  branchId: string | null;
  coverAssetId: string | null;
  seoTitle: string;
  seoDescription: string;
  scheduledAt: string | null;
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
  const branchId = getNullableId(payload.branchId);
  const coverAssetId = getNullableId(payload.coverAssetId);
  const scheduledAt = getTrimmedString(payload.scheduledAt);
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
      branchId,
      coverAssetId,
      seoTitle,
      seoDescription,
      scheduledAt: scheduledAt.length > 0 ? new Date(scheduledAt).toISOString() : null
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
            ? "图片资源必须小于或等于 10 MB。"
            : "文档资源必须小于或等于 20 MB。"
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
