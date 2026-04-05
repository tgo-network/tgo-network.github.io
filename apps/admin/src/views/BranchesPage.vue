<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";

import { contentStatusOptions, type AdminBranchListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatContentStatus, formatDate } from "../lib/format";

const rows = ref<AdminBranchListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const filters = reactive({
  query: "",
  status: "all",
  region: "all"
});

const regionOptions = computed(() =>
  Array.from(new Set(rows.value.map((row) => row.region).filter((value) => value.trim().length > 0))).sort((left, right) =>
    left.localeCompare(right, "zh-CN")
  )
);
const filteredRows = computed(() => {
  const query = filters.query.trim().toLowerCase();

  return rows.value.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      [row.name, row.slug, row.cityName, row.region].some((value) => value.toLowerCase().includes(query));
    const matchesStatus = filters.status === "all" || row.status === filters.status;
    const matchesRegion = filters.region === "all" || row.region === filters.region;

    return matchesQuery && matchesStatus && matchesRegion;
  });
});
const summaryCards = computed(() => [
  {
    label: "分会总数",
    value: rows.value.length,
    summary: "当前系统内已经建立的全部分会节点。"
  },
  {
    label: "已发布",
    value: rows.value.filter((row) => row.status === "published").length,
    summary: "会在前台分会董事会页中公开展示的分会。"
  },
  {
    label: "覆盖区域",
    value: regionOptions.value.length,
    summary: "当前分会节点覆盖到的区域数量。"
  },
  {
    label: "董事会席位",
    value: rows.value.reduce((total, row) => total + row.boardMemberCount, 0),
    summary: "已进入分会结构的董事会成员总数。"
  }
]);
const quickFilters = [
  {
    key: "all",
    label: "全部分会",
    matches: () => filters.status === "all",
    apply: () => {
      filters.status = "all";
    }
  },
  {
    key: "published",
    label: "已发布",
    matches: () => filters.status === "published",
    apply: () => {
      filters.status = "published";
    }
  },
  {
    key: "draft",
    label: "草稿",
    matches: () => filters.status === "draft",
    apply: () => {
      filters.status = "draft";
    }
  },
  {
    key: "in-review",
    label: "审核中",
    matches: () => filters.status === "in_review",
    apply: () => {
      filters.status = "in_review";
    }
  }
] as const;

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminBranchListItem[]>("/api/admin/v1/branches");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载分会列表。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <div>
        <h2>分会维护</h2>
        <p>维护各个分会与董事会结构，它们会直接影响前台分会展示、成员归属和活动城市映射。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/members">返回成员</RouterLink>
        <RouterLink class="button-link button-primary" to="/members/branches/new">新增分会</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载分会...</p>
    </div>

    <template v-else>
      <div class="panel-grid panel-grid-4">
        <article v-for="item in summaryCards" :key="item.label" class="panel stat-panel">
          <div class="brand-tag">{{ item.label }}</div>
          <strong>{{ item.value }}</strong>
          <p>{{ item.summary }}</p>
        </article>
      </div>

      <div class="panel filter-panel">
        <div class="page-header-row compact-row">
          <div>
            <div class="brand-tag">筛选</div>
            <p class="section-copy">可按分会名称、城市、区域和状态快速定位需要继续补充董事会或内容信息的分会。</p>
          </div>
          <div class="info-card compact-info-card">
            <span>结果</span>
            <strong>{{ filteredRows.length }} / {{ rows.length }}</strong>
            <p>当前筛选命中的分会数量。</p>
          </div>
        </div>

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
        </div>

        <div class="field-grid field-grid-3">
          <label class="field">
            <span>搜索</span>
            <input v-model="filters.query" type="search" placeholder="搜索分会、slug、城市或区域" />
          </label>

          <label class="field">
            <span>状态</span>
            <select v-model="filters.status">
              <option value="all">全部状态</option>
              <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>区域</span>
            <select v-model="filters.region">
              <option value="all">全部区域</option>
              <option v-for="option in regionOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
        </div>
      </div>

      <div v-if="filteredRows.length === 0" class="panel empty-state-card">
        <div class="brand-tag">暂无结果</div>
        <p>当前筛选条件下没有匹配的分会，试试放宽关键词或切换状态条件。</p>
      </div>

      <div v-else class="panel table-panel">
        <div class="table-card-head">
          <div>
            <h3>分会列表</h3>
            <p class="table-card-copy">统一管理分会基本信息、区域归属与董事会人数，确保前台组织结构口径一致。</p>
          </div>

          <span class="status-pill">当前结果 {{ filteredRows.length }} 个</span>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>分会</th>
              <th>城市</th>
              <th>区域</th>
              <th>状态</th>
              <th>董事会人数</th>
              <th>更新时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td>
                <div class="table-cell-stack">
                  <strong>{{ row.name }}</strong>
                  <div class="muted-row">/{{ row.slug }}</div>
                </div>
              </td>
              <td>{{ row.cityName }}</td>
              <td>{{ row.region || "-" }}</td>
              <td><span class="status-pill">{{ formatContentStatus(row.status) }}</span></td>
              <td>{{ row.boardMemberCount }}</td>
              <td>{{ formatDate(row.updatedAt) }}</td>
              <td class="table-actions-cell">
                <RouterLink class="table-link" :to="`/members/branches/${row.id}/edit`">编辑</RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
