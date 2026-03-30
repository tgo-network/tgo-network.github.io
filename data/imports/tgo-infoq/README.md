# TGO InfoQ 导入数据

本目录保存从 `https://tgo.infoq.cn/` 抓取并整理后的结构化数据，当前覆盖：

- `branches.json`：分会与董事会成员数据
- `events.json`：活动列表与详情数据
- `summary.json`：抓取摘要、耗时与下载统计

对应本地图片下载目录为：

- `apps/site/public/imports/tgo-infoq/`

常用命令：

```bash
npm run data:fetch:tgo-infoq
npm run db:import:tgo-infoq
```

说明：

- JSON 文件适合提交到仓库，便于后续正式部署时重复利用
- 图片文件默认只保存在本地，不纳入 git；如需重新生成，可再次执行抓取命令
- `npm run db:import:tgo-infoq` 会把当前抓取结果 upsert 到现有数据库；如希望前台只看到这批官方抓取活动，建议在干净数据库中导入，或先清理本地已有的演示/测试活动数据
- 数据来源为用户指定的公开页面：`/we/branches` 与 `/event`
