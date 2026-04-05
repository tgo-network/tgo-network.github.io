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
const pageOverviewCards = computed(() => [
  {
    label: "页面状态",
    value: formatContentStatus(form.status),
    summary: contentStatusDescriptions[form.status]
  },
  {
    label: "公开路径",
    value: previewHref.value,
    summary: pageSlug.value === "join" ? "加入说明会与 FAQ、申请表共同组成转化路径。" : "关于页承担组织介绍、活动方式与加入方式的完整说明。"
  },
  {
    label: "内容结构",
    value: structureSummary.value,
    summary: bodyHint.value
  },
  {
    label: "最近更新",
    value: formatDateTime(page.value?.updatedAt),
    summary: seoTitlePreview.value
  }
]);
const pageChecklist = computed(() => [
  {
    label: "页面标题与摘要",
    ready: form.title.trim().length > 0 && form.summary.trim().length > 0,
    hint: "首屏会直接展示标题和摘要，用于快速建立页面定位。"
  },
  {
    label: "正文段落",
    ready: bodyParagraphs.value.length > 0,
    hint: pageSlug.value === "join" ? "加入页至少建议准备 6-9 段，覆盖条件、权益与流程。" : "关于页建议准备多段正文，形成清晰的组织说明。"
  },
  {
    label: pageSlug.value === "join" ? "加入说明结构" : "关于页主体结构",
    ready:
      pageSlug.value === "join"
        ? joinStructure.value.conditions.length > 0 && joinStructure.value.process.length > 0
        : bodyParagraphs.value.length >= 2,
    hint:
      pageSlug.value === "join"
        ? "加入条件和审核流程至少都要有内容，才能形成完整的转化说明。"
        : "关于页正文建议至少两段，分别解释组织定位和活动方式。"
  },
  {
    label: "公开状态",
    ready: form.status === "published",
    hint: "只有已发布状态的页面内容才会进入公开站。"
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
      <div>
        <h2>{{ pageLabel }}</h2>
        <p>{{ pageHint }}</p>
      </div>

      <div class="page-actions">
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

    <div v-if="errorMessage" class="panel panel-danger stacked-gap">
      <div class="brand-tag">操作错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel panel-success stacked-gap">
      <div class="brand-tag">已保存</div>
      <p>{{ successMessage }}</p>
    </div>

    <div v-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在准备{{ pageLabel }}...</p>
    </div>

    <template v-else>
      <div class="editor-overview-grid">
        <article v-for="item in pageOverviewCards" :key="item.label" class="editor-overview-card">
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
              <h3>准备页面首屏表达</h3>
              <p>{{ pageSlug === "join" ? "加入页首先回答“这个组织适合谁，以及为什么值得申请”。" : "关于页首先回答“这是什么样的组织，以及它如何持续运转”。" }}</p>
            </div>

            <label class="field">
              <span>页面标题</span>
              <input v-model="form.title" type="text" placeholder="页面主标题" />
              <small v-if="fieldIssues.title" class="field-error">{{ fieldIssues.title }}</small>
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
              <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
            </div>

            <label class="field">
              <span>摘要</span>
              <textarea v-model="form.summary" rows="4" placeholder="用于前台首屏摘要与 SEO 回退。" />
              <small class="field-hint">摘要会直接进入页面首屏，也会作为 SEO 描述的默认回退值。</small>
            </label>
          </section>

          <section class="editor-section stacked-gap">
            <div class="editor-section-head">
              <div class="brand-tag">正文结构</div>
              <h3>{{ pageSlug === "join" ? "按加入说明的阅读顺序组织内容" : "按关于页主体叙事组织内容" }}</h3>
              <p>{{ bodyHint }}</p>
            </div>

            <label class="field">
              <span>正文</span>
              <textarea
                v-model="form.body"
                rows="16"
                placeholder="可按段落书写，建议每段之间空一行。公开前台会根据空行拆分展示。"
              />
              <small class="field-hint">{{ bodyHint }}</small>
              <small v-if="fieldIssues.body" class="field-error">{{ fieldIssues.body }}</small>
            </label>

            <div v-if="pageSlug === 'join'" class="selection-summary-list">
              <article class="selection-summary-card">
                <strong>加入条件</strong>
                <p>{{ joinStructure.conditions[0] || "尚未填写加入条件段落。" }}</p>
                <small>{{ joinStructure.conditions.length }} 段</small>
              </article>
              <article class="selection-summary-card">
                <strong>成员权益</strong>
                <p>{{ joinStructure.benefits[0] || "尚未填写成员权益段落。" }}</p>
                <small>{{ joinStructure.benefits.length }} 段</small>
              </article>
              <article class="selection-summary-card">
                <strong>审核流程</strong>
                <p>{{ joinStructure.process[0] || "尚未填写审核流程段落。" }}</p>
                <small>{{ joinStructure.process.length }} 段</small>
              </article>
            </div>

            <div v-else class="selection-summary-list">
              <article class="selection-summary-card">
                <strong>正文段落</strong>
                <p>{{ bodyParagraphs[0] || "尚未填写正文首段。" }}</p>
                <small>{{ bodyParagraphs.length }} 段</small>
              </article>
              <article class="selection-summary-card">
                <strong>组织介绍</strong>
                <p>{{ bodyParagraphs[1] || "建议补充组织形式、覆盖人群和活动方式。" }}</p>
                <small>建议至少准备 2 段以上正文</small>
              </article>
              <article class="selection-summary-card">
                <strong>加入方式</strong>
                <p>{{ bodyParagraphs[2] || "可在正文后半段补充加入方式与长期参与路径。" }}</p>
                <small>前台会按正文顺序自然展示</small>
              </article>
            </div>
          </section>

          <section class="editor-section stacked-gap">
            <div class="editor-section-head">
              <div class="brand-tag">SEO</div>
              <h3>补足搜索与分享回退信息</h3>
              <p>SEO 标题和描述都可选；不填时会分别回退到页面标题和摘要。</p>
            </div>

            <div class="field-grid field-grid-2">
              <label class="field">
                <span>SEO 标题</span>
                <input v-model="form.seoTitle" type="text" placeholder="可选，不填则回退页面标题。" />
              </label>

              <label class="field">
                <span>SEO 描述</span>
                <textarea v-model="form.seoDescription" rows="4" placeholder="可选，不填则回退摘要。" />
              </label>
            </div>
          </section>
        </div>

        <aside class="editor-side stacked-gap">
          <div class="panel stacked-gap">
            <div class="brand-tag">前台映射</div>

            <div class="preview-stack">
              <div class="preview-group">
                <span class="preview-label">页面首屏</span>
                <div class="preview-card preview-card-dark">
                  <span class="preview-eyebrow">{{ pageLabel }}</span>
                  <strong class="preview-title">{{ form.title || "页面主标题会展示在这里" }}</strong>
                  <p class="preview-copy">{{ form.summary || "摘要会作为页面首屏说明，帮助用户快速理解页面作用。" }}</p>
                </div>
              </div>

              <div class="preview-group">
                <span class="preview-label">内容结构</span>
                <div class="preview-card">
                  <ul v-if="pageSlug === 'join'" class="preview-list">
                    <li>
                      <span>加入条件</span>
                      <strong>{{ joinStructure.conditions.length > 0 ? `${joinStructure.conditions.length} 段` : "尚未填写" }}</strong>
                    </li>
                    <li>
                      <span>成员权益</span>
                      <strong>{{ joinStructure.benefits.length > 0 ? `${joinStructure.benefits.length} 段` : "尚未填写" }}</strong>
                    </li>
                    <li>
                      <span>审核流程</span>
                      <strong>{{ joinStructure.process.length > 0 ? `${joinStructure.process.length} 段` : "尚未填写" }}</strong>
                    </li>
                  </ul>

                  <ul v-else class="preview-list">
                    <li v-for="(paragraph, index) in bodyParagraphs.slice(0, 3)" :key="`${index}-${paragraph}`">
                      <span>正文段落 {{ index + 1 }}</span>
                      <strong>{{ paragraph }}</strong>
                    </li>
                    <li v-if="bodyParagraphs.length === 0">
                      <span>正文预览</span>
                      <strong>尚未填写正文，关于页这里会展示组织介绍与活动方式说明。</strong>
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
            <div class="brand-tag">运营提示</div>
            <div class="info-row">
              <span>页面</span>
              <strong>{{ pageLabel }}</strong>
            </div>
            <div class="info-row">
              <span>状态</span>
              <strong class="status-pill">{{ formatContentStatus(form.status) }}</strong>
            </div>
            <div class="info-row">
              <span>正文段落</span>
              <strong>{{ bodyParagraphs.length }}</strong>
            </div>
            <div class="info-row">
              <span>最近更新</span>
              <strong>{{ formatDateTime(page?.updatedAt) }}</strong>
            </div>

            <div class="preview-note">
              <p v-if="pageSlug === 'join'">当前编辑器主要管理加入页首屏和加入说明；FAQ、申请表字段与侧边说明仍由系统模板负责。</p>
              <p v-else>当前编辑器主要管理关于页首屏和主体说明；活动形式模块与底部 CTA 仍由系统模板负责。</p>
            </div>

            <ul class="checklist">
              <li v-for="item in pageChecklist" :key="item.label">
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
