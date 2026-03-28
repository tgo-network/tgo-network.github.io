<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useRoute } from "vue-router";

import type { AdminMePayload } from "@tgo/shared";
import { adminModules, platformName } from "@tgo/shared";

import { authClient } from "./lib/auth-client";
import { adminFetch } from "./lib/api";

const route = useRoute();
const router = useRouter();

const showShell = computed(() => route.name !== "login");
const me = ref<AdminMePayload | null>(null);
const loadingMe = ref(false);

const visibleModules = computed(() => {
  if (loadingMe.value || !me.value) {
    return adminModules;
  }

  return adminModules.filter((item) => !item.permission || me.value?.permissions.includes(item.permission));
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
        <span class="brand-tag">Admin MVP</span>
        <h1>{{ platformName }}</h1>
        <p>
          Role-aware operations console for content, staff access, permissions, applications, assets, and site configuration.
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
        Sign out
      </button>
    </aside>

    <main class="main">
      <router-view />
    </main>
  </div>
</template>
