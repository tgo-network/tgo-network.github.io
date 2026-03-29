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

type ImportMetaEnvWithPublicApi = ImportMeta & {
  env?: {
    PUBLIC_API_BASE_URL?: string;
  };
};

const getConfiguredApiBaseUrl = () =>
  (import.meta as ImportMetaEnvWithPublicApi).env?.PUBLIC_API_BASE_URL ??
  process.env.PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8787";

const fetchPublic = async <T>(path: string): Promise<T | null> => {
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

    return payload.data;
  } catch {
    return null;
  }
};

export const getPublicApiBaseUrl = () => getConfiguredApiBaseUrl();

export const getSiteConfig = async (): Promise<PublicSiteConfig> =>
  (await fetchPublic<PublicSiteConfig>("/api/public/v1/site-config")) ?? siteConfig;

export const getHomePayload = async (): Promise<PublicHomePayloadV2> =>
  (await fetchPublic<PublicHomePayloadV2>("/api/public/v1/home")) ?? publicHomePayloadV2;

export const listBranches = async (): Promise<BranchDetail[]> =>
  (await fetchPublic<BranchDetail[]>("/api/public/v1/branches")) ?? branchDetails;

export const getBranch = async (slug: string): Promise<BranchDetail | null> =>
  (await fetchPublic<BranchDetail>(`/api/public/v1/branches/${slug}`)) ?? getBranchDetail(slug);

export const listMembers = async (): Promise<MemberSummary[]> =>
  (await fetchPublic<MemberSummary[]>("/api/public/v1/members")) ?? memberSummaries;

export const getMember = async (slug: string): Promise<MemberDetail | null> =>
  (await fetchPublic<MemberDetail>(`/api/public/v1/members/${slug}`)) ?? getMemberDetail(slug);

export const getJoinPage = async (): Promise<JoinPagePayload> =>
  (await fetchPublic<JoinPagePayload>("/api/public/v1/join")) ?? joinPagePayload;

export const getAboutPage = async (): Promise<AboutPagePayload> =>
  (await fetchPublic<AboutPagePayload>("/api/public/v1/about")) ?? aboutPagePayload;

export const listArticles = async (): Promise<PublicArticleSummaryV2[]> =>
  (await fetchPublic<PublicArticleSummaryV2[]>("/api/public/v1/articles")) ?? publicArticleSummariesV2;

export const getArticle = async (slug: string): Promise<PublicArticleDetailV2 | null> =>
  (await fetchPublic<PublicArticleDetailV2>(`/api/public/v1/articles/${slug}`)) ?? getPublicArticleDetailV2(slug);

export const listEvents = async (): Promise<PublicEventSummaryV2[]> =>
  (await fetchPublic<PublicEventSummaryV2[]>("/api/public/v1/events")) ?? publicEventSummariesV2;

export const getEvent = async (slug: string): Promise<PublicEventDetailV2 | null> =>
  (await fetchPublic<PublicEventDetailV2>(`/api/public/v1/events/${slug}`)) ?? getPublicEventDetailV2(slug);

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
