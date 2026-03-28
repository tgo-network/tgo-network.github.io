<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminApplicationListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatDate } from "../lib/format";

const rows = ref<AdminApplicationListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminApplicationListItem[]>("/api/admin/v1/applications");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load applications.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <header class="page-header">
      <h2>Applications</h2>
      <p>Public form submissions now enter a protected review queue inside the admin console.</p>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API Error</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">Loading</div>
      <p>Fetching applications...</p>
    </div>

    <div v-else class="panel table-panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Company</th>
            <th>City</th>
            <th>Status</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <strong>{{ row.name }}</strong>
              <div class="muted-row">{{ row.email ?? "-" }}</div>
            </td>
            <td>{{ row.type }}</td>
            <td>{{ row.company ?? "-" }}</td>
            <td>{{ row.cityName ?? "-" }}</td>
            <td><span class="status-pill">{{ row.status }}</span></td>
            <td>{{ formatDate(row.createdAt) }}</td>
            <td class="table-actions-cell">
              <RouterLink class="table-link" :to="`/applications/${row.id}`">
                Review
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
