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

const roles = ref<AdminRoleListItem[]>([]);
const permissions = ref<AdminPermissionRecord[]>([]);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const selectedRoleId = ref("");

const form = reactive<AdminRoleUpdateInput>({
  name: "",
  description: "",
  permissionIds: []
});

const selectedRole = computed(() => roles.value.find((role) => role.id === selectedRoleId.value) ?? null);
const systemRoleCount = computed(() => roles.value.filter((role) => role.isSystem).length);
const permissionAssignmentCount = computed(() =>
  roles.value.reduce((total, role) => total + role.permissionIds.length, 0)
);

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

const formatPermissionNames = (role: AdminRoleListItem) => role.permissionCodes.join(", ") || "无权限";
const isSelectedRoleSystem = computed(() => selectedRole.value?.isSystem ?? false);
const isSuperAdmin = computed(() => selectedRole.value?.code === "super_admin");

onMounted(() => {
  void loadRoles();
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header">
      <h2>角色</h2>
      <p>集中管理权限组合，通过分配角色而不是零散授权来简化工作人员访问控制。</p>
    </header>

    <div v-if="errorMessage" class="panel panel-danger stacked-gap">
      <div class="brand-tag">操作错误</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel panel-success stacked-gap">
      <div class="brand-tag">已保存</div>
      <p>{{ successMessage }}</p>
    </div>

    <div v-if="loading" class="panel">
      <div class="brand-tag">加载中</div>
      <p>正在加载角色与权限信息...</p>
    </div>

    <template v-else>
      <div class="panel-grid panel-grid-4">
        <article class="panel stat-panel">
          <div class="brand-tag">角色</div>
          <strong>{{ roles.length }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">权限</div>
          <strong>{{ permissions.length }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">系统角色</div>
          <strong>{{ systemRoleCount }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">权限绑定</div>
          <strong>{{ permissionAssignmentCount }}</strong>
        </article>
      </div>

      <div class="editor-grid">
        <div class="panel editor-main stacked-gap">
          <div class="page-header-row compact-row">
            <div>
              <div class="brand-tag">角色目录</div>
              <h3>权限组合</h3>
              <p class="section-copy">通过稳定的角色定义，让工作人员开通流程保持可预测、可审计。</p>
            </div>
          </div>

          <div class="panel table-panel inset-panel">
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
                <tr v-for="role in roles" :key="role.id">
                  <td>
                    <strong>{{ role.name }}</strong>
                    <div class="muted-row">{{ role.code }}</div>
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
          <div class="panel stacked-gap">
            <div class="brand-tag">编辑角色</div>

            <template v-if="selectedRole">
              <div class="page-header-row compact-row">
                <div>
                  <h3>{{ selectedRole.name }}</h3>
                  <p class="section-copy">{{ selectedRole.code }}</p>
                </div>

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

              <label class="field">
                <span>权限</span>
                <select v-model="form.permissionIds" multiple>
                  <option v-for="permission in permissions" :key="permission.id" :value="permission.id">
                    {{ permission.code }} - {{ permission.name }}
                  </option>
                </select>
                <small class="field-hint">权限校验发生在 API 层，后台界面只负责把结果呈现出来。</small>
                <small v-if="fieldIssues.permissionIds" class="field-error">{{ fieldIssues.permissionIds }}</small>
              </label>

              <div class="panel inset-panel stacked-gap">
                <div class="info-row">
                  <span>已分配工作人员</span>
                  <strong>{{ selectedRole.assignedStaffCount }}</strong>
                </div>
                <div class="info-row">
                  <span>系统角色</span>
                  <strong>{{ isSelectedRoleSystem ? "是" : "否" }}</strong>
                </div>
                <div class="info-row">
                  <span>更新时间</span>
                  <strong>{{ formatDateTime(selectedRole.updatedAt) }}</strong>
                </div>
              </div>

              <div class="panel inset-panel stacked-gap">
                <div class="brand-tag">当前权限代码</div>
                <p>{{ formatPermissionNames(selectedRole) }}</p>
              </div>

              <div v-if="isSuperAdmin" class="panel inset-panel stacked-gap">
                <div class="brand-tag">安全规则</div>
                <p>`super_admin` 角色必须保留完整权限集，确保系统中始终至少存在一个不受限的操作员。</p>
              </div>
            </template>

            <template v-else>
              <p>还没有选中任何角色。</p>
            </template>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>
