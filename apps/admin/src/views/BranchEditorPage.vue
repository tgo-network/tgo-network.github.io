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
const boardPreviewItems = computed(() => boardMembersReady.value.slice(0, 3));
const seoTitlePreview = computed(() => form.seoTitle.trim() || form.name.trim() || "将回退为分会名称");
const seoDescriptionPreview = computed(() => form.seoDescription.trim() || form.summary.trim() || "将回退为分会简介");
const branchChecklist = computed(() => [
  {
    label: "名称与 slug",
    ready: form.name.trim().length > 0 && form.slug.trim().length > 0,
    hint: "分会列表跳转和公开链接都依赖名称与 slug。"
  },
  {
    label: "城市与简介",
    ready: form.cityName.trim().length > 0 && form.summary.trim().length > 0,
    hint: "分会列表卡片会优先展示城市、区域和简介。"
  },
  {
    label: "正文内容",
    ready: branchBodyParagraphs.value.length > 0,
    hint: "分会详情区会直接展示正文，用于说明定位、活动方式与本地特色。"
  },
  {
    label: "董事会成员",
    ready: boardMembersReady.value.length > 0,
    hint: "分会页强调真实的组织结构，至少需要补全一位董事会成员。"
  },
  {
    label: "公开状态",
    ready: form.status === "published",
    hint: "只有已发布状态的分会才会进入公开站主路径。"
  }
]);

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
  <section>
    <header class="page-header page-header-row">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>分会承担前台的分会展示、董事会结构、活动归属与成员归属，是组织型站点的关键节点。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/members/branches">返回分会列表</RouterLink>
        <a class="button-link" :href="previewHref" target="_blank" rel="noreferrer">预览前台</a>
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
        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">基本信息</div>
            <h3>定义分会在公开站中的身份</h3>
            <p>分会名称、slug、城市和区域会共同决定它如何出现在分会列表、成员归属和活动归属中。</p>
          </div>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>分会名称</span>
              <input v-model="form.name" type="text" placeholder="上海分会" @input="onNameInput" />
              <small class="field-hint">前台分会页卡片和详情标题都会直接使用这里的名称。</small>
              <small v-if="fieldIssues.name" class="field-error">{{ fieldIssues.name }}</small>
            </label>

            <label class="field">
              <span>URL 标识</span>
              <input v-model="form.slug" type="text" placeholder="shanghai" @input="onSlugInput" />
              <small class="field-hint">公开站使用这个 slug 作为分会锚点和内部引用。</small>
              <small v-if="fieldIssues.slug" class="field-error">{{ fieldIssues.slug }}</small>
            </label>
          </div>

          <div class="field-grid field-grid-3">
            <label class="field">
              <span>城市</span>
              <input v-model="form.cityName" type="text" placeholder="上海" />
              <small class="field-hint">活动城市筛选和成员归属会复用这里的城市信息。</small>
              <small v-if="fieldIssues.cityName" class="field-error">{{ fieldIssues.cityName }}</small>
            </label>

            <label class="field">
              <span>区域</span>
              <input v-model="form.region" type="text" placeholder="华东" />
              <small class="field-hint">用于分会列表卡片的上层地理语义，例如华东、华北等。</small>
            </label>

            <label class="field">
              <span>状态</span>
              <select v-model="form.status">
                <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <small class="field-hint">分会只有在发布后才会出现在公开站主路径中。</small>
            </label>
          </div>
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">前台概览与详情</div>
            <h3>准备分会列表卡片和详情说明</h3>
            <p>简介用于快速解释分会定位，正文用于进一步说明本地活动方式、组织特点和长期节奏。</p>
          </div>

          <label class="field">
            <span>简介</span>
            <textarea v-model="form.summary" rows="4" placeholder="用于前台列表展示的分会简介。" />
            <small class="field-hint">建议 2-4 句话，说明这个分会面向谁、围绕什么议题组织活动。</small>
          </label>

          <label class="field">
            <span>正文</span>
            <textarea v-model="form.body" rows="10" placeholder="介绍分会定位、活动形式和本地特色。" />
            <small class="field-hint">正文会直接显示在分会详情区，建议按自然段留空行拆分。</small>
          </label>
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">展示控制与 SEO</div>
            <h3>控制排序和搜索回退信息</h3>
            <p>排序决定分会卡片的优先级，SEO 字段不填时会分别回退到分会名称和简介。</p>
          </div>

          <div class="field-grid field-grid-3">
            <label class="field">
              <span>排序</span>
              <input v-model.number="form.sortOrder" type="number" min="0" />
              <small class="field-hint">数字越小越靠前，适合控制分会在首页和列表中的顺序。</small>
            </label>

            <label class="field">
              <span>SEO 标题</span>
              <input v-model="form.seoTitle" type="text" placeholder="可选，不填则回退分会名称。" />
            </label>

            <label class="field">
              <span>SEO 描述</span>
              <textarea v-model="form.seoDescription" rows="4" placeholder="可选，不填则回退分会简介。" />
            </label>
          </div>
        </section>

        <section class="editor-section stacked-gap">
          <div class="editor-section-head">
            <div class="brand-tag">董事会成员</div>
            <h3>补足分会的真实组织结构</h3>
            <p>分会页的重点不是孤立的一段介绍，而是这座城市里由谁在持续推动组织节奏。</p>
          </div>

          <div class="panel inset-panel stacked-gap">
            <div class="page-header-row compact-row">
              <div>
                <div class="brand-tag">董事会成员</div>
                <p class="section-copy">可绑定现有成员，也可直接填写展示信息与头像资源。</p>
              </div>
              <button class="button-link button-compact" type="button" @click="addBoardMember">添加成员</button>
            </div>

            <div v-for="(item, index) in form.boardMembers" :key="`${index}-${item.memberId ?? 'manual'}`" class="panel stacked-gap">
              <div class="page-header-row compact-row">
                <strong>董事会成员 {{ index + 1 }}</strong>
                <button class="button-link button-danger button-compact" type="button" @click="removeBoardMember(index)">移除</button>
              </div>

              <div class="field-grid field-grid-3">
                <label class="field">
                  <span>关联成员</span>
                  <select v-model="item.memberId" @change="onMemberPick(item)">
                    <option :value="null">不关联现有成员</option>
                    <option v-for="option in memberOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                  </select>
                  <small class="field-hint">{{ memberOptions.find((option) => option.id === item.memberId)?.description ?? "可直接从现有成员资料带出基础信息。" }}</small>
                </label>

                <label class="field">
                  <span>头像资源</span>
                  <select v-model="item.avatarAssetId">
                    <option :value="null">暂不单独设置头像</option>
                    <option v-for="asset in selectableAvatarAssets" :key="asset.id" :value="asset.id">{{ asset.originalFilename }}</option>
                  </select>
                  <small class="field-hint">优先选择公开头像资源，用于前台董事会成员卡片。</small>
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

              <div class="field-grid field-grid-2">
                <label class="field">
                  <span>简介</span>
                  <textarea v-model="item.bio" rows="4" />
                </label>

                <div class="field-grid">
                  <label class="field">
                    <span>排序</span>
                    <input v-model.number="item.sortOrder" type="number" min="0" />
                  </label>

                  <div class="info-card">
                    <span>前台显示</span>
                    <strong>{{ item.displayName || "待补充姓名" }}</strong>
                    <small class="field-hint">{{ item.company || "待补充公司" }} · {{ item.title || "待补充职务" }}</small>
                  </div>
                </div>
              </div>
            </div>
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

        <div class="panel stacked-gap">
          <div class="brand-tag">前台映射</div>

          <div class="preview-stack">
            <div class="preview-group">
              <span class="preview-label">分会列表卡片</span>
              <div class="preview-card">
                <span class="preview-eyebrow">{{ form.region || form.cityName || "分会" }}</span>
                <strong class="preview-title">{{ form.name || "分会名称会展示在这里" }}</strong>
                <p class="preview-copy">{{ form.summary || "简介会出现在分会列表卡片，用于快速解释这个城市节点的定位。" }}</p>
                <div class="preview-meta">
                  <span>{{ form.cityName || "待补充城市" }}</span>
                  <span>{{ boardMembersReady.length }} 位董事会成员</span>
                </div>
              </div>
            </div>

            <div class="preview-group">
              <span class="preview-label">分会详情区</span>
              <div class="preview-card preview-card-dark">
                <span class="preview-eyebrow">分会介绍</span>
                <strong class="preview-title">{{ form.name || "详情页主标题" }}</strong>
                <p class="preview-copy">
                  {{ branchBodyParagraphs[0] || "这里会展示分会正文的首段，用于进一步说明本地活动节奏和组织特点。" }}
                </p>
                <ul class="preview-list">
                  <li>
                    <span>城市</span>
                    <strong>{{ form.cityName || "待补充城市" }}</strong>
                  </li>
                  <li>
                    <span>区域</span>
                    <strong>{{ form.region || "待补充区域" }}</strong>
                  </li>
                  <li>
                    <span>正文段落</span>
                    <strong>{{ branchBodyParagraphs.length > 0 ? `${branchBodyParagraphs.length} 段` : "尚未填写正文" }}</strong>
                  </li>
                </ul>
              </div>
            </div>

            <div class="preview-group">
              <span class="preview-label">董事会预览</span>
              <div class="preview-card">
                <ul class="preview-list">
                  <li v-for="(item, index) in boardPreviewItems" :key="`${index}-${item.displayName}-${item.company}`">
                    <span>{{ item.status === 'published' ? '前台展示中' : '未发布成员' }}</span>
                    <strong>{{ item.displayName || `董事会成员 ${index + 1}` }} · {{ item.company || '待补充公司' }} · {{ item.title || '待补充职务' }}</strong>
                  </li>
                  <li v-if="boardPreviewItems.length === 0">
                    <span>董事会成员</span>
                    <strong>尚未补全成员资料，分会页这里会展示组织推动者名单。</strong>
                  </li>
                </ul>
              </div>
            </div>

            <div class="preview-group">
              <span class="preview-label">SEO 回退结果</span>
              <div class="preview-card">
                <ul class="preview-list">
                  <li>
                    <span>标题</span>
                    <strong>{{ seoTitlePreview }}</strong>
                  </li>
                  <li>
                    <span>描述</span>
                    <strong>{{ seoDescriptionPreview }}</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">运营提示</div>
          <div class="info-row">
            <span>当前状态</span>
            <strong class="status-pill">{{ formatContentStatus(branch?.status ?? form.status) }}</strong>
          </div>
          <div class="info-row">
            <span>公开预览</span>
            <strong>{{ previewHref }}</strong>
          </div>
          <div class="info-row">
            <span>董事会人数</span>
            <strong>{{ boardMembersReady.length }}</strong>
          </div>
          <div class="info-row">
            <span>最近更新</span>
            <strong>{{ formatDateTime(branch?.updatedAt) }}</strong>
          </div>
          <div class="info-row">
            <span>发布时间</span>
            <strong>{{ formatDateTime(branch?.publishedAt) }}</strong>
          </div>

          <div class="preview-note">
            <p>建议优先绑定真实成员资料，再补充手工字段；这样分会、成员和活动三条主线会更容易形成统一叙事。</p>
          </div>

          <ul class="checklist">
            <li v-for="item in branchChecklist" :key="item.label">
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

