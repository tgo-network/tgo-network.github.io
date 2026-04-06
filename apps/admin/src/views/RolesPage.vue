<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

import {
  type AdminPermissionRecord,
  type AdminRoleListItem,
  type AdminRoleUpdateInput,
  type AdminRolesPayload
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatDateTime } from "../lib/format";

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
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const selectedRoleId = ref("");
const filters = reactive({
  query: "",
  scope: "all"
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
const filteredRoles = computed(() => {
  const query = filters.query.trim().toLowerCase();

  return roles.value.filter((role) => {
    const matchesQuery =
      query.length === 0 ||
      [role.name, role.code, role.description, role.permissionCodes.join(" ")].some((value) => value.toLowerCase().includes(query));
    const matchesScope =
      filters.scope === "all" ||
      (filters.scope === "system" && role.isSystem) ||
      (filters.scope === "assigned" && role.assignedStaffCount > 0) ||
      (filters.scope === "empty" && role.permissionIds.length === 0);

    return matchesQuery && matchesScope;
  });
});
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

const loadRoles = async (preferredRoleId?: string) => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const payload = await adminFetch<AdminRolesPayload>("/api/admin/v1/roles");
    roles.value = payload.roles;
    permissions.value = payload.permissions;

    const nextSelectedId =
      preferredRoleId && payload.roles.some((role) => role.id === preferredRoleId)
        ? preferredRoleId
        : selectedRoleId.value && payload.roles.some((role) => role.id === selectedRoleId.value)
          ? selectedRoleId.value
          : payload.roles[0]?.id ?? "";

    selectedRoleId.value = nextSelectedId;
    applySelectedRole(payload.roles.find((role) => role.id === nextSelectedId) ?? null);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载角色列表。";
  } finally {
    loading.value = false;
  }
};

const selectRole = (role: AdminRoleListItem) => {
  selectedRoleId.value = role.id;
  fieldIssues.value = {};
  clearFeedback();
  applySelectedRole(role);
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

    <div v-if="loading" class="panel">
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
        </div>

        <div class="field-grid field-grid-2">
          <label class="field">
            <span>搜索</span>
            <input v-model="filters.query" type="search" placeholder="搜索角色名称、代码、描述或权限代码" />
          </label>
        </div>
      </div>

      <div class="editor-grid editor-grid-balanced">
        <div class="panel panel-compact editor-main stacked-gap">
          <div v-if="filteredRoles.length === 0" class="panel panel-compact inset-panel empty-state-card">
            <p>当前筛选条件下没有匹配的角色。</p>
          </div>

          <div v-else class="panel panel-compact table-panel inset-panel">
            <div class="table-card-head">
              <h3>角色列表</h3>
              <span class="status-pill">当前 {{ filteredRoles.length }} 个</span>
            </div>

            <table class="data-table">
              <thead>
                <tr>
                  <th>角色</th>
                  <th>工作人员数</th>
                  <th>权限数</th>
                  <th>更新时间</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="role in filteredRoles" :key="role.id" :class="{ 'table-row-selected': selectedRoleId === role.id }">
                  <td>
                    <div class="table-cell-stack">
                      <strong>{{ role.name }}</strong>
                      <div class="table-meta-row">
                        <span>{{ role.code }}</span>
                        <span>{{ role.isSystem ? "系统角色" : "自定义角色" }}</span>
                      </div>
                    </div>
                  </td>
                  <td>{{ role.assignedStaffCount }}</td>
                  <td>{{ role.permissionIds.length }}</td>
                  <td>{{ formatDateTime(role.updatedAt) }}</td>
                  <td class="table-actions-cell">
                    <button class="button-link button-compact" type="button" @click="selectRole(role)">
                      {{ selectedRoleId === role.id ? "编辑中" : "编辑" }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <aside class="editor-side stacked-gap">
          <template v-if="selectedRole">
            <div class="panel panel-compact summary-panel stacked-gap-tight">
              <h3>当前角色</h3>

              <div class="summary-list">
                <div v-for="item in selectedRoleMetaItems" :key="item.label" class="summary-row">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </div>

            <div class="panel panel-compact editor-side-card">
              <div class="panel-toolbar">
                <h3>编辑角色</h3>
                <button class="button-link button-primary" type="button" :disabled="saving" @click="saveRole">
                  {{ saving ? "保存中..." : "保存角色" }}
                </button>
              </div>

              <label class="field">
                <span>角色名称</span>
                <input v-model="form.name" type="text" />
                <small v-if="fieldIssues.name" class="field-error">{{ fieldIssues.name }}</small>
              </label>

              <label class="field">
                <span>描述</span>
                <textarea v-model="form.description" rows="4"></textarea>
                <small v-if="fieldIssues.description" class="field-error">{{ fieldIssues.description }}</small>
              </label>

              <section class="editor-section editor-section-compact stacked-gap">
                <div class="panel-toolbar">
                  <h3>权限</h3>
                  <div class="filter-summary">已选 {{ selectedPermissionCount }}</div>
                </div>

                <div class="selection-grid selection-grid-2">
                  <label
                    v-for="permission in permissions"
                    :key="permission.id"
                    class="checkbox-row selection-card"
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

          <div v-else class="panel panel-compact editor-side-card">
            <h3>编辑角色</h3>
            <p>请先从列表中选择一个角色。</p>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>
