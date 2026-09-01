import type { ProductCode } from "@prisma/client";
import {
  formatIstanbulDateInput,
  resolveIstanbulDateRange,
  type IstanbulDateRange,
} from "@/lib/istanbul-time";

/**
 * Management analytics cohort / dashboard filters.
 * Timezone: Europe/Istanbul (resolveIstanbulDateRange).
 */

export type AnalyticsProductFilter = ProductCode | "ALL";

export type AnalyticsCohortFilters = {
  from: Date;
  to: Date;
  notice: string | null;
  examType: "LGS" | "TYT" | "AYT" | "YDT" | "ALL";
  classLevel: string | null;
  product: AnalyticsProductFilter;
  groupId: string | null;
  teacherId: string | null;
};

export type AnalyticsFilterInput = {
  from?: unknown;
  to?: unknown;
  examType?: unknown;
  classLevel?: unknown;
  product?: unknown;
  groupId?: unknown;
  teacherId?: unknown;
  defaultDays?: number;
  maxDays?: number;
  now?: Date;
};

const EXAM_TYPES = new Set(["LGS", "TYT", "AYT", "YDT", "ALL"]);
const PRODUCTS = new Set(["OD", "OK", "ODK", "ALL"]);

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function parseAnalyticsFilters(input: AnalyticsFilterInput = {}): AnalyticsCohortFilters {
  const range: IstanbulDateRange = resolveIstanbulDateRange({
    from: input.from,
    to: input.to,
    defaultDays: input.defaultDays ?? 30,
    maxDays: input.maxDays ?? 366,
    now: input.now,
  });

  const examRaw = asTrimmedString(input.examType)?.toUpperCase() ?? "ALL";
  const productRaw = asTrimmedString(input.product)?.toUpperCase() ?? "ALL";

  return {
    from: range.from,
    to: range.to,
    notice: range.notice,
    examType: EXAM_TYPES.has(examRaw) ? (examRaw as AnalyticsCohortFilters["examType"]) : "ALL",
    classLevel: asTrimmedString(input.classLevel),
    product: PRODUCTS.has(productRaw) ? (productRaw as AnalyticsProductFilter) : "ALL",
    groupId: asTrimmedString(input.groupId),
    teacherId: asTrimmedString(input.teacherId),
  };
}

/** Cache / export anahtarı için stabil filtre özeti (PII yok). */
export function analyticsFilterCacheKey(filters: AnalyticsCohortFilters): string {
  return [
    formatIstanbulDateInput(filters.from),
    formatIstanbulDateInput(filters.to),
    filters.examType,
    filters.classLevel ?? "-",
    filters.product,
    filters.groupId ?? "-",
    filters.teacherId ?? "-",
  ].join("|");
}

export function productMatchesFilter(
  product: ProductCode | null | undefined,
  filter: AnalyticsProductFilter,
): boolean {
  if (filter === "ALL") return true;
  return product === filter;
}
