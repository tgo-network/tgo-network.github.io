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

const formatAction = (value: string) =>
  value
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");

const formatActor = (row: AdminAuditLogRecord) => {
  if (row.actor.name && row.actor.email) {
    return `${row.actor.name} (${row.actor.email})`;
  }

  return row.actor.name || row.actor.email || "System";
};

const formatJson = (value: Record<string, unknown> | null) =>
  value ? JSON.stringify(value, null, 2) : "No snapshot captured.";

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminAuditLogRecord[]>("/api/admin/v1/audit-logs");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load audit logs.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <header class="page-header">
      <h2>Audit Logs</h2>
      <p>Track sensitive admin mutations with actor identity, request metadata, and before/after snapshots.</p>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API Error</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">Loading</div>
      <p>Fetching recent audit activity...</p>
    </div>

    <template v-else>
      <div class="panel-grid panel-grid-4" style="margin-bottom: 18px;">
        <article class="panel stat-panel">
          <div class="brand-tag">Entries</div>
          <strong>{{ rows.length }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Actors</div>
          <strong>{{ uniqueActorCount }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Targets</div>
          <strong>{{ mutationTypes }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Latest</div>
          <strong style="font-size: 1.05rem;">{{ rows[0] ? formatDateTime(rows[0].createdAt) : "-" }}</strong>
        </article>
      </div>

      <div v-if="rows.length === 0" class="panel">
        <div class="brand-tag">No Activity</div>
        <p>No audited admin mutations have been recorded yet.</p>
      </div>

      <div v-else class="audit-log-list">
        <article v-for="row in rows" :key="row.id" class="panel audit-log-card stacked-gap">
          <div class="page-header-row audit-log-head">
            <div>
              <div class="brand-tag">{{ row.targetType }}</div>
              <h3>{{ formatAction(row.action) }}</h3>
              <p class="audit-log-meta">
                {{ formatActor(row) }} · {{ formatDateTime(row.createdAt) }}
              </p>
            </div>

            <div class="audit-log-badges">
              <span class="status-pill">{{ row.targetType }}</span>
              <span class="status-pill">{{ row.targetId || "No target id" }}</span>
            </div>
          </div>

          <div class="panel inset-panel audit-log-request">
            <div class="info-row">
              <span>Request IP</span>
              <strong>{{ row.requestIp || "-" }}</strong>
            </div>
            <div class="info-row">
              <span>User Agent</span>
              <strong class="audit-log-user-agent">{{ row.userAgent || "-" }}</strong>
            </div>
          </div>

          <div class="audit-log-diff">
            <details class="audit-log-detail">
              <summary>Before</summary>
              <pre class="json-preview">{{ formatJson(row.beforeJson) }}</pre>
            </details>

            <details class="audit-log-detail">
              <summary>After</summary>
              <pre class="json-preview">{{ formatJson(row.afterJson) }}</pre>
            </details>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>
