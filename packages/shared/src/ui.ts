export const platformName = "TGO 鲲鹏会";
export const apiName = "@tgo/api";

export const publicNav = [
  {
    label: "首页",
    href: "/"
  },
  {
    label: "分会董事会",
    href: "/branches"
  },
  {
    label: "成员列表",
    href: "/members"
  },
  {
    label: "活动",
    href: "/events"
  },
  {
    label: "文章",
    href: "/articles"
  },
  {
    label: "加入申请",
    href: "/join"
  },
  {
    label: "关于我们",
    href: "/about"
  }
] as const;

export const publicModules = [
  {
    name: "首页与组织介绍",
    phase: "当前范围",
    summary: "围绕 TGO 定位、覆盖人群、精彩活动与加入路径组织首页表达。"
  },
  {
    name: "分会与成员",
    phase: "当前范围",
    summary: "展示分会董事会、成员列表与成员详情，构建组织网络的公开结构。"
  },
  {
    name: "活动与加入",
    phase: "当前范围",
    summary: "活动详情支持开放报名，加入说明与申请表承接非成员转化路径。"
  }
] as const;

export const adminModules = [
  {
    label: "仪表盘",
    to: "/dashboard",
    permission: "dashboard.read"
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
    label: "申请",
    to: "/applications",
    permission: "application.review"
  },
  {
    label: "成员",
    to: "/members",
    permission: "member.manage"
  },
  {
    label: "工作人员",
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
    title: "公开站主线",
    summary: "使用 Astro 交付首页、分会、成员、活动、文章、加入申请与关于我们。"
  },
  {
    code: "M3",
    title: "管理后台 MVP",
    summary: "基于受保护的管理 API 提供文章、活动、申请、成员、工作人员与权限管理能力。"
  },
  {
    code: "M4",
    title: "生产加固",
    summary: "补齐审计链路、运行时防护、部署校验与上线前的运维准备。"
  },
  {
    code: "M5",
    title: "增长能力",
    summary: "继续扩展手机号 OTP、更丰富的运营工具以及上线后的产品能力。"
  }
] as const;
