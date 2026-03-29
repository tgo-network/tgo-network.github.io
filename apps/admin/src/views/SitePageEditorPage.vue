<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import {
  contentStatusOptions,
  type AdminSitePageDetailPayloadV2,
  type AdminSitePageRecordV2,
  type AdminSitePageUpsertInputV2
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatDateTime } from "../lib/format";

const route = useRoute();

const page = ref<AdminSitePageRecordV2 | null>(null);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const form = reactive<AdminSitePageUpsertInputV2>({
  title: "",
  summary: "",
  body: "",
  seoTitle: "",
  seoDescription: "",
  status: "draft"
});

const pageSlug = computed(() => {
  const slug = typeof route.params.slug === "string" ? route.params.slug : "join";
  return slug === "about" ? "about" : "join";
});

const pageLabelMap = {
  join: "加入页",
  about: "关于页"
} as const;

const pageLabel = computed(() => pageLabelMap[pageSlug.value]);
const pageHint = computed(() =>
  pageSlug.value === "join"
    ? "用于前台加入说明页，和申请表页一起构成非成员转化路径。"
    : "用于前台关于我们页，说明组织形式、活动方式与加入方式。"
);

const previewHref = computed(() => (pageSlug.value === "join" ? "/join" : "/about"));

const applyPayload = (payload: AdminSitePageDetailPayloadV2) => {
  page.value = payload.page;
  form.title = payload.page.title;
  form.summary = payload.page.summary;
  form.body = payload.page.body;
  form.seoTitle = payload.page.seoTitle;
  form.seoDescription = payload.page.seoDescription;
  form.status = payload.page.status;
};

const loadPage = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminFetch<AdminSitePageDetailPayloadV2>(`/api/admin/v1/pages/${pageSlug.value}`);
    applyPayload(payload);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : `无法加载${pageLabel.value}。`;
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
    const payload = await adminRequest<AdminSitePageDetailPayloadV2>(`/api/admin/v1/pages/${pageSlug.value}`, {
      method: "PATCH",
      body: form
    });

    applyPayload(payload);
    successMessage.value = `${pageLabel.value}已保存。`;
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : `无法保存${pageLabel.value}。`;
  } finally {
    saving.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    void loadPage();
  }
);

onMounted(() => {
  void loadPage();
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ pageLabel }}</h2>
        <p>{{ pageHint }}</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/site/homepage">首页配置</RouterLink>
        <RouterLink class="button-link" :to="pageSlug === 'join' ? '/site/pages/about' : '/site/pages/join'">
          {{ pageSlug === "join" ? "切换到关于页" : "切换到加入页" }}
        </RouterLink>
        <a class="button-link" :href="previewHref" target="_blank" rel="noreferrer">预览前台</a>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : `保存${pageLabel}` }}
        </button>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger stacked-gap">
      <div class="brand-tag">操作错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel panel-success stacked-gap">
      <div class="brand-tag">已保存</div>
      <p>{{ successMessage }}</p>
    </div>

    <div v-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在准备{{ pageLabel }}...</p>
    </div>

    <div v-else class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="field-grid field-grid-2">
          <label class="field">
            <span>页面标题</span>
            <input v-model="form.title" type="text" placeholder="页面主标题" />
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
          <span>摘要</span>
          <textarea v-model="form.summary" rows="4" placeholder="用于前台首屏摘要与 SEO 回退。" />
        </label>

        <label class="field">
          <span>正文</span>
          <textarea
            v-model="form.body"
            rows="16"
            placeholder="可按段落书写，建议每段之间空一行。公开前台会根据空行拆分展示。"
          />
          <small v-if="fieldIssues.body" class="field-error">{{ fieldIssues.body }}</small>
        </label>

        <div class="field-grid field-grid-2">
          <label class="field">
            <span>SEO 标题</span>
            <input v-model="form.seoTitle" type="text" placeholder="可选，不填则回退页面标题。" />
          </label>

          <label class="field">
            <span>SEO 描述</span>
            <textarea v-model="form.seoDescription" rows="4" placeholder="可选，不填则回退摘要。" />
          </label>
        </div>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">当前概况</div>
          <div class="info-row">
            <span>页面</span>
            <strong>{{ pageLabel }}</strong>
          </div>
          <div class="info-row">
            <span>状态</span>
            <strong>{{ form.status }}</strong>
          </div>
          <div class="info-row">
            <span>正文段落</span>
            <strong>{{ form.body.split(/\n{2,}/).filter((item) => item.trim().length > 0).length }}</strong>
          </div>
          <div class="info-row">
            <span>最近更新</span>
            <strong>{{ formatDateTime(page?.updatedAt) }}</strong>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">编辑提示</div>
          <p v-if="pageSlug === 'join'">加入页正文建议依次写入加入条件、成员权益和加入流程，每段之间使用空行分隔。</p>
          <p v-else>关于页正文建议围绕组织形式、活动方式和加入方式展开，以便前台自动拆分为可读段落。</p>
        </div>
      </aside>
    </div>
  </section>
</template>
