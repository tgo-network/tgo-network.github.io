import { asc, desc, eq } from "drizzle-orm";

import { articles, assets, authors, branches } from "@tgo/db";
import type {
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

const imageAssetTypes = new Set([
  "site-banner",
  "branch-cover",
  "member-avatar",
  "article-cover",
  "article-inline",
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

const getActorStaffAccountId = (actor: AuditActorContext) => {
  if (!actor.actorStaffAccountId) {
    throw new AdminContentError(403, "FORBIDDEN", "需要启用中的员工账号权限。");
  }

  return actor.actorStaffAccountId;
};

const mapArticleRecord = (article: typeof articles.$inferSelect): AdminArticleRecord => ({
  id: article.id,
  slug: article.slug,
  title: article.title,
  excerpt: article.excerpt ?? "",
  body: article.bodyRichtext ?? "",
  status: article.status,
  authorId: article.authorId,
  branchId: article.branchId,
  coverAssetId: article.coverAssetId,
  seoTitle: article.seoTitle ?? "",
  seoDescription: article.seoDescription ?? "",
  scheduledAt: asIso(article.scheduledAt),
  publishedAt: asIso(article.publishedAt),
  createdAt: article.createdAt.toISOString(),
  updatedAt: article.updatedAt.toISOString()
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
      throw new AdminContentError(409, "CONFLICT", "已存在相同 URL 标识的记录。");
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
  const [authorRows, branchRows] = await Promise.all([
    db.select().from(authors).orderBy(asc(authors.displayName)),
    db.select().from(branches).orderBy(asc(branches.sortOrder), asc(branches.name))
  ]);

  return {
    authors: authorRows.map((author) => ({
      id: author.id,
      label: author.displayName,
      description: author.bio ?? null
    })),
    branches: branchRows.map((branch) => ({
      id: branch.id,
      label: branch.name,
      description: branch.summary ?? branch.cityName
    }))
  };
};

export const getPublishableArticleIssues = (article: typeof articles.$inferSelect): AdminValidationIssue[] => {
  const issues: AdminValidationIssue[] = [];

  if (article.title.trim().length < 2) {
    issues.push({ field: "title", message: "发布前必须填写标题。" });
  }

  if (article.slug.trim().length < 2) {
    issues.push({ field: "slug", message: "发布前必须填写 URL 标识。" });
  }

  if ((article.excerpt ?? "").trim().length === 0) {
    issues.push({ field: "excerpt", message: "发布前必须填写摘要导语。" });
  }

  if ((article.bodyRichtext ?? "").trim().length === 0) {
    issues.push({ field: "body", message: "发布前必须填写正文内容。" });
  }

  if (!article.authorId) {
    issues.push({ field: "authorId", message: "发布前必须选择作者。" });
  }

  return issues;
};

const validatePublishableArticle = (article: typeof articles.$inferSelect) => {
  const issues = getPublishableArticleIssues(article);

  if (issues.length > 0) {
    throw new AdminContentError(400, "VALIDATION_ERROR", "文章尚未满足发布条件。", {
      issues
    });
  }
};

const assertArticleReferences = async (input: AdminArticleUpsertInput) => {
  const db = getDb();
  const issues: AdminValidationIssue[] = [];

  const [authorRows, branchRows] = await Promise.all([
    input.authorId ? db.select({ id: authors.id }).from(authors).where(eq(authors.id, input.authorId)) : Promise.resolve([]),
    input.branchId ? db.select({ id: branches.id }).from(branches).where(eq(branches.id, input.branchId)) : Promise.resolve([])
  ]);

  if (input.authorId && authorRows.length === 0) {
    issues.push({ field: "authorId", message: "所选作者不存在。" });
  }

  if (input.branchId && branchRows.length === 0) {
    issues.push({ field: "branchId", message: "所选分会不存在。" });
  }

  if (issues.length > 0) {
    throw new AdminContentError(400, "VALIDATION_ERROR", "文章关联数据无效。", {
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
    issues.push({ field: "coverAssetId", message: "所选封面资源不存在。" });
  } else {
    if (coverAsset.status !== "active") {
      issues.push({ field: "coverAssetId", message: "所选封面资源必须处于启用状态。" });
    }

    if (coverAsset.visibility !== "public") {
      issues.push({ field: "coverAssetId", message: "所选封面资源必须为公开资源。" });
    }

    if (!coverAsset.mimeType.startsWith("image/")) {
      issues.push({ field: "coverAssetId", message: "所选封面资源必须是图片。" });
    }
  }

  if (issues.length > 0) {
    throw new AdminContentError(400, "VALIDATION_ERROR", "封面资源选择无效。", {
      issues
    });
  }
};

export const listAdminArticles = async (): Promise<AdminArticleListItem[]> => {
  const db = getDb();
  const [articleRows, authorRows, branchRows] = await Promise.all([
    db.select().from(articles).orderBy(desc(articles.updatedAt), desc(articles.publishedAt)),
    db.select().from(authors),
    db.select().from(branches)
  ]);

  const authorById = new Map(authorRows.map((row) => [row.id, row]));
  const branchById = new Map(branchRows.map((row) => [row.id, row]));

  return articleRows.map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    status: article.status,
    authorName: article.authorId ? authorById.get(article.authorId)?.displayName ?? null : null,
    branchName: article.branchId ? branchById.get(article.branchId)?.name ?? null : null,
    publishedAt: asIso(article.publishedAt),
    updatedAt: article.updatedAt.toISOString()
  }));
};

export const getAdminArticleReferencesPayload = async (): Promise<AdminArticleReferencesPayload> => ({
  references: await getArticleReferences()
});

export const getAdminArticle = async (id: string): Promise<AdminArticleDetailPayload | null> => {
  const db = getDb();
  const [article, references] = await Promise.all([
    db.query.articles.findFirst({ where: eq(articles.id, id.trim()) }),
    getArticleReferences()
  ]);

  if (!article) {
    return null;
  }

  return {
    article: mapArticleRecord(article),
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
    const publishAt = input.status === "published" ? now() : null;
    const [created] = await db
      .insert(articles)
      .values({
        slug: input.slug,
        title: input.title,
        excerpt: asNullableText(input.excerpt),
        bodyRichtext: asNullableText(input.body),
        status: input.status,
        authorId: input.authorId,
        branchId: input.branchId,
        coverAssetId: input.coverAssetId,
        seoTitle: asNullableText(input.seoTitle),
        seoDescription: asNullableText(input.seoDescription),
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        publishedAt: publishAt,
        createdByStaffId: staffAccountId,
        updatedByStaffId: staffAccountId
      })
      .returning();

    await writeAuditLog(actor, {
      action: "article.create",
      targetType: "article",
      targetId: created.id,
      after: mapArticleRecord(created)
    });

    return {
      article: mapArticleRecord(created),
      references: await getArticleReferences()
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
    const existing = await db.query.articles.findFirst({
      where: eq(articles.id, id.trim())
    });

    if (!existing) {
      throw new AdminContentError(404, "NOT_FOUND", "文章不存在。");
    }

    const [updated] = await db
      .update(articles)
      .set({
        slug: input.slug,
        title: input.title,
        excerpt: asNullableText(input.excerpt),
        bodyRichtext: asNullableText(input.body),
        status: input.status,
        authorId: input.authorId,
        branchId: input.branchId,
        coverAssetId: input.coverAssetId,
        seoTitle: asNullableText(input.seoTitle),
        seoDescription: asNullableText(input.seoDescription),
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        publishedAt: input.status === "published" ? existing.publishedAt ?? now() : existing.publishedAt,
        updatedByStaffId: staffAccountId,
        updatedAt: now()
      })
      .where(eq(articles.id, existing.id))
      .returning();

    await writeAuditLog(actor, {
      action: "article.update",
      targetType: "article",
      targetId: existing.id,
      before: mapArticleRecord(existing),
      after: updated ? mapArticleRecord(updated) : null
    });

    return {
      article: mapArticleRecord(updated!),
      references: await getArticleReferences()
    };
  });
};

export const publishAdminArticle = async (
  id: string,
  actor: AuditActorContext
): Promise<AdminArticleDetailPayload> => {
  const db = getDb();
  const staffAccountId = getActorStaffAccountId(actor);
  const existing = await db.query.articles.findFirst({
    where: eq(articles.id, id.trim())
  });

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "文章不存在。");
  }

  validatePublishableArticle(existing);

  const [article] = await db
    .update(articles)
    .set({
      status: "published",
      publishedAt: existing.publishedAt ?? now(),
      updatedByStaffId: staffAccountId,
      updatedAt: now()
    })
    .where(eq(articles.id, existing.id))
    .returning();

  await writeAuditLog(actor, {
    action: "article.publish",
    targetType: "article",
    targetId: article.id,
    before: mapArticleRecord(existing),
    after: mapArticleRecord(article)
  });

  return {
    article: mapArticleRecord(article),
    references: await getArticleReferences()
  };
};

export const archiveAdminArticle = async (
  id: string,
  actor: AuditActorContext
): Promise<AdminArticleDetailPayload> => {
  const db = getDb();
  const staffAccountId = getActorStaffAccountId(actor);
  const existing = await db.query.articles.findFirst({
    where: eq(articles.id, id.trim())
  });

  if (!existing) {
    throw new AdminContentError(404, "NOT_FOUND", "文章不存在。");
  }

  const [article] = await db
    .update(articles)
    .set({
      status: "archived",
      updatedByStaffId: staffAccountId,
      updatedAt: now()
    })
    .where(eq(articles.id, existing.id))
    .returning();

  await writeAuditLog(actor, {
    action: "article.archive",
    targetType: "article",
    targetId: article.id,
    before: mapArticleRecord(existing),
    after: mapArticleRecord(article)
  });

  return {
    article: mapArticleRecord(article),
    references: await getArticleReferences()
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
      throw new AdminContentError(403, "FORBIDDEN", "该上传意图不属于当前员工账号。");
    }

    if (isImageAsset && (input.width === null || input.height === null)) {
      throw new AdminContentError(400, "VALIDATION_ERROR", "图片上传必须包含宽高元数据。", {
        issues: [
          { field: "width", message: "图片上传必须包含宽度元数据。" },
          { field: "height", message: "图片上传必须包含高度元数据。" }
        ]
      });
    }

    if (!isImageAsset && (input.width !== null || input.height !== null)) {
      throw new AdminContentError(400, "VALIDATION_ERROR", "文档上传不能包含图片尺寸信息。", {
        issues: [
          { field: "width", message: "文档上传不能包含图片尺寸信息。" },
          { field: "height", message: "文档上传不能包含图片尺寸信息。" }
        ]
      });
    }

    if (isImageAsset && input.width !== null && input.height !== null) {
      if (input.width > env.assetImageMaxDimension || input.height > env.assetImageMaxDimension) {
        throw new AdminContentError(400, "VALIDATION_ERROR", "图片尺寸超出当前上传限制。", {
          issues: [
            {
              field: "width",
              message: `图片宽高都不能超过 ${env.assetImageMaxDimension} 像素。`
            }
          ]
        });
      }

      if (input.width * input.height > env.assetImageMaxPixels) {
        throw new AdminContentError(400, "VALIDATION_ERROR", "图片像素总量超出当前上传限制。", {
          issues: [
            {
              field: "width",
              message: `图片像素总量不能超过 ${env.assetImageMaxPixels.toLocaleString()}。`
            }
          ]
        });
      }
    }

    const uploadedObject = await inspectUploadedObject(intent);

    if (uploadedObject.byteSize !== null && uploadedObject.byteSize !== intent.byteSize) {
      throw new AdminContentError(400, "UPLOAD_MISMATCH", "上传对象大小与上传意图不一致。", {
        expectedByteSize: intent.byteSize,
        actualByteSize: uploadedObject.byteSize
      });
    }

    if (
      uploadedObject.mimeType &&
      uploadedObject.mimeType.trim().toLowerCase() !== intent.mimeType.trim().toLowerCase()
    ) {
      throw new AdminContentError(400, "UPLOAD_MISMATCH", "上传对象的媒体类型与上传意图不一致。", {
        expectedMimeType: intent.mimeType,
        actualMimeType: uploadedObject.mimeType
      });
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
        throw new AdminContentError(409, "CONFLICT", "该上传已完成登记，不能重复提交。");
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
