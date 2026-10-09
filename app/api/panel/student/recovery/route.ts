import { NextResponse } from "next/server";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { toMobileRecovery } from "@/lib/mobile/student-views";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { prisma } from "@/lib/prisma";
import { loadStudentRecoveryPackages } from "@/lib/panel/student-review-recovery-server";

/**
 * Öğrencinin telafi paketleri — web `app/panel/ogrenci/telafi` ile AYNI
 * yükleyici (ilk görüntüleme kaydı dahil). Adım tamamlama / mini kontrol
 * mevcut `POST /api/panel/recovery-packages/[id]/…` uçlarıyladır.
 * `recoveryPackage` kapalıysa 404 `FEATURE_DISABLED`.
 */
export async function GET() {
  const auth = await requireApiOdRole("STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().recoveryPackage) return NextResponse.json({ error: "Telafi paketi henüz açık değil.", code: "FEATURE_DISABLED" }, { status: 404 });
  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId }, select: { id: true } });
  const packages = profile ? await loadStudentRecoveryPackages({ studentUserId: auth.session.userId, role: auth.session.role }) : null;
  return NextResponse.json(toMobileRecovery(packages), { headers: { "Cache-Control": "private, no-store" } });
}
