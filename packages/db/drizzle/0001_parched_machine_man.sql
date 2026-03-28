CREATE TABLE "city_topic_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_topic_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "city_topic_bindings" ADD CONSTRAINT "city_topic_bindings_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city_topic_bindings" ADD CONSTRAINT "city_topic_bindings_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_topic_bindings" ADD CONSTRAINT "event_topic_bindings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_topic_bindings" ADD CONSTRAINT "event_topic_bindings_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "city_topic_bindings_city_topic_idx" ON "city_topic_bindings" USING btree ("city_id","topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_topic_bindings_event_topic_idx" ON "event_topic_bindings" USING btree ("event_id","topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_sessions_event_sort_idx" ON "event_sessions" USING btree ("event_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_accounts_user_idx" ON "staff_accounts" USING btree ("user_id");