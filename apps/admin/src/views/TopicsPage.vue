<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminTopicListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatContentStatus, formatDate } from "../lib/format";

const rows = ref<AdminTopicListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminTopicListItem[]>("/api/admin/v1/topics");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载主题列表。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>主题</h2>
        <p>管理主题落地页、内容状态以及为公开站提供内容组织能力的主题中心。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link button-primary" to="/topics/new">
          新建主题
        </RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载主题...</p>
    </div>

    <div v-else class="panel table-panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>状态</th>
            <th>文章数</th>
            <th>活动数</th>
            <th>更新时间</th>
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
            <td>{{ row.articleCount }}</td>
            <td>{{ row.eventCount }}</td>
            <td>{{ formatDate(row.updatedAt) }}</td>
            <td class="table-actions-cell">
              <RouterLink class="table-link" :to="`/topics/${row.id}/edit`">
                编辑
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
