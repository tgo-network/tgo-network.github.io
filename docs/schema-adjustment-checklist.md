# Schema 调整清单

## 1. 目的

本文档把已经冻结的产品范围，转成一份可执行的数据库改造清单。

它回答 3 个问题：

- 当前库结构和目标结构差在哪里
- 哪些表必须新增，哪些字段必须迁移
- 哪些旧模型可以先兼容保留，哪些必须明确退场

## 2. 当前实现快照

当前数据库实现仍然明显带有旧 `topic / city / generic applications` 原型痕迹，主要集中在：

- `packages/db/src/schema/index.ts`
- `packages/db/drizzle/0000_square_sally_floyd.sql`
- `packages/db/drizzle/0001_parched_machine_man.sql`

当前已经存在、但与新范围不完全一致的核心表：

- `cities`
- `topics`
- `articles`
- `events`
- `event_sessions`
- `event_registrations`
- `applications`
- `featured_blocks`
- `site_settings`
- `staff_accounts`
- `roles`
- `permissions`
- `audit_logs`

当前仍然缺失的新主线表：

- `branches`
- `branch_board_members`
- `members`
- `join_applications`
- `site_pages`
- `homepage_sections`

## 3. 本轮改造必须遵守的业务前提

当前版本的最终前提已经确定：

- `members` 与 `staff_accounts` 完全分开建模
- 成员当前不做认证
- 工作人员通过 `Better Auth + staff_accounts + roles` 进入后台
- 活动当前采用开放报名
- 是否符合活动要求，由工作人员后台审核确认
- 非成员通过 `join_applications` 提交加入申请

因此 schema 设计要避免两类误建模：

- 不要把 `members` 建成后台角色体系的一部分
- 不要假设活动报名一定绑定登录用户

## 4. 目标结构与当前结构的差异总览

### 4.1 需要新增的业务域

必须新增：

- 分会域
  - `branches`
  - `branch_board_members`
- 成员域
  - `members`
- 加入申请域
  - `join_applications`
- 单页与首页配置域
  - `site_pages`
  - `homepage_sections`

### 4.2 需要从旧模型迁出的业务

需要从旧模型迁出：

- `cities` -> `branches`
- `applications` -> `join_applications`
- `featured_blocks` 的首页配置能力 -> `homepage_sections`
- 部分站点说明内容 -> `site_pages`

### 4.3 明确属于旧原型、后续应退场的模型

不再属于当前主线：

- `topics`
- `article_topic_bindings`
- `event_topic_bindings`
- `city_topic_bindings`
- `cities` 作为公开主实体

说明：

- 这些表不一定第一步就物理删除
- 但从现在开始，不应继续围绕它们扩展新功能

## 5. 逐表调整清单

### 5.1 `branches`

目标：替代旧 `cities`，成为前台分会、活动归属、成员归属的主组织维度。

建议新增字段：

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

迁移动作：

- 从 `cities` 回填基础数据到 `branches`
- 未来前台活动与成员筛选统一切到 `branches`

### 5.2 `branch_board_members`

目标：承载分会董事会展示。

建议新增字段：

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

说明：

- 当前阶段建议允许快照字段独立存在
- 不要求董事会成员一定引用 `members`

### 5.3 `members`

目标：承载前台成员展示与后台成员维护。

建议新增字段：

- `id`
- `slug`
- `name`
- `company`
- `title`
- `bio`
- `joined_at`
- `branch_id` nullable
- `avatar_asset_id` nullable
- `featured`
- `membership_status`
- `visibility`
- `sort_order`
- `seo_title` nullable
- `seo_description` nullable
- `created_at`
- `updated_at`

说明：

- `members` 当前不绑定登录用户
- `members` 只是业务成员资料，不是权限主体

### 5.4 `events`

当前表已存在，但需要从旧 `city` 逻辑切到新的分会主线。

建议调整：

- 新增 `branch_id`
- 保留 `venue_name`
- `venue_address` 可先保留，后续是否改名为 `address` 不阻塞主线
- `registration_state` 继续保留
- `registration_url` 继续保留，满足外链报名兜底
- 逐步去除对 `city_id` 的主流程依赖

建议处理策略：

- 第一阶段先加 `branch_id`，保留 `city_id` 兼容旧数据
- 当前前台和后台一旦切到 `branch_id`，再安排清理 `city_id`

### 5.5 `event_sessions`

当前表名为 `event_sessions`，目标文档中叫 `event_agenda_items`。

建议：

- 当前阶段不强制改表名
- 先把它当作活动议程子表继续使用
- 只要 DTO 和后台表单对外统一叫“活动议程”即可

这样可以避免无谓的迁移成本。

### 5.6 `event_registrations`

当前表已存在，但字段结构需要改成更适合“开放报名 + 后台审核确认”。

当前问题：

- 还带有 `user_id` 思路
- 缺少更清晰的审核备注与成员匹配字段
- 缺少微信号等当前业务所需信息

建议调整为：

- 删除或废弃 `user_id` 主流程依赖
- 新增 `wechat_id` nullable
- 新增 `note` nullable
- 新增 `review_notes` nullable
- 新增 `matched_member_id` nullable
- 新增 `submitted_ip` nullable
- 新增 `submitted_user_agent` nullable
- 保留 `reviewed_by_staff_id`
- 保留 `reviewed_at`

关键说明：

- 当前阶段报名人先提交表单
- 审核时工作人员可把记录人工匹配到某个 `members.id`
- `matched_member_id` 是审核辅助字段，不代表报名必须先登录

### 5.7 `articles`

当前表已存在，但还带有旧 `topics / city` 结构依赖。

建议策略：

- 保留 `articles` 作为主内容表
- 停止围绕 `primary_city_id` 扩展新逻辑
- 逐步去除 `article_topic_bindings` 的主流程依赖
- 作者模型可以暂时沿用当前 `authors` 方案，不阻塞本轮主线迁移

这里的结论是：

- 文章表本身不需要大动
- 真正需要退场的是它周边的旧专题/城市关联逻辑

### 5.8 `join_applications`

目标：替代旧 `applications` 表，专门承载加入申请。

建议新增字段：

- `id`
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

说明：

- 旧 `applications.type`、`company`、`city_id`、`job_title` 等字段已经不再匹配当前加入申请主线
- 不建议继续在旧 `applications` 表上堆字段修补

### 5.9 `site_pages`

目标：承载 `/join` 与 `/about` 单页内容。

建议新增字段：

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

当前至少需要 2 个 slug：

- `join`
- `about`

### 5.10 `homepage_sections`

目标：把首页配置从旧 `featured_blocks` 的“推荐位块”思路，调整为结构化首页区块。

建议新增字段：

- `id`
- `section_key`
- `title`
- `payload_json`
- `sort_order`
- `is_enabled`
- `updated_by_staff_id`
- `created_at`
- `updated_at`

建议首批区块：

- `hero`
- `intro`
- `audience`
- `metrics`
- `featured_events`
- `featured_articles`
- `join_cta`

## 6. 可保留兼容的旧表

以下旧表可以短期保留，避免本轮迁移过重：

- `site_settings`
  - 继续承载站点名、页脚、支持邮箱等全局配置
- `featured_blocks`
  - 在首页配置切换完成前临时保留
- `authors`
  - 文章作者短期可继续使用
- `event_sessions`
  - 继续作为活动议程表使用

## 7. 明确要废弃的旧主线表

在新前后台切换完成后，应准备进入清理队列：

- `topics`
- `article_topic_bindings`
- `event_topic_bindings`
- `city_topic_bindings`
- `cities`
- `applications`

注意：

- 清理动作必须放到前后台新链路完全跑通之后
- 不要在同一发布里既切业务又直接物理删表

## 8. 推荐迁移顺序

### Phase A：增量加表，不删旧表

先新增：

- `branches`
- `branch_board_members`
- `members`
- `join_applications`
- `site_pages`
- `homepage_sections`
- `events.branch_id`
- `event_registrations.matched_member_id`
- `event_registrations.review_notes`
- `event_registrations.wechat_id`
- `event_registrations.submitted_ip`
- `event_registrations.submitted_user_agent`

### Phase B：回填与双写准备

- `cities` -> `branches`
- `applications` -> `join_applications`
- 旧首页配置 -> `homepage_sections`
- 说明页内容 -> `site_pages`

### Phase C：应用切换到新模型

- API 改用新表读写
- 后台表单改用新模型
- 前台查询改用新路由与新 DTO

### Phase D：旧表退场

- 停止写入 `topics / cities / applications`
- 做只读观察窗口
- 再安排正式清理迁移

## 9. 本轮 schema 完成标准

满足以下条件即可认为 schema 侧进入可实施状态：

- 新增表已具备迁移脚本
- 新旧表关系与兼容策略清晰
- 活动报名支持“开放提交 + 审核确认 + 成员匹配”
- 成员与工作人员模型保持分离
- 前台 7 模块、后台 8 模块都能在库结构上找到明确承载对象
