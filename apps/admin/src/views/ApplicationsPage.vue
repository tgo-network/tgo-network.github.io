<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminApplicationListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatApplicationStatus, formatApplicationType, formatDate } from "../lib/format";

const rows = ref<AdminApplicationListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminApplicationListItem[]>("/api/admin/v1/applications");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载申请列表。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <header class="page-header">
      <h2>申请</h2>
      <p>来自公开表单的提交现在会进入后台中的受保护审核队列。</p>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载申请...</p>
    </div>

    <div v-else class="panel table-panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>类型</th>
            <th>公司</th>
            <th>城市</th>
            <th>状态</th>
            <th>创建时间</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <strong>{{ row.name }}</strong>
              <div class="muted-row">{{ row.email ?? "-" }}</div>
            </td>
            <td>{{ formatApplicationType(row.type) }}</td>
            <td>{{ row.company ?? "-" }}</td>
            <td>{{ row.cityName ?? "-" }}</td>
            <td><span class="status-pill">{{ formatApplicationStatus(row.status) }}</span></td>
            <td>{{ formatDate(row.createdAt) }}</td>
            <td class="table-actions-cell">
              <RouterLink class="table-link" :to="`/applications/${row.id}`">
                审核
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
