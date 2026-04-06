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
  type AdminEventUpsertInputV2,
  normalizeLegacyEventMarkdown,
  renderMarkdownToHtml
} from "@tgo/shared";

import CoverAssetField from "../components/CoverAssetField.vue";
import MarkdownEditorField from "../components/MarkdownEditorField.vue";
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
  () => references.value.branches.find((option) => option.id === form.branchId)?.label ?? "暂未选择"
);
const eventBodyPreviewHtml = computed(() => renderMarkdownToHtml(normalizeLegacyEventMarkdown(form.body)));
const eventMetaItems = computed(() => [
  {
    label: "内容状态",
    value: formatContentStatus(event.value?.status ?? form.status)
  },
  {
    label: "报名状态",
    value: formatEventRegistrationState(form.registrationState)
  },
  {
    label: "分会",
    value: selectedBranchLabel.value
  },
  {
    label: "开始时间",
    value: formatDateTime(form.startsAt)
  },
  {
    label: "公开路径",
    value: form.slug ? `/events/${form.slug}` : "待生成"
  },
  {
    label: "最近更新",
    value: formatDateTime(event.value?.updatedAt)
  }
]);
const markdownToolbarItems = [
  {
    label: "插入标题",
    snippet: "## 活动简介"
  },
  {
    label: "插入列表",
    snippet: "- 活动亮点"
  },
  {
    label: "插入引用",
    snippet: "> 报名通过后将由工作人员继续联系"
  },
  {
    label: "插入代码块",
    snippet: "```text\n补充活动说明\n```"
  }
] as const;

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
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <h2>{{ pageTitle }}</h2>

      <div class="page-actions page-actions-compact">
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

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel panel-success">
      <p>{{ successMessage }}</p>
    </div>

    <div v-if="loading" class="panel">
      <p>正在准备活动编辑器...</p>
    </div>

    <div v-else class="stacked-gap">
      <div class="editor-grid editor-grid-focus">
        <div class="panel panel-compact editor-main stacked-gap">
          <section class="editor-section editor-section-compact stacked-gap">
            <div class="editor-section-head">
              <h3>基本信息</h3>
            </div>

            <div class="field-grid field-grid-2">
              <label class="field">
                <span>标题</span>
                <input v-model="form.title" type="text" placeholder="春季平台工作坊" @input="onTitleInput" />
                <small v-if="fieldIssues.title" class="field-error">{{ fieldIssues.title }}</small>
              </label>

              <label class="field">
                <span>URL 标识</span>
                <input v-model="form.slug" type="text" placeholder="spring-platform-workshop" @input="onSlugInput" />
                <small v-if="fieldIssues.slug" class="field-error">{{ fieldIssues.slug }}</small>
              </label>
            </div>

            <div class="field-grid field-grid-2">
              <label class="field">
                <span>分会</span>
                <select v-model="form.branchId">
                  <option :value="null">暂不选择分会</option>
                  <option v-for="option in references.branches" :key="option.id" :value="option.id">{{ option.label }}</option>
                </select>
                <small v-if="fieldIssues.branchId" class="field-error">{{ fieldIssues.branchId }}</small>
              </label>

              <label class="field">
                <span>内容状态</span>
                <select v-model="form.status">
                  <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
              </label>
            </div>
          </section>

          <section class="editor-section editor-section-compact stacked-gap">
            <div class="editor-section-head">
              <h3>时间与地点</h3>
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

              <label class="field">
                <span>人数上限</span>
                <input v-model.number="form.capacity" type="number" min="0" placeholder="120" />
              </label>
            </div>

            <label class="field">
              <span>场地地址</span>
              <input v-model="form.venueAddress" type="text" placeholder="完整场地地址" />
            </label>
          </section>

          <section class="editor-section editor-section-compact stacked-gap">
            <div class="editor-section-head">
              <h3>报名设置</h3>
            </div>

            <div class="field-grid field-grid-2">
              <label class="field">
                <span>报名状态</span>
                <select v-model="form.registrationState">
                  <option v-for="option in eventRegistrationStateOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <small v-if="fieldIssues.registrationState" class="field-error">{{ fieldIssues.registrationState }}</small>
              </label>

              <label class="field">
                <span>报名链接</span>
                <input v-model="form.registrationUrl" type="text" placeholder="https://example.com/register" />
              </label>
            </div>
          </section>
        </div>

        <aside class="editor-side stacked-gap">
          <div class="panel panel-compact summary-panel stacked-gap-tight">
            <div class="panel-toolbar">
              <h3>当前信息</h3>
              <span class="status-pill">{{ formatEventRegistrationState(form.registrationState) }}</span>
            </div>

            <div class="summary-list">
              <div v-for="item in eventMetaItems" :key="item.label" class="summary-row">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>

          <CoverAssetField
            v-model="form.coverAssetId"
            class="panel-compact"
            :assets="coverAssets"
            label="活动封面"
            help="用于活动列表与详情页封面。"
            :error="fieldIssues.coverAssetId"
          />
        </aside>
      </div>

      <section class="editor-section stacked-gap">
        <div class="editor-section-head">
          <h3>摘要与正文</h3>
        </div>

        <label class="field">
          <span>摘要</span>
          <textarea v-model="form.summary" rows="5" placeholder="用于列表和详情页首屏展示的活动摘要。" />
          <small v-if="fieldIssues.summary" class="field-error">{{ fieldIssues.summary }}</small>
        </label>

        <MarkdownEditorField
          v-model="form.body"
          placeholder="使用 Markdown 编写活动正文。"
          help="支持标题、列表、引用和表格。"
          :error="fieldIssues.body"
          :preview-html="eventBodyPreviewHtml"
          preview-empty-description="开始输入 Markdown 后，这里会显示活动正文的排版效果。"
          :toolbar-items="markdownToolbarItems"
        />
      </section>

      <section class="editor-section stacked-gap">
        <div class="panel-toolbar">
          <div class="editor-section-head">
            <h3>议程</h3>
          </div>

          <button class="button-link button-compact" type="button" @click="addAgendaItem">添加议程</button>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div v-for="(item, index) in form.agenda" :key="index" class="panel stacked-gap">
            <div class="panel-toolbar">
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
  </section>
</template>
