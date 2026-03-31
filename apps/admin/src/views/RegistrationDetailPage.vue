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
import { formatDateTime, formatEventRegistrationState, formatEventRegistrationStatus } from "../lib/format";

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
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ registration ? registration.name : "报名详情" }}</h2>
        <p>查看报名人信息、审核备注与成员匹配情况，保持活动报名流程可追踪。</p>
      </div>

      <div class="page-actions">
        <RouterLink v-if="eventInfo" class="button-link" :to="`/events/${eventInfo.id}/registrations`">返回报名列表</RouterLink>
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
        <div class="brand-tag">报名人信息</div>
        <div class="field-grid field-grid-2">
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

        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">补充信息</div>
          <p>{{ registration.note || "未填写补充信息。" }}</p>
        </div>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">审核</div>
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
            <textarea v-model="form.reviewNotes" rows="8" placeholder="记录通过、拒绝、候补或后续联系建议。" />
          </label>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">活动信息</div>
          <div class="info-row">
            <span>活动</span>
            <strong>{{ eventInfo.title }}</strong>
          </div>
          <div class="info-row">
            <span>URL 标识</span>
            <strong>/{{ eventInfo.slug }}</strong>
          </div>
          <div class="info-row">
            <span>报名状态</span>
            <strong class="status-pill">{{ formatEventRegistrationState(eventInfo.registrationState) }}</strong>
          </div>
          <div class="info-row">
            <span>开始时间</span>
            <strong>{{ formatDateTime(eventInfo.startsAt) }}</strong>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">审计</div>
          <div class="info-row">
            <span>提交时间</span>
            <strong>{{ formatDateTime(registration.createdAt) }}</strong>
          </div>
          <div class="info-row">
            <span>审核时间</span>
            <strong>{{ formatDateTime(registration.reviewedAt) }}</strong>
          </div>
          <div class="info-row">
            <span>提交 IP</span>
            <strong>{{ registration.submittedIp || "未记录" }}</strong>
          </div>
          <div class="info-row">
            <span>User-Agent</span>
            <strong>{{ registration.submittedUserAgent || "未记录" }}</strong>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
