<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminDashboardPayloadV2, AdminMePayload } from "@tgo/shared";
import { implementationMilestones } from "@tgo/shared";

import { adminFetch } from "../lib/api";

const me = ref<AdminMePayload | null>(null);
const dashboard = ref<AdminDashboardPayloadV2 | null>(null);
const loading = ref(true);
const errorMessage = ref("");

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
  <section>
    <header class="page-header">
      <h2>仪表盘</h2>
      <p>概览当前文章、活动、加入申请、活动报名与成员网络的运营状态。</p>
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
        <article class="panel stat-panel">
          <div class="brand-tag">文章总数</div>
          <strong>{{ dashboard?.stats.articleCount ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">活动总数</div>
          <strong>{{ dashboard?.stats.eventCount ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">申请数量</div>
          <strong>{{ dashboard?.stats.applicationCount ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">待审申请</div>
          <strong>{{ dashboard?.stats.pendingApplicationCount ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">待审报名</div>
          <strong>{{ dashboard?.stats.pendingRegistrationCount ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">成员数量</div>
          <strong>{{ dashboard?.stats.memberCount ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">分会数量</div>
          <strong>{{ dashboard?.stats.branchCount ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">系统状态</div>
          <strong>{{ dashboard?.stats.systemHealth ?? "unknown" }}</strong>
        </article>
      </div>

      <div class="panel-grid panel-grid-2" style="margin-top: 18px;">
        <article class="panel stacked-gap">
          <div class="brand-tag">当前工作人员</div>
          <h3>{{ me?.user?.name ?? "未知用户" }}</h3>
          <p>{{ me?.user?.email ?? "未提供邮箱" }}</p>
          <div class="info-row">
            <span>角色数</span>
            <strong>{{ me?.roles.length ?? 0 }}</strong>
          </div>
          <div class="info-row">
            <span>权限数</span>
            <strong>{{ me?.permissions.length ?? 0 }}</strong>
          </div>
          <div class="info-row">
            <span>版本</span>
            <strong>{{ dashboard?.stats.appVersion ?? "dev" }}</strong>
          </div>
        </article>

        <article class="panel stacked-gap">
          <div class="brand-tag">快捷入口</div>
          <p>除了一级模块外，首页、加入页和关于页的内容配置也已接入管理 API。</p>
          <div class="page-actions">
            <RouterLink class="button-link" to="/members/branches">分会维护</RouterLink>
            <RouterLink class="button-link" to="/site/homepage">首页配置</RouterLink>
            <RouterLink class="button-link" to="/site/pages/join">加入页</RouterLink>
            <RouterLink class="button-link" to="/site/pages/about">关于页</RouterLink>
          </div>
        </article>
      </div>

      <div class="panel-grid" style="margin-top: 18px;">
        <article v-for="item in implementationMilestones" :key="item.code" class="panel">
          <div class="brand-tag">{{ item.code }}</div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.summary }}</p>
        </article>
      </div>
    </template>
  </section>
</template>
