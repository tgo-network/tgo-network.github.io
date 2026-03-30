import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { inArray, sql } from "drizzle-orm";

import { createDb } from "./client.js";
import {
  assets,
  branchBoardMembers,
  branches,
  eventSessions,
  events
} from "./schema/index.js";

interface ImportedImageRef {
  sourceUrl: string | null;
  localPath: string | null;
}

interface ImportedBranchBoardMember {
  sourceUserId: number;
  displayName: string;
  company: string;
  organizationRole: string;
  jobTitle: string;
  bio: string;
  avatar: ImportedImageRef | null;
  sortOrder: number;
}

interface ImportedBranch {
  sourceBranchId: number;
  slug: string;
  name: string;
  cityName: string;
  region: string;
  summary: string;
  body: string;
  coverImage: ImportedImageRef | null;
  boardMemberCount: number;
  boardMembers: ImportedBranchBoardMember[];
}

interface ImportedAgendaItem {
  time: string;
  title: string;
  speaker: string;
  summary: string;
}

interface ImportedEvent {
  sourceEventId: number;
  slug: string;
  title: string;
  summary: string;
  body: string;
  startsAt: string | null;
  endsAt: string | null;
  cityName: string;
  venueName: string;
  venueAddress: string;
  branchSlugs: string[];
  primaryBranchSlug: string | null;
  registrationState: "not_open" | "open" | "waitlist" | "closed";
  registrationUrl: string | null;
  coverImage: ImportedImageRef | null;
  agenda: ImportedAgendaItem[];
}

interface BranchImportPayload {
  generatedAt: string;
  count: number;
  branches: ImportedBranch[];
}

interface EventImportPayload {
  generatedAt: string;
  count: number;
  events: ImportedEvent[];
}

const repoRoot = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const branchesImportPath = path.join(repoRoot, "data", "imports", "tgo-infoq", "branches.json");
const eventsImportPath = path.join(repoRoot, "data", "imports", "tgo-infoq", "events.json");
const sitePublicRoot = path.join(repoRoot, "apps", "site", "public");

const mimeTypeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml"
};

const readJson = async <T>(filePath: string): Promise<T> => {
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
};

const toObjectKey = (image: ImportedImageRef | null) => {
  const localPath = image?.localPath?.trim();

  if (!localPath) {
    return null;
  }

  if (localPath.startsWith("/imports/")) {
    return localPath.slice(1);
  }

  if (localPath.startsWith("imports/")) {
    return localPath;
  }

  if (localPath.startsWith("/tgo-infoq/")) {
    return `imports${localPath}`;
  }

  if (localPath.startsWith("tgo-infoq/")) {
    return `imports/${localPath}`;
  }

  return null;
};

const toLocalFilePath = (objectKey: string) => path.join(sitePublicRoot, objectKey);

const getMimeType = (objectKey: string) => mimeTypeByExtension[path.extname(objectKey).toLowerCase()] ?? "application/octet-stream";

const ensureImportedAssets = async (
  databaseUrl: string,
  importedBranches: ImportedBranch[],
  importedEvents: ImportedEvent[]
) => {
  const objectKeys = Array.from(
    new Set(
      [
        ...importedBranches.flatMap((branch) => [
          toObjectKey(branch.coverImage),
          ...branch.boardMembers.map((member) => toObjectKey(member.avatar))
        ]),
        ...importedEvents.map((event) => toObjectKey(event.coverImage))
      ].filter((value): value is string => Boolean(value))
    )
  );

  if (objectKeys.length === 0) {
    return new Map<string, string>();
  }

  const { db, pool } = createDb(databaseUrl);

  try {
    const values = [] as Array<typeof assets.$inferInsert>;

    for (const objectKey of objectKeys) {
      const filePath = toLocalFilePath(objectKey);
      let byteSize = 0;

      try {
        const fileStat = await stat(filePath);
        byteSize = Number(fileStat.size);
      } catch {
        byteSize = 0;
      }

      values.push({
        storageProvider: "local-import",
        bucket: "site-public",
        objectKey,
        visibility: "public",
        assetType: "image",
        mimeType: getMimeType(objectKey),
        byteSize,
        originalFilename: path.basename(objectKey),
        altText: path.basename(objectKey),
        status: "active"
      });
    }

    await db
      .insert(assets)
      .values(values)
      .onConflictDoUpdate({
        target: assets.objectKey,
        set: {
          storageProvider: sql`excluded.storage_provider`,
          bucket: sql`excluded.bucket`,
          visibility: sql`excluded.visibility`,
          assetType: sql`excluded.asset_type`,
          mimeType: sql`excluded.mime_type`,
          byteSize: sql`excluded.byte_size`,
          originalFilename: sql`excluded.original_filename`,
          altText: sql`excluded.alt_text`,
          status: sql`excluded.status`,
          updatedAt: new Date()
        }
      });

    const assetRows = await db.select({ id: assets.id, objectKey: assets.objectKey }).from(assets).where(inArray(assets.objectKey, objectKeys));
    return new Map(assetRows.map((row) => [row.objectKey, row.id]));
  } finally {
    await pool.end();
  }
};

const main = async () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("导入 TGO 数据前必须配置 DATABASE_URL。");
  }

  const [branchImport, eventImport] = await Promise.all([
    readJson<BranchImportPayload>(branchesImportPath),
    readJson<EventImportPayload>(eventsImportPath)
  ]);

  const assetIdByObjectKey = await ensureImportedAssets(databaseUrl, branchImport.branches, eventImport.events);

  const { db, pool } = createDb(databaseUrl);

  try {
    const branchSlugByCityName = new Map(branchImport.branches.map((branch) => [branch.cityName, branch.slug]));
    const branchValues: Array<typeof branches.$inferInsert> = branchImport.branches.map((branch, index) => ({
      slug: branch.slug,
      name: branch.name,
      cityName: branch.cityName,
      region: branch.region,
      summary: branch.summary,
      bodyRichtext: branch.body,
      status: "published",
      coverAssetId: assetIdByObjectKey.get(toObjectKey(branch.coverImage) ?? "") ?? null,
      seoTitle: branch.name,
      seoDescription: branch.summary,
      sortOrder: index,
      publishedAt: branchImport.generatedAt ? new Date(branchImport.generatedAt) : new Date()
    }));

    await db
      .insert(branches)
      .values(branchValues)
      .onConflictDoUpdate({
        target: branches.slug,
        set: {
          name: sql`excluded.name`,
          cityName: sql`excluded.city_name`,
          region: sql`excluded.region`,
          summary: sql`excluded.summary`,
          bodyRichtext: sql`excluded.body_richtext`,
          status: sql`excluded.status`,
          coverAssetId: sql`excluded.cover_asset_id`,
          seoTitle: sql`excluded.seo_title`,
          seoDescription: sql`excluded.seo_description`,
          sortOrder: sql`excluded.sort_order`,
          publishedAt: sql`excluded.published_at`,
          updatedAt: new Date()
        }
      });

    const branchRows = await db.select({ id: branches.id, slug: branches.slug }).from(branches).where(inArray(branches.slug, branchImport.branches.map((branch) => branch.slug)));
    const branchIdBySlug = new Map(branchRows.map((row) => [row.slug, row.id]));

    const importedBranchIds = Array.from(branchIdBySlug.values());
    if (importedBranchIds.length > 0) {
      await db.delete(branchBoardMembers).where(inArray(branchBoardMembers.branchId, importedBranchIds));
    }

    const boardRows: Array<typeof branchBoardMembers.$inferInsert> = branchImport.branches.flatMap((branch) => {
      const branchId = branchIdBySlug.get(branch.slug);
      if (!branchId) {
        return [];
      }

      return branch.boardMembers.map((member) => ({
        branchId,
        memberId: null,
        displayName: member.displayName,
        company: member.company,
        title: member.organizationRole,
        bio: member.bio,
        avatarAssetId: assetIdByObjectKey.get(toObjectKey(member.avatar) ?? "") ?? null,
        sortOrder: member.sortOrder,
        status: "published"
      }));
    });

    if (boardRows.length > 0) {
      await db.insert(branchBoardMembers).values(boardRows);
    }

    const eventValues: Array<typeof events.$inferInsert> = eventImport.events.map((event) => {
      const resolvedPrimaryBranchSlug = event.primaryBranchSlug ?? branchSlugByCityName.get(event.cityName) ?? null;

      return {
        slug: event.slug,
        title: event.title,
        summary: event.summary,
        bodyRichtext: event.body,
        status: "published",
        branchId: resolvedPrimaryBranchSlug ? branchIdBySlug.get(resolvedPrimaryBranchSlug) ?? null : null,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        startsAt: event.startsAt ? new Date(event.startsAt) : null,
        endsAt: event.endsAt ? new Date(event.endsAt) : null,
        timezone: "Asia/Shanghai",
        coverAssetId: assetIdByObjectKey.get(toObjectKey(event.coverImage) ?? "") ?? null,
        capacity: null,
        registrationState: event.registrationState,
        registrationUrl: event.registrationUrl,
        publishedAt: event.startsAt ? new Date(event.startsAt) : new Date()
      };
    });

    await db
      .insert(events)
      .values(eventValues)
      .onConflictDoUpdate({
        target: events.slug,
        set: {
          title: sql`excluded.title`,
          summary: sql`excluded.summary`,
          bodyRichtext: sql`excluded.body_richtext`,
          status: sql`excluded.status`,
          branchId: sql`excluded.branch_id`,
          venueName: sql`excluded.venue_name`,
          venueAddress: sql`excluded.venue_address`,
          startsAt: sql`excluded.starts_at`,
          endsAt: sql`excluded.ends_at`,
          timezone: sql`excluded.timezone`,
          coverAssetId: sql`excluded.cover_asset_id`,
          capacity: sql`excluded.capacity`,
          registrationState: sql`excluded.registration_state`,
          registrationUrl: sql`excluded.registration_url`,
          publishedAt: sql`excluded.published_at`,
          updatedAt: new Date()
        }
      });

    const eventRows = await db.select({ id: events.id, slug: events.slug }).from(events).where(inArray(events.slug, eventImport.events.map((event) => event.slug)));
    const eventIdBySlug = new Map(eventRows.map((row) => [row.slug, row.id]));

    const importedEventIds = Array.from(eventIdBySlug.values());
    if (importedEventIds.length > 0) {
      await db.delete(eventSessions).where(inArray(eventSessions.eventId, importedEventIds));
    }

    const sessionRows: Array<typeof eventSessions.$inferInsert> = eventImport.events.flatMap((event) => {
      const eventId = eventIdBySlug.get(event.slug);
      if (!eventId) {
        return [];
      }

      return event.agenda.map((item, index) => ({
        eventId,
        title: item.title || "议程",
        summary: item.summary || null,
        startsAt: null,
        endsAt: null,
        speakerName: item.speaker || null,
        sortOrder: index
      }));
    });

    if (sessionRows.length > 0) {
      await db.insert(eventSessions).values(sessionRows);
    }

    console.log(
      `[tgo-infoq] 已导入 ${branchImport.branches.length} 个分会、${boardRows.length} 位董事会成员、${eventImport.events.length} 条活动。`
    );
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error("[tgo-infoq] 导入失败", error);
  process.exitCode = 1;
});
