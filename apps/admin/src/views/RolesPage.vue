<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

import {
  type AdminPermissionRecord,
  type AdminRoleListItem,
  type AdminRolesListMeta,
  type AdminRoleUpdateInput,
  type AdminRolesPayload
} from "@tgo/shared";

import { adminFetchWithMeta, adminRequest, getValidationIssues } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { adminPageSizeOptions, formatPaginationSummary } from "../lib/pagination";

const resourceLabels: Record<string, string> = {
  article: "文章",
  event: "活动",
  join_application: "加入申请",
  event_registration: "活动报名",
  member: "成员",
  branch: "分会",
  staff: "工作人员",
  role: "角色",
  asset: "资源",
  audit_log: "审计日志",
  homepage: "首页",
  site_page: "固定页面"
};

const roles = ref<AdminRoleListItem[]>([]);
const permissions = ref<AdminPermissionRecord[]>([]);
const loading = ref(true);
const saving = ref(false);
const hasLoadedOnce = ref(false);
const currentPage = ref(1);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const selectedRoleId = ref("");
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

const form = reactive<AdminRoleUpdateInput>({
  name: "",
  description: "",
  permissionIds: []
});

const selectedRole = computed(() => roles.value.find((role) => role.id === selectedRoleId.value) ?? null);
const selectedRoleMetaItems = computed(() => [
  {
    label: "角色代码",
    value: selectedRole.value?.code ?? "-"
  },
  {
    label: "工作人员数",
    value: selectedRole.value ? String(selectedRole.value.assignedStaffCount) : "-"
  },
  {
    label: "权限数",
    value: selectedRole.value ? String(selectedRole.value.permissionIds.length) : "-"
  },
  {
    label: "更新时间",
    value: formatDateTime(selectedRole.value?.updatedAt)
  }
]);
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
const selectedPermissionCount = computed(() => form.permissionIds.length);
const isSuperAdmin = computed(() => selectedRole.value?.code === "super_admin");
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

const clearFeedback = () => {
  errorMessage.value = "";
  successMessage.value = "";
};

const applySelectedRole = (role: AdminRoleListItem | null) => {
  if (!role) {
    form.name = "";
    form.description = "";
    form.permissionIds = [];
    return;
  }

  form.name = role.name;
  form.description = role.description;
  form.permissionIds = [...role.permissionIds];
};

const buildListPath = () => {
  const search = new URLSearchParams();
  search.set("page", String(currentPage.value));
  search.set("pageSize", String(filters.pageSize));

  if (filters.scope !== "all") {
    search.set("scope", filters.scope);
  }

  return `/api/admin/v1/roles?${search.toString()}`;
};

const loadRoles = async (preferredRoleId?: string) => {
  const requestId = ++activeRequestId;
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await adminFetchWithMeta<AdminRolesPayload, AdminRolesListMeta>(buildListPath());
    const payload = result.data;

    if (requestId !== activeRequestId) {
      return;
    }

    roles.value = payload.roles;
    permissions.value = payload.permissions;
    meta.value = result.meta ?? createEmptyMeta(filters.pageSize);
    currentPage.value = meta.value.page;

    const nextSelectedId =
      preferredRoleId && payload.roles.some((role) => role.id === preferredRoleId)
        ? preferredRoleId
        : selectedRoleId.value && payload.roles.some((role) => role.id === selectedRoleId.value)
          ? selectedRoleId.value
          : "";

    selectedRoleId.value = nextSelectedId;
    applySelectedRole(payload.roles.find((role) => role.id === nextSelectedId) ?? null);
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

const selectRole = (role: AdminRoleListItem) => {
  selectedRoleId.value = role.id;
  fieldIssues.value = {};
  clearFeedback();
  applySelectedRole(role);
};

const closeRoleEditor = () => {
  selectedRoleId.value = "";
  fieldIssues.value = {};
  clearFeedback();
  applySelectedRole(null);
};

const saveRole = async () => {
  if (!selectedRole.value) {
    return;
  }

  saving.value = true;
  clearFeedback();
  fieldIssues.value = {};

  try {
    const updated = await adminRequest<AdminRoleListItem>(`/api/admin/v1/roles/${selectedRole.value.id}`, {
      method: "PATCH",
      body: form
    });

    successMessage.value = `角色已更新：${updated.name}。`;
    await loadRoles(updated.id);
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "无法更新角色。";
  } finally {
    saving.value = false;
  }
};

const formatPermissionResource = (value: string) => resourceLabels[value] ?? value.replace(/_/g, " ");

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
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel panel-success">
      <p>{{ successMessage }}</p>
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
              <tr v-for="role in roles" :key="role.id" :class="{ 'table-row-selected': selectedRoleId === role.id }">
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
                  <button class="button-link button-compact" type="button" @click="selectRole(role)">
                    {{ selectedRoleId === role.id ? "编辑中" : "编辑" }}
                  </button>
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
              <button
                class="button-link"
                type="button"
                :disabled="loading || meta.page >= meta.pageCount"
                @click="currentPage = meta.page + 1; void loadRoles()"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedRole" class="panel panel-compact editor-side-card">
        <div class="panel-toolbar">
          <h3>编辑角色</h3>

          <div class="page-actions page-actions-compact">
            <button class="button-link" type="button" @click="closeRoleEditor">关闭</button>
            <button class="button-link button-primary" type="button" :disabled="saving" @click="saveRole">
              {{ saving ? "保存中..." : "保存角色" }}
            </button>
          </div>
        </div>

        <div class="summary-list summary-list-inline">
          <div v-for="item in selectedRoleMetaItems" :key="item.label" class="summary-row">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>

        <div class="field-grid field-grid-2">
          <label class="field">
            <span>角色名称</span>
            <input v-model="form.name" type="text" />
            <small v-if="fieldIssues.name" class="field-error">{{ fieldIssues.name }}</small>
          </label>

          <label class="field">
            <span>描述</span>
            <textarea v-model="form.description" rows="2"></textarea>
            <small v-if="fieldIssues.description" class="field-error">{{ fieldIssues.description }}</small>
          </label>
        </div>

        <section class="editor-section editor-section-compact stacked-gap">
          <div class="panel-toolbar">
            <h3>权限</h3>
            <div class="filter-summary">已选 {{ selectedPermissionCount }}</div>
          </div>

          <div class="selection-grid selection-grid-4 selection-grid-tight">
            <label
              v-for="permission in permissions"
              :key="permission.id"
              class="checkbox-row selection-card selection-card-compact"
              :class="{ 'is-active': form.permissionIds.includes(permission.id) }"
            >
              <input v-model="form.permissionIds" type="checkbox" :value="permission.id" />
              <div>
                <strong>{{ permission.name }}</strong>
                <small class="selection-card-code">{{ permission.code }}</small>
                <small>{{ formatPermissionResource(permission.resource) }} / {{ permission.action }}</small>
              </div>
            </label>
          </div>
          <small v-if="fieldIssues.permissionIds" class="field-error">{{ fieldIssues.permissionIds }}</small>
        </section>

        <div v-if="isSuperAdmin" class="panel inset-panel stacked-gap">
          <p>`super_admin` 必须保留完整权限集。</p>
        </div>
      </div>
    </template>
  </section>
</template>
