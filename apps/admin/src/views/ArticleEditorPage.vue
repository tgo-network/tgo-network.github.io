<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import {
  type AdminAssetListItem,
  contentStatusOptions,
  type AdminArticleDetailPayload,
  type AdminArticleReferences,
  type AdminArticleReferencesPayload,
  type AdminArticleRecord,
  type AdminArticleUpsertInput
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import CoverAssetField from "../components/CoverAssetField.vue";
import { formatDateTime, slugify, toDateTimeInputValue } from "../lib/format";

interface ArticleFormState extends Omit<AdminArticleUpsertInput, "scheduledAt"> {
  scheduledAt: string;
}

const route = useRoute();
const router = useRouter();

const emptyReferences = (): AdminArticleReferences => ({
  authors: [],
  cities: [],
  topics: []
});

const createBlankForm = (): ArticleFormState => ({
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  status: "draft",
  authorId: null,
  primaryCityId: null,
  coverAssetId: null,
  topicIds: [],
  seoTitle: "",
  seoDescription: "",
  scheduledAt: ""
});

const form = reactive<ArticleFormState>(createBlankForm());
const article = ref<AdminArticleRecord | null>(null);
const references = ref<AdminArticleReferences>(emptyReferences());
const coverAssets = ref<AdminAssetListItem[]>([]);
const loading = ref(true);
const saving = ref(false);
const actioning = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const slugTouched = ref(false);

const articleId = computed(() => (typeof route.params.id === "string" ? route.params.id : ""));
const isNew = computed(() => articleId.value.length === 0);
const pageTitle = computed(() => (isNew.value ? "Create Article" : `Edit Article: ${article.value?.title ?? "Loading..."}`));
const selectedTopicCount = computed(() => form.topicIds.length);

const resetFeedback = () => {
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};
};

const applyPayload = (payload: AdminArticleDetailPayload) => {
  article.value = payload.article;
  references.value = payload.references;
  Object.assign(form, {
    slug: payload.article.slug,
    title: payload.article.title,
    excerpt: payload.article.excerpt,
    body: payload.article.body,
    status: payload.article.status,
    authorId: payload.article.authorId,
    primaryCityId: payload.article.primaryCityId,
    coverAssetId: payload.article.coverAssetId,
    topicIds: [...payload.article.topicIds],
    seoTitle: payload.article.seoTitle,
    seoDescription: payload.article.seoDescription,
    scheduledAt: toDateTimeInputValue(payload.article.scheduledAt)
  });
  slugTouched.value = true;
};

const loadArticle = async () => {
  resetFeedback();
  loading.value = true;

  try {
    if (isNew.value) {
      const [payload, nextAssets] = await Promise.all([
        adminFetch<AdminArticleReferencesPayload>("/api/admin/v1/articles/references"),
        adminFetch<AdminAssetListItem[]>("/api/admin/v1/assets")
      ]);
      references.value = payload.references;
      coverAssets.value = nextAssets;
      article.value = null;
      slugTouched.value = false;
      Object.assign(form, createBlankForm());
      return;
    }

    const [payload, nextAssets] = await Promise.all([
      adminFetch<AdminArticleDetailPayload>(`/api/admin/v1/articles/${articleId.value}`),
      adminFetch<AdminAssetListItem[]>("/api/admin/v1/assets")
    ]);
    coverAssets.value = nextAssets;
    applyPayload(payload);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load article.";
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

const toggleTopic = (topicId: string) => {
  if (form.topicIds.includes(topicId)) {
    form.topicIds = form.topicIds.filter((item) => item !== topicId);
    return;
  }

  form.topicIds = [...form.topicIds, topicId];
};

const save = async () => {
  resetFeedback();
  saving.value = true;

  try {
    const payload = await adminRequest<AdminArticleDetailPayload>(
      isNew.value ? "/api/admin/v1/articles" : `/api/admin/v1/articles/${articleId.value}`,
      {
        method: isNew.value ? "POST" : "PATCH",
        body: {
          ...form,
          scheduledAt: form.scheduledAt || null
        }
      }
    );

    applyPayload(payload);
    successMessage.value = isNew.value ? "Article created." : "Article saved.";

    if (isNew.value) {
      await router.replace({
        name: "article-edit",
        params: {
          id: payload.article.id
        }
      });
    }
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "Unable to save article.";
  } finally {
    saving.value = false;
  }
};

const runAction = async (action: "publish" | "archive") => {
  if (!article.value) {
    return;
  }

  resetFeedback();
  actioning.value = true;

  try {
    const payload = await adminRequest<AdminArticleDetailPayload>(`/api/admin/v1/articles/${article.value.id}/${action}`, {
      method: "POST"
    });

    applyPayload(payload);
    successMessage.value = action === "publish" ? "Article published." : "Article archived.";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : `Unable to ${action} article.`;
  } finally {
    actioning.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    void loadArticle();
  }
);

onMounted(() => {
  void loadArticle();
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>
          Manage article metadata, editorial copy, taxonomy bindings, and publish state from one screen.
        </p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/articles">
          Back to Articles
        </RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "Saving..." : isNew ? "Create Article" : "Save Changes" }}
        </button>
        <button
          class="button-link button-subtle"
          type="button"
          :disabled="!article || actioning"
          @click="runAction('publish')"
        >
          {{ actioning ? "Working..." : "Publish" }}
        </button>
        <button
          class="button-link button-danger"
          type="button"
          :disabled="!article || actioning"
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
      <p>Preparing article editor...</p>
    </div>

    <div v-else class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="field-grid field-grid-2">
          <label class="field">
            <span>Title</span>
            <input v-model="form.title" type="text" placeholder="Shipping an Editorial Platform" @input="onTitleInput" />
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
          <input v-model="form.slug" type="text" placeholder="shipping-an-editorial-platform" @input="onSlugInput" />
          <small v-if="fieldIssues.slug" class="field-error">{{ fieldIssues.slug }}</small>
        </label>

        <div class="field-grid field-grid-3">
          <label class="field">
            <span>Author</span>
            <select v-model="form.authorId">
              <option :value="null">No author yet</option>
              <option v-for="option in references.authors" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.authorId" class="field-error">{{ fieldIssues.authorId }}</small>
          </label>

          <label class="field">
            <span>City</span>
            <select v-model="form.primaryCityId">
              <option :value="null">No city link</option>
              <option v-for="option in references.cities" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.primaryCityId" class="field-error">{{ fieldIssues.primaryCityId }}</small>
          </label>

          <label class="field">
            <span>Scheduled Publish</span>
            <input v-model="form.scheduledAt" type="datetime-local" />
            <small v-if="fieldIssues.scheduledAt" class="field-error">{{ fieldIssues.scheduledAt }}</small>
          </label>
        </div>

        <label class="field">
          <span>Excerpt</span>
          <textarea v-model="form.excerpt" rows="4" placeholder="Short summary shown on article listings and metadata cards." />
          <small v-if="fieldIssues.excerpt" class="field-error">{{ fieldIssues.excerpt }}</small>
        </label>

        <label class="field">
          <span>Body</span>
          <textarea v-model="form.body" rows="14" placeholder="Main article body content." />
          <small v-if="fieldIssues.body" class="field-error">{{ fieldIssues.body }}</small>
        </label>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">Topics</div>
          <div class="selection-summary">{{ selectedTopicCount }} topic{{ selectedTopicCount === 1 ? "" : "s" }} selected</div>
          <div class="checkbox-list">
            <label v-for="option in references.topics" :key="option.id" class="checkbox-row">
              <input :checked="form.topicIds.includes(option.id)" type="checkbox" @change="toggleTopic(option.id)" />
              <span>
                <strong>{{ option.label }}</strong>
                <small>{{ option.description }}</small>
              </span>
            </label>
          </div>
          <small v-if="fieldIssues.topicIds" class="field-error">{{ fieldIssues.topicIds }}</small>
        </div>

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
            <input v-model="form.seoTitle" type="text" placeholder="Shipping an Editorial Platform | TGO Network" />
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
            <strong class="status-pill">{{ article?.status ?? form.status }}</strong>
          </div>
          <div class="info-row">
            <span>Updated</span>
            <strong>{{ formatDateTime(article?.updatedAt) }}</strong>
          </div>
          <div class="info-row">
            <span>Published</span>
            <strong>{{ formatDateTime(article?.publishedAt) }}</strong>
          </div>
          <p>
            Articles need title, slug, excerpt, body, author, and at least one topic before publishing.
          </p>
        </div>
      </aside>
    </div>
  </section>
</template>
