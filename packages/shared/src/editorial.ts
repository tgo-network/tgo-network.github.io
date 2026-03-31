import type { PublicArticleSummaryV2 } from "./network-public.js";

export const transientPublicArticleSlugPrefixes = [
  "auto-article-",
  "patch-article-",
  "content-editor-article-",
  "article-without-legacy-bindings-",
  "draft-hidden-",
  "scheduled-valid-",
  "scheduled-invalid-",
  "scheduled-smoke-"
] as const;

export const isTransientPublicArticleSlug = (slug: string) =>
  transientPublicArticleSlugPrefixes.some((prefix) => slug.startsWith(prefix));

export const isVisiblePublicArticleSummary = (
  article: Pick<PublicArticleSummaryV2, "slug">
) => !isTransientPublicArticleSlug(article.slug);

export const filterVisiblePublicArticleSummaries = <T extends Pick<PublicArticleSummaryV2, "slug">>(articles: T[]) =>
  articles.filter((article) => isVisiblePublicArticleSummary(article));
