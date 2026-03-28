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
    errorMessage.value = error instanceof Error ? error.message : "Unable to load roles.";
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

    successMessage.value = `Role updated: ${updated.name}.`;
    await loadRoles(updated.id);
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "Unable to update the role.";
  } finally {
    saving.value = false;
  }
};

const formatPermissionNames = (role: AdminRoleListItem) => role.permissionCodes.join(", ") || "No permissions";
const isSelectedRoleSystem = computed(() => selectedRole.value?.isSystem ?? false);
const isSuperAdmin = computed(() => selectedRole.value?.code === "super_admin");

onMounted(() => {
  void loadRoles();
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header">
      <h2>Roles</h2>
      <p>Manage permission bundles centrally, then keep staff access simple by assigning roles instead of one-off grants.</p>
    </header>

    <div v-if="errorMessage" class="panel panel-danger stacked-gap">
      <div class="brand-tag">Action Error</div>
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel panel-success stacked-gap">
      <div class="brand-tag">Saved</div>
      <p>{{ successMessage }}</p>
    </div>

    <div v-if="loading" class="panel">
      <div class="brand-tag">Loading</div>
      <p>Fetching roles and permission references...</p>
    </div>

    <template v-else>
      <div class="panel-grid panel-grid-4">
        <article class="panel stat-panel">
          <div class="brand-tag">Roles</div>
          <strong>{{ roles.length }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Permissions</div>
          <strong>{{ permissions.length }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">System</div>
          <strong>{{ systemRoleCount }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Bindings</div>
          <strong>{{ permissionAssignmentCount }}</strong>
        </article>
      </div>

      <div class="editor-grid">
        <div class="panel editor-main stacked-gap">
          <div class="page-header-row compact-row">
            <div>
              <div class="brand-tag">Role Catalog</div>
              <h3>Permission bundles</h3>
              <p class="section-copy">Use stable role definitions so staff provisioning stays predictable and auditable.</p>
            </div>
          </div>

          <div class="panel table-panel inset-panel">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Staff</th>
                  <th>Permissions</th>
                  <th>Updated</th>
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
                      {{ selectedRoleId === role.id ? "Editing" : "Edit" }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <aside class="editor-side stacked-gap">
          <div class="panel stacked-gap">
            <div class="brand-tag">Edit Role</div>

            <template v-if="selectedRole">
              <div class="page-header-row compact-row">
                <div>
                  <h3>{{ selectedRole.name }}</h3>
                  <p class="section-copy">{{ selectedRole.code }}</p>
                </div>

                <button class="button-link button-primary" type="button" :disabled="saving" @click="saveRole">
                  {{ saving ? "Saving..." : "Save Role" }}
                </button>
              </div>

              <label class="field">
                <span>Role Name</span>
                <input v-model="form.name" type="text" />
                <small v-if="fieldIssues.name" class="field-error">{{ fieldIssues.name }}</small>
              </label>

              <label class="field">
                <span>Description</span>
                <textarea v-model="form.description" rows="4"></textarea>
                <small v-if="fieldIssues.description" class="field-error">{{ fieldIssues.description }}</small>
              </label>

              <label class="field">
                <span>Permissions</span>
                <select v-model="form.permissionIds" multiple>
                  <option v-for="permission in permissions" :key="permission.id" :value="permission.id">
                    {{ permission.code }} - {{ permission.name }}
                  </option>
                </select>
                <small class="field-hint">Permission checks happen in the API layer; the admin UI only mirrors them.</small>
                <small v-if="fieldIssues.permissionIds" class="field-error">{{ fieldIssues.permissionIds }}</small>
              </label>

              <div class="panel inset-panel stacked-gap">
                <div class="info-row">
                  <span>Assigned staff</span>
                  <strong>{{ selectedRole.assignedStaffCount }}</strong>
                </div>
                <div class="info-row">
                  <span>System role</span>
                  <strong>{{ isSelectedRoleSystem ? "Yes" : "No" }}</strong>
                </div>
                <div class="info-row">
                  <span>Updated</span>
                  <strong>{{ formatDateTime(selectedRole.updatedAt) }}</strong>
                </div>
              </div>

              <div class="panel inset-panel stacked-gap">
                <div class="brand-tag">Current Permission Codes</div>
                <p>{{ formatPermissionNames(selectedRole) }}</p>
              </div>

              <div v-if="isSuperAdmin" class="panel inset-panel stacked-gap">
                <div class="brand-tag">Safety Rule</div>
                <p>The `super_admin` role must retain the full permission set so at least one unrestricted operator always exists.</p>
              </div>
            </template>

            <template v-else>
              <p>No role is selected yet.</p>
            </template>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>
