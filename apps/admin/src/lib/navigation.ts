import type { AdminMePayload } from "@tgo/shared";
import { adminModules } from "@tgo/shared";

export const getVisibleAdminModules = (me: AdminMePayload | null, loading: boolean) => {
  if (loading || !me) {
    return adminModules;
  }

  return adminModules.filter((item) => !item.permission || me.permissions.includes(item.permission));
};
