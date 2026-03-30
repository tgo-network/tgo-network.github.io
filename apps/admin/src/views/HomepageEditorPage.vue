<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

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

const trimmedAudienceItems = computed(() => form.audienceItems.map((item) => item.trim()).filter((item) => item.length > 0));
const filledMetrics = computed(() =>
  form.metrics
    .map((item) => ({
      label: item.label.trim(),
      value: item.value.trim(),
      description: item.description.trim()
    }))
    .filter((item) => item.label.length > 0 || item.value.length > 0 || item.description.length > 0)
);

const resolveSelectedLabels = (ids: string[], options: Array<{ id: string; label: string }>) =>
  ids
    .map((id) => options.find((option) => option.id === id)?.label)
    .filter((label): label is string => typeof label === "string" && label.length > 0);

const selectedArticleLabels = computed(() => resolveSelectedLabels(form.featuredArticleIds, references.value.articles));
const selectedEventLabels = computed(() => resolveSelectedLabels(form.featuredEventIds, references.value.events));
const selectedBranchLabels = computed(() => resolveSelectedLabels(form.branchHighlightIds, references.value.branches));
const homepageChecklist = computed(() => [
  {
    label: "首屏标题与摘要",
    ready: form.heroTitle.trim().length > 0 && form.heroSummary.trim().length > 0,
    hint: "首页第一屏优先回答“这是什么组织”和“为什么值得继续看”。"
  },
  {
    label: "按钮入口",
    ready: form.primaryActionHref.trim().length > 0 && form.secondaryActionHref.trim().length > 0,
    hint: "首屏至少需要明确承接加入和活动两个主入口。"
  },
  {
    label: "覆盖人群",
    ready: form.introTitle.trim().length > 0 && trimmedAudienceItems.value.length > 0,
    hint: "组织介绍需要说明覆盖人群，否则首页会失去“社区边界感”。"
  },
  {
    label: "关键指标",
    ready: filledMetrics.value.length > 0,
    hint: "指标卡用于快速建立规模感，建议至少补全 3 条有效数据。"
  },
  {
    label: "精选内容与加入引导",
    ready:
      (selectedArticleLabels.value.length > 0 || selectedEventLabels.value.length > 0 || selectedBranchLabels.value.length > 0) &&
      form.joinTitle.trim().length > 0 &&
      form.joinHref.trim().length > 0,
    hint: "首页后半段需要同时承接内容浏览和加入转化。"
  }
]);

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
  audienceItems: trimmedAudienceItems.value,
  metrics: filledMetrics.value
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
        <p>首页需要先建立组织感，再分发到分会、成员、活动、文章和加入路径，因此编辑节奏应围绕这条主线展开。</p>
      </div>

      <div class="page-actions">
        <a class="button-link" href="/" target="_blank" rel="noreferrer">预览前台</a>
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
        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">首屏</div>
            <h3>先回答“这是什么组织”</h3>
            <p>首页首屏不是普通 banner，而是整个公开站的入口判断器，必须先建立组织定位与主行动路径。</p>
          </div>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>眉标</span>
              <input v-model="form.heroEyebrow" type="text" placeholder="TGO 鲲鹏会" />
            </label>

            <label class="field">
              <span>主标题</span>
              <input v-model="form.heroTitle" type="text" placeholder="连接技术领导者、分会活动与长期交流网络" />
              <small class="field-hint">建议直接说明组织的边界与主价值，而不是写成宽泛口号。</small>
              <small v-if="fieldIssues.heroTitle" class="field-error">{{ fieldIssues.heroTitle }}</small>
            </label>
          </div>

          <label class="field">
            <span>摘要</span>
            <textarea v-model="form.heroSummary" rows="4" placeholder="说明首页首屏的核心表达。" />
            <small class="field-hint">摘要建议同时覆盖对象人群、组织方式和价值承诺。</small>
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
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">组织介绍与覆盖人群</div>
            <h3>把社区边界说清楚</h3>
            <p>首页第二屏要解释组织形式、覆盖人群和整体定位，帮助访客判断自己是否适合继续浏览或申请加入。</p>
          </div>

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
                <p class="section-copy">逐条维护首页右侧展示的人群描述，建议每条只表达一种角色或特征。</p>
              </div>
              <button class="button-link button-compact" type="button" @click="addAudienceItem">添加条目</button>
            </div>

            <div v-for="(_, index) in form.audienceItems" :key="`audience-${index}`" class="field field-inline-group">
              <input v-model="form.audienceItems[index]" type="text" placeholder="例如：CTO、技术 VP、研发负责人" />
              <button class="button-link button-danger button-compact" type="button" @click="removeAudienceItem(index)">移除</button>
            </div>
          </div>
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">关键指标</div>
            <h3>建立规模感和可信度</h3>
            <p>指标卡用于快速建立“这是一个真实在运转的组织”这一印象，建议优先填可持续维护的数据口径。</p>
          </div>

          <div class="panel inset-panel stacked-gap">
            <div class="page-header-row compact-row">
              <div>
                <div class="brand-tag">关键指标</div>
                <p class="section-copy">用于首页指标卡片展示，建议保持 3-4 条核心指标。</p>
              </div>
              <button class="button-link button-compact" type="button" @click="addMetric">添加指标</button>
            </div>

            <div v-for="(_, index) in form.metrics" :key="`metric-${index}`" class="panel stacked-gap">
              <div class="page-header-row compact-row">
                <strong>指标 {{ index + 1 }}</strong>
                <button class="button-link button-danger button-compact" type="button" @click="removeMetric(index)">移除</button>
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
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">首页精选</div>
            <h3>选择要被首页重点分发的内容</h3>
            <p>首页不是完整列表，而是引导页。精选内容应该直接指向文章、活动和分会三条核心浏览路径。</p>
          </div>

          <div class="field-grid field-grid-3">
            <label class="field">
              <span>精选文章</span>
              <select v-model="form.featuredArticleIds" multiple size="6">
                <option v-for="option in references.articles" :key="option.id" :value="option.id">{{ option.label }}</option>
              </select>
              <small class="field-hint">建议选择最能代表组织实践与活动沉淀的文章。</small>
            </label>

            <label class="field">
              <span>精选活动</span>
              <select v-model="form.featuredEventIds" multiple size="6">
                <option v-for="option in references.events" :key="option.id" :value="option.id">{{ option.label }}</option>
              </select>
              <small class="field-hint">建议选择近期仍然值得浏览或报名的活动。</small>
            </label>

            <label class="field">
              <span>分会高亮</span>
              <select v-model="form.branchHighlightIds" multiple size="6">
                <option v-for="option in references.branches" :key="option.id" :value="option.id">{{ option.label }}</option>
              </select>
              <small class="field-hint">建议优先选择节奏更成熟、组织表达更完整的分会。</small>
            </label>
          </div>
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">加入引导</div>
            <h3>承接首页最后一步转化</h3>
            <p>加入引导是首页最后的行动收口，语义应清晰指向“理解定位后开始申请”。</p>
          </div>

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
        </section>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">前台映射</div>

          <div class="preview-stack">
            <div class="preview-group">
              <span class="preview-label">首页首屏</span>
              <div class="preview-card preview-card-dark">
                <span class="preview-eyebrow">{{ form.heroEyebrow || "首页眉标" }}</span>
                <strong class="preview-title">{{ form.heroTitle || "首页主标题会展示在这里" }}</strong>
                <p class="preview-copy">{{ form.heroSummary || "摘要会先解释这是怎样的组织，再决定用户是否继续浏览。" }}</p>
                <div class="preview-meta">
                  <span>主按钮：{{ form.primaryActionLabel || "待补充" }} → {{ form.primaryActionHref || "/join" }}</span>
                  <span>次按钮：{{ form.secondaryActionLabel || "待补充" }} → {{ form.secondaryActionHref || "/events" }}</span>
                </div>
              </div>
            </div>

            <div class="preview-group">
              <span class="preview-label">首页结构</span>
              <div class="preview-card">
                <ul class="preview-list">
                  <li>
                    <span>组织介绍</span>
                    <strong>{{ form.introTitle || "待补充介绍标题" }}</strong>
                  </li>
                  <li>
                    <span>覆盖人群</span>
                    <strong>{{ trimmedAudienceItems.length > 0 ? `${trimmedAudienceItems.length} 条` : "尚未补充" }}</strong>
                  </li>
                  <li>
                    <span>指标卡</span>
                    <strong>{{ filledMetrics.length > 0 ? `${filledMetrics.length} 条` : "尚未补充" }}</strong>
                  </li>
                  <li>
                    <span>首页精选</span>
                    <strong>{{ selectedArticleLabels.length }} 篇文章 · {{ selectedEventLabels.length }} 场活动 · {{ selectedBranchLabels.length }} 个分会</strong>
                  </li>
                </ul>
              </div>
            </div>

            <div class="preview-group">
              <span class="preview-label">加入引导卡</span>
              <div class="preview-card">
                <strong class="preview-title">{{ form.joinTitle || "加入引导标题会展示在这里" }}</strong>
                <p class="preview-copy">{{ form.joinSummary || "首页最后一屏会通过这段摘要把用户引导到加入说明页。" }}</p>
                <div class="preview-meta">
                  <span>链接：{{ form.joinHref || "/join" }}</span>
                </div>
              </div>
            </div>

            <div class="preview-group">
              <span class="preview-label">当前精选内容</span>
              <div class="preview-card">
                <ul class="preview-list">
                  <li>
                    <span>精选文章</span>
                    <strong>{{ selectedArticleLabels.slice(0, 3).join(" / ") || "尚未选择" }}</strong>
                  </li>
                  <li>
                    <span>精选活动</span>
                    <strong>{{ selectedEventLabels.slice(0, 3).join(" / ") || "尚未选择" }}</strong>
                  </li>
                  <li>
                    <span>分会高亮</span>
                    <strong>{{ selectedBranchLabels.slice(0, 3).join(" / ") || "尚未选择" }}</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">运营提示</div>
          <div class="info-row">
            <span>覆盖人群条目</span>
            <strong>{{ trimmedAudienceItems.length }}</strong>
          </div>
          <div class="info-row">
            <span>指标卡片</span>
            <strong>{{ filledMetrics.length }}</strong>
          </div>
          <div class="info-row">
            <span>精选文章</span>
            <strong>{{ selectedArticleLabels.length }}</strong>
          </div>
          <div class="info-row">
            <span>精选活动</span>
            <strong>{{ selectedEventLabels.length }}</strong>
          </div>
          <div class="info-row">
            <span>分会高亮</span>
            <strong>{{ selectedBranchLabels.length }}</strong>
          </div>
          <div class="info-row">
            <span>最近更新</span>
            <strong>{{ formatDateTime(homepage?.updatedAt) }}</strong>
          </div>

          <div class="preview-note">
            <p>首页优先承担“建立组织认知 + 分发到 7 个公开模块”的职责，不建议再把旧的主题页或城市页作为主入口。</p>
          </div>

          <ul class="checklist">
            <li v-for="item in homepageChecklist" :key="item.label">
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

