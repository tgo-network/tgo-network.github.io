import type { MemberSummary } from "@tgo/shared";

export interface MemberSearchIndexItem extends MemberSummary {
  searchText: string;
}

export interface MemberSearchFilters {
  q?: string | null;
  city?: string | null;
  branchSlug?: string | null;
}

const normalizeSearchValue = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";

const createSearchText = (member: MemberSummary) =>
  [member.name, member.company, member.title, member.branch?.name, member.branch?.cityName]
    .filter((value): value is string => Boolean(value?.trim()))
    .join("\n")
    .toLowerCase();

export const sortMemberSummaries = (items: MemberSummary[]) =>
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

export const createMemberSearchIndex = (members: MemberSummary[]): MemberSearchIndexItem[] =>
  members.map((member) => ({
    ...member,
    searchText: createSearchText(member)
  }));

export const filterMemberSearchIndex = (items: MemberSearchIndexItem[], filters: MemberSearchFilters): MemberSummary[] => {
  const keyword = normalizeSearchValue(filters.q);
  const city = normalizeSearchValue(filters.city);
  const branchSlug = normalizeSearchValue(filters.branchSlug);

  return items
    .filter((member) => {
      if (branchSlug && member.branch?.slug.toLowerCase() !== branchSlug) {
        return false;
      }

      if (city && member.branch?.cityName.toLowerCase() !== city) {
        return false;
      }

      if (keyword && !member.searchText.includes(keyword)) {
        return false;
      }

      return true;
    })
    .map(({ searchText: _searchText, ...member }) => member);
};
