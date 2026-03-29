# TGO Network 媒体与对象存储设计

## 1. 目的

本文档定义：

- 哪些资源应该进对象存储
- 哪些信息应该进数据库
- 上传流程如何受 API 控制

## 2. 设计原则

- 文件二进制放对象存储
- 文件元数据与业务引用放 PostgreSQL
- 前端不直持长期存储密钥
- 资源引用统一使用内部 `asset_id`
- 不把业务记录写死为特定云厂商 URL

## 3. 当前版本需要对象存储的内容

当前版本主要需要存储的都是公开展示图片：

- 首页主视觉图
- 首页精选卡片图
- 分会封面图
- 董事会成员头像
- 成员头像
- 文章封面图
- 文章正文插图
- 活动海报
- 活动嘉宾或议程配图

当前版本通常不需要对象存储的内容：

- 成员列表文本信息
- 分会介绍文本
- 文章正文结构数据
- 活动时间地点等结构化字段
- 加入申请表单数据本身
- 角色权限与审计记录

## 4. 元数据模型

使用 `assets` 表作为资源元数据中心。

建议至少保存：

- `id`
- `storage_provider`
- `bucket`
- `object_key`
- `visibility`
- `asset_type`
- `mime_type`
- `byte_size`
- `width` nullable
- `height` nullable
- `original_filename`
- `alt_text` nullable
- `uploaded_by_staff_id`
- `status`
- `created_at`
- `updated_at`

## 5. 资源类型建议

当前阶段后台上传入口推荐使用：

- `site-banner`
- `branch-cover`
- `member-avatar`
- `article-cover`
- `article-inline`
- `event-poster`
- `speaker-avatar`
- `application-attachment`
- `generic-file`

兼容说明：

- 历史资产记录里仍可能存在 `topic-cover`、`city-cover`
- 当前上传入口不再暴露这两类旧类型，但读取与展示仍应保持兼容

这些类型可以驱动：

- 上传限制
- UI 标签
- 预览规则
- 未来清理策略

## 6. 可见性模型

当前版本以公开图片为主，建议先保留两种可见性：

- `public`
- `private`

当前实际高频使用：

- 首页图、分会图、成员头像、文章图、活动图：`public`

为后续预留：

- 内部材料或敏感附件：`private`

## 7. 对象键策略

推荐格式：

```text
{env}/{domain}/{asset-type}/{yyyy}/{mm}/{asset-id}-{slugified-name}.{ext}
```

示例：

```text
prod/content/member-avatar/2026/03/uuid-zhang-san.webp
```

这样做的好处：

- 环境隔离清晰
- 便于问题排查
- 避免重名冲突

## 8. 上传流

推荐流转：

1. 后台向 API 请求上传意图
2. API 校验权限、资源类型、文件大小与 MIME
3. API 返回签名上传信息
4. 前端直传对象存储
5. 前端调用完成接口
6. API 校验对象存在并落库 `assets`
7. 业务表保存 `asset_id` 引用

这样做的好处：

- 权限控制集中在 API
- 前端不需要长期存储密钥
- 更换对象存储服务时无需改业务表结构

## 9. 校验规则

当前阶段至少校验：

- 文件大小
- MIME 类型
- 扩展名
- 资源类型是否允许
- 图片尺寸元数据是否合理

当前建议允许：

- `image/jpeg`
- `image/png`
- `image/webp`

当前建议拒绝：

- 可执行文件
- 未知二进制类型
- 超大图片
- 与资源类型不匹配的 MIME

## 10. 安全规则

- 上传签名必须短时有效
- 上传接口必须要求工作人员身份
- 业务记录里只保存 `asset_id`，不硬编码供应商 URL
- 公开 URL 应由资源元数据在运行时推导

## 11. 删除策略

当前建议：

- 先做归档，不做立即物理删除
- 真正删除对象存储文件应作为受控运维动作

理由：

- 防止误删后导致公开页面瞬间失图
- 便于后续实现引用检查与恢复

## 12. 当前阶段范围

当前阶段必须支持：

- 首页图片上传
- 分会封面图上传
- 董事会成员头像上传
- 成员头像上传
- 文章封面与正文插图上传
- 活动海报上传
- 元数据落库与回显

当前阶段可以暂缓：

- 图片裁剪工作流
- 多尺寸变体
- 去重与压缩流水线
- 生命周期自动清理
- 面向公开用户的文件上传
