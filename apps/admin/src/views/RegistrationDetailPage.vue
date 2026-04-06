<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import {
  eventRegistrationStatusOptions,
  type AdminEventRegistrationDetailPayloadV2,
  type AdminEventRegistrationRecordV2,
  type AdminEventRegistrationUpdateInputV2
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatDateTime, formatEventRegistrationState } from "../lib/format";

const route = useRoute();

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const registration = ref<AdminEventRegistrationRecordV2 | null>(null);
const eventInfo = ref<AdminEventRegistrationDetailPayloadV2["event"] | null>(null);
const memberOptions = ref<Array<{ id: string; label: string; description?: string | null }>>([]);
const form = reactive<AdminEventRegistrationUpdateInputV2>({
  status: "submitted",
  reviewNotes: "",
  matchedMemberId: null
});

const registrationId = computed(() => (typeof route.params.id === "string" ? route.params.id : ""));
const overviewItems = computed(() => {
  if (!registration.value || !eventInfo.value) {
    return [];
  }

  return [
    {
      label: "报名状态",
      value: formatEventRegistrationState(eventInfo.value.registrationState)
    },
    {
      label: "活动",
      value: eventInfo.value.title
    },
    {
      label: "开始时间",
      value: formatDateTime(eventInfo.value.startsAt)
    },
    {
      label: "提交时间",
      value: formatDateTime(registration.value.createdAt)
    },
    {
      label: "审核时间",
      value: formatDateTime(registration.value.reviewedAt)
    }
  ];
});

const loadRegistration = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminFetch<AdminEventRegistrationDetailPayloadV2>(`/api/admin/v1/registrations/${registrationId.value}`);
    registration.value = payload.registration;
    eventInfo.value = payload.event;
    memberOptions.value = payload.references.members;
    form.status = payload.registration.status;
    form.reviewNotes = payload.registration.reviewNotes;
    form.matchedMemberId = payload.registration.matchedMemberId;
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
    const payload = await adminRequest<AdminEventRegistrationDetailPayloadV2>(`/api/admin/v1/registrations/${registrationId.value}`, {
      method: "PATCH",
      body: form
    });
    registration.value = payload.registration;
    eventInfo.value = payload.event;
    memberOptions.value = payload.references.members;
    form.status = payload.registration.status;
    form.reviewNotes = payload.registration.reviewNotes;
    form.matchedMemberId = payload.registration.matchedMemberId;
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
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <h2>{{ registration ? registration.name : "报名详情" }}</h2>

      <div class="page-actions page-actions-compact">
        <RouterLink v-if="eventInfo" class="button-link" :to="`/events/${eventInfo.id}/registrations`">返回报名列表</RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : "保存状态" }}
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
      <p>正在准备报名详情...</p>
    </div>

    <div v-else-if="registration && eventInfo" class="editor-grid editor-grid-review">
      <div class="panel panel-compact editor-main stacked-gap">
        <section class="editor-section editor-section-compact stacked-gap">
          <div class="editor-section-head">
            <h3>报名人信息</h3>
          </div>

          <div class="field-grid field-grid-3">
            <div class="info-card">
              <span>姓名</span>
              <strong>{{ registration.name }}</strong>
            </div>
            <div class="info-card">
              <span>手机号</span>
              <strong>{{ registration.phoneNumber || "未填写" }}</strong>
            </div>
            <div class="info-card">
              <span>微信号</span>
              <strong>{{ registration.wechatId || "未填写" }}</strong>
            </div>
            <div class="info-card">
              <span>邮箱</span>
              <strong>{{ registration.email || "未填写" }}</strong>
            </div>
            <div class="info-card">
              <span>公司</span>
              <strong>{{ registration.company || "未填写" }}</strong>
            </div>
            <div class="info-card">
              <span>职称</span>
              <strong>{{ registration.title || "未填写" }}</strong>
            </div>
          </div>
        </section>

        <section class="editor-section editor-section-compact stacked-gap">
          <div class="editor-section-head">
            <h3>补充信息</h3>
          </div>
          <p>{{ registration.note || "未填写补充信息。" }}</p>
        </section>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel panel-compact stacked-gap">
          <h3>审核</h3>

          <label class="field">
            <span>状态</span>
            <select v-model="form.status">
              <option v-for="option in eventRegistrationStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
          </label>

          <label class="field">
            <span>匹配成员</span>
            <select v-model="form.matchedMemberId">
              <option :value="null">不关联成员</option>
              <option v-for="option in memberOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>审核备注</span>
            <textarea v-model="form.reviewNotes" rows="6" placeholder="记录通过、拒绝、候补或后续联系建议。" />
          </label>

          <div class="summary-list summary-list-compact">
            <div v-for="item in overviewItems" :key="item.label" class="summary-row">
              <span>{{ item.label }}</span>
              <strong :class="{ 'status-pill': item.label === '报名状态' }">{{ item.value }}</strong>
            </div>
          </div>

          <details class="panel panel-compact detail-card">
            <summary>提交环境（可选）</summary>

            <div class="detail-card-body">
              <div class="summary-list summary-list-compact">
                <div class="summary-row">
                  <span>提交 IP</span>
                  <strong>{{ registration.submittedIp || "未记录" }}</strong>
                </div>
                <div class="summary-row">
                  <span>User-Agent</span>
                  <strong>{{ registration.submittedUserAgent || "未记录" }}</strong>
                </div>
              </div>
            </div>
          </details>
        </div>
      </aside>
    </div>
  </section>
</template>
