<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminDashboardPayloadV2, AdminMePayload } from "@tgo/shared";
import { implementationMilestones } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatSystemHealth } from "../lib/format";

const me = ref<AdminMePayload | null>(null);
const dashboard = ref<AdminDashboardPayloadV2 | null>(null);
const loading = ref(true);
const errorMessage = ref("");

const emptyStats: AdminDashboardPayloadV2["stats"] = {
  articleCount: 0,
  eventCount: 0,
  applicationCount: 0,
  pendingApplicationCount: 0,
  pendingRegistrationCount: 0,
  memberCount: 0,
  branchCount: 0,
  systemHealth: "unknown",
  appVersion: "dev"
};

const stats = computed(() => dashboard.value?.stats ?? emptyStats);
const roleBadges = computed(() => me.value?.roles ?? []);
const milestoneCards = computed(() => (me.value?.nextMilestones.length ? me.value.nextMilestones : implementationMilestones));
const overviewCards = computed(() => [
  {
    label: "内容池",
    value: stats.value.articleCount + stats.value.eventCount,
    summary: `${stats.value.articleCount} 篇文章 + ${stats.value.eventCount} 场活动，构成当前公开内容供给。`
  },
  {
    label: "待处理队列",
    value: stats.value.pendingApplicationCount + stats.value.pendingRegistrationCount,
    summary: `${stats.value.pendingApplicationCount} 条加入申请待审，${stats.value.pendingRegistrationCount} 条活动报名待审。`
  },
  {
    label: "组织网络",
    value: stats.value.memberCount + stats.value.branchCount,
    summary: `${stats.value.memberCount} 位成员分布在 ${stats.value.branchCount} 个分会节点。`
  },
  {
    label: "系统状态",
    value: formatSystemHealth(stats.value.systemHealth),
    summary: `当前版本 ${stats.value.appVersion}，后台运行状态为 ${formatSystemHealth(stats.value.systemHealth)}。`
  }
]);
const focusActions = computed(() => [
  {
    title: "处理加入申请",
    summary: stats.value.pendingApplicationCount > 0 ? `当前有 ${stats.value.pendingApplicationCount} 条申请等待审核。` : "当前没有待审核的加入申请。",
    to: "/applications",
    actionLabel: "打开申请列表"
  },
  {
    title: "处理活动报名",
    summary: stats.value.pendingRegistrationCount > 0 ? `当前有 ${stats.value.pendingRegistrationCount} 条活动报名等待审核。` : "当前没有待审核的活动报名。",
    to: "/events",
    actionLabel: "查看活动与报名"
  },
  {
    title: "维护首页表达",
    summary: "首页承担组织认知和主路径分发，应持续围绕分会、成员、活动与加入进行优化。",
    to: "/site/homepage",
    actionLabel: "打开首页配置"
  },
  {
    title: "补充分会结构",
    summary: "分会、董事会成员与成员归属决定这个站点是否真正呈现出组织型社区结构。",
    to: "/members/branches",
    actionLabel: "前往分会维护"
  }
]);

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const [mePayload, dashboardPayload] = await Promise.all([
      adminFetch<AdminMePayload>("/api/admin/v1/me"),
      adminFetch<AdminDashboardPayloadV2>("/api/admin/v1/dashboard")
    ]);

    me.value = mePayload;
    dashboard.value = dashboardPayload;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载仪表盘数据。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <div>
        <h2>仪表盘</h2>
        <p>围绕内容供给、审核队列、成员网络和系统状态，快速判断当前后台最该处理什么。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/site/homepage">首页配置</RouterLink>
        <RouterLink class="button-link" to="/members/branches">分会维护</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在获取工作人员资料与仪表盘统计...</p>
    </div>

    <template v-else>
      <div class="panel-grid panel-grid-4">
        <article v-for="item in overviewCards" :key="item.label" class="panel stat-panel">
          <div class="brand-tag">{{ item.label }}</div>
          <strong>{{ item.value }}</strong>
          <p>{{ item.summary }}</p>
        </article>
      </div>

      <div class="panel-grid panel-grid-2">
        <article class="panel stacked-gap">
          <div class="brand-tag">当前工作人员</div>
          <div>
            <h3>{{ me?.user?.name ?? "未知用户" }}</h3>
            <p>{{ me?.user?.email ?? "未提供邮箱" }}</p>
          </div>
          <div class="pill-list" v-if="roleBadges.length > 0">
            <span v-for="role in roleBadges" :key="role" class="soft-pill">{{ role }}</span>
          </div>
          <div class="info-row">
            <span>权限数</span>
            <strong>{{ me?.permissions.length ?? 0 }}</strong>
          </div>
          <div class="info-row">
            <span>系统状态</span>
            <strong>{{ formatSystemHealth(stats.systemHealth) }}</strong>
          </div>
          <div class="info-row">
            <span>版本</span>
            <strong>{{ stats.appVersion }}</strong>
          </div>
        </article>

        <article class="panel stacked-gap">
          <div class="brand-tag">当前优先事项</div>
          <div class="dashboard-action-grid">
            <article v-for="item in focusActions" :key="item.title" class="dashboard-action-card">
              <strong>{{ item.title }}</strong>
              <p>{{ item.summary }}</p>
              <RouterLink class="table-link" :to="item.to">{{ item.actionLabel }}</RouterLink>
            </article>
          </div>
        </article>
      </div>

      <div class="panel-grid panel-grid-2">
        <article class="panel stacked-gap">
          <div class="brand-tag">运营基线</div>
          <div class="panel-grid panel-grid-2">
            <article class="info-card">
              <span>文章</span>
              <strong>{{ stats.articleCount }}</strong>
              <p>公开内容沉淀与活动复盘的长期内容资产。</p>
            </article>
            <article class="info-card">
              <span>活动</span>
              <strong>{{ stats.eventCount }}</strong>
              <p>当前阶段支持公开报名，再由工作人员在后台审核。</p>
            </article>
            <article class="info-card">
              <span>成员</span>
              <strong>{{ stats.memberCount }}</strong>
              <p>成员用于前台展示，不等同于后台工作人员账号。</p>
            </article>
            <article class="info-card">
              <span>分会</span>
              <strong>{{ stats.branchCount }}</strong>
              <p>分会是组织网络的长期节点，也是活动和成员归属的基础。</p>
            </article>
          </div>
        </article>

        <article class="panel stacked-gap">
          <div class="brand-tag">实施里程碑</div>
          <div class="dashboard-action-grid">
            <article v-for="item in milestoneCards" :key="item.code" class="dashboard-action-card">
              <strong>{{ item.code }} · {{ item.title }}</strong>
              <p>{{ item.summary }}</p>
            </article>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>
