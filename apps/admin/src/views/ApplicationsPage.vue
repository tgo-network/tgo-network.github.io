<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminJoinApplicationListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatApplicationStatus, formatDate } from "../lib/format";

const rows = ref<AdminJoinApplicationListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminJoinApplicationListItem[]>("/api/admin/v1/applications");
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
      <p>非成员提交的加入申请会进入这里，由工作人员审核、联系与更新状态。</p>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载加入申请...</p>
    </div>

    <div v-else class="panel table-panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>联系方式</th>
            <th>意向分会</th>
            <th>状态</th>
            <th>提交时间</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td><strong>{{ row.name }}</strong></td>
            <td>
              <div>{{ row.phoneNumber }}</div>
              <div class="muted-row">{{ row.wechatId || row.email || "未补充微信或邮箱" }}</div>
            </td>
            <td>{{ row.targetBranchName || "未指定" }}</td>
            <td><span class="status-pill">{{ formatApplicationStatus(row.status) }}</span></td>
            <td>{{ formatDate(row.createdAt) }}</td>
            <td class="table-actions-cell">
              <RouterLink class="table-link" :to="`/applications/${row.id}`">审核</RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
