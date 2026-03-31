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
        <div class="brand-tag">工作人员后台</div>
        <div class="login-hero-copy">
          <h1>工作人员登录</h1>
          <p>
            进入运营控制台后，可以继续维护公开站点的组织表达、活动审核队列、成员信息与工作人员权限。
          </p>
        </div>

        <div class="login-highlight-grid">
          <article class="login-highlight-card">
            <span>内容运营</span>
            <strong>文章、活动与首页表达</strong>
            <p>保证公开站点始终围绕分会、成员、活动与加入这条主线持续更新。</p>
          </article>

          <article class="login-highlight-card">
            <span>审核队列</span>
            <strong>加入申请与活动报名</strong>
            <p>公开入口负责收集信息，最终通过与否仍在后台审核中统一完成。</p>
          </article>

          <article class="login-highlight-card">
            <span>权限边界</span>
            <strong>工作人员与角色配置</strong>
            <p>成员和工作人员完全分离，后台权限只通过工作人员账号与角色生效。</p>
          </article>
        </div>
      </aside>

      <section class="panel login-card">
        <div class="login-card-head">
          <div class="brand-tag">Better Auth</div>
          <h2>登录控制台</h2>
          <p class="login-card-copy">
            后台已接入 Better Auth 邮箱密码登录。完成本地初始化后，这个表单可以直接用于真实工作人员登录。
          </p>
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
