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

const pageSizeOptions = [25, 50, 100] as const;

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
  pageSize: pageSizeOptions[0]
});
const meta = ref<AdminEventListMetaV2>({
  total: 0,
  page: 1,
  pageSize: pageSizeOptions[0],
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

const summaryCards = computed(() => [
  {
    label: "活动总数",
    value: meta.value.stats.total,
    summary: "后台当前维护的全部活动记录。"
  },
  {
    label: "开放报名",
    value: meta.value.stats.open,
    summary: "前台会直接显示公开报名表单。"
  },
  {
    label: "候补中",
    value: meta.value.stats.waitlist,
    summary: "仍可提交，但需要工作人员后续审核安排。"
  },
  {
    label: "已发布",
    value: meta.value.stats.published,
    summary: "已经出现在公开活动列表中的活动。"
  }
]);

const branchOptions = computed(() => meta.value.branchOptions);
const hasResults = computed(() => meta.value.total > 0);
const resultSummary = computed(() => `${meta.value.total} / ${meta.value.stats.total}`);
const paginationSummary = computed(
  () => `第 ${meta.value.page} / ${meta.value.pageCount} 页，每页 ${meta.value.pageSize} 条，当前页 ${rows.value.length} 条`
);
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
      <div>
        <h2>活动</h2>
        <p>活动管理同时承接公开列表展示、详情页信息、议程配置和活动报名审核的上游入口。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link button-primary" to="/events/new">新建活动</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="!hasLoadedOnce && loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载活动...</p>
    </div>

    <template v-else>
      <div class="panel-grid panel-grid-4">
        <article v-for="item in summaryCards" :key="item.label" class="panel stat-panel">
          <div class="brand-tag">{{ item.label }}</div>
          <strong>{{ item.value }}</strong>
          <p>{{ item.summary }}</p>
        </article>
      </div>

      <div class="panel filter-panel">
        <div class="page-header-row compact-row">
          <div>
            <div class="brand-tag">筛选</div>
            <p class="section-copy">可按活动标题、分会、场地、内容状态和报名状态锁定当前需要继续推进的活动。</p>
          </div>
          <div class="info-card">
            <span>结果</span>
            <strong>{{ resultSummary }}</strong>
            <p>{{ paginationSummary }}</p>
          </div>
        </div>

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
        </div>

        <div class="field-grid field-grid-3">
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
        </div>

        <div class="field-grid field-grid-3">
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
              <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ option }} 条</option>
            </select>
          </label>
        </div>
      </div>

      <div v-if="loading" class="panel">
        <div class="brand-tag">刷新中</div>
        <p>正在根据当前筛选条件更新活动列表...</p>
      </div>

      <div v-if="!loading && !hasResults" class="panel empty-state-card">
        <div class="brand-tag">暂无结果</div>
        <p>当前筛选条件下没有匹配的活动，试试调整报名状态、分会或关键词。</p>
      </div>

      <template v-else-if="hasResults">
        <div class="panel table-panel">
          <div class="table-card-head">
            <div>
              <h3>活动列表</h3>
              <p class="table-card-copy">当前页展示 {{ rows.length }} 场活动，可继续进入编辑、报名审核或前台预览。</p>
            </div>

            <span class="status-pill">{{ paginationSummary }}</span>
          </div>

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

        <div class="panel pagination-panel">
          <div class="info-card pagination-summary-card">
            <span>分页</span>
            <strong>{{ paginationSummary }}</strong>
            <p>当前筛选共命中 {{ meta.total }} 条活动记录。</p>
          </div>

          <div class="pagination-actions">
            <button class="button-link" type="button" :disabled="loading || meta.page <= 1" @click="changePage(meta.page - 1)">
              上一页
            </button>
            <button
              class="button-link"
              type="button"
              :disabled="loading || meta.page >= meta.pageCount"
              @click="changePage(meta.page + 1)"
            >
              下一页
            </button>
          </div>
        </div>
      </template>
    </template>
  </section>
</template>
