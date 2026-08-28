import { PaginatedResponse } from '../models';

export function normalizePaginatedResponse<T>(
  response: PaginatedResponse<T> | T[] | null | undefined,
  page = 1,
  limit = 20
): PaginatedResponse<T> {
  if (Array.isArray(response)) {
    return {
      items: response,
      total: response.length,
      page: 1,
      limit: response.length || limit,
      hasMore: false,
    };
  }

  if (response && Array.isArray(response.items)) {
    return response;
  }

  return { items: [], total: 0, page, limit, hasMore: false };
}
