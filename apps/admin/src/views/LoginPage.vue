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

const signIn = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await authClient.signIn.email({
      email: form.email,
      password: form.password
    });

    if (result.error) {
      errorMessage.value = result.error.message ?? "Unable to sign in.";
      return;
    }

    await router.push("/dashboard");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to sign in.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <main
    style="
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
    "
  >
    <section class="panel" style="width: min(440px, 100%);">
      <div class="brand-tag">Better Auth</div>
      <h1 style="margin: 14px 0 10px;">Staff Login</h1>
      <p style="margin: 0 0 16px;">
        The admin app is now wired for the Better Auth email/password flow. Once
        the backend has a real database and a bootstrapped admin account, this
        form can authenticate actual operators.
      </p>

      <p style="margin: 0 0 16px; color: var(--muted);">
        Local bootstrap defaults: <code>admin@tgo.local</code> /
        <code>TgoAdmin123456!</code>
      </p>

      <form
        @submit.prevent="signIn"
        style="display: grid; gap: 12px;"
      >
        <label style="display: grid; gap: 6px;">
          <span>Email</span>
          <input
            v-model="form.email"
            type="email"
            autocomplete="email"
            required
            style="min-height: 44px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--line);"
          />
        </label>

        <label style="display: grid; gap: 6px;">
          <span>Password</span>
          <input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            required
            style="min-height: 44px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--line);"
          />
        </label>

        <button
          type="submit"
          :disabled="loading"
          class="nav-link router-link-active"
          style="cursor: pointer;"
        >
          {{ loading ? "Signing in..." : "Sign in" }}
        </button>
      </form>

      <p v-if="errorMessage" style="margin: 14px 0 0; color: #9f2d22;">
        {{ errorMessage }}
      </p>
    </section>
  </main>
</template>
