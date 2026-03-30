import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { desc, eq, inArray } from "drizzle-orm";
import { publicHomePayloadV2 } from "@tgo/shared";

import { createDb } from "./client.js";
import { articles, branches, events, homepageSections } from "./schema/index.js";

interface BranchImportPayload {
  count: number;
  branches: Array<{
    slug: string;
    boardMemberCount: number;
  }>;
}

interface EventImportPayload {
  count: number;
  events: Array<{
    slug: string;
  }>;
}

const repoRoot = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const branchesImportPath = path.join(repoRoot, "data", "imports", "tgo-infoq", "branches.json");
const eventsImportPath = path.join(repoRoot, "data", "imports", "tgo-infoq", "events.json");

const readJson = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await readFile(filePath, "utf-8")) as T;

export interface SyncTgoInfoqHomepageResult {
  featuredArticleCount: number;
  featuredEventCount: number;
  branchHighlightCount: number;
  metrics: Array<{
    label: string;
    value: string;
    description: string;
  }>;
}

export const syncTgoInfoqHomepage = async (databaseUrl: string): Promise<SyncTgoInfoqHomepageResult> => {
  const [branchImport, eventImport] = await Promise.all([
    readJson<BranchImportPayload>(branchesImportPath),
    readJson<EventImportPayload>(eventsImportPath)
  ]);

  const { db, pool } = createDb(databaseUrl);

  try {
    const [homepage, articleRows, branchRows, eventRows] = await Promise.all([
      db.query.homepageSections.findFirst({
        where: eq(homepageSections.code, "home")
      }),
      db
        .select({
          id: articles.id
        })
        .from(articles)
        .where(eq(articles.status, "published"))
        .orderBy(desc(articles.publishedAt), desc(articles.updatedAt)),
      db
        .select({
          id: branches.id,
          slug: branches.slug,
          sortOrder: branches.sortOrder
        })
        .from(branches)
        .where(inArray(branches.slug, branchImport.branches.map((branch) => branch.slug))),
      db
        .select({
          id: events.id,
          slug: events.slug,
          startsAt: events.startsAt,
          updatedAt: events.updatedAt
        })
        .from(events)
        .where(inArray(events.slug, eventImport.events.map((event) => event.slug)))
        .orderBy(desc(events.startsAt), desc(events.updatedAt))
    ]);

    const payload = ((homepage?.payloadJson as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
    const featuredArticleIds = Array.isArray(payload.featuredArticleIds)
      ? payload.featuredArticleIds.filter((item): item is string => typeof item === "string")
      : [];
    const validFeaturedArticleIds = featuredArticleIds.filter((id) => articleRows.some((article) => article.id === id));
    const nextFeaturedArticleIds =
      validFeaturedArticleIds.length > 0 ? validFeaturedArticleIds : articleRows.slice(0, 3).map((article) => article.id);

    const branchIdBySlug = new Map(branchRows.map((branch) => [branch.slug, branch.id]));
    const branchHighlightIds = branchImport.branches
      .map((branch) => branchIdBySlug.get(branch.slug))
      .filter((value): value is string => Boolean(value))
      .slice(0, 3);

    const featuredEventIds = eventRows.slice(0, 3).map((event) => event.id);
    const boardMemberCount = branchImport.branches.reduce((sum, branch) => sum + branch.boardMemberCount, 0);
    const metrics = [
      {
        label: "分会网络",
        value: `${branchImport.count} 个`,
        description: "覆盖已导入的公开分会与董事会展示。"
      },
      {
        label: "董事会成员",
        value: `${boardMemberCount} 位`,
        description: "来自目标站公开页面的董事会成员资料。"
      },
      {
        label: "历史活动",
        value: `${eventImport.count} 场`,
        description: "已导入官方活动数据，可继续通过后台维护。"
      }
    ];

    const nextPayload = {
      heroEyebrow: typeof payload.heroEyebrow === "string" ? payload.heroEyebrow : publicHomePayloadV2.hero.eyebrow,
      heroTitle: typeof payload.heroTitle === "string" ? payload.heroTitle : publicHomePayloadV2.hero.title,
      heroSummary: typeof payload.heroSummary === "string" ? payload.heroSummary : publicHomePayloadV2.hero.summary,
      primaryActionLabel:
        typeof payload.primaryActionLabel === "string"
          ? payload.primaryActionLabel
          : publicHomePayloadV2.hero.actions[0]?.label ?? "了解加入方式",
      primaryActionHref:
        typeof payload.primaryActionHref === "string"
          ? payload.primaryActionHref
          : publicHomePayloadV2.hero.actions[0]?.href ?? "/join",
      secondaryActionLabel:
        typeof payload.secondaryActionLabel === "string"
          ? payload.secondaryActionLabel
          : publicHomePayloadV2.hero.actions[1]?.label ?? "查看近期活动",
      secondaryActionHref:
        typeof payload.secondaryActionHref === "string"
          ? payload.secondaryActionHref
          : publicHomePayloadV2.hero.actions[1]?.href ?? "/events",
      introTitle: typeof payload.introTitle === "string" ? payload.introTitle : publicHomePayloadV2.intro.title,
      introSummary:
        typeof payload.introSummary === "string" ? payload.introSummary : publicHomePayloadV2.intro.summary,
      audienceTitle:
        typeof payload.audienceTitle === "string" ? payload.audienceTitle : publicHomePayloadV2.audience.title,
      audienceItems: Array.isArray(payload.audienceItems) ? payload.audienceItems : publicHomePayloadV2.audience.items,
      metrics,
      featuredArticleIds: nextFeaturedArticleIds,
      featuredEventIds,
      branchHighlightIds,
      joinTitle: typeof payload.joinTitle === "string" ? payload.joinTitle : publicHomePayloadV2.joinCallout.title,
      joinSummary:
        typeof payload.joinSummary === "string" ? payload.joinSummary : publicHomePayloadV2.joinCallout.summary,
      joinHref: typeof payload.joinHref === "string" ? payload.joinHref : publicHomePayloadV2.joinCallout.href
    };

    if (homepage) {
      await db
        .update(homepageSections)
        .set({
          payloadJson: nextPayload,
          status: "published",
          updatedAt: new Date()
        })
        .where(eq(homepageSections.id, homepage.id));
    } else {
      await db.insert(homepageSections).values({
        code: "home",
        payloadJson: nextPayload,
        status: "published"
      });
    }

    return {
      featuredArticleCount: nextFeaturedArticleIds.length,
      featuredEventCount: featuredEventIds.length,
      branchHighlightCount: branchHighlightIds.length,
      metrics
    };
  } finally {
    await pool.end();
  }
};

const main = async () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to sync the homepage.");
  }

  const result = await syncTgoInfoqHomepage(databaseUrl);

  console.log(JSON.stringify(result, null, 2));
};

const isMainModule = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
