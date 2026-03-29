# TGO Network 认证与权限设计

## 1. 目的

本文档定义：

- 成员、工作人员、非成员申请人的身份边界
- 谁可以登录后台
- 登录后如何识别工作人员身份
- 成员如何在前台使用身份能力
- 各后台模块如何做权限控制
- 未来手机号登录如何在不推翻架构的前提下接入

## 2. 设计原则

- 认证与授权是两层问题
- `Better Auth` 负责身份认证与会话
- 应用自己的表负责成员身份、工作人员资格与权限
- 前端路由守卫只能改善体验，不能替代后端鉴权
- 未来手机号登录只能扩展现有身份体系，不能重建用户体系

## 3. 参与者类型

### 非成员访客

- 不需要登录
- 可以浏览公开内容
- 可以提交加入申请

### 申请人

- 当前还不是正式成员
- 可以提交加入申请
- 审核通过后可被转化为正式成员

### 成员

- 业务上的正式成员身份
- 在前台查看成员侧信息
- 在前台报名参加活动
- 当前阶段不要求成员登录
- 不是后台工作人员角色

### 工作人员

- 已登录用户
- 存在有效 `staff_account`
- 拥有至少一个角色
- 能进入后台并执行被授权操作

注意：

- 工作人员是后台准入身份
- 工作人员角色只用于后台 RBAC
- 工作人员可以同时也是成员

### 超级管理员

- 最高权限内部角色
- 可管理工作人员、角色、权限、系统级配置

## 4. Better Auth 负责什么

Better Auth 负责：

- 邮箱密码登录
- 会话签发与校验
- 密码重置
- 未来手机号 OTP 登录
- 未来第三方登录（如需要）

Better Auth 不负责：

- 谁是正式成员
- 谁是工作人员
- 谁能审核申请
- 谁能编辑活动
- 谁能查看审计日志

这些都必须由业务表和中间件决定。

## 5. 当前登录流

### 工作人员登录

1. 用户通过邮箱密码登录
2. Better Auth 生成会话
3. API 加载对应 `staff_account`
4. API 加载角色与权限
5. `apps/admin` 依据权限渲染导航
6. 所有写操作再由 API 二次校验权限

### 工作人员退出

- Better Auth 注销会话
- 清理 Cookie
- 后台跳回登录页

### 公开表单

当前阶段：

- 加入申请无需登录
- 非成员可直接提交加入申请
- 活动报名当前也无需成员登录
- 是否符合活动要求，由工作人员在后台审核确认

## 6. 工作人员接入模型

这里必须区分两套概念：

- 人的业务身份
  - 非成员访客
  - 申请人
  - 成员
  - 工作人员
- 工作人员权限角色
  - `super_admin`
  - `content_editor`
  - `event_manager`
  - 等后台 RBAC 角色

重要规则：

- “成员”不是后台 `role`
- “申请人”不是后台 `role`
- 后台“角色”菜单只管理工作人员权限
- 成员前台能力应由成员域规则决定，不由后台角色决定
- 当前版本成员体系不引入认证机制

认证成功不代表拥有后台权限。

后台准入必须同时满足：

- `users` 中存在该用户
- `staff_accounts` 中存在对应记录
- `staff_accounts.status = active`
- 至少绑定一个有效角色

建议状态：

- `invited`
- `active`
- `suspended`
- `disabled`

## 7. 权限码设计

推荐使用 `resource.action` 形式：

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

## 8. 推荐角色集合

当前建议至少提供这些系统角色：

- `super_admin`
- `content_editor`
- `event_manager`
- `member_manager`
- `reviewer`
- `auditor`
- `media_manager`

一个工作人员可以绑定多个角色。

## 9. 当前角色矩阵

| 权限 | super_admin | content_editor | event_manager | member_manager | reviewer | auditor |
| --- | --- | --- | --- | --- | --- | --- |
| `dashboard.read` | yes | yes | yes | yes | yes | yes |
| `page.manage` | yes | yes | no | no | no | no |
| `article.read` | yes | yes | no | no | yes | yes |
| `article.write` | yes | yes | no | no | no | no |
| `article.publish` | yes | yes | no | no | no | no |
| `branch.manage` | yes | no | no | yes | no | no |
| `member.manage` | yes | no | no | yes | no | no |
| `event.manage` | yes | no | yes | no | no | no |
| `registration.review` | yes | no | yes | no | no | no |
| `application.review` | yes | no | no | no | yes | no |
| `asset.manage` | yes | yes | yes | yes | no | no |
| `staff.manage` | yes | no | no | no | no | no |
| `role.manage` | yes | no | no | no | no | no |
| `audit_log.read` | yes | no | no | no | no | yes |

说明：

- 如果团队规模小，可以先只启用 `super_admin`、`content_editor`、`event_manager`、`reviewer`
- `member_manager` 用于成员和分会董事会维护
- `auditor` 适合只读审计场景
- `media_manager` 可单独负责资源上传与维护

## 10. 权限执行路径

每个受保护请求都遵循同一条链路：

1. 校验会话
2. 加载用户
3. 加载 `staff_account`
4. 校验工作人员状态是否可用
5. 解析有效角色与权限
6. 校验目标接口所需权限
7. 执行业务逻辑
8. 对敏感写操作写入审计日志

重要规则：

- 后台隐藏按钮只是 UX
- 真正的拒绝必须发生在 API 层

## 11. 资源级授权

当前阶段可以先使用角色级权限，不必一开始就设计过于复杂的资源级策略。

未来再按需要引入：

- 某活动运营仅能管理自己负责的分会活动
- 某成员运营仅能维护自己负责分会的成员
- 某审核员仅能处理指定申请池

当前不要为了未来可能的复杂场景而过度建模。

## 12. 工作人员创建与维护

当前建议流程：

- 先手工或脚本创建第一个 `super_admin`
- 后续由超级管理员在后台创建或激活工作人员
- 如邮箱尚不存在，先在 Better Auth 侧创建用户
- 再创建 `staff_account` 并绑定角色

## 12.1 成员与工作人员的关系

推荐默认模型：

- `members` 表示成员身份
- `staff_accounts` 表示后台准入资格
- `users` 当前主要服务于工作人员认证

当前按完全分离处理：

- 不假设成员一定有工作人员账号
- 不假设工作人员一定是成员
- 不建立默认的成员-工作人员映射关系
- 如果未来业务明确需要跨域关联，再单独设计显式关联机制

## 13. 审计要求

至少应审计以下操作：

- 文章发布/归档
- 活动发布/归档
- 活动报名审核
- 加入申请审核
- 成员资料关键修改
- 分会与董事会维护
- 工作人员创建、状态变更、角色变更
- 角色权限变更
- 首页、加入页、关于页配置变更

## 14. 未来手机号登录

手机号登录应作为现有身份体系的一种补充登录方式，而不是新建第二套用户表。

规则：

- `user.id` 必须保持稳定
- 手机号以标准化格式存储，如 `E.164`
- 验证状态写入 `phone_verified_at`
- OTP 验证成功后，仍然回到同一会话模型
- 工作人员权限仍由 `staff_accounts` 与角色表决定

推荐未来流程：

1. 用户输入手机号
2. 系统通过短信服务商发送 OTP
3. Better Auth 验证 OTP
4. 找到现有用户或按策略创建用户
5. 建立会话

## 15. 当前明确不做的内容

- 面向普通成员的权限中心
- SSO
- 多租户组织权限树
- 复杂策略编排器
- 细粒度 ABAC 引擎
