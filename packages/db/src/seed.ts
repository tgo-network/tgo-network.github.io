import { pathToFileURL } from "node:url";

import { count, eq } from "drizzle-orm";

import {
  articleDetails,
  cityDetails,
  eventDetails,
  platformName,
  topicDetails
} from "@tgo/shared";

import { createDb, type Database } from "./client.js";
import {
  applications,
  articleTopicBindings,
  articles,
  authors,
  cities,
  cityTopicBindings,
  eventSessions,
  eventTopicBindings,
  events,
  permissions,
  rolePermissionBindings,
  roles,
  siteSettings,
  topics
} from "./schema/index.js";

const permissionSeed = [
  ["dashboard.read", "仪表盘读取", "dashboard", "read"],
  ["article.read", "文章读取", "article", "read"],
  ["article.write", "文章编辑", "article", "write"],
  ["article.publish", "文章发布", "article", "publish"],
  ["topic.manage", "主题管理", "topic", "manage"],
  ["event.manage", "活动管理", "event", "manage"],
  ["registration.read", "报名读取", "registration", "read"],
  ["application.review", "申请审核", "application", "review"],
  ["asset.manage", "资源管理", "asset", "manage"],
  ["featured_block.manage", "推荐位管理", "featured_block", "manage"],
  ["settings.manage", "设置管理", "settings", "manage"],
  ["audit_log.read", "审计日志读取", "audit_log", "read"],
  ["staff.manage", "员工管理", "staff", "manage"],
  ["role.manage", "角色管理", "role", "manage"]
] as const;

const roleSeed = [
  ["super_admin", "超级管理员", "拥有全部后台权限"],
  ["content_editor", "内容编辑", "管理文章、主题与推荐位"],
  ["event_manager", "活动经理", "管理活动与报名审核"],
  ["reviewer", "审核员", "审核新提交的申请"],
  ["media_manager", "资源管理员", "管理已上传资源"]
] as const;

const rolePermissions: Record<string, string[]> = {
  super_admin: permissionSeed.map(([code]) => code),
  content_editor: [
    "dashboard.read",
    "article.read",
    "article.write",
    "article.publish",
    "topic.manage",
    "asset.manage",
    "featured_block.manage"
  ],
  event_manager: [
    "dashboard.read",
    "event.manage",
    "registration.read",
    "asset.manage"
  ],
  reviewer: ["dashboard.read", "application.review", "article.read"],
  media_manager: ["dashboard.read", "asset.manage"]
};

const demoApplications = [
  {
    type: "trial" as const,
    name: "林桥",
    email: "lin.qiao@example.com",
    company: "北岸工作室",
    citySlug: "shanghai",
    message: "我希望加入下一批运营伙伴计划，并一起打磨首发阶段的执行手册。",
    status: "submitted" as const
  },
  {
    type: "membership" as const,
    name: "徐米娜",
    email: "mina.xu@example.com",
    company: "湖屋实验室",
    citySlug: "hangzhou",
    message: "我们的团队希望为这个网络提供可持续复用的活动形式和内容素材。",
    status: "in_review" as const
  },
  {
    type: "contact" as const,
    name: "张博",
    email: "bo.zhang@example.com",
    company: "东园论坛",
    citySlug: "beijing",
    message: "我们正在为城市启动系列活动评估场地与社群合作机会。",
    status: "contacted" as const
  }
];

export interface SeedDatabaseResult {
  seededRoles: number;
  seededPermissions: number;
  seededCities: number;
  seededTopics: number;
  seededArticles: number;
  seededEvents: number;
  seededApplications: number;
  superAdminRoleId: string | null;
}

export const seedDatabase = async (db: Database): Promise<SeedDatabaseResult> => {
  await db
    .insert(permissions)
    .values(
      permissionSeed.map(([code, name, resource, action]) => ({
        code,
        name,
        resource,
        action
      }))
    )
    .onConflictDoNothing();

  await db
    .insert(roles)
    .values(
      roleSeed.map(([code, name, description]) => ({
        code,
        name,
        description,
        isSystem: true
      }))
    )
    .onConflictDoNothing();

  const roleRows = await db.select().from(roles);
  const permissionRows = await db.select().from(permissions);

  const roleIdByCode = new Map(roleRows.map((row) => [row.code, row.id]));
  const permissionIdByCode = new Map(permissionRows.map((row) => [row.code, row.id]));

  const bindings = Object.entries(rolePermissions).flatMap(([roleCode, codes]) => {
    const roleId = roleIdByCode.get(roleCode);

    if (!roleId) {
      return [];
    }

    return codes
      .map((code) => {
        const permissionId = permissionIdByCode.get(code);

        if (!permissionId) {
          return null;
        }

        return {
          roleId,
          permissionId
        };
      })
      .filter((value): value is { roleId: string; permissionId: string } => value !== null);
  });

  if (bindings.length > 0) {
    await db.insert(rolePermissionBindings).values(bindings).onConflictDoNothing();
  }

  await db
    .insert(cities)
    .values(
      cityDetails.map((city) => ({
        slug: city.slug,
        name: city.name,
        summary: city.summary,
        bodyRichtext: city.body,
        status: "published" as const,
        seoTitle: `${city.name} | ${platformName}`,
        seoDescription: city.summary
      }))
    )
    .onConflictDoNothing();

  await db
    .insert(topics)
    .values(
      topicDetails.map((topic) => ({
        slug: topic.slug,
        title: topic.title,
        summary: topic.summary,
        bodyRichtext: topic.body,
        status: "published" as const,
        seoTitle: `${topic.title} | ${platformName}`,
        seoDescription: topic.summary,
        publishedAt: new Date()
      }))
    )
    .onConflictDoNothing();

  const cityRows = await db.select().from(cities);
  const topicRows = await db.select().from(topics);
  const cityIdBySlug = new Map(cityRows.map((row) => [row.slug, row.id]));
  const topicIdBySlug = new Map(topicRows.map((row) => [row.slug, row.id]));

  const existingAuthors = await db.select().from(authors);
  const knownAuthorNames = new Set(existingAuthors.map((author) => author.displayName));
  const authorRoleByName = new Map(articleDetails.map((article) => [article.author.name, article.author.role]));
  const missingAuthors = Array.from(new Set(articleDetails.map((article) => article.author.name))).filter(
    (name) => !knownAuthorNames.has(name)
  );

  if (missingAuthors.length > 0) {
    await db
      .insert(authors)
      .values(
        missingAuthors.map((name) => ({
          displayName: name,
          bio: authorRoleByName.get(name) ?? "作者",
          status: "active"
        }))
      );
  }

  const authorRows = await db.select().from(authors);
  const authorIdByName = new Map(authorRows.map((row) => [row.displayName, row.id]));

  const existingArticles = await db.select({ slug: articles.slug }).from(articles);
  const knownArticleSlugs = new Set(existingArticles.map((article) => article.slug));
  const missingArticles = articleDetails.filter((article) => !knownArticleSlugs.has(article.slug));

  if (missingArticles.length > 0) {
    await db.insert(articles).values(
      missingArticles.map((article) => ({
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        bodyRichtext: article.body.join("\n\n"),
        status: "published" as const,
        authorId: authorIdByName.get(article.author.name) ?? null,
        primaryCityId: cityIdBySlug.get(article.citySummary.slug) ?? null,
        seoTitle: article.title,
        seoDescription: article.excerpt,
        publishedAt: new Date(article.publishedAt)
      }))
    );
  }

  const articleRows = await db.select().from(articles);
  const articleIdBySlug = new Map(articleRows.map((row) => [row.slug, row.id]));

  const articleTopicRows = articleDetails.flatMap((article) => {
    const articleId = articleIdBySlug.get(article.slug);

    if (!articleId) {
      return [];
    }

    return article.topics
      .map((topic) => {
        const topicId = topicIdBySlug.get(topic.slug);

        if (!topicId) {
          return null;
        }

        return {
          articleId,
          topicId
        };
      })
      .filter((value): value is { articleId: string; topicId: string } => value !== null);
  });

  if (articleTopicRows.length > 0) {
    await db.insert(articleTopicBindings).values(articleTopicRows).onConflictDoNothing();
  }

  const existingEvents = await db.select({ slug: events.slug }).from(events);
  const knownEventSlugs = new Set(existingEvents.map((event) => event.slug));
  const missingEvents = eventDetails.filter((event) => !knownEventSlugs.has(event.slug));

  if (missingEvents.length > 0) {
    await db.insert(events).values(
      missingEvents.map((event) => ({
        slug: event.slug,
        title: event.title,
        summary: event.summary,
        bodyRichtext: event.body,
        status: "published" as const,
        cityId: cityIdBySlug.get(event.city.slug) ?? null,
        venueName: event.venueName,
        startsAt: new Date(event.startsAt),
        endsAt: new Date(event.endsAt),
        registrationState: event.registrationState,
        publishedAt: new Date(event.startsAt)
      }))
    );
  }

  const eventRows = await db.select().from(events);
  const eventIdBySlug = new Map(eventRows.map((row) => [row.slug, row.id]));

  const eventSessionRows = eventDetails.flatMap((event) => {
    const eventId = eventIdBySlug.get(event.slug);

    if (!eventId) {
      return [];
    }

    return event.agenda.map((entry, index) => ({
      eventId,
      title: entry.title,
      summary: `${entry.title} · 主讲：${entry.speaker}`,
      speakerName: entry.speaker,
      sortOrder: index
    }));
  });

  if (eventSessionRows.length > 0) {
    await db.insert(eventSessions).values(eventSessionRows).onConflictDoNothing();
  }

  const eventTopicRows = eventDetails.flatMap((event) => {
    const eventId = eventIdBySlug.get(event.slug);

    if (!eventId) {
      return [];
    }

    return event.relatedTopics
      .map((topic) => {
        const topicId = topicIdBySlug.get(topic.slug);

        if (!topicId) {
          return null;
        }

        return {
          eventId,
          topicId
        };
      })
      .filter((value): value is { eventId: string; topicId: string } => value !== null);
  });

  if (eventTopicRows.length > 0) {
    await db.insert(eventTopicBindings).values(eventTopicRows).onConflictDoNothing();
  }

  const cityTopicRows = cityDetails.flatMap((city) => {
    const cityId = cityIdBySlug.get(city.slug);

    if (!cityId) {
      return [];
    }

    return city.featuredTopics
      .map((topic) => {
        const topicId = topicIdBySlug.get(topic.slug);

        if (!topicId) {
          return null;
        }

        return {
          cityId,
          topicId
        };
      })
      .filter((value): value is { cityId: string; topicId: string } => value !== null);
  });

  if (cityTopicRows.length > 0) {
    await db.insert(cityTopicBindings).values(cityTopicRows).onConflictDoNothing();
  }

  await db
    .insert(siteSettings)
    .values([
      {
        key: "site.name",
        valueJson: {
          value: platformName
        }
      },
      {
        key: "site.publicModules",
        valueJson: {
          topics: topicDetails.length,
          articles: articleDetails.length,
          events: eventDetails.length,
          cities: cityDetails.length
        }
      }
    ])
    .onConflictDoNothing();

  const [seededApplicationCount] = await db
    .select({ value: count() })
    .from(applications)
    .where(eq(applications.sourcePage, "seed://demo"));

  if ((seededApplicationCount?.value ?? 0) === 0) {
    await db.insert(applications).values(
      demoApplications.map((application) => ({
        type: application.type,
        name: application.name,
        email: application.email,
        company: application.company,
        cityId: cityIdBySlug.get(application.citySlug) ?? null,
        message: application.message,
        sourcePage: "seed://demo",
        status: application.status
      }))
    );
  }

  const [articleCountRow] = await db.select({ value: count() }).from(articles);
  const [eventCountRow] = await db.select({ value: count() }).from(events);
  const [applicationCountRow] = await db.select({ value: count() }).from(applications);
  const superAdmin = await db.query.roles.findFirst({
    where: eq(roles.code, "super_admin")
  });

  return {
    seededRoles: roleRows.length,
    seededPermissions: permissionRows.length,
    seededCities: cityRows.length,
    seededTopics: topicRows.length,
    seededArticles: articleCountRow?.value ?? 0,
    seededEvents: eventCountRow?.value ?? 0,
    seededApplications: applicationCountRow?.value ?? 0,
    superAdminRoleId: superAdmin?.id ?? null
  };
};

export const runSeed = async (databaseUrl: string) => {
  const { db, pool } = createDb(databaseUrl);

  try {
    return await seedDatabase(db);
  } finally {
    await pool.end();
  }
};

const main = async () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run the seed script.");
  }

  const result = await runSeed(databaseUrl);

  console.log(JSON.stringify(result, null, 2));
};

const isMainModule = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
