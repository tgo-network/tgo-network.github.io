<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminBranchListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatContentStatus, formatDate } from "../lib/format";

const rows = ref<AdminBranchListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminBranchListItem[]>("/api/admin/v1/branches");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载分会列表。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>分会维护</h2>
        <p>维护各个分会与董事会信息，它们会直接影响前台的分会董事会展示与活动归属。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/members">返回成员</RouterLink>
        <RouterLink class="button-link button-primary" to="/members/branches/new">新增分会</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载分会...</p>
    </div>

    <div v-else class="panel table-panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>分会</th>
            <th>城市</th>
            <th>区域</th>
            <th>状态</th>
            <th>董事会人数</th>
            <th>更新时间</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <strong>{{ row.name }}</strong>
              <div class="muted-row">/{{ row.slug }}</div>
            </td>
            <td>{{ row.cityName }}</td>
            <td>{{ row.region || "-" }}</td>
            <td><span class="status-pill">{{ formatContentStatus(row.status) }}</span></td>
            <td>{{ row.boardMemberCount }}</td>
            <td>{{ formatDate(row.updatedAt) }}</td>
            <td class="table-actions-cell">
              <RouterLink class="table-link" :to="`/members/branches/${row.id}/edit`">编辑</RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
