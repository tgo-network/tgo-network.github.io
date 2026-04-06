<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import type { AdminEventRegistrationListItemV2, AdminEventRegistrationListPayloadV2 } from "@tgo/shared";

import { adminFetch } from "../lib/api";
import { formatDateTime, formatEventRegistrationStatus } from "../lib/format";

const route = useRoute();

const loading = ref(true);
const errorMessage = ref("");
const eventTitle = ref("活动报名");
const eventId = ref("");
const eventSlug = ref("");
const registrations = ref<AdminEventRegistrationListItemV2[]>([]);

const reviewedCount = computed(() => registrations.value.filter((row) => row.reviewedAt).length);
const summaryChips = computed(() => [
  {
    label: "活动标识",
    value: eventSlug.value || "-"
  },
  {
    label: "报名数",
    value: `${registrations.value.length} 条`
  },
  {
    label: "已审核",
    value: `${reviewedCount.value} 条`
  },
  {
    label: "待处理",
    value: `${registrations.value.length - reviewedCount.value} 条`
  }
]);

const loadRegistrations = async () => {
  const nextEventId = typeof route.params.id === "string" ? route.params.id : "";
  eventId.value = nextEventId;
  loading.value = true;
  errorMessage.value = "";

  try {
    const payload = await adminFetch<AdminEventRegistrationListPayloadV2>(`/api/admin/v1/events/${nextEventId}/registrations`);
    eventTitle.value = payload.event.title;
    eventSlug.value = payload.event.slug;
    registrations.value = payload.registrations;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "无法加载活动报名列表。";
  } finally {
    loading.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    void loadRegistrations();
  }
);

onMounted(() => {
  void loadRegistrations();
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

    <div v-else-if="loading" class="panel">
      <p>正在加载活动报名...</p>
    </div>

    <template v-else>
      <div class="summary-chip-row">
        <div v-for="item in summaryChips" :key="item.label" class="summary-chip">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>

      <div v-if="registrations.length === 0" class="panel">
        <p>这场活动暂时还没有收到报名提交。</p>
      </div>

      <div v-else class="panel panel-compact table-panel">
        <table class="data-table">
          <thead>
            <tr>
              <th>报名人</th>
              <th>联系方式</th>
              <th>公司 / 职称</th>
              <th>状态</th>
              <th>提交时间</th>
              <th>审核时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in registrations" :key="row.id">
              <td><strong>{{ row.name }}</strong></td>
              <td>
                <div>{{ row.phoneNumber }}</div>
                <div class="muted-row">{{ row.wechatId || row.email || "未填写微信或邮箱" }}</div>
              </td>
              <td>{{ row.company || "-" }} · {{ row.title || "-" }}</td>
              <td><span class="status-pill">{{ formatEventRegistrationStatus(row.status) }}</span></td>
              <td>{{ formatDateTime(row.createdAt) }}</td>
              <td>{{ formatDateTime(row.reviewedAt) }}</td>
              <td class="table-actions-cell">
                <RouterLink class="table-link" :to="`/registrations/${row.id}`">审核</RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
