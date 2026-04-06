<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

import {
  staffAccountStatusOptions,
  type AdminRoleSummary,
  type AdminStaffCreateInput,
  type AdminStaffListItem,
  type AdminStaffListMeta,
  type AdminStaffListPayload,
  type AdminStaffUpdateInput
} from "@tgo/shared";

import { adminFetchWithMeta, adminRequest, getValidationIssues } from "../lib/api";
import { formatDateTime, formatStaffAccountStatus } from "../lib/format";
import { adminPageSizeOptions, formatPaginationSummary } from "../lib/pagination";

const rows = ref<AdminStaffListItem[]>([]);
const roles = ref<AdminRoleSummary[]>([]);
const loading = ref(true);
const creating = ref(false);
const saving = ref(false);
const hasLoadedOnce = ref(false);
const currentPage = ref(1);
const errorMessage = ref("");
const successMessage = ref("");
const createIssues = ref<Record<string, string>>({});
const editIssues = ref<Record<string, string>>({});
const selectedStaffId = ref("");
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
const editStatusOptions = computed(() =>
  selectedStaff.value?.status === "invited"
    ? [{ value: "invited", label: "待启用（遗留）" }, ...visibleStaffStatusOptions]
    : visibleStaffStatusOptions
);
const roleOptions = computed(() => roles.value);
const formatStaffStatus = (value: string | null | undefined) => (value === "invited" ? "待启用" : formatStaffAccountStatus(value));
const selectedStaffMetaItems = computed(() => [
  {
    label: "邮箱",
    value: selectedStaff.value?.email ?? "-"
  },
  {
    label: "状态",
    value: selectedStaff.value ? formatStaffStatus(selectedStaff.value.status) : "-"
  },
  {
    label: "角色",
    value: selectedStaff.value ? formatRoleNames(selectedStaff.value) : "-"
  },
  {
    label: "最后登录",
    value: formatDateTime(selectedStaff.value?.lastLoginAt)
  }
]);
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
  },
  {
    label: "分页",
    value: `第 ${meta.value.page} / ${meta.value.pageCount} 页`
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

const loadStaff = async (preferredStaffId?: string) => {
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

    const nextSelectedId =
      preferredStaffId && payload.staff.some((row) => row.id === preferredStaffId)
        ? preferredStaffId
        : selectedStaffId.value && payload.staff.some((row) => row.id === selectedStaffId.value)
          ? selectedStaffId.value
          : payload.staff[0]?.id ?? "";

    selectedStaffId.value = nextSelectedId;
    applySelectedStaff(payload.staff.find((row) => row.id === nextSelectedId) ?? null);
  } catch (error) {
    if (requestId !== activeRequestId) {
      return;
    }

    rows.value = [];
    meta.value = createEmptyMeta(filters.pageSize);
    errorMessage.value = error instanceof Error ? error.message : "无法加载工作人员账号。";
  } finally {
    if (requestId === activeRequestId) {
      loading.value = false;
      hasLoadedOnce.value = true;
    }
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
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel panel-success">
      <p>{{ successMessage }}</p>
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
              <option v-for="option in visibleStaffStatusOptions" :key="option.value" :value="option.value">
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

          <label class="field">
            <span>每页数量</span>
            <select v-model.number="filters.pageSize">
              <option v-for="option in adminPageSizeOptions" :key="option" :value="option">{{ option }} 条</option>
            </select>
          </label>
        </div>
      </div>

      <div class="editor-grid editor-grid-focus">
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
                <tr v-for="row in rows" :key="row.id" :class="{ 'table-row-selected': selectedStaffId === row.id }">
                  <td>
                    <div class="table-cell-stack">
                      <strong>{{ row.name }}</strong>
                      <div class="muted-row">{{ row.email }}</div>
                    </div>
                  </td>
                  <td><span class="status-pill">{{ formatStaffStatus(row.status) }}</span></td>
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

            <div class="pagination-panel">
              <div class="filter-summary">{{ paginationSummary }}</div>

              <div class="pagination-actions">
                <button class="button-link" type="button" :disabled="loading || meta.page <= 1" @click="currentPage = meta.page - 1; void loadStaff()">
                  上一页
                </button>
                <button
                  class="button-link"
                  type="button"
                  :disabled="loading || meta.page >= meta.pageCount"
                  @click="currentPage = meta.page + 1; void loadStaff()"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside class="editor-side stacked-gap">
          <div class="panel panel-compact editor-side-card">
            <template v-if="selectedStaff">
              <div class="panel-toolbar">
                <h3>编辑 Staff</h3>
                <button class="button-link button-primary" type="button" :disabled="saving" @click="saveStaff">
                  {{ saving ? "保存中..." : "保存修改" }}
                </button>
              </div>

              <div class="summary-list">
                <div v-for="item in selectedStaffMetaItems" :key="item.label" class="summary-row">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
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
                  <option v-for="option in editStatusOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <small v-if="editIssues.status" class="field-error">{{ editIssues.status }}</small>
              </label>

              <section class="editor-section editor-section-compact stacked-gap">
                <div class="panel-toolbar">
                  <h3>角色</h3>
                  <div class="filter-summary">已选 {{ editForm.roleIds.length }}</div>
                </div>

                <div class="selection-grid selection-grid-2">
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
                <small v-if="editIssues.roleIds" class="field-error">{{ editIssues.roleIds }}</small>
              </section>

              <label class="field">
                <span>备注</span>
                <textarea v-model="editForm.notes" rows="5"></textarea>
                <small v-if="editIssues.notes" class="field-error">{{ editIssues.notes }}</small>
              </label>
            </template>

            <template v-else>
              <h3>编辑 Staff</h3>
              <p>请先从列表中选择一个账号。</p>
            </template>
          </div>

          <div class="panel panel-compact editor-side-card">
            <div class="panel-toolbar">
              <h3>新增 Staff</h3>
              <button class="button-link button-primary" type="button" :disabled="creating" @click="createStaff">
                {{ creating ? "创建中..." : "创建工作人员" }}
              </button>
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
                <small v-if="createIssues.password" class="field-error">{{ createIssues.password }}</small>
              </label>

              <label class="field">
                <span>状态</span>
                <select v-model="createForm.status">
                  <option v-for="option in visibleStaffStatusOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <small v-if="createIssues.status" class="field-error">{{ createIssues.status }}</small>
              </label>
            </div>

            <section class="editor-section editor-section-compact stacked-gap">
              <div class="panel-toolbar">
                <h3>角色</h3>
                <div class="filter-summary">已选 {{ createForm.roleIds.length }}</div>
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
              <small v-if="createIssues.roleIds" class="field-error">{{ createIssues.roleIds }}</small>
            </section>

            <label class="field">
              <span>备注</span>
              <textarea v-model="createForm.notes" rows="4" placeholder="说明这个工作人员账号的用途。"></textarea>
              <small v-if="createIssues.notes" class="field-error">{{ createIssues.notes }}</small>
            </label>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>
