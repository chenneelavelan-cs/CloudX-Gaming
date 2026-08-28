import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export function parsePagination(req: Request, defaultLimit = 20): PaginationParams {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? String(defaultLimit)), 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  { page, limit }: Pick<PaginationParams, 'page' | 'limit'>
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}
