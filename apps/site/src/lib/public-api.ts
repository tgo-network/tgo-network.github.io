import type {
  AboutPagePayload,
  ApiErrorShape,
  ApiSuccess,
  BranchDetail,
  JoinApplicationReceipt,
  JoinPagePayload,
  MemberDetail,
  MemberSummary,
  PublicArticleDetailV2,
  PublicArticleSummaryV2,
  PublicEventDetailV2,
  PublicEventListMeta,
  PublicEventListQuery,
  PublicEventListResult,
  PublicEventRegistrationReceiptV2,
  PublicEventSummaryV2,
  PublicHomePayloadV2,
  PublicSiteConfig
} from "@tgo/shared";
import {
  aboutPagePayload,
  branchDetails,
  getBranchDetail,
  getMemberDetail,
  getPublicArticleDetailV2,
  getPublicEventDetailV2,
  joinPagePayload,
  memberSummaries,
  publicArticleSummariesV2,
  publicEventSummariesV2,
  publicHomePayloadV2,
  siteConfig
} from "@tgo/shared";

import {
  getImportedBranchFallback,
  getImportedEventDetailFallback,
  getImportedEventSummariesFallback,
  getImportedHomePayloadFallback,
  getImportedMemberDetailFallback,
  getImportedMemberSummariesFallback
} from "./imported-fallbacks.js";
import { sanitizeEventRegistrationUrl } from "./event-registration.js";

type ImportMetaEnvWithPublicApi = ImportMeta & {
  env?: {
    PUBLIC_API_BASE_URL?: string;
  };
};

const getConfiguredApiBaseUrl = () =>
  (import.meta as ImportMetaEnvWithPublicApi).env?.PUBLIC_API_BASE_URL ??
  process.env.PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8787";

const hasExplicitPublicApiBaseUrl = () =>
  Boolean((import.meta as ImportMetaEnvWithPublicApi).env?.PUBLIC_API_BASE_URL ?? process.env.PUBLIC_API_BASE_URL);

const defaultEventPageSize = 24;
const seedDemoEventSlugs = new Set(["beijing-strategy-forum", "hangzhou-engineering-workshop", "shanghai-ai-leadership-salon"]);

const fetchPublic = async <T>(path: string): Promise<T | null> => {
  const result = await fetchPublicEnvelope<T>(path);

  return result?.data ?? null;
};

const fetchPublicEnvelope = async <T>(path: string): Promise<ApiSuccess<T> | null> => {
  try {
    const response = await fetch(new URL(path, getConfiguredApiBaseUrl()), {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiSuccess<T> | ApiErrorShape;

    if ("error" in payload) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

const normalizePageNumber = (value: number | undefined, fallback: number) => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.trunc(value ?? fallback));
};

const preferRicherCollection = <T>(apiItems: T[] | null, importedItems: T[] | null) => {
  if (importedItems && (!apiItems || importedItems.length > apiItems.length)) {
    return importedItems;
  }

  return apiItems ?? importedItems;
};

const sortEventSummaries = (events: PublicEventSummaryV2[]) =>
  [...events].sort((left, right) => {
    const leftTime = Date.parse(left.startsAt);
    const rightTime = Date.parse(right.startsAt);

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
      return left.title.localeCompare(right.title, "zh-CN");
    }

    if (Number.isNaN(leftTime)) {
      return 1;
    }

    if (Number.isNaN(rightTime)) {
      return -1;
    }

    return rightTime - leftTime || left.title.localeCompare(right.title, "zh-CN");
  });

const normalizeEventSummary = (event: PublicEventSummaryV2): PublicEventSummaryV2 => ({
  ...event,
  registrationUrl: sanitizeEventRegistrationUrl(event.registrationUrl)
});

const normalizeEventDetail = (event: PublicEventDetailV2): PublicEventDetailV2 => ({
  ...event,
  registrationUrl: sanitizeEventRegistrationUrl(event.registrationUrl)
});

const createEventListMeta = (
  total: number,
  page: number,
  pageSize: number,
  events: PublicEventSummaryV2[]
): PublicEventListMeta => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const cityOptions = Array.from(new Set(events.map((event) => event.cityName).filter(Boolean)));
  const registrationStateCounts = events.reduce(
    (counts, event) => {
      switch (event.registrationState) {
        case "open":
          counts.open += 1;
          break;
        case "waitlist":
          counts.waitlist += 1;
          break;
        case "closed":
          counts.closed += 1;
          break;
        case "not_open":
          counts.notOpen += 1;
          break;
        default:
          break;
      }

      return counts;
    },
    {
      open: 0,
      waitlist: 0,
      closed: 0,
      notOpen: 0
    }
  );

  return {
    total,
    page,
    pageSize,
    pageCount,
    cityOptions,
    registrationStateCounts
  };
};

const buildEventListPath = (query: PublicEventListQuery) => {
  const search = new URLSearchParams();

  if (typeof query.page === "number" && Number.isFinite(query.page) && query.page > 0) {
    search.set("page", String(Math.trunc(query.page)));
  }

  if (typeof query.pageSize === "number" && Number.isFinite(query.pageSize) && query.pageSize > 0) {
    search.set("pageSize", String(Math.trunc(query.pageSize)));
  }

  if (query.city?.trim()) {
    search.set("city", query.city.trim());
  }

  if (query.branchSlug?.trim()) {
    search.set("branchSlug", query.branchSlug.trim());
  }

  if (query.upcoming) {
    search.set("upcoming", "true");
  }

  const searchText = search.toString();
  return `/api/public/v1/events${searchText ? `?${searchText}` : ""}`;
};

const filterEventSummaries = (events: PublicEventSummaryV2[], query: PublicEventListQuery) => {
  const branchSlug = query.branchSlug?.trim().toLowerCase() ?? "";
  const city = query.city?.trim().toLowerCase() ?? "";
  const upcoming = query.upcoming ?? false;
  const now = Date.now();

  return sortEventSummaries(events).filter((event) => {
    if (branchSlug && event.branch?.slug.toLowerCase() !== branchSlug) {
      return false;
    }

    if (city && event.cityName.toLowerCase() !== city) {
      return false;
    }

    if (upcoming) {
      const endsAt = Date.parse(event.endsAt || event.startsAt);

      if (!Number.isNaN(endsAt) && endsAt < now) {
        return false;
      }
    }

    return true;
  });
};

export const getPublicApiBaseUrl = () => getConfiguredApiBaseUrl();

export const getSiteConfig = async (): Promise<PublicSiteConfig> =>
  (await fetchPublic<PublicSiteConfig>("/api/public/v1/site-config")) ?? siteConfig;

export const getHomePayload = async (): Promise<PublicHomePayloadV2> => {
  const apiHome = await fetchPublic<PublicHomePayloadV2>("/api/public/v1/home");
  const importedHome = await getImportedHomePayloadFallback();

  if (apiHome && hasExplicitPublicApiBaseUrl()) {
    return apiHome;
  }

  if (apiHome && importedHome) {
    const importedEventSlugs = new Set(importedHome.featuredEvents.map((event) => event.slug));
    const hasImportedFeaturedEvent = apiHome.featuredEvents.some((event) => importedEventSlugs.has(event.slug));

    if (!hasImportedFeaturedEvent && importedHome.featuredEvents.length > 0) {
      return importedHome;
    }
  }

  return apiHome ?? importedHome ?? publicHomePayloadV2;
};

export const listBranches = async (): Promise<BranchDetail[]> => {
  const apiBranches = await fetchPublic<BranchDetail[]>("/api/public/v1/branches");
  const importedBranches = await getImportedBranchFallback();

  if (apiBranches && hasExplicitPublicApiBaseUrl()) {
    return apiBranches;
  }

  return preferRicherCollection(apiBranches, importedBranches) ?? branchDetails;
};

export const getBranch = async (slug: string): Promise<BranchDetail | null> =>
  (await fetchPublic<BranchDetail>(`/api/public/v1/branches/${slug}`)) ??
  (await getImportedBranchFallback())?.find((branch: BranchDetail) => branch.slug === slug) ??
  getBranchDetail(slug);

export const listMembers = async (): Promise<MemberSummary[]> => {
  const apiMembers = await fetchPublic<MemberSummary[]>("/api/public/v1/members");
  const importedMembers = await getImportedMemberSummariesFallback();

  if (apiMembers && hasExplicitPublicApiBaseUrl()) {
    return apiMembers;
  }

  return preferRicherCollection(apiMembers, importedMembers) ?? memberSummaries;
};

export const getMember = async (slug: string): Promise<MemberDetail | null> =>
  (await fetchPublic<MemberDetail>(`/api/public/v1/members/${slug}`)) ??
  (await getImportedMemberDetailFallback(slug)) ??
  getMemberDetail(slug);

export const getJoinPage = async (): Promise<JoinPagePayload> =>
  (await fetchPublic<JoinPagePayload>("/api/public/v1/join")) ?? joinPagePayload;

export const getAboutPage = async (): Promise<AboutPagePayload> =>
  (await fetchPublic<AboutPagePayload>("/api/public/v1/about")) ?? aboutPagePayload;

export const listArticles = async (): Promise<PublicArticleSummaryV2[]> =>
  (await fetchPublic<PublicArticleSummaryV2[]>("/api/public/v1/articles")) ?? publicArticleSummariesV2;

export const getArticle = async (slug: string): Promise<PublicArticleDetailV2 | null> =>
  (await fetchPublic<PublicArticleDetailV2>(`/api/public/v1/articles/${slug}`)) ?? getPublicArticleDetailV2(slug);

export const listEventPage = async (query: PublicEventListQuery = {}): Promise<PublicEventListResult> => {
  const page = normalizePageNumber(query.page, 1);
  const pageSize = normalizePageNumber(query.pageSize, defaultEventPageSize);
  const fallbackEvents = (await getImportedEventSummariesFallback()) ?? publicEventSummariesV2;
  const fallbackFiltered = filterEventSummaries(fallbackEvents, query);
  const fallbackStartIndex = (page - 1) * pageSize;
  const path = buildEventListPath({
    ...query,
    page,
    pageSize
  });
  const payload = await fetchPublicEnvelope<PublicEventSummaryV2[]>(path);

  if (payload) {
    const meta = payload.meta as PublicEventListMeta | undefined;
    const payloadTotal = meta?.total ?? payload.data.length;

    if (hasExplicitPublicApiBaseUrl() || payloadTotal >= fallbackFiltered.length) {
      return {
        items: payload.data.map(normalizeEventSummary),
        meta:
          meta ?? {
            ...createEventListMeta(payload.data.length, page, pageSize, payload.data),
            total: payload.data.length
          }
      };
    }

    return {
      items: fallbackFiltered.slice(fallbackStartIndex, fallbackStartIndex + pageSize).map(normalizeEventSummary),
      meta: createEventListMeta(fallbackFiltered.length, page, pageSize, fallbackFiltered)
    };
  }

  return {
    items: fallbackFiltered.slice(fallbackStartIndex, fallbackStartIndex + pageSize).map(normalizeEventSummary),
    meta: createEventListMeta(fallbackFiltered.length, page, pageSize, fallbackFiltered)
  };
};

export const listEvents = async (): Promise<PublicEventSummaryV2[]> => {
  const apiResult = await listEventPage({
    page: 1,
    pageSize: Math.max(publicEventSummariesV2.length, 2000)
  });
  const importedEvents = sortEventSummaries((await getImportedEventSummariesFallback()) ?? publicEventSummariesV2);
  const demoEventCount = apiResult.items.filter((event) => seedDemoEventSlugs.has(event.slug)).length;

  // Demo events remain accessible by detail route for local testing, but they should not occupy the public list.
  if (demoEventCount > 0 && apiResult.items.length === importedEvents.length + demoEventCount) {
    return importedEvents.map(normalizeEventSummary);
  }

  return (demoEventCount > 0 ? apiResult.items.filter((event) => !seedDemoEventSlugs.has(event.slug)) : apiResult.items).map(
    normalizeEventSummary
  );
};

export const getEvent = async (slug: string): Promise<PublicEventDetailV2 | null> => {
  const event =
    (await fetchPublic<PublicEventDetailV2>(`/api/public/v1/events/${slug}`)) ??
    (await getImportedEventDetailFallback(slug)) ??
    getPublicEventDetailV2(slug);

  return event ? normalizeEventDetail(event) : null;
};

export const submitJoinApplication = async (payload: unknown): Promise<JoinApplicationReceipt | null> =>
  fetch(new URL("/api/public/v1/join-applications", getConfiguredApiBaseUrl()), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }

      const result = (await response.json()) as ApiSuccess<JoinApplicationReceipt> | ApiErrorShape;
      return "error" in result ? null : result.data;
    })
    .catch(() => null);

export const submitEventRegistration = async (
  eventId: string,
  payload: unknown
): Promise<PublicEventRegistrationReceiptV2 | null> =>
  fetch(new URL(`/api/public/v1/events/${eventId}/registrations`, getConfiguredApiBaseUrl()), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }

      const result = (await response.json()) as ApiSuccess<PublicEventRegistrationReceiptV2> | ApiErrorShape;
      return "error" in result ? null : result.data;
    })
    .catch(() => null);
