import { NextResponse } from "next/server";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { toMobileReviewQueue } from "@/lib/mobile/student-views";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { loadStudentReviewQueue } from "@/lib/panel/student-review-recovery-server";

/**
 * Öğrencinin bugünkü tekrar kuyruğu — web `app/panel/ogrenci/tekrar` ile
 * AYNI yükleyici. Yanıt / erteleme mevcut `POST /api/panel/review-queue/[id]/…`
 * uçlarıyla yapılır (idempotent). `reviewQueue` kapalıysa 404 `FEATURE_DISABLED`.
 */
export async function GET() {
  const auth = await requireApiOdRole("STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().reviewQueue) return NextResponse.json({ error: "Tekrar kuyruğu henüz açık değil.", code: "FEATURE_DISABLED" }, { status: 404 });
  const queue = await loadStudentReviewQueue({ studentUserId: auth.session.userId });
  return NextResponse.json(toMobileReviewQueue(queue), { headers: { "Cache-Control": "private, no-store" } });
}
