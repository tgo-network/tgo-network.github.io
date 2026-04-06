<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import {
  contentStatusOptions,
  type AdminAssetListItem,
  type AdminBoardMemberUpsertInput,
  type AdminBranchDetailPayload,
  type AdminBranchRecord,
  type AdminBranchUpsertInput,
  type AdminMemberListItem
} from "@tgo/shared";

import CoverAssetField from "../components/CoverAssetField.vue";
import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatContentStatus, formatDateTime, slugify } from "../lib/format";

interface BoardMemberFormItem extends AdminBoardMemberUpsertInput {}

interface BranchFormState extends Omit<AdminBranchUpsertInput, "boardMembers"> {
  boardMembers: BoardMemberFormItem[];
}

const route = useRoute();
const router = useRouter();

const createBoardMember = (sortOrder = 0): BoardMemberFormItem => ({
  memberId: null,
  displayName: "",
  company: "",
  title: "",
  bio: "",
  avatarAssetId: null,
  sortOrder,
  status: "published"
});

const createBlankForm = (): BranchFormState => ({
  slug: "",
  name: "",
  cityName: "",
  region: "",
  summary: "",
  body: "",
  coverAssetId: null,
  seoTitle: "",
  seoDescription: "",
  sortOrder: 0,
  status: "draft",
  boardMembers: [createBoardMember()]
});

const contentStatusDescriptions: Record<(typeof contentStatusOptions)[number]["value"], string> = {
  draft: "继续准备分会资料，前台暂不公开。",
  in_review: "进入校对审核阶段，等待最终确认。",
  scheduled: "内容准备就绪，适合按计划定时上线。",
  published: "会进入前台分会与董事会展示路径。",
  archived: "分会从公开站下线，但后台资料仍保留。"
};

const form = reactive<BranchFormState>(createBlankForm());
const branch = ref<AdminBranchRecord | null>(null);
const memberOptions = ref<Array<{ id: string; label: string; description?: string | null }>>([]);
const assets = ref<AdminAssetListItem[]>([]);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const slugTouched = ref(false);

const branchId = computed(() => (typeof route.params.id === "string" ? route.params.id : ""));
const isNew = computed(() => branchId.value.length === 0);
const pageTitle = computed(() => (isNew.value ? "新增分会" : `编辑分会：${branch.value?.name ?? "加载中..."}`));
const previewHref = computed(() => (form.slug.trim().length > 0 ? `/branches#${form.slug.trim()}` : "/branches"));
const selectableAvatarAssets = computed(() =>
  assets.value.filter((asset) => asset.status === "active" && asset.visibility === "public" && asset.mimeType.startsWith("image/"))
);
const cityRegionSummary = computed(() => [form.cityName.trim() || "待补充城市", form.region.trim()].filter((value) => value.length > 0).join(" · "));
const branchBodyParagraphs = computed(() =>
  form.body
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
);
const boardMembersReady = computed(() =>
  form.boardMembers.filter((item) => {
    return Boolean(item.memberId) || [item.displayName, item.company, item.title, item.bio].some((value) => value.trim().length > 0);
  })
);
const seoTitlePreview = computed(() => form.seoTitle.trim() || form.name.trim() || "将回退为分会名称");
const seoDescriptionPreview = computed(() => form.seoDescription.trim() || form.summary.trim() || "将回退为分会简介");

const loadMemberOptions = async () => {
  const members = await adminFetch<AdminMemberListItem[]>("/api/admin/v1/members");
  memberOptions.value = members.map((member) => ({
    id: member.id,
    label: member.name,
    description: `${member.company} · ${member.title}`
  }));
};

const applyPayload = (payload: AdminBranchDetailPayload) => {
  branch.value = payload.branch;
  memberOptions.value = payload.references.members;
  Object.assign(form, {
    slug: payload.branch.slug,
    name: payload.branch.name,
    cityName: payload.branch.cityName,
    region: payload.branch.region,
    summary: payload.branch.summary,
    body: payload.branch.body,
    coverAssetId: payload.branch.coverAssetId,
    seoTitle: payload.branch.seoTitle,
    seoDescription: payload.branch.seoDescription,
    sortOrder: payload.branch.sortOrder,
    status: payload.branch.status,
    boardMembers:
      payload.branch.boardMembers.length > 0
        ? payload.branch.boardMembers.map((member) => ({ ...member }))
        : [createBoardMember()]
  });
  slugTouched.value = true;
};

const loadBranch = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    assets.value = await adminFetch<AdminAssetListItem[]>("/api/admin/v1/assets");

    if (isNew.value) {
      branch.value = null;
      await loadMemberOptions();
      Object.assign(form, createBlankForm());
      slugTouched.value = false;
      return;
    }

    const payload = await adminFetch<AdminBranchDetailPayload>(`/api/admin/v1/branches/${branchId.value}`);
    applyPayload(payload);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载分会详情。";
  } finally {
    loading.value = false;
  }
};

const onNameInput = () => {
  if (!slugTouched.value) {
    form.slug = slugify(form.name);
  }
};

const onSlugInput = () => {
  slugTouched.value = true;
};

const addBoardMember = () => {
  form.boardMembers = [...form.boardMembers, createBoardMember(form.boardMembers.length)];
};

const removeBoardMember = (index: number) => {
  if (form.boardMembers.length === 1) {
    form.boardMembers = [createBoardMember()];
    return;
  }

  form.boardMembers = form.boardMembers.filter((_, itemIndex) => itemIndex !== index);
};

const onMemberPick = (item: BoardMemberFormItem) => {
  const selected = memberOptions.value.find((option) => option.id === item.memberId);

  if (!selected) {
    return;
  }

  if (item.displayName.trim().length === 0) {
    item.displayName = selected.label;
  }

  const [company, title] = (selected.description ?? "")
    .split("·")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (company && item.company.trim().length === 0) {
    item.company = company;
  }

  if (title && item.title.trim().length === 0) {
    item.title = title;
  }
};

const toPayload = (): AdminBranchUpsertInput => ({
  ...form,
  boardMembers: form.boardMembers.map((member, index): AdminBoardMemberUpsertInput => ({
    ...member,
    sortOrder: member.sortOrder ?? index
  }))
});

const save = async () => {
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminRequest<AdminBranchDetailPayload>(
      isNew.value ? "/api/admin/v1/branches" : `/api/admin/v1/branches/${branchId.value}`,
      {
        method: isNew.value ? "POST" : "PATCH",
        body: toPayload()
      }
    );

    applyPayload(payload);
    successMessage.value = isNew.value ? "分会已创建。" : "分会已保存。";

    if (isNew.value) {
      await router.replace({
        name: "branch-edit",
        params: {
          id: payload.branch.id
        }
      });
    }
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "无法保存分会。";
  } finally {
    saving.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    void loadBranch();
  }
);

onMounted(async () => {
  await loadBranch();
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <h2>{{ pageTitle }}</h2>

      <div class="page-actions page-actions-compact">
        <RouterLink class="button-link" to="/members/branches">返回分会列表</RouterLink>
        <a class="button-link" :href="previewHref" target="_blank" rel="noreferrer">预览前台</a>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : isNew ? "创建分会" : "保存修改" }}
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
      <p>正在准备分会编辑器...</p>
    </div>

    <template v-else>
      <div class="editor-grid editor-grid-focus">
        <div class="panel panel-compact editor-main stacked-gap">
          <section class="editor-section editor-section-compact stacked-gap">
            <div class="editor-section-head">
              <h3>基本信息</h3>
            </div>

            <div class="field-grid field-grid-2">
              <label class="field">
                <span>分会名称</span>
                <input v-model="form.name" type="text" placeholder="上海分会" @input="onNameInput" />
                <small v-if="fieldIssues.name" class="field-error">{{ fieldIssues.name }}</small>
              </label>

              <label class="field">
                <span>URL 标识</span>
                <input v-model="form.slug" type="text" placeholder="shanghai" @input="onSlugInput" />
                <small v-if="fieldIssues.slug" class="field-error">{{ fieldIssues.slug }}</small>
              </label>
            </div>

            <div class="field-grid field-grid-2">
              <label class="field">
                <span>城市</span>
                <input v-model="form.cityName" type="text" placeholder="上海" />
                <small v-if="fieldIssues.cityName" class="field-error">{{ fieldIssues.cityName }}</small>
              </label>

              <label class="field">
                <span>区域</span>
                <input v-model="form.region" type="text" placeholder="华东" />
              </label>
            </div>

            <label class="field">
              <span>状态</span>
              <select v-model="form.status">
                <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <small class="field-hint">{{ contentStatusDescriptions[form.status] }}</small>
            </label>
          </section>

          <section class="editor-section editor-section-compact stacked-gap">
            <div class="editor-section-head">
              <h3>简介与正文</h3>
            </div>

            <label class="field">
              <span>简介</span>
              <textarea v-model="form.summary" rows="4" placeholder="用于前台列表展示的分会简介。" />
            </label>

            <label class="field">
              <span>正文</span>
              <textarea v-model="form.body" rows="10" placeholder="介绍分会定位、活动形式和本地特色。" />
            </label>
          </section>

          <section class="editor-section editor-section-compact stacked-gap">
            <div class="editor-section-head">
              <h3>排序与 SEO</h3>
            </div>

            <div class="field-grid field-grid-2">
              <label class="field">
                <span>排序</span>
                <input v-model.number="form.sortOrder" type="number" min="0" />
              </label>

              <label class="field">
                <span>SEO 标题</span>
                <input v-model="form.seoTitle" type="text" placeholder="可选，不填则回退分会名称。" />
              </label>
            </div>

            <label class="field">
              <span>SEO 描述</span>
              <textarea v-model="form.seoDescription" rows="4" placeholder="可选，不填则回退分会简介。" />
            </label>
          </section>

          <section class="editor-section editor-section-compact stacked-gap">
            <div class="page-header-row compact-row">
              <div class="editor-section-head">
                <h3>董事会成员</h3>
              </div>
              <button class="button-link button-compact" type="button" @click="addBoardMember">添加成员</button>
            </div>

            <div v-for="(item, index) in form.boardMembers" :key="`${index}-${item.memberId ?? 'manual'}`" class="panel panel-compact stacked-gap">
              <div class="page-header-row compact-row">
                <strong>成员 {{ index + 1 }}</strong>
                <button class="button-link button-danger button-compact" type="button" @click="removeBoardMember(index)">移除</button>
              </div>

              <div class="field-grid field-grid-2">
                <label class="field">
                  <span>关联成员</span>
                  <select v-model="item.memberId" @change="onMemberPick(item)">
                    <option :value="null">不关联现有成员</option>
                    <option v-for="option in memberOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                  </select>
                  <small class="field-hint">{{ memberOptions.find((option) => option.id === item.memberId)?.description ?? "可选" }}</small>
                </label>

                <label class="field">
                  <span>头像资源</span>
                  <select v-model="item.avatarAssetId">
                    <option :value="null">暂不单独设置头像</option>
                    <option v-for="asset in selectableAvatarAssets" :key="asset.id" :value="asset.id">{{ asset.originalFilename }}</option>
                  </select>
                </label>
              </div>

              <div class="field-grid field-grid-3">
                <label class="field">
                  <span>显示姓名</span>
                  <input v-model="item.displayName" type="text" />
                </label>
                <label class="field">
                  <span>公司</span>
                  <input v-model="item.company" type="text" />
                </label>
                <label class="field">
                  <span>组织身份</span>
                  <input v-model="item.title" type="text" />
                </label>
              </div>

              <div class="field-grid field-grid-3">
                <label class="field">
                  <span>状态</span>
                  <select v-model="item.status">
                    <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>

                <label class="field">
                  <span>排序</span>
                  <input v-model.number="item.sortOrder" type="number" min="0" />
                </label>

                <div class="info-card">
                  <span>前台显示</span>
                  <strong>{{ item.displayName || "待补充姓名" }}</strong>
                  <p>{{ item.company || "待补充公司" }} · {{ item.title || "待补充组织身份" }}</p>
                </div>
              </div>

              <label class="field">
                <span>简介</span>
                <textarea v-model="item.bio" rows="3" />
              </label>
            </div>
          </section>
        </div>

        <aside class="editor-side stacked-gap">
          <CoverAssetField
            v-model="form.coverAssetId"
            :assets="assets"
            label="分会封面"
            help="选择公开图片资源作为分会卡片封面。"
            :error="fieldIssues.coverAssetId"
          />

          <div class="panel panel-compact summary-panel stacked-gap-tight">
            <h3>当前状态</h3>

            <div class="summary-list">
              <div class="summary-row">
                <span>当前状态</span>
                <strong class="status-pill">{{ formatContentStatus(branch?.status ?? form.status) }}</strong>
              </div>
              <div class="summary-row">
                <span>公开路径</span>
                <strong>{{ previewHref }}</strong>
              </div>
              <div class="summary-row">
                <span>城市 / 区域</span>
                <strong>{{ cityRegionSummary }}</strong>
              </div>
              <div class="summary-row">
                <span>董事会人数</span>
                <strong>{{ boardMembersReady.length }}</strong>
              </div>
              <div class="summary-row">
                <span>最近更新</span>
                <strong>{{ formatDateTime(branch?.updatedAt) }}</strong>
              </div>
            </div>
          </div>

          <div class="panel panel-compact summary-panel stacked-gap-tight">
            <h3>内容概览</h3>

            <div class="summary-list">
              <div class="summary-row">
                <span>简介</span>
                <strong>{{ form.summary.trim().length > 0 ? "已填写" : "待补充" }}</strong>
              </div>
              <div class="summary-row">
                <span>正文段落</span>
                <strong>{{ branchBodyParagraphs.length > 0 ? `${branchBodyParagraphs.length} 段` : "待补充" }}</strong>
              </div>
              <div class="summary-row">
                <span>SEO 标题</span>
                <strong>{{ seoTitlePreview }}</strong>
              </div>
              <div class="summary-row">
                <span>SEO 描述</span>
                <strong>{{ seoDescriptionPreview }}</strong>
              </div>
              <div class="summary-row">
                <span>发布时间</span>
                <strong>{{ formatDateTime(branch?.publishedAt) }}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>
