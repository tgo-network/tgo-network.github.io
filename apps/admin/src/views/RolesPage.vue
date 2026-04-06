<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { type AdminRoleListItem, type AdminRolesListMeta, type AdminRolesPayload } from "@tgo/shared";

import { adminFetchWithMeta } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { adminPageSizeOptions, formatPaginationSummary } from "../lib/pagination";

const roles = ref<AdminRoleListItem[]>([]);
const loading = ref(true);
const hasLoadedOnce = ref(false);
const currentPage = ref(1);
const errorMessage = ref("");
const filters = reactive({
  scope: "all",
  pageSize: adminPageSizeOptions[0]
});
const meta = ref<AdminRolesListMeta>({
  total: 0,
  page: 1,
  pageSize: adminPageSizeOptions[0],
  pageCount: 1,
  stats: {
    system: 0,
    assigned: 0
  }
});

const summaryChips = computed(() => [
  {
    label: "当前",
    value: `${meta.value.total} 个`
  },
  {
    label: "系统角色",
    value: `${meta.value.stats.system} 个`
  },
  {
    label: "已分配",
    value: `${meta.value.stats.assigned} 个`
  }
]);
const quickFilters = [
  {
    key: "all",
    label: "全部角色",
    matches: () => filters.scope === "all",
    apply: () => {
      filters.scope = "all";
    }
  },
  {
    key: "system",
    label: "系统角色",
    matches: () => filters.scope === "system",
    apply: () => {
      filters.scope = "system";
    }
  },
  {
    key: "assigned",
    label: "已分配",
    matches: () => filters.scope === "assigned",
    apply: () => {
      filters.scope = "assigned";
    }
  },
  {
    key: "empty",
    label: "空权限",
    matches: () => filters.scope === "empty",
    apply: () => {
      filters.scope = "empty";
    }
  }
] as const;

let activeRequestId = 0;
let fetchTimer: ReturnType<typeof setTimeout> | null = null;

const createEmptyMeta = (pageSize: number): AdminRolesListMeta => ({
  total: 0,
  page: 1,
  pageSize,
  pageCount: 1,
  stats: {
    system: 0,
    assigned: 0
  }
});

const paginationSummary = computed(() => formatPaginationSummary(meta.value, roles.value.length));

const buildListPath = () => {
  const search = new URLSearchParams();
  search.set("page", String(currentPage.value));
  search.set("pageSize", String(filters.pageSize));

  if (filters.scope !== "all") {
    search.set("scope", filters.scope);
  }

  return `/api/admin/v1/roles?${search.toString()}`;
};

const loadRoles = async () => {
  const requestId = ++activeRequestId;
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await adminFetchWithMeta<AdminRolesPayload, AdminRolesListMeta>(buildListPath());

    if (requestId !== activeRequestId) {
      return;
    }

    roles.value = result.data.roles;
    meta.value = result.meta ?? createEmptyMeta(filters.pageSize);
    currentPage.value = meta.value.page;
  } catch (error) {
    if (requestId !== activeRequestId) {
      return;
    }

    roles.value = [];
    meta.value = createEmptyMeta(filters.pageSize);
    errorMessage.value = error instanceof Error ? error.message : "无法加载角色列表。";
  } finally {
    if (requestId === activeRequestId) {
      loading.value = false;
      hasLoadedOnce.value = true;
    }
  }
};

onMounted(() => {
  void loadRoles();
});

watch(
  () => [filters.scope, filters.pageSize],
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
      void loadRoles();
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
      <h2>角色</h2>

      <div class="page-actions page-actions-compact">
        <RouterLink class="button-link button-primary" to="/roles/new">新增角色</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="!hasLoadedOnce && loading" class="panel">
      <p>正在加载角色与权限...</p>
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

        <div class="field-grid">
          <label class="field">
            <span>每页数量</span>
            <select v-model.number="filters.pageSize">
              <option v-for="option in adminPageSizeOptions" :key="option" :value="option">{{ option }} 条</option>
            </select>
          </label>
        </div>
      </div>

      <div class="panel panel-compact editor-main stacked-gap">
        <div v-if="loading" class="panel panel-compact inset-panel empty-state-card">
          <p>正在更新角色列表...</p>
        </div>

        <div v-else-if="meta.total === 0" class="panel panel-compact inset-panel empty-state-card">
          <p>当前筛选条件下没有匹配的角色。</p>
        </div>

        <div v-else class="panel panel-compact table-panel inset-panel">
          <div class="table-card-head">
            <h3>角色列表</h3>
            <span class="status-pill">当前 {{ meta.total }} 个</span>
          </div>

          <table class="data-table data-table-fit data-table-compact data-table-role-list">
            <thead>
              <tr>
                <th>角色</th>
                <th>更新时间</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="role in roles" :key="role.id">
                <td>
                  <div class="table-cell-stack">
                    <strong>{{ role.name }}</strong>
                    <div class="table-meta-row">
                      <span>{{ role.code }}</span>
                      <span>{{ role.isSystem ? "系统角色" : "自定义角色" }}</span>
                      <span>{{ role.assignedStaffCount }} 人</span>
                      <span>{{ role.permissionIds.length }} 权限</span>
                    </div>
                  </div>
                </td>
                <td class="table-cell-nowrap">{{ formatDateTime(role.updatedAt) }}</td>
                <td class="table-actions-cell">
                  <RouterLink class="table-link" :to="`/roles/${role.id}/edit`">编辑</RouterLink>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="pagination-panel">
            <div class="filter-summary">{{ paginationSummary }}</div>

            <div class="pagination-actions">
              <button class="button-link" type="button" :disabled="loading || meta.page <= 1" @click="currentPage = meta.page - 1; void loadRoles()">
                上一页
              </button>
              <button class="button-link" type="button" :disabled="loading || meta.page >= meta.pageCount" @click="currentPage = meta.page + 1; void loadRoles()">
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
