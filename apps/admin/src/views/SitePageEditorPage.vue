<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import {
  contentStatusOptions,
  type AdminSitePageDetailPayloadV2,
  type AdminSitePageRecordV2,
  type AdminSitePageUpsertInputV2
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatContentStatus, formatDateTime } from "../lib/format";

const contentStatusDescriptions: Record<(typeof contentStatusOptions)[number]["value"], string> = {
  draft: "继续准备页面内容，前台暂不公开。",
  in_review: "进入校对审核阶段，等待最终确认。",
  scheduled: "内容准备就绪，适合按计划定时上线。",
  published: "会进入公开站对应页面并直接对外展示。",
  archived: "页面从前台撤下，但后台内容仍保留。"
};

const route = useRoute();

const page = ref<AdminSitePageRecordV2 | null>(null);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const form = reactive<AdminSitePageUpsertInputV2>({
  title: "",
  summary: "",
  body: "",
  seoTitle: "",
  seoDescription: "",
  status: "draft"
});

const pageSlug = computed(() => {
  const slug = typeof route.params.slug === "string" ? route.params.slug : "join";
  return slug === "about" ? "about" : "join";
});

const pageLabelMap = {
  join: "加入页",
  about: "关于页"
} as const;

const pageLabel = computed(() => pageLabelMap[pageSlug.value]);
const pageHint = computed(() =>
  pageSlug.value === "join"
    ? "用于前台加入说明页，和申请表页一起构成非成员转化路径。"
    : "用于前台关于我们页，说明组织形式、活动方式与加入方式。"
);
const previewHref = computed(() => (pageSlug.value === "join" ? "/join" : "/about"));
const bodyParagraphs = computed(() =>
  form.body
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
);
const joinStructure = computed(() => ({
  conditions: bodyParagraphs.value.slice(0, 3),
  benefits: bodyParagraphs.value.slice(3, 6),
  process: bodyParagraphs.value.slice(6, 9)
}));
const seoTitlePreview = computed(() => form.seoTitle.trim() || form.title.trim() || "将回退为页面标题");
const seoDescriptionPreview = computed(() => form.seoDescription.trim() || form.summary.trim() || "将回退为页面摘要");
const bodyHint = computed(() =>
  pageSlug.value === "join"
    ? "正文会按空行切段：前 3 段 = 加入条件，4-6 段 = 成员权益，7-9 段 = 审核流程。FAQ 和申请表区域仍由系统模板提供。"
    : "正文会按空行切段，并作为关于页主体段落顺序展示。活动形式与底部 CTA 区保持系统模板结构。"
);
const structureSummary = computed(() =>
  pageSlug.value === "join"
    ? `${joinStructure.value.conditions.length} 段条件 · ${joinStructure.value.benefits.length} 段权益 · ${joinStructure.value.process.length} 段流程`
    : `${bodyParagraphs.value.length} 段正文`
);
const pageMetaItems = computed(() => [
  {
    label: "页面状态",
    value: formatContentStatus(form.status)
  },
  {
    label: "公开路径",
    value: previewHref.value
  },
  {
    label: "内容结构",
    value: structureSummary.value
  },
  {
    label: "最近更新",
    value: formatDateTime(page.value?.updatedAt)
  }
]);

const applyPayload = (payload: AdminSitePageDetailPayloadV2) => {
  page.value = payload.page;
  form.title = payload.page.title;
  form.summary = payload.page.summary;
  form.body = payload.page.body;
  form.seoTitle = payload.page.seoTitle;
  form.seoDescription = payload.page.seoDescription;
  form.status = payload.page.status;
};

const loadPage = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminFetch<AdminSitePageDetailPayloadV2>(`/api/admin/v1/pages/${pageSlug.value}`);
    applyPayload(payload);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : `无法加载${pageLabel.value}。`;
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
    const payload = await adminRequest<AdminSitePageDetailPayloadV2>(`/api/admin/v1/pages/${pageSlug.value}`, {
      method: "PATCH",
      body: form
    });

    applyPayload(payload);
    successMessage.value = `${pageLabel.value}已保存。`;
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : `无法保存${pageLabel.value}。`;
  } finally {
    saving.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    void loadPage();
  }
);

onMounted(() => {
  void loadPage();
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <h2>{{ pageLabel }}</h2>

      <div class="page-actions page-actions-compact">
        <RouterLink class="button-link" to="/site/homepage">首页配置</RouterLink>
        <RouterLink class="button-link" :to="pageSlug === 'join' ? '/site/pages/about' : '/site/pages/join'">
          {{ pageSlug === "join" ? "切换到关于页" : "切换到加入页" }}
        </RouterLink>
        <a class="button-link" :href="previewHref" target="_blank" rel="noreferrer">预览前台</a>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : `保存${pageLabel}` }}
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
      <p>正在准备{{ pageLabel }}...</p>
    </div>

    <template v-else>
      <div class="editor-grid editor-grid-focus">
        <div class="panel panel-compact editor-main stacked-gap">
          <section class="editor-section editor-section-compact stacked-gap">
            <div class="editor-section-head">
              <h3>基本信息</h3>
            </div>

            <label class="field">
              <span>页面标题</span>
              <input v-model="form.title" type="text" placeholder="页面主标题" />
              <small v-if="fieldIssues.title" class="field-error">{{ fieldIssues.title }}</small>
            </label>

            <label class="field">
              <span>状态</span>
              <select v-model="form.status">
                <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <small class="field-hint">{{ contentStatusDescriptions[form.status] }}</small>
              <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
            </label>

            <label class="field">
              <span>摘要</span>
              <textarea v-model="form.summary" rows="3" placeholder="用于前台首屏摘要与 SEO 回退。" />
            </label>
          </section>

          <section class="editor-section editor-section-compact stacked-gap">
            <div class="editor-section-head">
              <h3>内容结构</h3>
            </div>

            <label class="field">
              <span>正文</span>
              <textarea
                v-model="form.body"
                rows="14"
                placeholder="可按段落书写，建议每段之间空一行。公开前台会根据空行拆分展示。"
              />
              <small class="field-hint">{{ bodyHint }}</small>
              <small v-if="fieldIssues.body" class="field-error">{{ fieldIssues.body }}</small>
            </label>
          </section>

          <details class="panel panel-compact detail-card">
            <summary>SEO（可选）</summary>

            <div class="detail-card-body">
              <div class="field-grid field-grid-2">
                <label class="field">
                  <span>SEO 标题</span>
                  <input v-model="form.seoTitle" type="text" placeholder="可选，不填则回退页面标题。" />
                </label>

                <label class="field">
                  <span>SEO 描述</span>
                  <textarea v-model="form.seoDescription" rows="3" placeholder="可选，不填则回退摘要。" />
                </label>
              </div>
            </div>
          </details>
        </div>

        <aside class="editor-side stacked-gap">
          <div class="panel panel-compact summary-panel stacked-gap-tight">
            <h3>当前状态</h3>

            <div class="summary-list summary-list-compact">
              <div v-for="item in pageMetaItems" :key="item.label" class="summary-row">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>

          <div class="panel panel-compact summary-panel stacked-gap-tight">
            <h3>SEO 回退</h3>

            <div class="summary-list summary-list-compact">
              <div class="summary-row">
                <span>标题</span>
                <strong>{{ seoTitlePreview }}</strong>
              </div>
              <div class="summary-row">
                <span>描述</span>
                <strong>{{ seoDescriptionPreview }}</strong>
              </div>
              <div class="summary-row">
                <span>页面</span>
                <strong>{{ pageLabel }}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>
