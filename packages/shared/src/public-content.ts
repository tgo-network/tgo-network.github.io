export type RegistrationState = "not_open" | "open" | "waitlist" | "closed";
export type EventRegistrationStatus = "submitted" | "approved" | "rejected" | "waitlisted" | "cancelled";

export interface PublicImageAsset {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export const eventRegistrationStatusOptions: Array<{ value: EventRegistrationStatus; label: string }> = [
  {
    value: "submitted",
    label: "已提交"
  },
  {
    value: "approved",
    label: "已通过"
  },
  {
    value: "rejected",
    label: "已拒绝"
  },
  {
    value: "waitlisted",
    label: "候补中"
  },
  {
    value: "cancelled",
    label: "已取消"
  }
];
