import type {
  Group360MemberRisk,
  Group360OpsStatus,
} from "@/lib/panel/group-360";

/**
 * Grup 360 için sunucu ve istemci parçalarının ortak saf yardımcıları
 * ("use client" yok; iki taraf da içe aktarabilir).
 */

export const GROUP_360_DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export const GROUP_360_DAY = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Istanbul",
});

export function opsTone(
  status: Group360OpsStatus,
): "neutral" | "success" | "warning" | "critical" {
  if (status === "critical") return "critical";
  if (status === "attention") return "warning";
  if (status === "archived") return "neutral";
  return "success";
}

export function riskTone(level: Group360MemberRisk): "default" | "ok" | "warn" {
  if (level === "high" || level === "medium") return "warn";
  if (level === "none") return "ok";
  return "default";
}

/** İşlem sonucu satırı (istemci adalarında `role="status"` ile kullanılır). */
export const GROUP_360_MESSAGE_CLASS =
  "rounded-md bg-(--pn-tone-info-soft) px-3 py-2 text-[13px] font-medium text-(--pn-tone-info)";

/** Önizleme / sorun kutusu. */
export const GROUP_360_BOX_CLASS =
  "rounded-md border border-pn-border p-3";
