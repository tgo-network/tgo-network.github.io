import type { PaginationMeta } from "@tgo/shared";

export const adminPageSizeOptions = [20, 50, 100] as const;

export const formatPaginationSummary = (meta: PaginationMeta, currentCount: number) =>
  `第 ${meta.page} / ${meta.pageCount} 页 · 每页 ${meta.pageSize} 条 · 当前 ${currentCount} 条`;
