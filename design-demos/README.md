# Design Demos

这个目录用于放置不影响当前 `apps/site` 的前台风格探索 demo。

当前包含四套静态方案：

- `official-network/`
  - 正式候选版，机构型科技社区官网方向
- `atlas-ink/`
  - 方案 A，东方克制型
- `summit-signal/`
  - 方案 B，全球科技峰会型
- `member-house/`
  - 方案 C，现代会所会员型

说明：

- 三套 demo 复用同一份内容骨架，只比较视觉方向
- 所有 demo 都是独立静态页面，不会改动当前 Astro 站点路由
- demo 页面使用 `apps/site/public/` 下的已有图片资源，因此建议从仓库根目录启动静态服务器进行预览

本地预览推荐直接使用仓库内置脚本：

```bash
npm run dev:demos
```

然后访问：

- `http://127.0.0.1:4311/design-demos/`
- `http://127.0.0.1:4311/design-demos/official-network/`
- `http://127.0.0.1:4311/design-demos/atlas-ink/`
- `http://127.0.0.1:4311/design-demos/summit-signal/`
- `http://127.0.0.1:4311/design-demos/member-house/`

注意：

- 不要直接双击 `html` 文件用 `file://` 打开，否则模块脚本和图片路径不会正常工作
- 这个预览脚本会从仓库根目录提供静态文件，确保 `design-demos/` 与 `apps/site/public/` 下的图片资源都能正常访问
