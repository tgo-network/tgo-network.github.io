# 前台代码审核记录（2026-04-07）

## 审核范围

- 前台应用：`apps/site`
- 审核方式：静态代码审查 + 本地构建/测试验证
- 参考约束：`docs/system-architecture.md`、`docs/route-map.md`

## 执行记录

已执行以下命令：

```bash
env COREPACK_HOME="$PWD/.corepack" corepack pnpm --filter @tgo/site test
env COREPACK_HOME="$PWD/.corepack" corepack pnpm --filter @tgo/site typecheck
env COREPACK_HOME="$PWD/.corepack" corepack pnpm --filter @tgo/site build
```

结果：

- `test` 通过
- `typecheck` 通过
- `build` 通过，但构建产物暴露出若干实现层问题

## 主要问题

### 1. [高] 未配置公共 API 地址时，前台表单会直接指向本地 `localhost`，生产环境会出现“页面可打开但提交必失败”

涉及位置：

- `apps/site/src/lib/public-api.ts:52`
- `apps/site/src/pages/join.astro:74`
- `apps/site/src/pages/join.astro:148`
- `apps/site/src/pages/events/[slug].astro:168`
- `apps/site/src/pages/events/[slug].astro:257`

现象：

- `getConfiguredApiBaseUrl()` 在没有显式配置 `PUBLIC_API_BASE_URL` 时，会回退到 `http://127.0.0.1:8787`
- `/join` 与活动报名页会把这个值直接写入构建后的 HTML `data-api-base`
- 本次本地构建后的静态产物中，已经能看到 `data-api-base="http://localhost:8787"` / `"http://127.0.0.1:8787"` 这类值被直接输出到页面

风险：

- 如果部署时漏配 `PUBLIC_API_BASE_URL`，用户看到的前台页面虽然正常打开，但“加入申请 / 活动报名”会直接向访问者自己的本机地址发请求，提交一定失败
- 由于代码同时对公共读取接口做了静默 fallback，这类配置错误不会在构建阶段暴露出来，容易把“可浏览但不可提交”的版本发布出去
- 这和 `docs/system-architecture.md:114` 中“报名与申请表：页面可静态，提交必须走 API”的约束相冲突

建议：

- 将 `PUBLIC_API_BASE_URL` 设为必填的构建配置，对 `/join` 与报名页在缺配置时直接构建失败
- 至少在生产构建中禁用 localhost 默认值
- 读取接口可以保留本地开发 fallback，但写接口不应默默降级到本机地址

### 2. [高] 成员/活动列表把全量数据内联进 HTML，再靠前端脚本做分页筛选，导致页面过重且无 JS 时只能看到前 12 条

涉及位置：

- `apps/site/src/pages/members/index.astro:6`
- `apps/site/src/pages/members/index.astro:95`
- `apps/site/src/pages/events/index.astro:9`
- `apps/site/src/pages/events/index.astro:109`
- `apps/site/src/pages/members/[slug].astro:6`
- `apps/site/src/pages/events/[slug].astro:8`
- `docs/system-architecture.md:112`
- `docs/system-architecture.md:121`

现象：

- 成员列表页在服务端先拉全量成员，再通过 `define:vars` 把整份 `members` 数据序列化到页面脚本里
- 活动列表页同样把整份 `events` 数据内联到页面脚本里，再用 `innerHTML` 进行客户端重绘
- 页面初始 HTML 只渲染前 12 条，翻页按钮是 `button` 而不是可访问的分页链接；禁用 JS 时用户无法继续浏览剩余内容
- 这与 `docs/system-architecture.md:112` 中“成员列表：支持服务端分页或按需渲染，避免大规模静态生成压力”以及 `docs/system-architecture.md:121` 中“仅在必要处使用 Astro islands 或客户端交互”不一致

本次构建的量化结果：

- `apps/site/dist/events/index.html`：`948226` bytes
- `apps/site/dist/members/index.html`：`272039` bytes
- `apps/site/dist/events/` 共生成 `1498` 个 `index.html`
- `apps/site/dist/members/` 共生成 `1216` 个 `index.html`

风险：

- 首屏 HTML 负载明显偏大，影响页面打开速度、缓存效率和搜索抓取成本
- 列表页的分页/筛选完全依赖浏览器脚本，不符合公开站点“低 JS、SEO 友好”的目标
- 数据量继续增长后，构建时间、构建内存和产物体积会继续线性上升

建议：

- 把成员/活动列表改回服务端分页或 URL 驱动分页
- 前台只渲染当前页数据，筛选条件通过查询参数传递，不再内联全量数组
- 保留轻量交互增强，但基础浏览能力应在无 JS 下可用

### 3. [中] `/about` 页面绕过公共内容 API，后台更新 about 页面后前台不会生效

涉及位置：

- `apps/site/src/pages/about.astro:3`
- `apps/site/src/lib/official-content.ts:72`
- `apps/site/src/lib/public-api.ts:300`
- `apps/api/src/routes/public.ts:244`
- `docs/route-map.md:39`

现象：

- API 已经提供 `GET /api/public/v1/about`，且前台也存在 `getAboutPage()` 数据访问函数
- 但 `apps/site/src/pages/about.astro` 没有走 API，而是直接读取 `apps/site/src/lib/official-content.ts` 里的硬编码文案和图片
- `docs/route-map.md:39` 明确把 `/about` 的数据来源定义为 `about` 页面内容 API

风险：

- 后台如果更新 `about` 页面内容，前台不会反映这次修改
- 实际运行链路与文档、API、后台能力脱节，容易造成“后台改了但线上没变”的运营问题
- 后续 about 页面国际化、版本管理、审核发布都会被前台硬编码阻断

建议：

- 让 `apps/site/src/pages/about.astro` 改为优先消费 `getAboutPage()`
- `official-content.ts` 只保留开发 fallback，或者迁移为演示数据，不再作为主数据源

### 4. [中] 活动已关闭或未开放时，报名区仍显示“开放报名，提交后由工作人员审核”这类错误文案

涉及位置：

- `apps/site/src/pages/events/[slug].astro:26`
- `apps/site/src/pages/events/[slug].astro:163`
- `apps/site/dist/events/event-1/index.html`

现象：

- 报名区标题和状态会根据 `registrationState` 变化
- 但说明文案 `开放报名，提交后由工作人员审核，并继续联系确认是否通过或转入候补。` 是写死的
- 对 `closed` / `not_open` 活动，这段文案与页面状态相互矛盾
- 本次构建的 `apps/site/dist/events/event-1/index.html` 已出现“状态显示报名已关闭，但报名区仍写开放报名”的实际输出

风险：

- 用户会被误导，以为仍可继续提交或等待审核
- 会降低页面可信度，尤其是在活动报名状态变更频繁时

建议：

- 根据 `registrationState` 生成对应文案
- 对 `closed` / `not_open` 状态直接显示说明文案，不再复用开放报名文案

### 5. [中] 前台仓库和构建产物直接承载大量导入图片，产物体积过大，偏离既定媒体策略

涉及位置：

- `apps/site/src/lib/imported-fallbacks.ts:152`
- `apps/site/src/lib/imported-fallbacks.ts:191`
- `apps/site/astro.config.mjs:5`
- `docs/system-architecture.md:245`
- `docs/system-architecture.md:258`

现象：

- 代码会把导入内容解析到 `apps/site/public/imports` 和 `apps/site/public/mirrors` 下的本地静态资源
- 当前站点仍以 `output: "static"` 构建，所有这些资源会直接进入站点产物
- 本次检查结果：
  - `apps/site/public/imports`：约 `1.3G`
  - `apps/site/public/mirrors`：约 `71M`
  - `apps/site/dist`：约 `1.7G`

风险：

- 前端构建产物过大，会显著拉长 CI、发布和回滚时间
- 静态托管成本与缓存刷新成本都会上升
- `docs/system-architecture.md:258` 已明确要求“二进制文件存 S3”，当前实现与目标架构不一致

建议：

- 把导入图片迁移到对象存储，仅在数据库/API 中返回元数据与访问地址
- 对前台保留必要缩略图和极少量品牌素材，避免继续把大批历史内容镜像进站点静态目录

## 总结

这次前台审核里，最优先处理的是两个问题：

1. 表单请求对 `localhost` 的默认回退，必须避免把不可提交的静态站点发布出去
2. 成员/活动列表当前的全量内联方案，需要尽快改回分页/按需加载，否则页面体积和构建压力会继续上升

其余问题（`/about` 内容链路断开、活动报名文案误导、媒体资源进入静态产物）也建议尽快列入下一轮前台修正计划。
