import { NextResponse } from "next/server";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { toMobileWeeklyDigest } from "@/lib/mobile/student-views";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { loadStudentWeeklyDigest, recordWeeklyDigestViewed } from "@/lib/panel/student-review-recovery-server";

/**
 * Öğrencinin son yayınlanmış haftalık özeti — web `app/panel/ogrenci/haftalik`
 * ile AYNI yükleyici ve görüntüleme olayı. Salt okunur; öğretmenin özel notu
 * bu özete hiç girmez. `parentWeeklyDigest` kapalıysa 404 `FEATURE_DISABLED`.
 */
export async function GET() {
  const auth = await requireApiOdRole("STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().parentWeeklyDigest) return NextResponse.json({ error: "Haftalık özet şu anda açık değil.", code: "FEATURE_DISABLED" }, { status: 404 });
  const digest = await loadStudentWeeklyDigest({ studentUserId: auth.session.userId });
  if (digest) await recordWeeklyDigestViewed(digest, auth.session.role);
  return NextResponse.json(toMobileWeeklyDigest(digest), { headers: { "Cache-Control": "private, no-store" } });
}
