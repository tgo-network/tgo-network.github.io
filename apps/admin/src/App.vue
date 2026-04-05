<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";

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

const visibleModules = computed(() => getVisibleAdminModules(me.value, loadingMe.value));

const moduleGroupDefinitions = [
  {
    key: "operations",
    label: "运营",
    routes: ["/dashboard", "/articles", "/events", "/applications"]
  },
  {
    key: "organization",
    label: "组织",
    routes: ["/members", "/staff", "/roles"]
  },
  {
    key: "system",
    label: "系统",
    routes: ["/audit-logs"]
  }
] as const;

const groupedModules = computed(() =>
  moduleGroupDefinitions
    .map((group) => ({
      ...group,
      items: visibleModules.value.filter((item) => group.routes.some((routePath) => routePath === item.to))
    }))
    .filter((group) => group.items.length > 0)
);

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
      <div class="sidebar-inner">
        <div class="sidebar-brand">
          <div class="brand-mark">TGO</div>

          <div class="sidebar-brand-copy">
            <strong>{{ platformName }}</strong>
            <span>工作人员后台</span>
          </div>
        </div>

        <div class="sidebar-nav-groups">
          <section v-for="group in groupedModules" :key="group.key" class="nav-group">
            <div class="nav-group-title">{{ group.label }}</div>

            <nav class="nav" :aria-label="`${group.label}导航`">
              <router-link
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                class="nav-link"
              >
                {{ item.label }}
              </router-link>
            </nav>
          </section>
        </div>

        <div class="sidebar-footer">
          <div class="sidebar-account">
            <strong>{{ me?.user?.name ?? "工作人员" }}</strong>
            <span>{{ me?.user?.email ?? (loadingMe ? "正在同步账户信息" : "未读取到账户信息") }}</span>
          </div>

          <button class="nav-link nav-button" type="button" @click="signOut">退出登录</button>
        </div>
      </div>
    </aside>

    <main class="main">
      <router-view />
    </main>
  </div>
</template>
