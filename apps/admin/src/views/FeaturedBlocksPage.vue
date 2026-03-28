<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

import {
  featuredBlockStatusOptions,
  type AdminFeaturedBlockDetailPayload,
  type AdminFeaturedBlockReferences,
  type AdminFeaturedBlockUpsertInput
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const references = ref<AdminFeaturedBlockReferences>({
  topics: [],
  articles: [],
  events: [],
  cities: []
});

const form = reactive<AdminFeaturedBlockUpsertInput>({
  status: "active",
  payload: {
    heroEyebrow: "",
    heroTitle: "",
    heroSummary: "",
    primaryActionLabel: "",
    primaryActionHref: "",
    secondaryActionLabel: "",
    secondaryActionHref: "",
    featuredTopicIds: [],
    featuredArticleIds: [],
    featuredEventIds: [],
    cityHighlightIds: [],
    applicationTitle: "",
    applicationSummary: "",
    applicationHref: ""
  }
});

const loadBlock = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminFetch<AdminFeaturedBlockDetailPayload>("/api/admin/v1/featured-blocks/homepage");
    references.value = payload.references;
    form.status = payload.block.status;
    form.payload.heroEyebrow = payload.block.payload.heroEyebrow;
    form.payload.heroTitle = payload.block.payload.heroTitle;
    form.payload.heroSummary = payload.block.payload.heroSummary;
    form.payload.primaryActionLabel = payload.block.payload.primaryActionLabel;
    form.payload.primaryActionHref = payload.block.payload.primaryActionHref;
    form.payload.secondaryActionLabel = payload.block.payload.secondaryActionLabel;
    form.payload.secondaryActionHref = payload.block.payload.secondaryActionHref;
    form.payload.featuredTopicIds = [...payload.block.payload.featuredTopicIds];
    form.payload.featuredArticleIds = [...payload.block.payload.featuredArticleIds];
    form.payload.featuredEventIds = [...payload.block.payload.featuredEventIds];
    form.payload.cityHighlightIds = [...payload.block.payload.cityHighlightIds];
    form.payload.applicationTitle = payload.block.payload.applicationTitle;
    form.payload.applicationSummary = payload.block.payload.applicationSummary;
    form.payload.applicationHref = payload.block.payload.applicationHref;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load homepage featured content.";
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
    const payload = await adminRequest<AdminFeaturedBlockDetailPayload>("/api/admin/v1/featured-blocks/homepage", {
      method: "PATCH",
      body: form
    });
    references.value = payload.references;
    successMessage.value = "Homepage featured content updated.";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "Unable to update homepage featured content.";
  } finally {
    saving.value = false;
  }
};

const getIssue = (field: string) => computed(() => fieldIssues.value[field] ?? "");

const topicIssue = getIssue("payload.featuredTopicIds");
const articleIssue = getIssue("payload.featuredArticleIds");
const eventIssue = getIssue("payload.featuredEventIds");
const cityIssue = getIssue("payload.cityHighlightIds");

onMounted(() => {
  void loadBlock();
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <div>
        <h2>Featured Blocks</h2>
        <p>Control the homepage hero and the curated content mixes that shape the first impression of the public site.</p>
      </div>

      <div class="page-actions">
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "Saving..." : "Save Homepage Block" }}
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
      <p>Preparing homepage featured configuration...</p>
    </div>

    <div v-else class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="field-grid">
          <label class="field">
            <span>Status</span>
            <select v-model="form.status">
              <option v-for="option in featuredBlockStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small class="field-hint">Only an active homepage block overrides the automatic public homepage fallback.</small>
            <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
          </label>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">Hero Copy</div>
          <div class="field-grid">
            <label class="field">
              <span>Eyebrow</span>
              <input v-model="form.payload.heroEyebrow" type="text" placeholder="Phase 3 Admin MVP" />
              <small v-if="fieldIssues['payload.heroEyebrow']" class="field-error">{{ fieldIssues["payload.heroEyebrow"] }}</small>
            </label>

            <label class="field">
              <span>Title</span>
              <textarea v-model="form.payload.heroTitle" rows="3" placeholder="Homepage title"></textarea>
              <small v-if="fieldIssues['payload.heroTitle']" class="field-error">{{ fieldIssues["payload.heroTitle"] }}</small>
            </label>

            <label class="field">
              <span>Summary</span>
              <textarea v-model="form.payload.heroSummary" rows="5" placeholder="Explain the current focus of the platform."></textarea>
              <small v-if="fieldIssues['payload.heroSummary']" class="field-error">{{ fieldIssues["payload.heroSummary"] }}</small>
            </label>
          </div>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">Hero Actions</div>
          <div class="field-grid field-grid-2">
            <label class="field">
              <span>Primary label</span>
              <input v-model="form.payload.primaryActionLabel" type="text" placeholder="Explore articles" />
              <small v-if="fieldIssues['payload.primaryActionLabel']" class="field-error">{{ fieldIssues["payload.primaryActionLabel"] }}</small>
            </label>
            <label class="field">
              <span>Primary href</span>
              <input v-model="form.payload.primaryActionHref" type="text" placeholder="/articles" />
              <small v-if="fieldIssues['payload.primaryActionHref']" class="field-error">{{ fieldIssues["payload.primaryActionHref"] }}</small>
            </label>
            <label class="field">
              <span>Secondary label</span>
              <input v-model="form.payload.secondaryActionLabel" type="text" placeholder="View upcoming events" />
              <small v-if="fieldIssues['payload.secondaryActionLabel']" class="field-error">{{ fieldIssues["payload.secondaryActionLabel"] }}</small>
            </label>
            <label class="field">
              <span>Secondary href</span>
              <input v-model="form.payload.secondaryActionHref" type="text" placeholder="/events" />
              <small v-if="fieldIssues['payload.secondaryActionHref']" class="field-error">{{ fieldIssues["payload.secondaryActionHref"] }}</small>
            </label>
          </div>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">Homepage Collections</div>
          <div class="field-grid field-grid-2">
            <label class="field">
              <span>Featured topics</span>
              <select v-model="form.payload.featuredTopicIds" multiple size="6">
                <option v-for="option in references.topics" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
              <small class="field-hint">Pick the published topics that should appear in the homepage topic band.</small>
              <small v-if="topicIssue" class="field-error">{{ topicIssue }}</small>
            </label>

            <label class="field">
              <span>Featured articles</span>
              <select v-model="form.payload.featuredArticleIds" multiple size="6">
                <option v-for="option in references.articles" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
              <small class="field-hint">Use published articles only so the homepage stays aligned with public content.</small>
              <small v-if="articleIssue" class="field-error">{{ articleIssue }}</small>
            </label>

            <label class="field">
              <span>Upcoming events</span>
              <select v-model="form.payload.featuredEventIds" multiple size="6">
                <option v-for="option in references.events" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
              <small class="field-hint">These populate the event band on the homepage.</small>
              <small v-if="eventIssue" class="field-error">{{ eventIssue }}</small>
            </label>

            <label class="field">
              <span>City highlights</span>
              <select v-model="form.payload.cityHighlightIds" multiple size="6">
                <option v-for="option in references.cities" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
              <small class="field-hint">Curate the city cards shown near the bottom of the homepage.</small>
              <small v-if="cityIssue" class="field-error">{{ cityIssue }}</small>
            </label>
          </div>
        </div>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">Application Callout</div>
          <label class="field">
            <span>Title</span>
            <input v-model="form.payload.applicationTitle" type="text" placeholder="Ready for the next operator cohort" />
            <small v-if="fieldIssues['payload.applicationTitle']" class="field-error">{{ fieldIssues["payload.applicationTitle"] }}</small>
          </label>

          <label class="field">
            <span>Summary</span>
            <textarea v-model="form.payload.applicationSummary" rows="6" placeholder="Invite visitors into the next conversion step."></textarea>
            <small v-if="fieldIssues['payload.applicationSummary']" class="field-error">{{ fieldIssues["payload.applicationSummary"] }}</small>
          </label>

          <label class="field">
            <span>Href</span>
            <input v-model="form.payload.applicationHref" type="text" placeholder="/apply" />
            <small v-if="fieldIssues['payload.applicationHref']" class="field-error">{{ fieldIssues["payload.applicationHref"] }}</small>
          </label>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">Selection Counts</div>
          <div class="info-row">
            <span>Topics</span>
            <strong>{{ form.payload.featuredTopicIds.length }}</strong>
          </div>
          <div class="info-row">
            <span>Articles</span>
            <strong>{{ form.payload.featuredArticleIds.length }}</strong>
          </div>
          <div class="info-row">
            <span>Events</span>
            <strong>{{ form.payload.featuredEventIds.length }}</strong>
          </div>
          <div class="info-row">
            <span>Cities</span>
            <strong>{{ form.payload.cityHighlightIds.length }}</strong>
          </div>
          <div class="info-row">
            <span>Homepage state</span>
            <strong class="status-pill">{{ form.status }}</strong>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">How it works</div>
          <p>When this block is active, the public homepage uses this curated order instead of automatic fallback slices.</p>
          <p>All selections are validated against currently published content before the block can be saved.</p>
        </div>
      </aside>
    </div>
  </section>
</template>
