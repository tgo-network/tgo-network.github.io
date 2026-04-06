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
const summaryChips = computed(() => [
  {
    label: "当前",
    value: `${filteredRows.value.length} 个`
  },
  {
    label: "已发布",
    value: `${rows.value.filter((row) => row.status === "published").length} 个`
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
      <h2>分会维护</h2>

      <div class="page-actions page-actions-compact">
        <RouterLink class="button-link" to="/members">返回成员</RouterLink>
        <RouterLink class="button-link button-primary" to="/members/branches/new">新增分会</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <p>正在加载分会...</p>
    </div>

    <template v-else>
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
        <p>当前筛选条件下没有匹配的分会。</p>
      </div>

      <div v-else class="panel panel-compact table-panel">
        <div class="table-card-head">
          <h3>分会列表</h3>

          <span class="status-pill">当前 {{ filteredRows.length }} 个</span>
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
