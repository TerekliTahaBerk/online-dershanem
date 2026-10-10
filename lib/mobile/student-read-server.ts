import "server-only";

import type { MobileInsights } from "@/lib/mobile-contracts/student";
import { MOBILE_STUDENT_CONTRACT_VERSION } from "@/lib/mobile-contracts/student";
import { toMobileInsights } from "@/lib/mobile/student-views";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { prisma } from "@/lib/prisma";
import { formatPeriodRangeLabel, loadStudentProgressInsight } from "@/lib/progress-insights/server";

/**
 * Mobil öğrenci okuma modelleri (M2) — web sayfalarının kullandığı servisleri
 * çağırır; sorgu / metrik kopyalanmaz. Çağıran aktif öğrenci ürün
 * erişimini (`requireApiAnyProductRole`) önceden doğrulamış olmalıdır.
 */

/** `null` → özellik kapalı (`progressInsights`). */
export async function loadMobileInsights(input: { studentUserId: string; now?: Date }): Promise<MobileInsights | null> {
  const flags = getPanelFeatureFlags();
  if (!flags.progressInsights) return null;
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: input.studentUserId },
    select: { id: true, weeklyGoal: true, weeklyGoalUpdatedAt: true },
  });
  if (!profile) return { contractVersion: MOBILE_STUDENT_CONTRACT_VERSION, state: "NO_PROFILE" };
  const bundle = await loadStudentProgressInsight({ studentProfileId: profile.id, audience: "student", includeExams: true, now: input.now });
  if (!bundle) return { contractVersion: MOBILE_STUDENT_CONTRACT_VERSION, state: "NO_PROFILE" };
  return toMobileInsights({
    bundle,
    periodRange: formatPeriodRangeLabel(bundle.period),
    weeklyGoal: profile.weeklyGoal,
    weeklyGoalUpdatedAt: profile.weeklyGoalUpdatedAt,
    mockExamAnalysis: flags.mockExamAnalysis,
  });
}
