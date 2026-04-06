<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";

import { applicationStatusOptions, type AdminJoinApplicationListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatApplicationStatus, formatDateTime } from "../lib/format";

const rows = ref<AdminJoinApplicationListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const filters = reactive({
  query: "",
  status: "all",
  branch: "all"
});

const branchOptions = computed(() =>
  Array.from(new Set(rows.value.map((row) => row.targetBranchName).filter((value): value is string => Boolean(value)))).sort((left, right) =>
    left.localeCompare(right, "zh-CN")
  )
);
const filteredRows = computed(() => {
  const query = filters.query.trim().toLowerCase();

  return rows.value.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      [row.name, row.phoneNumber, row.wechatId || "", row.email || "", row.targetBranchName || ""].some((value) =>
        value.toLowerCase().includes(query)
      );
    const matchesStatus = filters.status === "all" || row.status === filters.status;
    const matchesBranch = filters.branch === "all" || row.targetBranchName === filters.branch;

    return matchesQuery && matchesStatus && matchesBranch;
  });
});
const summaryChips = computed(() => [
  {
    label: "当前",
    value: `${filteredRows.value.length} 条`
  },
  {
    label: "待审核",
    value: `${rows.value.filter((row) => row.status === "submitted" || row.status === "in_review").length} 条`
  }
]);
const quickFilters = [
  {
    key: "all",
    label: "全部申请",
    matches: () => filters.status === "all",
    apply: () => {
      filters.status = "all";
    }
  },
  {
    key: "submitted",
    label: "待审核",
    matches: () => filters.status === "submitted",
    apply: () => {
      filters.status = "submitted";
    }
  },
  {
    key: "in-review",
    label: "审核中",
    matches: () => filters.status === "in_review",
    apply: () => {
      filters.status = "in_review";
    }
  },
  {
    key: "approved",
    label: "已通过",
    matches: () => filters.status === "approved",
    apply: () => {
      filters.status = "approved";
    }
  }
] as const;

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminJoinApplicationListItem[]>("/api/admin/v1/applications");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载申请列表。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <h2>申请</h2>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <p>正在加载加入申请...</p>
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
            <input v-model="filters.query" type="search" placeholder="搜索姓名、手机号、微信号、邮箱或分会" />
          </label>

          <label class="field">
            <span>状态</span>
            <select v-model="filters.status">
              <option value="all">全部状态</option>
              <option v-for="option in applicationStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>意向分会</span>
            <select v-model="filters.branch">
              <option value="all">全部分会</option>
              <option v-for="option in branchOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
        </div>
      </div>

      <div v-if="filteredRows.length === 0" class="panel empty-state-card">
        <p>当前筛选条件下没有匹配的申请。</p>
      </div>

      <div v-else class="panel panel-compact table-panel">
        <table class="data-table">
          <thead>
            <tr>
              <th>申请人</th>
              <th>联系方式</th>
              <th>意向分会</th>
              <th>状态</th>
              <th>提交时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td>
                <div class="table-cell-stack">
                  <strong>{{ row.name }}</strong>
                  <div class="muted-row">申请编号 {{ row.id }}</div>
                </div>
              </td>
              <td>
                <div class="table-cell-stack">
                  <strong>{{ row.phoneNumber }}</strong>
                  <div class="table-meta-row">
                    <span>{{ row.wechatId || "未填微信" }}</span>
                    <span>{{ row.email || "未填邮箱" }}</span>
                  </div>
                </div>
              </td>
              <td>{{ row.targetBranchName || "未指定" }}</td>
              <td><span class="status-pill">{{ formatApplicationStatus(row.status) }}</span></td>
              <td>{{ formatDateTime(row.createdAt) }}</td>
              <td class="table-actions-cell">
                <RouterLink class="table-link" :to="`/applications/${row.id}`">进入审核</RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
