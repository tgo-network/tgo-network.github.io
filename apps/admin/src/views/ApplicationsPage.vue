<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { applicationStatusOptions, type AdminJoinApplicationListItem, type AdminJoinApplicationListMeta } from "@tgo/shared";

import { adminFetchWithMeta } from "../lib/api";
import { formatApplicationStatus, formatDateTime } from "../lib/format";
import { adminPageSizeOptions, formatPaginationSummary } from "../lib/pagination";

const rows = ref<AdminJoinApplicationListItem[]>([]);
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
const meta = ref<AdminJoinApplicationListMeta>({
  total: 0,
  page: 1,
  pageSize: adminPageSizeOptions[0],
  pageCount: 1,
  branchOptions: [],
  stats: {
    pending: 0
  }
});

let activeRequestId = 0;
let fetchTimer: ReturnType<typeof setTimeout> | null = null;

const createEmptyMeta = (pageSize: number): AdminJoinApplicationListMeta => ({
  total: 0,
  page: 1,
  pageSize,
  pageCount: 1,
  branchOptions: [],
  stats: {
    pending: 0
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

  return `/api/admin/v1/applications?${search.toString()}`;
};

const branchOptions = computed(() => meta.value.branchOptions);
const hasResults = computed(() => meta.value.total > 0);
const paginationSummary = computed(() => formatPaginationSummary(meta.value, rows.value.length));
const summaryChips = computed(() => [
  {
    label: "当前",
    value: `${meta.value.total} 条`
  },
  {
    label: "待审核",
    value: `${meta.value.stats.pending} 条`
  },
  {
    label: "分页",
    value: `第 ${meta.value.page} / ${meta.value.pageCount} 页`
  }
]);
const quickFilters = [
  {
    key: "all",
    label: "全部申请",
    matches: () => filters.status === "all",
    apply: () => {
      filters.status = "all";
    }
  },
  {
    key: "submitted",
    label: "待审核",
    matches: () => filters.status === "submitted",
    apply: () => {
      filters.status = "submitted";
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
    key: "approved",
    label: "已通过",
    matches: () => filters.status === "approved",
    apply: () => {
      filters.status = "approved";
    }
  }
] as const;

const loadRows = async () => {
  const requestId = ++activeRequestId;
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await adminFetchWithMeta<AdminJoinApplicationListItem[], AdminJoinApplicationListMeta>(buildListPath());

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
    errorMessage.value = error instanceof Error ? error.message : "无法加载申请列表。";
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
      <h2>申请</h2>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="!hasLoadedOnce && loading" class="panel">
      <p>正在加载加入申请...</p>
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
            <input v-model="filters.query" type="search" placeholder="搜索姓名、手机号、微信号、邮箱或分会" />
          </label>

          <label class="field">
            <span>状态</span>
            <select v-model="filters.status">
              <option value="all">全部状态</option>
              <option v-for="option in applicationStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>意向分会</span>
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
        <p>正在更新申请列表...</p>
      </div>

      <div v-if="!loading && !hasResults" class="panel empty-state-card">
        <p>当前筛选条件下没有匹配的申请。</p>
      </div>

      <template v-else-if="hasResults">
        <div class="panel panel-compact table-panel">
          <table class="data-table">
            <thead>
              <tr>
                <th>申请人</th>
                <th>联系方式</th>
                <th>意向分会</th>
                <th>状态</th>
                <th>提交时间</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id">
                <td>
                  <div class="table-cell-stack">
                    <strong>{{ row.name }}</strong>
                    <div class="muted-row">申请编号 {{ row.id }}</div>
                  </div>
                </td>
                <td>
                  <div class="table-cell-stack">
                    <strong>{{ row.phoneNumber }}</strong>
                    <div class="table-meta-row">
                      <span>{{ row.wechatId || "未填微信" }}</span>
                      <span>{{ row.email || "未填邮箱" }}</span>
                    </div>
                  </div>
                </td>
                <td>{{ row.targetBranchName || "未指定" }}</td>
                <td><span class="status-pill">{{ formatApplicationStatus(row.status) }}</span></td>
                <td>{{ formatDateTime(row.createdAt) }}</td>
                <td class="table-actions-cell">
                  <RouterLink class="table-link" :to="`/applications/${row.id}`">进入审核</RouterLink>
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
