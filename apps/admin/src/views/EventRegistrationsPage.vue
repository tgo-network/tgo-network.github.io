<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import type { AdminEventRegistrationListPayload, AdminEventRegistrationListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatDateTime } from "../lib/format";

const route = useRoute();

const loading = ref(true);
const errorMessage = ref("");
const eventTitle = ref("Event Registrations");
const eventId = ref("");
const eventSlug = ref("");
const registrations = ref<AdminEventRegistrationListItem[]>([]);

const reviewedCount = computed(() => registrations.value.filter((row) => row.reviewedAt).length);

const loadRegistrations = async () => {
  const nextEventId = typeof route.params.id === "string" ? route.params.id : "";
  eventId.value = nextEventId;
  loading.value = true;
  errorMessage.value = "";

  try {
    const payload = await adminFetch<AdminEventRegistrationListPayload>(`/api/admin/v1/events/${nextEventId}/registrations`);
    eventTitle.value = payload.event.title;
    eventSlug.value = payload.event.slug;
    registrations.value = payload.registrations;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load event registrations.";
  } finally {
    loading.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    void loadRegistrations();
  }
);

onMounted(() => {
  void loadRegistrations();
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ eventTitle }}</h2>
        <p>Review inbound registrations for this event and move each attendee through the registration status flow.</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/events">
          Back to Events
        </RouterLink>
        <RouterLink v-if="eventId" class="button-link button-primary" :to="`/events/${eventId}/edit`">
          Edit Event
        </RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API Error</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">Loading</div>
      <p>Fetching event registrations...</p>
    </div>

    <template v-else>
      <div class="panel-grid panel-grid-4" style="margin-bottom: 18px;">
        <article class="panel stat-panel">
          <div class="brand-tag">Event</div>
          <strong>{{ eventSlug || "-" }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Registrations</div>
          <strong>{{ registrations.length }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Reviewed</div>
          <strong>{{ reviewedCount }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Pending</div>
          <strong>{{ registrations.length - reviewedCount }}</strong>
        </article>
      </div>

      <div v-if="registrations.length === 0" class="panel">
        <div class="brand-tag">No Registrations Yet</div>
        <p>No attendee submissions have been received for this event yet.</p>
      </div>

      <div v-else class="panel table-panel">
        <table class="data-table">
          <thead>
            <tr>
              <th>Attendee</th>
              <th>Contact</th>
              <th>Company</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Reviewed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in registrations" :key="row.id">
              <td>
                <strong>{{ row.name }}</strong>
                <div class="muted-row">{{ row.jobTitle || "No job title" }}</div>
              </td>
              <td>
                <div>{{ row.email || row.phoneNumber || "-" }}</div>
                <div v-if="row.email && row.phoneNumber" class="muted-row">{{ row.phoneNumber }}</div>
              </td>
              <td>{{ row.company || "-" }}</td>
              <td><span class="status-pill">{{ row.status }}</span></td>
              <td>{{ formatDateTime(row.createdAt) }}</td>
              <td>{{ formatDateTime(row.reviewedAt) }}</td>
              <td class="table-actions-cell">
                <RouterLink class="table-link" :to="`/registrations/${row.id}`">
                  Review
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
