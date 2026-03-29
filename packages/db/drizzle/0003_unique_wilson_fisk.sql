ALTER TABLE "articles" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
UPDATE "articles" AS "a"
SET "branch_id" = "b"."id"
FROM "cities" AS "c"
JOIN "branches" AS "b" ON "b"."slug" = "c"."slug"
WHERE "a"."primary_city_id" = "c"."id" AND "a"."branch_id" IS NULL;--> statement-breakpoint
ALTER TABLE "applications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "article_topic_bindings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cities" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "city_topic_bindings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "event_topic_bindings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "featured_blocks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "site_settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "topics" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "articles" DROP CONSTRAINT "articles_primary_city_id_cities_id_fk";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_city_id_cities_id_fk";
--> statement-breakpoint
DROP TABLE "applications" CASCADE;--> statement-breakpoint
DROP TABLE "article_topic_bindings" CASCADE;--> statement-breakpoint
DROP TABLE "cities" CASCADE;--> statement-breakpoint
DROP TABLE "city_topic_bindings" CASCADE;--> statement-breakpoint
DROP TABLE "event_topic_bindings" CASCADE;--> statement-breakpoint
DROP TABLE "featured_blocks" CASCADE;--> statement-breakpoint
DROP TABLE "site_settings" CASCADE;--> statement-breakpoint
DROP TABLE "topics" CASCADE;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN "primary_city_id";--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "city_id";--> statement-breakpoint
DROP TYPE "public"."application_type";--> statement-breakpoint
DROP TYPE "public"."featured_block_status";
