<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

import {
  adminAssetUploadTypeOptions,
  assetStatusOptions,
  assetVisibilityOptions,
  type AdminAssetDetailPayload,
  type AdminAssetListItem,
  type AdminAssetListMeta,
  type AdminAssetType,
  type AdminAssetUploadIntentPayload,
  type AssetVisibility
} from "@tgo/shared";

import { AdminApiError, adminFetchWithMeta, adminRequest, getValidationIssues } from "../lib/api";
import { formatAdminAssetType, formatAssetStatus, formatAssetVisibility, formatBytes, formatDateTime } from "../lib/format";
import { adminPageSizeOptions, formatPaginationSummary } from "../lib/pagination";

const assetTypeDescriptions: Record<AdminAssetType, string> = {
  "site-banner": "用于首页与站点页中的横幅或大图区域。",
  "branch-cover": "作为分会卡片与分会详情的封面图。",
  "member-avatar": "成员列表与成员详情中使用的人像头像。",
  "article-cover": "文章列表与文章详情使用的封面资源。",
  "article-inline": "文章正文中的配图、图表或插画资源。",
  "event-poster": "活动列表、活动详情与报名页中使用的海报或主视觉。",
  "speaker-avatar": "活动嘉宾头像，用于议程与活动详情展示。",
  "application-attachment": "加入申请或报名审核中的私密附件，不对外公开。",
  "generic-file": "通用下载资料、内部文件或补充性文档。"
};

const visibilityDescriptions: Record<AssetVisibility, string> = {
  public: "可用于公开站页面、文章、活动和成员展示。",
  private: "仅用于后台审核或内部资料，不在公开站暴露。"
};

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const showUploadPanel = ref(false);
const rows = ref<AdminAssetListItem[]>([]);
const loading = ref(true);
const uploading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const hasLoadedOnce = ref(false);
const currentPage = ref(1);
const filters = reactive({
  query: "",
  assetType: "all",
  visibility: "all",
  status: "all",
  pageSize: adminPageSizeOptions[0]
});
const meta = ref<AdminAssetListMeta>({
  total: 0,
  page: 1,
  pageSize: adminPageSizeOptions[0],
  pageCount: 1,
  stats: {
    public: 0,
    private: 0,
    active: 0
  }
});

const form = reactive({
  assetType: "article-inline" as AdminAssetType,
  visibility: "public" as AssetVisibility,
  altText: ""
});

const documentAssetTypes = new Set<AdminAssetType>(["application-attachment", "generic-file"]);
const mimeTypeByExtension: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain"
};

const isImageAssetType = computed(() => !documentAssetTypes.has(form.assetType));
const visibilityLocked = computed(() => form.assetType === "application-attachment");
const acceptedMimeTypes = computed(() =>
  isImageAssetType.value ? "image/jpeg,image/png,image/webp" : "application/pdf,text/plain"
);
const selectedFileName = computed(() => selectedFile.value?.name ?? "尚未选择文件。");
const selectedFileSize = computed(() => formatBytes(selectedFile.value?.size ?? 0));
const selectedFileMimeType = computed(() => (selectedFile.value ? guessMimeType(selectedFile.value) : "待选择文件后识别"));
const selectedAssetTypeLabel = computed(
  () => adminAssetUploadTypeOptions.find((option) => option.value === form.assetType)?.label ?? formatAdminAssetType(form.assetType)
);
const selectedVisibilityLabel = computed(
  () => assetVisibilityOptions.find((option) => option.value === form.visibility)?.label ?? formatAssetVisibility(form.visibility)
);
const hasResults = computed(() => meta.value.total > 0);
const paginationSummary = computed(() => formatPaginationSummary(meta.value, rows.value.length));
const summaryChips = computed(() => [
  {
    label: "当前",
    value: `${meta.value.total} 个`
  },
  {
    label: "分页",
    value: `第 ${meta.value.page} / ${meta.value.pageCount} 页`
  }
]);
const quickFilters = [
  {
    key: "all",
    label: "全部资源",
    matches: () => filters.visibility === "all" && filters.status === "all",
    apply: () => {
      filters.visibility = "all";
      filters.status = "all";
    }
  },
  {
    key: "public",
    label: "公开资源",
    matches: () => filters.visibility === "public",
    apply: () => {
      filters.visibility = "public";
    }
  },
  {
    key: "private",
    label: "私有资源",
    matches: () => filters.visibility === "private",
    apply: () => {
      filters.visibility = "private";
    }
  },
  {
    key: "active",
    label: "启用中",
    matches: () => filters.status === "active",
    apply: () => {
      filters.status = "active";
    }
  }
] as const;

let activeRequestId = 0;
let fetchTimer: ReturnType<typeof setTimeout> | null = null;

const createEmptyMeta = (pageSize: number): AdminAssetListMeta => ({
  total: 0,
  page: 1,
  pageSize,
  pageCount: 1,
  stats: {
    public: 0,
    private: 0,
    active: 0
  }
});

const resetFeedback = () => {
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};
};

const resetForm = () => {
  form.altText = "";
  form.visibility = form.assetType === "application-attachment" ? "private" : "public";
  selectedFile.value = null;

  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const guessMimeType = (file: File) => {
  if (file.type) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  return mimeTypeByExtension[extension] ?? "application/octet-stream";
};

const buildListPath = () => {
  const search = new URLSearchParams();
  search.set("page", String(currentPage.value));
  search.set("pageSize", String(filters.pageSize));

  const query = filters.query.trim();

  if (query.length > 0) {
    search.set("q", query);
  }

  if (filters.assetType !== "all") {
    search.set("assetType", filters.assetType);
  }

  if (filters.visibility !== "all") {
    search.set("visibility", filters.visibility);
  }

  if (filters.status !== "all") {
    search.set("status", filters.status);
  }

  return `/api/admin/v1/assets?${search.toString()}`;
};

const loadAssets = async () => {
  const requestId = ++activeRequestId;
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await adminFetchWithMeta<AdminAssetListItem[], AdminAssetListMeta>(buildListPath());

    if (requestId !== activeRequestId) {
      return;
    }

    rows.value = result.data;
    meta.value = result.meta ?? createEmptyMeta(filters.pageSize);
    currentPage.value = meta.value.page;
  } catch (error) {
    if (requestId !== activeRequestId) {
      return;
    }

    rows.value = [];
    meta.value = createEmptyMeta(filters.pageSize);
    errorMessage.value = error instanceof Error ? error.message : "无法加载资源列表。";
  } finally {
    if (requestId === activeRequestId) {
      loading.value = false;
      hasLoadedOnce.value = true;
    }
  }
};

const readImageDimensions = async (file: File, mimeType: string) => {
  if (!mimeType.startsWith("image/")) {
    return {
      width: null,
      height: null
    };
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight
        });
      };
      image.onerror = () => {
        reject(new Error("无法读取图片尺寸。"));
      };
      image.src = objectUrl;
    });

    return dimensions;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const uploadAsset = async () => {
  resetFeedback();
  showUploadPanel.value = true;

  if (!selectedFile.value) {
    fieldIssues.value = {
      filename: "请选择需要上传的文件。"
    };
    errorMessage.value = "请先选择文件再上传。";
    return;
  }

  uploading.value = true;

  try {
    const file = selectedFile.value;
    const mimeType = guessMimeType(file);
    const intent = await adminRequest<AdminAssetUploadIntentPayload>("/api/admin/v1/assets/uploads", {
      method: "POST",
      body: {
        filename: file.name,
        mimeType,
        byteSize: file.size,
        assetType: form.assetType,
        visibility: form.visibility
      }
    });

    const uploadResponse = await fetch(intent.upload.uploadUrl, {
      method: intent.upload.uploadMethod,
      headers: intent.upload.uploadHeaders,
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error(`上传失败，状态码 ${uploadResponse.status}。`);
    }

    const dimensions = await readImageDimensions(file, mimeType);
    await adminRequest<AdminAssetDetailPayload>("/api/admin/v1/assets/uploads/complete", {
      method: "POST",
      body: {
        intentToken: intent.upload.intentToken,
        altText: form.altText,
        width: dimensions.width,
        height: dimensions.height,
        checksum: ""
      }
    });

    successMessage.value = "资源已上传并完成登记。";
    resetForm();
    showUploadPanel.value = false;
    currentPage.value = 1;
    await loadAssets();
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    if (error instanceof AdminApiError || error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = "无法上传资源。";
    }
  } finally {
    uploading.value = false;
  }
};

const onFileSelected = (event: Event) => {
  const input = event.target as HTMLInputElement;
  selectedFile.value = input.files?.[0] ?? null;
  showUploadPanel.value = true;
  resetFeedback();
};

const toggleUploadPanel = () => {
  showUploadPanel.value = !showUploadPanel.value;

  if (!showUploadPanel.value) {
    resetFeedback();
    resetForm();
  }
};

watch(
  () => form.assetType,
  (assetType) => {
    if (assetType === "application-attachment") {
      form.visibility = "private";
      return;
    }

    if (form.visibility !== "public" && form.visibility !== "private") {
      form.visibility = "public";
    }
  }
);

watch(
  () => [filters.query, filters.assetType, filters.visibility, filters.status, filters.pageSize],
  () => {
    if (!hasLoadedOnce.value) {
      return;
    }

    currentPage.value = 1;

    if (fetchTimer) {
      clearTimeout(fetchTimer);
    }

    fetchTimer = setTimeout(() => {
      fetchTimer = null;
      void loadAssets();
    }, 250);
  }
);

onMounted(() => {
  void loadAssets();
});

onBeforeUnmount(() => {
  if (fetchTimer) {
    clearTimeout(fetchTimer);
  }
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <h2>资源</h2>

      <div class="page-actions page-actions-compact">
        <button class="button-link button-primary" type="button" :disabled="uploading" @click="toggleUploadPanel">
          {{ showUploadPanel ? "收起上传" : "上传资源" }}
        </button>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel panel-success">
      <p>{{ successMessage }}</p>
    </div>

    <div v-if="showUploadPanel" class="editor-grid editor-grid-compact">
      <div class="panel panel-compact editor-main stacked-gap">
        <div class="panel-toolbar">
          <div class="editor-section-head">
            <h3>上传资源</h3>
          </div>

          <button class="button-link button-primary" type="button" :disabled="uploading" @click="uploadAsset">
            {{ uploading ? "上传中..." : "开始上传" }}
          </button>
        </div>

        <section class="editor-section editor-section-compact stacked-gap">
          <div class="editor-section-head">
            <h3>上传设置</h3>
          </div>

          <label class="field">
            <span>资源类型</span>
            <select v-model="form.assetType">
              <option v-for="option in adminAssetUploadTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <small class="field-hint">{{ assetTypeDescriptions[form.assetType] }}</small>
            <small v-if="fieldIssues.assetType" class="field-error">{{ fieldIssues.assetType }}</small>
          </label>

          <label class="field">
            <span>可见性</span>
            <select v-model="form.visibility">
              <option
                v-for="option in assetVisibilityOptions"
                :key="option.value"
                :value="option.value"
                :disabled="visibilityLocked && option.value !== 'private'"
              >
                {{ option.label }}
              </option>
            </select>
            <small class="field-hint">{{ visibilityDescriptions[form.visibility] }}</small>
            <small v-if="visibilityLocked" class="field-hint">申请附件按照策略必须保持私有，不会进入公开站。</small>
            <small v-if="fieldIssues.visibility" class="field-error">{{ fieldIssues.visibility }}</small>
          </label>
        </section>

        <section class="editor-section editor-section-compact stacked-gap">
          <div class="editor-section-head">
            <h3>文件信息</h3>
          </div>

          <label class="field">
            <span>选择文件</span>
            <input
              ref="fileInput"
              class="file-input"
              type="file"
              :accept="acceptedMimeTypes"
              @change="onFileSelected"
            />
            <small v-if="fieldIssues.filename" class="field-error">{{ fieldIssues.filename }}</small>
            <small v-if="fieldIssues.mimeType" class="field-error">{{ fieldIssues.mimeType }}</small>
            <small v-if="fieldIssues.byteSize" class="field-error">{{ fieldIssues.byteSize }}</small>
          </label>

          <label class="field">
            <span>替代文本</span>
            <textarea
              v-model="form.altText"
              rows="4"
              placeholder="描述图片内容，便于无障碍访问与后续复用。"
            />
            <small v-if="fieldIssues.altText" class="field-error">{{ fieldIssues.altText }}</small>
          </label>
        </section>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel panel-compact summary-panel stacked-gap-tight">
          <h3>待上传概览</h3>

          <div class="summary-list summary-list-compact">
            <div class="summary-row">
              <span>文件名</span>
              <strong>{{ selectedFileName }}</strong>
            </div>
            <div class="summary-row">
              <span>大小</span>
              <strong>{{ selectedFileSize }}</strong>
            </div>
            <div class="summary-row">
              <span>MIME 类型</span>
              <strong>{{ selectedFileMimeType }}</strong>
            </div>
            <div class="summary-row">
              <span>资源类型</span>
              <strong>{{ selectedAssetTypeLabel }}</strong>
            </div>
            <div class="summary-row">
              <span>可见性</span>
              <strong>{{ selectedVisibilityLabel }}</strong>
            </div>
            <div class="summary-row">
              <span>资源总数</span>
              <strong>{{ meta.total }}</strong>
            </div>
            <div class="summary-row">
              <span>公开资源</span>
              <strong>{{ meta.stats.public }}</strong>
            </div>
            <div class="summary-row">
              <span>私有资源</span>
              <strong>{{ meta.stats.private }}</strong>
            </div>
            <div class="summary-row">
              <span>启用中</span>
              <strong>{{ meta.stats.active }}</strong>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <div class="panel panel-compact filter-panel filter-panel-compact">
      <div class="filter-toolbar">
        <div class="segmented-actions">
          <button
            v-for="item in quickFilters"
            :key="item.key"
            type="button"
            class="segmented-button"
            :class="{ 'is-active': item.matches() }"
            @click="item.apply()"
          >
            {{ item.label }}
          </button>
        </div>

        <div class="summary-chip-row">
          <div v-for="item in summaryChips" :key="item.label" class="summary-chip">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </div>

      <div class="field-grid field-grid-5">
        <label class="field">
          <span>搜索</span>
          <input v-model="filters.query" type="search" placeholder="搜索文件名、对象键、替代文本或 MIME 类型" />
        </label>

        <label class="field">
          <span>资源类型</span>
          <select v-model="filters.assetType">
            <option value="all">全部类型</option>
            <option v-for="option in adminAssetUploadTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>

        <label class="field">
          <span>状态</span>
          <select v-model="filters.status">
            <option value="all">全部状态</option>
            <option v-for="option in assetStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>

        <label class="field">
          <span>可见性</span>
          <select v-model="filters.visibility">
            <option value="all">全部可见性</option>
            <option v-for="option in assetVisibilityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>

        <label class="field">
          <span>每页数量</span>
          <select v-model.number="filters.pageSize">
            <option v-for="option in adminPageSizeOptions" :key="option" :value="option">{{ option }} 条</option>
          </select>
        </label>
      </div>
    </div>

    <div v-if="!hasLoadedOnce && loading" class="panel">
      <p>正在加载已上传资源...</p>
    </div>

    <div v-else-if="loading" class="panel">
      <p>正在更新资源列表...</p>
    </div>

    <div v-else-if="!hasResults" class="panel empty-state-card">
      <p>当前筛选条件下没有匹配的资源。</p>
    </div>

    <div v-else class="panel panel-compact table-panel">
      <div class="table-card-head">
        <h3>资源列表</h3>

        <span class="status-pill">当前 {{ meta.total }} 个</span>
      </div>

      <table class="data-table assets-table">
        <thead>
          <tr>
            <th>资源</th>
            <th>类型</th>
            <th>可见性</th>
            <th>大小</th>
            <th>状态</th>
            <th>添加时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <div class="asset-cell">
                <img
                  v-if="row.url && row.mimeType.startsWith('image/')"
                  :src="row.url"
                  :alt="row.altText || row.originalFilename"
                  class="asset-thumb"
                />
                <div v-else class="asset-thumb asset-thumb-file">
                  {{ row.mimeType === "application/pdf" ? "PDF" : "文件" }}
                </div>

                <div class="asset-meta">
                  <strong>{{ row.originalFilename }}</strong>
                  <div class="muted-row">{{ row.mimeType }}</div>
                  <div v-if="row.altText" class="muted-row">替代文本：{{ row.altText }}</div>
                </div>
              </div>
            </td>
            <td>{{ formatAdminAssetType(row.assetType) }}</td>
            <td><span class="status-pill">{{ formatAssetVisibility(row.visibility) }}</span></td>
            <td>{{ formatBytes(row.byteSize) }}</td>
            <td><span class="status-pill">{{ formatAssetStatus(row.status) }}</span></td>
            <td>{{ formatDateTime(row.createdAt) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="pagination-panel">
        <div class="filter-summary">{{ paginationSummary }}</div>

        <div class="pagination-actions">
          <button class="button-link" type="button" :disabled="loading || meta.page <= 1" @click="currentPage = meta.page - 1; void loadAssets()">
            上一页
          </button>
          <button
            class="button-link"
            type="button"
            :disabled="loading || meta.page >= meta.pageCount"
            @click="currentPage = meta.page + 1; void loadAssets()"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
