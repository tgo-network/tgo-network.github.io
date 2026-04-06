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
  type AdminArticleUpsertInput,
  renderMarkdownToHtml
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import CoverAssetField from "../components/CoverAssetField.vue";
import MarkdownEditorField from "../components/MarkdownEditorField.vue";
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
const selectedAuthorLabel = computed(
  () => references.value.authors.find((option) => option.id === form.authorId)?.label ?? "暂未选择"
);
const selectedBranchLabel = computed(
  () => references.value.branches.find((option) => option.id === form.branchId)?.label ?? "暂未关联"
);
const articleBodyPreviewHtml = computed(() => renderMarkdownToHtml(form.body));
const seoTitlePreview = computed(() => form.seoTitle.trim() || form.title.trim() || "将回退为文章标题");
const seoDescriptionPreview = computed(() => form.seoDescription.trim() || form.excerpt.trim() || "将回退为文章摘要");
const articleMetaItems = computed(() => [
  {
    label: "作者",
    value: selectedAuthorLabel.value
  },
  {
    label: "分会",
    value: selectedBranchLabel.value
  },
  {
    label: "公开路径",
    value: form.slug ? `/articles/${form.slug}` : "待生成"
  },
  {
    label: "定时发布",
    value: form.scheduledAt ? formatDateTime(form.scheduledAt) : "未设置"
  },
  {
    label: "最近更新",
    value: formatDateTime(article.value?.updatedAt)
  }
]);
const markdownToolbarItems = [
  {
    label: "插入标题",
    snippet: "## 标题"
  },
  {
    label: "插入列表",
    snippet: "- 列表项"
  },
  {
    label: "插入引用",
    snippet: "> 引用内容"
  },
  {
    label: "插入代码块",
    snippet: "```ts\nconst value = true;\n```"
  }
] as const;

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
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <h2>{{ pageTitle }}</h2>

      <div class="page-actions page-actions-compact">
        <RouterLink class="button-link" to="/articles">返回文章列表</RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : isNew ? "创建文章" : "保存修改" }}
        </button>
        <button class="button-link button-subtle" type="button" :disabled="!article || actioning" @click="runAction('publish')">
          {{ actioning ? "处理中..." : "发布" }}
        </button>
        <button class="button-link button-danger" type="button" :disabled="!article || actioning" @click="runAction('archive')">
          归档
        </button>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel panel-success">
      <p>{{ successMessage }}</p>
    </div>

    <div v-if="loading" class="panel">
      <p>正在准备文章编辑器...</p>
    </div>

    <div v-else class="stacked-gap">
      <div class="editor-grid editor-grid-focus">
        <section class="panel panel-compact editor-main stacked-gap">
          <section class="editor-section editor-section-compact stacked-gap">
            <div class="editor-section-head">
              <h3>发布信息</h3>
            </div>

            <div class="field-grid field-grid-2">
              <label class="field">
                <span>标题</span>
                <input
                  v-model="form.title"
                  type="text"
                  placeholder="在不锁死技术栈的前提下交付内容平台"
                  @input="onTitleInput"
                />
                <small v-if="fieldIssues.title" class="field-error">{{ fieldIssues.title }}</small>
              </label>

              <label class="field">
                <span>URL 标识</span>
                <input v-model="form.slug" type="text" placeholder="shipping-an-editorial-platform" @input="onSlugInput" />
                <small v-if="fieldIssues.slug" class="field-error">{{ fieldIssues.slug }}</small>
              </label>
            </div>

            <div class="field-grid field-grid-2">
              <label class="field">
                <span>作者</span>
                <select v-model="form.authorId">
                  <option :value="null">暂不选择作者</option>
                  <option v-for="option in references.authors" :key="option.id" :value="option.id">{{ option.label }}</option>
                </select>
                <small v-if="fieldIssues.authorId" class="field-error">{{ fieldIssues.authorId }}</small>
              </label>

              <label class="field">
                <span>所属分会</span>
                <select v-model="form.branchId">
                  <option :value="null">暂不关联分会</option>
                  <option v-for="option in references.branches" :key="option.id" :value="option.id">{{ option.label }}</option>
                </select>
                <small v-if="fieldIssues.branchId" class="field-error">{{ fieldIssues.branchId }}</small>
              </label>
            </div>

            <div class="field-grid field-grid-2">
              <label class="field">
                <span>状态</span>
                <select v-model="form.status">
                  <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
              </label>

              <label class="field">
                <span>定时发布时间</span>
                <input v-model="form.scheduledAt" type="datetime-local" />
                <small v-if="fieldIssues.scheduledAt" class="field-error">{{ fieldIssues.scheduledAt }}</small>
              </label>
            </div>

            <label class="field">
              <span>摘要</span>
              <textarea v-model="form.excerpt" rows="5" placeholder="用于文章列表与信息卡片的简短摘要。" />
              <small v-if="fieldIssues.excerpt" class="field-error">{{ fieldIssues.excerpt }}</small>
            </label>
          </section>

          <section class="editor-section editor-section-compact stacked-gap">
            <div class="editor-section-head">
              <h3>正文</h3>
            </div>

            <MarkdownEditorField
              v-model="form.body"
              placeholder="使用 Markdown 编写文章正文。"
              help="支持标题、列表、引用和代码块。"
              :error="fieldIssues.body"
              :preview-html="articleBodyPreviewHtml"
              preview-empty-description="开始输入 Markdown 后，这里会显示文章正文的排版效果。"
              :toolbar-items="markdownToolbarItems"
            />
          </section>
        </section>

        <aside class="editor-side stacked-gap">
          <div class="panel panel-compact summary-panel stacked-gap-tight">
            <div class="panel-toolbar">
              <h3>当前信息</h3>
              <span class="status-pill">{{ formatContentStatus(article?.status ?? form.status) }}</span>
            </div>

            <div class="summary-list">
              <div v-for="item in articleMetaItems" :key="item.label" class="summary-row">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>

          <CoverAssetField
            v-model="form.coverAssetId"
            class="panel-compact"
            :assets="coverAssets"
            :error="fieldIssues.coverAssetId"
            help="用于文章列表与详情页的封面图。"
          />

          <section class="panel panel-compact stacked-gap">
            <div class="editor-section-head">
              <h3>SEO（可选）</h3>
            </div>

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

            <div class="summary-list">
              <div class="summary-row">
                <span>标题回退</span>
                <strong>{{ seoTitlePreview }}</strong>
              </div>
              <div class="summary-row">
                <span>描述回退</span>
                <strong>{{ seoDescriptionPreview }}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  </section>
</template>
