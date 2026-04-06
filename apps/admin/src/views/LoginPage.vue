<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { authClient } from "../lib/auth-client";

const router = useRouter();

const form = reactive({
  email: "",
  password: ""
});

const loading = ref(false);
const errorMessage = ref("");

const localizeAuthErrorMessage = (message: string | null | undefined) => {
  if (!message) {
    return "登录失败，请检查账号信息后重试。";
  }

  if (/[\u4e00-\u9fff]/.test(message)) {
    return message;
  }

  switch (message?.trim()) {
    case "Invalid email or password":
    case "Invalid email or password.":
      return "邮箱或密码错误。";
    case "Email is required":
    case "Email is required.":
      return "请输入邮箱。";
    case "Password is required":
    case "Password is required.":
      return "请输入密码。";
    default:
      return "登录失败，请检查账号信息后重试。";
  }
};

const signIn = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await authClient.signIn.email({
      email: form.email,
      password: form.password
    });

    if (result.error) {
      errorMessage.value = localizeAuthErrorMessage(result.error.message);
      return;
    }

    await router.push("/dashboard");
  } catch (error) {
    errorMessage.value = error instanceof Error ? localizeAuthErrorMessage(error.message) : "登录失败。";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <main class="login-shell">
    <section class="login-layout">
      <aside class="login-hero">
        <div class="brand-tag">TGO鲲鹏会运营后台</div>
        <div class="login-hero-copy">
          <p>统一处理文章、活动、申请、会员与 Staff 的日常维护，保持社区公开信息与后台流程一致。</p>
        </div>

        <div class="login-highlight-list" aria-label="后台主要工作">
          <div class="login-highlight-item">
            <strong>内容维护</strong>
            <span>文章、活动与公开页面内容</span>
          </div>

          <div class="login-highlight-item">
            <strong>审核处理</strong>
            <span>加入申请与活动报名统一在后台完成审核</span>
          </div>

          <div class="login-highlight-item">
            <strong>权限管理</strong>
            <span>Staff 账号与角色权限分开维护</span>
          </div>
        </div>
      </aside>

      <section class="panel login-card">
        <div class="login-card-head">
          <h1>工作人员登录</h1>
          <p class="login-card-copy">使用工作人员账号登录后台。</p>
        </div>

        <div class="login-credential-note">
          <span class="preview-label">本地默认账号</span>
          <p>
            <code>admin@tgo.local</code>
            <span>/</span>
            <code>TgoAdmin123456!</code>
          </p>
        </div>

        <form class="login-form" @submit.prevent="signIn">
          <label class="field">
            <span>邮箱</span>
            <input
              v-model="form.email"
              type="email"
              autocomplete="email"
              required
              placeholder="请输入工作人员邮箱"
            />
          </label>

          <label class="field">
            <span>密码</span>
            <input
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              required
              placeholder="请输入密码"
            />
          </label>

          <button
            type="submit"
            :disabled="loading"
            class="button-link button-primary login-submit"
          >
            {{ loading ? "登录中..." : "登录" }}
          </button>
        </form>

        <p v-if="errorMessage" class="login-error">
          {{ errorMessage }}
        </p>
      </section>
    </section>
  </main>
</template>
