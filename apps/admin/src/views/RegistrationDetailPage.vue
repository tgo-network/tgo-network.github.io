<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import {
  eventRegistrationStatusOptions,
  type AdminEventRegistrationDetailPayload,
  type AdminEventRegistrationRecord,
  type AdminEventRegistrationUpdateInput
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatDateTime, formatEventRegistrationState, formatEventRegistrationStatus } from "../lib/format";

const route = useRoute();

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const registration = ref<AdminEventRegistrationRecord | null>(null);
const eventInfo = ref<AdminEventRegistrationDetailPayload["event"] | null>(null);
const form = reactive<AdminEventRegistrationUpdateInput>({
  status: "submitted"
});

const registrationId = computed(() => (typeof route.params.id === "string" ? route.params.id : ""));
const answersJson = computed(() =>
  registration.value?.answersJson ? JSON.stringify(registration.value.answersJson, null, 2) : "没有提交额外信息。"
);

const loadRegistration = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminFetch<AdminEventRegistrationDetailPayload>(`/api/admin/v1/registrations/${registrationId.value}`);
    registration.value = payload.registration;
    eventInfo.value = payload.event;
    form.status = payload.registration.status;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载报名详情。";
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
    const payload = await adminRequest<AdminEventRegistrationDetailPayload>(`/api/admin/v1/registrations/${registrationId.value}`, {
      method: "PATCH",
      body: form
    });
    registration.value = payload.registration;
    eventInfo.value = payload.event;
    form.status = payload.registration.status;
    successMessage.value = "报名状态已更新。";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "无法更新报名状态。";
  } finally {
    saving.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    void loadRegistration();
  }
);

onMounted(() => {
  void loadRegistration();
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ registration ? registration.name : "报名详情" }}</h2>
        <p>审核报名人信息，并让报名决策与活动运营流程保持一致。</p>
      </div>

      <div class="page-actions">
        <RouterLink v-if="eventInfo" class="button-link" :to="`/events/${eventInfo.id}/registrations`">
          返回报名列表
        </RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : "保存状态" }}
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
      <p>正在准备报名详情...</p>
    </div>

    <div v-else-if="registration && eventInfo" class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="brand-tag">报名人</div>
        <div class="field-grid field-grid-2">
          <div class="info-card">
            <span>姓名</span>
            <strong>{{ registration.name }}</strong>
          </div>
          <div class="info-card">
            <span>状态</span>
            <strong>{{ formatEventRegistrationStatus(registration.status) }}</strong>
          </div>
          <div class="info-card">
            <span>邮箱</span>
            <strong>{{ registration.email || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>手机号</span>
            <strong>{{ registration.phoneNumber || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>公司</span>
            <strong>{{ registration.company || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>职位</span>
            <strong>{{ registration.jobTitle || "-" }}</strong>
          </div>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">扩展信息</div>
          <pre class="json-preview">{{ answersJson }}</pre>
        </div>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">审核</div>
          <label class="field">
            <span>状态</span>
            <select v-model="form.status">
              <option v-for="option in eventRegistrationStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small class="field-hint">当活动已满但仍希望保留报名顺位时，请使用“候补中”。</small>
            <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
          </label>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">活动</div>
          <div class="info-card">
            <span>标题</span>
            <strong>{{ eventInfo.title }}</strong>
          </div>
          <div class="info-row">
            <span>URL 标识</span>
            <strong>/{{ eventInfo.slug }}</strong>
          </div>
          <div class="info-row">
            <span>场地</span>
            <strong>{{ eventInfo.venueName || "-" }}</strong>
          </div>
          <div class="info-row">
            <span>报名状态</span>
            <strong class="status-pill">{{ formatEventRegistrationState(eventInfo.registrationState) }}</strong>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">审计</div>
          <div class="info-row">
            <span>来源</span>
            <strong>{{ registration.source }}</strong>
          </div>
          <div class="info-row">
            <span>提交时间</span>
            <strong>{{ formatDateTime(registration.createdAt) }}</strong>
          </div>
          <div class="info-row">
            <span>审核时间</span>
            <strong>{{ formatDateTime(registration.reviewedAt) }}</strong>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
