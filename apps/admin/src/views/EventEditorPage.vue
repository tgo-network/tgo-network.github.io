<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import {
  contentStatusOptions,
  eventRegistrationStateOptions,
  type AdminAssetListItem,
  type AdminEventAgendaItem,
  type AdminEventDetailPayload,
  type AdminEventReferences,
  type AdminEventReferencesPayload,
  type AdminEventRecord,
  type AdminEventUpsertInput
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import CoverAssetField from "../components/CoverAssetField.vue";
import { formatContentStatus, formatDateTime, formatEventRegistrationState, slugify, toDateTimeInputValue } from "../lib/format";

interface EventAgendaFormItem {
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  speakerName: string;
}

interface EventFormState extends Omit<AdminEventUpsertInput, "startsAt" | "endsAt" | "agenda"> {
  startsAt: string;
  endsAt: string;
  agenda: EventAgendaFormItem[];
}

const route = useRoute();
const router = useRouter();

const emptyReferences = (): AdminEventReferences => ({
  cities: [],
  topics: []
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
  cityId: null,
  coverAssetId: null,
  venueName: "",
  venueAddress: "",
  startsAt: "",
  endsAt: "",
  timezone: "Asia/Shanghai",
  capacity: null,
  registrationState: "not_open",
  registrationUrl: "",
  topicIds: [],
  agenda: [createAgendaItem()]
});

const form = reactive<EventFormState>(createBlankForm());
const event = ref<AdminEventRecord | null>(null);
const references = ref<AdminEventReferences>(emptyReferences());
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
const selectedTopicCount = computed(() => form.topicIds.length);

const resetFeedback = () => {
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};
};

const applyPayload = (payload: AdminEventDetailPayload) => {
  event.value = payload.event;
  references.value = payload.references;
  Object.assign(form, {
    slug: payload.event.slug,
    title: payload.event.title,
    summary: payload.event.summary,
    body: payload.event.body,
    status: payload.event.status,
    cityId: payload.event.cityId,
    coverAssetId: payload.event.coverAssetId,
    venueName: payload.event.venueName,
    venueAddress: payload.event.venueAddress,
    startsAt: toDateTimeInputValue(payload.event.startsAt),
    endsAt: toDateTimeInputValue(payload.event.endsAt),
    timezone: payload.event.timezone,
    capacity: payload.event.capacity,
    registrationState: payload.event.registrationState,
    registrationUrl: payload.event.registrationUrl,
    topicIds: [...payload.event.topicIds],
    agenda: payload.event.agenda.length > 0
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

const loadEvent = async () => {
  resetFeedback();
  loading.value = true;

  try {
    if (isNew.value) {
      const [payload, nextAssets] = await Promise.all([
        adminFetch<AdminEventReferencesPayload>("/api/admin/v1/events/references"),
        adminFetch<AdminAssetListItem[]>("/api/admin/v1/assets")
      ]);
      references.value = payload.references;
      coverAssets.value = nextAssets;
      event.value = null;
      slugTouched.value = false;
      Object.assign(form, createBlankForm());
      return;
    }

    const [payload, nextAssets] = await Promise.all([
      adminFetch<AdminEventDetailPayload>(`/api/admin/v1/events/${eventId.value}`),
      adminFetch<AdminAssetListItem[]>("/api/admin/v1/assets")
    ]);
    coverAssets.value = nextAssets;
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

const toggleTopic = (topicId: string) => {
  if (form.topicIds.includes(topicId)) {
    form.topicIds = form.topicIds.filter((item) => item !== topicId);
    return;
  }

  form.topicIds = [...form.topicIds, topicId];
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

const toPayload = (): AdminEventUpsertInput => ({
  ...form,
  startsAt: form.startsAt || null,
  endsAt: form.endsAt || null,
  agenda: form.agenda.map((item): AdminEventAgendaItem => ({
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
    const payload = await adminRequest<AdminEventDetailPayload>(
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
    const payload = await adminRequest<AdminEventDetailPayload>(`/api/admin/v1/events/${event.value.id}/${action}`, {
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
        <p>
          在同一页面中管理活动内容、报名状态、城市归属与议程细节。
        </p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/events">
          返回活动列表
        </RouterLink>
        <RouterLink v-if="event" class="button-link" :to="`/events/${event.id}/registrations`">
          查看报名
        </RouterLink>
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

    <div v-else class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="field-grid field-grid-2">
          <label class="field">
            <span>标题</span>
            <input v-model="form.title" type="text" placeholder="春季平台工作坊" @input="onTitleInput" />
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
          <input v-model="form.slug" type="text" placeholder="spring-platform-workshop" @input="onSlugInput" />
          <small v-if="fieldIssues.slug" class="field-error">{{ fieldIssues.slug }}</small>
        </label>

        <div class="field-grid field-grid-3">
          <label class="field">
            <span>城市</span>
            <select v-model="form.cityId">
              <option :value="null">暂不选择城市</option>
              <option v-for="option in references.cities" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.cityId" class="field-error">{{ fieldIssues.cityId }}</small>
          </label>

          <label class="field">
            <span>报名状态</span>
            <select v-model="form.registrationState">
              <option v-for="option in eventRegistrationStateOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.registrationState" class="field-error">{{ fieldIssues.registrationState }}</small>
          </label>

          <label class="field">
            <span>人数上限</span>
            <input v-model.number="form.capacity" type="number" min="0" placeholder="120" />
            <small v-if="fieldIssues.capacity" class="field-error">{{ fieldIssues.capacity }}</small>
          </label>
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
            <span>报名链接</span>
            <input v-model="form.registrationUrl" type="text" placeholder="https://example.com/register" />
          </label>
        </div>

        <label class="field">
          <span>场地地址</span>
          <input v-model="form.venueAddress" type="text" placeholder="完整场地地址" />
        </label>

        <label class="field">
          <span>摘要</span>
          <textarea v-model="form.summary" rows="4" placeholder="用于卡片与列表展示的活动摘要。" />
          <small v-if="fieldIssues.summary" class="field-error">{{ fieldIssues.summary }}</small>
        </label>

        <label class="field">
          <span>正文</span>
          <textarea v-model="form.body" rows="12" placeholder="更完整的活动介绍、目标与参会背景说明。" />
        </label>

        <div class="panel inset-panel stacked-gap">
          <div class="page-header-row agenda-header">
            <div>
              <div class="brand-tag">议程</div>
              <p class="section-copy">活动环节、可选时间与讲者信息。</p>
            </div>
            <button class="button-link button-subtle button-compact" type="button" @click="addAgendaItem">
              新增议程项
            </button>
          </div>

          <div class="agenda-list">
            <div v-for="(item, index) in form.agenda" :key="index" class="agenda-card stacked-gap">
              <div class="page-header-row agenda-card-head">
                <strong>环节 {{ index + 1 }}</strong>
                <button class="button-link button-danger button-compact" type="button" @click="removeAgendaItem(index)">
                  删除
                </button>
              </div>

              <div class="field-grid field-grid-2">
                <label class="field">
                  <span>标题</span>
                  <input v-model="item.title" type="text" placeholder="架构简报" />
                  <small v-if="fieldIssues[`agenda.${index}.title`]" class="field-error">{{ fieldIssues[`agenda.${index}.title`] }}</small>
                </label>

                <label class="field">
                  <span>讲者</span>
                  <input v-model="item.speakerName" type="text" placeholder="李墨言" />
                </label>
              </div>

              <div class="field-grid field-grid-2">
                <label class="field">
                  <span>开始时间</span>
                  <input v-model="item.startsAt" type="datetime-local" />
                  <small v-if="fieldIssues[`agenda.${index}.startsAt`]" class="field-error">{{ fieldIssues[`agenda.${index}.startsAt`] }}</small>
                </label>

                <label class="field">
                  <span>结束时间</span>
                  <input v-model="item.endsAt" type="datetime-local" />
                  <small v-if="fieldIssues[`agenda.${index}.endsAt`]" class="field-error">{{ fieldIssues[`agenda.${index}.endsAt`] }}</small>
                </label>
              </div>

              <label class="field">
                <span>环节摘要</span>
                <textarea v-model="item.summary" rows="3" placeholder="该议程项的补充说明，可选。" />
              </label>
            </div>
          </div>

          <small v-if="fieldIssues.agenda" class="field-error">{{ fieldIssues.agenda }}</small>
        </div>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">主题</div>
          <div class="selection-summary">已选择 {{ selectedTopicCount }} 个主题</div>
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
          label="封面资源"
        />

        <div class="panel stacked-gap">
          <div class="brand-tag">工作流</div>
          <div class="info-row">
            <span>当前状态</span>
            <strong class="status-pill">{{ formatContentStatus(event?.status ?? form.status) }}</strong>
          </div>
          <div class="info-row">
            <span>报名状态</span>
            <strong class="status-pill">{{ formatEventRegistrationState(form.registrationState) }}</strong>
          </div>
          <div class="info-row">
            <span>更新时间</span>
            <strong>{{ formatDateTime(event?.updatedAt) }}</strong>
          </div>
          <div class="info-row">
            <span>发布时间</span>
            <strong>{{ formatDateTime(event?.publishedAt) }}</strong>
          </div>
          <p>
            活动在发布前必须具备城市、时间安排、主题关联以及至少一个议程项。
          </p>
        </div>
      </aside>
    </div>
  </section>
</template>
