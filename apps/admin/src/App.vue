<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useRoute } from "vue-router";

import type { AdminMePayload } from "@tgo/shared";
import { platformName } from "@tgo/shared";

import { authClient } from "./lib/auth-client";
import { adminFetch } from "./lib/api";
import { getVisibleAdminModules } from "./lib/navigation";

const route = useRoute();
const router = useRouter();

const showShell = computed(() => route.name !== "login");
const me = ref<AdminMePayload | null>(null);
const loadingMe = ref(false);

const visibleModules = computed(() => {
  return getVisibleAdminModules(me.value, loadingMe.value);
});

const loadMe = async () => {
  if (!showShell.value) {
    return;
  }

  loadingMe.value = true;

  try {
    me.value = await adminFetch<AdminMePayload>("/api/admin/v1/me");
  } catch {
    me.value = null;
  } finally {
    loadingMe.value = false;
  }
};

const signOut = async () => {
  await authClient.signOut();
  me.value = null;
  await router.push("/login");
};

watch(
  () => route.fullPath,
  () => {
    void loadMe();
  }
);

onMounted(() => {
  void loadMe();
});
</script>

<template>
  <router-view v-if="!showShell" />

  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-tag">管理后台 MVP</span>
        <h1>{{ platformName }}</h1>
        <p>
          面向工作人员的运营控制台，用于管理内容、员工权限、申请、资源与站点配置。
        </p>
      </div>

      <nav class="nav">
        <router-link
          v-for="item in visibleModules"
          :key="item.to"
          :to="item.to"
          class="nav-link"
        >
          {{ item.label }}
        </router-link>
      </nav>

      <button class="nav-link nav-button" type="button" @click="signOut">
        退出登录
      </button>
    </aside>

    <main class="main">
      <router-view />
    </main>
  </div>
</template>
