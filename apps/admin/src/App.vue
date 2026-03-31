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

const workspaceSummaryByRoute: Record<string, string> = {
  dashboard: "先处理审核队列、内容供给与系统状态，再进入具体模块继续推进日常运营动作。",
  articles: "围绕文章标题、作者、分会归属与发布状态，持续维护公开内容沉淀。",
  events: "活动模块同时承接公开列表、详情页表达、报名状态和审核队列的上游配置。",
  applications: "加入申请是非成员进入社区的主转化入口，应优先保证审核节奏与记录完整。",
  members: "成员信息决定前台的组织可信度，需要和分会结构、公开展示内容保持一致。",
  staff: "工作人员账号与权限边界需要持续可见，避免把成员身份与后台权限混淆。",
  roles: "角色模块负责把权限组织成可维护的运营能力集合，而不是零散勾选。",
  "audit-logs": "所有敏感后台操作都应留下可追踪记录，便于回看、排错与审计。",
  branches: "分会是组织网络的长期节点，应与成员归属、董事会信息和活动入口协同维护。",
  "site-homepage": "首页承担组织认知和主路径分发，应持续围绕分会、成员、活动与加入进行优化。",
  "site-page-edit": "单页内容需要保持口径一致，确保关于我们与加入说明不会偏离公开主线。",
  "article-create": "新建内容时先明确组织语境、分会归属与公开路径，再进入具体编辑。",
  "article-edit": "编辑文章时优先确认标题、摘要、封面与发布状态是否仍服务组织主线。",
  "event-create": "活动录入要同时考虑前台公开展示、议程表达和报名审核流程。",
  "event-edit": "活动编辑完成后，需要确认时间、场地、分会归属与报名状态是否同步更新。",
  "event-registrations": "报名审核列表用于收敛活动参与者，确保公开报名和后台审核串联顺畅。",
  "registration-detail": "审核报名时先看活动语境，再判断当前报名人是否适合进入该场活动。",
  "application-detail": "申请详情页需要把候选人信息、申请动机和审核动作放在同一上下文里。",
  "member-create": "新增成员时先保证组织归属和公开展示信息完整，再补充扩展资料。",
  "member-edit": "成员编辑应优先确认公开展示质量，避免前台出现身份、公司或分会信息错位。",
  "branch-create": "新建分会时应同步考虑董事会结构、城市节点与首页展示节奏。",
  "branch-edit": "分会维护不仅是资料修改，更是在维护整个公开站点的组织骨架。"
};

const activeModule = computed(() => {
  return visibleModules.value.find((item) => route.path === item.to || route.path.startsWith(`${item.to}/`)) ?? null;
});

const workspaceTitle = computed(() => activeModule.value?.label ?? "后台工作台");
const workspaceSummary = computed(
  () =>
    workspaceSummaryByRoute[String(route.name ?? "")] ??
    "围绕公开站点与后台运营动作，持续维护内容、审核、成员与权限管理。"
);
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
          <span class="brand-tag">工作人员后台</span>
          <h1>{{ platformName }}</h1>
          <p>
            面向工作人员的运营控制台，用于管理文章、活动、成员、申请、权限和站点内容配置。
          </p>

          <div class="brand-meta">
            <span class="soft-pill">Better Auth</span>
            <span class="soft-pill">Hono API</span>
            <span class="soft-pill">运营工作区</span>
          </div>
        </div>

        <div class="sidebar-section-label">核心导航</div>

        <nav class="nav">
          <router-link
            v-for="item in visibleModules"
            :key="item.to"
            :to="item.to"
            class="nav-link"
          >
            {{ item.label }}
          </router-link>
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-note">
            <strong>{{ me?.user?.name ?? "工作人员会话" }}</strong>
            <p>{{ me?.user?.email ?? "登录后可查看当前工作人员邮箱与角色状态。" }}</p>
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
          <div class="workspace-breadcrumb">TGO 控制台 / {{ workspaceTitle }}</div>
          <div class="workspace-heading">{{ workspaceTitle }}</div>
          <p class="workspace-copy">{{ workspaceSummary }}</p>
        </div>

        <div class="workspace-user-card">
          <div class="workspace-user-row">
            <span class="workspace-status-dot" aria-hidden="true"></span>
            <div>
              <strong>{{ me?.user?.name ?? "未同步工作人员" }}</strong>
              <span>{{ workspaceUserStatus }}</span>
            </div>
          </div>
          <code v-if="me?.user?.email">{{ me.user.email }}</code>
        </div>
      </header>

      <router-view />
    </main>
  </div>
</template>
