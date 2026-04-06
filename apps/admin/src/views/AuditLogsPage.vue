<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

import type { AdminAuditLogListMeta, AdminAuditLogRecord } from "@tgo/shared";

import { adminFetchWithMeta } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { adminPageSizeOptions, formatPaginationSummary } from "../lib/pagination";

const rows = ref<AdminAuditLogRecord[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const hasLoadedOnce = ref(false);
const currentPage = ref(1);
const filters = reactive({
  query: "",
  targetType: "all",
  action: "all",
  actionFamily: "all",
  pageSize: adminPageSizeOptions[0]
});
const meta = ref<AdminAuditLogListMeta>({
  total: 0,
  page: 1,
  pageSize: adminPageSizeOptions[0],
  pageCount: 1,
  targetTypeOptions: [],
  actionOptions: []
});

const segmentLabels: Record<string, string> = {
  topic: "主题",
  article: "文章",
  event: "活动",
  registration: "报名",
  application: "申请",
  asset: "资源",
  staff: "工作人员",
  role: "角色",
  featured_block: "推荐位",
  featured: "推荐位",
  settings: "设置",
  site_settings: "站点设置",
  create: "创建",
  update: "更新",
  publish: "发布",
  archive: "归档",
  review: "审核",
  complete: "完成",
  upload: "上传"
};

let activeRequestId = 0;
let fetchTimer: ReturnType<typeof setTimeout> | null = null;

const formatSegment = (value: string) => segmentLabels[value] ?? value.replace(/_/g, " ");
const formatAction = (value: string) => value.split(".").map(formatSegment).join(" / ");
const formatTargetType = (value: string) => formatSegment(value);

const formatActor = (row: AdminAuditLogRecord) => {
  if (row.actor.name && row.actor.email) {
    return `${row.actor.name} (${row.actor.email})`;
  }

  return row.actor.name || row.actor.email || "系统";
};

const formatJson = (value: Record<string, unknown> | null) => (value ? JSON.stringify(value, null, 2) : "没有记录快照。");

const formatSnapshotState = (row: AdminAuditLogRecord) => {
  if (row.beforeJson && row.afterJson) {
    return "包含前后快照";
  }

  if (!row.beforeJson && row.afterJson) {
    return "仅保留变更后";
  }

  if (row.beforeJson && !row.afterJson) {
    return "仅保留变更前";
  }

  return "无快照";
};

const createEmptyMeta = (pageSize: number): AdminAuditLogListMeta => ({
  total: 0,
  page: 1,
  pageSize,
  pageCount: 1,
  targetTypeOptions: [],
  actionOptions: []
});

const buildListPath = () => {
  const search = new URLSearchParams();
  search.set("page", String(currentPage.value));
  search.set("pageSize", String(filters.pageSize));

  const query = filters.query.trim();

  if (query.length > 0) {
    search.set("q", query);
  }

  if (filters.targetType !== "all") {
    search.set("targetType", filters.targetType);
  }

  if (filters.action !== "all") {
    search.set("action", filters.action);
  }

  if (filters.actionFamily !== "all") {
    search.set("actionFamily", filters.actionFamily);
  }

  return `/api/admin/v1/audit-logs?${search.toString()}`;
};

const targetTypeOptions = computed(() => meta.value.targetTypeOptions);
const actionOptions = computed(() => meta.value.actionOptions);
const hasResults = computed(() => meta.value.total > 0);
const paginationSummary = computed(() => formatPaginationSummary(meta.value, rows.value.length));
const summaryItems = computed(() => [
  {
    label: "当前结果",
    value: `${meta.value.total} 条`
  }
]);
const quickFilters = [
  {
    key: "all",
    label: "全部记录",
    matches: () => filters.targetType === "all" && filters.action === "all" && filters.actionFamily === "all",
    apply: () => {
      filters.targetType = "all";
      filters.action = "all";
      filters.actionFamily = "all";
    }
  },
  {
    key: "application",
    label: "申请",
    matches: () => filters.targetType === "application",
    apply: () => {
      filters.action = "all";
      filters.targetType = "application";
      filters.actionFamily = "all";
    }
  },
  {
    key: "event",
    label: "活动",
    matches: () => filters.targetType === "event",
    apply: () => {
      filters.action = "all";
      filters.targetType = "event";
      filters.actionFamily = "all";
    }
  },
  {
    key: "update",
    label: "更新动作",
    matches: () => filters.actionFamily === "update",
    apply: () => {
      filters.targetType = "all";
      filters.action = "all";
      filters.actionFamily = "update";
    }
  }
] as const;

const loadRows = async () => {
  const requestId = ++activeRequestId;
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await adminFetchWithMeta<AdminAuditLogRecord[], AdminAuditLogListMeta>(buildListPath());

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
    errorMessage.value = error instanceof Error ? error.message : "无法加载审计日志。";
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
  () => [filters.query, filters.targetType, filters.action, filters.actionFamily, filters.pageSize],
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
      <h2>审计日志</h2>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="!hasLoadedOnce && loading" class="panel">
      <p>正在加载审计日志...</p>
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
            <div v-for="item in summaryItems" :key="item.label" class="summary-chip">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </div>

        <div class="field-grid field-grid-4">
          <label class="field">
            <span>搜索</span>
            <input v-model="filters.query" type="search" placeholder="搜索动作、对象、操作人或目标 ID" />
          </label>

          <label class="field">
            <span>对象类型</span>
            <select v-model="filters.targetType">
              <option value="all">全部对象类型</option>
              <option v-for="option in targetTypeOptions" :key="option" :value="option">{{ formatTargetType(option) }}</option>
            </select>
          </label>

          <label class="field">
            <span>动作</span>
            <select v-model="filters.action">
              <option value="all">全部动作</option>
              <option v-for="option in actionOptions" :key="option" :value="option">{{ formatAction(option) }}</option>
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
        <p>正在更新审计日志...</p>
      </div>

      <div v-else-if="!hasResults" class="panel empty-state-card">
        <p>当前筛选条件下没有匹配的审计日志。</p>
      </div>

      <template v-else>
        <div class="audit-log-list">
          <article v-for="row in rows" :key="row.id" class="panel panel-compact audit-log-card stacked-gap-tight">
            <div class="audit-log-head">
              <div class="audit-log-headline">
                <div class="audit-log-title-row">
                  <h3>{{ formatAction(row.action) }}</h3>

                  <div class="audit-log-topline">
                    <span class="status-pill">{{ formatTargetType(row.targetType) }}</span>
                    <span class="status-pill">{{ formatSnapshotState(row) }}</span>
                  </div>
                </div>

                <p class="audit-log-meta">
                  {{ formatActor(row) }} · {{ formatDateTime(row.createdAt) }}
                  <template v-if="row.targetId"> · 目标 ID {{ row.targetId }}</template>
                </p>
              </div>
            </div>

            <div v-if="row.beforeJson || row.afterJson" class="audit-log-diff">
              <details v-if="row.beforeJson" class="audit-log-detail">
                <summary>变更前快照</summary>
                <pre class="json-preview">{{ formatJson(row.beforeJson) }}</pre>
              </details>

              <details v-if="row.afterJson" class="audit-log-detail">
                <summary>变更后快照</summary>
                <pre class="json-preview">{{ formatJson(row.afterJson) }}</pre>
              </details>
            </div>
          </article>
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
