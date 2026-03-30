# 前台统一视觉精修（M3-2）

## 目标

在 `M3-1` 完成全局视觉基础补强后，本轮继续处理页面级差异，重点收敛以下三类问题：

- `about`、`join`、`branches` 三页与成员 / 活动 / 文章页的视觉节奏还不够统一
- 分会董事会页虽然信息完整，但“区域概览 -> 城市跳转 -> 分会展开”的阅读路径还不够清晰
- 交互元素已经具备 hover 反馈，但键盘焦点与部分大块卡片的精修仍有提升空间

## 本轮完成

### 1. 分会董事会页重新建立阅读层级

文件：`apps/site/src/pages/branches/index.astro`

- 把 Hero 改为左右双栏结构，补上“阅读方式”侧栏，让页面入口更接近成员 / 活动 / 文章页的组织方式
- 新增“区域覆盖”概览卡片，先从区域层面给出分会密度，再进入城市跳转与单个分会详情
- 强化分会卡片、展开摘要与董事会成员卡片的层次反馈，减少“纯列表堆叠感”
- 董事会成员卡片补上组织身份标签与公司信息拆分，让姓名、身份、公司三层信息更容易扫描

### 2. 关于我们与加入申请页节奏统一

文件：

- `apps/site/src/pages/about.astro`
- `apps/site/src/pages/join.astro`

主要调整：

- 为关键 section 补上说明文案，和成员 / 活动 / 文章页保持一致的“标题 + 解释”节奏
- `about` 页强化原则卡片、内容卡片、CTA 区的 hover 与版式一致性
- `join` 页把“参与形式”改成更适合阅读的双列布局，不再在桌面端压成过窄的四列卡片
- `join` 页补强 FAQ 分隔、说明卡片与申请表侧栏信息密度，使申请前说明和表单区块更连贯

### 3. 全局交互可用性补强

文件：`apps/site/src/styles/global.css`

- 为链接、按钮、`summary` 增加统一 `focus-visible` 样式
- 让前台在键盘导航场景下也能保持清晰的交互反馈，避免只优化鼠标悬停状态

## 当前结果

完成本轮后，前台公开站点的视觉语言已经从“首页和核心列表页先统一”进一步推进到“组织说明页、转化页、结构页也统一”。

当前最明显的收敛点包括：

- `branches` 页已经不再只是长列表，而是具备更明确的整体概览与逐层阅读路径
- `join` 页的信息解释、参与形式和表单区域更连贯，申请动作不再显得过早突兀
- `about` 页和其他核心页面在 section 节奏、CTA 层级和卡片反馈上更加一致
- 键盘焦点反馈补齐后，整站交互完整度更高

## 已完成验证

本轮改动后已重新通过以下验证：

- `npm run typecheck`
- `npm run build`
- `npm run test:site`
- `./node_modules/.bin/playwright test e2e/site.spec.ts`
- `./node_modules/.bin/playwright test e2e/screenshots.shots.ts --config=playwright.screenshots.config.ts --grep "capture public site screenshots"`

## 下一轮建议

如果继续进入下一轮视觉收尾，可以优先考虑：

1. 进一步优化首页长页面的节奏切换，减少连续卡片区块带来的疲劳感
2. 为文章 / 活动 / 成员详情页补一轮更细的 typography 与留白微调
3. 视需要为前台建立更系统的视觉 token（例如 section 间距、卡片层级、深浅面板语义）
