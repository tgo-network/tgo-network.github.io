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
const summaryCards = computed(() => [
  {
    label: "申请总数",
    value: rows.value.length,
    summary: "前台提交到后台的全部加入申请。"
  },
  {
    label: "待审核",
    value: rows.value.filter((row) => row.status === "submitted").length,
    summary: "还没有进入下一步跟进的申请。"
  },
  {
    label: "跟进中",
    value: rows.value.filter((row) => row.status === "in_review" || row.status === "contacted").length,
    summary: "已经开始联系或进一步评估的申请。"
  },
  {
    label: "已通过",
    value: rows.value.filter((row) => row.status === "approved").length,
    summary: "已经完成审核并进入后续安排的申请。"
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
    <header class="page-header">
      <h2>申请</h2>
      <p>非成员提交的加入申请会进入这里，由工作人员审核、联系、更新状态并持续跟进。</p>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载加入申请...</p>
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
            <p class="section-copy">可按申请人、联系方式、意向分会与状态快速找到当前最需要处理的申请。</p>
          </div>
          <div class="info-card">
            <span>结果</span>
            <strong>{{ filteredRows.length }} / {{ rows.length }}</strong>
            <p>当前筛选命中的申请数。</p>
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
        <div class="brand-tag">暂无结果</div>
        <p>当前筛选条件下没有匹配的申请，试试放宽关键词或切换审核状态。</p>
      </div>

      <div v-else class="panel table-panel">
        <div class="table-card-head">
          <div>
            <h3>申请列表</h3>
            <p class="table-card-copy">优先处理待审核申请，再跟进已联系或进入评估的记录。</p>
          </div>

          <span class="status-pill">当前结果 {{ filteredRows.length }} 条</span>
        </div>

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
