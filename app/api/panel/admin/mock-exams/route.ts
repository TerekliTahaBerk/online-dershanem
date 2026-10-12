import { z } from "zod";
import { invalidApiInput } from "@/lib/api/input-validation";
import { toMobileMockExams } from "@/lib/mobile/admin-rollout-views";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { loadAdminMockExams } from "@/lib/panel/admin-mock-exams-server";

const querySchema = z.object({ ogrenci: z.string().trim().min(1).max(191).optional() }).strict();

/**
 * Dış denemeler (Y18) — web `yonetim/denemeler` ile AYNI yükleyici ve
 * hesaplar; seçili öğrencinin denemeleri ve kişisel hata eğilimi. Bayrak
 * kapalıysa 404 (web `notFound()` ile aynı).
 */
export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().mockExamAnalysis) return adminJson({ error: "Deneme analizi henüz açık değil.", code: "FEATURE_DISABLED" }, { status: 404 });
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return invalidApiInput();
  return adminJson(toMobileMockExams(await loadAdminMockExams(), query.data.ogrenci ?? null));
}
