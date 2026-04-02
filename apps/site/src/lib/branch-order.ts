export const preferredBranchSlugs = [
  "beijing",
  "shanghai",
  "shenzhen",
  "guangzhou",
  "hangzhou",
  "chengdu",
  "silicon-valley",
  "nanjing",
  "xiamen",
  "suzhou",
  "wuhan",
  "singapore"
] as const;

export const preferredBranchCities = [
  "北京",
  "上海",
  "深圳",
  "广州",
  "杭州",
  "成都",
  "硅谷",
  "南京",
  "厦门",
  "苏州",
  "武汉",
  "新加坡"
] as const;

const slugOrderMap = new Map<string, number>(preferredBranchSlugs.map((slug, index) => [slug, index]));
const cityOrderMap = new Map<string, number>(preferredBranchCities.map((city, index) => [city, index]));

export const getBranchOrderIndex = (branch: { slug?: string | null; cityName?: string | null } | null | undefined) => {
  const slug = branch?.slug?.trim().toLowerCase();

  if (slug && slugOrderMap.has(slug)) {
    return slugOrderMap.get(slug)!;
  }

  const cityName = branch?.cityName?.trim();

  if (cityName && cityOrderMap.has(cityName)) {
    return cityOrderMap.get(cityName)!;
  }

  return Number.POSITIVE_INFINITY;
};

export const sortByBranchOrder = <T>(
  items: T[],
  getBranch: (item: T) => { slug?: string | null; cityName?: string | null } | null | undefined
) =>
  [...items].sort((left, right) => {
    const leftIndex = getBranchOrderIndex(getBranch(left));
    const rightIndex = getBranchOrderIndex(getBranch(right));

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return 0;
  });

export const orderBranchCities = (cities: string[]) =>
  [...cities].sort((left, right) => {
    const leftIndex = getBranchOrderIndex({ cityName: left });
    const rightIndex = getBranchOrderIndex({ cityName: right });

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.localeCompare(right, "zh-CN");
  });
