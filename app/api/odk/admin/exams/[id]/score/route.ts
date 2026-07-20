import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { scoreOdkExam } from "@/lib/odk/scoring-service";
import { odkAttemptBand } from "@/lib/odk/telemetry";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { guardMutation } from "@/lib/security/mutation-guard";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.score", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:score:${auth.session.userId}`, rateLimit: { max: 10, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const result = await scoreOdkExam(id, auth.session.userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkExam", entityId: id, action: "odk.exam_scored", summary: "Teslim edilen denemeler puanlandı", payload: { scoredCount: result.scoredCount, answerKeyHash: result.answerKeyHash } });
  await recordPanelProductEvent({ name: "odk_exam_scored", properties: { family: result.family, attemptBand: odkAttemptBand(result.scoredCount) } }, "ADMIN");
  return NextResponse.json({ status: "SCORED", scoredCount: result.scoredCount });
}
