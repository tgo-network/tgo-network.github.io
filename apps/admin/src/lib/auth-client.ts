import { createAuthClient } from "better-auth/vue";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include"
  }
});
