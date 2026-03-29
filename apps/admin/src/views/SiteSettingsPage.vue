<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

import type { AdminSiteSettingsInput, AdminSiteSettingsPayload } from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});

const form = reactive<AdminSiteSettingsInput>({
  siteName: "",
  footerTagline: "",
  supportEmail: ""
});

const loadSettings = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminFetch<AdminSiteSettingsPayload>("/api/admin/v1/site-settings");
    form.siteName = payload.settings.siteName;
    form.footerTagline = payload.settings.footerTagline;
    form.supportEmail = payload.settings.supportEmail;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载站点设置。";
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
    const payload = await adminRequest<AdminSiteSettingsPayload>("/api/admin/v1/site-settings", {
      method: "PATCH",
      body: form
    });
    form.siteName = payload.settings.siteName;
    form.footerTagline = payload.settings.footerTagline;
    form.supportEmail = payload.settings.supportEmail;
    successMessage.value = "站点设置已更新。";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "无法更新站点设置。";
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  void loadSettings();
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <div>
        <h2>站点设置</h2>
        <p>管理公开站头部与页脚使用的基础品牌信息，而不必直接修改源码。</p>
      </div>

      <div class="page-actions">
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : "保存站点设置" }}
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
      <p>正在准备站点设置...</p>
    </div>

    <div v-else class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <label class="field">
          <span>站点名称</span>
          <input v-model="form.siteName" type="text" placeholder="TGO Network" />
          <small class="field-hint">用于公开站头部与 site-config 接口。</small>
          <small v-if="fieldIssues.siteName" class="field-error">{{ fieldIssues.siteName }}</small>
        </label>

        <label class="field">
          <span>页脚标语</span>
          <textarea v-model="form.footerTagline" rows="5" placeholder="用于公开站页脚的简短说明文案。"></textarea>
          <small class="field-hint">显示在公开站主内容区下方的页脚位置。</small>
          <small v-if="fieldIssues.footerTagline" class="field-error">{{ fieldIssues.footerTagline }}</small>
        </label>

        <label class="field">
          <span>支持邮箱</span>
          <input v-model="form.supportEmail" type="email" placeholder="hello@example.com" />
          <small class="field-hint">如果填写，页脚会为访客与合作伙伴展示邮件链接。</small>
          <small v-if="fieldIssues.supportEmail" class="field-error">{{ fieldIssues.supportEmail }}</small>
        </label>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">当前输出</div>
          <div class="info-card">
            <span>品牌</span>
            <strong>{{ form.siteName }}</strong>
          </div>
          <div class="info-card">
            <span>支持邮箱</span>
            <strong>{{ form.supportEmail || "尚未配置支持邮箱" }}</strong>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">为什么需要它</div>
          <p>这些值存放在 API 层，站点因此可以在不重新部署前端的情况下更新运营文案。</p>
          <p>这个页面应只管理跨站稳定配置，而不是某次活动或营销专属内容。</p>
        </div>
      </aside>
    </div>
  </section>
</template>
