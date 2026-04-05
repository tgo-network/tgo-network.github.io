const blockedRegistrationHosts = new Set(["static001.geekbang.org", "static001-test.geekbang.org", "cdn001.geekbang.org"]);
const blockedPathPatterns = [/\/resource\/image\//iu, /\/files\/tgo\//iu, /\/ck\//iu];
const blockedAssetExtensionPattern =
  /\.(?:avif|bmp|doc|docx|gif|heic|ico|jpe?g|pdf|png|ppt|pptx|rar|svg|webp|xls|xlsx|zip)$/iu;
const inlineUrlPattern = /https?:\/\/\S+/giu;
const inlineLinkLabelPattern = /(?:报名|活动|直播|参会)(?:链接|地址)[:：]?(?=\s|$)/gu;
const inlineActionPattern = /点击(?:观看|报名|回放)(?=\s|$)/gu;

export const sanitizeEventRegistrationUrl = (value: string | null | undefined) => {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("/")) {
    return blockedAssetExtensionPattern.test(normalized) ? null : normalized;
  }

  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }

  if (!/^https?:$/iu.test(parsed.protocol) || blockedRegistrationHosts.has(parsed.hostname)) {
    return null;
  }

  if (blockedAssetExtensionPattern.test(parsed.pathname) || blockedPathPatterns.some((pattern) => pattern.test(parsed.pathname))) {
    return null;
  }

  return parsed.toString();
};

export const stripEventDisplayUrls = (value: string | null | undefined) =>
  String(value ?? "")
    .replace(inlineUrlPattern, "")
    .replace(inlineLinkLabelPattern, "")
    .replace(inlineActionPattern, "")
    .replace(/\s+([，。；：、！？])/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();

export const shouldShowExternalRegistrationLink = (
  registrationState: "not_open" | "open" | "waitlist" | "closed",
  registrationUrl: string | null
) => Boolean(registrationUrl) && (registrationState === "open" || registrationState === "waitlist");
