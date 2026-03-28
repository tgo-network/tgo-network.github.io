import { createAuthClient } from "better-auth/vue";

import { getAdminApiBaseUrl } from "./runtime-config";

export const authClient = createAuthClient({
  baseURL: getAdminApiBaseUrl(),
  fetchOptions: {
    credentials: "include"
  }
});
