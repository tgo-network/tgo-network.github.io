<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import {
  eventRegistrationStatusOptions,
  type AdminEventRegistrationDetailPayload,
  type AdminEventRegistrationRecord,
  type AdminEventRegistrationUpdateInput
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatDateTime } from "../lib/format";

const route = useRoute();

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const registration = ref<AdminEventRegistrationRecord | null>(null);
const eventInfo = ref<AdminEventRegistrationDetailPayload["event"] | null>(null);
const form = reactive<AdminEventRegistrationUpdateInput>({
  status: "submitted"
});

const registrationId = computed(() => (typeof route.params.id === "string" ? route.params.id : ""));
const answersJson = computed(() =>
  registration.value?.answersJson ? JSON.stringify(registration.value.answersJson, null, 2) : "No extra answers submitted."
);

const loadRegistration = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminFetch<AdminEventRegistrationDetailPayload>(`/api/admin/v1/registrations/${registrationId.value}`);
    registration.value = payload.registration;
    eventInfo.value = payload.event;
    form.status = payload.registration.status;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load registration.";
  } finally {
    loading.value = false;
  }
};

const save = async () => {
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminRequest<AdminEventRegistrationDetailPayload>(`/api/admin/v1/registrations/${registrationId.value}`, {
      method: "PATCH",
      body: form
    });
    registration.value = payload.registration;
    eventInfo.value = payload.event;
    form.status = payload.registration.status;
    successMessage.value = "Registration status updated.";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "Unable to update registration.";
  } finally {
    saving.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    void loadRegistration();
  }
);

onMounted(() => {
  void loadRegistration();
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ registration ? registration.name : "Registration Detail" }}</h2>
        <p>Review attendee information and keep the registration decision aligned with the event operations workflow.</p>
      </div>

      <div class="page-actions">
        <RouterLink v-if="eventInfo" class="button-link" :to="`/events/${eventInfo.id}/registrations`">
          Back to Registrations
        </RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "Saving..." : "Save Status" }}
        </button>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger stacked-gap">
      <div class="brand-tag">Action Error</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel stacked-gap panel-success">
      <div class="brand-tag">Saved</div>
      <p>{{ successMessage }}</p>
    </div>

    <div v-if="loading" class="panel">
      <div class="brand-tag">Loading</div>
      <p>Preparing registration detail...</p>
    </div>

    <div v-else-if="registration && eventInfo" class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="brand-tag">Attendee</div>
        <div class="field-grid field-grid-2">
          <div class="info-card">
            <span>Name</span>
            <strong>{{ registration.name }}</strong>
          </div>
          <div class="info-card">
            <span>Status</span>
            <strong>{{ registration.status }}</strong>
          </div>
          <div class="info-card">
            <span>Email</span>
            <strong>{{ registration.email || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>Phone</span>
            <strong>{{ registration.phoneNumber || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>Company</span>
            <strong>{{ registration.company || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>Job Title</span>
            <strong>{{ registration.jobTitle || "-" }}</strong>
          </div>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">Extra Answers</div>
          <pre class="json-preview">{{ answersJson }}</pre>
        </div>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">Review</div>
          <label class="field">
            <span>Status</span>
            <select v-model="form.status">
              <option v-for="option in eventRegistrationStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small class="field-hint">Use waitlisted when the event is full but the attendee should stay in the queue.</small>
            <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
          </label>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">Event</div>
          <div class="info-card">
            <span>Title</span>
            <strong>{{ eventInfo.title }}</strong>
          </div>
          <div class="info-row">
            <span>Slug</span>
            <strong>/{{ eventInfo.slug }}</strong>
          </div>
          <div class="info-row">
            <span>Venue</span>
            <strong>{{ eventInfo.venueName || "-" }}</strong>
          </div>
          <div class="info-row">
            <span>Registration state</span>
            <strong class="status-pill">{{ eventInfo.registrationState }}</strong>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">Audit</div>
          <div class="info-row">
            <span>Source</span>
            <strong>{{ registration.source }}</strong>
          </div>
          <div class="info-row">
            <span>Submitted</span>
            <strong>{{ formatDateTime(registration.createdAt) }}</strong>
          </div>
          <div class="info-row">
            <span>Reviewed</span>
            <strong>{{ formatDateTime(registration.reviewedAt) }}</strong>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
