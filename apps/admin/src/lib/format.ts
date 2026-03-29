import {
  adminAssetTypeOptions,
  applicationStatusOptions,
  assetStatusOptions,
  assetVisibilityOptions,
  contentStatusOptions,
  eventRegistrationStateOptions,
  eventRegistrationStatusOptions,
  staffAccountStatusOptions,
  type ApplicationStatus,
  type AssetStatus,
  type AssetVisibility,
  type ContentStatus,
  type EventRegistrationState,
  type EventRegistrationStatus,
  type StaffAccountStatus,
  type AdminAssetType
} from "@tgo/shared";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "short",
  day: "numeric"
});

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const formatOptionLabel = <T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: string | null | undefined
) => options.find((option) => option.value === value)?.label ?? value ?? "-";

export const formatDate = (value: string | Date | null | undefined) => {
  if (!value) {
    return "-";
  }

  return dateFormatter.format(new Date(value));
};

export const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) {
    return "-";
  }

  return dateTimeFormatter.format(new Date(value));
};

export const formatBytes = (value: number | null | undefined) => {
  if (!value || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"] as const;
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** exponent;

  return `${amount >= 10 || exponent === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[exponent]}`;
};

export const formatContentStatus = (value: string | ContentStatus | null | undefined) =>
  formatOptionLabel(contentStatusOptions, value);

export const formatEventRegistrationState = (value: string | EventRegistrationState | null | undefined) =>
  formatOptionLabel(eventRegistrationStateOptions, value);

export const formatEventRegistrationStatus = (value: string | EventRegistrationStatus | null | undefined) =>
  formatOptionLabel(eventRegistrationStatusOptions, value);

export const formatApplicationStatus = (value: string | ApplicationStatus | null | undefined) =>
  formatOptionLabel(applicationStatusOptions, value);

export const formatStaffAccountStatus = (value: string | StaffAccountStatus | null | undefined) =>
  formatOptionLabel(staffAccountStatusOptions, value);

export const formatAssetVisibility = (value: string | AssetVisibility | null | undefined) =>
  formatOptionLabel(assetVisibilityOptions, value);

export const formatAssetStatus = (value: string | AssetStatus | null | undefined) =>
  formatOptionLabel(assetStatusOptions, value);

export const formatAdminAssetType = (value: string | AdminAssetType | null | undefined) =>
  formatOptionLabel(adminAssetTypeOptions, value);

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

export const toDateTimeInputValue = (value: string | Date | null | undefined) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return local.toISOString().slice(0, 16);
};
