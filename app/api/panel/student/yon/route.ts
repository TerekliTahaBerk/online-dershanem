import { NextResponse } from "next/server";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { loadYonToday } from "@/lib/kocum/yon-today-server";
import { toMobileYonToday } from "@/lib/mobile/yon-views";

/**
 * Yön Bugün — web `app/panel/ogrenci/yon` ile AYNI yükleyici
 * (`loadYonToday`). Kapı Yön (OK) öğrencisidir; öğrenci kimliği oturumdan
 * gelir, istemciden alınmaz. Gizli not, INTERNAL not ve taslak plan yanıtta
 * yoktur.
 */
export async function GET() {
  const auth = await requireApiProductRole("OK", "STUDENT");
  if (!auth.ok) return auth.response;
  const data = await loadYonToday({ userId: auth.session.userId });
  return NextResponse.json(toMobileYonToday(data), { headers: { "Cache-Control": "private, no-store" } });
}
