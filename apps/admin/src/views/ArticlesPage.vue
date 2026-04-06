<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { contentStatusOptions, type AdminArticleListItem, type AdminArticleListMeta } from "@tgo/shared";

import { adminFetchWithMeta } from "../lib/api";
import { formatContentStatus, formatDateTime } from "../lib/format";
import { adminPageSizeOptions, formatPaginationSummary } from "../lib/pagination";

const rows = ref<AdminArticleListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const hasLoadedOnce = ref(false);
const currentPage = ref(1);
const filters = reactive({
  query: "",
  status: "all",
  branch: "all",
  pageSize: adminPageSizeOptions[0]
});
const meta = ref<AdminArticleListMeta>({
  total: 0,
  page: 1,
  pageSize: adminPageSizeOptions[0],
  pageCount: 1,
  branchOptions: [],
  stats: {
    published: 0
  }
});

let activeRequestId = 0;
let fetchTimer: ReturnType<typeof setTimeout> | null = null;

const createEmptyMeta = (pageSize: number): AdminArticleListMeta => ({
  total: 0,
  page: 1,
  pageSize,
  pageCount: 1,
  branchOptions: [],
  stats: {
    published: 0
  }
});

const buildListPath = () => {
  const search = new URLSearchParams();
  search.set("page", String(currentPage.value));
  search.set("pageSize", String(filters.pageSize));

  const query = filters.query.trim();

  if (query.length > 0) {
    search.set("q", query);
  }

  if (filters.status !== "all") {
    search.set("status", filters.status);
  }

  if (filters.branch !== "all") {
    search.set("branch", filters.branch);
  }

  return `/api/admin/v1/articles?${search.toString()}`;
};

const branchOptions = computed(() => meta.value.branchOptions);
const hasResults = computed(() => meta.value.total > 0);
const paginationSummary = computed(() => formatPaginationSummary(meta.value, rows.value.length));
const summaryChips = computed(() => [
  {
    label: "当前",
    value: `${meta.value.total} 篇`
  },
  {
    label: "已发布",
    value: `${meta.value.stats.published} 篇`
  }
]);
const quickFilters = [
  {
    key: "all",
    label: "全部文章",
    matches: () => filters.status === "all",
    apply: () => {
      filters.status = "all";
    }
  },
  {
    key: "published",
    label: "已发布",
    matches: () => filters.status === "published",
    apply: () => {
      filters.status = "published";
    }
  },
  {
    key: "in-review",
    label: "审核中",
    matches: () => filters.status === "in_review",
    apply: () => {
      filters.status = "in_review";
    }
  },
  {
    key: "draft",
    label: "草稿",
    matches: () => filters.status === "draft",
    apply: () => {
      filters.status = "draft";
    }
  }
] as const;

const loadRows = async () => {
  const requestId = ++activeRequestId;
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await adminFetchWithMeta<AdminArticleListItem[], AdminArticleListMeta>(buildListPath());

    if (requestId !== activeRequestId) {
      return;
    }

    rows.value = result.data;
    meta.value = result.meta ?? createEmptyMeta(filters.pageSize);
    currentPage.value = meta.value.page;
  } catch (error) {
    if (requestId !== activeRequestId) {
      return;
    }

    rows.value = [];
    meta.value = createEmptyMeta(filters.pageSize);
    errorMessage.value = error instanceof Error ? error.message : "无法加载文章列表。";
  } finally {
    if (requestId === activeRequestId) {
      loading.value = false;
      hasLoadedOnce.value = true;
    }
  }
};

const scheduleReload = (resetPage = false) => {
  if (resetPage) {
    currentPage.value = 1;
  }

  if (fetchTimer) {
    clearTimeout(fetchTimer);
  }

  fetchTimer = setTimeout(() => {
    fetchTimer = null;
    void loadRows();
  }, 250);
};

const changePage = (page: number) => {
  if (loading.value || page < 1 || page > meta.value.pageCount || page === currentPage.value) {
    return;
  }

  currentPage.value = page;
  void loadRows();
};

watch(
  () => [filters.query, filters.status, filters.branch, filters.pageSize],
  () => {
    if (!hasLoadedOnce.value) {
      return;
    }

    scheduleReload(true);
  }
);

onMounted(() => {
  void loadRows();
});

onBeforeUnmount(() => {
  if (fetchTimer) {
    clearTimeout(fetchTimer);
  }
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <h2>文章</h2>

      <div class="page-actions page-actions-compact">
        <RouterLink class="button-link button-primary" to="/articles/new">新建文章</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="!hasLoadedOnce && loading" class="panel">
      <p>正在加载文章...</p>
    </div>

    <template v-else>
      <div class="panel panel-compact filter-panel filter-panel-compact">
        <div class="filter-toolbar">
          <div class="segmented-actions">
            <button
              v-for="item in quickFilters"
              :key="item.key"
              type="button"
              class="segmented-button"
              :class="{ 'is-active': item.matches() }"
              @click="item.apply()"
            >
              {{ item.label }}
            </button>
          </div>

          <div class="summary-chip-row">
            <div v-for="item in summaryChips" :key="item.label" class="summary-chip">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </div>

        <div class="field-grid field-grid-4">
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

          <label class="field">
            <span>每页数量</span>
            <select v-model.number="filters.pageSize">
              <option v-for="option in adminPageSizeOptions" :key="option" :value="option">{{ option }} 条</option>
            </select>
          </label>
        </div>
      </div>

      <div v-if="loading" class="panel">
        <p>正在更新文章列表...</p>
      </div>

      <div v-if="!loading && !hasResults" class="panel empty-state-card">
        <p>当前筛选条件下没有匹配的文章。</p>
      </div>

      <template v-else-if="hasResults">
        <div class="panel panel-compact table-panel">
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
              <tr v-for="row in rows" :key="row.id">
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

        <div class="pagination-panel">
          <div class="filter-summary">{{ paginationSummary }}</div>

          <div class="pagination-actions">
            <button class="button-link" type="button" :disabled="loading || meta.page <= 1" @click="changePage(meta.page - 1)">
              上一页
            </button>
            <button class="button-link" type="button" :disabled="loading || meta.page >= meta.pageCount" @click="changePage(meta.page + 1)">
              下一页
            </button>
          </div>
        </div>
      </template>
    </template>
  </section>
</template>
