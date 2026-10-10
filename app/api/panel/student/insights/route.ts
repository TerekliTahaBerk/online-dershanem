import { NextResponse } from "next/server";
import { requireApiAnyProductRole } from "@/lib/auth/api-guards";
import { loadMobileInsights } from "@/lib/mobile/student-read-server";

/**
 * Öğrenci Gidişat (web `app/panel/ogrenci/analiz` ile AYNI
 * `loadStudentProgressInsight` çıktısı). Aktif öğrenci ürün erişimi zorunlu; `progressInsights`
 * kapalıysa 404 `FEATURE_DISABLED` (web sayfası da 404). Metrik mobilde
 * yeniden hesaplanmaz. Eski `GET /api/panel/student/progress` eski mobil
 * sürümler için yerinde kalır.
 */
export async function GET() {
  const auth = await requireApiAnyProductRole(["OD", "OK", "ODK"], "STUDENT");
  if (!auth.ok) return auth.response;
  const body = await loadMobileInsights({ studentUserId: auth.session.userId });
  if (!body) return NextResponse.json({ error: "Gidişat analizi şu anda açık değil.", code: "FEATURE_DISABLED" }, { status: 404 });
  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
