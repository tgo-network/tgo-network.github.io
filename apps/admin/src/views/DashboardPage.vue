<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminDashboardPayloadV2 } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatSystemHealth } from "../lib/format";

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
const overviewCards = computed(() => [
  {
    label: "文章总数",
    value: stats.value.articleCount,
    meta: `已发布 ${stats.value.articleCount > 0 ? "可继续维护" : "等待创建"}`
  },
  {
    label: "活动总数",
    value: stats.value.eventCount,
    meta: `待审核报名 ${stats.value.pendingRegistrationCount}`
  },
  {
    label: "申请数量",
    value: stats.value.applicationCount,
    meta: `待审核申请 ${stats.value.pendingApplicationCount}`
  },
  {
    label: "系统状态",
    value: formatSystemHealth(stats.value.systemHealth),
    meta: `版本 ${stats.value.appVersion}`
  }
]);
const quickLinks = computed(() => [
  {
    label: "文章",
    to: "/articles",
    meta: `${stats.value.articleCount} 篇`
  },
  {
    label: "活动",
    to: "/events",
    meta: `${stats.value.eventCount} 场`
  },
  {
    label: "申请",
    to: "/applications",
    meta: `${stats.value.pendingApplicationCount} 条待审`
  },
  {
    label: "成员",
    to: "/members",
    meta: `${stats.value.memberCount} 位`
  },
  {
    label: "工作人员",
    to: "/staff",
    meta: "账号与角色"
  },
  {
    label: "审计日志",
    to: "/audit-logs",
    meta: "查看留痕"
  }
]);

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    dashboard.value = await adminFetch<AdminDashboardPayloadV2>("/api/admin/v1/dashboard");
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
      <h2>仪表盘</h2>

      <div class="page-actions">
        <RouterLink class="button-link" to="/articles/new">新建文章</RouterLink>
        <RouterLink class="button-link button-primary" to="/events/new">新建活动</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <p>正在加载仪表盘数据...</p>
    </div>

    <template v-else>
      <div class="panel-grid panel-grid-4">
        <article v-for="item in overviewCards" :key="item.label" class="panel stat-panel dashboard-stat-card">
          <span class="dashboard-stat-label">{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.meta }}</p>
        </article>
      </div>

      <article class="panel stacked-gap">
        <div class="panel-toolbar">
          <h3>常用操作</h3>
          <div class="panel-meta">待审核申请 {{ stats.pendingApplicationCount }} · 待审核报名 {{ stats.pendingRegistrationCount }}</div>
        </div>

        <div class="dashboard-quick-links">
          <RouterLink v-for="item in quickLinks" :key="item.to" class="dashboard-quick-link" :to="item.to">
            <strong>{{ item.label }}</strong>
            <span>{{ item.meta }}</span>
          </RouterLink>
        </div>
      </article>
    </template>
  </section>
</template>

<style scoped>
  .dashboard-stat-card {
    gap: 10px;
  }

  .dashboard-stat-label {
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .dashboard-quick-links {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .dashboard-quick-link {
    display: grid;
    gap: 4px;
    padding: 14px 16px;
    border: 1px solid rgba(138, 108, 57, 0.12);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.72);
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      background 160ms ease,
      box-shadow 160ms ease;
  }

  .dashboard-quick-link strong {
    line-height: 1.4;
  }

  .dashboard-quick-link span {
    color: var(--muted);
    font-size: 0.88rem;
    line-height: 1.5;
  }

  .dashboard-quick-link:hover,
  .dashboard-quick-link:focus-visible {
    transform: translateY(-1px);
    border-color: rgba(138, 95, 58, 0.18);
    background: rgba(255, 255, 255, 0.94);
    box-shadow: var(--shadow-soft);
    outline: none;
  }

  @media (max-width: 900px) {
    .dashboard-quick-links {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .dashboard-quick-links {
      grid-template-columns: 1fr;
    }
  }
</style>
