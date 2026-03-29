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
import { formatDateTime, formatStaffAccountStatus } from "../lib/format";

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
    errorMessage.value = error instanceof Error ? error.message : "无法加载工作人员账号。";
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

    successMessage.value = `已为 ${created.name} 创建工作人员账号。`;
    resetCreateForm();
    await loadStaff(created.id);
  } catch (error) {
    createIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "无法创建工作人员账号。";
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

    successMessage.value = `已更新 ${updated.name} 的工作人员账号。`;
    await loadStaff(updated.id);
  } catch (error) {
    editIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "无法更新工作人员账号。";
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
      <h2>工作人员</h2>
      <p>创建内部工作人员账号、管理账户状态，并把角色分配收敛在应用自身的权限模型中。</p>
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
      <p>正在加载工作人员账号与角色信息...</p>
    </div>

    <template v-else>
      <div class="panel-grid panel-grid-4">
        <article class="panel stat-panel">
          <div class="brand-tag">工作人员</div>
          <strong>{{ rows.length }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">启用中</div>
          <strong>{{ activeCount }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">已邀请</div>
          <strong>{{ invitedCount }}</strong>
        </article>
        <article class="panel stat-panel">
          <div class="brand-tag">角色</div>
          <strong>{{ roles.length }}</strong>
        </article>
      </div>

      <div class="editor-grid">
        <div class="panel editor-main stacked-gap">
          <div class="page-header-row compact-row">
            <div>
              <div class="brand-tag">创建工作人员</div>
              <h3>新建内部账号</h3>
              <p class="section-copy">先创建具备登录凭证的用户，再绑定内部角色与工作人员状态。</p>
            </div>

            <div class="page-actions">
              <button class="button-link button-primary" type="button" :disabled="creating" @click="createStaff">
                {{ creating ? "创建中..." : "创建工作人员" }}
              </button>
            </div>
          </div>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>姓名</span>
              <input v-model="createForm.name" type="text" placeholder="运营负责人" />
              <small v-if="createIssues.name" class="field-error">{{ createIssues.name }}</small>
            </label>

            <label class="field">
              <span>邮箱</span>
              <input v-model="createForm.email" type="email" placeholder="ops@example.com" />
              <small v-if="createIssues.email" class="field-error">{{ createIssues.email }}</small>
            </label>
          </div>

          <div class="field-grid field-grid-2">
            <label class="field">
              <span>临时密码</span>
              <input v-model="createForm.password" type="password" placeholder="至少 12 个字符" />
              <small class="field-hint">只有当该邮箱尚未绑定现有用户时，才会使用这个密码。</small>
              <small v-if="createIssues.password" class="field-error">{{ createIssues.password }}</small>
            </label>

            <label class="field">
              <span>状态</span>
              <select v-model="createForm.status">
                <option v-for="option in staffAccountStatusOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <small v-if="createIssues.status" class="field-error">{{ createIssues.status }}</small>
            </label>
          </div>

          <label class="field">
            <span>角色</span>
            <select v-model="createForm.roleIds" multiple>
              <option v-for="role in roles" :key="role.id" :value="role.id">
                {{ role.name }} ({{ role.code }})
              </option>
            </select>
            <small class="field-hint">可以分配一个或多个角色，最终生效权限会从这些角色包中计算得出。</small>
            <small v-if="createIssues.roleIds" class="field-error">{{ createIssues.roleIds }}</small>
          </label>

          <label class="field">
            <span>备注</span>
            <textarea v-model="createForm.notes" rows="4" placeholder="说明这个工作人员账号的用途、背景或运营备注。"></textarea>
            <small v-if="createIssues.notes" class="field-error">{{ createIssues.notes }}</small>
          </label>
        </div>

        <aside class="editor-side stacked-gap">
          <div class="panel stacked-gap">
            <div class="brand-tag">编辑工作人员</div>

            <template v-if="selectedStaff">
              <div class="page-header-row compact-row">
                <div>
                  <h3>{{ selectedStaff.name }}</h3>
                  <p class="section-copy">{{ selectedStaff.email }}</p>
                </div>

                <button class="button-link button-primary" type="button" :disabled="saving" @click="saveStaff">
                  {{ saving ? "保存中..." : "保存修改" }}
                </button>
              </div>

              <label class="field">
                <span>姓名</span>
                <input v-model="editForm.name" type="text" />
                <small v-if="editIssues.name" class="field-error">{{ editIssues.name }}</small>
              </label>

              <label class="field">
                <span>邮箱</span>
                <input v-model="editForm.email" type="email" />
                <small v-if="editIssues.email" class="field-error">{{ editIssues.email }}</small>
              </label>

              <label class="field">
                <span>状态</span>
                <select v-model="editForm.status">
                  <option v-for="option in staffAccountStatusOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <small v-if="editIssues.status" class="field-error">{{ editIssues.status }}</small>
              </label>

              <label class="field">
                <span>角色</span>
                <select v-model="editForm.roleIds" multiple>
                  <option v-for="role in roles" :key="role.id" :value="role.id">
                    {{ role.name }} ({{ role.code }})
                  </option>
                </select>
                <small v-if="editIssues.roleIds" class="field-error">{{ editIssues.roleIds }}</small>
              </label>

              <label class="field">
                <span>备注</span>
                <textarea v-model="editForm.notes" rows="5"></textarea>
                <small v-if="editIssues.notes" class="field-error">{{ editIssues.notes }}</small>
              </label>

              <div class="panel inset-panel stacked-gap">
                <div class="info-row">
                  <span>邀请时间</span>
                  <strong>{{ formatDateTime(selectedStaff.invitedAt) }}</strong>
                </div>
                <div class="info-row">
                  <span>激活时间</span>
                  <strong>{{ formatDateTime(selectedStaff.activatedAt) }}</strong>
                </div>
                <div class="info-row">
                  <span>最后登录</span>
                  <strong>{{ formatDateTime(selectedStaff.lastLoginAt) }}</strong>
                </div>
              </div>
            </template>

            <template v-else>
              <p>还没有选中任何工作人员账号。</p>
            </template>
          </div>
        </aside>
      </div>

      <div class="panel table-panel">
        <table class="data-table">
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
                <strong>{{ row.name }}</strong>
                <div class="muted-row">{{ row.email }}</div>
              </td>
              <td><span class="status-pill">{{ formatStaffAccountStatus(row.status) }}</span></td>
              <td>{{ formatRoleNames(row) }}</td>
              <td>{{ formatDateTime(row.lastLoginAt) }}</td>
              <td>{{ formatDateTime(row.updatedAt) }}</td>
              <td class="table-actions-cell">
                <button class="button-link button-compact" type="button" @click="selectStaff(row)">
                  {{ selectedStaffId === row.id ? "编辑中" : "编辑" }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
