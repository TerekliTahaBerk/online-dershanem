import { loadParentCalmHome } from "@/lib/panel/parent-calm-server";
import { toMobileParentHome } from "@/lib/mobile/parent-views";
import { parentJson, requireParentChild } from "@/lib/panel/parent-api";

/** Veli Bugün — web `app/panel/veli` ile AYNI `loadParentCalmHome` (durum cümlesi, eylemler sunucuda). */
export async function GET(request: Request) {
  const scope = await requireParentChild(request);
  if (!scope.ok) return scope.response;
  const home = await loadParentCalmHome({ parentUserId: scope.auth.session.userId, selected: scope.child });
  return parentJson(toMobileParentHome(home, scope.child.products));
}
