<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";

import {
  adminAssetTypeOptions,
  assetVisibilityOptions,
  type AdminAssetDetailPayload,
  type AdminAssetListItem,
  type AdminAssetType,
  type AdminAssetUploadIntentPayload,
  type AssetVisibility
} from "@tgo/shared";

import { AdminApiError, adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatBytes, formatDateTime } from "../lib/format";

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
const selectedFileName = computed(() => selectedFile.value?.name ?? "No file selected yet.");
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
    errorMessage.value = error instanceof Error ? error.message : "Unable to load assets.";
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
        reject(new Error("Unable to inspect image dimensions."));
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
      filename: "Please choose a file to upload."
    };
    errorMessage.value = "Select a file before uploading.";
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
      throw new Error(`Upload failed with status ${uploadResponse.status}.`);
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
    successMessage.value = "Asset uploaded and indexed.";
    resetForm();
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    if (error instanceof AdminApiError || error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = "Unable to upload asset.";
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
        <h2>Assets</h2>
        <p>Upload editorial media through signed storage URLs and keep asset metadata inside the admin system.</p>
      </div>

      <div class="page-actions">
        <button class="button-link button-primary" type="button" :disabled="uploading" @click="uploadAsset">
          {{ uploading ? "Uploading..." : "Upload Asset" }}
        </button>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger stacked-gap">
      <div class="brand-tag">Upload Error</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel stacked-gap panel-success">
      <div class="brand-tag">Saved</div>
      <p>{{ successMessage }}</p>
    </div>

    <div class="editor-grid">
      <div class="panel editor-main stacked-gap">
        <div class="field-grid field-grid-2">
          <label class="field">
            <span>Asset Type</span>
            <select v-model="form.assetType">
              <option v-for="option in adminAssetTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="fieldIssues.assetType" class="field-error">{{ fieldIssues.assetType }}</small>
          </label>

          <label class="field">
            <span>Visibility</span>
            <select v-model="form.visibility" :disabled="visibilityLocked">
              <option v-for="option in assetVisibilityOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="visibilityLocked" class="field-hint">Application attachments stay private by policy.</small>
            <small v-if="fieldIssues.visibility" class="field-error">{{ fieldIssues.visibility }}</small>
          </label>
        </div>

        <label class="field">
          <span>Choose File</span>
          <input
            ref="fileInput"
            class="file-input"
            type="file"
            :accept="acceptedMimeTypes"
            @change="onFileSelected"
          />
          <small class="field-hint">Accepted types depend on the selected asset type.</small>
          <small v-if="fieldIssues.filename" class="field-error">{{ fieldIssues.filename }}</small>
          <small v-if="fieldIssues.mimeType" class="field-error">{{ fieldIssues.mimeType }}</small>
          <small v-if="fieldIssues.byteSize" class="field-error">{{ fieldIssues.byteSize }}</small>
        </label>

        <label class="field">
          <span>Alt Text</span>
          <textarea
            v-model="form.altText"
            rows="4"
            placeholder="Describe the image for accessibility and editorial reuse."
          />
          <small class="field-hint">Recommended for all image assets; optional for documents.</small>
          <small v-if="fieldIssues.altText" class="field-error">{{ fieldIssues.altText }}</small>
        </label>
      </div>

      <aside class="editor-side stacked-gap">
        <div class="panel stacked-gap">
          <div class="brand-tag">Selected File</div>
          <div class="info-card">
            <span>Name</span>
            <strong>{{ selectedFileName }}</strong>
          </div>
          <div class="info-row">
            <span>Size</span>
            <strong>{{ selectedFileSize }}</strong>
          </div>
          <div class="info-row">
            <span>Accepted</span>
            <strong>{{ acceptedMimeTypes }}</strong>
          </div>
        </div>

        <div class="panel stacked-gap">
          <div class="brand-tag">Storage Flow</div>
          <p>1. Request a signed upload URL from the API.</p>
          <p>2. Upload the file directly to object storage.</p>
          <p>3. Finalize the asset so PostgreSQL stores stable metadata and IDs.</p>
        </div>
      </aside>
    </div>

    <div v-if="loading" class="panel">
      <div class="brand-tag">Loading</div>
      <p>Fetching uploaded assets...</p>
    </div>

    <div v-else class="panel table-panel">
      <table class="data-table assets-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Type</th>
            <th>Visibility</th>
            <th>Size</th>
            <th>Status</th>
            <th>Added</th>
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
                  {{ row.mimeType === 'application/pdf' ? 'PDF' : 'FILE' }}
                </div>

                <div class="asset-meta">
                  <strong>{{ row.originalFilename }}</strong>
                  <div class="muted-row">{{ row.objectKey }}</div>
                  <div class="muted-row" v-if="row.altText">Alt: {{ row.altText }}</div>
                </div>
              </div>
            </td>
            <td>{{ row.assetType }}</td>
            <td><span class="status-pill">{{ row.visibility }}</span></td>
            <td>{{ formatBytes(row.byteSize) }}</td>
            <td><span class="status-pill">{{ row.status }}</span></td>
            <td>{{ formatDateTime(row.createdAt) }}</td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="6">
              <div class="muted-row">No assets uploaded yet.</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
