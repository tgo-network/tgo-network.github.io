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

const contentStatusDescriptions: Record<(typeof contentStatusOptions)[number]["value"], string> = {
  draft: "继续整理内容，暂不进入公开流程。",
  in_review: "进入协作校稿阶段，等待最终确认。",
  scheduled: "准备定时上线，适合已完成终审的内容。",
  published: "立即出现在前台文章列表与详情页。",
  archived: "从公开列表下线，但仍保留后台记录。"
};

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
  () => references.value.authors.find((item) => item.id === form.authorId)?.label ?? "暂未选择作者"
);
const selectedBranchLabel = computed(
  () => references.value.branches.find((item) => item.id === form.branchId)?.label ?? "未关联分会"
);
const articleParagraphs = computed(() =>
  form.body
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
);
const articleBodyPreviewHtml = computed(() => renderMarkdownToHtml(form.body));
const excerptLength = computed(() => form.excerpt.trim().length);
const seoTitlePreview = computed(() => form.seoTitle.trim() || form.title.trim() || "将回退为文章标题");
const seoDescriptionPreview = computed(() => form.seoDescription.trim() || form.excerpt.trim() || "将回退为文章摘要");
const scheduledAtSummary = computed(() => (form.scheduledAt ? formatDateTime(form.scheduledAt) : "未设置定时发布"));
const articleOverviewCards = computed(() => [
  {
    label: "当前状态",
    value: formatContentStatus(article.value?.status ?? form.status),
    summary: article.value?.publishedAt ? `已发布于 ${formatDateTime(article.value.publishedAt)}` : scheduledAtSummary.value
  },
  {
    label: "作者 / 分会",
    value: selectedAuthorLabel.value,
    summary: selectedBranchLabel.value
  },
  {
    label: "摘要 / 正文",
    value: `${excerptLength.value} 字 / ${articleParagraphs.value.length} 段`,
    summary: excerptLength.value > 0 ? "摘要已可用于列表卡片展示。" : "建议先完成摘要，提升列表可读性。"
  },
  {
    label: "公开路径",
    value: form.slug ? `/articles/${form.slug}` : "待生成 slug",
    summary: form.slug ? "前台文章详情页会通过这个路径访问。" : "标题填写后会自动生成公开路径。"
  }
]);
const articleChecklist = computed(() => [
  {
    label: "标题",
    ready: form.title.trim().length > 0,
    hint: "文章列表卡片和详情页首屏都会直接使用标题。"
  },
  {
    label: "摘要",
    ready: form.excerpt.trim().length > 0,
    hint: "列表页与详情页首屏都依赖摘要来解释内容定位。"
  },
  {
    label: "正文",
    ready: articleParagraphs.value.length > 0,
    hint: "详情页会按 Markdown 结构渲染正文，因此建议使用标题、列表、引用和代码块。"
  },
  {
    label: "作者",
    ready: Boolean(form.authorId),
    hint: "发布前必须绑定作者，详情页右侧会展示作者信息。"
  },
  {
    label: "URL 标识",
    ready: form.slug.trim().length > 0,
    hint: "公开站文章详情页会通过这个 slug 对外访问。"
  }
]);
const markdownGuideItems = [
  {
    label: "二级标题",
    syntax: "## 标题"
  },
  {
    label: "无序列表",
    syntax: "- 列表项"
  },
  {
    label: "引用",
    syntax: "> 引用内容"
  },
  {
    label: "代码块",
    syntax: "```ts"
  }
] as const;
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
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>按前台文章列表与详情页的实际呈现结构，统一维护标题、摘要、正文、封面与发布信息。</p>
      </div>

      <div class="page-actions">
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

    <template v-else>
      <div class="editor-overview-grid">
        <article v-for="item in articleOverviewCards" :key="item.label" class="editor-overview-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.summary }}</p>
        </article>
      </div>

      <div class="editor-grid">
        <div class="panel editor-main stacked-gap">
        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">基本信息</div>
            <h3>定义文章的公开入口</h3>
            <p>标题、slug、作者与分会归属决定文章在公开站中的身份与组织关系。</p>
          </div>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>标题</span>
              <input v-model="form.title" type="text" placeholder="在不锁死技术栈的前提下交付内容平台" @input="onTitleInput" />
              <small class="field-hint">标题会同步用于文章列表卡片和详情页首屏。</small>
              <small v-if="fieldIssues.title" class="field-error">{{ fieldIssues.title }}</small>
            </label>

            <div class="info-card">
              <span>当前归属</span>
              <strong>{{ selectedBranchLabel }}</strong>
              <small class="field-hint">{{ selectedAuthorLabel }}</small>
            </div>
          </div>

          <label class="field">
            <span>URL 标识</span>
            <input v-model="form.slug" type="text" placeholder="shipping-an-editorial-platform" @input="onSlugInput" />
            <small class="field-hint">新建时会跟随标题自动生成，也可以手动改成更稳定的公开 URL。</small>
            <small v-if="fieldIssues.slug" class="field-error">{{ fieldIssues.slug }}</small>
          </label>

          <div class="field">
            <span>状态</span>
            <div class="option-card-grid option-card-grid-5">
              <button
                v-for="option in contentStatusOptions"
                :key="option.value"
                type="button"
                class="option-card"
                :class="{ 'is-active': form.status === option.value }"
                @click="form.status = option.value"
              >
                <strong>{{ option.label }}</strong>
                <p>{{ contentStatusDescriptions[option.value] }}</p>
                <div class="option-card-foot">
                  <span class="option-card-badge">{{ form.status === option.value ? "当前状态" : "切换" }}</span>
                </div>
              </button>
            </div>
            <small class="field-hint">后台状态用于控制编辑节奏，真正公开展示仍以发布结果为准。</small>
            <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
          </div>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>作者</span>
              <select v-model="form.authorId">
                <option :value="null">暂不选择作者</option>
                <option v-for="option in references.authors" :key="option.id" :value="option.id">{{ option.label }}</option>
              </select>
              <small class="field-hint">前台详情页会展示作者信息，发布前建议先完成绑定。</small>
              <small v-if="fieldIssues.authorId" class="field-error">{{ fieldIssues.authorId }}</small>
            </label>

            <label class="field">
              <span>所属分会</span>
              <select v-model="form.branchId">
                <option :value="null">暂不关联分会</option>
                <option v-for="option in references.branches" :key="option.id" :value="option.id">{{ option.label }}</option>
              </select>
              <small class="field-hint">关联分会后，文章会更容易和成员、活动形成组织化叙事。</small>
              <small v-if="fieldIssues.branchId" class="field-error">{{ fieldIssues.branchId }}</small>
            </label>
          </div>
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">前台列表摘要</div>
            <h3>准备文章列表卡片信息</h3>
            <p>文章列表页主要使用标题、摘要、作者和分会信息，因此摘要需要简洁且带有组织语境。</p>
          </div>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>定时发布时间</span>
              <input v-model="form.scheduledAt" type="datetime-local" />
              <small class="field-hint">需要定时上线时再填写；否则发布按钮会立即生效。</small>
              <small v-if="fieldIssues.scheduledAt" class="field-error">{{ fieldIssues.scheduledAt }}</small>
            </label>

            <div class="info-card">
              <span>发布时间线</span>
              <strong>{{ scheduledAtSummary }}</strong>
              <small class="field-hint">{{ article?.publishedAt ? `已发布于 ${formatDateTime(article.publishedAt)}` : "发布后会回写正式发布时间。" }}</small>
            </div>
          </div>

          <label class="field">
            <span>摘要</span>
            <textarea v-model="form.excerpt" rows="5" placeholder="用于文章列表与信息卡片的简短摘要。" />
            <small class="field-hint">建议 60-120 字，帮助访客快速判断文章与社区主线的关系。</small>
            <small v-if="fieldIssues.excerpt" class="field-error">{{ fieldIssues.excerpt }}</small>
          </label>
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">正文内容</div>
            <h3>使用 Markdown 组织正文</h3>
            <p>文章正文现在使用 Markdown 编写；前台会按标题、列表、引用、代码块和表格等结构进行正式渲染。</p>
          </div>

          <MarkdownEditorField
            v-model="form.body"
            placeholder="使用 Markdown 编写文章正文。"
            help="建议用空行分段，并适度使用 `##`、列表、引用和代码块提高可读性。"
            :error="fieldIssues.body"
            :preview-html="articleBodyPreviewHtml"
            preview-empty-description="开始输入 Markdown 后，这里会显示前台文章详情页的大致排版效果。"
            :guide-items="markdownGuideItems"
            :toolbar-items="markdownToolbarItems"
          />
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">发布与 SEO</div>
            <h3>补足搜索与分享所需信息</h3>
            <p>SEO 字段不填时会分别回退到标题和摘要，只有需要定制搜索展示时再手动覆盖。</p>
          </div>

          <div class="field-grid field-grid-2">
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
        </section>
        </div>

        <aside class="editor-side stacked-gap">
        <CoverAssetField v-model="form.coverAssetId" :assets="coverAssets" :error="fieldIssues.coverAssetId" label="封面资源" />

        <div class="panel stacked-gap">
          <div class="brand-tag">前台映射</div>

          <div class="preview-stack">
            <div class="preview-group">
              <span class="preview-label">文章列表卡片</span>
              <div class="preview-card">
                <span class="preview-eyebrow">{{ selectedBranchLabel }}</span>
                <strong class="preview-title">{{ form.title || "文章标题会展示在这里" }}</strong>
                <p class="preview-copy">
                  {{ form.excerpt || "摘要会出现在文章列表卡片和详情页首屏，用于解释这篇内容为何值得阅读。" }}
                </p>
                <div class="preview-meta">
                  <span>{{ selectedAuthorLabel }}</span>
                  <span>{{ excerptLength > 0 ? `${excerptLength} 字摘要` : "待补充摘要" }}</span>
                </div>
              </div>
            </div>

            <div class="preview-group">
              <span class="preview-label">文章详情页首屏</span>
              <div class="preview-card preview-card-dark">
                <span class="preview-eyebrow">文章详情</span>
                <strong class="preview-title">{{ form.title || "详情页主标题" }}</strong>
                <p class="preview-copy">
                  {{ form.excerpt || "这里会显示摘要，帮助读者在进入正文前理解这篇文章的核心观点。" }}
                </p>
                <ul class="preview-list">
                  <li>
                    <span>作者</span>
                    <strong>{{ selectedAuthorLabel }}</strong>
                  </li>
                  <li>
                    <span>分会</span>
                    <strong>{{ selectedBranchLabel }}</strong>
                  </li>
                  <li>
                    <span>Markdown 内容</span>
                    <strong>{{ articleParagraphs.length > 0 ? `${articleParagraphs.length} 个内容块` : "尚未填写正文" }}</strong>
                  </li>
                </ul>
              </div>
            </div>

            <div class="preview-group">
              <span class="preview-label">SEO 回退结果</span>
              <div class="preview-card">
                <ul class="preview-list">
                  <li>
                    <span>标题</span>
                    <strong>{{ seoTitlePreview }}</strong>
                  </li>
                  <li>
                    <span>描述</span>
                    <strong>{{ seoDescriptionPreview }}</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">发布提示</div>
          <div class="info-row">
            <span>当前状态</span>
            <strong class="status-pill">{{ formatContentStatus(article?.status ?? form.status) }}</strong>
          </div>
          <div class="info-row">
            <span>定时发布时间</span>
            <strong>{{ scheduledAtSummary }}</strong>
          </div>
          <div class="info-row">
            <span>最近更新</span>
            <strong>{{ formatDateTime(article?.updatedAt) }}</strong>
          </div>
          <div class="info-row">
            <span>发布时间</span>
            <strong>{{ formatDateTime(article?.publishedAt) }}</strong>
          </div>

          <ul class="checklist">
            <li v-for="item in articleChecklist" :key="item.label">
              <span class="checklist-indicator" :class="item.ready ? 'is-ready' : 'is-pending'"></span>
              <div>
                <strong>{{ item.label }}</strong>
                <small>{{ item.hint }}</small>
              </div>
            </li>
          </ul>
        </div>
        </aside>
      </div>
    </template>
  </section>
</template>
