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
import { slugify } from "../lib/format";

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
    boardMembers: payload.branch.boardMembers.length > 0
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

  if (selected && item.displayName.length === 0) {
    item.displayName = selected.label;
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
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>分会承担前台的分会董事会展示、活动归属与成员归属，是当前版本的重要组织节点。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/members/branches">返回分会列表</RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : isNew ? "创建分会" : "保存修改" }}
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
      <p>正在准备分会编辑器...</p>
    </div>

    <div v-else class="editor-grid">
      <div class="panel editor-main stacked-gap">
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

        <div class="field-grid field-grid-3">
          <label class="field">
            <span>城市</span>
            <input v-model="form.cityName" type="text" placeholder="上海" />
            <small v-if="fieldIssues.cityName" class="field-error">{{ fieldIssues.cityName }}</small>
          </label>

          <label class="field">
            <span>区域</span>
            <input v-model="form.region" type="text" placeholder="华东" />
          </label>

          <label class="field">
            <span>状态</span>
            <select v-model="form.status">
              <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <label class="field">
          <span>简介</span>
          <textarea v-model="form.summary" rows="4" placeholder="用于前台列表展示的分会简介。" />
        </label>

        <label class="field">
          <span>正文</span>
          <textarea v-model="form.body" rows="10" placeholder="介绍分会定位、活动形式和本地特色。" />
        </label>

        <div class="field-grid field-grid-3">
          <label class="field">
            <span>排序</span>
            <input v-model.number="form.sortOrder" type="number" min="0" />
          </label>

          <label class="field">
            <span>SEO 标题</span>
            <input v-model="form.seoTitle" type="text" />
          </label>

          <label class="field">
            <span>SEO 描述</span>
            <textarea v-model="form.seoDescription" rows="4" />
          </label>
        </div>

        <div class="panel inset-panel stacked-gap">
          <div class="page-header-row compact-row">
            <div>
              <div class="brand-tag">董事会成员</div>
              <p class="section-copy">可绑定现有成员，也可直接填写展示信息。</p>
            </div>
            <button class="button-link button-compact" type="button" @click="addBoardMember">添加成员</button>
          </div>

          <div v-for="(item, index) in form.boardMembers" :key="`${index}-${item.memberId ?? 'manual'}`" class="panel stacked-gap">
            <div class="page-header-row compact-row">
              <strong>董事会成员 {{ index + 1 }}</strong>
              <button class="button-link button-danger button-compact" type="button" @click="removeBoardMember(index)">移除</button>
            </div>

            <div class="field-grid field-grid-2">
              <label class="field">
                <span>关联成员</span>
                <select v-model="item.memberId" @change="onMemberPick(item)">
                  <option :value="null">不关联现有成员</option>
                  <option v-for="option in memberOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                </select>
              </label>

              <label class="field">
                <span>状态</span>
                <select v-model="item.status">
                  <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
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
                <span>职务</span>
                <input v-model="item.title" type="text" />
              </label>
            </div>

            <label class="field">
              <span>简介</span>
              <textarea v-model="item.bio" rows="4" />
            </label>
          </div>
        </div>
      </div>

      <aside class="editor-side stacked-gap">
        <CoverAssetField
          v-model="form.coverAssetId"
          :assets="assets"
          label="分会封面"
          help="选择公开图片资源作为分会卡片封面。"
          :error="fieldIssues.coverAssetId"
        />

        <div class="panel stacked-gap">
          <div class="brand-tag">当前概况</div>
          <div class="info-row">
            <span>城市</span>
            <strong>{{ form.cityName || "未填写" }}</strong>
          </div>
          <div class="info-row">
            <span>状态</span>
            <strong>{{ form.status }}</strong>
          </div>
          <div class="info-row">
            <span>董事会人数</span>
            <strong>{{ form.boardMembers.length }}</strong>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
