<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminMemberListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatDate } from "../lib/format";

const rows = ref<AdminMemberListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");

const formatVisibility = (value: string) => {
  if (value === "public") {
    return "公开";
  }
  if (value === "private") {
    return "私有";
  }
  return value || "-";
};

const formatMembershipStatus = (value: string) => {
  if (value === "active") {
    return "有效成员";
  }
  if (value === "alumni") {
    return "校友成员";
  }
  if (value === "paused") {
    return "暂停展示";
  }
  return value || "-";
};

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminMemberListItem[]>("/api/admin/v1/members");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载成员列表。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>成员</h2>
        <p>维护 TGO 鲲鹏会成员资料，并管理分会归属、公开可见性与前台展示顺序。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/members/branches">分会维护</RouterLink>
        <RouterLink class="button-link button-primary" to="/members/new">新增成员</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载成员...</p>
    </div>

    <div v-else class="panel table-panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>公司 / 职称</th>
            <th>分会</th>
            <th>成员状态</th>
            <th>可见性</th>
            <th>加入时间</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <strong>{{ row.name }}</strong>
              <div class="muted-row">/{{ row.slug }}</div>
            </td>
            <td>{{ row.company }} · {{ row.title }}</td>
            <td>{{ row.branchName || "未分配" }}</td>
            <td>{{ formatMembershipStatus(row.membershipStatus) }}</td>
            <td>{{ formatVisibility(row.visibility) }}</td>
            <td>{{ formatDate(row.joinedAt) }}</td>
            <td class="table-actions-cell">
              <RouterLink class="table-link" :to="`/members/${row.id}/edit`">编辑</RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
