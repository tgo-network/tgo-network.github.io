<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminEventListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatDate } from "../lib/format";

const rows = ref<AdminEventListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminEventListItem[]>("/api/admin/v1/events");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load events.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>Events</h2>
        <p>Plan city-linked events, manage registration state, and shape agendas before publishing.</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link button-primary" to="/events/new">
          New Event
        </RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API Error</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">Loading</div>
      <p>Fetching events...</p>
    </div>

    <div v-else class="panel table-panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>City</th>
            <th>Registration</th>
            <th>Starts</th>
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
            <td>{{ row.cityName ?? "-" }}</td>
            <td><span class="status-pill">{{ row.registrationState }}</span></td>
            <td>{{ formatDate(row.startsAt) }}</td>
            <td class="table-actions-cell">
              <div class="table-action-list">
                <RouterLink class="table-link" :to="`/events/${row.id}/edit`">
                  Edit
                </RouterLink>
                <RouterLink class="table-link" :to="`/events/${row.id}/registrations`">
                  Registrations
                </RouterLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
