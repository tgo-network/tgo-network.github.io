<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import {
  contentStatusOptions,
  eventRegistrationStateOptions,
  type AdminEventListItemV2,
  type AdminEventListMetaV2
} from "@tgo/shared";

import { adminFetchWithMeta } from "../lib/api";
import { formatContentStatus, formatDateTime, formatEventRegistrationState } from "../lib/format";
import { adminPageSizeOptions, formatPaginationSummary } from "../lib/pagination";

const rows = ref<AdminEventListItemV2[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const hasLoadedOnce = ref(false);
const currentPage = ref(1);
const filters = reactive({
  query: "",
  status: "all",
  registrationState: "all",
  branchId: "all",
  pageSize: adminPageSizeOptions[0]
});
const meta = ref<AdminEventListMetaV2>({
  total: 0,
  page: 1,
  pageSize: adminPageSizeOptions[0],
  pageCount: 1,
  branchOptions: [],
  stats: {
    total: 0,
    open: 0,
    waitlist: 0,
    published: 0
  }
});

let activeRequestId = 0;
let fetchTimer: ReturnType<typeof setTimeout> | null = null;

const createEmptyMeta = (pageSize: number): AdminEventListMetaV2 => ({
  total: 0,
  page: 1,
  pageSize,
  pageCount: 1,
  branchOptions: [],
  stats: {
    total: 0,
    open: 0,
    waitlist: 0,
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

  if (filters.registrationState !== "all") {
    search.set("registrationState", filters.registrationState);
  }

  if (filters.branchId !== "all") {
    search.set("branchId", filters.branchId);
  }

  return `/api/admin/v1/events?${search.toString()}`;
};

const branchOptions = computed(() => meta.value.branchOptions);
const hasResults = computed(() => meta.value.total > 0);
const paginationSummary = computed(() => formatPaginationSummary(meta.value, rows.value.length));
const summaryChips = computed(() => [
  {
    label: "当前",
    value: `${meta.value.total} 场`
  },
  {
    label: "开放报名",
    value: `${meta.value.stats.open} 场`
  },
  {
    label: "候补中",
    value: `${meta.value.stats.waitlist} 场`
  },
  {
    label: "分页",
    value: `第 ${meta.value.page} / ${meta.value.pageCount} 页`
  }
]);
const quickFilters = [
  {
    key: "all",
    label: "全部活动",
    matches: () => filters.status === "all" && filters.registrationState === "all",
    apply: () => {
      filters.status = "all";
      filters.registrationState = "all";
    }
  },
  {
    key: "open",
    label: "开放报名",
    matches: () => filters.registrationState === "open",
    apply: () => {
      filters.status = "all";
      filters.registrationState = "open";
    }
  },
  {
    key: "waitlist",
    label: "候补中",
    matches: () => filters.registrationState === "waitlist",
    apply: () => {
      filters.status = "all";
      filters.registrationState = "waitlist";
    }
  },
  {
    key: "published",
    label: "已发布",
    matches: () => filters.status === "published",
    apply: () => {
      filters.registrationState = "all";
      filters.status = "published";
    }
  }
] as const;

const loadRows = async () => {
  const requestId = ++activeRequestId;
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await adminFetchWithMeta<AdminEventListItemV2[], AdminEventListMetaV2>(buildListPath());

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
    errorMessage.value = error instanceof Error ? error.message : "无法加载活动列表。";
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
  () => [filters.query, filters.status, filters.registrationState, filters.branchId, filters.pageSize],
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
      <h2>活动</h2>

      <div class="page-actions page-actions-compact">
        <RouterLink class="button-link button-primary" to="/events/new">新建活动</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="!hasLoadedOnce && loading" class="panel">
      <p>正在加载活动...</p>
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

        <div class="field-grid field-grid-5">
          <label class="field">
            <span>搜索</span>
            <input v-model="filters.query" type="search" placeholder="搜索标题、slug 或分会" />
          </label>

          <label class="field">
            <span>内容状态</span>
            <select v-model="filters.status">
              <option value="all">全部状态</option>
              <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>报名状态</span>
            <select v-model="filters.registrationState">
              <option value="all">全部报名状态</option>
              <option v-for="option in eventRegistrationStateOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>分会</span>
            <select v-model="filters.branchId">
              <option value="all">全部分会</option>
              <option v-for="option in branchOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
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
        <p>正在更新活动列表...</p>
      </div>

      <div v-if="!loading && !hasResults" class="panel empty-state-card">
        <p>当前筛选条件下没有匹配的活动。</p>
      </div>

      <template v-else-if="hasResults">
        <div class="panel panel-compact table-panel">
          <table class="data-table">
            <thead>
              <tr>
                <th>标题</th>
                <th>分会 / 场地</th>
                <th>内容状态</th>
                <th>报名状态</th>
                <th>开始时间</th>
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
                <td>
                  <div class="table-cell-stack">
                    <strong>{{ row.branchName || "未分配分会" }}</strong>
                    <div class="muted-row">{{ row.venueName || "待补充场地" }}</div>
                  </div>
                </td>
                <td><span class="status-pill">{{ formatContentStatus(row.status) }}</span></td>
                <td><span class="status-pill">{{ formatEventRegistrationState(row.registrationState) }}</span></td>
                <td>{{ formatDateTime(row.startsAt) }}</td>
                <td class="table-actions-cell">
                  <div class="table-action-list">
                    <RouterLink class="table-link" :to="`/events/${row.id}/edit`">编辑</RouterLink>
                    <RouterLink class="table-link" :to="`/events/${row.id}/registrations`">报名审核</RouterLink>
                    <a class="table-link" :href="`/events/${row.slug}`" target="_blank" rel="noreferrer">前台预览</a>
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
