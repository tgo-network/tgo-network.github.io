import { isVisiblePublicArticleSummary, type PublicArticleSummaryV2 } from "@tgo/shared";

export const isGeneratedEditorialArticle = (article: PublicArticleSummaryV2) => !isVisiblePublicArticleSummary(article);

export const isPublicEditorialArticle = (article: PublicArticleSummaryV2) => !isGeneratedEditorialArticle(article);

export const sortEditorialArticles = (articles: PublicArticleSummaryV2[]) =>
  [...articles].sort((left, right) => {
    const leftGenerated = isGeneratedEditorialArticle(left);
    const rightGenerated = isGeneratedEditorialArticle(right);

    if (leftGenerated !== rightGenerated) {
      return leftGenerated ? 1 : -1;
    }

    const leftTime = Date.parse(left.publishedAt);
    const rightTime = Date.parse(right.publishedAt);

    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.title.localeCompare(right.title, "zh-CN");
  });

export const listPublicEditorialArticles = (articles: PublicArticleSummaryV2[]) =>
  sortEditorialArticles(articles).filter((article) => isPublicEditorialArticle(article));
