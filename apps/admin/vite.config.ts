import { execSync } from "node:child_process";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const resolveGitShortSha = () => {
  const explicitSha = process.env.VITE_GIT_SHORT_SHA?.trim();

  if (explicitSha) {
    return explicitSha;
  }

  const githubSha = process.env.GITHUB_SHA?.trim();

  if (githubSha) {
    return githubSha.slice(0, 7);
  }

  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};

export default defineConfig({
  envDir: "../../",
  plugins: [vue()],
  define: {
    __ADMIN_BUILD_SHA__: JSON.stringify(resolveGitShortSha())
  },
  server: {
    port: 5173,
    host: true
  }
});
