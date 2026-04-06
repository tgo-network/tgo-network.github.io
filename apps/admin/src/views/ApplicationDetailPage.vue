<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import {
  applicationStatusOptions,
  type AdminJoinApplicationDetailPayload,
  type AdminJoinApplicationRecord,
  type AdminJoinApplicationUpdateInput
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatApplicationStatus, formatDateTime } from "../lib/format";

const route = useRoute();

const application = ref<AdminJoinApplicationRecord | null>(null);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const form = reactive<AdminJoinApplicationUpdateInput>({
  status: "submitted",
  reviewNotes: ""
});

const loadApplication = async () => {
  const applicationId = typeof route.params.id === "string" ? route.params.id : "";
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminFetch<AdminJoinApplicationDetailPayload>(`/api/admin/v1/applications/${applicationId}`);
    application.value = payload.application;
    form.status = payload.application.status;
    form.reviewNotes = payload.application.reviewNotes;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载申请详情。";
  } finally {
    loading.value = false;
  }
};

const save = async () => {
  const applicationId = typeof route.params.id === "string" ? route.params.id : "";
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminRequest<AdminJoinApplicationDetailPayload>(`/api/admin/v1/applications/${applicationId}`, {
      method: "PATCH",
      body: form
    });
    application.value = payload.application;
    form.status = payload.application.status;
    form.reviewNotes = payload.application.reviewNotes;
    successMessage.value = "申请审核已更新。";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "无法更新申请。";
  } finally {
    saving.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    void loadApplication();
  }
);

onMounted(() => {
  void loadApplication();
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <h2>{{ application ? application.name : "申请详情" }}</h2>

      <div class="page-actions page-actions-compact">
        <RouterLink class="button-link" to="/applications">返回申请列表</RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : "保存审核" }}
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
      <p>正在准备申请详情...</p>
    </div>

    <div v-else-if="application" class="editor-grid editor-grid-focus">
      <div class="panel panel-compact editor-main stacked-gap">
        <section class="editor-section editor-section-compact stacked-gap">
          <div class="editor-section-head">
            <h3>申请人信息</h3>
          </div>

          <div class="field-grid field-grid-2">
            <div class="info-card">
              <span>姓名</span>
              <strong>{{ application.name }}</strong>
            </div>
            <div class="info-card">
              <span>手机号</span>
              <strong>{{ application.phoneNumber }}</strong>
            </div>
            <div class="info-card">
              <span>微信号</span>
              <strong>{{ application.wechatId || "未填写" }}</strong>
            </div>
            <div class="info-card">
              <span>邮箱</span>
              <strong>{{ application.email || "未填写" }}</strong>
            </div>
            <div class="info-card">
              <span>意向分会</span>
              <strong>{{ application.targetBranchName || "未指定" }}</strong>
            </div>
            <div class="info-card">
              <span>当前状态</span>
              <strong>{{ formatApplicationStatus(application.status) }}</strong>
            </div>
          </div>
        </section>

        <section class="editor-section editor-section-compact stacked-gap">
          <div class="editor-section-head">
            <h3>个人介绍</h3>
          </div>
          <p>{{ application.introduction }}</p>
        </section>

        <section class="editor-section editor-section-compact stacked-gap">
          <div class="editor-section-head">
            <h3>申请信息</h3>
          </div>
          <p>{{ application.applicationMessage }}</p>
        </section>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel panel-compact stacked-gap">
          <h3>审核</h3>

          <label class="field">
            <span>状态</span>
            <select v-model="form.status">
              <option v-for="option in applicationStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
          </label>

          <label class="field">
            <span>审核备注</span>
            <textarea v-model="form.reviewNotes" rows="10" placeholder="记录沟通结论、跟进动作与审核判断。" />
            <small v-if="fieldIssues.reviewNotes" class="field-error">{{ fieldIssues.reviewNotes }}</small>
          </label>
        </div>

        <div class="panel panel-compact summary-panel stacked-gap-tight">
          <h3>当前状态</h3>

          <div class="summary-list">
            <div class="summary-row">
              <span>当前状态</span>
              <strong class="status-pill">{{ formatApplicationStatus(application.status) }}</strong>
            </div>
            <div class="summary-row">
              <span>意向分会</span>
              <strong>{{ application.targetBranchName || "未指定" }}</strong>
            </div>
            <div class="summary-row">
              <span>邮箱</span>
              <strong>{{ application.email || "未填写" }}</strong>
            </div>
          </div>
        </div>

        <div class="panel panel-compact summary-panel stacked-gap-tight">
          <h3>时间记录</h3>

          <div class="summary-list">
            <div class="summary-row">
              <span>提交时间</span>
              <strong>{{ formatDateTime(application.createdAt) }}</strong>
            </div>
            <div class="summary-row">
              <span>更新时间</span>
              <strong>{{ formatDateTime(application.updatedAt) }}</strong>
            </div>
            <div class="summary-row">
              <span>审核时间</span>
              <strong>{{ formatDateTime(application.reviewedAt) }}</strong>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
