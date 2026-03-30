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
import { formatDate, formatDateTime, slugify, toDateTimeInputValue } from "../lib/format";

interface MemberFormState extends Omit<AdminMemberUpsertInput, "joinedAt"> {
  joinedAt: string;
}

const membershipStatusLabels = {
  active: "有效成员",
  alumni: "校友成员",
  paused: "暂停展示"
} as const;

const visibilityLabels = {
  public: "公开",
  private: "私有"
} as const;

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
const selectedBranch = computed(() => branchOptions.value.find((option) => option.id === form.branchId) ?? null);
const membershipStatusLabel = computed(
  () => membershipStatusLabels[form.membershipStatus as keyof typeof membershipStatusLabels] ?? form.membershipStatus
);
const visibilityLabel = computed(() => visibilityLabels[form.visibility as keyof typeof visibilityLabels] ?? form.visibility);
const joinedAtSummary = computed(() => (form.joinedAt ? formatDate(form.joinedAt) : "待补充加入时间"));
const memberBioParagraphs = computed(() =>
  form.bio
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
);
const memberChecklist = computed(() => [
  {
    label: "姓名与 slug",
    ready: form.name.trim().length > 0 && form.slug.trim().length > 0,
    hint: "成员详情页通过 slug 对外访问，姓名会同时用于列表卡片和详情页主标题。"
  },
  {
    label: "公司与职称",
    ready: form.company.trim().length > 0 && form.title.trim().length > 0,
    hint: "成员列表卡片会直接展示公司与职称，帮助访客快速理解覆盖人群。"
  },
  {
    label: "个人简介",
    ready: memberBioParagraphs.value.length > 0,
    hint: "详情页会展示个人简介，用于补足成员的背景与关注方向。"
  },
  {
    label: "加入时间",
    ready: Boolean(form.joinedAt),
    hint: "列表和详情都会显示加入时间，用于强化组织沉淀感。"
  },
  {
    label: "头像资源",
    ready: Boolean(form.avatarAssetId),
    hint: "头像不是强制项，但会显著提升成员列表页的识别度。"
  }
]);

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
        <p>成员资料只服务前台公开展示，与工作人员账号完全分开，不参与当前阶段的登录认证。</p>
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
        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">公开资料</div>
            <h3>准备成员列表卡片所需信息</h3>
            <p>姓名、公司、职称和 slug 会共同决定成员在公开列表中的第一印象与详情页链接。</p>
          </div>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>姓名</span>
              <input v-model="form.name" type="text" placeholder="周扬" @input="onNameInput" />
              <small class="field-hint">成员列表卡片、详情页主标题和头像回退字母都会直接使用姓名。</small>
              <small v-if="fieldIssues.name" class="field-error">{{ fieldIssues.name }}</small>
            </label>

            <label class="field">
              <span>URL 标识</span>
              <input v-model="form.slug" type="text" placeholder="zhou-yang" @input="onSlugInput" />
              <small class="field-hint">公开成员详情页通过 slug 暴露访问路径，新建时会跟随姓名自动生成。</small>
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
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">组织归属与展示控制</div>
            <h3>控制成员在前台的组织位置</h3>
            <p>分会、可见性、排序和首页推荐共同决定成员是否公开展示，以及展示优先级。</p>
          </div>

          <div class="field-grid field-grid-3">
            <label class="field">
              <span>所属分会</span>
              <select v-model="form.branchId">
                <option :value="null">暂不分配</option>
                <option v-for="option in branchOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
              </select>
              <small class="field-hint">前台成员列表和详情会直接显示分会与城市归属。</small>
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
              <small class="field-hint">私有成员不会出现在前台成员列表和详情页。</small>
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
              <small class="field-hint">数字越小越靠前，适合控制列表和精选排序。</small>
            </label>

            <label class="field checkbox-field">
              <span>首页推荐</span>
              <input v-model="form.featured" type="checkbox" />
              <small class="field-hint">开启后可作为首页精选成员候选。</small>
            </label>
          </div>
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">成员详情内容</div>
            <h3>补足成员详情页叙事</h3>
            <p>成员详情页目前只有一块“个人简介”，适合聚焦背景、关注议题和在社区中的价值。</p>
          </div>

          <label class="field">
            <span>个人简介</span>
            <textarea v-model="form.bio" rows="10" placeholder="用于成员详情页展示的个人简介。" />
            <small class="field-hint">建议按段落书写，可以拆成背景介绍、关注方向和社区参与方式。</small>
          </label>
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">SEO</div>
            <h3>准备搜索与分享信息</h3>
            <p>SEO 标题和描述仅在需要覆盖默认姓名 / 公司职称组合时再填写。</p>
          </div>

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
        </section>
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
          <div class="brand-tag">前台映射</div>

          <div class="preview-stack">
            <div class="preview-group">
              <span class="preview-label">成员列表卡片</span>
              <div class="preview-card">
                <span class="preview-eyebrow">{{ selectedBranch?.label ?? "成员" }}</span>
                <strong class="preview-title">{{ form.name || "成员姓名会展示在这里" }}</strong>
                <p class="preview-copy">{{ form.company || "待补充公司" }} · {{ form.title || "待补充职称" }}</p>
                <div class="preview-meta">
                  <span>{{ selectedBranch?.description ?? "待补充城市" }}</span>
                  <span>{{ joinedAtSummary }}</span>
                </div>
              </div>
            </div>

            <div class="preview-group">
              <span class="preview-label">成员详情页档案</span>
              <div class="preview-card preview-card-dark">
                <span class="preview-eyebrow">成员详情</span>
                <strong class="preview-title">{{ form.name || "详情页主标题" }}</strong>
                <ul class="preview-list">
                  <li>
                    <span>所属分会</span>
                    <strong>{{ selectedBranch?.label ?? "待补充分会" }}</strong>
                  </li>
                  <li>
                    <span>所在城市</span>
                    <strong>{{ selectedBranch?.description ?? "待补充城市" }}</strong>
                  </li>
                  <li>
                    <span>加入时间</span>
                    <strong>{{ joinedAtSummary }}</strong>
                  </li>
                </ul>
              </div>
            </div>

            <div class="preview-group">
              <span class="preview-label">个人简介摘要</span>
              <div class="preview-card">
                <ul class="preview-list">
                  <li v-for="(paragraph, index) in memberBioParagraphs.slice(0, 2)" :key="`${index}-${paragraph}`">
                    <span>段落 {{ index + 1 }}</span>
                    <strong>{{ paragraph }}</strong>
                  </li>
                  <li v-if="memberBioParagraphs.length === 0">
                    <span>简介预览</span>
                    <strong>尚未填写个人简介，详情页这里会展示成员背景与关注方向。</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">资料状态</div>
          <div class="info-row">
            <span>公开可见</span>
            <strong>{{ visibilityLabel }}</strong>
          </div>
          <div class="info-row">
            <span>成员状态</span>
            <strong>{{ membershipStatusLabel }}</strong>
          </div>
          <div class="info-row">
            <span>排序</span>
            <strong>{{ form.sortOrder }}</strong>
          </div>
          <div class="info-row">
            <span>首页推荐</span>
            <strong>{{ form.featured ? "是" : "否" }}</strong>
          </div>
          <div class="info-row">
            <span>最近更新</span>
            <strong>{{ formatDateTime(member?.updatedAt) }}</strong>
          </div>

          <div class="preview-note">
            <p>成员与工作人员是完全分开的两套身份。这里维护的是公开成员资料，不会赋予任何后台权限。</p>
          </div>

          <ul class="checklist">
            <li v-for="item in memberChecklist" :key="item.label">
              <span class="checklist-indicator" :class="item.ready ? 'is-ready' : 'is-pending'"></span>
              <div>
                <strong>{{ item.label }}</strong>
                <small>{{ item.hint }}</small>
              </div>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </section>
</template>
