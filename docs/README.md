# 文档索引

本目录收录 TGO 风格平台的规划与设计文档。

当前版本的产品范围已经收敛为一条明确主线：

- 前台聚焦 7 个公开模块：首页、分会董事会、成员列表/详情、活动、文章、加入申请、关于我们
- 后台聚焦 8 个运营模块：仪表盘、文章、活动、申请、成员、工作人员、角色、审计日志
- 技术架构保持不变：`Astro` + `Vue + Vite` + `Hono` + `PostgreSQL` + `Better Auth` + `S3`

建议阅读顺序：

1. `system-architecture.md`
2. `benchmark-tgo-site.md`
3. `mvp-scope.md`
4. `route-map.md`
5. `data-model.md`
6. `schema-adjustment-checklist.md`
7. `auth-and-permission.md`
8. `api-design.md`
9. `api-dto-adjustment-checklist.md`
10. `content-workflow.md`
11. `media-storage.md`
12. `implementation-roadmap.md`
13. `implementation-transition-backlog.md`
14. `local-development.md`
15. `testing-strategy.md`
16. `deployment-and-environments.md`
17. `operations-runbook.md`

各文档职责：

- `system-architecture.md`
  - 高层技术架构、边界和不变约束
- `benchmark-tgo-site.md`
  - 目标站拆解、差距分析、产品校准依据
- `mvp-scope.md`
  - 当前阶段功能边界、阶段划分、非目标范围
- `route-map.md`
  - 前台/后台路由、信息架构、渲染方式
- `data-model.md`
  - 核心实体、关系、状态字段、建模约束
- `schema-adjustment-checklist.md`
  - 数据库迁移顺序、增量加表、旧表退场与兼容策略
- `auth-and-permission.md`
  - 成员 / 工作人员 / 申请人身份边界、后台权限、未来手机号登录路径
- `api-design.md`
  - 公共 API、后台 API、内部 API 的分组与契约方向
- `api-dto-adjustment-checklist.md`
  - 共享 DTO、API 路由、导航常量的改造顺序与退场计划
- `content-workflow.md`
  - 首页、分会、成员、文章、活动、单页的发布规则
- `media-storage.md`
  - 对象存储职责、上传流、元数据边界
- `implementation-roadmap.md`
  - 当前实施阶段、里程碑和下一步执行顺序
- `implementation-transition-backlog.md`
  - 将当前范围收敛结果映射到实际代码目录、文件与施工波次
- `local-development.md`
  - 本地启动、基础设施、验证命令
- `testing-strategy.md`
  - 测试层次、关键用例、里程碑质量门槛
- `deployment-and-environments.md`
  - 环境拆分、运行时配置、部署边界
- `operations-runbook.md`
  - 发版、回滚、备份恢复、上线巡检

当前优先确认链路：

1. 先冻结功能范围
2. 再冻结路由与信息架构
3. 再冻结数据模型与 API 边界
4. 最后进入实现与测试收敛

实施阶段记录：

- `site-content-layout-phase-1.md`
  - 前台 7 个公开页面的内容收敛与信息结构整理
- `site-visual-polish-phase-1.md`
  - 全局视觉基础、通用卡片与交互反馈统一
- `site-visual-polish-phase-2.md`
  - `about` / `join` / `branches` 的页面级节奏统一与可用性补强
- `site-visual-polish-phase-3.md`
  - 首页节奏优化，以及成员 / 活动 / 文章详情页的 typography 与侧栏收尾
