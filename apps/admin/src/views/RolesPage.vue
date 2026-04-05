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
const systemRoleCount = computed(() => roles.value.filter((role) => role.isSystem).length);
const customRoleCount = computed(() => roles.value.filter((role) => !role.isSystem).length);
const assignedStaffTotal = computed(() => roles.value.reduce((total, role) => total + role.assignedStaffCount, 0));
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
const summaryCards = computed(() => [
  {
    label: "角色",
    value: roles.value.length,
    summary: "后台当前可分配给工作人员的全部角色数。"
  },
  {
    label: "权限",
    value: permissions.value.length,
    summary: "角色可组合的原子权限数量。"
  },
  {
    label: "系统角色",
    value: systemRoleCount.value,
    summary: "受系统约束、默认保留的基础角色。"
  },
  {
    label: "已分配工作人员",
    value: assignedStaffTotal.value,
    summary: "当前所有角色累计绑定到的工作人员次数。"
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
const selectedPermissionRecords = computed(() => permissions.value.filter((permission) => form.permissionIds.includes(permission.id)));
const selectedPermissionGroups = computed(() => {
  const grouped = new Map<string, AdminPermissionRecord[]>();

  for (const permission of selectedPermissionRecords.value) {
    const list = grouped.get(permission.resource) ?? [];
    list.push(permission);
    grouped.set(permission.resource, list);
  }

  return Array.from(grouped.entries()).map(([resource, items]) => ({
    resource,
    label: resourceLabels[resource] ?? resource.replace(/_/g, " "),
    items: items.sort((left, right) => left.code.localeCompare(right.code, "en"))
  }));
});
const selectedPermissionCount = computed(() => selectedPermissionRecords.value.length);
const selectedPermissionCodesSummary = computed(
  () => selectedPermissionRecords.value.map((permission) => permission.code).join(" / ") || "无权限"
);
const permissionResourceCount = computed(() => selectedPermissionGroups.value.length);
const roleChecklist = computed(() => [
  {
    label: "角色名称",
    ready: form.name.trim().length > 0,
    hint: "工作人员选择角色时会直接看到名称，建议用组织内统一叫法。"
  },
  {
    label: "角色说明",
    ready: form.description.trim().length > 0,
    hint: "简要解释这个角色适合哪些岗位或流程。"
  },
  {
    label: "权限组合",
    ready: form.permissionIds.length > 0,
    hint: "角色至少要绑定一组权限，才能在后台形成明确能力边界。"
  }
]);
const isSelectedRoleSystem = computed(() => selectedRole.value?.isSystem ?? false);
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
    <header class="page-header">
      <h2>角色</h2>
      <p>集中管理权限组合，通过角色而不是零散授权来控制工作人员后台可见模块与 API 操作边界。</p>
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
            <p class="section-copy">可按角色名称、代码、描述和权限代码快速筛查需要维护的角色定义。</p>
          </div>
          <div class="info-card">
            <span>自定义角色</span>
            <strong>{{ customRoleCount }}</strong>
            <p>非系统保留、可按业务继续调整的角色数量。</p>
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

        <div class="field-grid field-grid-2">
          <label class="field">
            <span>搜索</span>
            <input v-model="filters.query" type="search" placeholder="搜索角色名称、代码、描述或权限代码" />
          </label>

          <label class="field">
            <span>当前范围</span>
            <div class="info-card compact-info-card">
              <span>筛选结果</span>
              <strong>{{ filteredRoles.length }} / {{ roles.length }}</strong>
              <p>当前条件下命中的角色数量。</p>
            </div>
          </label>
        </div>
      </div>

      <div class="editor-grid">
        <div class="panel editor-main stacked-gap">
          <div class="table-card-head">
            <div>
              <h3>角色目录</h3>
              <p class="table-card-copy">优先从角色层统一收口权限，避免直接以工作人员个体维度做零散授权。</p>
            </div>

            <span class="status-pill">当前结果 {{ filteredRoles.length }} 个</span>
          </div>

          <div v-if="filteredRoles.length === 0" class="panel inset-panel empty-state-card">
            <div class="brand-tag">暂无结果</div>
            <p>当前筛选条件下没有匹配的角色，试试放宽关键词或切换筛选范围。</p>
          </div>

          <div v-else class="panel table-panel inset-panel">
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

              <section class="editor-section stacked-gap">
                <div class="editor-section-head">
                  <div class="brand-tag">权限分配</div>
                  <h3>组合后台能力边界</h3>
                  <p>权限真正生效发生在 API 层，这里只负责定义角色应该拥有哪些动作能力。</p>
                </div>

                <div class="selection-grid">
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
                <small class="field-hint">当前已选择 {{ selectedPermissionCount }} 项权限。</small>
                <small v-if="fieldIssues.permissionIds" class="field-error">{{ fieldIssues.permissionIds }}</small>
              </section>

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
                  <span>权限数量</span>
                  <strong>{{ selectedPermissionCount }}</strong>
                </div>
                <div class="info-row">
                  <span>资源范围</span>
                  <strong>{{ permissionResourceCount }}</strong>
                </div>
                <div class="info-row">
                  <span>更新时间</span>
                  <strong>{{ formatDateTime(selectedRole.updatedAt) }}</strong>
                </div>
              </div>

              <div class="panel inset-panel stacked-gap">
                <div class="brand-tag">权限分布</div>
                <div class="selection-summary-list">
                  <article v-for="group in selectedPermissionGroups" :key="group.resource" class="selection-summary-card">
                    <strong>{{ group.label }}</strong>
                    <small>{{ group.items.length }} 项权限</small>
                    <p>{{ group.items.map((item) => item.code).join(" / ") }}</p>
                  </article>
                  <article v-if="selectedPermissionGroups.length === 0" class="selection-summary-card">
                    <strong>尚未分配权限</strong>
                    <p>选中权限后，这里会按资源展示当前角色的能力范围。</p>
                  </article>
                </div>
              </div>

              <div class="panel inset-panel stacked-gap">
                <div class="brand-tag">当前权限代码</div>
                <div class="pill-list">
                  <span v-for="code in selectedPermissionRecords.map((permission) => permission.code)" :key="code" class="soft-pill">{{ code }}</span>
                  <span v-if="selectedPermissionCount === 0" class="soft-pill">无权限</span>
                </div>
                <p class="table-card-copy">{{ selectedPermissionCodesSummary }}</p>
              </div>

              <ul class="checklist">
                <li v-for="item in roleChecklist" :key="item.label">
                  <span class="checklist-indicator" :class="item.ready ? 'is-ready' : 'is-pending'"></span>
                  <div>
                    <strong>{{ item.label }}</strong>
                    <small>{{ item.hint }}</small>
                  </div>
                </li>
              </ul>

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
