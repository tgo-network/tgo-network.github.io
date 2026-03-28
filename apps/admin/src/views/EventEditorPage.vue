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
import { formatDateTime, slugify, toDateTimeInputValue } from "../lib/format";

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
const pageTitle = computed(() => (isNew.value ? "Create Event" : `Edit Event: ${event.value?.title ?? "Loading..."}`));
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
    errorMessage.value = error instanceof Error ? error.message : "Unable to load event.";
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
    successMessage.value = isNew.value ? "Event created." : "Event saved.";

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
    errorMessage.value = error instanceof Error ? error.message : "Unable to save event.";
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
    successMessage.value = action === "publish" ? "Event published." : "Event archived.";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : `Unable to ${action} event.`;
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
          Manage event content, registration state, city placement, and agenda details from one screen.
        </p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/events">
          Back to Events
        </RouterLink>
        <RouterLink v-if="event" class="button-link" :to="`/events/${event.id}/registrations`">
          View Registrations
        </RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "Saving..." : isNew ? "Create Event" : "Save Changes" }}
        </button>
        <button class="button-link button-subtle" type="button" :disabled="!event || actioning" @click="runAction('publish')">
          {{ actioning ? "Working..." : "Publish" }}
        </button>
        <button class="button-link button-danger" type="button" :disabled="!event || actioning" @click="runAction('archive')">
          Archive
        </button>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger stacked-gap">
      <div class="brand-tag">Action Error</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel stacked-gap panel-success">
      <div class="brand-tag">Saved</div>
      <p>{{ successMessage }}</p>
    </div>

    <div v-if="loading" class="panel">
      <div class="brand-tag">Loading</div>
      <p>Preparing event editor...</p>
    </div>

    <div v-else class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="field-grid field-grid-2">
          <label class="field">
            <span>Title</span>
            <input v-model="form.title" type="text" placeholder="Spring Platform Workshop" @input="onTitleInput" />
            <small v-if="fieldIssues.title" class="field-error">{{ fieldIssues.title }}</small>
          </label>

          <label class="field">
            <span>Status</span>
            <select v-model="form.status">
              <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
          </label>
        </div>

        <label class="field">
          <span>Slug</span>
          <input v-model="form.slug" type="text" placeholder="spring-platform-workshop" @input="onSlugInput" />
          <small v-if="fieldIssues.slug" class="field-error">{{ fieldIssues.slug }}</small>
        </label>

        <div class="field-grid field-grid-3">
          <label class="field">
            <span>City</span>
            <select v-model="form.cityId">
              <option :value="null">No city selected</option>
              <option v-for="option in references.cities" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.cityId" class="field-error">{{ fieldIssues.cityId }}</small>
          </label>

          <label class="field">
            <span>Registration State</span>
            <select v-model="form.registrationState">
              <option v-for="option in eventRegistrationStateOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.registrationState" class="field-error">{{ fieldIssues.registrationState }}</small>
          </label>

          <label class="field">
            <span>Capacity</span>
            <input v-model.number="form.capacity" type="number" min="0" placeholder="120" />
            <small v-if="fieldIssues.capacity" class="field-error">{{ fieldIssues.capacity }}</small>
          </label>
        </div>

        <div class="field-grid field-grid-2">
          <label class="field">
            <span>Start Time</span>
            <input v-model="form.startsAt" type="datetime-local" />
            <small v-if="fieldIssues.startsAt" class="field-error">{{ fieldIssues.startsAt }}</small>
          </label>

          <label class="field">
            <span>End Time</span>
            <input v-model="form.endsAt" type="datetime-local" />
            <small v-if="fieldIssues.endsAt" class="field-error">{{ fieldIssues.endsAt }}</small>
          </label>
        </div>

        <div class="field-grid field-grid-3">
          <label class="field">
            <span>Venue Name</span>
            <input v-model="form.venueName" type="text" placeholder="North Bund Studio" />
          </label>

          <label class="field">
            <span>Timezone</span>
            <input v-model="form.timezone" type="text" placeholder="Asia/Shanghai" />
          </label>

          <label class="field">
            <span>Registration URL</span>
            <input v-model="form.registrationUrl" type="text" placeholder="https://example.com/register" />
          </label>
        </div>

        <label class="field">
          <span>Venue Address</span>
          <input v-model="form.venueAddress" type="text" placeholder="Full venue address" />
        </label>

        <label class="field">
          <span>Summary</span>
          <textarea v-model="form.summary" rows="4" placeholder="Short event summary for cards and listings." />
          <small v-if="fieldIssues.summary" class="field-error">{{ fieldIssues.summary }}</small>
        </label>

        <label class="field">
          <span>Body</span>
          <textarea v-model="form.body" rows="12" placeholder="Longer event description, goals, and attendee context." />
        </label>

        <div class="panel inset-panel stacked-gap">
          <div class="page-header-row agenda-header">
            <div>
              <div class="brand-tag">Agenda</div>
              <p class="section-copy">Session schedule, optional timing, and speakers.</p>
            </div>
            <button class="button-link button-subtle button-compact" type="button" @click="addAgendaItem">
              Add Agenda Item
            </button>
          </div>

          <div class="agenda-list">
            <div v-for="(item, index) in form.agenda" :key="index" class="agenda-card stacked-gap">
              <div class="page-header-row agenda-card-head">
                <strong>Session {{ index + 1 }}</strong>
                <button class="button-link button-danger button-compact" type="button" @click="removeAgendaItem(index)">
                  Remove
                </button>
              </div>

              <div class="field-grid field-grid-2">
                <label class="field">
                  <span>Title</span>
                  <input v-model="item.title" type="text" placeholder="Architecture Briefing" />
                  <small v-if="fieldIssues[`agenda.${index}.title`]" class="field-error">{{ fieldIssues[`agenda.${index}.title`] }}</small>
                </label>

                <label class="field">
                  <span>Speaker</span>
                  <input v-model="item.speakerName" type="text" placeholder="Morgan Lee" />
                </label>
              </div>

              <div class="field-grid field-grid-2">
                <label class="field">
                  <span>Start Time</span>
                  <input v-model="item.startsAt" type="datetime-local" />
                  <small v-if="fieldIssues[`agenda.${index}.startsAt`]" class="field-error">{{ fieldIssues[`agenda.${index}.startsAt`] }}</small>
                </label>

                <label class="field">
                  <span>End Time</span>
                  <input v-model="item.endsAt" type="datetime-local" />
                  <small v-if="fieldIssues[`agenda.${index}.endsAt`]" class="field-error">{{ fieldIssues[`agenda.${index}.endsAt`] }}</small>
                </label>
              </div>

              <label class="field">
                <span>Session Summary</span>
                <textarea v-model="item.summary" rows="3" placeholder="Optional short note for this agenda item." />
              </label>
            </div>
          </div>

          <small v-if="fieldIssues.agenda" class="field-error">{{ fieldIssues.agenda }}</small>
        </div>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">Topics</div>
          <div class="selection-summary">{{ selectedTopicCount }} topic{{ selectedTopicCount === 1 ? "" : "s" }} selected</div>
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
          label="Cover Media"
        />

        <div class="panel stacked-gap">
          <div class="brand-tag">Workflow</div>
          <div class="info-row">
            <span>Current status</span>
            <strong class="status-pill">{{ event?.status ?? form.status }}</strong>
          </div>
          <div class="info-row">
            <span>Registration</span>
            <strong class="status-pill">{{ form.registrationState }}</strong>
          </div>
          <div class="info-row">
            <span>Updated</span>
            <strong>{{ formatDateTime(event?.updatedAt) }}</strong>
          </div>
          <div class="info-row">
            <span>Published</span>
            <strong>{{ formatDateTime(event?.publishedAt) }}</strong>
          </div>
          <p>
            Events need a city, schedule, topics, and at least one agenda item before publishing.
          </p>
        </div>
      </aside>
    </div>
  </section>
</template>
