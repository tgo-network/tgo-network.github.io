import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { inArray, sql } from "drizzle-orm";

import { memberDetails, platformName } from "@tgo/shared";

import { createDb } from "./client.js";
import { branches, members } from "./schema/index.js";

interface ImportedMember {
  sourceRow: number;
  memberNumber: string;
  slug: string;
  name: string;
  cityName: string;
  branchSlug: string | null;
  company: string;
  title: string;
  membershipType: string;
  joinedAt: string | null;
  membershipExpiresAt: string | null;
  bio: string;
}

interface MemberImportPayload {
  generatedAt: string;
  source: string;
  sheetName: string;
  count: number;
  members: ImportedMember[];
}

const repoRoot = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const importPath = path.join(repoRoot, "data", "imports", "tgo-members", "members.json");
const demoMemberSlugs = memberDetails.map((member) => member.slug);

const readJson = async <T>(filePath: string): Promise<T> => {
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
};

const pickFeaturedSlugs = (items: ImportedMember[]) => {
  const featured = [] as string[];
  const usedCities = new Set<string>();

  for (const item of items) {
    const cityName = item.cityName.trim();
    const hasRichProfile = item.company !== "暂未公开" || item.title !== "成员";

    if (!hasRichProfile || !cityName || usedCities.has(cityName)) {
      continue;
    }

    featured.push(item.slug);
    usedCities.add(cityName);

    if (featured.length >= 3) {
      return new Set(featured);
    }
  }

  for (const item of items) {
    if (featured.includes(item.slug)) {
      continue;
    }

    featured.push(item.slug);
    if (featured.length >= 3) {
      break;
    }
  }

  return new Set(featured);
};

const main = async () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("导入成员数据前必须配置 DATABASE_URL。");
  }

  const payload = await readJson<MemberImportPayload>(importPath);
  const featuredSlugs = pickFeaturedSlugs(payload.members);
  const { db, pool } = createDb(databaseUrl);

  try {
    if (demoMemberSlugs.length > 0) {
      await db.delete(members).where(inArray(members.slug, demoMemberSlugs));
    }

    const branchRows = await db.select({ id: branches.id, slug: branches.slug, cityName: branches.cityName }).from(branches);
    const branchIdBySlug = new Map(branchRows.map((row) => [row.slug, row.id]));
    const branchIdByCityName = new Map(branchRows.map((row) => [row.cityName, row.id]));

    const values: Array<typeof members.$inferInsert> = payload.members.map((member, index) => {
      const branchId = member.branchSlug
        ? branchIdBySlug.get(member.branchSlug) ?? branchIdByCityName.get(member.cityName) ?? null
        : branchIdByCityName.get(member.cityName) ?? null;

      return {
        slug: member.slug,
        name: member.name,
        company: member.company,
        title: member.title,
        bio: member.bio,
        joinedAt: member.joinedAt ? new Date(`${member.joinedAt}T00:00:00Z`) : null,
        branchId,
        featured: featuredSlugs.has(member.slug),
        membershipStatus: "active",
        visibility: "public",
        sortOrder: index,
        seoTitle: `${member.name} | ${platformName}`,
        seoDescription: `${member.company} · ${member.title}`
      };
    });

    await db
      .insert(members)
      .values(values)
      .onConflictDoUpdate({
        target: members.slug,
        set: {
          name: sql`excluded.name`,
          company: sql`excluded.company`,
          title: sql`excluded.title`,
          bio: sql`excluded.bio`,
          joinedAt: sql`excluded.joined_at`,
          branchId: sql`excluded.branch_id`,
          featured: sql`excluded.featured`,
          membershipStatus: sql`excluded.membership_status`,
          visibility: sql`excluded.visibility`,
          sortOrder: sql`excluded.sort_order`,
          seoTitle: sql`excluded.seo_title`,
          seoDescription: sql`excluded.seo_description`,
          updatedAt: new Date()
        }
      });

    console.log(
      `[members] 已导入 ${payload.members.length} 位成员（来源：${payload.source} / ${payload.sheetName}），其中 ${featuredSlugs.size} 位成员已设为首页推荐。`
    );
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error("[members] 导入失败", error);
  process.exitCode = 1;
});
