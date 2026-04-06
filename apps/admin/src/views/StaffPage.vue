<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import {
  staffAccountStatusOptions,
  type AdminRoleSummary,
  type AdminStaffListItem,
  type AdminStaffListMeta,
  type AdminStaffListPayload
} from "@tgo/shared";

import { adminFetchWithMeta } from "../lib/api";
import { formatDateTime, formatStaffAccountStatus } from "../lib/format";
import { adminPageSizeOptions, formatPaginationSummary } from "../lib/pagination";

const rows = ref<AdminStaffListItem[]>([]);
const roles = ref<AdminRoleSummary[]>([]);
const loading = ref(true);
const hasLoadedOnce = ref(false);
const currentPage = ref(1);
const errorMessage = ref("");
const filters = reactive({
  status: "all",
  roleId: "all",
  pageSize: adminPageSizeOptions[0]
});
const visibleStaffStatusOptions = staffAccountStatusOptions.filter((option) => option.value !== "invited");
const meta = ref<AdminStaffListMeta>({
  total: 0,
  page: 1,
  pageSize: adminPageSizeOptions[0],
  pageCount: 1,
  stats: {
    active: 0,
    suspended: 0,
    disabled: 0
  }
});

const roleOptions = computed(() => roles.value);
const formatStaffStatus = (value: string | null | undefined) => (value === "invited" ? "待启用" : formatStaffAccountStatus(value));
const summaryChips = computed(() => [
  {
    label: "当前",
    value: `${meta.value.total} 个`
  },
  {
    label: "启用中",
    value: `${meta.value.stats.active} 个`
  },
  {
    label: "已暂停",
    value: `${meta.value.stats.suspended} 个`
  }
]);
const quickFilters = [
  {
    key: "all",
    label: "全部工作人员",
    matches: () => filters.status === "all",
    apply: () => {
      filters.status = "all";
    }
  },
  {
    key: "active",
    label: "启用中",
    matches: () => filters.status === "active",
    apply: () => {
      filters.status = "active";
    }
  },
  {
    key: "suspended",
    label: "已暂停",
    matches: () => filters.status === "suspended",
    apply: () => {
      filters.status = "suspended";
    }
  },
  {
    key: "disabled",
    label: "已停用",
    matches: () => filters.status === "disabled",
    apply: () => {
      filters.status = "disabled";
    }
  }
] as const;

let activeRequestId = 0;
let fetchTimer: ReturnType<typeof setTimeout> | null = null;

const createEmptyMeta = (pageSize: number): AdminStaffListMeta => ({
  total: 0,
  page: 1,
  pageSize,
  pageCount: 1,
  stats: {
    active: 0,
    suspended: 0,
    disabled: 0
  }
});

const paginationSummary = computed(() => formatPaginationSummary(meta.value, rows.value.length));

const buildListPath = () => {
  const search = new URLSearchParams();
  search.set("page", String(currentPage.value));
  search.set("pageSize", String(filters.pageSize));

  if (filters.status !== "all") {
    search.set("status", filters.status);
  }

  if (filters.roleId !== "all") {
    search.set("roleId", filters.roleId);
  }

  return `/api/admin/v1/staff?${search.toString()}`;
};

const loadStaff = async () => {
  const requestId = ++activeRequestId;
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await adminFetchWithMeta<AdminStaffListPayload, AdminStaffListMeta>(buildListPath());
    const payload = result.data;

    if (requestId !== activeRequestId) {
      return;
    }

    rows.value = payload.staff;
    roles.value = payload.roles;
    meta.value = result.meta ?? createEmptyMeta(filters.pageSize);
    currentPage.value = meta.value.page;
  } catch (error) {
    if (requestId !== activeRequestId) {
      return;
    }

    rows.value = [];
    roles.value = [];
    meta.value = createEmptyMeta(filters.pageSize);
    errorMessage.value = error instanceof Error ? error.message : "无法加载工作人员账号。";
  } finally {
    if (requestId === activeRequestId) {
      loading.value = false;
      hasLoadedOnce.value = true;
    }
  }
};

const formatRoleNames = (staff: AdminStaffListItem) => staff.roles.map((role) => role.name).join(" / ") || "未分配角色";

onMounted(() => {
  void loadStaff();
});

watch(
  () => [filters.status, filters.roleId, filters.pageSize],
  () => {
    if (!hasLoadedOnce.value) {
      return;
    }

    currentPage.value = 1;

    if (fetchTimer) {
      clearTimeout(fetchTimer);
    }

    fetchTimer = setTimeout(() => {
      fetchTimer = null;
      void loadStaff();
    }, 200);
  }
);

onBeforeUnmount(() => {
  if (fetchTimer) {
    clearTimeout(fetchTimer);
  }
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <h2>工作人员</h2>

      <div class="page-actions page-actions-compact">
        <RouterLink class="button-link button-primary" to="/staff/new">新增 Staff</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="!hasLoadedOnce && loading" class="panel">
      <p>正在加载工作人员账号...</p>
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
            <span>状态</span>
            <select v-model="filters.status">
              <option value="all">全部状态</option>
              <option v-for="option in visibleStaffStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>角色</span>
            <select v-model="filters.roleId">
              <option value="all">全部角色</option>
              <option v-for="role in roleOptions" :key="role.id" :value="role.id">{{ role.name }}</option>
            </select>
          </label>

          <label class="field">
            <span>每页数量</span>
            <select v-model.number="filters.pageSize">
              <option v-for="option in adminPageSizeOptions" :key="option" :value="option">{{ option }} 条</option>
            </select>
          </label>
        </div>
      </div>

      <div class="panel panel-compact editor-main stacked-gap">
        <div class="table-card-head">
          <h3>工作人员列表</h3>
          <span class="status-pill">当前 {{ meta.total }} 个</span>
        </div>

        <div v-if="loading" class="panel panel-compact inset-panel empty-state-card">
          <p>正在更新工作人员列表...</p>
        </div>

        <div v-else-if="meta.total === 0" class="panel panel-compact inset-panel empty-state-card">
          <p>当前筛选条件下没有匹配的工作人员账号。</p>
        </div>

        <div v-else class="panel panel-compact table-panel inset-panel">
          <table class="data-table data-table-staff-list">
            <thead>
              <tr>
                <th>姓名</th>
                <th>状态</th>
                <th>角色</th>
                <th>最后登录</th>
                <th>更新时间</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id">
                <td>
                  <div class="table-cell-stack">
                    <strong>{{ row.name }}</strong>
                    <div class="muted-row">{{ row.email }}</div>
                  </div>
                </td>
                <td class="table-cell-nowrap"><span class="status-pill">{{ formatStaffStatus(row.status) }}</span></td>
                <td>{{ formatRoleNames(row) }}</td>
                <td class="table-cell-nowrap">{{ formatDateTime(row.lastLoginAt) }}</td>
                <td class="table-cell-nowrap">{{ formatDateTime(row.updatedAt) }}</td>
                <td class="table-actions-cell">
                  <RouterLink class="table-link" :to="`/staff/${row.id}/edit`">编辑</RouterLink>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="pagination-panel">
            <div class="filter-summary">{{ paginationSummary }}</div>

            <div class="pagination-actions">
              <button class="button-link" type="button" :disabled="loading || meta.page <= 1" @click="currentPage = meta.page - 1; void loadStaff()">
                上一页
              </button>
              <button class="button-link" type="button" :disabled="loading || meta.page >= meta.pageCount" @click="currentPage = meta.page + 1; void loadStaff()">
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
