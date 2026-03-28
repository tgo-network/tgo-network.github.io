import { count, eq } from "drizzle-orm";

import {
  articleDetails,
  cityDetails,
  eventDetails,
  platformName,
  topicDetails
} from "@tgo/shared";

import { createDb } from "./client.js";
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
  ["dashboard.read", "Dashboard Read", "dashboard", "read"],
  ["article.read", "Article Read", "article", "read"],
  ["article.write", "Article Write", "article", "write"],
  ["article.publish", "Article Publish", "article", "publish"],
  ["topic.manage", "Topic Manage", "topic", "manage"],
  ["event.manage", "Event Manage", "event", "manage"],
  ["registration.read", "Registration Read", "registration", "read"],
  ["application.review", "Application Review", "application", "review"],
  ["asset.manage", "Asset Manage", "asset", "manage"],
  ["featured_block.manage", "Featured Block Manage", "featured_block", "manage"],
  ["settings.manage", "Settings Manage", "settings", "manage"],
  ["audit_log.read", "Audit Log Read", "audit_log", "read"],
  ["staff.manage", "Staff Manage", "staff", "manage"],
  ["role.manage", "Role Manage", "role", "manage"]
] as const;

const roleSeed = [
  ["super_admin", "Super Admin", "Full internal access"],
  ["content_editor", "Content Editor", "Manage articles, topics, and featured blocks"],
  ["event_manager", "Event Manager", "Manage events and registration review"],
  ["reviewer", "Reviewer", "Review inbound applications"],
  ["media_manager", "Media Manager", "Manage uploaded assets"]
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
    name: "Lin Qiao",
    email: "lin.qiao@example.com",
    company: "Studio North",
    citySlug: "shanghai",
    message: "I want to join the next operator cohort and help shape the first launch playbook.",
    status: "submitted" as const
  },
  {
    type: "membership" as const,
    name: "Mina Xu",
    email: "mina.xu@example.com",
    company: "Lakehouse Labs",
    citySlug: "hangzhou",
    message: "Our team wants to contribute recurring event formats and editorial material to the network.",
    status: "in_review" as const
  },
  {
    type: "contact" as const,
    name: "Bo Zhang",
    email: "bo.zhang@example.com",
    company: "East Garden Forum",
    citySlug: "beijing",
    message: "We are exploring venue and community partnership opportunities for the city kickoff series.",
    status: "contacted" as const
  }
];

const main = async () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run the seed script.");
  }

  const { db, pool } = createDb(databaseUrl);

  try {
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
            bio: authorRoleByName.get(name) ?? "Contributor",
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
        summary: `${entry.title} by ${entry.speaker}`,
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

    console.log(
      JSON.stringify(
        {
          seededRoles: roleRows.length,
          seededPermissions: permissionRows.length,
          seededCities: cityRows.length,
          seededTopics: topicRows.length,
          seededArticles: articleCountRow?.value ?? 0,
          seededEvents: eventCountRow?.value ?? 0,
          seededApplications: applicationCountRow?.value ?? 0,
          superAdminRoleId: superAdmin?.id ?? null
        },
        null,
        2
      )
    );
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
