/**
 * Server-safe pagination parser. Lives in a separate file (no "use client")
 * so server components can import it without dragging the React tree.
 */
export type ParsedPagination = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

const ALLOWED_SIZES = new Set([25, 50, 100, 200]);

export function parsePagination(
  searchParams: { page?: string; pageSize?: string },
  defaults: { pageSize?: number; maxPageSize?: number } = {},
): ParsedPagination {
  const defSize = defaults.pageSize ?? 50;
  const max = defaults.maxPageSize ?? 200;

  let page = Number.parseInt(searchParams.page ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > 100000) page = 100000;

  let pageSize = Number.parseInt(searchParams.pageSize ?? String(defSize), 10);
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = defSize;
  if (!ALLOWED_SIZES.has(pageSize)) pageSize = defSize;
  if (pageSize > max) pageSize = max;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
