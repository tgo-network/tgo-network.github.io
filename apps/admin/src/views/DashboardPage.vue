<script setup lang="ts">
import { onMounted, ref } from "vue";

import type { AdminDashboardPayload, AdminMePayload } from "@tgo/shared";
import { implementationMilestones } from "@tgo/shared";

import { adminFetch } from "../lib/api";

const me = ref<AdminMePayload | null>(null);
const dashboard = ref<AdminDashboardPayload | null>(null);
const loading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const [mePayload, dashboardPayload] = await Promise.all([
      adminFetch<AdminMePayload>("/api/admin/v1/me"),
      adminFetch<AdminDashboardPayload>("/api/admin/v1/dashboard")
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
      <p>受保护的管理 API 已经接入 Vue 控制台，因此当前壳层能够反映真实的员工访问权限。</p>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在获取员工资料与仪表盘统计...</p>
    </div>

    <template v-else>
      <div class="panel-grid panel-grid-4">
        <article class="panel stat-panel">
          <div class="brand-tag">文章</div>
          <strong>{{ dashboard?.stats.articles ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">活动</div>
          <strong>{{ dashboard?.stats.events ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">申请</div>
          <strong>{{ dashboard?.stats.applications ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">资源</div>
          <strong>{{ dashboard?.stats.assets ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">审计日志</div>
          <strong>{{ dashboard?.stats.auditLogs ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">员工</div>
          <strong>{{ dashboard?.stats.staff ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">角色</div>
          <strong>{{ dashboard?.stats.roles ?? 0 }}</strong>
        </article>
      </div>

      <div class="panel-grid panel-grid-2" style="margin-top: 18px;">
        <article class="panel">
          <div class="brand-tag">当前员工会话</div>
          <h3>{{ me?.user?.name ?? "未知用户" }}</h3>
          <p>{{ me?.user?.email ?? "未提供邮箱" }}</p>
          <p>角色数量：{{ me?.roles.length ?? 0 }}</p>
          <p>权限数量：{{ me?.permissions.length ?? 0 }}</p>
        </article>

        <article class="panel">
          <div class="brand-tag">当前状态</div>
          <p>
            管理后台已经运行在带认证能力的 Hono API 之上，能够支撑内容运营、活动审核流程，以及对敏感后台操作的审计追踪。
          </p>
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
