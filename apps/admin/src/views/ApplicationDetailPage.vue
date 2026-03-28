<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import {
  applicationStatusOptions,
  type AdminApplicationDetailPayload,
  type AdminApplicationRecord,
  type AdminApplicationUpdateInput
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatDateTime } from "../lib/format";

const route = useRoute();

const application = ref<AdminApplicationRecord | null>(null);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const form = reactive<AdminApplicationUpdateInput>({
  status: "submitted",
  internalNotes: ""
});

const loadApplication = async () => {
  const applicationId = typeof route.params.id === "string" ? route.params.id : "";
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminFetch<AdminApplicationDetailPayload>(`/api/admin/v1/applications/${applicationId}`);
    application.value = payload.application;
    form.status = payload.application.status;
    form.internalNotes = payload.application.internalNotes;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load application.";
  } finally {
    loading.value = false;
  }
};

const save = async () => {
  const applicationId = typeof route.params.id === "string" ? route.params.id : "";
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminRequest<AdminApplicationDetailPayload>(`/api/admin/v1/applications/${applicationId}`, {
      method: "PATCH",
      body: form
    });
    application.value = payload.application;
    form.status = payload.application.status;
    form.internalNotes = payload.application.internalNotes;
    successMessage.value = "Application review updated.";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "Unable to update application.";
  } finally {
    saving.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    void loadApplication();
  }
);

onMounted(() => {
  void loadApplication();
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ application ? application.name : "Application Detail" }}</h2>
        <p>
          Review public submissions, leave internal notes, and move each applicant through the staff workflow.
        </p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/applications">
          Back to Applications
        </RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "Saving..." : "Save Review" }}
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
      <p>Preparing application detail...</p>
    </div>

    <div v-else-if="application" class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="brand-tag">Applicant</div>
        <div class="field-grid field-grid-2">
          <div class="info-card">
            <span>Name</span>
            <strong>{{ application.name }}</strong>
          </div>
          <div class="info-card">
            <span>Type</span>
            <strong>{{ application.type }}</strong>
          </div>
          <div class="info-card">
            <span>Email</span>
            <strong>{{ application.email || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>Phone</span>
            <strong>{{ application.phoneNumber || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>Company</span>
            <strong>{{ application.company || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>Job Title</span>
            <strong>{{ application.jobTitle || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>City</span>
            <strong>{{ application.cityName || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>Source</span>
            <strong>{{ application.sourcePage }}</strong>
          </div>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">Applicant Message</div>
          <p>{{ application.message || "No message submitted." }}</p>
        </div>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">Review</div>
          <label class="field">
            <span>Status</span>
            <select v-model="form.status">
              <option v-for="option in applicationStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
          </label>

          <label class="field">
            <span>Internal Notes</span>
            <textarea v-model="form.internalNotes" rows="10" placeholder="Staff-only review notes, follow-up context, and next actions." />
            <small v-if="fieldIssues.internalNotes" class="field-error">{{ fieldIssues.internalNotes }}</small>
          </label>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">Audit</div>
          <div class="info-row">
            <span>Created</span>
            <strong>{{ formatDateTime(application.createdAt) }}</strong>
          </div>
          <div class="info-row">
            <span>Updated</span>
            <strong>{{ formatDateTime(application.updatedAt) }}</strong>
          </div>
          <div class="info-row">
            <span>Reviewed</span>
            <strong>{{ formatDateTime(application.reviewedAt) }}</strong>
          </div>
          <div class="info-row">
            <span>Current status</span>
            <strong class="status-pill">{{ application.status }}</strong>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
