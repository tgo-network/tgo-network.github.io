# TGO Network 数据模型草案

## 1. 目的

本文档用于冻结当前版本的核心实体与关系，避免在实现阶段反复改表。

目标不是一次定义所有字段，而是先稳定：

- 哪些实体一定存在
- 实体之间如何关联
- 认证、业务数据、媒体数据如何分层

## 2. 建模原则

- 主键统一使用 `UUID`
- 核心表统一带 `created_at` 与 `updated_at`
- 公开路由使用 `slug`，关系引用使用内部 `id`
- 业务授权与认证表分离
- 文件二进制不进入 `PostgreSQL`
- 对公开实体尽量使用状态流转代替硬删除

## 3. 当前核心域总览

```text
Better Auth users
  -> staff_accounts

staff_accounts
  -> staff_role_bindings
  -> audit_logs

roles
  -> role_permission_bindings

branches
  -> branch_board_members
  -> members
  -> events
  -> join_applications

members
  -> branch_board_members (optional reference)
  -> event_registrations (optional member linkage)

articles
  -> assets

events
  -> event_agenda_items
  -> event_registrations
  -> assets

join_applications
  -> branches

site_pages / homepage_sections
  -> assets
```

## 4. 认证域与业务域边界

### 4.1 Better Auth 负责

认证系统负责以下概念性表：

- `users`
- `accounts`
- `sessions`
- `verifications`

它们回答的是：

- 用户是谁
- 用户用什么方式登录
- 用户当前是否持有有效会话

### 4.2 应用自己负责

当前平台自己负责：

- 成员身份
- 工作人员资格
- 角色权限
- 分会与董事会
- 成员资料
- 文章
- 活动与报名
- 加入申请
- 页面内容
- 资源元数据
- 审计日志

## 5. 工作人员与权限相关表

### `staff_accounts`

表示哪些 `users` 可以进入后台。

建议字段：

- `id`
- `user_id`
- `status`
- `display_name`
- `notes` nullable
- `last_login_at` nullable
- `invited_by_staff_id` nullable
- `invited_at` nullable
- `activated_at` nullable
- `created_at`
- `updated_at`

建议状态：

- `invited`
- `active`
- `suspended`
- `disabled`

### `roles`

建议字段：

- `id`
- `code`
- `name`
- `description`
- `is_system`
- `created_at`
- `updated_at`

### `permissions`

建议字段：

- `id`
- `code`
- `name`
- `resource`
- `action`
- `created_at`
- `updated_at`

### `staff_role_bindings`

建议字段：

- `id`
- `staff_account_id`
- `role_id`
- `created_at`

### `role_permission_bindings`

建议字段：

- `id`
- `role_id`
- `permission_id`
- `created_at`

## 6. 站点内容相关表

### `site_settings`

存放全站级的基础配置。

建议字段：

- `id`
- `site_name`
- `tagline`
- `support_email`
- `footer_text`
- `header_nav_json`
- `footer_nav_json`
- `updated_by_staff_id`
- `created_at`
- `updated_at`

### `homepage_sections`

用于管理首页的结构化区块，而不是把首页当成一篇普通文章。

建议字段：

- `id`
- `section_key`
- `title`
- `payload_json`
- `sort_order`
- `is_enabled`
- `updated_by_staff_id`
- `created_at`
- `updated_at`

建议 `section_key`：

- `hero`
- `intro`
- `audience`
- `metrics`
- `featured_events`
- `featured_articles`
- `join_cta`

### `site_pages`

用于管理单页型内容。

当前至少需要：

- `join`
- `about`

建议字段：

- `id`
- `slug`
- `title`
- `summary`
- `body_richtext`
- `faq_json` nullable
- `seo_title` nullable
- `seo_description` nullable
- `status`
- `published_at` nullable
- `updated_by_staff_id`
- `created_at`
- `updated_at`

## 7. 分会与董事会相关表

### `branches`

`branches` 是当前版本替代旧 `cities` 的主实体。

它同时承担：

- 分会展示
- 活动城市筛选维度
- 成员归属维度
- 申请归属维度

建议字段：

- `id`
- `slug`
- `name`
- `city_name`
- `region`
- `summary`
- `body_richtext` nullable
- `cover_asset_id` nullable
- `status`
- `seo_title` nullable
- `seo_description` nullable
- `sort_order`
- `published_at` nullable
- `created_at`
- `updated_at`

建议状态：

- `draft`
- `published`
- `archived`

### `branch_board_members`

用于展示分会董事会成员。

设计上建议允许“引用成员”或“快照字段”两种模式并存：

- 如果董事会成员就是平台成员，可关联 `member_id`
- 如果需要独立展示，也可直接存快照字段

建议字段：

- `id`
- `branch_id`
- `member_id` nullable
- `display_name`
- `company`
- `title`
- `bio` nullable
- `avatar_asset_id` nullable
- `sort_order`
- `status`
- `created_at`
- `updated_at`

## 8. 成员相关表

### `members`

`members` 是业务上的正式成员身份。

它与工作人员后台角色不是一个概念，并且当前版本按完全分离建模处理。

建议字段：

- `id`
- `slug`
- `name`
- `company`
- `title`
- `bio`
- `joined_at`
- `branch_id` nullable
- `avatar_asset_id` nullable
- `featured` boolean
- `membership_status`
- `visibility`
- `sort_order`
- `seo_title` nullable
- `seo_description` nullable
- `created_at`
- `updated_at`

建议可见性：

- `public`
- `hidden`
- `archived`

建议成员身份状态：

- `active`
- `inactive`
- `alumni`
- `pending_activation`

说明：

- 成员列表展示公开字段
- 成员详情页读取更完整简介与加入时间
- `visibility` 决定公开展示范围
- `membership_status` 决定其是否是有效成员
- 当前不默认把成员绑定到工作人员认证用户
- 如果未来成员认证真的需要上线，应单独设计成员认证绑定模型，而不是直接复用工作人员结构

## 9. 文章相关表

### `articles`

建议字段：

- `id`
- `slug`
- `title`
- `excerpt`
- `body_richtext`
- `cover_asset_id` nullable
- `author_name`
- `author_bio` nullable
- `status`
- `seo_title` nullable
- `seo_description` nullable
- `scheduled_at` nullable
- `published_at` nullable
- `created_by_staff_id`
- `updated_by_staff_id`
- `created_at`
- `updated_at`

建议状态：

- `draft`
- `scheduled`
- `published`
- `archived`

## 10. 活动相关表

### `events`

建议字段：

- `id`
- `slug`
- `title`
- `summary`
- `body_richtext`
- `branch_id`
- `city_name`
- `venue_name`
- `address`
- `start_at`
- `end_at`
- `registration_state`
- `capacity` nullable
- `cover_asset_id` nullable
- `external_registration_url` nullable
- `status`
- `seo_title` nullable
- `seo_description` nullable
- `published_at` nullable
- `created_by_staff_id`
- `updated_by_staff_id`
- `created_at`
- `updated_at`

建议 `registration_state`：

- `closed`
- `open`
- `waitlist`
- `external`

建议 `status`：

- `draft`
- `published`
- `archived`

### `event_agenda_items`

如果活动详情需要展示议程，建议使用结构化子表。

建议字段：

- `id`
- `event_id`
- `start_at`
- `end_at`
- `title`
- `speaker_name` nullable
- `speaker_title` nullable
- `description` nullable
- `sort_order`
- `created_at`
- `updated_at`

### `event_registrations`

建议字段：

- `id`
- `event_id`
- `matched_member_id` nullable
- `name`
- `phone_number`
- `wechat_id` nullable
- `email` nullable
- `company` nullable
- `title` nullable
- `note` nullable
- `status`
- `review_notes` nullable
- `reviewed_by_staff_id` nullable
- `reviewed_at` nullable
- `submitted_ip` nullable
- `submitted_user_agent` nullable
- `created_at`
- `updated_at`

建议状态：

- `pending`
- `approved`
- `rejected`
- `waitlisted`
- `cancelled`

说明：

- 当前阶段活动采用开放报名
- 工作人员可在审核过程中把报名记录与某个成员做人工匹配，因此保留 `matched_member_id`
- 这样可以支持“开放提交、后台确认”的运营方式

## 11. 加入申请相关表

### `join_applications`

当前申请表字段必须覆盖用户要求的 6 个必填项。

建议字段：

- `id`
- `user_id` nullable
- `name`
- `phone_number`
- `wechat_id`
- `email`
- `introduction`
- `application_message`
- `target_branch_id` nullable
- `source_channel` nullable
- `status`
- `review_notes` nullable
- `reviewed_by_staff_id` nullable
- `reviewed_at` nullable
- `submitted_ip` nullable
- `submitted_user_agent` nullable
- `created_at`
- `updated_at`

建议状态：

- `pending`
- `under_review`
- `approved`
- `rejected`
- `archived`

当前阶段不强制拆出独立的面试、推荐人、缴费记录等子表。
如果未来流程变复杂，再基于该表向外扩展。

补充说明：

- 非成员可以匿名提交加入申请，因此 `user_id` 可以为空
- 如果申请人先注册了账号，再提交申请，则可回填 `user_id`
- 申请通过后，可以创建或关联 `members` 记录

## 12. 媒体相关表

### `assets`

用于保存对象存储文件的元数据。

建议字段：

- `id`
- `storage_provider`
- `bucket`
- `object_key`
- `visibility`
- `asset_type`
- `mime_type`
- `byte_size`
- `width` nullable
- `height` nullable
- `original_filename`
- `alt_text` nullable
- `uploaded_by_staff_id`
- `status`
- `created_at`
- `updated_at`

### `asset_usages`（可选）

后续可用来追踪资源引用关系。

建议字段：

- `id`
- `asset_id`
- `entity_type`
- `entity_id`
- `usage_type`
- `created_at`

## 13. 审计相关表

### `audit_logs`

记录后台敏感操作。

建议字段：

- `id`
- `actor_staff_id`
- `action`
- `target_type`
- `target_id`
- `request_id`
- `ip_address` nullable
- `user_agent` nullable
- `before_json` nullable
- `after_json` nullable
- `result`
- `created_at`

## 14. 索引与约束建议

至少需要：

- `branches.slug` 唯一索引
- `members.slug` 唯一索引
- `articles.slug` 唯一索引
- `events.slug` 唯一索引
- `site_pages.slug` 唯一索引
- `staff_accounts.user_id` 唯一索引
- `roles.code` 唯一索引
- `permissions.code` 唯一索引
- `branch_board_members(branch_id, sort_order)` 组合索引
- `members(branch_id, sort_order)` 组合索引
- `events(branch_id, start_at)` 组合索引
- `join_applications(status, created_at)` 组合索引
- `event_registrations(event_id, status, created_at)` 组合索引

## 15. 当前需要冻结的关键判断

在真正改库前，需要把以下结论视为当前版本默认方案：

- `branches` 取代旧 `cities` 成为对外主组织维度
- `members` 与 `staff_accounts` 完全分开建模
- “成员身份”与“工作人员角色”是两套概念，不能混用
- `users` 当前主要服务于工作人员认证，不默认映射到 `members`
- `join_applications` 先做单表审核，不做复杂拆分
- 首页采用结构化区块，而不是把首页做成单篇富文本
- `join` 与 `about` 使用单页模型管理
