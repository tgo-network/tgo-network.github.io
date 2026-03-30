import { pathToFileURL } from "node:url";

import { inArray, like, or } from "drizzle-orm";

import { createDb } from "./client.js";
import { events } from "./schema/index.js";

const demoEventSlugs = [
  "beijing-strategy-forum",
  "city-chapter-kickoff",
  "content-ops-roundtable",
  "hangzhou-engineering-workshop",
  "shanghai-ai-leadership-salon",
  "spring-platform-workshop"
] as const;

export interface CleanupDemoEventsResult {
  deletedCount: number;
  deletedSlugs: string[];
}

export const cleanupDemoEvents = async (databaseUrl: string): Promise<CleanupDemoEventsResult> => {
  const { db, pool } = createDb(databaseUrl);

  try {
    const demoRows = await db
      .select({
        id: events.id,
        slug: events.slug
      })
      .from(events)
      .where(or(inArray(events.slug, [...demoEventSlugs]), like(events.slug, "auto-event-%")));

    if (demoRows.length === 0) {
      return {
        deletedCount: 0,
        deletedSlugs: []
      };
    }

    await db.delete(events).where(inArray(events.id, demoRows.map((row) => row.id)));

    return {
      deletedCount: demoRows.length,
      deletedSlugs: demoRows.map((row) => row.slug).sort()
    };
  } finally {
    await pool.end();
  }
};

const main = async () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to clean demo events.");
  }

  const result = await cleanupDemoEvents(databaseUrl);

  console.log(JSON.stringify(result, null, 2));
};

const isMainModule = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
