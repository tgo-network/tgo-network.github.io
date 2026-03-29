<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminArticleListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatContentStatus, formatDate, formatDateTime } from "../lib/format";

const rows = ref<AdminArticleListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminArticleListItem[]>("/api/admin/v1/articles");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载文章列表。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>文章</h2>
        <p>围绕标题、作者、封面和发布状态持续维护公开文章内容。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link button-primary" to="/articles/new">
          新建文章
        </RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载文章...</p>
    </div>

    <div v-else class="panel table-panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>状态</th>
            <th>作者</th>
            <th>发布时间</th>
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
            <td>{{ row.authorName ?? "-" }}</td>
            <td>{{ formatDate(row.publishedAt) }}</td>
            <td>{{ formatDateTime(row.updatedAt) }}</td>
            <td class="table-actions-cell">
              <RouterLink class="table-link" :to="`/articles/${row.id}/edit`">
                编辑
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
