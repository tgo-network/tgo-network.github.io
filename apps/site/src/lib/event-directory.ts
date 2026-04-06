import type { PublicEventSummaryV2 } from "@tgo/shared";

import { orderBranchCities, sortByBranchOrder } from "./branch-order.js";
import { getCitySegment, slicePageItems } from "./directory-pagination.js";
import { stripEventDisplayUrls } from "./event-registration.js";
import { listEvents } from "./public-api.js";

export interface EventFilterLink {
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
  branchName: string | null;
  branchSlug: string | null;
  venueName: string;
  coverImage: PublicEventSummaryV2["coverImage"];
  registrationState: PublicEventSummaryV2["registrationState"];
}

export interface EventDirectoryPageData {
  items: EventDirectoryCard[];
  cityLinks: EventFilterLink[];
  branchLinks: EventFilterLink[];
  currentCity: string | null;
  currentBranch: string | null;
  page: number;
  pageCount: number;
  total: number;
  prevHref: string | null;
  nextHref: string | null;
  canonical: string;
  title: string;
  description: string;
}

interface EventBranchOption {
  label: string;
  slug: string;
  cityName: string | null;
}

interface EventDirectoryMeta {
  events: EventDirectoryCard[];
  cityOptions: string[];
  branchOptions: EventBranchOption[];
}

type EventDirectoryFilter =
  | { kind: "all" }
  | { kind: "city"; city: string }
  | { kind: "branch"; branchSlug: string };

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
  branchName: event.branch?.name ?? null,
  branchSlug: event.branch?.slug ?? null,
  venueName: getEventVenue(event.venueName),
  coverImage: event.coverImage,
  registrationState: event.registrationState
});

const getEventDirectoryMeta = async (): Promise<EventDirectoryMeta> => {
  if (!eventDirectoryMetaPromise) {
    eventDirectoryMetaPromise = listEvents().then((events) => {
      const directoryEvents = events.map(toEventDirectoryCard);
      const cityOptions = orderBranchCities(Array.from(new Set(directoryEvents.map((event) => event.cityName).filter(Boolean))));
      const branchOptions = sortByBranchOrder(
        Array.from(
          new Map(
            directoryEvents
              .filter((event) => event.branchSlug && event.branchName)
              .map((event) => [
                event.branchSlug!,
                {
                  label: event.branchName!,
                  slug: event.branchSlug!,
                  cityName: event.cityName
                }
              ])
          ).values()
        ),
        (branch) => ({
          slug: branch.slug,
          cityName: branch.cityName
        })
      ).map(({ label, slug, cityName }) => ({
        label,
        slug,
        cityName
      }));

      return {
        events: directoryEvents,
        cityOptions,
        branchOptions
      };
    });
  }

  return eventDirectoryMetaPromise;
};

const buildEventDirectoryHref = (filter: EventDirectoryFilter, page: number) => {
  switch (filter.kind) {
    case "city": {
      const citySegment = getCitySegment(filter.city);
      return page <= 1 ? `/events/city/${citySegment}` : `/events/city/${citySegment}/page/${page}`;
    }
    case "branch":
      return page <= 1 ? `/events/branch/${filter.branchSlug}` : `/events/branch/${filter.branchSlug}/page/${page}`;
    default:
      return page <= 1 ? "/events" : `/events/page/${page}`;
  }
};

const getEventCityBySegment = (meta: EventDirectoryMeta, citySegment: string | undefined) => {
  if (!citySegment) {
    return null;
  }

  return meta.cityOptions.find((city) => getCitySegment(city) === citySegment) ?? null;
};

const getEventBranchBySegment = (meta: EventDirectoryMeta, branchSegment: string | undefined) => {
  if (!branchSegment) {
    return null;
  }

  return meta.branchOptions.find((branch) => branch.slug === branchSegment) ?? null;
};

const getEventDirectoryItems = (meta: EventDirectoryMeta, filter: EventDirectoryFilter) => {
  switch (filter.kind) {
    case "city":
      return meta.events.filter((event) => event.cityName === filter.city);
    case "branch":
      return meta.events.filter((event) => event.branchSlug === filter.branchSlug);
    default:
      return meta.events;
  }
};

const createEventDirectoryPage = (meta: EventDirectoryMeta, filter: EventDirectoryFilter, page: number): EventDirectoryPageData => {
  const allItems = getEventDirectoryItems(meta, filter);
  const pagedItems = slicePageItems(allItems, page, eventPageSize);
  const canonical = buildEventDirectoryHref(filter, pagedItems.page);
  const currentBranch = filter.kind === "branch" ? meta.branchOptions.find((branch) => branch.slug === filter.branchSlug)?.label ?? null : null;
  const currentCity = filter.kind === "city" ? filter.city : null;

  return {
    items: pagedItems.items,
    cityLinks: [
      {
        label: "全部",
        href: buildEventDirectoryHref({ kind: "all" }, 1),
        active: filter.kind !== "city"
      },
      ...meta.cityOptions.map((option) => ({
        label: option,
        href: buildEventDirectoryHref({ kind: "city", city: option }, 1),
        active: filter.kind === "city" && option === filter.city
      }))
    ],
    branchLinks: [
      {
        label: "全部",
        href: buildEventDirectoryHref({ kind: "all" }, 1),
        active: filter.kind !== "branch"
      },
      ...meta.branchOptions.map((option) => ({
        label: option.label,
        href: buildEventDirectoryHref({ kind: "branch", branchSlug: option.slug }, 1),
        active: filter.kind === "branch" && option.slug === filter.branchSlug
      }))
    ],
    currentCity,
    currentBranch,
    page: pagedItems.page,
    pageCount: pagedItems.pageCount,
    total: pagedItems.total,
    prevHref: pagedItems.page > 1 ? buildEventDirectoryHref(filter, pagedItems.page - 1) : null,
    nextHref: pagedItems.page < pagedItems.pageCount ? buildEventDirectoryHref(filter, pagedItems.page + 1) : null,
    canonical,
    title: currentBranch ? `${currentBranch}活动 | TGO 鲲鹏会` : currentCity ? `${currentCity}活动 | TGO 鲲鹏会` : "活动 | TGO 鲲鹏会",
    description: currentBranch
      ? `查看 ${currentBranch} 分会相关活动与报名入口。`
      : currentCity
        ? `查看 ${currentCity} 分会相关活动与报名入口。`
        : "查看各地分会活动与报名入口。"
  };
};

export const getEventDirectoryPage = async (city: string | null, page: number) => {
  const meta = await getEventDirectoryMeta();
  return createEventDirectoryPage(meta, city ? { kind: "city", city } : { kind: "all" }, page);
};

export const getEventDirectoryPageFromSegment = async (citySegment: string | undefined, page: number) => {
  const meta = await getEventDirectoryMeta();
  const city = getEventCityBySegment(meta, citySegment);

  return createEventDirectoryPage(meta, city ? { kind: "city", city } : { kind: "all" }, page);
};

export const getEventBranchDirectoryPage = async (branchSlug: string | null, page: number) => {
  const meta = await getEventDirectoryMeta();
  return createEventDirectoryPage(meta, branchSlug ? { kind: "branch", branchSlug } : { kind: "all" }, page);
};

export const getEventBranchDirectoryPageFromSegment = async (branchSegment: string | undefined, page: number) => {
  const meta = await getEventDirectoryMeta();
  const branch = getEventBranchBySegment(meta, branchSegment);

  return createEventDirectoryPage(meta, branch ? { kind: "branch", branchSlug: branch.slug } : { kind: "all" }, page);
};

export const getEventPageRouteProps = async () => {
  const meta = await getEventDirectoryMeta();

  return Array.from({ length: Math.max(0, Math.ceil(meta.events.length / eventPageSize) - 1) }, (_, index) => {
    const page = index + 2;

    return {
      params: {
        page: String(page)
      },
      props: createEventDirectoryPage(meta, { kind: "all" }, page)
    };
  });
};

export const getEventCityIndexRouteProps = async () => {
  const meta = await getEventDirectoryMeta();

  return meta.cityOptions.map((city) => ({
    params: {
      city: getCitySegment(city)
    },
    props: createEventDirectoryPage(meta, { kind: "city", city }, 1)
  }));
};

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
        props: createEventDirectoryPage(meta, { kind: "city", city }, page)
      };
    });
  });
};

export const getEventBranchIndexRouteProps = async () => {
  const meta = await getEventDirectoryMeta();

  return meta.branchOptions.map((branch) => ({
    params: {
      branch: branch.slug
    },
    props: createEventDirectoryPage(meta, { kind: "branch", branchSlug: branch.slug }, 1)
  }));
};

export const getEventBranchPageRouteProps = async () => {
  const meta = await getEventDirectoryMeta();

  return meta.branchOptions.flatMap((branch) => {
    const branchItems = meta.events.filter((event) => event.branchSlug === branch.slug);
    const pageCount = Math.ceil(branchItems.length / eventPageSize);

    return Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => {
      const page = index + 2;

      return {
        params: {
          branch: branch.slug,
          page: String(page)
        },
        props: createEventDirectoryPage(meta, { kind: "branch", branchSlug: branch.slug }, page)
      };
    });
  });
};

export const getEventStaticPaths = async () => {
  const meta = await getEventDirectoryMeta();

  return meta.events.map((event) => ({
    params: {
      slug: event.slug
    }
  }));
};
