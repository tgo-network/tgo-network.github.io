<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import type {
  AdminEventRegistrationListItemV2,
  AdminEventRegistrationListMetaV2,
  AdminEventRegistrationListPayloadV2
} from "@tgo/shared";

import { adminFetchWithMeta } from "../lib/api";
import { formatDateTime, formatEventRegistrationStatus } from "../lib/format";
import { adminPageSizeOptions, formatPaginationSummary } from "../lib/pagination";

const route = useRoute();

const loading = ref(true);
const errorMessage = ref("");
const hasLoadedOnce = ref(false);
const currentPage = ref(1);
const pageSize = ref(adminPageSizeOptions[0]);
const eventTitle = ref("活动报名");
const eventId = ref("");
const eventSlug = ref("");
const registrations = ref<AdminEventRegistrationListItemV2[]>([]);
const meta = ref<AdminEventRegistrationListMetaV2>({
  total: 0,
  page: 1,
  pageSize: adminPageSizeOptions[0],
  pageCount: 1,
  reviewedCount: 0,
  pendingCount: 0
});

let activeRequestId = 0;
let fetchTimer: ReturnType<typeof setTimeout> | null = null;

const createEmptyMeta = (nextPageSize: number): AdminEventRegistrationListMetaV2 => ({
  total: 0,
  page: 1,
  pageSize: nextPageSize,
  pageCount: 1,
  reviewedCount: 0,
  pendingCount: 0
});

const summaryChips = computed(() => [
  {
    label: "报名数",
    value: `${meta.value.total} 条`
  },
  {
    label: "待处理",
    value: `${meta.value.pendingCount} 条`
  }
]);
const paginationSummary = computed(() => formatPaginationSummary(meta.value, registrations.value.length));

const buildListPath = (nextEventId: string) => {
  const search = new URLSearchParams();
  search.set("page", String(currentPage.value));
  search.set("pageSize", String(pageSize.value));

  return `/api/admin/v1/events/${nextEventId}/registrations?${search.toString()}`;
};

const loadRegistrations = async () => {
  const nextEventId = typeof route.params.id === "string" ? route.params.id : "";
  const requestId = ++activeRequestId;
  eventId.value = nextEventId;
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await adminFetchWithMeta<AdminEventRegistrationListPayloadV2, AdminEventRegistrationListMetaV2>(
      buildListPath(nextEventId)
    );
    const payload = result.data;

    if (requestId !== activeRequestId) {
      return;
    }

    eventTitle.value = payload.event.title;
    eventSlug.value = payload.event.slug;
    registrations.value = payload.registrations;
    meta.value = result.meta ?? createEmptyMeta(pageSize.value);
    currentPage.value = meta.value.page;
  } catch (error) {
    if (requestId !== activeRequestId) {
      return;
    }

    registrations.value = [];
    meta.value = createEmptyMeta(pageSize.value);
    errorMessage.value = error instanceof Error ? error.message : "无法加载活动报名列表。";
  } finally {
    if (requestId === activeRequestId) {
      loading.value = false;
      hasLoadedOnce.value = true;
    }
  }
};

const changePage = (page: number) => {
  if (loading.value || page < 1 || page > meta.value.pageCount || page === currentPage.value) {
    return;
  }

  currentPage.value = page;
  void loadRegistrations();
};

watch(
  () => route.fullPath,
  () => {
    currentPage.value = 1;
    void loadRegistrations();
  }
);

watch(pageSize, () => {
  if (!hasLoadedOnce.value) {
    return;
  }

  currentPage.value = 1;

  if (fetchTimer) {
    clearTimeout(fetchTimer);
  }

  fetchTimer = setTimeout(() => {
    fetchTimer = null;
    void loadRegistrations();
  }, 150);
});

onMounted(() => {
  void loadRegistrations();
});

onBeforeUnmount(() => {
  if (fetchTimer) {
    clearTimeout(fetchTimer);
  }
});
</script>

<template>
  <section class="stacked-gap">
    <header class="page-header page-header-row">
      <h2>{{ eventTitle }}</h2>

      <div class="page-actions">
        <RouterLink class="button-link" to="/events">返回活动列表</RouterLink>
        <RouterLink v-if="eventId" class="button-link button-primary" :to="`/events/${eventId}/edit`">编辑活动</RouterLink>
      </div>
    </header>

    <div v-if="errorMessage" class="panel panel-danger">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="!hasLoadedOnce && loading" class="panel">
      <p>正在加载活动报名...</p>
    </div>

    <template v-else>
      <div class="panel panel-compact filter-panel filter-panel-compact">
        <div class="filter-toolbar">
          <div class="summary-chip-row">
            <div v-for="item in summaryChips" :key="item.label" class="summary-chip">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <div class="summary-chip">
              <span>活动标识</span>
              <strong>{{ eventSlug || "-" }}</strong>
            </div>
          </div>

          <label class="field">
            <span>每页数量</span>
            <select v-model.number="pageSize">
              <option v-for="option in adminPageSizeOptions" :key="option" :value="option">{{ option }} 条</option>
            </select>
          </label>
        </div>
      </div>

      <div v-if="loading" class="panel">
        <p>正在更新活动报名...</p>
      </div>

      <div v-else-if="meta.total === 0" class="panel">
        <p>这场活动暂时还没有收到报名提交。</p>
      </div>

      <template v-else>
        <div class="panel panel-compact table-panel">
          <div class="table-card-head">
            <h3>报名列表</h3>
            <span class="status-pill">已审核 {{ meta.reviewedCount }} 条</span>
          </div>

          <table class="data-table data-table-event-registration-list">
            <thead>
              <tr>
                <th>报名人</th>
                <th>联系方式</th>
                <th>公司 / 职称</th>
                <th>状态</th>
                <th>时间</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in registrations" :key="row.id">
                <td>
                  <div class="table-cell-stack">
                    <strong>{{ row.name }}</strong>
                    <div class="muted-row">报名编号 {{ row.id }}</div>
                  </div>
                </td>
                <td>
                  <div class="table-cell-stack">
                    <strong>{{ row.phoneNumber }}</strong>
                    <div class="muted-row">{{ row.wechatId || row.email || "未填写微信或邮箱" }}</div>
                  </div>
                </td>
                <td>
                  <div class="table-cell-stack">
                    <strong>{{ row.company || "-" }}</strong>
                    <div class="muted-row">{{ row.title || "-" }}</div>
                  </div>
                </td>
                <td><span class="status-pill">{{ formatEventRegistrationStatus(row.status) }}</span></td>
                <td>
                  <div class="table-cell-stack">
                    <strong>{{ formatDateTime(row.createdAt) }}</strong>
                    <div class="muted-row">审核 {{ formatDateTime(row.reviewedAt) }}</div>
                  </div>
                </td>
                <td class="table-actions-cell">
                  <RouterLink class="table-link" :to="`/registrations/${row.id}`">审核</RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-panel">
          <div class="filter-summary">{{ paginationSummary }}</div>

          <div class="pagination-actions">
            <button class="button-link" type="button" :disabled="loading || meta.page <= 1" @click="changePage(meta.page - 1)">
              上一页
            </button>
            <button class="button-link" type="button" :disabled="loading || meta.page >= meta.pageCount" @click="changePage(meta.page + 1)">
              下一页
            </button>
          </div>
        </div>
      </template>
    </template>
  </section>
</template>
