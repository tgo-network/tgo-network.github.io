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
import { formatContentStatus, formatDateTime, slugify, toDateTimeInputValue } from "../lib/format";

interface ArticleFormState extends Omit<AdminArticleUpsertInput, "scheduledAt"> {
  scheduledAt: string;
}

const route = useRoute();
const router = useRouter();

const emptyReferences = (): AdminArticleReferences => ({
  authors: [],
  branches: []
});

const createBlankForm = (): ArticleFormState => ({
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  status: "draft",
  authorId: null,
  branchId: null,
  coverAssetId: null,
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
const pageTitle = computed(() => (isNew.value ? "新建文章" : `编辑文章：${article.value?.title ?? "加载中..."}`));

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
    branchId: payload.article.branchId,
    coverAssetId: payload.article.coverAssetId,
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
    errorMessage.value = error instanceof Error ? error.message : "无法加载文章详情。";
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
    successMessage.value = isNew.value ? "文章已创建。" : "文章已保存。";

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
    errorMessage.value = error instanceof Error ? error.message : "无法保存文章。";
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
    successMessage.value = action === "publish" ? "文章已发布。" : "文章已归档。";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : `无法执行文章${action === "publish" ? "发布" : "归档"}操作。`;
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
          在同一页面中管理文章元信息、正文内容、封面资源与发布状态。
        </p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/articles">
          返回文章列表
        </RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : isNew ? "创建文章" : "保存修改" }}
        </button>
        <button
          class="button-link button-subtle"
          type="button"
          :disabled="!article || actioning"
          @click="runAction('publish')"
        >
          {{ actioning ? "处理中..." : "发布" }}
        </button>
        <button
          class="button-link button-danger"
          type="button"
          :disabled="!article || actioning"
          @click="runAction('archive')"
        >
          归档
        </button>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger stacked-gap">
      <div class="brand-tag">操作错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel stacked-gap panel-success">
      <div class="brand-tag">已保存</div>
      <p>{{ successMessage }}</p>
    </div>

    <div v-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在准备文章编辑器...</p>
    </div>

    <div v-else class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="field-grid field-grid-2">
          <label class="field">
            <span>标题</span>
            <input v-model="form.title" type="text" placeholder="在不锁死技术栈的前提下交付内容平台" @input="onTitleInput" />
            <small v-if="fieldIssues.title" class="field-error">{{ fieldIssues.title }}</small>
          </label>

          <label class="field">
            <span>状态</span>
            <select v-model="form.status">
              <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
          </label>
        </div>

        <label class="field">
          <span>URL 标识</span>
          <input v-model="form.slug" type="text" placeholder="shipping-an-editorial-platform" @input="onSlugInput" />
          <small v-if="fieldIssues.slug" class="field-error">{{ fieldIssues.slug }}</small>
        </label>

        <div class="field-grid field-grid-2">
          <label class="field">
            <span>作者</span>
            <select v-model="form.authorId">
              <option :value="null">暂不选择作者</option>
              <option v-for="option in references.authors" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.authorId" class="field-error">{{ fieldIssues.authorId }}</small>
          </label>

          <label class="field">
            <span>所属分会</span>
            <select v-model="form.branchId">
              <option :value="null">暂不关联分会</option>
              <option v-for="option in references.branches" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.branchId" class="field-error">{{ fieldIssues.branchId }}</small>
          </label>
        </div>

        <div class="field-grid field-grid-2">
          <label class="field">
            <span>定时发布时间</span>
            <input v-model="form.scheduledAt" type="datetime-local" />
            <small v-if="fieldIssues.scheduledAt" class="field-error">{{ fieldIssues.scheduledAt }}</small>
          </label>

          <div class="panel panel-subtle">
            <div class="brand-tag">归属信息</div>
            <p>{{ references.branches.find((item) => item.id === form.branchId)?.label ?? "当前未关联分会" }}</p>
          </div>
        </div>

        <label class="field">
          <span>摘要</span>
          <textarea v-model="form.excerpt" rows="4" placeholder="用于文章列表与信息卡片的简短摘要。" />
          <small v-if="fieldIssues.excerpt" class="field-error">{{ fieldIssues.excerpt }}</small>
        </label>

        <label class="field">
          <span>正文</span>
          <textarea v-model="form.body" rows="14" placeholder="文章正文内容。" />
          <small v-if="fieldIssues.body" class="field-error">{{ fieldIssues.body }}</small>
        </label>
      </div>

      <aside class="editor-side stacked-gap">
        <CoverAssetField
          v-model="form.coverAssetId"
          :assets="coverAssets"
          :error="fieldIssues.coverAssetId"
          label="封面资源"
        />

        <div class="panel stacked-gap">
          <div class="brand-tag">SEO</div>
          <label class="field">
            <span>SEO 标题</span>
            <input v-model="form.seoTitle" type="text" placeholder="在不锁死技术栈的前提下交付内容平台 | TGO 鲲鹏会" />
            <small v-if="fieldIssues.seoTitle" class="field-error">{{ fieldIssues.seoTitle }}</small>
          </label>
          <label class="field">
            <span>SEO 描述</span>
            <textarea v-model="form.seoDescription" rows="4" placeholder="搜索与社交分享摘要。" />
            <small v-if="fieldIssues.seoDescription" class="field-error">{{ fieldIssues.seoDescription }}</small>
          </label>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">工作流</div>
          <div class="info-row">
            <span>当前状态</span>
            <strong class="status-pill">{{ formatContentStatus(article?.status ?? form.status) }}</strong>
          </div>
          <div class="info-row">
            <span>更新时间</span>
            <strong>{{ formatDateTime(article?.updatedAt) }}</strong>
          </div>
          <div class="info-row">
            <span>发布时间</span>
            <strong>{{ formatDateTime(article?.publishedAt) }}</strong>
          </div>
          <p>
            文章在发布前必须具备标题、URL 标识、摘要、正文和作者。分会归属是可选项，但建议补全以便前台展示组织关联。
          </p>
        </div>
      </aside>
    </div>
  </section>
</template>
