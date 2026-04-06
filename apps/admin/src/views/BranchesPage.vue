<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { contentStatusOptions, type AdminBranchListItem, type AdminBranchListMeta } from "@tgo/shared";

import { adminFetchWithMeta } from "../lib/api";
import { formatContentStatus, formatDate } from "../lib/format";
import { adminPageSizeOptions, formatPaginationSummary } from "../lib/pagination";

const rows = ref<AdminBranchListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const hasLoadedOnce = ref(false);
const currentPage = ref(1);
const filters = reactive({
  query: "",
  status: "all",
  region: "all",
  pageSize: adminPageSizeOptions[0]
});
const meta = ref<AdminBranchListMeta>({
  total: 0,
  page: 1,
  pageSize: adminPageSizeOptions[0],
  pageCount: 1,
  regionOptions: [],
  stats: {
    published: 0
  }
});

let activeRequestId = 0;
let fetchTimer: ReturnType<typeof setTimeout> | null = null;

const createEmptyMeta = (pageSize: number): AdminBranchListMeta => ({
  total: 0,
  page: 1,
  pageSize,
  pageCount: 1,
  regionOptions: [],
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

  if (filters.region !== "all") {
    search.set("region", filters.region);
  }

  return `/api/admin/v1/branches?${search.toString()}`;
};

const regionOptions = computed(() => meta.value.regionOptions);
const hasResults = computed(() => meta.value.total > 0);
const paginationSummary = computed(() => formatPaginationSummary(meta.value, rows.value.length));
const summaryChips = computed(() => [
  {
    label: "当前",
    value: `${meta.value.total} 个`
  },
  {
    label: "已发布",
    value: `${meta.value.stats.published} 个`
  }
]);
const quickFilters = [
  {
    key: "all",
    label: "全部分会",
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
    key: "draft",
    label: "草稿",
    matches: () => filters.status === "draft",
    apply: () => {
      filters.status = "draft";
    }
  },
  {
    key: "in-review",
    label: "审核中",
    matches: () => filters.status === "in_review",
    apply: () => {
      filters.status = "in_review";
    }
  }
] as const;

const loadRows = async () => {
  const requestId = ++activeRequestId;
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await adminFetchWithMeta<AdminBranchListItem[], AdminBranchListMeta>(buildListPath());

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
    errorMessage.value = error instanceof Error ? error.message : "无法加载分会列表。";
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
  () => [filters.query, filters.status, filters.region, filters.pageSize],
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
      <h2>分会维护</h2>

      <div class="page-actions page-actions-compact">
        <RouterLink class="button-link" to="/members">返回会员</RouterLink>
        <RouterLink class="button-link button-primary" to="/members/branches/new">新增分会</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="!hasLoadedOnce && loading" class="panel">
      <p>正在加载分会...</p>
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
            <input v-model="filters.query" type="search" placeholder="搜索分会、slug、城市或区域" />
          </label>

          <label class="field">
            <span>状态</span>
            <select v-model="filters.status">
              <option value="all">全部状态</option>
              <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>区域</span>
            <select v-model="filters.region">
              <option value="all">全部区域</option>
              <option v-for="option in regionOptions" :key="option" :value="option">{{ option }}</option>
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
        <p>正在更新分会列表...</p>
      </div>

      <div v-if="!loading && !hasResults" class="panel empty-state-card">
        <p>当前筛选条件下没有匹配的分会。</p>
      </div>

      <template v-else-if="hasResults">
        <div class="panel panel-compact table-panel">
          <div class="table-card-head">
            <h3>分会列表</h3>
            <span class="status-pill">当前 {{ meta.total }} 个</span>
          </div>

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
                  <div class="table-cell-stack">
                    <strong>{{ row.name }}</strong>
                    <div class="muted-row">/{{ row.slug }}</div>
                  </div>
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
