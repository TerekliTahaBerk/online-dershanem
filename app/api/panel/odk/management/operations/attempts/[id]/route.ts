import { NextResponse } from "next/server";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { staffJson, PRIVATE_NO_STORE } from "@/lib/panel/staff-api";
import { hasStaffPermission } from "@/lib/products/staff-permissions";
import { attemptReviewRevision, loadOdkOpsAttempt } from "@/lib/odk/ops-console-server";
import { toMobileOdkOpsAttempt } from "@/lib/mobile/odk-ops-views";

/**
 * K04 · Kayıt yan paneli — web çekmecesiyle aynı alanlar (durum, son sinyal,
 * cevap sayısı, bütünlük, son 60 olay). Yalnız konsolun izlediği denemelerin
 * kayıtları; diğerleri 404. Cevap içeriği / puan / IP / cihaz verisi yok.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:ops:live"); if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params); if (!params.success) return invalidApiInput();
  const now = new Date();
  const [attempt, canReview] = await Promise.all([loadOdkOpsAttempt(params.data.id, now), hasStaffPermission(auth.session.userId, "odk:integrity:review")]);
  if (!attempt) return NextResponse.json({ error: "Aradığınız kaydı bulamadık.", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_NO_STORE });
  return staffJson(toMobileOdkOpsAttempt({ attempt, revision: attemptReviewRevision(attempt), canReview, now }));
}
