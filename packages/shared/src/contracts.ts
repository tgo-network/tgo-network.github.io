export interface ApiSuccess<T, M = Record<string, unknown>> {
  data: T;
  meta?: M;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
