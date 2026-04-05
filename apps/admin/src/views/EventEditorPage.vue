<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import {
  contentStatusOptions,
  eventRegistrationStateOptions,
  type AdminAssetListItem,
  type AdminEventAgendaItemV2,
  type AdminEventDetailPayloadV2,
  type AdminEventReferencesV2,
  type AdminEventRecordV2,
  type AdminEventUpsertInputV2
} from "@tgo/shared";

import CoverAssetField from "../components/CoverAssetField.vue";
import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatContentStatus, formatDateTime, formatEventRegistrationState, slugify, toDateTimeInputValue } from "../lib/format";

interface EventAgendaFormItem {
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  speakerName: string;
}

interface EventFormState extends Omit<AdminEventUpsertInputV2, "startsAt" | "endsAt" | "agenda"> {
  startsAt: string;
  endsAt: string;
  agenda: EventAgendaFormItem[];
}

const route = useRoute();
const router = useRouter();

const emptyReferences = (): AdminEventReferencesV2 => ({
  branches: []
});

const createAgendaItem = (): EventAgendaFormItem => ({
  title: "",
  summary: "",
  startsAt: "",
  endsAt: "",
  speakerName: ""
});

const createBlankForm = (): EventFormState => ({
  slug: "",
  title: "",
  summary: "",
  body: "",
  status: "draft",
  branchId: null,
  coverAssetId: null,
  venueName: "",
  venueAddress: "",
  startsAt: "",
  endsAt: "",
  timezone: "Asia/Shanghai",
  capacity: null,
  registrationState: "not_open",
  registrationUrl: "",
  agenda: [createAgendaItem()]
});

const contentStatusDescriptions: Record<(typeof contentStatusOptions)[number]["value"], string> = {
  draft: "继续准备活动信息，前台暂不公开。",
  in_review: "进入审核确认阶段，等待最终发布。",
  scheduled: "内容准备就绪，适合按计划定时上线。",
  published: "已在前台活动列表公开展示。",
  archived: "活动下线归档，但后台记录仍保留。"
};

const registrationStateDescriptions: Record<(typeof eventRegistrationStateOptions)[number]["value"], string> = {
  not_open: "仅展示活动信息，用于预热或待开放状态。",
  open: "前台显示公开报名表单，可直接收集报名意向。",
  waitlist: "允许继续提交，但进入候补与人工审核流程。",
  closed: "活动详情继续可见，但不再接受新的报名。"
};

const form = reactive<EventFormState>(createBlankForm());
const event = ref<AdminEventRecordV2 | null>(null);
const references = ref<AdminEventReferencesV2>(emptyReferences());
const coverAssets = ref<AdminAssetListItem[]>([]);
const loading = ref(true);
const saving = ref(false);
const actioning = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const slugTouched = ref(false);

const eventId = computed(() => (typeof route.params.id === "string" ? route.params.id : ""));
const isNew = computed(() => eventId.value.length === 0);
const pageTitle = computed(() => (isNew.value ? "新建活动" : `编辑活动：${event.value?.title ?? "加载中..."}`));
const selectedBranchLabel = computed(
  () => references.value.branches.find((item) => item.id === form.branchId)?.label ?? "未选择分会"
);
const populatedAgendaItems = computed(() =>
  form.agenda.filter((item) => {
    return [item.title, item.summary, item.speakerName].some((value) => value.trim().length > 0) || Boolean(item.startsAt || item.endsAt);
  })
);
const eventTimelineSummary = computed(() => {
  if (form.startsAt && form.endsAt) {
    return `${formatDateTime(form.startsAt)} - ${formatDateTime(form.endsAt)}`;
  }

  if (form.startsAt) {
    return `开始于 ${formatDateTime(form.startsAt)}`;
  }

  if (form.endsAt) {
    return `结束于 ${formatDateTime(form.endsAt)}`;
  }

  return "待补充活动时间";
});
const eventLocationSummary = computed(() => {
  const values = [form.venueName.trim(), form.venueAddress.trim()].filter((item) => item.length > 0);
  return values.length > 0 ? values.join(" · ") : "待补充场地信息";
});
const capacitySummary = computed(() => (form.capacity && form.capacity > 0 ? `${form.capacity} 人上限` : "未设置人数上限"));
const registrationExperienceSummary = computed(() => {
  switch (form.registrationState) {
    case "open":
      return "前台详情页会展示公开报名表单，成员与非成员都可提交报名意向。";
    case "waitlist":
      return "前台会展示候补报名入口，提交后由工作人员继续审核。";
    case "closed":
      return "前台会显示报名关闭提示，但仍可展示活动信息与议程。";
    default:
      return "前台会显示“报名暂未开放”，用于提前预热活动详情。";
  }
});
const eventOverviewCards = computed(() => [
  {
    label: "内容状态",
    value: formatContentStatus(event.value?.status ?? form.status),
    summary: event.value?.publishedAt ? `已发布于 ${formatDateTime(event.value.publishedAt)}` : "发布后会同步出现在前台活动列表。"
  },
  {
    label: "报名状态",
    value: formatEventRegistrationState(form.registrationState),
    summary: registrationExperienceSummary.value
  },
  {
    label: "时间 / 地点",
    value: eventTimelineSummary.value,
    summary: eventLocationSummary.value
  },
  {
    label: "公开路径",
    value: form.slug ? `/events/${form.slug}` : "待生成 slug",
    summary: form.slug ? `${selectedBranchLabel.value} · ${capacitySummary.value}` : "标题填写后会自动生成公开路径。"
  }
]);
const eventChecklist = computed(() => [
  {
    label: "标题与摘要",
    ready: form.title.trim().length > 0 && form.summary.trim().length > 0,
    hint: "列表页卡片和详情页首屏都会同时依赖标题与摘要。"
  },
  {
    label: "URL 标识",
    ready: form.slug.trim().length > 0,
    hint: "公开站活动详情页通过 slug 暴露访问路径。"
  },
  {
    label: "时间地点",
    ready: Boolean(form.startsAt && form.venueName.trim().length > 0),
    hint: "至少要明确开始时间和场地名称，前台才能完整解释活动基本信息。"
  },
  {
    label: "报名规则",
    ready: form.registrationState !== "not_open" || form.registrationUrl.trim().length > 0 || Boolean(form.startsAt),
    hint: "要么说明开放状态，要么给出外部表单链接，避免访客无法判断下一步。"
  },
  {
    label: "议程",
    ready: populatedAgendaItems.value.length > 0,
    hint: "议程可以先从一条开始，后续再补充更多环节。"
  }
]);

const resetFeedback = () => {
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};
};

const applyPayload = (payload: AdminEventDetailPayloadV2) => {
  event.value = payload.event;
  references.value = payload.references;
  Object.assign(form, {
    slug: payload.event.slug,
    title: payload.event.title,
    summary: payload.event.summary,
    body: payload.event.body,
    status: payload.event.status,
    branchId: payload.event.branchId,
    coverAssetId: payload.event.coverAssetId,
    venueName: payload.event.venueName,
    venueAddress: payload.event.venueAddress,
    startsAt: toDateTimeInputValue(payload.event.startsAt),
    endsAt: toDateTimeInputValue(payload.event.endsAt),
    timezone: payload.event.timezone,
    capacity: payload.event.capacity,
    registrationState: payload.event.registrationState,
    registrationUrl: payload.event.registrationUrl,
    agenda:
      payload.event.agenda.length > 0
        ? payload.event.agenda.map((item) => ({
            title: item.title,
            summary: item.summary,
            startsAt: toDateTimeInputValue(item.startsAt),
            endsAt: toDateTimeInputValue(item.endsAt),
            speakerName: item.speakerName
          }))
        : [createAgendaItem()]
  });
  slugTouched.value = true;
};

const loadReferences = async () => {
  const payload = await adminFetch<{ references: AdminEventReferencesV2 }>("/api/admin/v1/events/references");
  references.value = payload.references;
};

const loadEvent = async () => {
  resetFeedback();
  loading.value = true;

  try {
    const nextAssets = await adminFetch<AdminAssetListItem[]>("/api/admin/v1/assets");
    coverAssets.value = nextAssets;

    if (isNew.value) {
      await loadReferences();
      event.value = null;
      slugTouched.value = false;
      Object.assign(form, createBlankForm());
      return;
    }

    const payload = await adminFetch<AdminEventDetailPayloadV2>(`/api/admin/v1/events/${eventId.value}`);
    applyPayload(payload);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载活动详情。";
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

const addAgendaItem = () => {
  form.agenda = [...form.agenda, createAgendaItem()];
};

const removeAgendaItem = (index: number) => {
  if (form.agenda.length === 1) {
    form.agenda = [createAgendaItem()];
    return;
  }

  form.agenda = form.agenda.filter((_, itemIndex) => itemIndex !== index);
};

const toPayload = (): AdminEventUpsertInputV2 => ({
  ...form,
  startsAt: form.startsAt || null,
  endsAt: form.endsAt || null,
  agenda: form.agenda.map((item): AdminEventAgendaItemV2 => ({
    title: item.title,
    summary: item.summary,
    startsAt: item.startsAt || null,
    endsAt: item.endsAt || null,
    speakerName: item.speakerName
  }))
});

const save = async () => {
  resetFeedback();
  saving.value = true;

  try {
    const payload = await adminRequest<AdminEventDetailPayloadV2>(
      isNew.value ? "/api/admin/v1/events" : `/api/admin/v1/events/${eventId.value}`,
      {
        method: isNew.value ? "POST" : "PATCH",
        body: toPayload()
      }
    );

    applyPayload(payload);
    successMessage.value = isNew.value ? "活动已创建。" : "活动已保存。";

    if (isNew.value) {
      await router.replace({
        name: "event-edit",
        params: {
          id: payload.event.id
        }
      });
    }
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "无法保存活动。";
  } finally {
    saving.value = false;
  }
};

const runAction = async (action: "publish" | "archive") => {
  if (!event.value) {
    return;
  }

  resetFeedback();
  actioning.value = true;

  try {
    const payload = await adminRequest<AdminEventDetailPayloadV2>(`/api/admin/v1/events/${event.value.id}/${action}`, {
      method: "POST"
    });

    applyPayload(payload);
    successMessage.value = action === "publish" ? "活动已发布。" : "活动已归档。";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : `无法执行活动${action === "publish" ? "发布" : "归档"}操作。`;
  } finally {
    actioning.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    void loadEvent();
  }
);

onMounted(() => {
  void loadEvent();
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>把活动列表、详情页、议程和公开报名所需信息放在同一个编辑器里统一维护。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/events">返回活动列表</RouterLink>
        <RouterLink v-if="event" class="button-link" :to="`/events/${event.id}/registrations`">查看报名</RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : isNew ? "创建活动" : "保存修改" }}
        </button>
        <button class="button-link button-subtle" type="button" :disabled="!event || actioning" @click="runAction('publish')">
          {{ actioning ? "处理中..." : "发布" }}
        </button>
        <button class="button-link button-danger" type="button" :disabled="!event || actioning" @click="runAction('archive')">
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
      <p>正在准备活动编辑器...</p>
    </div>

    <template v-else>
      <div class="editor-overview-grid">
        <article v-for="item in eventOverviewCards" :key="item.label" class="editor-overview-card">
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
            <h3>确定活动的公开身份</h3>
            <p>标题、slug、分会和状态会共同决定活动如何出现在公开站活动列表中。</p>
          </div>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>标题</span>
              <input v-model="form.title" type="text" placeholder="春季平台工作坊" @input="onTitleInput" />
              <small class="field-hint">活动标题会直接用于列表卡片与详情页首屏。</small>
              <small v-if="fieldIssues.title" class="field-error">{{ fieldIssues.title }}</small>
            </label>

            <div class="info-card">
              <span>当前分会</span>
              <strong>{{ selectedBranchLabel }}</strong>
              <small class="field-hint">{{ capacitySummary }}</small>
            </div>
          </div>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>URL 标识</span>
              <input v-model="form.slug" type="text" placeholder="spring-platform-workshop" @input="onSlugInput" />
              <small class="field-hint">公开活动详情页会通过这个 slug 对外提供访问路径。</small>
              <small v-if="fieldIssues.slug" class="field-error">{{ fieldIssues.slug }}</small>
            </label>

            <label class="field">
              <span>分会</span>
              <select v-model="form.branchId">
                <option :value="null">暂不选择分会</option>
                <option v-for="option in references.branches" :key="option.id" :value="option.id">{{ option.label }}</option>
              </select>
              <small class="field-hint">前台城市筛选会直接复用分会对应的城市信息。</small>
              <small v-if="fieldIssues.branchId" class="field-error">{{ fieldIssues.branchId }}</small>
            </label>
          </div>

          <div class="field">
            <span>内容状态</span>
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
            <small class="field-hint">活动内容可先保持草稿，再根据准备进度切换状态。</small>
            <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
          </div>
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">时间与地点</div>
            <h3>准备详情页的活动信息区</h3>
            <p>开始时间、结束时间、场地和时区共同构成详情页右侧的基础信息，以及列表卡片的元信息。</p>
          </div>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>开始时间</span>
              <input v-model="form.startsAt" type="datetime-local" />
              <small v-if="fieldIssues.startsAt" class="field-error">{{ fieldIssues.startsAt }}</small>
            </label>

            <label class="field">
              <span>结束时间</span>
              <input v-model="form.endsAt" type="datetime-local" />
              <small v-if="fieldIssues.endsAt" class="field-error">{{ fieldIssues.endsAt }}</small>
            </label>
          </div>

          <div class="field-grid field-grid-3">
            <label class="field">
              <span>场地名称</span>
              <input v-model="form.venueName" type="text" placeholder="北外滩工作室" />
            </label>

            <label class="field">
              <span>时区</span>
              <input v-model="form.timezone" type="text" placeholder="Asia/Shanghai" />
            </label>

            <div class="info-card">
              <span>时间预览</span>
              <strong>{{ eventTimelineSummary }}</strong>
              <small class="field-hint">{{ selectedBranchLabel }}</small>
            </div>
          </div>

          <label class="field">
            <span>场地地址</span>
            <input v-model="form.venueAddress" type="text" placeholder="完整场地地址" />
            <small class="field-hint">如果是闭门活动，也建议填写到楼宇或园区级别，方便前台解释地点范围。</small>
          </label>
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">报名规则</div>
            <h3>控制前台是否开放提交</h3>
            <p>当前活动详情页支持开放报名或候补报名，也可以切换为未开放或已关闭状态。</p>
          </div>

          <div class="field">
            <span>报名状态</span>
            <div class="option-card-grid option-card-grid-2">
              <button
                v-for="option in eventRegistrationStateOptions"
                :key="option.value"
                type="button"
                class="option-card"
                :class="{ 'is-active': form.registrationState === option.value }"
                @click="form.registrationState = option.value"
              >
                <strong>{{ option.label }}</strong>
                <p>{{ registrationStateDescriptions[option.value] }}</p>
                <div class="option-card-foot">
                  <span class="option-card-badge">{{ form.registrationState === option.value ? "当前状态" : "切换" }}</span>
                </div>
              </button>
            </div>
            <small v-if="fieldIssues.registrationState" class="field-error">{{ fieldIssues.registrationState }}</small>
          </div>

          <div class="field-grid field-grid-3">
            <label class="field">
              <span>人数上限</span>
              <input v-model.number="form.capacity" type="number" min="0" placeholder="120" />
              <small class="field-hint">可选，不填表示后台不基于人数上限做明确提示。</small>
            </label>

            <div class="info-card">
              <span>报名体验</span>
              <strong>{{ formatEventRegistrationState(form.registrationState) }}</strong>
              <small class="field-hint">{{ capacitySummary }}</small>
            </div>
          </div>

          <label class="field">
            <span>报名链接</span>
            <input v-model="form.registrationUrl" type="text" placeholder="https://example.com/register" />
            <small class="field-hint">如果需要同步跳转外部表单，可在详情页报名区额外展示这个链接。</small>
          </label>
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">详情内容</div>
            <h3>补足列表摘要与详情说明</h3>
            <p>摘要用于列表卡片和详情页首屏，正文用于解释活动背景、适合人群与讨论重点。</p>
          </div>

          <label class="field">
            <span>摘要</span>
            <textarea v-model="form.summary" rows="5" placeholder="用于列表和详情页首屏展示的活动摘要。" />
            <small class="field-hint">建议用 2-4 句话说明活动想解决的问题、适合谁参加，以及组织方式。</small>
            <small v-if="fieldIssues.summary" class="field-error">{{ fieldIssues.summary }}</small>
          </label>

          <label class="field">
            <span>正文</span>
            <textarea v-model="form.body" rows="12" placeholder="更完整的活动介绍、目标与参会背景说明。" />
            <small class="field-hint">正文会直接显示在详情页“活动概览”区域，适合写活动背景、目标与参会收获。</small>
          </label>
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">议程安排</div>
            <h3>维护详情页的时间线内容</h3>
            <p>议程区会把每个环节的时间、主题和讲者按列表方式公开展示。</p>
          </div>

          <div class="panel inset-panel stacked-gap">
            <div class="page-header-row compact-row">
              <div>
                <div class="brand-tag">议程</div>
                <p class="section-copy">活动环节、时间与讲者信息。</p>
              </div>
              <button class="button-link button-compact" type="button" @click="addAgendaItem">添加议程</button>
            </div>

            <div v-for="(item, index) in form.agenda" :key="index" class="panel stacked-gap">
              <div class="page-header-row compact-row">
                <strong>议程 {{ index + 1 }}</strong>
                <button class="button-link button-danger button-compact" type="button" @click="removeAgendaItem(index)">移除</button>
              </div>

              <div class="field-grid field-grid-2">
                <label class="field">
                  <span>议程标题</span>
                  <input v-model="item.title" type="text" />
                </label>
                <label class="field">
                  <span>讲者</span>
                  <input v-model="item.speakerName" type="text" />
                </label>
              </div>

              <div class="field-grid field-grid-2">
                <label class="field">
                  <span>开始时间</span>
                  <input v-model="item.startsAt" type="datetime-local" />
                </label>
                <label class="field">
                  <span>结束时间</span>
                  <input v-model="item.endsAt" type="datetime-local" />
                </label>
              </div>

              <label class="field">
                <span>议程说明</span>
                <textarea v-model="item.summary" rows="4" />
              </label>
            </div>
          </div>
        </section>
        </div>

        <aside class="editor-side stacked-gap">
        <CoverAssetField
          v-model="form.coverAssetId"
          :assets="coverAssets"
          label="活动封面"
          help="选择公开图片资源作为活动详情与列表封面。"
          :error="fieldIssues.coverAssetId"
        />

        <div class="panel stacked-gap">
          <div class="brand-tag">前台映射</div>

          <div class="preview-stack">
            <div class="preview-group">
              <span class="preview-label">活动列表卡片</span>
              <div class="preview-card">
                <span class="preview-eyebrow">{{ selectedBranchLabel }}</span>
                <strong class="preview-title">{{ form.title || "活动标题会展示在这里" }}</strong>
                <p class="preview-copy">
                  {{ form.summary || "活动摘要会用于说明这场活动的主题、适合人群和报名方式。" }}
                </p>
                <div class="preview-meta">
                  <span>{{ eventTimelineSummary }}</span>
                  <span>{{ form.venueName || "待补充场地名称" }}</span>
                </div>
              </div>
            </div>

            <div class="preview-group">
              <span class="preview-label">活动详情页信息区</span>
              <div class="preview-card preview-card-dark">
                <span class="preview-eyebrow">活动详情</span>
                <strong class="preview-title">{{ form.title || "详情页主标题" }}</strong>
                <ul class="preview-list">
                  <li>
                    <span>时间</span>
                    <strong>{{ eventTimelineSummary }}</strong>
                  </li>
                  <li>
                    <span>地点</span>
                    <strong>{{ eventLocationSummary }}</strong>
                  </li>
                  <li>
                    <span>报名状态</span>
                    <strong>{{ formatEventRegistrationState(form.registrationState) }}</strong>
                  </li>
                </ul>
              </div>
            </div>

            <div class="preview-group">
              <span class="preview-label">议程展示</span>
              <div class="preview-card">
                <ul class="preview-list">
                  <li v-for="(item, index) in populatedAgendaItems.slice(0, 3)" :key="`${index}-${item.title}-${item.speakerName}`">
                    <span>{{ item.startsAt ? formatDateTime(item.startsAt) : `议程 ${index + 1}` }}</span>
                    <strong>{{ item.title || "未命名议程" }}<template v-if="item.speakerName"> · {{ item.speakerName }}</template></strong>
                  </li>
                  <li v-if="populatedAgendaItems.length === 0">
                    <span>议程预览</span>
                    <strong>尚未填写议程，详情页这里会展示活动时间线。</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">运营提示</div>
          <div class="info-row">
            <span>内容状态</span>
            <strong class="status-pill">{{ formatContentStatus(event?.status ?? form.status) }}</strong>
          </div>
          <div class="info-row">
            <span>报名状态</span>
            <strong>{{ formatEventRegistrationState(form.registrationState) }}</strong>
          </div>
          <div class="info-row">
            <span>议程数量</span>
            <strong>{{ populatedAgendaItems.length }}</strong>
          </div>
          <div class="info-row">
            <span>最近更新</span>
            <strong>{{ formatDateTime(event?.updatedAt) }}</strong>
          </div>
          <div class="info-row">
            <span>发布时间</span>
            <strong>{{ formatDateTime(event?.publishedAt) }}</strong>
          </div>

          <div class="preview-note">
            <p>{{ registrationExperienceSummary }}</p>
          </div>

          <ul class="checklist">
            <li v-for="item in eventChecklist" :key="item.label">
              <span class="checklist-indicator" :class="item.ready ? 'is-ready' : 'is-pending'"></span>
              <div>
                <strong>{{ item.label }}</strong>
                <small>{{ item.hint }}</small>
              </div>
            </li>
          </ul>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">议程概览</div>
          <div class="agenda-timeline-list">
            <article
              v-for="(item, index) in populatedAgendaItems.slice(0, 4)"
              :key="`${index}-${item.title}-${item.startsAt}-${item.speakerName}`"
              class="agenda-timeline-card"
            >
              <strong>{{ item.title || `议程 ${index + 1}` }}</strong>
              <p>{{ item.startsAt ? formatDateTime(item.startsAt) : "待补充开始时间" }}<template v-if="item.endsAt"> - {{ formatDateTime(item.endsAt) }}</template></p>
              <p>{{ item.speakerName || "待补充讲者" }}</p>
            </article>
            <article v-if="populatedAgendaItems.length === 0" class="agenda-timeline-card">
              <strong>尚未填写议程</strong>
              <p>至少补充一条议程后，这里会同步显示活动时间线摘要。</p>
            </article>
          </div>
        </div>
        </aside>
      </div>
    </template>
  </section>
</template>
