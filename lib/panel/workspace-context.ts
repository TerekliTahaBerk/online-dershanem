import type { ProductCode, UserRole } from "@prisma/client";
import { resolveNavScope } from "./navigation";

export const WORKSPACE_HEADER = "x-panel-workspace";
export const WORKSPACE_PARAM = "calismaAlani";

export function parseWorkspace(value: string | null | undefined): ProductCode | null {
  return value === "OD" || value === "OK" || value === "ODK" ? value : null;
}

/** Shared pages retain their workspace in the URL, including the router cache key. */
export function withWorkspace(href: string, scope: ProductCode | null | undefined): string {
  if (!scope || !href.startsWith("/panel/")) return href;
  const url = new URL(href, "https://panel.invalid");
  if (url.pathname.startsWith("/panel/odk/") || url.pathname.startsWith("/panel/yonetim/isletme")) return href;
  url.searchParams.set(WORKSPACE_PARAM, scope);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Presentation only: product access and page guards remain authoritative. */
export function resolveWorkspaceScope(input: {
  role: UserRole;
  products: readonly ProductCode[];
  product?: ProductCode;
  requested?: ProductCode | null;
  selected?: ProductCode | null;
}): ProductCode | null {
  const candidates = [input.product, input.requested, input.selected, "OD", "OK"] as const;
  for (const candidate of candidates) {
    const resolved = resolveNavScope(input.role, input.products, candidate);
    if (resolved) return resolved;
  }
  return null;
}
