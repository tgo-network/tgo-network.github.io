import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  vite: {
    envDir: "../../"
  },
  server: {
    port: 4321,
    host: true
  }
});
