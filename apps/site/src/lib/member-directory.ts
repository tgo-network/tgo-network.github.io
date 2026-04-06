import type { MemberSummary } from "@tgo/shared";

import { orderBranchCities, sortByBranchOrder } from "./branch-order.js";
import { getCitySegment, slicePageItems } from "./directory-pagination.js";
import { sortMemberSummaries } from "./member-search.js";
import { listMembers } from "./public-api.js";

export interface MemberFilterLink {
  label: string;
  href: string;
  active: boolean;
}

export interface MemberDirectoryPageData {
  items: MemberSummary[];
  cityLinks: MemberFilterLink[];
  branchLinks: MemberFilterLink[];
  currentCity: string | null;
  currentBranch: string | null;
  currentBranchSlug: string | null;
  page: number;
  pageCount: number;
  total: number;
  prevHref: string | null;
  nextHref: string | null;
  canonical: string;
  title: string;
  description: string;
}

interface MemberBranchOption {
  label: string;
  slug: string;
  cityName: string | null;
}

interface MemberDirectoryMeta {
  members: MemberSummary[];
  cityOptions: string[];
  branchOptions: MemberBranchOption[];
}

type MemberDirectoryFilter =
  | { kind: "all" }
  | { kind: "city"; city: string }
  | { kind: "branch"; branchSlug: string };

export const memberPageSize = 12;

let memberDirectoryMetaPromise: Promise<MemberDirectoryMeta> | null = null;

const getMemberCity = (member: MemberSummary) => member.branch?.cityName || "未标注分会";

const getMemberDirectoryMeta = async (): Promise<MemberDirectoryMeta> => {
  if (!memberDirectoryMetaPromise) {
    memberDirectoryMetaPromise = listMembers().then((members) => {
      const orderedMembers = sortMemberSummaries(members);
      const cityOptions = orderBranchCities(Array.from(new Set(orderedMembers.map((member) => getMemberCity(member)))));
      const branchOptions = sortByBranchOrder(
        Array.from(
          new Map(
            orderedMembers
              .map((member) => member.branch)
              .filter((branch): branch is NonNullable<MemberSummary["branch"]> => Boolean(branch?.slug && branch?.name))
              .map((branch) => [
                branch.slug,
                {
                  label: branch.name,
                  slug: branch.slug,
                  cityName: branch.cityName
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
        members: orderedMembers,
        cityOptions,
        branchOptions
      };
    });
  }

  return memberDirectoryMetaPromise;
};

const buildMemberDirectoryHref = (filter: MemberDirectoryFilter, page: number) => {
  switch (filter.kind) {
    case "city": {
      const citySegment = getCitySegment(filter.city);
      return page <= 1 ? `/members/city/${citySegment}` : `/members/city/${citySegment}/page/${page}`;
    }
    case "branch":
      return page <= 1 ? `/members/branch/${filter.branchSlug}` : `/members/branch/${filter.branchSlug}/page/${page}`;
    default:
      return page <= 1 ? "/members" : `/members/page/${page}`;
  }
};

const getMemberCityBySegment = (meta: MemberDirectoryMeta, citySegment: string | undefined) => {
  if (!citySegment) {
    return null;
  }

  return meta.cityOptions.find((city) => getCitySegment(city) === citySegment) ?? null;
};

const getMemberBranchBySegment = (meta: MemberDirectoryMeta, branchSegment: string | undefined) => {
  if (!branchSegment) {
    return null;
  }

  return meta.branchOptions.find((branch) => branch.slug === branchSegment) ?? null;
};

const getMemberDirectoryItems = (meta: MemberDirectoryMeta, filter: MemberDirectoryFilter) => {
  switch (filter.kind) {
    case "city":
      return meta.members.filter((member) => getMemberCity(member) === filter.city);
    case "branch":
      return meta.members.filter((member) => member.branch?.slug === filter.branchSlug);
    default:
      return meta.members;
  }
};

const createMemberDirectoryPage = (meta: MemberDirectoryMeta, filter: MemberDirectoryFilter, page: number): MemberDirectoryPageData => {
  const allItems = getMemberDirectoryItems(meta, filter);
  const pagedItems = slicePageItems(allItems, page, memberPageSize);
  const canonical = buildMemberDirectoryHref(filter, pagedItems.page);
  const currentBranch = filter.kind === "branch" ? meta.branchOptions.find((branch) => branch.slug === filter.branchSlug)?.label ?? null : null;
  const currentBranchSlug = filter.kind === "branch" ? filter.branchSlug : null;
  const currentCity = filter.kind === "city" ? filter.city : null;

  return {
    items: pagedItems.items,
    cityLinks: [
      {
        label: "全部",
        href: buildMemberDirectoryHref({ kind: "all" }, 1),
        active: filter.kind !== "city"
      },
      ...meta.cityOptions.map((option) => ({
        label: option,
        href: buildMemberDirectoryHref({ kind: "city", city: option }, 1),
        active: filter.kind === "city" && option === filter.city
      }))
    ],
    branchLinks: [
      {
        label: "全部",
        href: buildMemberDirectoryHref({ kind: "all" }, 1),
        active: filter.kind !== "branch"
      },
      ...meta.branchOptions.map((option) => ({
        label: option.label,
        href: buildMemberDirectoryHref({ kind: "branch", branchSlug: option.slug }, 1),
        active: filter.kind === "branch" && option.slug === filter.branchSlug
      }))
    ],
    currentCity,
    currentBranch,
    currentBranchSlug,
    page: pagedItems.page,
    pageCount: pagedItems.pageCount,
    total: pagedItems.total,
    prevHref: pagedItems.page > 1 ? buildMemberDirectoryHref(filter, pagedItems.page - 1) : null,
    nextHref: pagedItems.page < pagedItems.pageCount ? buildMemberDirectoryHref(filter, pagedItems.page + 1) : null,
    canonical,
    title: currentBranch ? `${currentBranch}成员 | TGO 鲲鹏会` : currentCity ? `${currentCity}成员 | TGO 鲲鹏会` : "成员列表 | TGO 鲲鹏会",
    description: currentBranch ? `查看 ${currentBranch} 分会成员资料。` : currentCity ? `查看 ${currentCity} 分会相关成员资料。` : "查看 TGO 鲲鹏会成员资料。"
  };
};

export const getMemberDirectoryPage = async (city: string | null, page: number) => {
  const meta = await getMemberDirectoryMeta();
  return createMemberDirectoryPage(meta, city ? { kind: "city", city } : { kind: "all" }, page);
};

export const getMemberDirectoryPageFromSegment = async (citySegment: string | undefined, page: number) => {
  const meta = await getMemberDirectoryMeta();
  const city = getMemberCityBySegment(meta, citySegment);

  return createMemberDirectoryPage(meta, city ? { kind: "city", city } : { kind: "all" }, page);
};

export const getMemberBranchDirectoryPage = async (branchSlug: string | null, page: number) => {
  const meta = await getMemberDirectoryMeta();
  return createMemberDirectoryPage(meta, branchSlug ? { kind: "branch", branchSlug } : { kind: "all" }, page);
};

export const getMemberBranchDirectoryPageFromSegment = async (branchSegment: string | undefined, page: number) => {
  const meta = await getMemberDirectoryMeta();
  const branch = getMemberBranchBySegment(meta, branchSegment);

  return createMemberDirectoryPage(meta, branch ? { kind: "branch", branchSlug: branch.slug } : { kind: "all" }, page);
};

export const getMemberPageRouteProps = async () => {
  const meta = await getMemberDirectoryMeta();

  return Array.from({ length: Math.max(0, Math.ceil(meta.members.length / memberPageSize) - 1) }, (_, index) => {
    const page = index + 2;

    return {
      params: {
        page: String(page)
      },
      props: createMemberDirectoryPage(meta, { kind: "all" }, page)
    };
  });
};

export const getMemberCityIndexRouteProps = async () => {
  const meta = await getMemberDirectoryMeta();

  return meta.cityOptions.map((city) => ({
    params: {
      city: getCitySegment(city)
    },
    props: createMemberDirectoryPage(meta, { kind: "city", city }, 1)
  }));
};

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
        props: createMemberDirectoryPage(meta, { kind: "city", city }, page)
      };
    });
  });
};

export const getMemberBranchIndexRouteProps = async () => {
  const meta = await getMemberDirectoryMeta();

  return meta.branchOptions.map((branch) => ({
    params: {
      branch: branch.slug
    },
    props: createMemberDirectoryPage(meta, { kind: "branch", branchSlug: branch.slug }, 1)
  }));
};

export const getMemberBranchPageRouteProps = async () => {
  const meta = await getMemberDirectoryMeta();

  return meta.branchOptions.flatMap((branch) => {
    const branchItems = meta.members.filter((member) => member.branch?.slug === branch.slug);
    const pageCount = Math.ceil(branchItems.length / memberPageSize);

    return Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => {
      const page = index + 2;

      return {
        params: {
          branch: branch.slug,
          page: String(page)
        },
        props: createMemberDirectoryPage(meta, { kind: "branch", branchSlug: branch.slug }, page)
      };
    });
  });
};

export const getMemberStaticPaths = async () => {
  const meta = await getMemberDirectoryMeta();

  return meta.members.map((member) => ({
    params: {
      slug: member.slug
    }
  }));
};
