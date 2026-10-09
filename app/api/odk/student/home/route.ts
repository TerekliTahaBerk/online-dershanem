import { NextResponse } from "next/server";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { loadOdkStudentHome } from "@/lib/odk/student-dashboard-server";
import { toMobileOdkHome } from "@/lib/mobile/odk-views";

/**
 * Deneme Ligi öğrenci Bugün — web `components/odk/student-dl-home.tsx` ile
 * AYNI yükleyici. Kapı: ODK öğrencisi (pilot + aktif ürün erişimi). Denemeler
 * yalnız aktif sözleşme haklarından okunur; öğrenci kimliği oturumdan gelir.
 */
export async function GET() {
  const auth = await requireApiProductRole("ODK", "STUDENT");
  if (!auth.ok) return auth.response;
  const data = await loadOdkStudentHome(auth.session.userId);
  return NextResponse.json(toMobileOdkHome(data), { headers: { "Cache-Control": "private, no-store" } });
}
