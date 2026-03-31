import type { PublicArticleSummaryV2 } from "@tgo/shared";

const hasChineseContent = (value: string) => /[\u3400-\u9fff]/u.test(value);

const looksGeneratedArticle = (article: PublicArticleSummaryV2) => {
  const combinedText = [article.title, article.excerpt, article.authorName].join(" ");

  return article.slug.startsWith("auto-article-") || !hasChineseContent(combinedText);
};

export const sortEditorialArticles = (articles: PublicArticleSummaryV2[]) =>
  [...articles].sort((left, right) => {
    const leftGenerated = looksGeneratedArticle(left);
    const rightGenerated = looksGeneratedArticle(right);

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
