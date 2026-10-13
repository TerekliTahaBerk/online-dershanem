import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { invalidApiInput } from "@/lib/api/input-validation";
import { staffJson, PRIVATE_NO_STORE } from "@/lib/panel/staff-api";
import { attemptReviewRevision, loadOdkOpsAttempt } from "@/lib/odk/ops-console-server";
import { toMobileOdkOpsAttempt } from "@/lib/mobile/odk-ops-views";

/** K03 bütünlük sekmesi — kayıt paneli (yalnız bu denemenin kaydı; K04 projeksiyonu). */
const paramsSchema = z.object({ id: z.string().regex(/^[\w-]{1,64}$/), attemptId: z.string().regex(/^[\w-]{1,64}$/) });

export async function GET(_request: Request, context: { params: Promise<{ id: string; attemptId: string }> }) {
  const auth = await requireApiStaffPermission("odk:integrity:review"); if (!auth.ok) return auth.response;
  const params = paramsSchema.safeParse(await context.params); if (!params.success) return invalidApiInput();
  const now = new Date();
  const attempt = await loadOdkOpsAttempt(params.data.attemptId, now, { examId: params.data.id });
  if (!attempt) return NextResponse.json({ error: "Kayıt bulunamadı.", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_NO_STORE });
  return staffJson(toMobileOdkOpsAttempt({ attempt, revision: attemptReviewRevision(attempt), canReview: true, now }));
}
