<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import type {
  AdminAssetListItem,
  AdminBranchListItem,
  AdminMemberDetailPayload,
  AdminMemberRecord,
  AdminMemberUpsertInput
} from "@tgo/shared";

import CoverAssetField from "../components/CoverAssetField.vue";
import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { slugify, toDateTimeInputValue } from "../lib/format";

interface MemberFormState extends Omit<AdminMemberUpsertInput, "joinedAt"> {
  joinedAt: string;
}

const route = useRoute();
const router = useRouter();

const createBlankForm = (): MemberFormState => ({
  slug: "",
  name: "",
  company: "",
  title: "",
  bio: "",
  joinedAt: "",
  branchId: null,
  avatarAssetId: null,
  featured: false,
  membershipStatus: "active",
  visibility: "public",
  sortOrder: 0,
  seoTitle: "",
  seoDescription: ""
});

const form = reactive<MemberFormState>(createBlankForm());
const member = ref<AdminMemberRecord | null>(null);
const branchOptions = ref<Array<{ id: string; label: string; description?: string | null }>>([]);
const assets = ref<AdminAssetListItem[]>([]);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const slugTouched = ref(false);

const memberId = computed(() => (typeof route.params.id === "string" ? route.params.id : ""));
const isNew = computed(() => memberId.value.length === 0);
const pageTitle = computed(() => (isNew.value ? "新增成员" : `编辑成员：${member.value?.name ?? "加载中..."}`));

const loadBranchOptions = async () => {
  const branches = await adminFetch<AdminBranchListItem[]>("/api/admin/v1/branches");
  branchOptions.value = branches.map((branch) => ({
    id: branch.id,
    label: branch.name,
    description: branch.cityName
  }));
};

const applyPayload = (payload: AdminMemberDetailPayload) => {
  member.value = payload.member;
  branchOptions.value = payload.references.branches;
  Object.assign(form, {
    slug: payload.member.slug,
    name: payload.member.name,
    company: payload.member.company,
    title: payload.member.title,
    bio: payload.member.bio,
    joinedAt: toDateTimeInputValue(payload.member.joinedAt),
    branchId: payload.member.branchId,
    avatarAssetId: payload.member.avatarAssetId,
    featured: payload.member.featured,
    membershipStatus: payload.member.membershipStatus,
    visibility: payload.member.visibility,
    sortOrder: payload.member.sortOrder,
    seoTitle: payload.member.seoTitle,
    seoDescription: payload.member.seoDescription
  });
  slugTouched.value = true;
};

const loadMember = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const nextAssets = await adminFetch<AdminAssetListItem[]>("/api/admin/v1/assets");
    assets.value = nextAssets;

    if (isNew.value) {
      member.value = null;
      await loadBranchOptions();
      Object.assign(form, createBlankForm());
      slugTouched.value = false;
      return;
    }

    const payload = await adminFetch<AdminMemberDetailPayload>(`/api/admin/v1/members/${memberId.value}`);
    applyPayload(payload);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载成员详情。";
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

const toPayload = (): AdminMemberUpsertInput => ({
  ...form,
  joinedAt: form.joinedAt || null
});

const save = async () => {
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const payload = await adminRequest<AdminMemberDetailPayload>(
      isNew.value ? "/api/admin/v1/members" : `/api/admin/v1/members/${memberId.value}`,
      {
        method: isNew.value ? "POST" : "PATCH",
        body: toPayload()
      }
    );

    applyPayload(payload);
    successMessage.value = isNew.value ? "成员已创建。" : "成员已保存。";

    if (isNew.value) {
      await router.replace({
        name: "member-edit",
        params: {
          id: payload.member.id
        }
      });
    }
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "无法保存成员。";
  } finally {
    saving.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    void loadMember();
  }
);

onMounted(async () => {
  await loadMember();
});
</script>

<template>
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>成员用于前台公开展示，不等同于工作人员账号，也不需要当前阶段的登录认证。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/members">返回成员列表</RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : isNew ? "创建成员" : "保存修改" }}
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
      <p>正在准备成员编辑器...</p>
    </div>

    <div v-else class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="field-grid field-grid-2">
          <label class="field">
            <span>姓名</span>
            <input v-model="form.name" type="text" placeholder="周扬" @input="onNameInput" />
            <small v-if="fieldIssues.name" class="field-error">{{ fieldIssues.name }}</small>
          </label>

          <label class="field">
            <span>URL 标识</span>
            <input v-model="form.slug" type="text" placeholder="zhou-yang" @input="onSlugInput" />
            <small v-if="fieldIssues.slug" class="field-error">{{ fieldIssues.slug }}</small>
          </label>
        </div>

        <div class="field-grid field-grid-2">
          <label class="field">
            <span>公司</span>
            <input v-model="form.company" type="text" placeholder="海岸智能" />
          </label>

          <label class="field">
            <span>职称</span>
            <input v-model="form.title" type="text" placeholder="CTO" />
          </label>
        </div>

        <div class="field-grid field-grid-3">
          <label class="field">
            <span>所属分会</span>
            <select v-model="form.branchId">
              <option :value="null">暂不分配</option>
              <option v-for="option in branchOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>成员状态</span>
            <select v-model="form.membershipStatus">
              <option value="active">有效成员</option>
              <option value="alumni">校友成员</option>
              <option value="paused">暂停展示</option>
            </select>
          </label>

          <label class="field">
            <span>可见性</span>
            <select v-model="form.visibility">
              <option value="public">公开</option>
              <option value="private">私有</option>
            </select>
          </label>
        </div>

        <div class="field-grid field-grid-3">
          <label class="field">
            <span>加入时间</span>
            <input v-model="form.joinedAt" type="datetime-local" />
            <small v-if="fieldIssues.joinedAt" class="field-error">{{ fieldIssues.joinedAt }}</small>
          </label>

          <label class="field">
            <span>排序</span>
            <input v-model.number="form.sortOrder" type="number" min="0" />
          </label>

          <label class="field checkbox-field">
            <span>首页推荐</span>
            <input v-model="form.featured" type="checkbox" />
          </label>
        </div>

        <label class="field">
          <span>个人简介</span>
          <textarea v-model="form.bio" rows="8" placeholder="用于成员详情页展示的个人简介。" />
        </label>

        <div class="field-grid field-grid-2">
          <label class="field">
            <span>SEO 标题</span>
            <input v-model="form.seoTitle" type="text" />
          </label>

          <label class="field">
            <span>SEO 描述</span>
            <textarea v-model="form.seoDescription" rows="4" />
          </label>
        </div>
      </div>

      <aside class="editor-side stacked-gap">
        <CoverAssetField
          v-model="form.avatarAssetId"
          :assets="assets"
          label="头像资源"
          help="选择公开图片资源作为成员头像。"
          :error="fieldIssues.avatarAssetId"
        />

        <div class="panel stacked-gap">
          <div class="brand-tag">资料预览</div>
          <div class="info-row">
            <span>姓名</span>
            <strong>{{ form.name || "未填写" }}</strong>
          </div>
          <div class="info-row">
            <span>公司 / 职称</span>
            <strong>{{ form.company || "-" }} · {{ form.title || "-" }}</strong>
          </div>
          <div class="info-row">
            <span>公开可见</span>
            <strong>{{ form.visibility }}</strong>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
