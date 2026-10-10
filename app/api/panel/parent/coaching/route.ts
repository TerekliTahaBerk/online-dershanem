import { loadParentCoaching, loadParentCoachingSessions } from "@/lib/panel/parent-coaching-server";
import { toMobileParentCoaching } from "@/lib/mobile/parent-views";
import { parentJson, requireParentChild } from "@/lib/panel/parent-api";

/**
 * Veli · Yön Koçluk — web `app/panel/veli/kocluk` ile aynı yükleyici. Yalnız
 * çocuğun Yön Koçluk (OK) erişimi varsa veri; yayınlanmış plan / özet ve
 * PARENT_VISIBLE notlar. Görüşmeler salt okunur (katılım bağlantısı yok).
 */
export async function GET(request: Request) {
  const scope = await requireParentChild(request);
  if (!scope.ok) return scope.response;
  const available = scope.child.products.includes("OK");
  const [view, sessions] = available
    ? await Promise.all([loadParentCoaching(scope.child), loadParentCoachingSessions(scope.auth.session.userId, scope.child)])
    : [null, []];
  return parentJson(toMobileParentCoaching({ studentId: scope.child.id, available, view, sessions }));
}
