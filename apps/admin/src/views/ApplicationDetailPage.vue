<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
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
const overviewItems = computed(() => {
  if (!application.value) {
    return [];
  }

  return [
    {
      label: "当前状态",
      value: formatApplicationStatus(application.value.status)
    },
    {
      label: "意向分会",
      value: application.value.targetBranchName || "未指定"
    },
    {
      label: "提交时间",
      value: formatDateTime(application.value.createdAt)
    },
    {
      label: "审核时间",
      value: formatDateTime(application.value.reviewedAt)
    },
    {
      label: "邮箱",
      value: application.value.email || "未填写"
    }
  ];
});
const applicantItems = computed(() => {
  if (!application.value) {
    return [];
  }

  return [
    {
      label: "姓名",
      value: application.value.name
    },
    {
      label: "手机号",
      value: application.value.phoneNumber
    },
    {
      label: "微信号",
      value: application.value.wechatId || "未填写"
    },
    {
      label: "邮箱",
      value: application.value.email || "未填写"
    },
    {
      label: "意向分会",
      value: application.value.targetBranchName || "未指定"
    }
  ];
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
        <RouterLink class="button-link" to="/applications">返回列表</RouterLink>
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

    <div v-else-if="application" class="editor-grid editor-grid-review">
      <div class="panel panel-compact editor-main stacked-gap">
        <section class="editor-section editor-section-compact stacked-gap">
          <div class="editor-section-head">
            <h3>申请人信息</h3>
          </div>

          <div class="summary-list summary-list-inline review-summary-grid">
            <div v-for="item in applicantItems" :key="item.label" class="summary-row">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </section>

        <div class="panel-grid panel-grid-2 review-note-grid">
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
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel panel-compact stacked-gap">
          <div class="panel-toolbar">
            <h3>审核</h3>
            <span class="status-pill">{{ formatApplicationStatus(form.status) }}</span>
          </div>

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
            <textarea v-model="form.reviewNotes" rows="5" placeholder="记录沟通结论、跟进动作与审核判断。" />
            <small v-if="fieldIssues.reviewNotes" class="field-error">{{ fieldIssues.reviewNotes }}</small>
          </label>

          <div class="summary-list summary-list-compact">
            <div v-for="item in overviewItems" :key="item.label" class="summary-row">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
  .review-summary-grid,
  .review-note-grid {
    gap: 10px 12px;
  }
</style>
