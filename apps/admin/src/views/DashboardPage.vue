<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminDashboardPayloadV2, AdminMePayload } from "@tgo/shared";

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
const overviewCards = computed(() => [
  {
    label: "文章总数",
    value: stats.value.articleCount,
    summary: "当前后台已维护的全部文章记录。"
  },
  {
    label: "活动总数",
    value: stats.value.eventCount,
    summary: "当前后台维护中的全部活动记录。"
  },
  {
    label: "申请数量",
    value: stats.value.applicationCount,
    summary: "来自前台加入申请表的累计申请记录。"
  },
  {
    label: "系统状态",
    value: formatSystemHealth(stats.value.systemHealth),
    summary: `当前版本 ${stats.value.appVersion}`
  }
]);
const reviewCards = computed(() => [
  {
    title: "待审核申请",
    value: stats.value.pendingApplicationCount,
    summary: stats.value.pendingApplicationCount > 0 ? "有新的加入申请等待工作人员处理。" : "当前没有待审核的加入申请。",
    to: "/applications",
    actionLabel: "进入申请审核"
  },
  {
    title: "待审核报名",
    value: stats.value.pendingRegistrationCount,
    summary: stats.value.pendingRegistrationCount > 0 ? "活动开放报名后，仍需工作人员在后台完成审核。" : "当前没有待审核的活动报名。",
    to: "/events",
    actionLabel: "查看活动与报名"
  },
  {
    title: "成员 / 分会",
    value: `${stats.value.memberCount} / ${stats.value.branchCount}`,
    summary: "成员资料和分会结构共同决定公开站点的组织可信度。",
    to: "/members",
    actionLabel: "维护成员资料"
  }
]);
const shortcutCards = computed(() => [
  {
    title: "文章",
    summary: `${stats.value.articleCount} 篇内容，支持列表、新建与编辑。`,
    to: "/articles",
    actionLabel: "打开文章模块"
  },
  {
    title: "活动",
    summary: `${stats.value.eventCount} 场活动，支持报名状态与审核队列联动。`,
    to: "/events",
    actionLabel: "打开活动模块"
  },
  {
    title: "申请",
    summary: `${stats.value.applicationCount} 条申请，集中处理加入审核。`,
    to: "/applications",
    actionLabel: "打开申请模块"
  },
  {
    title: "成员",
    summary: `${stats.value.memberCount} 位成员，维护公开资料与分会归属。`,
    to: "/members",
    actionLabel: "打开成员模块"
  },
  {
    title: "工作人员",
    summary: "创建工作人员账号，并分配角色与账户状态。",
    to: "/staff",
    actionLabel: "打开工作人员模块"
  },
  {
    title: "角色",
    summary: "维护工作人员角色与权限组合。",
    to: "/roles",
    actionLabel: "打开角色模块"
  },
  {
    title: "审计日志",
    summary: "查看敏感后台操作的完整留痕记录。",
    to: "/audit-logs",
    actionLabel: "打开审计日志"
  }
]);
const accountCards = computed(() => [
  {
    label: "当前账号",
    value: me.value?.user?.name ?? "未同步工作人员",
    summary: me.value?.user?.email ?? "未读取到工作人员邮箱"
  },
  {
    label: "角色",
    value: roleBadges.value.length,
    summary: roleBadges.value.join(" / ") || "未分配角色"
  },
  {
    label: "权限",
    value: me.value?.permissions.length ?? 0,
    summary: "当前工作人员可访问的后台能力数。"
  },
  {
    label: "版本",
    value: stats.value.appVersion,
    summary: `系统状态：${formatSystemHealth(stats.value.systemHealth)}`
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
        <p>围绕文章、活动、申请与系统状态，快速判断当前后台最该处理的工作。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/articles/new">新建文章</RouterLink>
        <RouterLink class="button-link button-primary" to="/applications">进入审核</RouterLink>
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
        <article class="panel stacked-gap dashboard-section-panel">
          <div class="dashboard-section-head">
            <div class="brand-tag">审核队列</div>
            <h3>当前待办</h3>
            <p class="section-copy">优先处理加入申请、活动报名和成员资料维护。</p>
          </div>

          <div class="dashboard-priority-grid">
            <article v-for="item in reviewCards" :key="item.title" class="dashboard-priority-card">
              <div class="dashboard-priority-head">
                <strong>{{ item.title }}</strong>
                <span class="status-pill">{{ item.value }}</span>
              </div>
              <p>{{ item.summary }}</p>
              <RouterLink class="table-link" :to="item.to">{{ item.actionLabel }}</RouterLink>
            </article>
          </div>
        </article>

        <article class="panel stacked-gap dashboard-section-panel">
          <div class="dashboard-section-head">
            <div class="brand-tag">当前工作人员</div>
            <h3>{{ me?.user?.name ?? "未同步工作人员" }}</h3>
            <p class="section-copy">{{ me?.user?.email ?? "登录后可查看当前工作人员邮箱。" }}</p>
          </div>

          <div v-if="roleBadges.length > 0" class="pill-list">
            <span v-for="role in roleBadges" :key="role" class="soft-pill">{{ role }}</span>
          </div>

          <div class="panel-grid panel-grid-2 dashboard-account-grid">
            <article v-for="item in accountCards" :key="item.label" class="info-card dashboard-account-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <p>{{ item.summary }}</p>
            </article>
          </div>
        </article>
      </div>

      <article class="panel stacked-gap dashboard-section-panel">
        <div class="page-header-row compact-row">
          <div class="dashboard-section-head">
            <div class="brand-tag">快捷入口</div>
            <h3>后台模块</h3>
            <p class="section-copy">进入具体模块后，可继续处理列表、表单、审核与权限配置。</p>
          </div>

          <div class="status-pill">{{ formatSystemHealth(stats.systemHealth) }}</div>
        </div>

        <div class="dashboard-shortcut-grid">
          <article v-for="item in shortcutCards" :key="item.title" class="dashboard-shortcut-card">
            <strong>{{ item.title }}</strong>
            <p>{{ item.summary }}</p>
            <RouterLink class="table-link" :to="item.to">{{ item.actionLabel }}</RouterLink>
          </article>
        </div>
      </article>
    </template>
  </section>
</template>

<style>
  .dashboard-section-panel {
    gap: 18px;
  }

  .dashboard-section-head {
    display: grid;
    gap: 8px;
  }

  .dashboard-section-head h3 {
    margin: 0;
    font-size: 1.24rem;
  }

  .dashboard-priority-grid,
  .dashboard-shortcut-grid {
    display: grid;
    gap: 14px;
  }

  .dashboard-priority-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dashboard-priority-card,
  .dashboard-shortcut-card {
    display: grid;
    gap: 10px;
    padding: 18px;
    border: 1px solid rgba(32, 23, 15, 0.08);
    border-radius: 22px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(249, 243, 234, 0.76));
  }

  .dashboard-priority-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .dashboard-priority-card strong,
  .dashboard-shortcut-card strong {
    margin: 0;
    line-height: 1.4;
  }

  .dashboard-priority-card p,
  .dashboard-shortcut-card p {
    margin: 0;
    color: var(--muted);
    line-height: 1.65;
  }

  .dashboard-account-grid {
    align-items: stretch;
  }

  .dashboard-account-card strong {
    font-size: 1.12rem;
    line-height: 1.4;
  }

  .dashboard-shortcut-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @media (max-width: 1100px) {
    .dashboard-priority-grid,
    .dashboard-shortcut-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .dashboard-priority-grid,
    .dashboard-shortcut-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
