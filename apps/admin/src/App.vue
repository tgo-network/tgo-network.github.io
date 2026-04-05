<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useRoute } from "vue-router";

import type { AdminMePayload } from "@tgo/shared";
import { platformName } from "@tgo/shared";

import { authClient } from "./lib/auth-client";
import { adminFetch } from "./lib/api";
import { getVisibleAdminModules } from "./lib/navigation";

const route = useRoute();
const router = useRouter();

const showShell = computed(() => route.name !== "login");
const me = ref<AdminMePayload | null>(null);
const loadingMe = ref(false);

const visibleModules = computed(() => {
  return getVisibleAdminModules(me.value, loadingMe.value);
});

const moduleGroupDefinitions = [
  {
    key: "operations",
    label: "运营",
    summary: "仪表盘、内容与审核",
    routes: ["/dashboard", "/articles", "/events", "/applications"]
  },
  {
    key: "organization",
    label: "组织",
    summary: "成员、工作人员与角色",
    routes: ["/members", "/staff", "/roles"]
  },
  {
    key: "system",
    label: "系统",
    summary: "审计与操作留痕",
    routes: ["/audit-logs"]
  }
] as const;

const groupedModules = computed(() =>
  moduleGroupDefinitions
    .map((group) => ({
      ...group,
      items: visibleModules.value.filter((item) => group.routes.some((routePath) => routePath === item.to))
    }))
    .filter((group) => group.items.length > 0)
);

const workspaceSummaryByRoute: Record<string, string> = {
  dashboard: "查看文章、活动、申请与系统状态的核心指标。",
  articles: "维护文章标题、作者、分会归属与发布状态。",
  events: "维护活动信息，并处理活动报名审核。",
  applications: "审核非成员提交的加入申请与后续跟进。",
  members: "维护成员资料、分会归属与公开展示。",
  staff: "管理工作人员账号、状态与角色分配。",
  roles: "集中维护角色与权限组合。",
  "audit-logs": "查看后台敏感操作的审计记录。",
  branches: "维护分会资料与董事会成员结构。",
  "site-homepage": "调整首页展示内容与主路径分发。",
  "site-page-edit": "维护加入说明与关于页面的固定内容。",
  "article-create": "新建文章并补齐标题、摘要、封面与发布状态。",
  "article-edit": "编辑文章内容，并确认公开展示信息完整。",
  "event-create": "新建活动并同步报名状态与议程信息。",
  "event-edit": "编辑活动详情、时间地点与报名配置。",
  "event-registrations": "审核公开活动的报名记录。",
  "registration-detail": "查看单条报名资料并完成审核动作。",
  "application-detail": "查看申请详情并记录审核结论。",
  "member-create": "新增成员资料并补齐公开展示字段。",
  "member-edit": "编辑成员资料与分会归属。",
  "branch-create": "新增分会资料与董事会结构。",
  "branch-edit": "维护分会资料、封面与董事会成员。"
};

const activeModule = computed(() => {
  return visibleModules.value.find((item) => route.path === item.to || route.path.startsWith(`${item.to}/`)) ?? null;
});

const activeModuleGroup = computed(
  () => groupedModules.value.find((group) => group.items.some((item) => item.to === activeModule.value?.to)) ?? null
);

const workspaceTitle = computed(() => activeModule.value?.label ?? "后台工作台");
const workspaceSummary = computed(
  () =>
    workspaceSummaryByRoute[String(route.name ?? "")] ??
    "围绕公开站点与后台运营动作，持续维护内容、审核、成员与权限管理。"
);
const workspaceGroupLabel = computed(() => activeModuleGroup.value?.label ?? "控制台");
const workspaceUserStatus = computed(() => {
  if (loadingMe.value) {
    return "正在同步工作人员身份与权限";
  }

  if (!me.value) {
    return "未读取到工作人员会话";
  }

  const roleSummary = me.value.roles.length > 0 ? me.value.roles.join(" / ") : "未分配角色";
  return `${me.value.permissions.length} 项权限 · ${roleSummary}`;
});

const loadMe = async () => {
  if (!showShell.value) {
    return;
  }

  loadingMe.value = true;

  try {
    me.value = await adminFetch<AdminMePayload>("/api/admin/v1/me");
  } catch {
    me.value = null;
  } finally {
    loadingMe.value = false;
  }
};

const signOut = async () => {
  await authClient.signOut();
  me.value = null;
  await router.push("/login");
};

watch(
  () => route.fullPath,
  () => {
    void loadMe();
  }
);

onMounted(() => {
  void loadMe();
});
</script>

<template>
  <router-view v-if="!showShell" />

  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-inner">
        <div class="brand">
          <div class="brand-heading">
            <div class="brand-mark">TGO</div>

            <div class="brand-copy">
              <span class="brand-tag">工作人员后台</span>
              <h1>{{ platformName }}</h1>
            </div>
          </div>

          <p class="brand-summary">
            围绕文章、活动、申请、成员、工作人员与审计，维护整个社区的后台运营流程。
          </p>

          <div class="brand-stats">
            <article class="brand-stat">
              <span>模块</span>
              <strong>{{ visibleModules.length }}</strong>
            </article>
            <article class="brand-stat">
              <span>角色</span>
              <strong>{{ me?.roles.length ?? 0 }}</strong>
            </article>
            <article class="brand-stat">
              <span>权限</span>
              <strong>{{ me?.permissions.length ?? 0 }}</strong>
            </article>
          </div>
        </div>

        <div class="sidebar-nav-groups">
          <section v-for="group in groupedModules" :key="group.key" class="nav-group">
            <div class="nav-group-head">
              <div class="nav-group-title">{{ group.label }}</div>
              <p class="nav-group-copy">{{ group.summary }}</p>
            </div>

            <nav class="nav" :aria-label="`${group.label}导航`">
              <router-link
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                class="nav-link"
              >
                {{ item.label }}
              </router-link>
            </nav>
          </section>
        </div>

        <div class="sidebar-footer">
          <div class="sidebar-note sidebar-identity">
            <div class="sidebar-identity-row">
              <strong>{{ me?.user?.name ?? "工作人员会话" }}</strong>
              <span class="sidebar-session-pill">{{ loadingMe ? "同步中" : me ? "已登录" : "未登录" }}</span>
            </div>
            <p>{{ me?.user?.email ?? "登录后可查看当前工作人员邮箱与角色状态。" }}</p>
            <small>{{ workspaceUserStatus }}</small>
          </div>

          <button class="nav-link nav-button" type="button" @click="signOut">
            退出登录
          </button>
        </div>
      </div>
    </aside>

    <main class="main">
      <header class="workspace-topbar">
        <div class="workspace-meta">
          <div class="workspace-breadcrumb">{{ workspaceGroupLabel }} / {{ workspaceTitle }}</div>
          <div class="workspace-heading-row">
            <div class="workspace-heading">{{ workspaceTitle }}</div>
            <span class="status-pill workspace-state-pill">{{ loadingMe ? "同步中" : "在线" }}</span>
          </div>
          <p class="workspace-copy">{{ workspaceSummary }}</p>
        </div>

        <div class="workspace-metric-strip">
          <article class="workspace-mini-card">
            <span>角色</span>
            <strong>{{ me?.roles.length ?? 0 }}</strong>
            <small>{{ me?.roles.join(" / ") || "未分配角色" }}</small>
          </article>

          <article class="workspace-mini-card">
            <span>权限</span>
            <strong>{{ me?.permissions.length ?? 0 }}</strong>
            <small>{{ me?.user?.email ?? "未读取到工作人员邮箱" }}</small>
          </article>
        </div>
      </header>

      <router-view />
    </main>
  </div>
</template>
