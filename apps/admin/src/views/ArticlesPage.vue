<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminArticleListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatDate } from "../lib/format";

const rows = ref<AdminArticleListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminArticleListItem[]>("/api/admin/v1/articles");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load articles.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>Articles</h2>
        <p>Write, link, and publish editorial content with authors, city placement, and topic taxonomy.</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link button-primary" to="/articles/new">
          New Article
        </RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API Error</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">Loading</div>
      <p>Fetching articles...</p>
    </div>

    <div v-else class="panel table-panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Author</th>
            <th>City</th>
            <th>Topics</th>
            <th>Published</th>
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
            <td>{{ row.authorName ?? "-" }}</td>
            <td>{{ row.cityName ?? "-" }}</td>
            <td>{{ row.topicCount }}</td>
            <td>{{ formatDate(row.publishedAt) }}</td>
            <td class="table-actions-cell">
              <RouterLink class="table-link" :to="`/articles/${row.id}/edit`">
                Edit
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
