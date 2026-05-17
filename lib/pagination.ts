/**
 * Round 3 — Pagination helpers (offset-based + cursor-based).
 *
 * Tüm liste action'ları için tek tip pagination tipi. Mevcut sorguların
 * çoğu `.findMany({ take: 100 })` ile zımni cap kullanıyor — bu helper'a
 * geçince filtre + total + nextCursor standart hale gelir.
 */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type PaginationInput = {
  page?: number;
  pageSize?: number;
  cursor?: string | null;
};

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  /** Cursor pagination kullanıyorsa son item'ın id'si. */
  nextCursor: string | null;
};

export function parsePagination(
  raw: PaginationInput | URLSearchParams | { searchParams?: PaginationInput } | undefined,
  defaults: { pageSize?: number; maxPageSize?: number } = {},
): { page: number; pageSize: number; skip: number; cursor: string | null } {
  const maxPageSize = defaults.maxPageSize ?? MAX_PAGE_SIZE;
  const defaultSize = defaults.pageSize ?? DEFAULT_PAGE_SIZE;

  let pageRaw: unknown;
  let sizeRaw: unknown;
  let cursorRaw: unknown;

  if (raw instanceof URLSearchParams) {
    pageRaw = raw.get("page");
    sizeRaw = raw.get("pageSize") ?? raw.get("limit");
    cursorRaw = raw.get("cursor");
  } else if (raw && typeof raw === "object") {
    const r = (raw as { searchParams?: PaginationInput }).searchParams ?? (raw as PaginationInput);
    pageRaw = r.page;
    sizeRaw = r.pageSize;
    cursorRaw = r.cursor;
  }

  const page = Math.max(1, Number(pageRaw) || 1);
  const pageSize = Math.min(maxPageSize, Math.max(1, Number(sizeRaw) || defaultSize));
  const cursor = typeof cursorRaw === "string" && cursorRaw.length > 0 ? cursorRaw : null;
  return { page, pageSize, skip: (page - 1) * pageSize, cursor };
}

export function makePage<T extends { id?: string }>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Page<T> {
  const hasNext = page * pageSize < total;
  const nextCursor = hasNext && items.length > 0 ? (items[items.length - 1]?.id ?? null) : null;
  return { items, total, page, pageSize, hasNext, nextCursor };
}

/**
 * Prisma findMany + count'u tek seferde paralel çağırır.
 * Kullanım:
 *   const { items, ... } = await paginateFindMany(
 *     prisma.student,
 *     { where: { ... }, orderBy: { ... } },
 *     { page, pageSize },
 *   );
 */
export async function paginateFindMany<T extends { id?: string }>(
  model: {
    findMany: (args: Record<string, unknown>) => Promise<T[]>;
    count: (args: { where?: Record<string, unknown> }) => Promise<number>;
  },
  args: { where?: Record<string, unknown>; orderBy?: unknown; select?: unknown; include?: unknown },
  pagination: { page: number; pageSize: number },
): Promise<Page<T>> {
  const { page, pageSize } = pagination;
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    model.findMany({ ...args, skip, take: pageSize } as Record<string, unknown>),
    model.count({ where: args.where }),
  ]);
  return makePage(items, total, page, pageSize);
}
