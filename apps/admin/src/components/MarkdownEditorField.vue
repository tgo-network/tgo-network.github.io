<script setup lang="ts">
import { computed, nextTick, ref } from "vue";

interface MarkdownGuideItem {
  label: string;
  syntax: string;
}

interface MarkdownToolbarItem {
  label: string;
  snippet: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    placeholder?: string;
    rows?: number;
    help?: string;
    error?: string;
    previewLabel?: string;
    previewHtml?: string;
    previewEmptyTitle?: string;
    previewEmptyDescription?: string;
    guideItems?: ReadonlyArray<MarkdownGuideItem>;
    toolbarItems?: ReadonlyArray<MarkdownToolbarItem>;
  }>(),
  {
    label: "Markdown 正文",
    placeholder: "使用 Markdown 编写内容。",
    rows: 18,
    help: "",
    error: "",
    previewLabel: "实时预览",
    previewHtml: "",
    previewEmptyTitle: "预览区域",
    previewEmptyDescription: "开始输入 Markdown 后，这里会显示大致排版效果。",
    guideItems: () => [],
    toolbarItems: () => []
  }
);

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);

const hasPreview = computed(() => props.previewHtml.trim().length > 0);
const hasGuideItems = computed(() => props.guideItems.length > 0);
const hasToolbarItems = computed(() => props.toolbarItems.length > 0);

const updateValue = (value: string) => {
  emit("update:modelValue", value);
};

const getLeadingSpacing = (before: string) => {
  if (before.length === 0 || before.endsWith("\n\n")) {
    return "";
  }

  return before.endsWith("\n") ? "\n" : "\n\n";
};

const getTrailingSpacing = (after: string) => {
  if (after.length === 0 || after.startsWith("\n\n")) {
    return "";
  }

  return after.startsWith("\n") ? "\n" : "\n\n";
};

const insertSnippet = async (snippet: string) => {
  const currentValue = props.modelValue;
  const textarea = textareaRef.value;

  if (!textarea) {
    updateValue(`${currentValue}${currentValue.trim().length > 0 ? "\n\n" : ""}${snippet}`);
    return;
  }

  const start = textarea.selectionStart ?? currentValue.length;
  const end = textarea.selectionEnd ?? currentValue.length;
  const before = currentValue.slice(0, start);
  const after = currentValue.slice(end);
  const inserted = `${getLeadingSpacing(before)}${snippet}${getTrailingSpacing(after)}`;
  const nextValue = `${before}${inserted}${after}`;
  const nextCaret = before.length + inserted.length;

  updateValue(nextValue);

  await nextTick();
  textareaRef.value?.focus();
  textareaRef.value?.setSelectionRange(nextCaret, nextCaret);
};
</script>

<template>
  <div class="markdown-editor-shell stacked-gap">
    <div v-if="hasToolbarItems" class="markdown-toolbar" role="toolbar" aria-label="Markdown 快捷操作">
      <button
        v-for="item in toolbarItems"
        :key="item.label"
        class="button-link button-compact markdown-toolbar-button"
        type="button"
        @click="insertSnippet(item.snippet)"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="field-grid field-grid-2 markdown-editor-grid">
      <label class="field">
        <span>{{ label }}</span>
        <textarea
          ref="textareaRef"
          :value="modelValue"
          :rows="rows"
          :placeholder="placeholder"
          @input="updateValue(($event.target as HTMLTextAreaElement).value)"
        />
        <small v-if="help" class="field-hint">{{ help }}</small>
        <small v-if="error" class="field-error">{{ error }}</small>
      </label>

      <div class="field">
        <span>{{ previewLabel }}</span>
        <div v-if="hasPreview" class="markdown-preview-panel markdown-preview-prose" v-html="previewHtml"></div>
        <div v-else class="markdown-preview-empty">
          <strong>{{ previewEmptyTitle }}</strong>
          <p>{{ previewEmptyDescription }}</p>
        </div>
      </div>
    </div>

    <div v-if="hasGuideItems" class="selection-summary-list">
      <article v-for="item in guideItems" :key="item.label" class="selection-summary-card">
        <strong>{{ item.label }}</strong>
        <code>{{ item.syntax }}</code>
      </article>
    </div>
  </div>
</template>

<style scoped>
  .markdown-editor-shell,
  .markdown-toolbar {
    display: grid;
    gap: 12px;
  }

  .markdown-toolbar {
    grid-template-columns: repeat(4, minmax(0, max-content));
    align-items: center;
  }

  .markdown-toolbar-button {
    justify-content: center;
  }

  .markdown-editor-grid {
    align-items: start;
  }

  .markdown-preview-panel,
  .markdown-preview-empty {
    min-height: 100%;
    max-height: min(68vh, 720px);
    overflow: auto;
    padding: 18px;
    border: 1px solid rgba(138, 108, 57, 0.12);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.82);
  }

  .markdown-preview-empty {
    display: grid;
    gap: 8px;
  }

  .markdown-preview-empty strong,
  .markdown-preview-empty p {
    margin: 0;
  }

  .markdown-preview-empty p {
    color: var(--muted);
    line-height: 1.7;
  }

  .selection-summary-card code {
    font-family: "SFMono-Regular", Consolas, Monaco, monospace;
    color: var(--accent-deep);
  }

  .markdown-preview-prose :deep(h2),
  .markdown-preview-prose :deep(h3),
  .markdown-preview-prose :deep(h4) {
    margin: 0 0 12px;
    color: var(--ink);
    line-height: 1.35;
  }

  .markdown-preview-prose :deep(h2) {
    font-size: 1.22rem;
  }

  .markdown-preview-prose :deep(h3) {
    font-size: 1.08rem;
  }

  .markdown-preview-prose :deep(p),
  .markdown-preview-prose :deep(li),
  .markdown-preview-prose :deep(blockquote) {
    color: var(--muted);
    line-height: 1.75;
  }

  .markdown-preview-prose :deep(p),
  .markdown-preview-prose :deep(ul),
  .markdown-preview-prose :deep(ol),
  .markdown-preview-prose :deep(pre),
  .markdown-preview-prose :deep(blockquote),
  .markdown-preview-prose :deep(table) {
    margin: 0 0 14px;
  }

  .markdown-preview-prose :deep(ul),
  .markdown-preview-prose :deep(ol) {
    padding-left: 1.2rem;
  }

  .markdown-preview-prose :deep(blockquote) {
    padding: 14px 16px;
    border-left: 3px solid rgba(154, 119, 66, 0.8);
    border-radius: 16px;
    background: rgba(255, 252, 248, 0.92);
  }

  .markdown-preview-prose :deep(pre) {
    padding: 16px 18px;
    overflow-x: auto;
    border-radius: 16px;
    background: #1c1813;
    color: #f7efe2;
  }

  .markdown-preview-prose :deep(code) {
    font-family: "SFMono-Regular", Consolas, Monaco, monospace;
    font-size: 0.9em;
  }

  .markdown-preview-prose :deep(:not(pre) > code) {
    padding: 0.14rem 0.38rem;
    border-radius: 999px;
    background: rgba(154, 119, 66, 0.12);
    color: var(--accent-deep);
  }

  .markdown-preview-prose :deep(pre code) {
    color: inherit;
  }

  .markdown-preview-prose :deep(img) {
    display: block;
    width: 100%;
    border-radius: 16px;
    object-fit: cover;
  }

  .markdown-preview-prose :deep(a) {
    color: var(--accent-deep);
    text-decoration: underline;
    text-underline-offset: 0.18em;
  }

  .markdown-preview-prose :deep(table) {
    display: block;
    width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
    border-radius: 16px;
    background: rgba(255, 250, 244, 0.88);
  }

  .markdown-preview-prose :deep(th),
  .markdown-preview-prose :deep(td) {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(138, 108, 57, 0.12);
    text-align: left;
    vertical-align: top;
  }

  .markdown-preview-prose :deep(th) {
    color: var(--ink);
    background: rgba(250, 242, 232, 0.9);
  }

  @media (max-width: 820px) {
    .markdown-toolbar {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
