import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";

import { articleTopicBindings, articles } from "@tgo/db";
import type { AdminValidationIssue } from "@tgo/shared";

import { getPublishableArticleIssues } from "./admin-content.js";
import type { AuditActorContext } from "./audit.js";
import { writeAuditLog } from "./audit.js";
import { getDb } from "./db.js";

const asIso = (value: Date | null | undefined) => (value ? value.toISOString() : null);
const now = () => new Date();

export interface InternalPublishedArticleResult {
  id: string;
  slug: string;
  title: string;
  scheduledAt: string | null;
  publishedAt: string | null;
}

export interface InternalSkippedArticleResult {
  id: string;
  slug: string;
  title: string;
  scheduledAt: string | null;
  issues: AdminValidationIssue[];
}

export interface PublishScheduledContentResult {
  processedAt: string;
  totalDue: number;
  totalPublished: number;
  totalSkipped: number;
  published: InternalPublishedArticleResult[];
  skipped: InternalSkippedArticleResult[];
}

export const publishScheduledContent = async (
  actor: AuditActorContext
): Promise<PublishScheduledContentResult> => {
  const db = getDb();
  const processedAt = now();

  const dueArticles = await db
    .select()
    .from(articles)
    .where(and(eq(articles.status, "scheduled"), isNotNull(articles.scheduledAt), lte(articles.scheduledAt, processedAt)))
    .orderBy(asc(articles.scheduledAt), asc(articles.updatedAt));

  if (dueArticles.length === 0) {
    return {
      processedAt: processedAt.toISOString(),
      totalDue: 0,
      totalPublished: 0,
      totalSkipped: 0,
      published: [],
      skipped: []
    };
  }

  const articleIds = dueArticles.map((article) => article.id);
  const bindingRows = await db
    .select()
    .from(articleTopicBindings)
    .where(inArray(articleTopicBindings.articleId, articleIds));

  const topicIdsByArticleId = new Map<string, string[]>();

  for (const binding of bindingRows) {
    const current = topicIdsByArticleId.get(binding.articleId) ?? [];
    current.push(binding.topicId);
    topicIdsByArticleId.set(binding.articleId, current);
  }

  const publishedAuditEntries: Array<{
    before: typeof articles.$inferSelect;
    after: typeof articles.$inferSelect;
  }> = [];
  const published: InternalPublishedArticleResult[] = [];
  const skipped: InternalSkippedArticleResult[] = [];

  await db.transaction(async (tx) => {
    for (const article of dueArticles) {
      const topicIds = topicIdsByArticleId.get(article.id) ?? [];
      const issues = getPublishableArticleIssues(article, topicIds);

      if (issues.length > 0) {
        skipped.push({
          id: article.id,
          slug: article.slug,
          title: article.title,
          scheduledAt: asIso(article.scheduledAt),
          issues
        });
        continue;
      }

      const [updatedArticle] = await tx
        .update(articles)
        .set({
          status: "published",
          publishedAt: article.publishedAt ?? processedAt,
          updatedAt: processedAt
        })
        .where(eq(articles.id, article.id))
        .returning();

      if (!updatedArticle) {
        continue;
      }

      publishedAuditEntries.push({
        before: article,
        after: updatedArticle
      });

      published.push({
        id: updatedArticle.id,
        slug: updatedArticle.slug,
        title: updatedArticle.title,
        scheduledAt: asIso(updatedArticle.scheduledAt),
        publishedAt: asIso(updatedArticle.publishedAt)
      });
    }
  });

  for (const entry of publishedAuditEntries) {
    await writeAuditLog(actor, {
      action: "article.publish_scheduled",
      targetType: "article",
      targetId: entry.after.id,
      before: {
        id: entry.before.id,
        slug: entry.before.slug,
        title: entry.before.title,
        status: entry.before.status,
        scheduledAt: asIso(entry.before.scheduledAt),
        publishedAt: asIso(entry.before.publishedAt)
      },
      after: {
        id: entry.after.id,
        slug: entry.after.slug,
        title: entry.after.title,
        status: entry.after.status,
        scheduledAt: asIso(entry.after.scheduledAt),
        publishedAt: asIso(entry.after.publishedAt)
      }
    });
  }

  return {
    processedAt: processedAt.toISOString(),
    totalDue: dueArticles.length,
    totalPublished: published.length,
    totalSkipped: skipped.length,
    published,
    skipped
  };
};
