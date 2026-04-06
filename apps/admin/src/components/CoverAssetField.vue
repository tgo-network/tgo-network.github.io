<script setup lang="ts">
import { computed } from "vue";

import type { AdminAssetListItem } from "@tgo/shared";

import { formatAssetVisibility, formatBytes } from "../lib/format";

const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    assets: AdminAssetListItem[];
    label?: string;
    help?: string;
    error?: string;
  }>(),
  {
    label: "封面资源",
    help: "选择一个公开图片资源，让公开站可以将其作为封面媒体展示。",
    error: ""
  }
);

const emit = defineEmits<{
  (event: "update:modelValue", value: string | null): void;
}>();

const isSelectableAsset = (asset: AdminAssetListItem) =>
  asset.status === "active" && asset.visibility === "public" && asset.mimeType.startsWith("image/");

const selectedAsset = computed(
  () => props.assets.find((asset) => asset.id === props.modelValue) ?? null
);

const selectableAssets = computed(() => {
  const base = props.assets.filter(isSelectableAsset);

  if (selectedAsset.value && !base.some((asset) => asset.id === selectedAsset.value?.id)) {
    return [selectedAsset.value, ...base];
  }

  return base;
});

const selectedValue = computed({
  get: () => props.modelValue ?? "",
  set: (value: string) => {
    emit("update:modelValue", value || null);
  }
});
</script>

<template>
  <div class="panel stacked-gap">
    <div class="editor-section-head">
      <h3>{{ label }}</h3>
    </div>

    <label class="field">
      <span>选择资源</span>
      <select v-model="selectedValue">
        <option value="">暂不设置封面图</option>
        <option v-for="asset in selectableAssets" :key="asset.id" :value="asset.id">
          {{ asset.originalFilename }}
        </option>
      </select>
      <small class="field-hint">{{ help }}</small>
      <small v-if="error" class="field-error">{{ error }}</small>
    </label>

    <div v-if="selectedAsset" class="asset-picker-preview">
      <div class="asset-cell">
        <img
          v-if="selectedAsset.url && selectedAsset.mimeType.startsWith('image/')"
          :src="selectedAsset.url"
          :alt="selectedAsset.altText || selectedAsset.originalFilename"
          class="asset-thumb"
        />
        <div v-else class="asset-thumb asset-thumb-file">文件</div>

        <div class="asset-meta">
          <strong>{{ selectedAsset.originalFilename }}</strong>
          <div class="muted-row">{{ formatBytes(selectedAsset.byteSize) }} · {{ formatAssetVisibility(selectedAsset.visibility) }}</div>
          <div class="muted-row">{{ selectedAsset.objectKey }}</div>
          <div v-if="selectedAsset.altText" class="muted-row">替代文本：{{ selectedAsset.altText }}</div>
          <div v-if="!isSelectableAsset(selectedAsset)" class="field-error">
            当前资源不是可用中的公开图片，建议替换。
          </div>
        </div>
      </div>
    </div>

    <p v-else class="field-hint">尚未选择封面资源。</p>
  </div>
</template>
