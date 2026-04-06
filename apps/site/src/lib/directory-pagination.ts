import { preferredBranchCities, preferredBranchSlugs } from "./branch-order.js";

const extraCitySegments = {
  "台北": "taipei",
  "福州": "fuzhou",
  "青岛": "qingdao",
  "未标注分会": "unassigned",
  "未标注城市": "unassigned"
} as const;

const knownCitySegments = new Map<string, string>([
  ...preferredBranchCities.map((city, index) => [city, preferredBranchSlugs[index] ?? city] as const),
  ...Object.entries(extraCitySegments)
]);

export const getPageCount = (total: number, pageSize: number) => Math.max(1, Math.ceil(total / pageSize));

export const clampPageNumber = (page: number, pageCount: number) => {
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.min(Math.max(1, Math.trunc(page)), pageCount);
};

export const slicePageItems = <T>(items: T[], page: number, pageSize: number) => {
  const pageCount = getPageCount(items.length, pageSize);
  const currentPage = clampPageNumber(page, pageCount);
  const startIndex = (currentPage - 1) * pageSize;

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    page: currentPage,
    pageCount,
    total: items.length
  };
};

export const getCitySegment = (city: string) => {
  const normalizedCity = city.trim();

  return knownCitySegments.get(normalizedCity) ?? encodeURIComponent(normalizedCity);
};
