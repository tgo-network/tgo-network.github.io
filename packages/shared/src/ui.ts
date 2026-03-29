export const platformName = "TGO Network";
export const apiName = "@tgo/api";

export const publicNav = [
  {
    label: "首页",
    href: "/"
  },
  {
    label: "主题",
    href: "/topics"
  },
  {
    label: "文章",
    href: "/articles"
  },
  {
    label: "活动",
    href: "/events"
  },
  {
    label: "城市",
    href: "/cities"
  },
  {
    label: "申请",
    href: "/apply"
  },
  {
    label: "关于",
    href: "/about"
  }
] as const;

export const publicModules = [
  {
    name: "主题页",
    phase: "第二阶段",
    summary: "围绕已发布内容组织专题页与编辑型落地页，形成清晰的主题入口。"
  },
  {
    name: "文章",
    phase: "第二阶段",
    summary: "承载长文内容、SEO 元信息、主题关联以及面向城市的内容策展。"
  },
  {
    name: "活动",
    phase: "第二阶段",
    summary: "支持报名状态、议程信息以及后续签到能力的公开活动页面。"
  }
] as const;

export const adminModules = [
  {
    label: "仪表盘",
    to: "/dashboard",
    permission: "dashboard.read"
  },
  {
    label: "主题",
    to: "/topics",
    permission: "topic.manage"
  },
  {
    label: "文章",
    to: "/articles",
    permission: "article.read"
  },
  {
    label: "活动",
    to: "/events",
    permission: "event.manage"
  },
  {
    label: "资源",
    to: "/assets",
    permission: "asset.manage"
  },
  {
    label: "推荐位",
    to: "/featured-blocks",
    permission: "featured_block.manage"
  },
  {
    label: "设置",
    to: "/settings/site",
    permission: "settings.manage"
  },
  {
    label: "申请",
    to: "/applications",
    permission: "application.review"
  },
  {
    label: "员工",
    to: "/staff",
    permission: "staff.manage"
  },
  {
    label: "角色",
    to: "/roles",
    permission: "role.manage"
  },
  {
    label: "审计日志",
    to: "/audit-logs",
    permission: "audit_log.read"
  }
] as const;

export const implementationMilestones = [
  {
    code: "M0",
    title: "工作区脚手架",
    summary: "完成 monorepo 结构、共享包与基础应用外壳的搭建。"
  },
  {
    code: "M1",
    title: "后端基础",
    summary: "建立数据库模型、认证集成、权限中间件与种子数据。"
  },
  {
    code: "M2",
    title: "公开站 MVP",
    summary: "使用 Astro 通过公开 API 提供主题、文章、活动与城市页面。"
  },
  {
    code: "M3",
    title: "管理后台 MVP",
    summary: "基于受保护的管理 API 提供内容、活动、资源与申请管理能力。"
  },
  {
    code: "M4",
    title: "生产加固",
    summary: "补齐审计链路、运行时防护与上线前的运维准备。"
  },
  {
    code: "M5",
    title: "增长能力",
    summary: "继续扩展手机号 OTP、更丰富的运营工具以及上线后的产品能力。"
  }
] as const;
