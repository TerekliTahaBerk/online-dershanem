import { loadParentAssignments } from "@/lib/panel/parent-assignments-server";
import { toMobileParentAssignments } from "@/lib/mobile/parent-views";
import { parentJson, requireParentChild } from "@/lib/panel/parent-api";

/**
 * Veli · Ödevler — SALT OKUNUR (GET dışında metot yok). Web
 * `app/panel/veli/odevler` ile aynı yükleyici ve kanonik durum türetimi.
 * Ödev ürünü OD'dir; çocuğun OD erişimi yoksa liste boş, `available: false`.
 */
export async function GET(request: Request) {
  const scope = await requireParentChild(request);
  if (!scope.ok) return scope.response;
  const available = scope.child.products.includes("OD");
  const rows = available ? await loadParentAssignments(scope.child) : [];
  return parentJson(toMobileParentAssignments(scope.child.id, available, rows));
}
