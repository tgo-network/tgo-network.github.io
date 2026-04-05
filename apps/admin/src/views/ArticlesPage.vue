<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";

import { contentStatusOptions, type AdminArticleListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatContentStatus, formatDateTime } from "../lib/format";

const rows = ref<AdminArticleListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const filters = reactive({
  query: "",
  status: "all",
  branch: "all"
});

const branchOptions = computed(() =>
  Array.from(new Set(rows.value.map((row) => row.branchName).filter((value): value is string => Boolean(value)))).sort((left, right) =>
    left.localeCompare(right, "zh-CN")
  )
);
const filteredRows = computed(() => {
  const query = filters.query.trim().toLowerCase();

  return rows.value.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      [row.title, row.slug, row.authorName ?? "", row.branchName ?? ""].some((value) => value.toLowerCase().includes(query));
    const matchesStatus = filters.status === "all" || row.status === filters.status;
    const matchesBranch = filters.branch === "all" || row.branchName === filters.branch;

    return matchesQuery && matchesStatus && matchesBranch;
  });
});

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
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <h2>文章</h2>

      <div class="page-actions">
        <RouterLink class="button-link button-primary" to="/articles/new">新建文章</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <p>正在加载文章...</p>
    </div>

    <template v-else>
      <div class="panel filter-panel">
        <div class="field-grid field-grid-3">
          <label class="field">
            <span>搜索</span>
            <input v-model="filters.query" type="search" placeholder="搜索标题、slug、作者或分会" />
          </label>

          <label class="field">
            <span>状态</span>
            <select v-model="filters.status">
              <option value="all">全部状态</option>
              <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>分会</span>
            <select v-model="filters.branch">
              <option value="all">全部分会</option>
              <option v-for="option in branchOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
        </div>

        <div class="filter-summary">共 {{ filteredRows.length }} / {{ rows.length }} 篇文章</div>
      </div>

      <div v-if="filteredRows.length === 0" class="panel empty-state-card">
        <p>当前筛选条件下没有匹配的文章。</p>
      </div>

      <div v-else class="panel table-panel">
        <table class="data-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>状态</th>
              <th>作者 / 分会</th>
              <th>发布时间</th>
              <th>更新时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td>
                <div class="table-cell-stack">
                  <strong>{{ row.title }}</strong>
                  <div class="muted-row">/{{ row.slug }}</div>
                </div>
              </td>
              <td><span class="status-pill">{{ formatContentStatus(row.status) }}</span></td>
              <td>
                <div class="table-cell-stack">
                  <strong>{{ row.authorName ?? "未指定作者" }}</strong>
                  <div class="muted-row">{{ row.branchName || "未关联分会" }}</div>
                </div>
              </td>
              <td>{{ formatDateTime(row.publishedAt) }}</td>
              <td>{{ formatDateTime(row.updatedAt) }}</td>
              <td class="table-actions-cell">
                <div class="table-action-list">
                  <RouterLink class="table-link" :to="`/articles/${row.id}/edit`">编辑</RouterLink>
                  <a class="table-link" :href="`/articles/${row.slug}`" target="_blank" rel="noreferrer">前台预览</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
