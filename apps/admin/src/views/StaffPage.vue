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
const filters = reactive({
  query: "",
  status: "all",
  roleId: "all"
});

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

const selectedStaff = computed(() => rows.value.find((row) => row.id === selectedStaffId.value) ?? null);
const activeCount = computed(() => rows.value.filter((row) => row.status === "active").length);
const invitedCount = computed(() => rows.value.filter((row) => row.status === "invited").length);
const recentLoginCount = computed(() => rows.value.filter((row) => Boolean(row.lastLoginAt)).length);
const assignedRoleCoverage = computed(() => new Set(rows.value.flatMap((row) => row.roles.map((role) => role.id))).size);
const roleOptions = computed(() => roles.value);
const filteredRows = computed(() => {
  const query = filters.query.trim().toLowerCase();

  return rows.value.filter((row) => {
    const roleNames = row.roles.map((role) => `${role.name} ${role.code}`).join(" ");
    const matchesQuery =
      query.length === 0 ||
      [row.name, row.email, roleNames, formatStaffAccountStatus(row.status)].some((value) => value.toLowerCase().includes(query));
    const matchesStatus = filters.status === "all" || row.status === filters.status;
    const matchesRole = filters.roleId === "all" || row.roles.some((role) => role.id === filters.roleId);

    return matchesQuery && matchesStatus && matchesRole;
  });
});
const summaryCards = computed(() => [
  {
    label: "工作人员",
    value: rows.value.length,
    summary: "当前已经创建的后台工作人员账号总数。"
  },
  {
    label: "启用中",
    value: activeCount.value,
    summary: "可以正常登录后台并处理运营工作的账号。"
  },
  {
    label: "已邀请",
    value: invitedCount.value,
    summary: "已经创建但还未完成首次激活的工作人员账号。"
  },
  {
    label: "角色覆盖",
    value: `${assignedRoleCoverage.value} / ${roles.value.length}`,
    summary: "当前已被工作人员实际使用的角色数量。"
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
    key: "invited",
    label: "已邀请",
    matches: () => filters.status === "invited",
    apply: () => {
      filters.status = "invited";
    }
  },
  {
    key: "suspended",
    label: "已暂停",
    matches: () => filters.status === "suspended",
    apply: () => {
      filters.status = "suspended";
    }
  }
] as const;
const createSelectedRoles = computed(() => roles.value.filter((role) => createForm.roleIds.includes(role.id)));
const editSelectedRoles = computed(() => roles.value.filter((role) => editForm.roleIds.includes(role.id)));
const selectedStaffNote = computed(() => editForm.notes.trim() || "暂未填写工作人员备注。");

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

const formatRoleNames = (staff: AdminStaffListItem) => staff.roles.map((role) => role.name).join(" / ") || "未分配角色";

onMounted(() => {
  void loadStaff();
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header">
      <h2>工作人员</h2>
      <p>创建内部工作人员账号、管理状态与角色分配，并把后台权限模型稳定收敛在应用自身的授权体系里。</p>
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
            <p class="section-copy">可按姓名、邮箱、角色和账号状态快速定位需要调整权限或状态的工作人员。</p>
          </div>
          <div class="info-card">
            <span>最近登录</span>
            <strong>{{ recentLoginCount }}</strong>
            <p>至少登录过一次后台的工作人员账号。</p>
          </div>
        </div>

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

        <div class="field-grid field-grid-3">
          <label class="field">
            <span>搜索</span>
            <input v-model="filters.query" type="search" placeholder="搜索姓名、邮箱、角色或状态" />
          </label>

          <label class="field">
            <span>状态</span>
            <select v-model="filters.status">
              <option value="all">全部状态</option>
              <option v-for="option in staffAccountStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>角色</span>
            <select v-model="filters.roleId">
              <option value="all">全部角色</option>
              <option v-for="role in roleOptions" :key="role.id" :value="role.id">{{ role.name }}</option>
            </select>
          </label>
        </div>
      </div>

      <div class="editor-grid">
        <div class="panel editor-main stacked-gap">
          <div class="page-header-row compact-row">
            <div>
              <div class="brand-tag">创建工作人员</div>
              <h3>新建内部账号</h3>
              <p class="section-copy">先创建可登录的用户，再绑定角色、状态和内部备注，统一进入后台权限体系。</p>
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

          <section class="editor-section stacked-gap">
            <div class="editor-section-head">
              <div class="brand-tag">角色分配</div>
              <h3>给新账号绑定权限包</h3>
              <p>一个工作人员可以绑定多个角色，最终权限会在 API 层根据这些角色汇总计算。</p>
            </div>

            <div class="selection-grid selection-grid-2">
              <label
                v-for="role in roles"
                :key="role.id"
                class="checkbox-row selection-card"
                :class="{ 'is-active': createForm.roleIds.includes(role.id) }"
              >
                <input v-model="createForm.roleIds" type="checkbox" :value="role.id" />
                <div>
                  <strong>{{ role.name }}</strong>
                  <small class="selection-card-code">{{ role.code }}</small>
                </div>
              </label>
            </div>
            <small class="field-hint">当前已选择 {{ createSelectedRoles.length }} 个角色。</small>
            <small v-if="createIssues.roleIds" class="field-error">{{ createIssues.roleIds }}</small>
          </section>

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

              <section class="editor-section stacked-gap">
                <div class="editor-section-head">
                  <div class="brand-tag">角色调整</div>
                  <h3>维护角色组合</h3>
                  <p>角色的增删会直接影响后台路由可见性与 API 权限校验结果。</p>
                </div>

                <div class="selection-grid">
                  <label
                    v-for="role in roles"
                    :key="role.id"
                    class="checkbox-row selection-card"
                    :class="{ 'is-active': editForm.roleIds.includes(role.id) }"
                  >
                    <input v-model="editForm.roleIds" type="checkbox" :value="role.id" />
                    <div>
                      <strong>{{ role.name }}</strong>
                      <small class="selection-card-code">{{ role.code }}</small>
                    </div>
                  </label>
                </div>
                <small class="field-hint">当前已选择 {{ editSelectedRoles.length }} 个角色。</small>
                <small v-if="editIssues.roleIds" class="field-error">{{ editIssues.roleIds }}</small>
              </section>

              <label class="field">
                <span>备注</span>
                <textarea v-model="editForm.notes" rows="5"></textarea>
                <small v-if="editIssues.notes" class="field-error">{{ editIssues.notes }}</small>
              </label>

              <div class="panel inset-panel stacked-gap">
                <div class="info-row">
                  <span>当前状态</span>
                  <strong class="status-pill">{{ formatStaffAccountStatus(selectedStaff.status) }}</strong>
                </div>
                <div class="info-row">
                  <span>角色数量</span>
                  <strong>{{ editSelectedRoles.length }}</strong>
                </div>
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

              <div class="panel inset-panel stacked-gap">
                <div class="brand-tag">角色预览</div>
                <div class="pill-list">
                  <span v-for="role in editSelectedRoles" :key="role.id" class="soft-pill">{{ role.name }}</span>
                  <span v-if="editSelectedRoles.length === 0" class="soft-pill">未分配角色</span>
                </div>
                <p class="table-card-copy">{{ selectedStaffNote }}</p>
              </div>
            </template>

            <template v-else>
              <p>还没有选中任何工作人员账号。</p>
            </template>
          </div>
        </aside>
      </div>

      <div v-if="filteredRows.length === 0" class="panel empty-state-card">
        <div class="brand-tag">暂无结果</div>
        <p>当前筛选条件下没有匹配的工作人员账号，试试放宽关键词或切换角色条件。</p>
      </div>

      <div v-else class="panel table-panel">
        <div class="table-card-head">
          <div>
            <h3>工作人员列表</h3>
            <p class="table-card-copy">集中查看账号状态、角色分配与最近登录情况，便于快速定位需要维护的后台账号。</p>
          </div>

          <span class="status-pill">当前结果 {{ filteredRows.length }} 位</span>
        </div>

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
            <tr v-for="row in filteredRows" :key="row.id" :class="{ 'table-row-selected': selectedStaffId === row.id }">
              <td>
                <div class="table-cell-stack">
                  <strong>{{ row.name }}</strong>
                  <div class="muted-row">{{ row.email }}</div>
                </div>
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
