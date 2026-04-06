<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import {
  type AdminPermissionRecord,
  type AdminRoleEditorPayload,
  type AdminRoleCreateInput,
  type AdminRoleListItem,
  type AdminRoleUpdateInput
} from "@tgo/shared";

import { adminFetch, adminRequest, getValidationIssues } from "../lib/api";
import { formatDateTime, slugify } from "../lib/format";

interface RoleFormState extends AdminRoleUpdateInput {
  code: string;
}

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

const route = useRoute();
const router = useRouter();

const createBlankForm = (): RoleFormState => ({
  code: "",
  name: "",
  description: "",
  permissionIds: []
});

const form = reactive<RoleFormState>(createBlankForm());
const role = ref<AdminRoleListItem | null>(null);
const permissions = ref<AdminPermissionRecord[]>([]);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const fieldIssues = ref<Record<string, string>>({});
const codeTouched = ref(false);

const roleId = computed(() => (typeof route.params.id === "string" ? route.params.id : ""));
const isNew = computed(() => roleId.value.length === 0);
const pageTitle = computed(() => (isNew.value ? "新增角色" : `编辑角色：${role.value?.name ?? "加载中..."}`));
const pageReady = computed(() => isNew.value || role.value !== null);
const selectedPermissionCount = computed(() => form.permissionIds.length);
const isSuperAdmin = computed(() => role.value?.code === "super_admin");
const roleMetaItems = computed(() => [
  {
    label: "角色代码",
    value: form.code || "待填写"
  },
  {
    label: "角色类型",
    value: role.value ? (role.value.isSystem ? "系统角色" : "自定义角色") : "待创建"
  },
  {
    label: "工作人员数",
    value: role.value ? String(role.value.assignedStaffCount) : "-"
  },
  {
    label: "权限数",
    value: String(selectedPermissionCount.value)
  },
  {
    label: "最近更新",
    value: formatDateTime(role.value?.updatedAt)
  }
]);

const formatPermissionResource = (value: string) => resourceLabels[value] ?? value.replace(/_/g, " ");
const toRoleCode = (value: string) => slugify(value).replace(/-/g, "_");

const loadPermissions = async () => {
  const payload = await adminFetch<Pick<AdminRoleEditorPayload, "permissions">>("/api/admin/v1/roles/references");
  permissions.value = payload.permissions;
};

const applyRole = (value: AdminRoleListItem | null) => {
  role.value = value;

  if (!value) {
    Object.assign(form, createBlankForm());
    codeTouched.value = false;
    return;
  }

  Object.assign(form, {
    code: value.code,
    name: value.name,
    description: value.description,
    permissionIds: [...value.permissionIds]
  });
  codeTouched.value = true;
};

const loadPage = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    await loadPermissions();

    if (isNew.value) {
      applyRole(null);
      return;
    }

    applyRole(await adminFetch<AdminRoleListItem>(`/api/admin/v1/roles/${roleId.value}`));
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载角色信息。";
  } finally {
    loading.value = false;
  }
};

const onNameInput = () => {
  if (isNew.value && !codeTouched.value) {
    form.code = toRoleCode(form.name);
  }
};

const onCodeInput = () => {
  codeTouched.value = true;
  form.code = form.code
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
};

const toCreatePayload = (): AdminRoleCreateInput => ({
  code: form.code,
  name: form.name,
  description: form.description,
  permissionIds: [...form.permissionIds]
});

const toUpdatePayload = (): AdminRoleUpdateInput => ({
  name: form.name,
  description: form.description,
  permissionIds: [...form.permissionIds]
});

const save = async () => {
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  fieldIssues.value = {};

  try {
    const saved = await adminRequest<AdminRoleListItem>(isNew.value ? "/api/admin/v1/roles" : `/api/admin/v1/roles/${roleId.value}`, {
      method: isNew.value ? "POST" : "PATCH",
      body: isNew.value ? toCreatePayload() : toUpdatePayload()
    });

    if (isNew.value) {
      await router.replace({
        name: "role-edit",
        params: {
          id: saved.id
        }
      });
      return;
    }

    applyRole(saved);
    successMessage.value = "角色已保存。";
  } catch (error) {
    fieldIssues.value = getValidationIssues(error);
    errorMessage.value = error instanceof Error ? error.message : "无法保存角色。";
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
        <RouterLink class="button-link" to="/roles">返回列表</RouterLink>
        <button class="button-link button-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "保存中..." : isNew ? "创建角色" : "保存角色" }}
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
      <p>正在准备角色编辑器...</p>
    </div>

    <template v-else-if="pageReady">
      <div class="editor-grid editor-grid-focus">
        <div class="panel panel-compact editor-main stacked-gap">
          <section class="editor-section editor-section-compact stacked-gap">
            <div class="editor-section-head">
              <h3>基础信息</h3>
            </div>

            <div class="field-grid field-grid-2">
              <label class="field">
                <span>角色名称</span>
                <input v-model="form.name" type="text" placeholder="社区运营" @input="onNameInput" />
                <small v-if="fieldIssues.name" class="field-error">{{ fieldIssues.name }}</small>
              </label>

              <label v-if="isNew" class="field">
                <span>角色代码</span>
                <input v-model="form.code" type="text" placeholder="community_operator" @input="onCodeInput" />
                <small class="field-hint">仅支持小写字母、数字与下划线。</small>
                <small v-if="fieldIssues.code" class="field-error">{{ fieldIssues.code }}</small>
              </label>

              <div v-else class="info-card compact-info-card">
                <span>角色代码</span>
                <strong>{{ form.code }}</strong>
                <p>角色代码创建后保持不变。</p>
              </div>
            </div>

            <label class="field">
              <span>描述</span>
              <textarea v-model="form.description" rows="3" placeholder="说明该角色负责的后台工作范围。"></textarea>
              <small v-if="fieldIssues.description" class="field-error">{{ fieldIssues.description }}</small>
            </label>
          </section>

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
        </div>

        <aside class="editor-side stacked-gap">
          <div class="panel panel-compact summary-panel stacked-gap-tight">
            <div class="panel-toolbar">
              <h3>当前信息</h3>
              <span class="status-pill">{{ role?.isSystem ? "系统角色" : "自定义角色" }}</span>
            </div>

            <div class="summary-list summary-list-compact">
              <div v-for="item in roleMetaItems" :key="item.label" class="summary-row">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>

          <div v-if="isSuperAdmin" class="panel panel-compact inset-panel stacked-gap-tight">
            <p>超级管理员必须保留完整权限集。</p>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>
