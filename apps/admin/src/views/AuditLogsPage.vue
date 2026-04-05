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
const getActorKey = (row: AdminAuditLogRecord) => row.actor.userId || row.actor.email || row.actor.name || "system";

const formatJson = (value: Record<string, unknown> | null) =>
  value ? JSON.stringify(value, null, 2) : "没有记录快照。";

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
const summaryCards = computed(() => [
  {
    label: "记录总数",
    value: rows.value.length,
    summary: "最近 50 条后台敏感操作都会收敛到这里。"
  },
  {
    label: "操作人",
    value: new Set(rows.value.map((row) => getActorKey(row))).size,
    summary: "实际在后台发起敏感操作的工作人员数量。"
  },
  {
    label: "对象类型",
    value: new Set(rows.value.map((row) => row.targetType)).size,
    summary: "当前审计日志覆盖到的业务对象类型数量。"
  },
  {
    label: "最近操作",
    value: rows.value[0] ? formatDateTime(rows.value[0].createdAt) : "-",
    summary: "用于快速判断后台最近一次敏感变更发生在什么时候。"
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
    <header class="page-header">
      <h2>审计日志</h2>
      <p>追踪敏感后台操作的行为人身份、请求元数据以及前后变化快照。</p>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载最近的审计活动...</p>
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
            <p class="section-copy">可按动作、对象类型、操作人、目标 ID、请求 IP 或浏览器标识快速定位一条审计记录。</p>
          </div>
          <div class="info-card">
            <span>结果</span>
            <strong>{{ filteredRows.length }} / {{ rows.length }}</strong>
            <p>当前筛选命中的审计记录数。</p>
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
        <div class="brand-tag">暂无记录</div>
        <p>当前还没有记录到后台审计事件。</p>
      </div>

      <div v-else-if="filteredRows.length === 0" class="panel empty-state-card">
        <div class="brand-tag">暂无结果</div>
        <p>当前筛选条件下没有匹配的审计日志，试试放宽关键词或切换对象类型。</p>
      </div>

      <div v-else class="audit-log-list">
        <div class="panel table-panel">
          <div class="table-card-head">
            <div>
              <h3>审计记录</h3>
              <p class="table-card-copy">保留操作人、对象、请求来源以及前后快照，便于回看敏感变更。</p>
            </div>

            <span class="status-pill">当前结果 {{ filteredRows.length }} 条</span>
          </div>
        </div>

        <article v-for="row in filteredRows" :key="row.id" class="panel audit-log-card stacked-gap">
          <div class="page-header-row audit-log-head">
            <div>
              <div class="brand-tag">{{ formatTargetType(row.targetType) }}</div>
              <h3>{{ formatAction(row.action) }}</h3>
              <p class="audit-log-meta">
                {{ formatActor(row) }} · {{ formatDateTime(row.createdAt) }}
              </p>
            </div>

            <div class="audit-log-badges">
              <span class="status-pill">{{ formatSnapshotState(row) }}</span>
              <span class="status-pill">{{ row.targetId || "无目标 ID" }}</span>
            </div>
          </div>

          <div class="panel-grid panel-grid-2 audit-log-context-grid">
            <article class="info-card">
              <span>操作人</span>
              <strong>{{ formatActor(row) }}</strong>
              <p>{{ row.actor.staffAccountId || "未记录工作人员账号 ID" }}</p>
            </article>
            <article class="info-card">
              <span>目标对象</span>
              <strong>{{ formatTargetType(row.targetType) }}</strong>
              <p>{{ row.targetId || "未记录目标 ID" }}</p>
            </article>
            <article class="info-card">
              <span>请求 IP</span>
              <strong>{{ row.requestIp || "-" }}</strong>
              <p>用于补充定位操作来源。</p>
            </article>
            <article class="info-card">
              <span>浏览器标识</span>
              <strong class="audit-log-user-agent">{{ row.userAgent || "-" }}</strong>
              <p>保留请求设备与浏览器环境信息。</p>
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
