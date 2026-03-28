type ImportMetaEnvWithApiBase = ImportMeta & {
  env?: {
    VITE_API_BASE_URL?: string;
  };
};

export const getAdminApiBaseUrl = () =>
  (import.meta as ImportMetaEnvWithApiBase).env?.VITE_API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  "http://localhost:8787";
