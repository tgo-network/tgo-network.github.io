export const platformName = "TGO Network";
export const apiName = "@tgo/api";

export const publicNav = [
  {
    label: "Home",
    href: "/"
  },
  {
    label: "Topics",
    href: "/topics"
  },
  {
    label: "Articles",
    href: "/articles"
  },
  {
    label: "Events",
    href: "/events"
  },
  {
    label: "Cities",
    href: "/cities"
  },
  {
    label: "Apply",
    href: "/apply"
  },
  {
    label: "About",
    href: "/about"
  }
] as const;

export const publicModules = [
  {
    name: "Topics",
    phase: "Phase 2",
    summary: "Curated topic pages and editorial landing surfaces driven by published content."
  },
  {
    name: "Articles",
    phase: "Phase 2",
    summary: "Long-form content with SEO metadata, topic bindings, and city-aware curation."
  },
  {
    name: "Events",
    phase: "Phase 2",
    summary: "Published event pages with registration state, sessions, and later check-in support."
  }
] as const;

export const adminModules = [
  {
    label: "Dashboard",
    to: "/dashboard",
    permission: "dashboard.read"
  },
  {
    label: "Topics",
    to: "/topics",
    permission: "topic.manage"
  },
  {
    label: "Articles",
    to: "/articles",
    permission: "article.read"
  },
  {
    label: "Events",
    to: "/events",
    permission: "event.manage"
  },
  {
    label: "Assets",
    to: "/assets",
    permission: "asset.manage"
  },
  {
    label: "Featured",
    to: "/featured-blocks",
    permission: "featured_block.manage"
  },
  {
    label: "Settings",
    to: "/settings/site",
    permission: "settings.manage"
  },
  {
    label: "Applications",
    to: "/applications",
    permission: "application.review"
  },
  {
    label: "Staff",
    to: "/staff",
    permission: "staff.manage"
  },
  {
    label: "Roles",
    to: "/roles",
    permission: "role.manage"
  },
  {
    label: "Audit Logs",
    to: "/audit-logs",
    permission: "audit_log.read"
  }
] as const;

export const implementationMilestones = [
  {
    code: "M0",
    title: "Workspace scaffold",
    summary: "Monorepo shape, shared packages, and baseline app shells."
  },
  {
    code: "M1",
    title: "Backend foundation",
    summary: "Database schema, auth integration, permission middleware, and seed data."
  },
  {
    code: "M2",
    title: "Public MVP",
    summary: "Astro routes powered by public APIs for topics, articles, events, and city pages."
  },
  {
    code: "M3",
    title: "Admin MVP",
    summary: "Content, event, asset, and application management backed by protected admin APIs."
  },
  {
    code: "M4",
    title: "Production hardening",
    summary: "Audit trails, runtime safeguards, and operational readiness work for launch."
  },
  {
    code: "M5",
    title: "Growth features",
    summary: "Phone OTP, richer operations, and post-launch product capabilities."
  }
] as const;
