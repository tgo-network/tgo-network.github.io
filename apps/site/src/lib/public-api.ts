import type {
  ApiErrorShape,
  ApiSuccess,
  ArticleDetail,
  ArticleSummary,
  CityDetail,
  CitySummary,
  EventDetail,
  EventSummary,
  HomePayload,
  PublicSiteConfig,
  TopicDetail,
  TopicSummary
} from "@tgo/shared";
import {
  articleSummaries,
  citySummaries,
  eventSummaries,
  getArticleDetail,
  getCityDetail,
  getEventDetail,
  getTopicDetail,
  homePayload,
  siteConfig,
  topicSummaries
} from "@tgo/shared";

const apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8787";

const fetchPublic = async <T>(path: string): Promise<T | null> => {
  try {
    const response = await fetch(new URL(path, apiBaseUrl), {
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

export const getPublicApiBaseUrl = () => apiBaseUrl;

export const getSiteConfig = async (): Promise<PublicSiteConfig> =>
  (await fetchPublic<PublicSiteConfig>("/api/public/v1/site-config")) ?? siteConfig;

export const getHomePayload = async (): Promise<HomePayload> =>
  (await fetchPublic<HomePayload>("/api/public/v1/home")) ?? homePayload;

export const listTopics = async (): Promise<TopicSummary[]> =>
  (await fetchPublic<TopicSummary[]>("/api/public/v1/topics")) ?? topicSummaries;

export const getTopic = async (slug: string): Promise<TopicDetail | null> =>
  (await fetchPublic<TopicDetail>(`/api/public/v1/topics/${slug}`)) ?? getTopicDetail(slug);

export const listArticles = async (): Promise<ArticleSummary[]> =>
  (await fetchPublic<ArticleSummary[]>("/api/public/v1/articles")) ?? articleSummaries;

export const getArticle = async (slug: string): Promise<ArticleDetail | null> =>
  (await fetchPublic<ArticleDetail>(`/api/public/v1/articles/${slug}`)) ?? getArticleDetail(slug);

export const listEvents = async (): Promise<EventSummary[]> =>
  (await fetchPublic<EventSummary[]>("/api/public/v1/events")) ?? eventSummaries;

export const getEvent = async (slug: string): Promise<EventDetail | null> =>
  (await fetchPublic<EventDetail>(`/api/public/v1/events/${slug}`)) ?? getEventDetail(slug);

export const listCities = async (): Promise<CitySummary[]> =>
  (await fetchPublic<CitySummary[]>("/api/public/v1/cities")) ?? citySummaries;

export const getCity = async (slug: string): Promise<CityDetail | null> =>
  (await fetchPublic<CityDetail>(`/api/public/v1/cities/${slug}`)) ?? getCityDetail(slug);
