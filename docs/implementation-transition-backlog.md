# 实施迁移待办

## 1. 目的

本文档把已经冻结的产品范围、数据模型和 API 方案，进一步落到当前仓库里的具体代码文件上。

它解决 3 个实际执行问题：

- 现有代码哪些部分仍停留在旧 `topic / city / generic applications` 原型
- 新范围应该先改哪些文件，后改哪些文件
- 哪些旧能力先兼容保留，哪些要在新链路稳定后退场

## 1.1 最新状态（2026-03-29）

当前主线已经完成以下收敛：

- 公开站 DTO 与 fallback 已切到 `Branch / Member / ArticleV2 / EventV2 / Join / About / HomeV2`
- `apps/api/src/lib/public-content.ts` 与 `apps/api/src/lib/platform-config.ts` 已退场
- `packages/shared/src/public-content.ts` 已收缩为最小公共原语，不再承载旧 `Topic / City / PublicApplication` 兼容 DTO
- `packages/db/src/seed.ts` 已改为围绕当前分会、成员、文章、活动主线生成演示数据
- `packages/db/src/schema/index.ts` 与 `packages/db/drizzle/0003_unique_wilson_fisk.sql` 已移除旧 `topics / cities / applications / featured_blocks / site_settings` 主线依赖
- `apps/api/src/lib/admin-content.ts` 已收缩为文章与资源管理的最小实现
- `packages/shared/src/admin-content.ts` 已删除旧 `Topic / Event / Application` 后台兼容 DTO

当前遗留仅剩：

- Drizzle 迁移历史文件中仍保留旧表定义，作为历史迁移记录存在
- API 与集成测试中保留对旧公开 / 后台路由返回 `404` 的退场断言

## 2. 当前代码基线

当前仓库已经完成主线收敛，以下内容主要作为状态记录而非待实现清单。

### 2.1 共享契约层

主要文件：

- `packages/shared/src/public-content.ts`
- `packages/shared/src/admin-content.ts`
- `packages/shared/src/ui.ts`

当前状态：

- 公开 DTO 已全部收敛到 `branches / members / articles / events / join / about / home`
- 后台共享契约已移除旧 `topics / cities / featured blocks` DTO
- 公共导航与后台一级导航都已对齐当前 7 个前台模块和 8 个后台模块

### 2.2 数据库与种子数据

主要文件：

- `packages/db/src/schema/index.ts`
- `packages/db/src/seed.ts`
- `packages/db/drizzle/*`

当前状态：

- 主实体已经切到 `branches`、`branch_board_members`、`members`、`join_applications`、`site_pages`、`homepage_sections`
- Drizzle migration 已补齐旧表退场与 `articles.branch_id` 回填逻辑
- 演示数据已围绕分会、成员、文章、活动、加入申请主线生成

### 2.3 API 层

主要文件：

- `apps/api/src/routes/public.ts`
- `apps/api/src/routes/admin.ts`
- `apps/api/src/lib/public-content.ts`
- `apps/api/src/lib/admin-content.ts`
- `apps/api/src/lib/platform-config.ts`
- `apps/api/src/lib/access.ts`

当前状态：

- 公开 API 已围绕 `/home`、`/branches`、`/members`、`/events`、`/articles`、`/join`、`/about` 收敛
- 后台 API 已提供 `/members`、`/branches`、`/pages/:slug`、`/homepage`
- 仪表盘统计已切到 `join_applications` 等当前主线实体
- 首页配置由 `homepage_sections` 驱动，`site-config` 走共享静态契约

### 2.4 前台与后台页面

主要文件：

- 前台：`apps/site/src/pages/*`
- 后台：`apps/admin/src/router.ts`、`apps/admin/src/lib/navigation.ts`、`apps/admin/src/views/*`

当前状态：

- 前台已提供 `/branches`、`/members`、`/members/[slug]`、`/join`
- 后台旧 `topics / featured blocks / site settings` 页面与路由已退场
- 成员、分会/董事会、首页配置、单页内容页面均已落地

## 3. 本轮迁移必须遵守的实施规则

- 先加新能力，再退旧能力，不做大爆炸式重写
- `members` 与 `staff_accounts` 必须继续完全分离
- 当前阶段成员不做登录认证，不补“成员中心”
- 活动报名继续保持开放提交，由后台审核确认
- 后台一级导航必须收敛到 8 个模块，但资源、页面配置等支持能力可以保留为二级页
- 旧 `topics / cities / applications` 路由和表已经退场，后续仅保留退场测试与迁移历史，不再恢复

## 4. 推荐执行波次

## 4.1 Wave 1：共享契约与导航先对齐

目标：先把所有上层页面与 API 的“语言”改到正确方向。

涉及文件：

- `packages/shared/src/ui.ts`
- `packages/shared/src/public-content.ts`
- `packages/shared/src/admin-content.ts`
- `packages/shared/src/index.ts`

具体任务：

- 更新 `publicNav`
  - 删除 `/topics`
  - 删除 `/cities`
  - 增加 `/branches`
  - 增加 `/members`
  - 增加 `/join`
- 更新 `adminModules`
  - 一级导航只保留：仪表盘、文章、活动、申请、成员、工作人员、角色、审计日志
  - 资源、页面配置、首页配置改为支持页，不再占一级导航
- 更新 `implementationMilestones`
  - 把“主题 / 城市”描述改成“分会 / 成员 / 加入 / 关于”
- 在 `public-content.ts` 新增 DTO
  - `BranchSummary`
  - `BranchDetail` 或 `BranchPagePayload`
  - `BranchBoardMemberSummary`
  - `MemberSummary`
  - `MemberDetail`
  - `JoinPagePayload`
  - `AboutPagePayload`
  - `JoinApplicationInput`
  - `JoinApplicationReceipt`
- 调整现有 DTO
  - `HomePayload`
  - `PublicEventRegistrationInput`
  - `PublicEventRegistrationReceipt`
- 在 `admin-content.ts` 新增 DTO
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
  - `AdminSitePageRecord`
  - `AdminSitePageUpsertInput`
  - `AdminHomepageSectionsRecord`
- 调整后台 DTO
  - `AdminDashboardPayload`
  - `AdminEventRegistration*`
  - `AdminAssetType`

完成标准：

- 新的前后台路由与页面命名可以全部从 `@tgo/shared` 得到
- 旧 `Topic*`、`City*`、`PublicApplication*` 仅作为过渡兼容存在，不再扩展

## 4.2 Wave 2：数据库与权限模型增量补齐

目标：先把新主线需要的表、字段和权限准备好。

涉及文件：

- `packages/db/src/schema/index.ts`
- `packages/db/src/seed.ts`
- `packages/db/drizzle/*`

具体任务：

- 新增表
  - `branches`
  - `branch_board_members`
  - `members`
  - `join_applications`
  - `site_pages`
  - `homepage_sections`
- 调整现有表
  - `events` 新增 `branch_id`
  - `event_registrations` 新增 `wechat_id`
  - `event_registrations` 新增 `note`
  - `event_registrations` 新增 `review_notes`
  - `event_registrations` 新增 `matched_member_id`
  - `event_registrations` 新增 `submitted_ip`
  - `event_registrations` 新增 `submitted_user_agent`
- 保持兼容
  - `events.city_id` 第一阶段保留
  - `applications` 第一阶段保留，只是不再扩展
  - `featured_blocks`、`site_settings` 可以先保留，待新页面配置链路稳定后再考虑收缩
- 更新权限种子
  - 新增 `page.manage`
  - 新增 `branch.manage`
  - 新增 `member.manage`
  - 把 `registration.read` 迁移为 `registration.review`
  - 移除 `article.manage`、`topic.manage`、`featured_block.manage`、`settings.manage`
  - 在 seed 中自动清理开发库历史权限与角色绑定
- 更新系统角色
  - 增加 `member_manager`
  - 增加 `auditor`
- 更新演示数据
  - 用分会、董事会、成员、加入申请、首页区块替换旧原型演示数据主线

完成标准：

- 新 schema 可通过迁移正常创建
- 种子数据可直接支撑前台 7 模块与后台 8 模块的基本演示

## 4.3 Wave 3：公开 API 切换到新主线

目标：先让前台可以拿到正确的数据结构。

涉及文件：

- `apps/api/src/lib/public-content.ts`
- `apps/api/src/routes/public.ts`
- `apps/api/src/lib/platform-config.ts`

具体任务：

- 新增公开读取接口
  - `GET /api/public/v1/branches`
  - `GET /api/public/v1/members`
  - `GET /api/public/v1/members/:slug`
  - `GET /api/public/v1/join`
  - `GET /api/public/v1/about`
  - `POST /api/public/v1/join-applications`
- 调整现有公开接口
  - `GET /api/public/v1/home` 改为新首页结构
  - `GET /api/public/v1/events` 支持按分会筛选
  - `GET /api/public/v1/events/:slug` 返回更贴近详情页的数据结构
  - `POST /api/public/v1/events/:eventId/registrations` 使用新报名字段
- 过渡兼容
  - `/topics`
  - `/topics/:slug`
  - `/cities`
  - `/cities/:slug`
  - `/applications`

兼容策略：

- 在前台页面全部切换到新接口之前，旧接口可继续保留
- 但旧接口只做兼容，不继续新增字段或页面能力

完成标准：

- 前台 7 个模块都能从 API 获取真实数据
- 加入申请与活动报名都符合“开放提交 + 后台审核”的当前业务规则

## 4.4 Wave 4：后台 API 与权限检查收敛

目标：让后台具备录入、审核和维护当前业务域的能力。

涉及文件：

- `apps/api/src/routes/admin.ts`
- `apps/api/src/lib/admin-content.ts`
- `apps/api/src/lib/platform-config.ts`
- `apps/api/src/lib/access.ts`
- `packages/db/src/seed.ts`

具体任务：

- 新增后台接口
  - `GET /api/admin/v1/members`
  - `POST /api/admin/v1/members`
  - `GET /api/admin/v1/members/:id`
  - `PATCH /api/admin/v1/members/:id`
  - `GET /api/admin/v1/branches`
  - `POST /api/admin/v1/branches`
  - `GET /api/admin/v1/branches/:id`
  - `PATCH /api/admin/v1/branches/:id`
  - `GET /api/admin/v1/pages/:slug`
  - `PATCH /api/admin/v1/pages/:slug`
  - `GET /api/admin/v1/homepage`
  - `PATCH /api/admin/v1/homepage`
- 调整现有后台接口
  - `/dashboard` 改成新的统计项
  - `/applications` 切换到 `join_applications`
  - `/events/:id/registrations` 与 `/registrations/:id` 使用新审核字段
- 权限收敛
  - `dashboard.read`
  - `page.manage`
  - `article.read`
  - `article.write`
  - `article.publish`
  - `branch.manage`
  - `member.manage`
  - `event.manage`
  - `registration.review`
  - `application.review`
  - `asset.manage`
  - `staff.manage`
  - `role.manage`
  - `audit_log.read`
- 仪表盘统计调整
  - 文章总数
  - 活动总数
  - 申请总数
  - 待审核申请数
  - 待审核报名数
  - 系统健康状态
  - 当前版本号

完成标准：

- 后台 8 个模块均有对应 API 支撑
- API 鉴权与角色矩阵与 `docs/auth-and-permission.md` 一致

## 4.5 Wave 5：后台页面信息架构切换

目标：把后台控制台改到用户已经确认的 8 模块结构。

涉及文件：

- `apps/admin/src/router.ts`
- `apps/admin/src/lib/navigation.ts`
- `apps/admin/src/views/*`
- `apps/admin/src/lib/api.ts`

具体任务：

- 保留并继续使用
  - `DashboardPage.vue`
  - `ArticlesPage.vue`
  - `ArticleEditorPage.vue`
  - `EventsPage.vue`
  - `EventEditorPage.vue`
  - `EventRegistrationsPage.vue`
  - `ApplicationsPage.vue`
  - `ApplicationDetailPage.vue`
  - `StaffPage.vue`
  - `RolesPage.vue`
  - `AuditLogsPage.vue`
- 新增页面
  - `MembersPage.vue`
  - `MemberEditorPage.vue`
  - `BranchesPage.vue`
  - `BranchEditorPage.vue`
  - `SitePageEditorPage.vue`
  - `HomepagePage.vue`
- 从一级导航退场
  - `TopicsPage.vue`
  - `TopicEditorPage.vue`
  - `AssetsPage.vue`
  - `FeaturedBlocksPage.vue`
  - `SiteSettingsPage.vue`
- 信息架构调整
  - “成员”模块下承载成员列表、成员编辑、分会/董事会维护
  - “文章”或“站点内容”相关支持页下承载首页、加入页、关于页配置
  - 资源库可以保留，但应作为编辑器里的支持能力，不再作为当前产品的一线模块

完成标准：

- 后台导航与 `docs/route-map.md` 一致
- 工作人员可完成文章、活动、申请、成员、分会/董事会、角色、审计相关操作

## 4.6 Wave 6：前台页面信息架构切换

目标：把公开站点从旧 `topics / cities` 导航切到新 7 模块。

涉及文件：

- `apps/site/src/lib/public-api.ts`
- `apps/site/src/components/SiteHeader.astro`
- `apps/site/src/pages/index.astro`
- `apps/site/src/pages/about.astro`
- `apps/site/src/pages/apply.astro`
- 新页面：`apps/site/src/pages/branches/index.astro`
- 新页面：`apps/site/src/pages/members/index.astro`
- 新页面：`apps/site/src/pages/members/[slug].astro`
- 新页面：`apps/site/src/pages/join.astro`

具体任务：

- 更新前台 API 调用函数
  - `listBranches`
  - `listMembers`
  - `getMember`
  - `getJoinPage`
  - `getAboutPage`
  - `submitJoinApplication`
- 改造现有页面
  - `/` 首页结构对齐新的 `HomePayload`
  - `/about` 改为组织形式、活动形式、加入方式说明
  - `/apply` 改为正式加入申请表
- 新增页面
  - `/branches`
  - `/members`
  - `/members/[slug]`
  - `/join`
- 旧页面退场顺序
  - 先从导航移除 `/topics` 与 `/cities`
  - 新页面稳定后，再删除 `apps/site/src/pages/topics/*`
  - 新页面稳定后，再删除 `apps/site/src/pages/cities/*`

完成标准：

- 前台导航只暴露当前 7 个模块
- 页面表达与目标站参考方向一致
- 活动报名、加入申请都可在本地完整跑通

## 4.7 Wave 7：测试、验收与旧原型退场

目标：确保新主线真正闭环，而不是只改页面名字。

涉及文件：

- `apps/api/test/integration/api.integration.test.ts`
- `apps/site` 测试文件
- `apps/admin` 测试文件
- `tests/e2e` 或现有 Playwright 用例

具体任务：

- API 集成测试改造
  - 分会列表
  - 成员列表与详情
  - 加入申请提交
  - 活动开放报名与后台审核
  - 后台成员与分会维护
  - 页面内容配置
- 后台测试改造
  - 新导航权限显示
  - 成员、分会、申请、报名审核流程
- 前台测试改造
  - 首页渲染
  - `/branches`
  - `/members`
  - `/join`
  - `/apply`
- 旧原型退场
  - 当前台不再依赖 `/topics`、`/cities` 后，再删除其页面、DTO、API 与种子数据
  - 保留旧 `topic-cover`、`city-cover` 资产类型读取兼容，等历史数据完成迁移后再物理退场

完成标准：

- 新主线通过 `typecheck`、`build`、关键 API 测试与关键页面 smoke test
- 旧原型只在明确无人依赖时才删除

## 5. 建议的实际施工顺序

推荐严格按以下顺序推进：

1. `packages/shared`
2. `packages/db`
3. `apps/api`
4. `apps/admin`
5. `apps/site`
6. 测试与旧原型退场

原因：

- 共享契约不稳定，前后台都会反复返工
- schema 未落地，API 只能继续围绕旧模型打补丁
- API 未稳定，前后台页面改动会不断重写

## 6. 本文档的使用方式

从现在开始，实施阶段应同时参考 3 份文档：

- `docs/schema-adjustment-checklist.md`
- `docs/api-dto-adjustment-checklist.md`
- `docs/implementation-transition-backlog.md`

职责划分：

- `schema-adjustment-checklist.md` 负责回答“库怎么改”
- `api-dto-adjustment-checklist.md` 负责回答“契约怎么改”
- `implementation-transition-backlog.md` 负责回答“具体先改哪些文件、按什么顺序改”
