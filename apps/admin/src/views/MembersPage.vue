<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import type { AdminMemberListItem, AdminMemberListMeta } from "@tgo/shared";

import { adminFetchWithMeta } from "../lib/api";
import { formatDateTime, formatMemberVisibility, formatMembershipStatus } from "../lib/format";
import { adminPageSizeOptions, formatPaginationSummary } from "../lib/pagination";

const rows = ref<AdminMemberListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const hasLoadedOnce = ref(false);
const currentPage = ref(1);
const filters = reactive({
  query: "",
  membershipStatus: "all",
  visibility: "all",
  branch: "all",
  pageSize: adminPageSizeOptions[0]
});
const meta = ref<AdminMemberListMeta>({
  total: 0,
  page: 1,
  pageSize: adminPageSizeOptions[0],
  pageCount: 1,
  branchOptions: [],
  stats: {
    active: 0,
    public: 0
  }
});

let activeRequestId = 0;
let fetchTimer: ReturnType<typeof setTimeout> | null = null;

const createEmptyMeta = (pageSize: number): AdminMemberListMeta => ({
  total: 0,
  page: 1,
  pageSize,
  pageCount: 1,
  branchOptions: [],
  stats: {
    active: 0,
    public: 0
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

  if (filters.membershipStatus !== "all") {
    search.set("membershipStatus", filters.membershipStatus);
  }

  if (filters.visibility !== "all") {
    search.set("visibility", filters.visibility);
  }

  if (filters.branch !== "all") {
    search.set("branch", filters.branch);
  }

  return `/api/admin/v1/members?${search.toString()}`;
};

const branchOptions = computed(() => meta.value.branchOptions);
const hasResults = computed(() => meta.value.total > 0);
const paginationSummary = computed(() => formatPaginationSummary(meta.value, rows.value.length));
const summaryChips = computed(() => [
  {
    label: "当前",
    value: `${meta.value.total} 位`
  },
  {
    label: "有效成员",
    value: `${meta.value.stats.active} 位`
  }
]);
const quickFilters = [
  {
    key: "all",
    label: "全部成员",
    matches: () => filters.membershipStatus === "all" && filters.visibility === "all",
    apply: () => {
      filters.membershipStatus = "all";
      filters.visibility = "all";
    }
  },
  {
    key: "active",
    label: "有效成员",
    matches: () => filters.membershipStatus === "active",
    apply: () => {
      filters.visibility = "all";
      filters.membershipStatus = "active";
    }
  },
  {
    key: "public",
    label: "公开资料",
    matches: () => filters.visibility === "public",
    apply: () => {
      filters.membershipStatus = "all";
      filters.visibility = "public";
    }
  },
  {
    key: "private",
    label: "私有资料",
    matches: () => filters.visibility === "private",
    apply: () => {
      filters.membershipStatus = "all";
      filters.visibility = "private";
    }
  }
] as const;

const loadRows = async () => {
  const requestId = ++activeRequestId;
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await adminFetchWithMeta<AdminMemberListItem[], AdminMemberListMeta>(buildListPath());

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
    errorMessage.value = error instanceof Error ? error.message : "无法加载成员列表。";
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
  () => [filters.query, filters.membershipStatus, filters.visibility, filters.branch, filters.pageSize],
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
      <h2>成员</h2>

      <div class="page-actions page-actions-compact">
        <RouterLink class="button-link" to="/members/branches">分会维护</RouterLink>
        <RouterLink class="button-link button-primary" to="/members/new">新增成员</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="!hasLoadedOnce && loading" class="panel">
      <p>正在加载成员...</p>
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
            <input v-model="filters.query" type="search" placeholder="搜索姓名、slug、公司、职称或分会" />
          </label>

          <label class="field">
            <span>成员状态</span>
            <select v-model="filters.membershipStatus">
              <option value="all">全部成员状态</option>
              <option value="active">有效成员</option>
              <option value="alumni">校友成员</option>
              <option value="paused">暂停展示</option>
            </select>
          </label>

          <label class="field">
            <span>可见性</span>
            <select v-model="filters.visibility">
              <option value="all">全部可见性</option>
              <option value="public">公开</option>
              <option value="private">私有</option>
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
        <p>正在更新成员列表...</p>
      </div>

      <div v-if="!loading && !hasResults" class="panel empty-state-card">
        <p>当前筛选条件下没有匹配的成员。</p>
      </div>

      <template v-else-if="hasResults">
        <div class="panel panel-compact table-panel">
          <table class="data-table data-table-member-list">
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
                  <div class="table-cell-stack">
                    <strong>{{ row.name }}</strong>
                    <div class="muted-row">/{{ row.slug }}</div>
                  </div>
                </td>
                <td>
                  <div class="table-cell-stack">
                    <strong>{{ row.company }}</strong>
                    <div class="muted-row">{{ row.title }}</div>
                  </div>
                </td>
                <td class="table-cell-nowrap">{{ row.branchName || "未分配" }}</td>
                <td class="table-cell-nowrap"><span class="status-pill">{{ formatMembershipStatus(row.membershipStatus) }}</span></td>
                <td class="table-cell-nowrap"><span class="status-pill">{{ formatMemberVisibility(row.visibility) }}</span></td>
                <td class="table-cell-nowrap">{{ formatDateTime(row.joinedAt) }}</td>
                <td class="table-actions-cell">
                  <div class="table-action-list table-action-list-inline">
                    <RouterLink class="table-link" :to="`/members/${row.id}/edit`">编辑</RouterLink>
                    <a class="table-link" :href="`/members/${row.slug}`" target="_blank" rel="noreferrer">前台预览</a>
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
