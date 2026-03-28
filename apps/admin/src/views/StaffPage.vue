<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

import {
  staffAccountStatusOptions,
  type AdminRoleSummary,
  type AdminStaffCreateInput,
  type AdminStaffListItem,
  type AdminStaffListPayload,
  type AdminStaffUpdateInput
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatDateTime } from "../lib/format";

const rows = ref<AdminStaffListItem[]>([]);
const roles = ref<AdminRoleSummary[]>([]);
const loading = ref(true);
const creating = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const createIssues = ref<Record<string, string>>({});
const editIssues = ref<Record<string, string>>({});
const selectedStaffId = ref("");

const createForm = reactive<AdminStaffCreateInput>({
  email: "",
  name: "",
  password: "",
  status: "active",
  roleIds: [],
  notes: ""
});

const editForm = reactive<AdminStaffUpdateInput>({
  email: "",
  name: "",
  status: "active",
  roleIds: [],
  notes: ""
});

const activeCount = computed(() => rows.value.filter((row) => row.status === "active").length);
const invitedCount = computed(() => rows.value.filter((row) => row.status === "invited").length);
const selectedStaff = computed(() => rows.value.find((row) => row.id === selectedStaffId.value) ?? null);

const clearFeedback = () => {
  errorMessage.value = "";
  successMessage.value = "";
};

const resetCreateForm = () => {
  createForm.email = "";
  createForm.name = "";
  createForm.password = "";
  createForm.status = "active";
  createForm.roleIds = [];
  createForm.notes = "";
};

const applySelectedStaff = (staff: AdminStaffListItem | null) => {
  if (!staff) {
    editForm.email = "";
    editForm.name = "";
    editForm.status = "active";
    editForm.roleIds = [];
    editForm.notes = "";
    return;
  }

  editForm.email = staff.email;
  editForm.name = staff.name;
  editForm.status = staff.status;
  editForm.roleIds = staff.roles.map((role) => role.id);
  editForm.notes = staff.notes;
};

const loadStaff = async (preferredStaffId?: string) => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const payload = await adminFetch<AdminStaffListPayload>("/api/admin/v1/staff");
    rows.value = payload.staff;
    roles.value = payload.roles;

    const nextSelectedId =
      preferredStaffId && payload.staff.some((row) => row.id === preferredStaffId)
        ? preferredStaffId
        : selectedStaffId.value && payload.staff.some((row) => row.id === selectedStaffId.value)
          ? selectedStaffId.value
          : payload.staff[0]?.id ?? "";

    selectedStaffId.value = nextSelectedId;
    applySelectedStaff(payload.staff.find((row) => row.id === nextSelectedId) ?? null);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load staff accounts.";
  } finally {
    loading.value = false;
  }
};

const selectStaff = (staff: AdminStaffListItem) => {
  selectedStaffId.value = staff.id;
  editIssues.value = {};
  clearFeedback();
  applySelectedStaff(staff);
};

const createStaff = async () => {
  creating.value = true;
  clearFeedback();
  createIssues.value = {};

  try {
    const created = await adminRequest<AdminStaffListItem>("/api/admin/v1/staff", {
      method: "POST",
      body: createForm
    });

    successMessage.value = `Staff account created for ${created.name}.`;
    resetCreateForm();
    await loadStaff(created.id);
  } catch (error) {
    createIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "Unable to create the staff account.";
  } finally {
    creating.value = false;
  }
};

const saveStaff = async () => {
  if (!selectedStaff.value) {
    return;
  }

  saving.value = true;
  clearFeedback();
  editIssues.value = {};

  try {
    const updated = await adminRequest<AdminStaffListItem>(`/api/admin/v1/staff/${selectedStaff.value.id}`, {
      method: "PATCH",
      body: editForm
    });

    successMessage.value = `Staff account updated for ${updated.name}.`;
    await loadStaff(updated.id);
  } catch (error) {
    editIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "Unable to update the staff account.";
  } finally {
    saving.value = false;
  }
};

const formatRoleNames = (staff: AdminStaffListItem) => staff.roles.map((role) => role.name).join(", ") || "-";

onMounted(() => {
  void loadStaff();
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header">
      <h2>Staff</h2>
      <p>Provision internal operators, control account status, and keep role assignments inside the application schema.</p>
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
      <p>Fetching staff accounts and role references...</p>
    </div>

    <template v-else>
      <div class="panel-grid panel-grid-4">
        <article class="panel stat-panel">
          <div class="brand-tag">Staff</div>
          <strong>{{ rows.length }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Active</div>
          <strong>{{ activeCount }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Invited</div>
          <strong>{{ invitedCount }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">Roles</div>
          <strong>{{ roles.length }}</strong>
        </article>
      </div>

      <div class="editor-grid">
        <div class="panel editor-main stacked-gap">
          <div class="page-header-row compact-row">
            <div>
              <div class="brand-tag">Create Staff</div>
              <h3>New internal account</h3>
              <p class="section-copy">Create a credential-backed user, then attach internal roles and staff status.</p>
            </div>

            <div class="page-actions">
              <button class="button-link button-primary" type="button" :disabled="creating" @click="createStaff">
                {{ creating ? "Creating..." : "Create Staff" }}
              </button>
            </div>
          </div>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>Name</span>
              <input v-model="createForm.name" type="text" placeholder="Operations Lead" />
              <small v-if="createIssues.name" class="field-error">{{ createIssues.name }}</small>
            </label>

            <label class="field">
              <span>Email</span>
              <input v-model="createForm.email" type="email" placeholder="ops@example.com" />
              <small v-if="createIssues.email" class="field-error">{{ createIssues.email }}</small>
            </label>
          </div>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>Temporary Password</span>
              <input v-model="createForm.password" type="password" placeholder="At least 12 characters" />
              <small class="field-hint">This is only used when the email does not already belong to an existing user.</small>
              <small v-if="createIssues.password" class="field-error">{{ createIssues.password }}</small>
            </label>

            <label class="field">
              <span>Status</span>
              <select v-model="createForm.status">
                <option v-for="option in staffAccountStatusOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <small v-if="createIssues.status" class="field-error">{{ createIssues.status }}</small>
            </label>
          </div>

          <label class="field">
            <span>Roles</span>
            <select v-model="createForm.roleIds" multiple>
              <option v-for="role in roles" :key="role.id" :value="role.id">
                {{ role.name }} ({{ role.code }})
              </option>
            </select>
            <small class="field-hint">Assign one or more roles. Effective permissions are derived from these bundles.</small>
            <small v-if="createIssues.roleIds" class="field-error">{{ createIssues.roleIds }}</small>
          </label>

          <label class="field">
            <span>Notes</span>
            <textarea v-model="createForm.notes" rows="4" placeholder="Why this staff account exists, onboarding context, or operational notes."></textarea>
            <small v-if="createIssues.notes" class="field-error">{{ createIssues.notes }}</small>
          </label>
        </div>

        <aside class="editor-side stacked-gap">
          <div class="panel stacked-gap">
            <div class="brand-tag">Edit Staff</div>

            <template v-if="selectedStaff">
              <div class="page-header-row compact-row">
                <div>
                  <h3>{{ selectedStaff.name }}</h3>
                  <p class="section-copy">{{ selectedStaff.email }}</p>
                </div>

                <button class="button-link button-primary" type="button" :disabled="saving" @click="saveStaff">
                  {{ saving ? "Saving..." : "Save Changes" }}
                </button>
              </div>

              <label class="field">
                <span>Name</span>
                <input v-model="editForm.name" type="text" />
                <small v-if="editIssues.name" class="field-error">{{ editIssues.name }}</small>
              </label>

              <label class="field">
                <span>Email</span>
                <input v-model="editForm.email" type="email" />
                <small v-if="editIssues.email" class="field-error">{{ editIssues.email }}</small>
              </label>

              <label class="field">
                <span>Status</span>
                <select v-model="editForm.status">
                  <option v-for="option in staffAccountStatusOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <small v-if="editIssues.status" class="field-error">{{ editIssues.status }}</small>
              </label>

              <label class="field">
                <span>Roles</span>
                <select v-model="editForm.roleIds" multiple>
                  <option v-for="role in roles" :key="role.id" :value="role.id">
                    {{ role.name }} ({{ role.code }})
                  </option>
                </select>
                <small v-if="editIssues.roleIds" class="field-error">{{ editIssues.roleIds }}</small>
              </label>

              <label class="field">
                <span>Notes</span>
                <textarea v-model="editForm.notes" rows="5"></textarea>
                <small v-if="editIssues.notes" class="field-error">{{ editIssues.notes }}</small>
              </label>

              <div class="panel inset-panel stacked-gap">
                <div class="info-row">
                  <span>Invited</span>
                  <strong>{{ formatDateTime(selectedStaff.invitedAt) }}</strong>
                </div>
                <div class="info-row">
                  <span>Activated</span>
                  <strong>{{ formatDateTime(selectedStaff.activatedAt) }}</strong>
                </div>
                <div class="info-row">
                  <span>Last login</span>
                  <strong>{{ formatDateTime(selectedStaff.lastLoginAt) }}</strong>
                </div>
              </div>
            </template>

            <template v-else>
              <p>No staff account is selected yet.</p>
            </template>
          </div>
        </aside>
      </div>

      <div class="panel table-panel">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Roles</th>
              <th>Last Login</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>
                <strong>{{ row.name }}</strong>
                <div class="muted-row">{{ row.email }}</div>
              </td>
              <td><span class="status-pill">{{ row.status }}</span></td>
              <td>{{ formatRoleNames(row) }}</td>
              <td>{{ formatDateTime(row.lastLoginAt) }}</td>
              <td>{{ formatDateTime(row.updatedAt) }}</td>
              <td class="table-actions-cell">
                <button class="button-link button-compact" type="button" @click="selectStaff(row)">
                  {{ selectedStaffId === row.id ? "Editing" : "Edit" }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
