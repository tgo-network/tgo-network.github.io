# Design Demos

这个目录用于放置不影响当前 `apps/site` 的前台风格探索 demo。

当前包含三套静态方案：

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

本地预览示例：

```bash
python3 -m http.server 4310
```

然后访问：

- `http://127.0.0.1:4310/design-demos/`
- `http://127.0.0.1:4310/design-demos/atlas-ink/`
- `http://127.0.0.1:4310/design-demos/summit-signal/`
- `http://127.0.0.1:4310/design-demos/member-house/`
