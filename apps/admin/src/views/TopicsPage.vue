<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminTopicListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatDate } from "../lib/format";

const rows = ref<AdminTopicListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminTopicListItem[]>("/api/admin/v1/topics");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load topics.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>Topics</h2>
        <p>Manage topic landing pages, editorial status, and the content hubs that feed the public site.</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link button-primary" to="/topics/new">
          New Topic
        </RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API Error</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">Loading</div>
      <p>Fetching topics...</p>
    </div>

    <div v-else class="panel table-panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Articles</th>
            <th>Events</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <strong>{{ row.title }}</strong>
              <div class="muted-row">/{{ row.slug }}</div>
            </td>
            <td><span class="status-pill">{{ row.status }}</span></td>
            <td>{{ row.articleCount }}</td>
            <td>{{ row.eventCount }}</td>
            <td>{{ formatDate(row.updatedAt) }}</td>
            <td class="table-actions-cell">
              <RouterLink class="table-link" :to="`/topics/${row.id}/edit`">
                Edit
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
