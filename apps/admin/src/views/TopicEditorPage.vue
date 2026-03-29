<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import {
  contentStatusOptions,
  type AdminAssetListItem,
  type AdminTopicDetailPayload,
  type AdminTopicRecord,
  type AdminTopicUpsertInput
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import CoverAssetField from "../components/CoverAssetField.vue";
import { formatContentStatus, formatDateTime, slugify } from "../lib/format";

const route = useRoute();
const router = useRouter();

const createBlankForm = (): AdminTopicUpsertInput => ({
  slug: "",
  title: "",
  summary: "",
  body: "",
  coverAssetId: null,
  seoTitle: "",
  seoDescription: "",
  status: "draft"
});

const form = reactive<AdminTopicUpsertInput>(createBlankForm());
const topic = ref<AdminTopicRecord | null>(null);
const coverAssets = ref<AdminAssetListItem[]>([]);
const loading = ref(true);
const saving = ref(false);
const actioning = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const slugTouched = ref(false);

const topicId = computed(() => (typeof route.params.id === "string" ? route.params.id : ""));
const isNew = computed(() => topicId.value.length === 0);
const pageTitle = computed(() => (isNew.value ? "新建主题" : `编辑主题：${topic.value?.title ?? "加载中..."}`));

const resetFeedback = () => {
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};
};

const applyTopic = (nextTopic: AdminTopicRecord) => {
  topic.value = nextTopic;
  Object.assign(form, {
    slug: nextTopic.slug,
    title: nextTopic.title,
    summary: nextTopic.summary,
    body: nextTopic.body,
    coverAssetId: nextTopic.coverAssetId,
    seoTitle: nextTopic.seoTitle,
    seoDescription: nextTopic.seoDescription,
    status: nextTopic.status
  });
  slugTouched.value = true;
};

const loadTopic = async () => {
  resetFeedback();
  loading.value = true;

  try {
    const nextAssets = await adminFetch<AdminAssetListItem[]>("/api/admin/v1/assets");
    coverAssets.value = nextAssets;

    if (isNew.value) {
      topic.value = null;
      slugTouched.value = false;
      Object.assign(form, createBlankForm());
      return;
    }

    const payload = await adminFetch<AdminTopicDetailPayload>(`/api/admin/v1/topics/${topicId.value}`);
    applyTopic(payload.topic);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载主题详情。";
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

const save = async () => {
  resetFeedback();
  saving.value = true;

  try {
    const payload = await adminRequest<AdminTopicDetailPayload>(
      isNew.value ? "/api/admin/v1/topics" : `/api/admin/v1/topics/${topicId.value}`,
      {
        method: isNew.value ? "POST" : "PATCH",
        body: form
      }
    );

    applyTopic(payload.topic);
    successMessage.value = isNew.value ? "主题已创建。" : "主题已保存。";

    if (isNew.value) {
      await router.replace({
        name: "topic-edit",
        params: {
          id: payload.topic.id
        }
      });
    }
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "无法保存主题。";
  } finally {
    saving.value = false;
  }
};

const runAction = async (action: "publish" | "archive") => {
  if (!topic.value) {
    return;
  }

  resetFeedback();
  actioning.value = true;

  try {
    const payload = await adminRequest<AdminTopicDetailPayload>(`/api/admin/v1/topics/${topic.value.id}/${action}`, {
      method: "POST"
    });

    applyTopic(payload.topic);
    successMessage.value = action === "publish" ? "主题已发布。" : "主题已归档。";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : `无法执行主题${action === "publish" ? "发布" : "归档"}操作。`;
  } finally {
    actioning.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    loading.value = true;
    void loadTopic();
  }
);

onMounted(() => {
  void loadTopic();
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>
          无需离开管理后台，即可起草、打磨并发布主题落地页。
        </p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/topics">
          返回主题列表
        </RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : isNew ? "创建主题" : "保存修改" }}
        </button>
        <button
          class="button-link button-subtle"
          type="button"
          :disabled="!topic || actioning"
          @click="runAction('publish')"
        >
          {{ actioning ? "处理中..." : "发布" }}
        </button>
        <button
          class="button-link button-danger"
          type="button"
          :disabled="!topic || actioning"
          @click="runAction('archive')"
        >
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
      <p>正在准备主题编辑器...</p>
    </div>

    <div v-else class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="field-grid field-grid-2">
          <label class="field">
            <span>标题</span>
            <input v-model="form.title" type="text" placeholder="平台架构" @input="onTitleInput" />
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
          <input v-model="form.slug" type="text" placeholder="platform-architecture" @input="onSlugInput" />
          <small v-if="fieldIssues.slug" class="field-error">{{ fieldIssues.slug }}</small>
        </label>

        <label class="field">
          <span>摘要</span>
          <textarea v-model="form.summary" rows="4" placeholder="用于列表展示与 SEO 回退的简短主题摘要。" />
          <small v-if="fieldIssues.summary" class="field-error">{{ fieldIssues.summary }}</small>
        </label>

        <label class="field">
          <span>正文</span>
          <textarea v-model="form.body" rows="12" placeholder="主题页叙事内容与编辑视角。" />
          <small v-if="fieldIssues.body" class="field-error">{{ fieldIssues.body }}</small>
        </label>
      </div>

      <aside class="editor-side stacked-gap">
        <CoverAssetField
          v-model="form.coverAssetId"
          :assets="coverAssets"
          :error="fieldIssues.coverAssetId"
          label="封面资源"
        />

        <div class="panel stacked-gap">
          <div class="brand-tag">SEO</div>
          <label class="field">
            <span>SEO 标题</span>
            <input v-model="form.seoTitle" type="text" placeholder="平台架构 | TGO Network" />
            <small v-if="fieldIssues.seoTitle" class="field-error">{{ fieldIssues.seoTitle }}</small>
          </label>
          <label class="field">
            <span>SEO 描述</span>
            <textarea v-model="form.seoDescription" rows="4" placeholder="搜索与社交分享摘要。" />
            <small v-if="fieldIssues.seoDescription" class="field-error">{{ fieldIssues.seoDescription }}</small>
          </label>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">工作流</div>
          <div class="info-row">
            <span>当前状态</span>
            <strong class="status-pill">{{ formatContentStatus(topic?.status ?? form.status) }}</strong>
          </div>
          <div class="info-row">
            <span>更新时间</span>
            <strong>{{ formatDateTime(topic?.updatedAt) }}</strong>
          </div>
          <div class="info-row">
            <span>发布时间</span>
            <strong>{{ formatDateTime(topic?.publishedAt) }}</strong>
          </div>
          <p>
            主题在发布到公开站之前，至少需要填写标题、URL 标识与摘要。
          </p>
        </div>
      </aside>
    </div>
  </section>
</template>
