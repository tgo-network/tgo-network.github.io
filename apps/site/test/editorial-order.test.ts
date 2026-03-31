import assert from "node:assert/strict";
import test from "node:test";

import type { PublicArticleSummaryV2 } from "@tgo/shared";

import { isGeneratedEditorialArticle, listPublicEditorialArticles } from "../src/lib/editorial-order.js";

const createArticle = (overrides: Partial<PublicArticleSummaryV2>): PublicArticleSummaryV2 => ({
  slug: "article-a",
  title: "示例文章",
  excerpt: "这是一篇中文社区文章。",
  publishedAt: "2026-03-20T08:00:00.000Z",
  authorName: "张三",
  coverImage: null,
  branch: null,
  ...overrides
});

test("marks generated verification articles as non-editorial content", () => {
  assert.equal(
    isGeneratedEditorialArticle(
      createArticle({
        slug: "auto-article-1774671754",
        title: "Auto Article 1774671754",
        excerpt: "Automated verification article for admin write endpoints.",
        authorName: "Avery Chen"
      })
    ),
    true
  );
});

test("keeps public editorial articles in reverse chronological order after filtering generated entries", () => {
  const result = listPublicEditorialArticles([
    createArticle({
      slug: "auto-article-1774671754",
      title: "Auto Article 1774671754",
      excerpt: "Automated verification article for admin write endpoints.",
      authorName: "Avery Chen",
      publishedAt: "2026-03-28T08:00:00.000Z"
    }),
    createArticle({
      slug: "what-a-city-hub-needs",
      title: "一座城市主页在真正活起来之前需要什么",
      publishedAt: "2026-03-24T08:00:00.000Z"
    }),
    createArticle({
      slug: "from-events-to-knowledge",
      title: "把活动热度转化为可检索的知识资产",
      publishedAt: "2026-03-18T08:00:00.000Z"
    })
  ]);

  assert.deepEqual(
    result.map((article) => article.slug),
    ["what-a-city-hub-needs", "from-events-to-knowledge"]
  );
});
