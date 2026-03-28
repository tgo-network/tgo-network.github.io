import type { RegistrationState } from "@tgo/shared";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
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
      return "Registration open";
    case "waitlist":
      return "Waitlist";
    case "closed":
      return "Registration closed";
    default:
      return "Registration not open";
  }
};

export const formatCount = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;
