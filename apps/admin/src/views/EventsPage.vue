<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminEventListItemV2 } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatContentStatus, formatDate, formatEventRegistrationState } from "../lib/format";

const rows = ref<AdminEventListItemV2[]>([]);
const loading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminEventListItemV2[]>("/api/admin/v1/events");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载活动列表。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>活动</h2>
        <p>活动与报名流程已经切换到按分会组织的模型，支持公开报名与后台审核。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link button-primary" to="/events/new">新建活动</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载活动...</p>
    </div>

    <div v-else class="panel table-panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>状态</th>
            <th>分会</th>
            <th>报名状态</th>
            <th>开始时间</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <strong>{{ row.title }}</strong>
              <div class="muted-row">/{{ row.slug }}</div>
            </td>
            <td><span class="status-pill">{{ formatContentStatus(row.status) }}</span></td>
            <td>{{ row.branchName || "未分配分会" }}</td>
            <td><span class="status-pill">{{ formatEventRegistrationState(row.registrationState) }}</span></td>
            <td>{{ formatDate(row.startsAt) }}</td>
            <td class="table-actions-cell">
              <div class="table-action-list">
                <RouterLink class="table-link" :to="`/events/${row.id}/edit`">编辑</RouterLink>
                <RouterLink class="table-link" :to="`/events/${row.id}/registrations`">报名</RouterLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
