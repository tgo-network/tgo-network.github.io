<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";

import type { AdminMemberListItem } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatDateTime, formatMemberVisibility, formatMembershipStatus } from "../lib/format";

const rows = ref<AdminMemberListItem[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const filters = reactive({
  query: "",
  membershipStatus: "all",
  visibility: "all",
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
      [row.name, row.slug, row.company, row.title, row.branchName || ""].some((value) => value.toLowerCase().includes(query));
    const matchesMembership = filters.membershipStatus === "all" || row.membershipStatus === filters.membershipStatus;
    const matchesVisibility = filters.visibility === "all" || row.visibility === filters.visibility;
    const matchesBranch = filters.branch === "all" || row.branchName === filters.branch;

    return matchesQuery && matchesMembership && matchesVisibility && matchesBranch;
  });
});
const summaryCards = computed(() => [
  {
    label: "成员总数",
    value: rows.value.length,
    summary: "后台当前维护的全部成员资料。"
  },
  {
    label: "有效成员",
    value: rows.value.filter((row) => row.membershipStatus === "active").length,
    summary: "当前处于有效展示状态的成员。"
  },
  {
    label: "公开资料",
    value: rows.value.filter((row) => row.visibility === "public").length,
    summary: "前台成员列表可以直接看到的资料数。"
  },
  {
    label: "已分配分会",
    value: rows.value.filter((row) => row.branchName).length,
    summary: "已经补全组织归属，便于前台形成分会结构。"
  }
]);

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await adminFetch<AdminMemberListItem[]>("/api/admin/v1/members");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载成员列表。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <div>
        <h2>成员</h2>
        <p>维护成员资料、分会归属与公开可见性，让前台成员网络始终反映真实的组织结构。</p>
      </div>

      <div class="page-actions">
        <RouterLink class="button-link" to="/members/branches">分会维护</RouterLink>
        <RouterLink class="button-link button-primary" to="/members/new">新增成员</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <div class="brand-tag">API 错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载成员...</p>
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
            <p class="section-copy">可按姓名、公司、分会、成员状态与公开可见性快速定位需要继续维护的成员资料。</p>
          </div>
          <div class="info-card">
            <span>结果</span>
            <strong>{{ filteredRows.length }} / {{ rows.length }}</strong>
            <p>当前筛选命中的成员数。</p>
          </div>
        </div>

        <div class="field-grid field-grid-3">
          <label class="field">
            <span>搜索</span>
            <input v-model="filters.query" type="search" placeholder="搜索姓名、slug、公司、职称或分会" />
          </label>

          <label class="field">
            <span>成员状态</span>
            <select v-model="filters.membershipStatus">
              <option value="all">全部成员状态</option>
              <option value="active">有效成员</option>
              <option value="alumni">校友成员</option>
              <option value="paused">暂停展示</option>
            </select>
          </label>

          <label class="field">
            <span>可见性</span>
            <select v-model="filters.visibility">
              <option value="all">全部可见性</option>
              <option value="public">公开</option>
              <option value="private">私有</option>
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
        <p>当前筛选条件下没有匹配的成员，试试切换分会或可见性条件。</p>
      </div>

      <div v-else class="panel table-panel">
        <table class="data-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>公司 / 职称</th>
              <th>分会</th>
              <th>成员状态</th>
              <th>可见性</th>
              <th>加入时间</th>
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
              <td>
                <div class="table-cell-stack">
                  <strong>{{ row.company }}</strong>
                  <div class="muted-row">{{ row.title }}</div>
                </div>
              </td>
              <td>{{ row.branchName || "未分配" }}</td>
              <td>{{ formatMembershipStatus(row.membershipStatus) }}</td>
              <td>{{ formatMemberVisibility(row.visibility) }}</td>
              <td>{{ formatDateTime(row.joinedAt) }}</td>
              <td class="table-actions-cell">
                <div class="table-action-list">
                  <RouterLink class="table-link" :to="`/members/${row.id}/edit`">编辑</RouterLink>
                  <a class="table-link" :href="`/members/${row.slug}`" target="_blank" rel="noreferrer">前台预览</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
