<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import {
  staffAccountStatusOptions,
  type AdminRoleSummary,
  type AdminStaffCreateInput,
  type AdminStaffListItem,
  type AdminStaffListMeta,
  type AdminStaffListPayload,
  type AdminStaffUpdateInput
} from "@tgo/shared";

import { adminFetch, adminFetchWithMeta, adminRequest, getValidationIssues } from "../lib/api";
import { formatDateTime, formatStaffAccountStatus } from "../lib/format";

interface StaffFormState extends AdminStaffUpdateInput {
  password: string;
}

const route = useRoute();
const router = useRouter();

const createBlankForm = (): StaffFormState => ({
  email: "",
  name: "",
  password: "",
  status: "active",
  roleIds: [],
  notes: ""
});

const form = reactive<StaffFormState>(createBlankForm());
const staff = ref<AdminStaffListItem | null>(null);
const roles = ref<AdminRoleSummary[]>([]);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});

const staffId = computed(() => (typeof route.params.id === "string" ? route.params.id : ""));
const isNew = computed(() => staffId.value.length === 0);
const visibleStaffStatusOptions = staffAccountStatusOptions.filter((option) => option.value !== "invited");
const statusOptions = computed(() =>
  !isNew.value && staff.value?.status === "invited"
    ? [{ value: "invited", label: "待启用（遗留）" }, ...visibleStaffStatusOptions]
    : visibleStaffStatusOptions
);
const pageTitle = computed(() => (isNew.value ? "新增 Staff" : `编辑 Staff：${staff.value?.name ?? "加载中..."}`));
const pageReady = computed(() => isNew.value || staff.value !== null);
const selectedRoleCount = computed(() => form.roleIds.length);
const formatStaffStatus = (value: string | null | undefined) => (value === "invited" ? "待启用" : formatStaffAccountStatus(value));
const metaItems = computed(() => [
  {
    label: "邮箱",
    value: form.email || "待填写"
  },
  {
    label: "状态",
    value: formatStaffStatus(form.status)
  },
  {
    label: "角色",
    value: `${selectedRoleCount.value} 项`
  },
  {
    label: "最后登录",
    value: formatDateTime(staff.value?.lastLoginAt)
  },
  {
    label: "创建时间",
    value: formatDateTime(staff.value?.createdAt)
  },
  {
    label: "最近更新",
    value: formatDateTime(staff.value?.updatedAt)
  }
]);

const loadRoleOptions = async () => {
  const payload = await adminFetchWithMeta<AdminStaffListPayload, AdminStaffListMeta>("/api/admin/v1/staff?page=1&pageSize=1");
  roles.value = payload.data.roles;
};

const applyStaff = (value: AdminStaffListItem | null) => {
  staff.value = value;

  if (!value) {
    Object.assign(form, createBlankForm());
    return;
  }

  Object.assign(form, {
    email: value.email,
    name: value.name,
    password: "",
    status: value.status,
    roleIds: value.roles.map((role) => role.id),
    notes: value.notes
  });
};

const loadPage = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    await loadRoleOptions();

    if (isNew.value) {
      applyStaff(null);
      return;
    }

    applyStaff(await adminFetch<AdminStaffListItem>(`/api/admin/v1/staff/${staffId.value}`));
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载 Staff 信息。";
  } finally {
    loading.value = false;
  }
};

const toCreatePayload = (): AdminStaffCreateInput => ({
  email: form.email,
  name: form.name,
  password: form.password,
  status: form.status,
  roleIds: [...form.roleIds],
  notes: form.notes
});

const toUpdatePayload = (): AdminStaffUpdateInput => ({
  email: form.email,
  name: form.name,
  status: form.status,
  roleIds: [...form.roleIds],
  notes: form.notes
});

const save = async () => {
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const saved = await adminRequest<AdminStaffListItem>(isNew.value ? "/api/admin/v1/staff" : `/api/admin/v1/staff/${staffId.value}`, {
      method: isNew.value ? "POST" : "PATCH",
      body: isNew.value ? toCreatePayload() : toUpdatePayload()
    });

    if (isNew.value) {
      await router.replace({
        name: "staff-edit",
        params: {
          id: saved.id
        }
      });
      return;
    }

    applyStaff(saved);
    successMessage.value = "Staff 已保存。";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "无法保存 Staff。";
  } finally {
    saving.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    void loadPage();
  }
);

onMounted(() => {
  void loadPage();
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <h2>{{ pageTitle }}</h2>

      <div class="page-actions page-actions-compact">
        <RouterLink class="button-link" to="/staff">返回 Staff 列表</RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : isNew ? "创建 Staff" : "保存修改" }}
        </button>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="successMessage" class="panel panel-success">
      <p>{{ successMessage }}</p>
    </div>

    <div v-if="loading" class="panel">
      <p>正在准备 Staff 编辑器...</p>
    </div>

    <template v-else-if="pageReady">
      <div class="editor-grid editor-grid-focus">
        <div class="panel panel-compact editor-main stacked-gap">
          <section class="editor-section editor-section-compact stacked-gap">
            <div class="editor-section-head">
              <h3>基本信息</h3>
            </div>

            <div class="field-grid field-grid-2">
              <label class="field">
                <span>姓名</span>
                <input v-model="form.name" type="text" placeholder="运营负责人" />
                <small v-if="fieldIssues.name" class="field-error">{{ fieldIssues.name }}</small>
              </label>

              <label class="field">
                <span>邮箱</span>
                <input v-model="form.email" type="email" placeholder="ops@example.com" />
                <small v-if="fieldIssues.email" class="field-error">{{ fieldIssues.email }}</small>
              </label>
            </div>

            <div class="field-grid field-grid-2">
              <label class="field">
                <span>状态</span>
                <select v-model="form.status">
                  <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <small v-if="fieldIssues.status" class="field-error">{{ fieldIssues.status }}</small>
              </label>

              <label v-if="isNew" class="field">
                <span>临时密码</span>
                <input v-model="form.password" type="password" placeholder="至少 12 个字符" />
                <small v-if="fieldIssues.password" class="field-error">{{ fieldIssues.password }}</small>
              </label>
            </div>
          </section>

          <section class="editor-section editor-section-compact stacked-gap">
            <div class="panel-toolbar">
              <h3>角色</h3>
              <div class="filter-summary">已选 {{ selectedRoleCount }}</div>
            </div>

            <div class="selection-grid selection-grid-4 selection-grid-tight">
              <label
                v-for="role in roles"
                :key="role.id"
                class="checkbox-row selection-card selection-card-compact"
                :class="{ 'is-active': form.roleIds.includes(role.id) }"
              >
                <input v-model="form.roleIds" type="checkbox" :value="role.id" />
                <div>
                  <strong>{{ role.name }}</strong>
                  <small class="selection-card-code">{{ role.code }}</small>
                </div>
              </label>
            </div>
            <small v-if="fieldIssues.roleIds" class="field-error">{{ fieldIssues.roleIds }}</small>
          </section>

          <label class="field">
            <span>备注</span>
            <textarea v-model="form.notes" rows="4" placeholder="记录该 Staff 账号的职责或使用范围。"></textarea>
            <small v-if="fieldIssues.notes" class="field-error">{{ fieldIssues.notes }}</small>
          </label>
        </div>

        <aside class="editor-side stacked-gap">
          <div class="panel panel-compact summary-panel stacked-gap-tight">
            <h3>当前信息</h3>

            <div class="summary-list summary-list-compact">
              <div v-for="item in metaItems" :key="item.label" class="summary-row">
                <span>{{ item.label }}</span>
                <strong :class="{ 'status-pill': item.label === '状态' }">{{ item.value }}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>
