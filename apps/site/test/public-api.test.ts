import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  articleSummaries,
  getArticleDetail,
  siteConfig
} from "@tgo/shared";

import {
  getArticle,
  getPublicApiBaseUrl,
  getSiteConfig,
  listArticles
} from "../src/lib/public-api.js";

const originalFetch = globalThis.fetch;
const originalApiBaseUrl = process.env.PUBLIC_API_BASE_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalApiBaseUrl === undefined) {
    delete process.env.PUBLIC_API_BASE_URL;
  } else {
    process.env.PUBLIC_API_BASE_URL = originalApiBaseUrl;
  }
});

test("uses the configured PUBLIC_API_BASE_URL when fetching public data", async () => {
  process.env.PUBLIC_API_BASE_URL = "http://example.test:9999";

  let requestedUrl = "";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requestedUrl = String(input);

    return new Response(
      JSON.stringify({
        data: articleSummaries
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      }
    );
  }) as typeof fetch;

  const result = await listArticles();

  assert.equal(getPublicApiBaseUrl(), "http://example.test:9999");
  assert.equal(requestedUrl, "http://example.test:9999/api/public/v1/articles");
  assert.deepEqual(result, articleSummaries);
});

test("falls back to shared site config when the API request fails", async () => {
  globalThis.fetch = (async () => {
    throw new Error("network unavailable");
  }) as typeof fetch;

  const result = await getSiteConfig();

  assert.deepEqual(result, siteConfig);
});

test("falls back to shared article detail when the API returns a non-ok response", async () => {
  globalThis.fetch = (async () =>
    new Response("not found", {
      status: 404
    })) as typeof fetch;

  const result = await getArticle("shipping-an-editorial-platform");

  assert.deepEqual(result, getArticleDetail("shipping-an-editorial-platform"));
});
