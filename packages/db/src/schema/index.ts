import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const staffAccountStatusEnum = pgEnum("staff_account_status", [
  "invited",
  "active",
  "suspended",
  "disabled"
]);

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "in_review",
  "scheduled",
  "published",
  "archived"
]);

export const eventRegistrationStateEnum = pgEnum("event_registration_state", [
  "not_open",
  "open",
  "waitlist",
  "closed"
]);

export const eventRegistrationStatusEnum = pgEnum("event_registration_status", [
  "submitted",
  "approved",
  "rejected",
  "waitlisted",
  "cancelled"
]);

export const applicationTypeEnum = pgEnum("application_type", [
  "trial",
  "membership",
  "contact"
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "submitted",
  "in_review",
  "contacted",
  "approved",
  "rejected",
  "closed"
]);

export const assetVisibilityEnum = pgEnum("asset_visibility", [
  "public",
  "private"
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "uploaded",
  "active",
  "archived",
  "deleted"
]);

export const featuredBlockStatusEnum = pgEnum("featured_block_status", [
  "draft",
  "active",
  "archived"
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  status: text("status").default("active"),
  phoneNumber: text("phone_number"),
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
  createdAt,
  updatedAt
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt,
  updatedAt
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt,
    updatedAt
  },
  (table) => [uniqueIndex("accounts_provider_account_idx").on(table.providerId, table.accountId)]
);

export const verifications = pgTable("verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt,
  updatedAt
});

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt,
  updatedAt
});

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  resource: text("resource").notNull(),
  action: text("action").notNull(),
  createdAt,
  updatedAt
});

export const staffAccounts = pgTable("staff_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: staffAccountStatusEnum("status").default("invited").notNull(),
  invitedByStaffId: uuid("invited_by_staff_id"),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt,
  updatedAt
}, (table) => [uniqueIndex("staff_accounts_user_idx").on(table.userId)]);

export const staffRoleBindings = pgTable(
  "staff_role_bindings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    staffAccountId: uuid("staff_account_id")
      .notNull()
      .references(() => staffAccounts.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    createdAt
  },
  (table) => [uniqueIndex("staff_role_bindings_staff_role_idx").on(table.staffAccountId, table.roleId)]
);

export const rolePermissionBindings = pgTable(
  "role_permission_bindings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt
  },
  (table) => [uniqueIndex("role_permission_bindings_role_permission_idx").on(table.roleId, table.permissionId)]
);

export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  storageProvider: text("storage_provider").notNull(),
  bucket: text("bucket").notNull(),
  objectKey: text("object_key").notNull().unique(),
  visibility: assetVisibilityEnum("visibility").default("public").notNull(),
  assetType: text("asset_type").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  width: integer("width"),
  height: integer("height"),
  checksum: text("checksum"),
  originalFilename: text("original_filename").notNull(),
  altText: text("alt_text"),
  uploadedByStaffId: uuid("uploaded_by_staff_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  status: assetStatusEnum("status").default("uploaded").notNull(),
  createdAt,
  updatedAt
});

export const branches = pgTable("branches", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  cityName: text("city_name").notNull(),
  region: text("region"),
  summary: text("summary"),
  bodyRichtext: text("body_richtext"),
  status: contentStatusEnum("status").default("draft").notNull(),
  coverAssetId: uuid("cover_asset_id").references(() => assets.id, { onDelete: "set null" }),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt,
  updatedAt
});

export const members = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  title: text("title").notNull(),
  bio: text("bio"),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  avatarAssetId: uuid("avatar_asset_id").references(() => assets.id, { onDelete: "set null" }),
  featured: boolean("featured").default(false).notNull(),
  membershipStatus: text("membership_status").default("active").notNull(),
  visibility: text("visibility").default("public").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt,
  updatedAt
});

export const branchBoardMembers = pgTable("branch_board_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
  displayName: text("display_name").notNull(),
  company: text("company").notNull(),
  title: text("title").notNull(),
  bio: text("bio"),
  avatarAssetId: uuid("avatar_asset_id").references(() => assets.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").default(0).notNull(),
  status: contentStatusEnum("status").default("draft").notNull(),
  createdAt,
  updatedAt
}, (table) => [uniqueIndex("branch_board_members_branch_sort_idx").on(table.branchId, table.sortOrder)]);

export const cities = pgTable("cities", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  region: text("region"),
  summary: text("summary"),
  bodyRichtext: text("body_richtext"),
  status: contentStatusEnum("status").default("draft").notNull(),
  coverAssetId: uuid("cover_asset_id").references(() => assets.id, { onDelete: "set null" }),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt,
  updatedAt
});

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  bodyRichtext: text("body_richtext"),
  status: contentStatusEnum("status").default("draft").notNull(),
  coverAssetId: uuid("cover_asset_id").references(() => assets.id, { onDelete: "set null" }),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt,
  updatedAt
});

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  createdAt,
  updatedAt
});

export const authors = pgTable("authors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarAssetId: uuid("avatar_asset_id").references(() => assets.id, { onDelete: "set null" }),
  status: text("status").default("active").notNull(),
  createdAt,
  updatedAt
});

export const articles = pgTable("articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  bodyRichtext: text("body_richtext"),
  status: contentStatusEnum("status").default("draft").notNull(),
  authorId: uuid("author_id").references(() => authors.id, { onDelete: "set null" }),
  primaryCityId: uuid("primary_city_id").references(() => cities.id, { onDelete: "set null" }),
  coverAssetId: uuid("cover_asset_id").references(() => assets.id, { onDelete: "set null" }),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdByStaffId: uuid("created_by_staff_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  updatedByStaffId: uuid("updated_by_staff_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  createdAt,
  updatedAt
});

export const articleTopicBindings = pgTable(
  "article_topic_bindings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    createdAt
  },
  (table) => [uniqueIndex("article_topic_bindings_article_topic_idx").on(table.articleId, table.topicId)]
);

export const articleTagBindings = pgTable(
  "article_tag_bindings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt
  },
  (table) => [uniqueIndex("article_tag_bindings_article_tag_idx").on(table.articleId, table.tagId)]
);

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  bodyRichtext: text("body_richtext"),
  status: contentStatusEnum("status").default("draft").notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  cityId: uuid("city_id").references(() => cities.id, { onDelete: "set null" }),
  venueName: text("venue_name"),
  venueAddress: text("venue_address"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  timezone: text("timezone").default("Asia/Shanghai").notNull(),
  coverAssetId: uuid("cover_asset_id").references(() => assets.id, { onDelete: "set null" }),
  capacity: integer("capacity"),
  registrationState: eventRegistrationStateEnum("registration_state")
    .default("not_open")
    .notNull(),
  registrationUrl: text("registration_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdByStaffId: uuid("created_by_staff_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  updatedByStaffId: uuid("updated_by_staff_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  createdAt,
  updatedAt
});

export const eventSessions = pgTable("event_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  speakerName: text("speaker_name"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt,
  updatedAt
}, (table) => [uniqueIndex("event_sessions_event_sort_idx").on(table.eventId, table.sortOrder)]);

export const eventTopicBindings = pgTable(
  "event_topic_bindings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    createdAt
  },
  (table) => [uniqueIndex("event_topic_bindings_event_topic_idx").on(table.eventId, table.topicId)]
);

export const eventRegistrations = pgTable("event_registrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  phoneNumber: text("phone_number"),
  wechatId: text("wechat_id"),
  email: text("email"),
  company: text("company"),
  jobTitle: text("job_title"),
  note: text("note"),
  answersJson: jsonb("answers_json"),
  status: eventRegistrationStatusEnum("status").default("submitted").notNull(),
  source: text("source").default("public_form").notNull(),
  reviewNotes: text("review_notes"),
  matchedMemberId: uuid("matched_member_id").references(() => members.id, { onDelete: "set null" }),
  reviewedByStaffId: uuid("reviewed_by_staff_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  submittedIp: text("submitted_ip"),
  submittedUserAgent: text("submitted_user_agent"),
  createdAt,
  updatedAt
});

export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: applicationTypeEnum("type").default("trial").notNull(),
  name: text("name").notNull(),
  phoneNumber: text("phone_number"),
  email: text("email"),
  company: text("company"),
  jobTitle: text("job_title"),
  cityId: uuid("city_id").references(() => cities.id, { onDelete: "set null" }),
  message: text("message"),
  sourcePage: text("source_page").notNull(),
  status: applicationStatusEnum("status").default("submitted").notNull(),
  assignedToStaffId: uuid("assigned_to_staff_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  reviewedByStaffId: uuid("reviewed_by_staff_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  internalNotes: text("internal_notes"),
  createdAt,
  updatedAt
});

export const cityTopicBindings = pgTable(
  "city_topic_bindings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    createdAt
  },
  (table) => [uniqueIndex("city_topic_bindings_city_topic_idx").on(table.cityId, table.topicId)]
);

export const featuredBlocks = pgTable("featured_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  status: featuredBlockStatusEnum("status").default("draft").notNull(),
  payloadJson: jsonb("payload_json"),
  createdByStaffId: uuid("created_by_staff_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  updatedByStaffId: uuid("updated_by_staff_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  createdAt,
  updatedAt
});

export const siteSettings = pgTable("site_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  valueJson: jsonb("value_json"),
  updatedByStaffId: uuid("updated_by_staff_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  updatedAt
});

export const sitePages = pgTable("site_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  bodyRichtext: text("body_richtext"),
  status: contentStatusEnum("status").default("draft").notNull(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  updatedByStaffId: uuid("updated_by_staff_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  createdAt,
  updatedAt
});

export const homepageSections = pgTable("homepage_sections", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  payloadJson: jsonb("payload_json"),
  status: contentStatusEnum("status").default("draft").notNull(),
  updatedByStaffId: uuid("updated_by_staff_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  createdAt,
  updatedAt
});

export const joinApplications = pgTable("join_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  wechatId: text("wechat_id"),
  email: text("email"),
  introduction: text("introduction").notNull(),
  applicationMessage: text("application_message").notNull(),
  targetBranchId: uuid("target_branch_id").references(() => branches.id, { onDelete: "set null" }),
  status: applicationStatusEnum("status").default("submitted").notNull(),
  reviewedByStaffId: uuid("reviewed_by_staff_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNotes: text("review_notes"),
  createdAt,
  updatedAt
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actorStaffAccountId: uuid("actor_staff_account_id").references(() => staffAccounts.id, {
    onDelete: "set null"
  }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id"),
  beforeJson: jsonb("before_json"),
  afterJson: jsonb("after_json"),
  requestIp: text("request_ip"),
  userAgent: text("user_agent"),
  createdAt
});
