<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

import type { AdminSiteSettingsInput, AdminSiteSettingsPayload } from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});

const form = reactive<AdminSiteSettingsInput>({
  siteName: "",
  footerTagline: "",
  supportEmail: ""
});

const loadSettings = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminFetch<AdminSiteSettingsPayload>("/api/admin/v1/site-settings");
    form.siteName = payload.settings.siteName;
    form.footerTagline = payload.settings.footerTagline;
    form.supportEmail = payload.settings.supportEmail;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load site settings.";
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
    const payload = await adminRequest<AdminSiteSettingsPayload>("/api/admin/v1/site-settings", {
      method: "PATCH",
      body: form
    });
    form.siteName = payload.settings.siteName;
    form.footerTagline = payload.settings.footerTagline;
    form.supportEmail = payload.settings.supportEmail;
    successMessage.value = "Site settings updated.";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "Unable to update site settings.";
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  void loadSettings();
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <div>
        <h2>Site Settings</h2>
        <p>Manage the basic public branding values that feed the header and footer without editing source code.</p>
      </div>

      <div class="page-actions">
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "Saving..." : "Save Site Settings" }}
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
      <p>Preparing site settings...</p>
    </div>

    <div v-else class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <label class="field">
          <span>Site name</span>
          <input v-model="form.siteName" type="text" placeholder="TGO Network" />
          <small class="field-hint">Used by the public site header and site-config endpoint.</small>
          <small v-if="fieldIssues.siteName" class="field-error">{{ fieldIssues.siteName }}</small>
        </label>

        <label class="field">
          <span>Footer tagline</span>
          <textarea v-model="form.footerTagline" rows="5" placeholder="Short footer copy for the public site."></textarea>
          <small class="field-hint">Displayed in the public footer under the main content area.</small>
          <small v-if="fieldIssues.footerTagline" class="field-error">{{ fieldIssues.footerTagline }}</small>
        </label>

        <label class="field">
          <span>Support email</span>
          <input v-model="form.supportEmail" type="email" placeholder="hello@example.com" />
          <small class="field-hint">If provided, the footer renders a mailto link for visitors and partners.</small>
          <small v-if="fieldIssues.supportEmail" class="field-error">{{ fieldIssues.supportEmail }}</small>
        </label>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">Current Output</div>
          <div class="info-card">
            <span>Brand</span>
            <strong>{{ form.siteName }}</strong>
          </div>
          <div class="info-card">
            <span>Support</span>
            <strong>{{ form.supportEmail || "No support email configured" }}</strong>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">Why this exists</div>
          <p>These values are stored in the API layer so the site can change operational copy without a frontend deploy.</p>
          <p>Keep this page focused on stable cross-site settings, not campaign-specific content.</p>
        </div>
      </aside>
    </div>
  </section>
</template>
