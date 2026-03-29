# API 与 DTO 调整清单

## 1. 目的

本文档把当前已经确认的产品范围，转成一份接口与共享契约改造清单。

它关注 3 个层面：

- `packages/shared` 里的 DTO 与校验模型怎么改
- `apps/api` 里的公开/后台路由怎么改
- 前台和后台应优先切换哪些旧接口

## 2. 当前实现快照

当前实现已经完成大部分 DTO 切换，当前快照应理解为“已完成 + 剩余兼容面”：

- `packages/shared/src/admin-content.ts`
- `packages/shared/src/network-public.ts`
- `packages/shared/src/ui.ts`
- `apps/api/src/routes/public.ts`
- `apps/api/src/routes/admin.ts`
- `apps/api/src/lib/admin-content.ts`
- `packages/db/src/seed.ts`

已完成的关键调整：

- 公开 DTO 已切换到 `Branch / Member / ArticleV2 / EventV2 / Join / About / HomeV2`
- `apps/api/src/lib/public-content.ts` 与 `apps/api/src/lib/platform-config.ts` 已退场
- `packages/shared/src/public-content.ts` 已收缩为最小公共原语

当前仍需持续注意的兼容面包括：

- 后台内容模型仍保留 `topics`、`cities` 作为编辑与兼容 schema
- 数据库仍保留 `applications`、`featured_blocks`、`site_settings` 等历史表
- 历史资源类型与旧路由兼容只允许读取，不应继续扩展字段和能力

## 3. 本轮接口改造必须遵守的业务前提

- 成员当前不做认证
- 活动当前开放报名
- 是否符合活动要求，由后台审核确认
- 非成员通过加入申请进入主流程
- 工作人员角色只服务后台 RBAC
- 不允许把成员身份与后台 `role` 混用

## 4. 公开 DTO 调整清单

## 4.1 需要新增的 DTO

建议新增：

- `BranchSummary`
- `BranchBoardMemberSummary`
- `MemberSummary`
- `MemberDetail`
- `JoinPagePayload`
- `AboutPagePayload`
- `JoinApplicationInput`
- `JoinApplicationReceipt`

### `JoinApplicationInput`

应至少包含：

- `name`
- `phoneNumber`
- `wechatId`
- `email`
- `introduction`
- `applicationMessage`
- `targetBranchId` optional

### `MemberSummary`

应至少包含：

- `slug`
- `name`
- `company`
- `title`
- `avatar`
- `branch`

### `MemberDetail`

应至少包含：

- `slug`
- `name`
- `company`
- `title`
- `bio`
- `joinedAt`
- `branch`
- `avatar`

## 4.2 需要调整的 DTO

### `HomePayload`

当前 `HomePayload` 仍然带有：

- `featuredTopics`
- `cityHighlights`
- `applicationCallout`

建议调整为更贴近当前首页：

- `hero`
- `intro`
- `audience`
- `metrics`
- `featuredArticles`
- `featuredEvents`
- `branchHighlights`
- `joinCallout`

### `PublicEventRegistrationInput`

当前字段是：

- `name`
- `email`
- `phoneNumber`
- `company`
- `jobTitle`

建议调整为：

- `name`
- `phoneNumber`
- `wechatId` optional
- `email` optional
- `company` optional
- `title` optional
- `note` optional

说明：

- 当前阶段不要求成员登录
- 因此报名 DTO 不需要成员认证字段
- 报名是否匹配成员，由后台审核决定

## 4.3 需要退场的公开 DTO

在新前台切换完成后，应准备退场：

- `TopicSummary`
- `TopicDetail`
- `CitySummary`
- `CityDetail`
- `ApplicationType`
- `PublicApplicationInput`
- `PublicApplicationReceipt`

## 5. 后台 DTO 调整清单

## 5.1 需要新增的后台 DTO

建议新增：

- `AdminMemberListItem`
- `AdminMemberRecord`
- `AdminMemberUpsertInput`
- `AdminBranchListItem`
- `AdminBranchRecord`
- `AdminBranchUpsertInput`
- `AdminBoardMemberRecord`
- `AdminBoardMemberUpsertInput`
- `AdminJoinApplicationListItem`
- `AdminJoinApplicationRecord`

### 成员后台 DTO 最少字段

- 名字
- 公司
- 职称
- 简介
- 加入时间
- 分会
- 可见性
- 成员状态

### 分会后台 DTO 最少字段

- 名称
- 城市
- 区域
- 简介
- 封面图
- 排序
- 发布状态

### 董事会 DTO 最少字段

- 显示名
- 公司
- 职称
- 头像
- 排序
- 状态

## 5.2 需要调整的后台 DTO

### `AdminDashboardPayload`

当前只有：

- `articles`
- `events`
- `applications`
- `assets`
- `auditLogs`
- `staff`
- `roles`

建议调整为更贴近当前后台仪表盘：

- `articleCount`
- `eventCount`
- `applicationCount`
- `pendingApplicationCount`
- `pendingRegistrationCount`
- `systemHealth`
- `appVersion`

### `AdminApplication*`

当前仍围绕泛 `applications` 设计。

建议改为明确的加入申请语义：

- 去掉 `type`
- 去掉 `cityId` / `cityName`
- 去掉 `assignedToStaffId` 的复杂分派含义
- 强化 `wechatId`、`introduction`、`applicationMessage`、`reviewNotes`

### `AdminEventRegistration*`

建议增加：

- `wechatId`
- `note`
- `reviewNotes`
- `matchedMemberId`

### `AdminAssetType`

当前仍有：

- `topic-cover`
- `city-cover`

建议新增并逐步切换到：

- `home-banner`
- `home-card`
- `branch-cover`
- `board-member-avatar`
- `member-avatar`

旧值可以短期兼容，但不应再作为新主线默认值。

## 5.3 需要退场的后台 DTO

完成切换后，进入退场队列：

- `AdminTopic*`
- `AdminTopicUpsertInput`
- `AdminTopicDetailPayload`
- `AdminTopicListItem`
- `AdminArticleReferences.topics`
- `AdminArticleReferences.cities`
- `AdminEventReferences.topics`
- `AdminEventReferences.cities`
- `AdminFeaturedBlockReferences.topics`
- `AdminFeaturedBlockReferences.cities`

## 6. 公开 API 路由调整清单

当前公开路由集中在 `apps/api/src/routes/public.ts`。

### 6.1 需要新增或替换的公开路由

目标公开路由：

- `GET /api/public/v1/site-config`
- `GET /api/public/v1/home`
- `GET /api/public/v1/branches`
- `GET /api/public/v1/branches/:slug` optional
- `GET /api/public/v1/members`
- `GET /api/public/v1/members/:slug`
- `GET /api/public/v1/events`
- `GET /api/public/v1/events/:slug`
- `POST /api/public/v1/events/:eventId/registrations`
- `GET /api/public/v1/articles`
- `GET /api/public/v1/articles/:slug`
- `GET /api/public/v1/join`
- `POST /api/public/v1/join-applications`
- `GET /api/public/v1/about`

### 6.2 当前应标记为旧原型接口的路由

- `GET /api/public/v1/topics`
- `GET /api/public/v1/topics/:slug`
- `GET /api/public/v1/cities`
- `GET /api/public/v1/cities/:slug`
- `POST /api/public/v1/applications`

建议策略：

- 第一阶段保留旧路由，但标记为 deprecated
- 新前台全部切到新路由后，再安排删除

## 7. 后台 API 路由调整清单

当前后台路由集中在 `apps/api/src/routes/admin.ts`。

### 7.1 必须新增的后台路由

- `GET /api/admin/v1/members`
- `POST /api/admin/v1/members`
- `GET /api/admin/v1/members/:id`
- `PATCH /api/admin/v1/members/:id`
- `GET /api/admin/v1/branches`
- `POST /api/admin/v1/branches`
- `GET /api/admin/v1/branches/:id`
- `PATCH /api/admin/v1/branches/:id`
- `GET /api/admin/v1/branches/:id/board-members`
- `PUT /api/admin/v1/branches/:id/board-members`
- `GET /api/admin/v1/pages/:slug`
- `PATCH /api/admin/v1/pages/:slug`
- `GET /api/admin/v1/homepage`
- `PATCH /api/admin/v1/homepage`

### 7.2 需要重命名或替换语义的后台路由

- `GET /api/admin/v1/applications` -> 保留路径，但语义改为加入申请
- `GET /api/admin/v1/applications/:id` -> 同上
- `PATCH /api/admin/v1/applications/:id` -> 同上

### 7.3 应进入退场队列的后台路由

- `GET /api/admin/v1/topics`
- `POST /api/admin/v1/topics`
- `GET /api/admin/v1/topics/:id`
- `PATCH /api/admin/v1/topics/:id`
- `POST /api/admin/v1/topics/:id/publish`
- `POST /api/admin/v1/topics/:id/archive`

## 8. UI 常量与导航调整清单

当前 `packages/shared/src/ui.ts` 仍然是旧导航。

### 8.1 前台导航目标

应切换为：

- `/`
- `/branches`
- `/members`
- `/events`
- `/articles`
- `/join`
- `/about`

### 8.2 后台一级导航目标

应切换为：

- `/dashboard`
- `/articles`
- `/events`
- `/applications`
- `/members`
- `/staff`
- `/roles`
- `/audit-logs`

说明：

- `assets`、`homepage`、`pages` 可以作为二级能力存在
- 不一定需要占一级导航

## 9. 推荐改造顺序

### Phase A：先加新 DTO，不删旧 DTO

先在 `packages/shared` 新增：

- `Branch*`
- `Member*`
- `Join*`
- 新版 `AdminMember*`
- 新版 `AdminBranch*`

### Phase B：API 同时支持新旧路由

- 新增 `/branches`、`/members`、`/join`、`/about`、`/join-applications`
- 保留 `/topics`、`/cities`、`/applications` 作为过渡

### Phase C：前后台切换消费新契约

- `apps/site` 切新前台 DTO 和新公开路由
- `apps/admin` 切新后台 DTO 和新管理路由
- `packages/shared/src/ui.ts` 完成导航收敛

### Phase D：移除旧契约

- 删除旧 `Topic*`、`City*` DTO
- 删除旧 `topics` / `cities` 路由
- 删除旧导航入口

## 10. 本轮 API / DTO 完成标准

满足以下条件即可认为接口改造方案冻结：

- 共享 DTO 已能覆盖前台 7 模块与后台 8 模块
- 新公开路由与新后台路由命名稳定
- 旧 `topic / city / generic applications` 契约进入明确退场队列
- 活动报名契约符合“开放提交 + 后台审核确认”模型
- 成员身份与工作人员权限体系在 DTO 层也没有混用
