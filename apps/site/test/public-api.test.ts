import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  getPublicArticleDetailV2,
  joinPagePayload,
  memberSummaries,
  publicArticleSummariesV2,
  publicEventSummariesV2,
  publicHomePayloadV2,
  siteConfig
} from "@tgo/shared";

import {
  getArticle,
  getEvent,
  getHomePayload,
  getJoinPage,
  getPublicApiBaseUrl,
  getSiteConfig,
  listBranches,
  listEventPage,
  listArticles,
  listMembers
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
        data: publicArticleSummariesV2
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
  assert.deepEqual(result, publicArticleSummariesV2);
});

test("reads the converged home payload from the configured public API base URL", async () => {
  process.env.PUBLIC_API_BASE_URL = "http://example.test:9999";

  let requestedUrl = "";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requestedUrl = String(input);

    return new Response(
      JSON.stringify({
        data: publicHomePayloadV2
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      }
    );
  }) as typeof fetch;

  const result = await getHomePayload();

  assert.equal(requestedUrl, "http://example.test:9999/api/public/v1/home");
  assert.deepEqual(result, publicHomePayloadV2);
});

test("falls back to shared site config when the API request fails", async () => {
  globalThis.fetch = (async () => {
    throw new Error("network unavailable");
  }) as typeof fetch;

  const result = await getSiteConfig();

  assert.deepEqual(result, siteConfig);
});

test("falls back to shared join page content when the API request fails", async () => {
  globalThis.fetch = (async () => {
    throw new Error("network unavailable");
  }) as typeof fetch;

  const result = await getJoinPage();

  assert.deepEqual(result, joinPagePayload);
});

test("falls back to imported branch records when the API request fails", async () => {
  globalThis.fetch = (async () => {
    throw new Error("network unavailable");
  }) as typeof fetch;

  const result = await listBranches();

  assert.equal(result.length, 12);
  assert.equal(result.find((branch) => branch.slug === "guangzhou")?.name, "广州分会");
  assert.equal(result.find((branch) => branch.slug === "guangzhou")?.boardMembers[0]?.displayName, "杨韶伟");
});

test("resolves imported branch and event images to public production-safe URLs", async () => {
  globalThis.fetch = (async () => {
    throw new Error("network unavailable");
  }) as typeof fetch;

  const [branches, event] = await Promise.all([listBranches(), getEvent("event-1")]);
  const beijing = branches.find((branch) => branch.slug === "beijing");

  assert.equal(beijing?.coverImage?.url, "/mirrors/tgo-infoq/branches/banners/beijing.webp");
  assert.equal(beijing?.boardMembers[0]?.avatar?.url, "/mirrors/tgo-infoq/branches/members/beijing/1171.webp");
  assert.equal(event?.coverImage?.url, "/mirrors/tgo-infoq/events/covers/1.webp");
});

test("falls back to imported member summaries when the API returns a non-ok response", async () => {
  globalThis.fetch = (async () =>
    new Response("unavailable", {
      status: 503
    })) as typeof fetch;

  const result = await listMembers();

  assert.equal(result.length, 1215);
  assert.equal(result[0]?.slug, "member-1");
  assert.equal(result[1]?.name, "郭理靖");
  assert.ok(result.length > memberSummaries.length);
});

test("falls back to shared article detail when the API returns a non-ok response", async () => {
  globalThis.fetch = (async () =>
    new Response("not found", {
      status: 404
    })) as typeof fetch;

  const result = await getArticle("shipping-an-editorial-platform");

  assert.deepEqual(result, getPublicArticleDetailV2("shipping-an-editorial-platform"));
});

test("reads paginated event data and meta from the configured public API base URL", async () => {
  process.env.PUBLIC_API_BASE_URL = "http://example.test:9999";

  let requestedUrl = "";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requestedUrl = String(input);

    return new Response(
      JSON.stringify({
        data: [publicEventSummariesV2[0]],
        meta: {
          total: 10,
          page: 2,
          pageSize: 1,
          pageCount: 10,
          cityOptions: ["上海", "北京"],
          registrationStateCounts: {
            open: 1,
            waitlist: 0,
            closed: 9,
            notOpen: 0
          }
        }
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      }
    );
  }) as typeof fetch;

  const result = await listEventPage({ page: 2, pageSize: 1, city: "上海" });

  assert.equal(requestedUrl, "http://example.test:9999/api/public/v1/events?page=2&pageSize=1&city=%E4%B8%8A%E6%B5%B7");
  assert.deepEqual(result.items, [publicEventSummariesV2[0]]);
  assert.deepEqual(result.meta.cityOptions, ["上海", "北京"]);
  assert.equal(result.meta.page, 2);
  assert.equal(result.meta.total, 10);
});

test("falls back to imported paginated event data when the API request fails", async () => {
  globalThis.fetch = (async () => {
    throw new Error("network unavailable");
  }) as typeof fetch;

  const result = await listEventPage({ page: 1, pageSize: 1, city: "北京" });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.slug, "event-1816");
  assert.ok(result.meta.total > 1);
  assert.equal(result.meta.page, 1);
  assert.ok(result.meta.pageCount > 1);
  assert.deepEqual(result.meta.cityOptions, ["北京"]);
});
