<script setup lang="ts">
import { computed } from "vue";

import type { AdminAssetListItem } from "@tgo/shared";

import { formatBytes } from "../lib/format";

const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    assets: AdminAssetListItem[];
    label?: string;
    help?: string;
    error?: string;
  }>(),
  {
    label: "Cover Asset",
    help: "Attach a public image asset that the public site can render as cover media.",
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
    <div class="brand-tag">{{ label }}</div>

    <label class="field">
      <span>Select asset</span>
      <select v-model="selectedValue">
        <option value="">No cover image</option>
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
        <div v-else class="asset-thumb asset-thumb-file">FILE</div>

        <div class="asset-meta">
          <strong>{{ selectedAsset.originalFilename }}</strong>
          <div class="muted-row">{{ formatBytes(selectedAsset.byteSize) }} · {{ selectedAsset.visibility }}</div>
          <div class="muted-row">{{ selectedAsset.objectKey }}</div>
          <div v-if="selectedAsset.altText" class="muted-row">Alt: {{ selectedAsset.altText }}</div>
          <div v-if="!isSelectableAsset(selectedAsset)" class="field-error">
            This asset is not an active public image and should be replaced.
          </div>
        </div>
      </div>
    </div>

    <p v-else class="section-copy">
      No cover asset selected yet.
    </p>
  </div>
</template>
