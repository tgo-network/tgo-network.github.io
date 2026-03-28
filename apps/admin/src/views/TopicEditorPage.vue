<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import {
  contentStatusOptions,
  type AdminAssetListItem,
  type AdminTopicDetailPayload,
  type AdminTopicRecord,
  type AdminTopicUpsertInput
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import CoverAssetField from "../components/CoverAssetField.vue";
import { formatDateTime, slugify } from "../lib/format";

const route = useRoute();
const router = useRouter();

const createBlankForm = (): AdminTopicUpsertInput => ({
  slug: "",
  title: "",
  summary: "",
  body: "",
  coverAssetId: null,
  seoTitle: "",
  seoDescription: "",
  status: "draft"
});

const form = reactive<AdminTopicUpsertInput>(createBlankForm());
const topic = ref<AdminTopicRecord | null>(null);
const coverAssets = ref<AdminAssetListItem[]>([]);
const loading = ref(true);
const saving = ref(false);
const actioning = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const slugTouched = ref(false);

const topicId = computed(() => (typeof route.params.id === "string" ? route.params.id : ""));
const isNew = computed(() => topicId.value.length === 0);
const pageTitle = computed(() => (isNew.value ? "Create Topic" : `Edit Topic: ${topic.value?.title ?? "Loading..."}`));

const resetFeedback = () => {
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};
};

const applyTopic = (nextTopic: AdminTopicRecord) => {
  topic.value = nextTopic;
  Object.assign(form, {
    slug: nextTopic.slug,
    title: nextTopic.title,
    summary: nextTopic.summary,
    body: nextTopic.body,
    coverAssetId: nextTopic.coverAssetId,
    seoTitle: nextTopic.seoTitle,
    seoDescription: nextTopic.seoDescription,
    status: nextTopic.status
  });
  slugTouched.value = true;
};

const loadTopic = async () => {
  resetFeedback();
  loading.value = true;

  try {
    const nextAssets = await adminFetch<AdminAssetListItem[]>("/api/admin/v1/assets");
    coverAssets.value = nextAssets;

    if (isNew.value) {
      topic.value = null;
      slugTouched.value = false;
      Object.assign(form, createBlankForm());
      return;
    }

    const payload = await adminFetch<AdminTopicDetailPayload>(`/api/admin/v1/topics/${topicId.value}`);
    applyTopic(payload.topic);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load topic.";
  } finally {
    loading.value = false;
  }
};

const onTitleInput = () => {
  if (!slugTouched.value) {
    form.slug = slugify(form.title);
  }
};

const onSlugInput = () => {
  slugTouched.value = true;
};

const save = async () => {
  resetFeedback();
  saving.value = true;

  try {
    const payload = await adminRequest<AdminTopicDetailPayload>(
      isNew.value ? "/api/admin/v1/topics" : `/api/admin/v1/topics/${topicId.value}`,
      {
        method: isNew.value ? "POST" : "PATCH",
        body: form
      }
    );

    applyTopic(payload.topic);
    successMessage.value = isNew.value ? "Topic created." : "Topic saved.";

    if (isNew.value) {
      await router.replace({
        name: "topic-edit",
        params: {
          id: payload.topic.id
        }
      });
    }
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "Unable to save topic.";
  } finally {
    saving.value = false;
  }
};

const runAction = async (action: "publish" | "archive") => {
  if (!topic.value) {
    return;
  }

  resetFeedback();
  actioning.value = true;

  try {
    const payload = await adminRequest<AdminTopicDetailPayload>(`/api/admin/v1/topics/${topic.value.id}/${action}`, {
      method: "POST"
    });

    applyTopic(payload.topic);
    successMessage.value = action === "publish" ? "Topic published." : "Topic archived.";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : `Unable to ${action} topic.`;
  } finally {
    actioning.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    loading.value = true;
    void loadTopic();
  }
);

onMounted(() => {
  void loadTopic();
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>
          Draft, refine, and publish topic landing pages without leaving the admin console.
        </p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/topics">
          Back to Topics
        </RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "Saving..." : isNew ? "Create Topic" : "Save Changes" }}
        </button>
        <button
          class="button-link button-subtle"
          type="button"
          :disabled="!topic || actioning"
          @click="runAction('publish')"
        >
          {{ actioning ? "Working..." : "Publish" }}
        </button>
        <button
          class="button-link button-danger"
          type="button"
          :disabled="!topic || actioning"
          @click="runAction('archive')"
        >
          Archive
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
      <p>Preparing topic editor...</p>
    </div>

    <div v-else class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="field-grid field-grid-2">
          <label class="field">
            <span>Title</span>
            <input v-model="form.title" type="text" placeholder="Platform Architecture" @input="onTitleInput" />
            <small v-if="fieldIssues.title" class="field-error">{{ fieldIssues.title }}</small>
          </label>

          <label class="field">
            <span>Status</span>
            <select v-model="form.status">
              <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
          </label>
        </div>

        <label class="field">
          <span>Slug</span>
          <input v-model="form.slug" type="text" placeholder="platform-architecture" @input="onSlugInput" />
          <small v-if="fieldIssues.slug" class="field-error">{{ fieldIssues.slug }}</small>
        </label>

        <label class="field">
          <span>Summary</span>
          <textarea v-model="form.summary" rows="4" placeholder="Short topic summary for listings and SEO fallback." />
          <small v-if="fieldIssues.summary" class="field-error">{{ fieldIssues.summary }}</small>
        </label>

        <label class="field">
          <span>Body</span>
          <textarea v-model="form.body" rows="12" placeholder="Topic landing page narrative and editorial framing." />
          <small v-if="fieldIssues.body" class="field-error">{{ fieldIssues.body }}</small>
        </label>
      </div>

      <aside class="editor-side stacked-gap">
        <CoverAssetField
          v-model="form.coverAssetId"
          :assets="coverAssets"
          :error="fieldIssues.coverAssetId"
          label="Cover Media"
        />

        <div class="panel stacked-gap">
          <div class="brand-tag">SEO</div>
          <label class="field">
            <span>SEO Title</span>
            <input v-model="form.seoTitle" type="text" placeholder="Platform Architecture | TGO Network" />
            <small v-if="fieldIssues.seoTitle" class="field-error">{{ fieldIssues.seoTitle }}</small>
          </label>
          <label class="field">
            <span>SEO Description</span>
            <textarea v-model="form.seoDescription" rows="4" placeholder="Search and social summary." />
            <small v-if="fieldIssues.seoDescription" class="field-error">{{ fieldIssues.seoDescription }}</small>
          </label>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">Workflow</div>
          <div class="info-row">
            <span>Current status</span>
            <strong class="status-pill">{{ topic?.status ?? form.status }}</strong>
          </div>
          <div class="info-row">
            <span>Updated</span>
            <strong>{{ formatDateTime(topic?.updatedAt) }}</strong>
          </div>
          <div class="info-row">
            <span>Published</span>
            <strong>{{ formatDateTime(topic?.publishedAt) }}</strong>
          </div>
          <p>
            Topics need a title, slug, and summary before they can be published to the public site.
          </p>
        </div>
      </aside>
    </div>
  </section>
</template>
