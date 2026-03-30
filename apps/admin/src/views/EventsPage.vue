<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";

import { contentStatusOptions, eventRegistrationStateOptions, type AdminEventListItemV2 } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatContentStatus, formatDateTime, formatEventRegistrationState } from "../lib/format";

const rows = ref<AdminEventListItemV2[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const filters = reactive({
  query: "",
  status: "all",
  registrationState: "all",
  branch: "all"
});

const branchOptions = computed(() =>
  Array.from(new Set(rows.value.map((row) => row.branchName).filter((value): value is string => Boolean(value)))).sort((left, right) =>
    left.localeCompare(right, "zh-CN")
  )
);
const filteredRows = computed(() => {
  const query = filters.query.trim().toLowerCase();

  return rows.value.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      [row.title, row.slug, row.branchName ?? ""].some((value) => value.toLowerCase().includes(query));
    const matchesStatus = filters.status === "all" || row.status === filters.status;
    const matchesRegistration = filters.registrationState === "all" || row.registrationState === filters.registrationState;
    const matchesBranch = filters.branch === "all" || row.branchName === filters.branch;

    return matchesQuery && matchesStatus && matchesRegistration && matchesBranch;
  });
});
const summaryCards = computed(() => [
  {
    label: "活动总数",
    value: rows.value.length,
    summary: "后台当前维护的全部活动记录。"
  },
  {
    label: "开放报名",
    value: rows.value.filter((row) => row.registrationState === "open").length,
    summary: "前台会直接显示公开报名表单。"
  },
  {
    label: "候补中",
    value: rows.value.filter((row) => row.registrationState === "waitlist").length,
    summary: "仍可提交，但需要工作人员后续审核安排。"
  },
  {
    label: "已发布",
    value: rows.value.filter((row) => row.status === "published").length,
    summary: "已经出现在公开活动列表中的活动。"
  }
]);

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminEventListItemV2[]>("/api/admin/v1/events");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载活动列表。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <div>
        <h2>活动</h2>
        <p>活动管理同时承接公开列表展示、详情页信息、议程配置和活动报名审核的上游入口。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link button-primary" to="/events/new">新建活动</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载活动...</p>
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
            <p class="section-copy">可按活动标题、分会、内容状态和报名状态锁定当前需要继续推进的活动。</p>
          </div>
          <div class="info-card">
            <span>结果</span>
            <strong>{{ filteredRows.length }} / {{ rows.length }}</strong>
            <p>当前筛选命中的活动数。</p>
          </div>
        </div>

        <div class="field-grid field-grid-3">
          <label class="field">
            <span>搜索</span>
            <input v-model="filters.query" type="search" placeholder="搜索标题、slug 或分会" />
          </label>

          <label class="field">
            <span>内容状态</span>
            <select v-model="filters.status">
              <option value="all">全部状态</option>
              <option v-for="option in contentStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>报名状态</span>
            <select v-model="filters.registrationState">
              <option value="all">全部报名状态</option>
              <option v-for="option in eventRegistrationStateOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
        </div>

        <div class="field-grid field-grid-3">
          <label class="field">
            <span>分会</span>
            <select v-model="filters.branch">
              <option value="all">全部分会</option>
              <option v-for="option in branchOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
        </div>
      </div>

      <div v-if="filteredRows.length === 0" class="panel empty-state-card">
        <div class="brand-tag">暂无结果</div>
        <p>当前筛选条件下没有匹配的活动，试试调整报名状态或分会筛选。</p>
      </div>

      <div v-else class="panel table-panel">
        <table class="data-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>分会 / 场地</th>
              <th>内容状态</th>
              <th>报名状态</th>
              <th>开始时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td>
                <div class="table-cell-stack">
                  <strong>{{ row.title }}</strong>
                  <div class="muted-row">/{{ row.slug }}</div>
                </div>
              </td>
              <td>
                <div class="table-cell-stack">
                  <strong>{{ row.branchName || "未分配分会" }}</strong>
                  <div class="muted-row">{{ row.startsAt ? formatDateTime(row.startsAt) : "待补充时间" }}</div>
                </div>
              </td>
              <td><span class="status-pill">{{ formatContentStatus(row.status) }}</span></td>
              <td><span class="status-pill">{{ formatEventRegistrationState(row.registrationState) }}</span></td>
              <td>{{ formatDateTime(row.startsAt) }}</td>
              <td class="table-actions-cell">
                <div class="table-action-list">
                  <RouterLink class="table-link" :to="`/events/${row.id}/edit`">编辑</RouterLink>
                  <RouterLink class="table-link" :to="`/events/${row.id}/registrations`">报名审核</RouterLink>
                  <a class="table-link" :href="`/events/${row.slug}`" target="_blank" rel="noreferrer">前台预览</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
