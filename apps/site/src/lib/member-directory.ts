import type { MemberSummary } from "@tgo/shared";

import { orderBranchCities } from "./branch-order.js";
import { getCitySegment, slicePageItems } from "./directory-pagination.js";
import { listMembers } from "./public-api.js";

export interface MemberCityLink {
  label: string;
  href: string;
  active: boolean;
}

export interface MemberDirectoryPageData {
  items: MemberSummary[];
  cityLinks: MemberCityLink[];
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

interface MemberDirectoryMeta {
  members: MemberSummary[];
  cityOptions: string[];
}

export const memberPageSize = 12;

let memberDirectoryMetaPromise: Promise<MemberDirectoryMeta> | null = null;

const sortMembers = (items: MemberSummary[]) =>
  [...items].sort((left, right) => {
    const leftTime = Date.parse(left.joinedAt);
    const rightTime = Date.parse(right.joinedAt);

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
      return left.name.localeCompare(right.name, "zh-CN");
    }

    if (Number.isNaN(leftTime)) {
      return 1;
    }

    if (Number.isNaN(rightTime)) {
      return -1;
    }

    return rightTime - leftTime || left.name.localeCompare(right.name, "zh-CN");
  });

const getMemberCity = (member: MemberSummary) => member.branch?.cityName || "未标注分会";

const getMemberDirectoryMeta = async (): Promise<MemberDirectoryMeta> => {
  if (!memberDirectoryMetaPromise) {
    memberDirectoryMetaPromise = listMembers().then((members) => {
      const orderedMembers = sortMembers(members);
      const cityOptions = orderBranchCities(Array.from(new Set(orderedMembers.map((member) => getMemberCity(member)))));

      return {
        members: orderedMembers,
        cityOptions
      };
    });
  }

  return memberDirectoryMetaPromise;
};

const buildMemberDirectoryHref = (city: string | null, page: number) => {
  if (!city) {
    return page <= 1 ? "/members" : `/members/page/${page}`;
  }

  const citySegment = getCitySegment(city);
  return page <= 1 ? `/members/city/${citySegment}` : `/members/city/${citySegment}/page/${page}`;
};

const getMemberCityBySegment = (meta: MemberDirectoryMeta, citySegment: string | undefined) => {
  if (!citySegment) {
    return null;
  }

  return meta.cityOptions.find((city) => getCitySegment(city) === citySegment) ?? null;
};

const createMemberDirectoryPage = (meta: MemberDirectoryMeta, city: string | null, page: number): MemberDirectoryPageData => {
  const allItems = city ? meta.members.filter((member) => getMemberCity(member) === city) : meta.members;
  const pagedItems = slicePageItems(allItems, page, memberPageSize);
  const canonical = buildMemberDirectoryHref(city, pagedItems.page);

  return {
    items: pagedItems.items,
    cityLinks: [
      {
        label: "全部",
        href: buildMemberDirectoryHref(null, 1),
        active: city === null
      },
      ...meta.cityOptions.map((option) => ({
        label: option,
        href: buildMemberDirectoryHref(option, 1),
        active: option === city
      }))
    ],
    currentCity: city,
    page: pagedItems.page,
    pageCount: pagedItems.pageCount,
    total: pagedItems.total,
    prevHref: pagedItems.page > 1 ? buildMemberDirectoryHref(city, pagedItems.page - 1) : null,
    nextHref: pagedItems.page < pagedItems.pageCount ? buildMemberDirectoryHref(city, pagedItems.page + 1) : null,
    canonical,
    title: city ? `${city}成员 | TGO 鲲鹏会` : "成员列表 | TGO 鲲鹏会",
    description: city ? `查看 ${city} 分会相关成员资料。` : "查看 TGO 鲲鹏会成员资料。"
  };
};

export const getMemberDirectoryPage = async (city: string | null, page: number) => {
  const meta = await getMemberDirectoryMeta();
  return createMemberDirectoryPage(meta, city, page);
};

export const getMemberDirectoryPageFromSegment = async (citySegment: string | undefined, page: number) => {
  const meta = await getMemberDirectoryMeta();
  return createMemberDirectoryPage(meta, getMemberCityBySegment(meta, citySegment), page);
};

export const getMemberPageRouteProps = async () => {
  const meta = await getMemberDirectoryMeta();

  return Array.from({ length: Math.max(0, Math.ceil(meta.members.length / memberPageSize) - 1) }, (_, index) => {
    const page = index + 2;

    return {
      params: {
        page: String(page)
      },
      props: createMemberDirectoryPage(meta, null, page)
    };
  });
};

export const getMemberPageRouteParams = async () =>
  (await getMemberPageRouteProps()).map(({ params }) => ({
    params
  }));

export const getMemberCityIndexRouteProps = async () => {
  const meta = await getMemberDirectoryMeta();

  return meta.cityOptions.map((city) => ({
    params: {
      city: getCitySegment(city)
    },
    props: createMemberDirectoryPage(meta, city, 1)
  }));
};

export const getMemberCityIndexRouteParams = async () =>
  (await getMemberCityIndexRouteProps()).map(({ params }) => ({
    params
  }));

export const getMemberCityPageRouteProps = async () => {
  const meta = await getMemberDirectoryMeta();

  return meta.cityOptions.flatMap((city) => {
    const cityItems = meta.members.filter((member) => getMemberCity(member) === city);
    const pageCount = Math.ceil(cityItems.length / memberPageSize);

    return Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => {
      const page = index + 2;

      return {
        params: {
          city: getCitySegment(city),
          page: String(page)
        },
        props: createMemberDirectoryPage(meta, city, page)
      };
    });
  });
};

export const getMemberCityPageRouteParams = async () =>
  (await getMemberCityPageRouteProps()).map(({ params }) => ({
    params
  }));

export const getMemberStaticPaths = async () => {
  const meta = await getMemberDirectoryMeta();

  return meta.members.map((member) => ({
    params: {
      slug: member.slug
    }
  }));
};
