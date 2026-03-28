<script setup lang="ts">
import { onMounted, ref } from "vue";

import type { AdminDashboardPayload, AdminMePayload } from "@tgo/shared";
import { implementationMilestones } from "@tgo/shared";

import { adminFetch } from "../lib/api";

const me = ref<AdminMePayload | null>(null);
const dashboard = ref<AdminDashboardPayload | null>(null);
const loading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const [mePayload, dashboardPayload] = await Promise.all([
      adminFetch<AdminMePayload>("/api/admin/v1/me"),
      adminFetch<AdminDashboardPayload>("/api/admin/v1/dashboard")
    ]);

    me.value = mePayload;
    dashboard.value = dashboardPayload;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load dashboard data.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <header class="page-header">
      <h2>Dashboard</h2>
      <p>Protected admin APIs are now wired into the Vue console, so the shell can reflect real staff access.</p>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API Error</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">Loading</div>
      <p>Fetching staff profile and dashboard stats...</p>
    </div>

    <template v-else>
      <div class="panel-grid panel-grid-4">
        <article class="panel stat-panel">
          <div class="brand-tag">Articles</div>
          <strong>{{ dashboard?.stats.articles ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Events</div>
          <strong>{{ dashboard?.stats.events ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Applications</div>
          <strong>{{ dashboard?.stats.applications ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Assets</div>
          <strong>{{ dashboard?.stats.assets ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Audit Logs</div>
          <strong>{{ dashboard?.stats.auditLogs ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Staff</div>
          <strong>{{ dashboard?.stats.staff ?? 0 }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Roles</div>
          <strong>{{ dashboard?.stats.roles ?? 0 }}</strong>
        </article>
      </div>

      <div class="panel-grid panel-grid-2" style="margin-top: 18px;">
        <article class="panel">
          <div class="brand-tag">Current Staff Session</div>
          <h3>{{ me?.user?.name ?? "Unknown user" }}</h3>
          <p>{{ me?.user?.email ?? "No email" }}</p>
          <p>Roles: {{ me?.roles.join(", ") || "-" }}</p>
          <p>Permissions: {{ me?.permissions.join(", ") || "-" }}</p>
        </article>

        <article class="panel">
          <div class="brand-tag">Execution Status</div>
          <p>
            The admin shell is now running on authenticated Hono APIs, with content operations, event review flows, and
            an audit trail for sensitive admin mutations.
          </p>
        </article>
      </div>

      <div class="panel-grid" style="margin-top: 18px;">
        <article v-for="item in implementationMilestones" :key="item.code" class="panel">
          <div class="brand-tag">{{ item.code }}</div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.summary }}</p>
        </article>
      </div>
    </template>
  </section>
</template>
