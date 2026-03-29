<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";

import {
  adminAssetUploadTypeOptions,
  assetVisibilityOptions,
  type AdminAssetDetailPayload,
  type AdminAssetListItem,
  type AdminAssetType,
  type AdminAssetUploadIntentPayload,
  type AssetVisibility
} from "@tgo/shared";

import { AdminApiError, adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatAdminAssetType, formatAssetStatus, formatAssetVisibility, formatBytes, formatDateTime } from "../lib/format";

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const rows = ref<AdminAssetListItem[]>([]);
const loading = ref(true);
const uploading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});

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

const loadAssets = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminAssetListItem[]>("/api/admin/v1/assets");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载资源列表。";
  } finally {
    loading.value = false;
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
    const payload = await adminRequest<AdminAssetDetailPayload>("/api/admin/v1/assets/uploads/complete", {
      method: "POST",
      body: {
        intentToken: intent.upload.intentToken,
        altText: form.altText,
        width: dimensions.width,
        height: dimensions.height,
        checksum: ""
      }
    });

    rows.value = [payload.asset, ...rows.value.filter((row) => row.id !== payload.asset.id)];
    successMessage.value = "资源已上传并完成登记。";
    resetForm();
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
  resetFeedback();
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

onMounted(() => {
  void loadAssets();
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <div>
        <h2>资源</h2>
        <p>通过签名上传地址上传内容资源，并将资源元数据保存在后台系统中。</p>
      </div>

      <div class="page-actions">
        <button class="button-link button-primary" type="button" :disabled="uploading" @click="uploadAsset">
          {{ uploading ? "上传中..." : "上传资源" }}
        </button>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger stacked-gap">
      <div class="brand-tag">上传错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel stacked-gap panel-success">
      <div class="brand-tag">已保存</div>
      <p>{{ successMessage }}</p>
    </div>

    <div class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="field-grid field-grid-2">
          <label class="field">
            <span>资源类型</span>
            <select v-model="form.assetType">
              <option v-for="option in adminAssetUploadTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.assetType" class="field-error">{{ fieldIssues.assetType }}</small>
          </label>

          <label class="field">
            <span>可见性</span>
            <select v-model="form.visibility" :disabled="visibilityLocked">
              <option v-for="option in assetVisibilityOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="visibilityLocked" class="field-hint">按照策略，申请附件必须保持私有。</small>
            <small v-if="fieldIssues.visibility" class="field-error">{{ fieldIssues.visibility }}</small>
          </label>
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
          <small class="field-hint">可接受的文件类型会根据所选资源类型变化。</small>
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
          <small class="field-hint">建议为所有图片资源填写；文档类型可以选填。</small>
          <small v-if="fieldIssues.altText" class="field-error">{{ fieldIssues.altText }}</small>
        </label>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">已选文件</div>
          <div class="info-card">
            <span>文件名</span>
            <strong>{{ selectedFileName }}</strong>
          </div>
          <div class="info-row">
            <span>大小</span>
            <strong>{{ selectedFileSize }}</strong>
          </div>
          <div class="info-row">
            <span>允许类型</span>
            <strong>{{ acceptedMimeTypes }}</strong>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">存储流程</div>
          <p>1. 先向 API 申请签名上传地址。</p>
          <p>2. 再把文件直接上传到对象存储。</p>
          <p>3. 最后完成登记，让 PostgreSQL 保存稳定的资源元数据与 ID。</p>
        </div>
      </aside>
    </div>

    <div v-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载已上传资源...</p>
    </div>

    <div v-else class="panel table-panel">
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
                  {{ row.mimeType === 'application/pdf' ? 'PDF' : '文件' }}
                </div>

                <div class="asset-meta">
                  <strong>{{ row.originalFilename }}</strong>
                  <div class="muted-row">{{ row.objectKey }}</div>
                  <div class="muted-row" v-if="row.altText">替代文本：{{ row.altText }}</div>
                </div>
              </div>
            </td>
            <td>{{ formatAdminAssetType(row.assetType) }}</td>
            <td><span class="status-pill">{{ formatAssetVisibility(row.visibility) }}</span></td>
            <td>{{ formatBytes(row.byteSize) }}</td>
            <td><span class="status-pill">{{ formatAssetStatus(row.status) }}</span></td>
            <td>{{ formatDateTime(row.createdAt) }}</td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="6">
              <div class="muted-row">还没有上传任何资源。</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
