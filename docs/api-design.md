# TGO Network API 设计草案

## 1. 目的

本文档用于明确前台、后台与后端之间的接口边界，避免：

- 前后台各自猜测数据结构
- 权限逻辑散落在多个应用里
- 未来切换部署平台时 API 契约跟着变形

## 2. 设计原则

- 所有业务数据都通过 API 层流转
- 公开 API 与后台 API 按访问意图拆分
- Better Auth 挂载在独立的认证路由下
- DTO、校验规则与错误码应由 monorepo 共享
- 写接口必须先校验输入，再校验权限，再执行业务

## 3. URL 分组

推荐保持以下结构：

- `/api/public/v1/*`
- `/api/admin/v1/*`
- `/api/internal/v1/*`
- `/api/auth/*`

说明：

- `public` 供 `apps/site` 和公开表单使用
- `public` 主要服务前台页面与公开提交能力
- `admin` 供 `apps/admin` 使用
- `internal` 供定时任务或受信内部调用使用
- `auth` 由 Better Auth 挂载

## 4. 通用传输规则

- 默认使用 JSON
- 编码使用 UTF-8
- 标识符使用 `UUID`
- 时间使用 ISO 8601
- 统一返回标准 HTTP 状态码

推荐成功响应：

```json
{
  "data": {},
  "meta": {}
}
```

推荐错误响应：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数不合法",
    "details": {}
  }
}
```

## 5. 通用查询约定

列表接口建议支持：

- `page`
- `pageSize`
- `q`
- `status`
- `sort`
- `order`

当前项目常用的额外筛选字段：

- `branchId`
- `branchSlug`
- `city`
- `featured`

## 6. 公开 API

### 6.1 站点基础配置

- `GET /api/public/v1/site-config`
  - 返回站点名称、导航、页脚、基础联系信息
- `GET /api/public/v1/home`
  - 返回首页区块数据，如 Hero、介绍、指标、精选活动、精选文章、加入 CTA

### 6.2 分会董事会

- `GET /api/public/v1/branches`
  - 返回公开分会列表及董事会成员摘要
- `GET /api/public/v1/branches/:slug`
  - 预留分会详情接口；即使当前前台不单独开放页面，也建议保留能力

### 6.3 成员

- `GET /api/public/v1/members`
  - 返回公开成员列表
  - 建议支持 `page`、`pageSize`、`q`、`branchSlug`、`city`
- `GET /api/public/v1/members/:slug`
  - 返回成员详情

补充原则：

- 成员资料展示是前台成员域能力
- 是否允许非成员查看全部成员信息，应由 `visibility` 或页面策略决定
- 这里的“成员”不是后台工作人员角色

### 6.4 活动

- `GET /api/public/v1/events`
  - 返回公开活动列表
  - 建议支持 `page`、`pageSize`、`branchSlug`、`city`、`upcoming`
- `GET /api/public/v1/events/:slug`
  - 返回活动详情、议程、报名状态
- `POST /api/public/v1/events/:eventId/registrations`
  - 活动报名

当前报名建议字段：

- `name`
- `phoneNumber`
- `wechatId` optional
- `email` optional
- `company` optional
- `title` optional
- `note` optional

活动报名规则建议补充：

- 当前阶段活动报名统一采用开放提交
- 报名人是否符合活动要求，由工作人员在后台审核确认
- 这样可以避免在 MVP 阶段引入成员认证复杂度

### 6.5 文章

- `GET /api/public/v1/articles`
  - 返回公开文章列表
- `GET /api/public/v1/articles/:slug`
  - 返回文章详情

当前文章 DTO 应收敛到当前公开站主线：

- 列表至少包含
  - `slug`
  - `title`
  - `excerpt`
  - `publishedAt`
  - `authorName`
  - `coverImage`
  - `branch`
- 详情至少包含
  - 列表全部字段
  - `body`
  - `author`

说明：

- 当前公开文章接口不再以 `topicSlugs`、`citySummary` 作为前台主结构
- 如底层 schema 仍保留旧字段，应仅作为兼容实现细节，不应继续外扩到当前前台契约

### 6.6 加入申请

- `GET /api/public/v1/join`
  - 返回加入说明页内容，包括申请条件、流程、FAQ、权益等
- `POST /api/public/v1/join-applications`
  - 提交加入申请

当前表单字段至少包含：

- `name`
- `phoneNumber`
- `wechatId`
- `email`
- `introduction`
- `applicationMessage`
- `targetBranchId` optional

### 6.7 关于我们

- `GET /api/public/v1/about`
  - 返回关于我们页内容

### 6.8 公开接口规则

- 只能返回已发布内容
- 草稿、归档内容不得泄露到公开接口
- 公开写接口必须做限流和输入校验
- 公开写接口建议记录 `requestId`、IP、User-Agent
- 成员相关前台能力不得复用后台 `role` 作为判断依据
- 当前阶段活动报名不依赖成员认证

## 7. 后台 API

所有后台接口都要求：

- 有效会话
- 有效 `staff_account`
- 满足对应权限码

这里的后台 `roles` 只服务于工作人员 RBAC，不参与成员身份判断。

### 7.1 当前用户

- `GET /api/admin/v1/me`
  - 返回当前工作人员、角色、权限

### 7.2 仪表盘

- `GET /api/admin/v1/dashboard`
  - 返回文章总数、活动总数、申请数量、系统状态摘要

建议返回字段：

- `articleCount`
- `eventCount`
- `applicationCount`
- `pendingApplicationCount`
- `pendingRegistrationCount`
- `systemHealth`
- `appVersion`

### 7.3 文章管理

- `GET /api/admin/v1/articles`
- `POST /api/admin/v1/articles`
- `GET /api/admin/v1/articles/:id`
- `PATCH /api/admin/v1/articles/:id`
- `POST /api/admin/v1/articles/:id/publish`
- `POST /api/admin/v1/articles/:id/archive`

当前阶段补充约束：

- 文章发布主线只要求标题、摘要、正文、作者与发布状态
- 旧 `topic / city` 关联字段如果仍存在于历史模型中，应视为兼容字段，而不是当前主线必填项

### 7.4 活动管理

- `GET /api/admin/v1/events`
- `POST /api/admin/v1/events`
- `GET /api/admin/v1/events/:id`
- `PATCH /api/admin/v1/events/:id`
- `POST /api/admin/v1/events/:id/publish`
- `POST /api/admin/v1/events/:id/archive`

### 7.5 活动报名审核

- `GET /api/admin/v1/events/:id/registrations`
- `GET /api/admin/v1/registrations/:id`
- `PATCH /api/admin/v1/registrations/:id`

`PATCH` 至少支持修改：

- `status`
- `reviewNotes`

并自动写入：

- `reviewedAt`
- `reviewedByStaffId`

### 7.6 加入申请审核

- `GET /api/admin/v1/applications`
- `GET /api/admin/v1/applications/:id`
- `PATCH /api/admin/v1/applications/:id`

`PATCH` 至少支持修改：

- `status`
- `reviewNotes`

### 7.7 成员域管理

成员模块除了成员本身，还需要承接分会与董事会维护能力。

成员接口：

- `GET /api/admin/v1/members`
- `POST /api/admin/v1/members`
- `GET /api/admin/v1/members/:id`
- `PATCH /api/admin/v1/members/:id`

成员接口应允许维护：

- 基本公开资料
- `membershipStatus`
- 公开可见性

分会接口：

- `GET /api/admin/v1/branches`
- `POST /api/admin/v1/branches`
- `GET /api/admin/v1/branches/:id`
- `PATCH /api/admin/v1/branches/:id`

董事会接口：

- `GET /api/admin/v1/branches/:id/board-members`
- `PUT /api/admin/v1/branches/:id/board-members`

说明：

- 这些接口可以在后台的“成员”一级菜单下实现
- 不要求额外新增“分会”一级菜单

### 7.8 工作人员与角色权限

- `GET /api/admin/v1/staff`
- `POST /api/admin/v1/staff`
- `GET /api/admin/v1/staff/:id`
- `PATCH /api/admin/v1/staff/:id`
- `GET /api/admin/v1/roles`
- `GET /api/admin/v1/roles/:id`
- `PATCH /api/admin/v1/roles/:id`

### 7.9 审计日志

- `GET /api/admin/v1/audit-logs`

每条记录至少应包含：

- `action`
- `targetType`
- `targetId`
- 操作人
- `requestId`
- 操作时间
- `beforeJson` optional
- `afterJson` optional

### 7.10 支撑性后台接口

为了支撑首页、单页与图片能力，建议保留下列接口，即使它们不在一级导航中单独出现：

- `GET /api/admin/v1/homepage`
- `PATCH /api/admin/v1/homepage`
- `GET /api/admin/v1/pages/:slug`
- `PATCH /api/admin/v1/pages/:slug`
- `GET /api/admin/v1/assets`
- `POST /api/admin/v1/assets/uploads`
- `POST /api/admin/v1/assets/uploads/complete`

说明：

- 当前阶段支持 `slug=join|about`
- `site-config` 由共享前台契约静态提供，暂不作为独立后台模块暴露

## 8. 内部 API

保留给定时任务或内部自动化调用。

当前建议至少保留：

- `POST /api/internal/v1/publish-scheduled-content`
  - 用于发布到点文章或活动

后续可扩展：

- `POST /api/internal/v1/revalidate-site`
- `POST /api/internal/v1/export-audit-report`

## 9. 认证 API

Better Auth 挂载在：

- `/api/auth/*`

当前后台登录主要使用邮箱密码。
未来如果增加手机号 OTP，应继续挂在同一认证体系中，而不是新增第二套身份 API。

补充说明：

- 当前认证主线以工作人员后台登录为主
- 成员体系与工作人员体系按分离模型处理
- 当前不为成员提供认证能力
- 如果未来要增加成员认证，应单独设计成员认证与成员校验机制

## 10. 兼容性与版本策略

- 当前版本以 `v1` 为主
- 如果旧原型中仍保留 `topics`、`cities` 等接口，应视为历史探索接口
- 在当前收敛版本里，不应继续扩张这些旧接口的范围
- 前后台契约变更时，优先更新 `packages/shared` 中的 DTO 与校验模型
