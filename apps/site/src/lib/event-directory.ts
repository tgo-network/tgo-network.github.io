import type { PublicEventSummaryV2 } from "@tgo/shared";

import { orderBranchCities } from "./branch-order.js";
import { getCitySegment, slicePageItems } from "./directory-pagination.js";
import { stripEventDisplayUrls } from "./event-registration.js";
import { listEvents } from "./public-api.js";

export interface EventCityLink {
  label: string;
  href: string;
  active: boolean;
}

export interface EventDirectoryCard {
  slug: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  cityName: string;
  venueName: string;
  coverImage: PublicEventSummaryV2["coverImage"];
  registrationState: PublicEventSummaryV2["registrationState"];
}

export interface EventDirectoryPageData {
  items: EventDirectoryCard[];
  cityLinks: EventCityLink[];
  currentCity: string | null;
  page: number;
  pageCount: number;
  total: number;
  prevHref: string | null;
  nextHref: string | null;
  canonical: string;
  title: string;
  description: string;
}

interface EventDirectoryMeta {
  events: EventDirectoryCard[];
  cityOptions: string[];
}

export const eventPageSize = 12;

let eventDirectoryMetaPromise: Promise<EventDirectoryMeta> | null = null;

const normalizeSummary = (value: string) => value.replace(/\s+/g, " ").trim();
const getEventSummary = (value: string) => normalizeSummary(stripEventDisplayUrls(value)) || "查看活动详情与报名信息。";
const getEventVenue = (value: string) => value.trim() || "地点待定";

const toEventDirectoryCard = (event: PublicEventSummaryV2): EventDirectoryCard => ({
  slug: event.slug,
  title: event.title,
  summary: getEventSummary(event.summary),
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  cityName: event.cityName,
  venueName: getEventVenue(event.venueName),
  coverImage: event.coverImage,
  registrationState: event.registrationState
});

const getEventDirectoryMeta = async (): Promise<EventDirectoryMeta> => {
  if (!eventDirectoryMetaPromise) {
    eventDirectoryMetaPromise = listEvents().then((events) => {
      const directoryEvents = events.map(toEventDirectoryCard);
      const cityOptions = orderBranchCities(Array.from(new Set(directoryEvents.map((event) => event.cityName).filter(Boolean))));

      return {
        events: directoryEvents,
        cityOptions
      };
    });
  }

  return eventDirectoryMetaPromise;
};

const buildEventDirectoryHref = (city: string | null, page: number) => {
  if (!city) {
    return page <= 1 ? "/events" : `/events/page/${page}`;
  }

  const citySegment = getCitySegment(city);
  return page <= 1 ? `/events/city/${citySegment}` : `/events/city/${citySegment}/page/${page}`;
};

const getEventCityBySegment = (meta: EventDirectoryMeta, citySegment: string | undefined) => {
  if (!citySegment) {
    return null;
  }

  return meta.cityOptions.find((city) => getCitySegment(city) === citySegment) ?? null;
};

const createEventDirectoryPage = (meta: EventDirectoryMeta, city: string | null, page: number): EventDirectoryPageData => {
  const allItems = city ? meta.events.filter((event) => event.cityName === city) : meta.events;
  const pagedItems = slicePageItems(allItems, page, eventPageSize);
  const canonical = buildEventDirectoryHref(city, pagedItems.page);

  return {
    items: pagedItems.items,
    cityLinks: [
      {
        label: "全部",
        href: buildEventDirectoryHref(null, 1),
        active: city === null
      },
      ...meta.cityOptions.map((option) => ({
        label: option,
        href: buildEventDirectoryHref(option, 1),
        active: option === city
      }))
    ],
    currentCity: city,
    page: pagedItems.page,
    pageCount: pagedItems.pageCount,
    total: pagedItems.total,
    prevHref: pagedItems.page > 1 ? buildEventDirectoryHref(city, pagedItems.page - 1) : null,
    nextHref: pagedItems.page < pagedItems.pageCount ? buildEventDirectoryHref(city, pagedItems.page + 1) : null,
    canonical,
    title: city ? `${city}活动 | TGO 鲲鹏会` : "活动 | TGO 鲲鹏会",
    description: city ? `查看 ${city} 分会相关活动与报名入口。` : "查看各地分会活动与报名入口。"
  };
};

export const getEventDirectoryPage = async (city: string | null, page: number) => {
  const meta = await getEventDirectoryMeta();
  return createEventDirectoryPage(meta, city, page);
};

export const getEventDirectoryPageFromSegment = async (citySegment: string | undefined, page: number) => {
  const meta = await getEventDirectoryMeta();
  return createEventDirectoryPage(meta, getEventCityBySegment(meta, citySegment), page);
};

export const getEventPageRouteProps = async () => {
  const meta = await getEventDirectoryMeta();

  return Array.from({ length: Math.max(0, Math.ceil(meta.events.length / eventPageSize) - 1) }, (_, index) => {
    const page = index + 2;

    return {
      params: {
        page: String(page)
      },
      props: createEventDirectoryPage(meta, null, page)
    };
  });
};

export const getEventPageRouteParams = async () =>
  (await getEventPageRouteProps()).map(({ params }) => ({
    params
  }));

export const getEventCityIndexRouteProps = async () => {
  const meta = await getEventDirectoryMeta();

  return meta.cityOptions.map((city) => ({
    params: {
      city: getCitySegment(city)
    },
    props: createEventDirectoryPage(meta, city, 1)
  }));
};

export const getEventCityIndexRouteParams = async () =>
  (await getEventCityIndexRouteProps()).map(({ params }) => ({
    params
  }));

export const getEventCityPageRouteProps = async () => {
  const meta = await getEventDirectoryMeta();

  return meta.cityOptions.flatMap((city) => {
    const cityItems = meta.events.filter((event) => event.cityName === city);
    const pageCount = Math.ceil(cityItems.length / eventPageSize);

    return Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => {
      const page = index + 2;

      return {
        params: {
          city: getCitySegment(city),
          page: String(page)
        },
        props: createEventDirectoryPage(meta, city, page)
      };
    });
  });
};

export const getEventCityPageRouteParams = async () =>
  (await getEventCityPageRouteProps()).map(({ params }) => ({
    params
  }));

export const getEventStaticPaths = async () => {
  const meta = await getEventDirectoryMeta();

  return meta.events.map((event) => ({
    params: {
      slug: event.slug
    }
  }));
};
