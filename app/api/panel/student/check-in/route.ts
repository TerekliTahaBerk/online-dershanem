import { NextResponse } from "next/server";
import { requireApiAnyProductRole } from "@/lib/auth/api-guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { loadStudentCheckIn } from "@/lib/panel/student-check-in-server";
import { toMobileCheckInState } from "@/lib/mobile/yon-views";

/**
 * Ortak check-in durumu (OD + Yön) — web `app/panel/ogrenci/check-in` ile
 * AYNI kapı (`OD` veya `OK` öğrencisi) ve AYNI yükleyici. Haftalık kalan
 * hak ve destek alanları sunucudan gelir; yazma mevcut
 * `POST /api/panel/student-check-ins` ucundadır.
 */
export async function GET() {
  const auth = await requireApiAnyProductRole(["OD", "OK"], "STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().studentCheckIn) {
    return NextResponse.json({ error: "Check-in şu anda açık değil.", code: "FEATURE_DISABLED" }, { status: 404 });
  }
  const data = await loadStudentCheckIn({ userId: auth.session.userId });
  return NextResponse.json(toMobileCheckInState(data), { headers: { "Cache-Control": "private, no-store" } });
}
