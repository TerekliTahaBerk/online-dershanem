import { loadParentLessons } from "@/lib/panel/parent-lessons-server";
import { toMobileParentLessons } from "@/lib/mobile/parent-views";
import { parentJson, requireParentChild } from "@/lib/panel/parent-api";

/** Veli · Dersler — web `app/panel/veli/takvim` ile aynı yükleyici; yalnız ortak ders notunun konusu. */
export async function GET(request: Request) {
  const scope = await requireParentChild(request);
  if (!scope.ok) return scope.response;
  return parentJson(toMobileParentLessons(scope.child.id, await loadParentLessons(scope.child)));
}
