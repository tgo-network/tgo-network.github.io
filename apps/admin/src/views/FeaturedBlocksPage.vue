<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

import {
  featuredBlockStatusOptions,
  type AdminFeaturedBlockDetailPayload,
  type AdminFeaturedBlockReferences,
  type AdminFeaturedBlockUpsertInput
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatFeaturedBlockStatus } from "../lib/format";

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const references = ref<AdminFeaturedBlockReferences>({
  topics: [],
  articles: [],
  events: [],
  cities: []
});

const form = reactive<AdminFeaturedBlockUpsertInput>({
  status: "active",
  payload: {
    heroEyebrow: "",
    heroTitle: "",
    heroSummary: "",
    primaryActionLabel: "",
    primaryActionHref: "",
    secondaryActionLabel: "",
    secondaryActionHref: "",
    featuredTopicIds: [],
    featuredArticleIds: [],
    featuredEventIds: [],
    cityHighlightIds: [],
    applicationTitle: "",
    applicationSummary: "",
    applicationHref: ""
  }
});

const loadBlock = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminFetch<AdminFeaturedBlockDetailPayload>("/api/admin/v1/featured-blocks/homepage");
    references.value = payload.references;
    form.status = payload.block.status;
    form.payload.heroEyebrow = payload.block.payload.heroEyebrow;
    form.payload.heroTitle = payload.block.payload.heroTitle;
    form.payload.heroSummary = payload.block.payload.heroSummary;
    form.payload.primaryActionLabel = payload.block.payload.primaryActionLabel;
    form.payload.primaryActionHref = payload.block.payload.primaryActionHref;
    form.payload.secondaryActionLabel = payload.block.payload.secondaryActionLabel;
    form.payload.secondaryActionHref = payload.block.payload.secondaryActionHref;
    form.payload.featuredTopicIds = [...payload.block.payload.featuredTopicIds];
    form.payload.featuredArticleIds = [...payload.block.payload.featuredArticleIds];
    form.payload.featuredEventIds = [...payload.block.payload.featuredEventIds];
    form.payload.cityHighlightIds = [...payload.block.payload.cityHighlightIds];
    form.payload.applicationTitle = payload.block.payload.applicationTitle;
    form.payload.applicationSummary = payload.block.payload.applicationSummary;
    form.payload.applicationHref = payload.block.payload.applicationHref;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载首页推荐位配置。";
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
    const payload = await adminRequest<AdminFeaturedBlockDetailPayload>("/api/admin/v1/featured-blocks/homepage", {
      method: "PATCH",
      body: form
    });
    references.value = payload.references;
    successMessage.value = "首页推荐位配置已更新。";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "无法更新首页推荐位配置。";
  } finally {
    saving.value = false;
  }
};

const getIssue = (field: string) => computed(() => fieldIssues.value[field] ?? "");

const topicIssue = getIssue("payload.featuredTopicIds");
const articleIssue = getIssue("payload.featuredArticleIds");
const eventIssue = getIssue("payload.featuredEventIds");
const cityIssue = getIssue("payload.cityHighlightIds");

onMounted(() => {
  void loadBlock();
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <div>
        <h2>推荐位</h2>
        <p>管理首页头图与内容编排，决定公开站给用户的第一印象。</p>
      </div>

      <div class="page-actions">
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : "保存首页推荐位" }}
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
      <p>正在准备首页推荐位配置...</p>
    </div>

    <div v-else class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="field-grid">
          <label class="field">
            <span>状态</span>
            <select v-model="form.status">
              <option v-for="option in featuredBlockStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small class="field-hint">只有启用中的首页推荐位会覆盖公开首页的自动回退逻辑。</small>
            <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
          </label>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">头图区文案</div>
          <div class="field-grid">
            <label class="field">
              <span>眉标</span>
              <input v-model="form.payload.heroEyebrow" type="text" placeholder="第三阶段管理后台 MVP" />
              <small v-if="fieldIssues['payload.heroEyebrow']" class="field-error">{{ fieldIssues["payload.heroEyebrow"] }}</small>
            </label>

            <label class="field">
              <span>标题</span>
              <textarea v-model="form.payload.heroTitle" rows="3" placeholder="首页主标题"></textarea>
              <small v-if="fieldIssues['payload.heroTitle']" class="field-error">{{ fieldIssues["payload.heroTitle"] }}</small>
            </label>

            <label class="field">
              <span>摘要</span>
              <textarea v-model="form.payload.heroSummary" rows="5" placeholder="说明平台当前阶段的重点。"></textarea>
              <small v-if="fieldIssues['payload.heroSummary']" class="field-error">{{ fieldIssues["payload.heroSummary"] }}</small>
            </label>
          </div>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">头图区按钮</div>
          <div class="field-grid field-grid-2">
            <label class="field">
              <span>主按钮文案</span>
              <input v-model="form.payload.primaryActionLabel" type="text" placeholder="浏览文章" />
              <small v-if="fieldIssues['payload.primaryActionLabel']" class="field-error">{{ fieldIssues["payload.primaryActionLabel"] }}</small>
            </label>
            <label class="field">
              <span>主按钮链接</span>
              <input v-model="form.payload.primaryActionHref" type="text" placeholder="/articles" />
              <small v-if="fieldIssues['payload.primaryActionHref']" class="field-error">{{ fieldIssues["payload.primaryActionHref"] }}</small>
            </label>
            <label class="field">
              <span>次按钮文案</span>
              <input v-model="form.payload.secondaryActionLabel" type="text" placeholder="查看近期活动" />
              <small v-if="fieldIssues['payload.secondaryActionLabel']" class="field-error">{{ fieldIssues["payload.secondaryActionLabel"] }}</small>
            </label>
            <label class="field">
              <span>次按钮链接</span>
              <input v-model="form.payload.secondaryActionHref" type="text" placeholder="/events" />
              <small v-if="fieldIssues['payload.secondaryActionHref']" class="field-error">{{ fieldIssues["payload.secondaryActionHref"] }}</small>
            </label>
          </div>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="brand-tag">首页内容分组</div>
          <div class="field-grid field-grid-2">
            <label class="field">
              <span>精选主题</span>
              <select v-model="form.payload.featuredTopicIds" multiple size="6">
                <option v-for="option in references.topics" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
              <small class="field-hint">选择要出现在首页主题区块中的已发布主题。</small>
              <small v-if="topicIssue" class="field-error">{{ topicIssue }}</small>
            </label>

            <label class="field">
              <span>精选文章</span>
              <select v-model="form.payload.featuredArticleIds" multiple size="6">
                <option v-for="option in references.articles" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
              <small class="field-hint">请只选择已发布文章，以保证首页与公开内容保持一致。</small>
              <small v-if="articleIssue" class="field-error">{{ articleIssue }}</small>
            </label>

            <label class="field">
              <span>近期活动</span>
              <select v-model="form.payload.featuredEventIds" multiple size="6">
                <option v-for="option in references.events" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
              <small class="field-hint">这些内容会填充首页的活动区块。</small>
              <small v-if="eventIssue" class="field-error">{{ eventIssue }}</small>
            </label>

            <label class="field">
              <span>城市亮点</span>
              <select v-model="form.payload.cityHighlightIds" multiple size="6">
                <option v-for="option in references.cities" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
              <small class="field-hint">配置首页底部展示的城市卡片。</small>
              <small v-if="cityIssue" class="field-error">{{ cityIssue }}</small>
            </label>
          </div>
        </div>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">申请引导区</div>
          <label class="field">
            <span>标题</span>
            <input v-model="form.payload.applicationTitle" type="text" placeholder="准备迎接下一批运营伙伴" />
            <small v-if="fieldIssues['payload.applicationTitle']" class="field-error">{{ fieldIssues["payload.applicationTitle"] }}</small>
          </label>

          <label class="field">
            <span>摘要</span>
            <textarea v-model="form.payload.applicationSummary" rows="6" placeholder="引导访客进入下一步转化路径。"></textarea>
            <small v-if="fieldIssues['payload.applicationSummary']" class="field-error">{{ fieldIssues["payload.applicationSummary"] }}</small>
          </label>

          <label class="field">
            <span>链接</span>
            <input v-model="form.payload.applicationHref" type="text" placeholder="/apply" />
            <small v-if="fieldIssues['payload.applicationHref']" class="field-error">{{ fieldIssues["payload.applicationHref"] }}</small>
          </label>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">选择数量</div>
          <div class="info-row">
            <span>主题</span>
            <strong>{{ form.payload.featuredTopicIds.length }}</strong>
          </div>
          <div class="info-row">
            <span>文章</span>
            <strong>{{ form.payload.featuredArticleIds.length }}</strong>
          </div>
          <div class="info-row">
            <span>活动</span>
            <strong>{{ form.payload.featuredEventIds.length }}</strong>
          </div>
          <div class="info-row">
            <span>城市</span>
            <strong>{{ form.payload.cityHighlightIds.length }}</strong>
          </div>
          <div class="info-row">
            <span>首页状态</span>
            <strong class="status-pill">{{ formatFeaturedBlockStatus(form.status) }}</strong>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">工作方式</div>
          <p>当这个推荐位启用后，公开首页会优先使用这里配置的顺序，而不是自动回退切片。</p>
          <p>所有选择都会在保存前校验是否仍然对应已发布内容。</p>
        </div>
      </aside>
    </div>
  </section>
</template>
