import { pathToFileURL } from "node:url";

import { count, eq, inArray, sql } from "drizzle-orm";

import {
  aboutPagePayload,
  articleDetails,
  branchDetails,
  cityDetails,
  joinPagePayload,
  memberDetails,
  platformName,
  publicEventDetailsV2,
  publicHomePayloadV2,
  topicDetails
} from "@tgo/shared";

import { createDb, type Database } from "./client.js";
import {
  applications,
  articleTopicBindings,
  articles,
  authors,
  branchBoardMembers,
  branches,
  cities,
  cityTopicBindings,
  eventSessions,
  eventTopicBindings,
  eventRegistrations,
  events,
  homepageSections,
  joinApplications,
  members,
  permissions,
  rolePermissionBindings,
  roles,
  sitePages,
  siteSettings,
  topics
} from "./schema/index.js";

const permissionSeed = [
  ["dashboard.read", "仪表盘读取", "dashboard", "read"],
  ["page.manage", "页面管理", "page", "manage"],
  ["article.read", "文章读取", "article", "read"],
  ["article.write", "文章编辑", "article", "write"],
  ["article.publish", "文章发布", "article", "publish"],
  ["branch.manage", "分会管理", "branch", "manage"],
  ["member.manage", "成员管理", "member", "manage"],
  ["event.manage", "活动管理", "event", "manage"],
  ["registration.review", "报名审核", "registration", "review"],
  ["application.review", "申请审核", "application", "review"],
  ["asset.manage", "资源管理", "asset", "manage"],
  ["staff.manage", "工作人员管理", "staff", "manage"],
  ["role.manage", "角色管理", "role", "manage"],
  ["audit_log.read", "审计日志读取", "audit_log", "read"]
] as const;

const retiredPermissionCodes = [
  "article.manage",
  "registration.read",
  "topic.manage",
  "featured_block.manage",
  "settings.manage"
] as const;

const roleSeed = [
  ["super_admin", "超级管理员", "拥有全部后台权限"],
  ["content_editor", "内容编辑", "管理首页与文章等公开内容"],
  ["event_manager", "活动经理", "管理活动与报名审核"],
  ["member_manager", "成员管理员", "管理分会、董事会与成员信息"],
  ["reviewer", "审核员", "审核加入申请"],
  ["auditor", "审计员", "查看审计日志与只读内容"],
  ["media_manager", "资源管理员", "管理已上传资源"]
] as const;

const rolePermissions: Record<string, string[]> = {
  super_admin: permissionSeed.map(([code]) => code),
  content_editor: [
    "dashboard.read",
    "page.manage",
    "article.read",
    "article.write",
    "article.publish",
    "asset.manage"
  ],
  event_manager: [
    "dashboard.read",
    "event.manage",
    "registration.review",
    "asset.manage"
  ],
  member_manager: [
    "dashboard.read",
    "branch.manage",
    "member.manage",
    "asset.manage"
  ],
  reviewer: ["dashboard.read", "application.review", "article.read"],
  auditor: ["dashboard.read", "article.read", "audit_log.read"],
  media_manager: ["dashboard.read", "asset.manage"]
};

const demoJoinApplications = [
  {
    name: "李昊然",
    phoneNumber: "13800000001",
    wechatId: "lihaoran-tech",
    email: "li.haoran@example.com",
    introduction: "负责企业级平台建设与研发组织管理，希望与更多技术领导者建立长期连接。",
    applicationMessage: "希望加入上海分会，参与技术领导者交流与专题活动。",
    targetBranchSlug: "shanghai",
    status: "submitted" as const,
    reviewNotes: ""
  },
  {
    name: "陈书宁",
    phoneNumber: "13800000002",
    wechatId: "chen-shuning",
    email: "chen.shuning@example.com",
    introduction: "关注工程效率与技术组织协同，过去三年负责研发平台化建设。",
    applicationMessage: "希望加入杭州分会，并参与本地闭门活动。",
    targetBranchSlug: "hangzhou",
    status: "in_review" as const,
    reviewNotes: "已安排初步沟通。"
  },
  {
    name: "王启程",
    phoneNumber: "13800000003",
    wechatId: "wangqicheng-ai",
    email: "wang.qicheng@example.com",
    introduction: "负责 AI 产品与大模型应用方向，希望与技术决策者交流实践经验。",
    applicationMessage: "期待加入北京分会，参与技术战略论坛与小范围圆桌。",
    targetBranchSlug: "beijing",
    status: "contacted" as const,
    reviewNotes: "已完成电话沟通，待进一步确认。"
  }
];

const legacyApplications = [
  {
    type: "membership" as const,
    name: "示例兼容申请",
    email: "legacy.application@example.com",
    company: "兼容演示公司",
    citySlug: "shanghai",
    message: "这是一条为兼容旧 applications 路由保留的种子数据。",
    status: "submitted" as const
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

const joinBodyText = [
  "加入条件",
  ...joinPagePayload.conditions,
  "",
  "成员权益",
  ...joinPagePayload.benefits,
  "",
  "加入流程",
  ...joinPagePayload.process,
  "",
  "常见问题",
  ...joinPagePayload.faq.flatMap((item) => [item.question, item.answer, ""])
].join("\n");

const aboutBodyText = aboutPagePayload.sections
  .flatMap((section) => [section.title, ...section.body, ""])
  .join("\n");

export const seedDatabase = async (db: Database): Promise<SeedDatabaseResult> => {
  const existingRetiredPermissions = await db
    .select({
      id: permissions.id
    })
    .from(permissions)
    .where(inArray(permissions.code, [...retiredPermissionCodes]));

  if (existingRetiredPermissions.length > 0) {
    const retiredPermissionIds = existingRetiredPermissions.map((permission) => permission.id);

    await db.delete(rolePermissionBindings).where(inArray(rolePermissionBindings.permissionId, retiredPermissionIds));
    await db.delete(permissions).where(inArray(permissions.id, retiredPermissionIds));
  }

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
    .onConflictDoUpdate({
      target: cities.slug,
      set: {
        name: sql`excluded.name`,
        summary: sql`excluded.summary`,
        bodyRichtext: sql`excluded.body_richtext`,
        status: sql`excluded.status`,
        seoTitle: sql`excluded.seo_title`,
        seoDescription: sql`excluded.seo_description`,
        updatedAt: new Date()
      }
    });

  await db
    .insert(branches)
    .values(
      branchDetails.map((branch, index) => ({
        slug: branch.slug,
        name: branch.name,
        cityName: branch.cityName,
        region: branch.region,
        summary: branch.summary,
        bodyRichtext: branch.body,
        status: "published" as const,
        seoTitle: `${branch.name} | ${platformName}`,
        seoDescription: branch.summary,
        sortOrder: index,
        publishedAt: new Date()
      }))
    )
    .onConflictDoUpdate({
      target: branches.slug,
      set: {
        name: sql`excluded.name`,
        cityName: sql`excluded.city_name`,
        region: sql`excluded.region`,
        summary: sql`excluded.summary`,
        bodyRichtext: sql`excluded.body_richtext`,
        status: sql`excluded.status`,
        seoTitle: sql`excluded.seo_title`,
        seoDescription: sql`excluded.seo_description`,
        sortOrder: sql`excluded.sort_order`,
        publishedAt: sql`excluded.published_at`,
        updatedAt: new Date()
      }
    });

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
    .onConflictDoUpdate({
      target: topics.slug,
      set: {
        title: sql`excluded.title`,
        summary: sql`excluded.summary`,
        bodyRichtext: sql`excluded.body_richtext`,
        status: sql`excluded.status`,
        seoTitle: sql`excluded.seo_title`,
        seoDescription: sql`excluded.seo_description`,
        publishedAt: sql`excluded.published_at`,
        updatedAt: new Date()
      }
    });

  const cityRows = await db.select().from(cities);
  const branchRows = await db.select().from(branches);
  const topicRows = await db.select().from(topics);
  const cityIdBySlug = new Map(cityRows.map((row) => [row.slug, row.id]));
  const branchIdBySlug = new Map(branchRows.map((row) => [row.slug, row.id]));
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

  await db
    .insert(articles)
    .values(
      articleDetails.map((article) => ({
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
    )
    .onConflictDoUpdate({
      target: articles.slug,
      set: {
        title: sql`excluded.title`,
        excerpt: sql`excluded.excerpt`,
        bodyRichtext: sql`excluded.body_richtext`,
        status: sql`excluded.status`,
        authorId: sql`excluded.author_id`,
        primaryCityId: sql`excluded.primary_city_id`,
        seoTitle: sql`excluded.seo_title`,
        seoDescription: sql`excluded.seo_description`,
        publishedAt: sql`excluded.published_at`,
        updatedAt: new Date()
      }
    });

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

  await db
    .insert(members)
    .values(
      memberDetails.map((member, index) => ({
        slug: member.slug,
        name: member.name,
        company: member.company,
        title: member.title,
        bio: member.bio,
        joinedAt: new Date(member.joinedAt),
        branchId: member.branch ? branchIdBySlug.get(member.branch.slug) ?? null : null,
        featured: index < 3,
        membershipStatus: "active",
        visibility: "public",
        sortOrder: index,
        seoTitle: `${member.name} | ${platformName}`,
        seoDescription: `${member.company} · ${member.title}`
      }))
    )
    .onConflictDoNothing();

  const memberRows = await db.select().from(members);
  const memberIdBySlug = new Map(memberRows.map((row) => [row.slug, row.id]));
  const memberIdByName = new Map(memberRows.map((row) => [row.name, row.id]));

  const boardRows = branchDetails.flatMap((branch) => {
    const branchId = branchIdBySlug.get(branch.slug);

    if (!branchId) {
      return [];
    }

    return branch.boardMembers.map((member, index) => ({
      branchId,
      memberId: memberIdByName.get(member.displayName) ?? null,
      displayName: member.displayName,
      company: member.company,
      title: member.title,
      bio: member.bio,
      sortOrder: index,
      status: "published" as const
    }));
  });

  if (boardRows.length > 0) {
    await db.insert(branchBoardMembers).values(boardRows).onConflictDoNothing();
  }

  const existingEvents = await db.select({ slug: events.slug }).from(events);
  const knownEventSlugs = new Set(existingEvents.map((event) => event.slug));
  const missingEvents = publicEventDetailsV2.filter((event) => !knownEventSlugs.has(event.slug));

  if (missingEvents.length > 0) {
    await db.insert(events).values(
      missingEvents.map((event) => ({
        slug: event.slug,
        title: event.title,
        summary: event.summary,
        bodyRichtext: event.body,
        status: "published" as const,
        branchId: event.branch ? branchIdBySlug.get(event.branch.slug) ?? null : null,
        cityId: event.branch ? cityIdBySlug.get(event.branch.slug) ?? null : null,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        startsAt: new Date(event.startsAt),
        endsAt: new Date(event.endsAt),
        registrationState: event.registrationState,
        publishedAt: new Date(event.startsAt)
      }))
    );
  }

  const eventRows = await db.select().from(events);
  const eventIdBySlug = new Map(eventRows.map((row) => [row.slug, row.id]));

  const eventSessionRows = publicEventDetailsV2.flatMap((event) => {
    const eventId = eventIdBySlug.get(event.slug);

    if (!eventId) {
      return [];
    }

    return event.agenda.map((entry, index) => ({
      eventId,
      title: entry.title,
      summary: entry.summary,
      speakerName: entry.speaker,
      sortOrder: index
    }));
  });

  if (eventSessionRows.length > 0) {
    await db.insert(eventSessions).values(eventSessionRows).onConflictDoNothing();
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
    .insert(sitePages)
    .values([
      {
        slug: "join",
        title: joinPagePayload.hero.title,
        summary: joinPagePayload.hero.summary,
        bodyRichtext: joinBodyText,
        status: "published" as const,
        seoTitle: `${joinPagePayload.hero.title} | ${platformName}`,
        seoDescription: joinPagePayload.hero.summary,
        publishedAt: new Date()
      },
      {
        slug: "about",
        title: aboutPagePayload.hero.title,
        summary: aboutPagePayload.hero.summary,
        bodyRichtext: aboutBodyText,
        status: "published" as const,
        seoTitle: `${aboutPagePayload.hero.title} | ${platformName}`,
        seoDescription: aboutPagePayload.hero.summary,
        publishedAt: new Date()
      }
    ])
    .onConflictDoUpdate({
      target: sitePages.slug,
      set: {
        title: sql`excluded.title`,
        summary: sql`excluded.summary`,
        bodyRichtext: sql`excluded.body_richtext`,
        status: sql`excluded.status`,
        seoTitle: sql`excluded.seo_title`,
        seoDescription: sql`excluded.seo_description`,
        publishedAt: sql`excluded.published_at`,
        updatedAt: new Date()
      }
    });

  await db
    .insert(homepageSections)
    .values([
      {
        code: "home",
        payloadJson: {
          heroEyebrow: publicHomePayloadV2.hero.eyebrow,
          heroTitle: publicHomePayloadV2.hero.title,
          heroSummary: publicHomePayloadV2.hero.summary,
          primaryActionLabel: publicHomePayloadV2.hero.actions[0]?.label ?? "",
          primaryActionHref: publicHomePayloadV2.hero.actions[0]?.href ?? "",
          secondaryActionLabel: publicHomePayloadV2.hero.actions[1]?.label ?? "",
          secondaryActionHref: publicHomePayloadV2.hero.actions[1]?.href ?? "",
          introTitle: publicHomePayloadV2.intro.title,
          introSummary: publicHomePayloadV2.intro.summary,
          audienceTitle: publicHomePayloadV2.audience.title,
          audienceItems: publicHomePayloadV2.audience.items,
          metrics: publicHomePayloadV2.metrics,
          featuredArticleIds: publicHomePayloadV2.featuredArticles
            .map((article) => articleIdBySlug.get(article.slug))
            .filter((value): value is string => Boolean(value)),
          featuredEventIds: publicHomePayloadV2.featuredEvents
            .map((event) => eventIdBySlug.get(event.slug))
            .filter((value): value is string => Boolean(value)),
          branchHighlightIds: publicHomePayloadV2.branchHighlights
            .map((branch) => branchIdBySlug.get(branch.slug))
            .filter((value): value is string => Boolean(value)),
          joinTitle: publicHomePayloadV2.joinCallout.title,
          joinSummary: publicHomePayloadV2.joinCallout.summary,
          joinHref: publicHomePayloadV2.joinCallout.href
        },
        status: "published" as const
      }
    ])
    .onConflictDoUpdate({
      target: homepageSections.code,
      set: {
        payloadJson: sql`excluded.payload_json`,
        status: sql`excluded.status`,
        updatedAt: new Date()
      }
    });

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
        key: "site.footerTagline",
        valueJson: {
          value: "TGO 鲲鹏会公开站通过共享 API 契约连接前台、后台与运营流程。"
        }
      }
    ])
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        valueJson: sql`excluded.value_json`,
        updatedAt: new Date()
      }
    });

  const [seededJoinApplicationCount] = await db
    .select({ value: count() })
    .from(joinApplications)
    .where(eq(joinApplications.reviewNotes, "seed://demo"));

  if ((seededJoinApplicationCount?.value ?? 0) === 0) {
    await db.insert(joinApplications).values(
      demoJoinApplications.map((application) => ({
        name: application.name,
        phoneNumber: application.phoneNumber,
        wechatId: application.wechatId,
        email: application.email,
        introduction: application.introduction,
        applicationMessage: application.applicationMessage,
        targetBranchId: branchIdBySlug.get(application.targetBranchSlug) ?? null,
        status: application.status,
        reviewNotes: application.reviewNotes || "seed://demo"
      }))
    );
  }

  const [legacyApplicationCount] = await db
    .select({ value: count() })
    .from(applications)
    .where(eq(applications.sourcePage, "seed://demo"));

  if ((legacyApplicationCount?.value ?? 0) === 0) {
    await db.insert(applications).values(
      legacyApplications.map((application) => ({
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

  const [registrationCount] = await db.select({ value: count() }).from(eventRegistrations);
  if ((registrationCount?.value ?? 0) === 0) {
    const waitlistEventId = eventIdBySlug.get("hangzhou-engineering-workshop");

    if (waitlistEventId) {
      await db.insert(eventRegistrations).values({
        eventId: waitlistEventId,
        name: "周末报名示例",
        phoneNumber: "13900009999",
        wechatId: "demo-registration",
        email: "registration.demo@example.com",
        company: "示例科技",
        jobTitle: "技术负责人",
        note: "希望参加候补名单。",
        status: "waitlisted",
        reviewNotes: "种子数据",
        matchedMemberId: memberIdBySlug.get("shen-lan") ?? null,
        submittedIp: "127.0.0.1",
        submittedUserAgent: "seed-script"
      });
    }
  }

  const [articleCountRow] = await db.select({ value: count() }).from(articles);
  const [eventCountRow] = await db.select({ value: count() }).from(events);
  const [applicationCountRow] = await db.select({ value: count() }).from(joinApplications);
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
