<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

import type {
  AdminHomepageDetailPayload,
  AdminHomepageMetricInput,
  AdminHomepageRecord,
  AdminHomepageUpsertInput
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatDateTime } from "../lib/format";

const createMetric = (): AdminHomepageMetricInput => ({
  label: "",
  value: "",
  description: ""
});

const createBlankForm = (): AdminHomepageUpsertInput => ({
  heroEyebrow: "",
  heroTitle: "",
  heroSummary: "",
  primaryActionLabel: "",
  primaryActionHref: "",
  secondaryActionLabel: "",
  secondaryActionHref: "",
  introTitle: "",
  introSummary: "",
  audienceTitle: "",
  audienceItems: [""],
  metrics: [createMetric()],
  featuredArticleIds: [],
  featuredEventIds: [],
  branchHighlightIds: [],
  joinTitle: "",
  joinSummary: "",
  joinHref: ""
});

const homepage = ref<AdminHomepageRecord | null>(null);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const references = ref<AdminHomepageDetailPayload["references"]>({
  articles: [],
  events: [],
  branches: []
});

const form = reactive<AdminHomepageUpsertInput>(createBlankForm());

const applyPayload = (payload: AdminHomepageDetailPayload) => {
  homepage.value = payload.homepage;
  references.value = payload.references;

  Object.assign(form, {
    heroEyebrow: payload.homepage.heroEyebrow,
    heroTitle: payload.homepage.heroTitle,
    heroSummary: payload.homepage.heroSummary,
    primaryActionLabel: payload.homepage.primaryActionLabel,
    primaryActionHref: payload.homepage.primaryActionHref,
    secondaryActionLabel: payload.homepage.secondaryActionLabel,
    secondaryActionHref: payload.homepage.secondaryActionHref,
    introTitle: payload.homepage.introTitle,
    introSummary: payload.homepage.introSummary,
    audienceTitle: payload.homepage.audienceTitle,
    audienceItems: payload.homepage.audienceItems.length > 0 ? [...payload.homepage.audienceItems] : [""],
    metrics: payload.homepage.metrics.length > 0 ? payload.homepage.metrics.map((item) => ({ ...item })) : [createMetric()],
    featuredArticleIds: [...payload.homepage.featuredArticleIds],
    featuredEventIds: [...payload.homepage.featuredEventIds],
    branchHighlightIds: [...payload.homepage.branchHighlightIds],
    joinTitle: payload.homepage.joinTitle,
    joinSummary: payload.homepage.joinSummary,
    joinHref: payload.homepage.joinHref
  });
};

const loadHomepage = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminFetch<AdminHomepageDetailPayload>("/api/admin/v1/homepage");
    applyPayload(payload);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载首页配置。";
  } finally {
    loading.value = false;
  }
};

const addAudienceItem = () => {
  form.audienceItems = [...form.audienceItems, ""];
};

const removeAudienceItem = (index: number) => {
  if (form.audienceItems.length === 1) {
    form.audienceItems = [""];
    return;
  }

  form.audienceItems = form.audienceItems.filter((_, itemIndex) => itemIndex !== index);
};

const addMetric = () => {
  form.metrics = [...form.metrics, createMetric()];
};

const removeMetric = (index: number) => {
  if (form.metrics.length === 1) {
    form.metrics = [createMetric()];
    return;
  }

  form.metrics = form.metrics.filter((_, itemIndex) => itemIndex !== index);
};

const toPayload = (): AdminHomepageUpsertInput => ({
  ...form,
  audienceItems: form.audienceItems.map((item) => item.trim()).filter((item) => item.length > 0),
  metrics: form.metrics
    .map((item) => ({
      label: item.label.trim(),
      value: item.value.trim(),
      description: item.description.trim()
    }))
    .filter((item) => item.label.length > 0 || item.value.length > 0 || item.description.length > 0)
});

const save = async () => {
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminRequest<AdminHomepageDetailPayload>("/api/admin/v1/homepage", {
      method: "PATCH",
      body: toPayload()
    });

    applyPayload(payload);
    successMessage.value = "首页配置已保存。";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "无法保存首页配置。";
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  void loadHomepage();
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <div>
        <h2>首页配置</h2>
        <p>维护首页首屏、组织介绍、关键指标、精选内容和加入引导，前台首页将直接消费这里的配置结果。</p>
      </div>

      <div class="page-actions">
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : "保存首页配置" }}
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
      <p>正在准备首页配置...</p>
    </div>

    <div v-else class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">首屏</div>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>眉标</span>
              <input v-model="form.heroEyebrow" type="text" placeholder="TGO 鲲鹏会" />
            </label>

            <label class="field">
              <span>主标题</span>
              <input v-model="form.heroTitle" type="text" placeholder="连接技术领导者、分会活动与长期交流网络" />
              <small v-if="fieldIssues.heroTitle" class="field-error">{{ fieldIssues.heroTitle }}</small>
            </label>
          </div>

          <label class="field">
            <span>摘要</span>
            <textarea v-model="form.heroSummary" rows="4" placeholder="说明首页首屏的核心表达。" />
          </label>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>主按钮文案</span>
              <input v-model="form.primaryActionLabel" type="text" placeholder="了解加入方式" />
            </label>
            <label class="field">
              <span>主按钮链接</span>
              <input v-model="form.primaryActionHref" type="text" placeholder="/join" />
              <small v-if="fieldIssues.primaryActionHref" class="field-error">{{ fieldIssues.primaryActionHref }}</small>
            </label>
            <label class="field">
              <span>次按钮文案</span>
              <input v-model="form.secondaryActionLabel" type="text" placeholder="查看近期活动" />
            </label>
            <label class="field">
              <span>次按钮链接</span>
              <input v-model="form.secondaryActionHref" type="text" placeholder="/events" />
              <small v-if="fieldIssues.secondaryActionHref" class="field-error">{{ fieldIssues.secondaryActionHref }}</small>
            </label>
          </div>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">组织介绍</div>

          <label class="field">
            <span>介绍标题</span>
            <input v-model="form.introTitle" type="text" placeholder="围绕技术领导者建立可信任的长期连接" />
          </label>

          <label class="field">
            <span>介绍摘要</span>
            <textarea v-model="form.introSummary" rows="4" placeholder="说明组织形式、覆盖人群和整体定位。" />
          </label>

          <label class="field">
            <span>覆盖人群标题</span>
            <input v-model="form.audienceTitle" type="text" placeholder="覆盖人群" />
          </label>

          <div class="stacked-gap">
            <div class="page-header-row compact-row">
              <div>
                <strong>覆盖人群条目</strong>
                <p class="section-copy">逐条维护首页展示的人群描述。</p>
              </div>
              <button class="button-link button-compact" type="button" @click="addAudienceItem">添加条目</button>
            </div>

            <div v-for="(_, index) in form.audienceItems" :key="`audience-${index}`" class="field field-inline-group">
              <input v-model="form.audienceItems[index]" type="text" placeholder="例如：CTO、技术 VP、研发负责人" />
              <button class="button-link button-danger button-compact" type="button" @click="removeAudienceItem(index)">
                移除
              </button>
            </div>
          </div>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="page-header-row compact-row">
            <div>
              <div class="brand-tag">关键指标</div>
              <p class="section-copy">用于首页指标卡片的展示。</p>
            </div>
            <button class="button-link button-compact" type="button" @click="addMetric">添加指标</button>
          </div>

          <div v-for="(_, index) in form.metrics" :key="`metric-${index}`" class="panel stacked-gap">
            <div class="page-header-row compact-row">
              <strong>指标 {{ index + 1 }}</strong>
              <button class="button-link button-danger button-compact" type="button" @click="removeMetric(index)">
                移除
              </button>
            </div>

            <div class="field-grid field-grid-3">
              <label class="field">
                <span>标签</span>
                <input v-model="form.metrics[index].label" type="text" placeholder="覆盖城市" />
              </label>
              <label class="field">
                <span>数值</span>
                <input v-model="form.metrics[index].value" type="text" placeholder="3+" />
              </label>
              <label class="field">
                <span>说明</span>
                <input v-model="form.metrics[index].description" type="text" placeholder="先从重点分会启动" />
              </label>
            </div>
          </div>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">精选内容</div>

          <div class="field-grid field-grid-3">
            <label class="field">
              <span>精选文章</span>
              <select v-model="form.featuredArticleIds" multiple size="6">
                <option v-for="option in references.articles" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>精选活动</span>
              <select v-model="form.featuredEventIds" multiple size="6">
                <option v-for="option in references.events" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>分会高亮</span>
              <select v-model="form.branchHighlightIds" multiple size="6">
                <option v-for="option in references.branches" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">加入引导</div>

          <label class="field">
            <span>标题</span>
            <input v-model="form.joinTitle" type="text" placeholder="成为下一位加入网络的技术领导者" />
          </label>

          <label class="field">
            <span>摘要</span>
            <textarea v-model="form.joinSummary" rows="4" placeholder="说明加入入口和转化路径。" />
          </label>

          <label class="field">
            <span>按钮链接</span>
            <input v-model="form.joinHref" type="text" placeholder="/join" />
            <small v-if="fieldIssues.joinHref" class="field-error">{{ fieldIssues.joinHref }}</small>
          </label>
        </div>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">当前概况</div>
          <div class="info-row">
            <span>覆盖人群条目</span>
            <strong>{{ form.audienceItems.filter((item) => item.trim().length > 0).length }}</strong>
          </div>
          <div class="info-row">
            <span>指标卡片</span>
            <strong>{{ form.metrics.filter((item) => item.label || item.value || item.description).length }}</strong>
          </div>
          <div class="info-row">
            <span>精选文章</span>
            <strong>{{ form.featuredArticleIds.length }}</strong>
          </div>
          <div class="info-row">
            <span>精选活动</span>
            <strong>{{ form.featuredEventIds.length }}</strong>
          </div>
          <div class="info-row">
            <span>分会高亮</span>
            <strong>{{ form.branchHighlightIds.length }}</strong>
          </div>
          <div class="info-row">
            <span>最近更新</span>
            <strong>{{ formatDateTime(homepage?.updatedAt) }}</strong>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">使用建议</div>
          <p>首页配置应优先服务当前 7 个公开模块，不再把主题页或城市页作为主线入口。</p>
          <p>精选文章、活动和分会建议只选择已准备好公开展示的内容，避免首页出现空白卡片。</p>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
  .field-inline-group {
    display: grid;
    gap: 10px;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
  }

  @media (max-width: 720px) {
    .field-inline-group {
      grid-template-columns: 1fr;
    }
  }
</style>
