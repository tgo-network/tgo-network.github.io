<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import {
  applicationStatusOptions,
  type AdminApplicationDetailPayload,
  type AdminApplicationRecord,
  type AdminApplicationUpdateInput
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatApplicationStatus, formatApplicationType, formatDateTime } from "../lib/format";

const route = useRoute();

const application = ref<AdminApplicationRecord | null>(null);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const form = reactive<AdminApplicationUpdateInput>({
  status: "submitted",
  internalNotes: ""
});

const loadApplication = async () => {
  const applicationId = typeof route.params.id === "string" ? route.params.id : "";
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminFetch<AdminApplicationDetailPayload>(`/api/admin/v1/applications/${applicationId}`);
    application.value = payload.application;
    form.status = payload.application.status;
    form.internalNotes = payload.application.internalNotes;
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
    const payload = await adminRequest<AdminApplicationDetailPayload>(`/api/admin/v1/applications/${applicationId}`, {
      method: "PATCH",
      body: form
    });
    application.value = payload.application;
    form.status = payload.application.status;
    form.internalNotes = payload.application.internalNotes;
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
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ application ? application.name : "申请详情" }}</h2>
        <p>
          审核公开表单提交、补充内部备注，并推动申请人在工作人员流程中继续流转。
        </p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/applications">
          返回申请列表
        </RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : "保存审核" }}
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
      <p>正在准备申请详情...</p>
    </div>

    <div v-else-if="application" class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="brand-tag">申请人</div>
        <div class="field-grid field-grid-2">
          <div class="info-card">
            <span>姓名</span>
            <strong>{{ application.name }}</strong>
          </div>
          <div class="info-card">
            <span>类型</span>
            <strong>{{ formatApplicationType(application.type) }}</strong>
          </div>
          <div class="info-card">
            <span>邮箱</span>
            <strong>{{ application.email || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>手机号</span>
            <strong>{{ application.phoneNumber || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>公司</span>
            <strong>{{ application.company || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>职位</span>
            <strong>{{ application.jobTitle || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>城市</span>
            <strong>{{ application.cityName || "-" }}</strong>
          </div>
          <div class="info-card">
            <span>来源</span>
            <strong>{{ application.sourcePage }}</strong>
          </div>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">申请说明</div>
          <p>{{ application.message || "未填写说明。" }}</p>
        </div>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">审核</div>
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
            <span>内部备注</span>
            <textarea v-model="form.internalNotes" rows="10" placeholder="仅工作人员可见的审核备注、跟进背景与下一步动作。" />
            <small v-if="fieldIssues.internalNotes" class="field-error">{{ fieldIssues.internalNotes }}</small>
          </label>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">审计</div>
          <div class="info-row">
            <span>创建时间</span>
            <strong>{{ formatDateTime(application.createdAt) }}</strong>
          </div>
          <div class="info-row">
            <span>更新时间</span>
            <strong>{{ formatDateTime(application.updatedAt) }}</strong>
          </div>
          <div class="info-row">
            <span>审核时间</span>
            <strong>{{ formatDateTime(application.reviewedAt) }}</strong>
          </div>
          <div class="info-row">
            <span>当前状态</span>
            <strong class="status-pill">{{ formatApplicationStatus(application.status) }}</strong>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
