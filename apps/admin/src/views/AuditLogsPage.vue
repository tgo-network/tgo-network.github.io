<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import type { AdminAuditLogRecord } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatDateTime } from "../lib/format";

const rows = ref<AdminAuditLogRecord[]>([]);
const loading = ref(true);
const errorMessage = ref("");

const uniqueActorCount = computed(() => new Set(rows.value.map((row) => row.actor.userId).filter(Boolean)).size);
const mutationTypes = computed(() => new Set(rows.value.map((row) => row.targetType)).size);

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

const formatJson = (value: Record<string, unknown> | null) =>
  value ? JSON.stringify(value, null, 2) : "没有记录快照。";

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
  <section>
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
      <div class="panel-grid panel-grid-4" style="margin-bottom: 18px;">
        <article class="panel stat-panel">
          <div class="brand-tag">记录数</div>
          <strong>{{ rows.length }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">操作人</div>
          <strong>{{ uniqueActorCount }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">对象类型</div>
          <strong>{{ mutationTypes }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">最近时间</div>
          <strong style="font-size: 1.05rem;">{{ rows[0] ? formatDateTime(rows[0].createdAt) : "-" }}</strong>
        </article>
      </div>

      <div v-if="rows.length === 0" class="panel">
        <div class="brand-tag">暂无记录</div>
        <p>当前还没有记录到后台审计事件。</p>
      </div>

      <div v-else class="audit-log-list">
        <article v-for="row in rows" :key="row.id" class="panel audit-log-card stacked-gap">
          <div class="page-header-row audit-log-head">
            <div>
              <div class="brand-tag">{{ formatTargetType(row.targetType) }}</div>
              <h3>{{ formatAction(row.action) }}</h3>
              <p class="audit-log-meta">
                {{ formatActor(row) }} · {{ formatDateTime(row.createdAt) }}
              </p>
            </div>

            <div class="audit-log-badges">
              <span class="status-pill">{{ formatTargetType(row.targetType) }}</span>
              <span class="status-pill">{{ row.targetId || "无目标 ID" }}</span>
            </div>
          </div>

          <div class="panel inset-panel audit-log-request">
            <div class="info-row">
              <span>请求 IP</span>
              <strong>{{ row.requestIp || "-" }}</strong>
            </div>
            <div class="info-row">
              <span>浏览器标识</span>
              <strong class="audit-log-user-agent">{{ row.userAgent || "-" }}</strong>
            </div>
          </div>

          <div class="audit-log-diff">
            <details class="audit-log-detail">
              <summary>变更前</summary>
              <pre class="json-preview">{{ formatJson(row.beforeJson) }}</pre>
            </details>

            <details class="audit-log-detail">
              <summary>变更后</summary>
              <pre class="json-preview">{{ formatJson(row.afterJson) }}</pre>
            </details>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>
