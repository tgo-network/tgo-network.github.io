import type { RegistrationState } from "@tgo/shared";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "short",
  day: "numeric"
});

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

export const formatDate = (value: string) => dateFormatter.format(new Date(value));

export const formatDateRange = (startsAt: string, endsAt: string) => {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  return `${dateTimeFormatter.format(start)} - ${dateTimeFormatter.format(end)}`;
};

export const formatRegistrationState = (state: RegistrationState) => {
  switch (state) {
    case "open":
      return "报名开放中";
    case "waitlist":
      return "候补中";
    case "closed":
      return "报名已关闭";
    default:
      return "报名未开放";
  }
};

export const formatCount = (count: number, noun: string) => `${count}${noun}`;
