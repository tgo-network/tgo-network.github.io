<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

import type { AdminAuditLogRecord } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatDateTime } from "../lib/format";

const rows = ref<AdminAuditLogRecord[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const filters = reactive({
  query: "",
  targetType: "all",
  action: "all",
  actionFamily: "all"
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

const targetTypeOptions = computed(() =>
  Array.from(new Set(rows.value.map((row) => row.targetType))).sort((left, right) =>
    formatTargetType(left).localeCompare(formatTargetType(right), "zh-CN")
  )
);
const actionOptions = computed(() =>
  Array.from(new Set(rows.value.map((row) => row.action))).sort((left, right) =>
    formatAction(left).localeCompare(formatAction(right), "zh-CN")
  )
);
const filteredRows = computed(() => {
  const query = filters.query.trim().toLowerCase();

  return rows.value.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      [
        formatAction(row.action),
        formatTargetType(row.targetType),
        formatActor(row),
        row.targetId ?? "",
        row.requestIp ?? "",
        row.userAgent ?? ""
      ].some((value) => value.toLowerCase().includes(query));
    const matchesTargetType = filters.targetType === "all" || row.targetType === filters.targetType;
    const matchesAction = filters.action === "all" || row.action === filters.action;
    const matchesActionFamily = filters.actionFamily === "all" || row.action.endsWith(".update");

    return matchesQuery && matchesTargetType && matchesAction && matchesActionFamily;
  });
});
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

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminAuditLogRecord[]>("/api/admin/v1/audit-logs");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载审计日志。";
  } finally {
    loading.value = false;
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

    <div v-else-if="loading" class="panel">
      <p>正在加载审计日志...</p>
    </div>

    <template v-else>
      <div class="panel filter-panel">
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
            <input v-model="filters.query" type="search" placeholder="搜索动作、对象、操作人、目标 ID、IP 或浏览器标识" />
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
        </div>
      </div>

      <div v-if="rows.length === 0" class="panel empty-state-card">
        <p>当前还没有审计记录。</p>
      </div>

      <div v-else-if="filteredRows.length === 0" class="panel empty-state-card">
        <p>当前筛选条件下没有匹配的审计日志。</p>
      </div>

      <div v-else class="audit-log-list">
        <article v-for="row in filteredRows" :key="row.id" class="panel audit-log-card stacked-gap">
          <div class="page-header-row audit-log-head">
            <div>
              <div class="brand-tag">{{ formatTargetType(row.targetType) }}</div>
              <h3>{{ formatAction(row.action) }}</h3>
              <p class="audit-log-meta">{{ formatActor(row) }} · {{ formatDateTime(row.createdAt) }}</p>
            </div>

            <div class="audit-log-badges">
              <span class="status-pill">{{ formatSnapshotState(row) }}</span>
              <span class="status-pill">{{ row.targetId || "无目标 ID" }}</span>
            </div>
          </div>

          <div class="panel-grid panel-grid-2 audit-log-context-grid">
            <article class="info-card compact-info-card">
              <span>操作人</span>
              <strong>{{ formatActor(row) }}</strong>
            </article>
            <article class="info-card compact-info-card">
              <span>目标对象</span>
              <strong>{{ formatTargetType(row.targetType) }}</strong>
            </article>
            <article class="info-card compact-info-card">
              <span>请求 IP</span>
              <strong>{{ row.requestIp || "-" }}</strong>
            </article>
            <article class="info-card compact-info-card">
              <span>浏览器</span>
              <strong class="audit-log-user-agent">{{ row.userAgent || "-" }}</strong>
            </article>
          </div>

          <div class="audit-log-diff">
            <details class="audit-log-detail">
              <summary>变更前快照</summary>
              <pre class="json-preview">{{ formatJson(row.beforeJson) }}</pre>
            </details>

            <details class="audit-log-detail">
              <summary>变更后快照</summary>
              <pre class="json-preview">{{ formatJson(row.afterJson) }}</pre>
            </details>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>
