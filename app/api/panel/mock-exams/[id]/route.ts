import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAnyProductRole } from "@/lib/auth/api-guards";
import { hasFreshStepUp } from "@/lib/auth/mfa-policy";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { MockExamError, reviseMockExamService } from "@/lib/panel/mock-exam-service";
import { isBearerRequest, stepUpRequired } from "@/lib/panel/mock-exam-http";

const category = z.enum(["KNOWLEDGE", "PROCESS", "ATTENTION", "TIME", "BLANK"]);
const schema = z.object({
  reasons: z.array(z.object({ sectionId: z.string().min(1), categories: z.array(category).max(3) })).max(8),
  nextAction: z.string().trim().max(240).nullable().optional(),
  idempotencyKey: z.string().uuid().optional(),
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

/**
 * Hata nedeni revizyonu ve sonraki adım onayı — web çalışma alanı ve mobil
 * yönetim ekranı aynı uç (`reviseMockExamService`). Yönetici taze step-up
 * ister; Bearer istekleri işlem anahtarı ve revizyon taşır.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAnyProductRole(["OD", "OK"], "ADMIN", "TEACHER", "STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().mockExamAnalysis) return NextResponse.json({ error: "Deneme analizi henüz açık değil." }, { status: 404 });
  if (auth.session.role === "ADMIN" && !hasFreshStepUp(auth.session.stepUpAt)) return stepUpRequired();
  const guard = await guardMutation({ action: "panel.mock_exam.review", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:mock-exam-review:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Hata nedenlerini kontrol edin." }, { status: 400 });
  if (isBearerRequest(request) && (!parsed.data.idempotencyKey || !parsed.data.expectedRevision)) return NextResponse.json({ error: "Güvenli işlem bilgisi eksik. Görünümü yenileyin.", code: "PRECONDITION_REQUIRED" }, { status: 400 });
  const { id } = await params;
  try {
    await reviseMockExamService({ userId: auth.session.userId, role: auth.session.role }, id, parsed.data);
  } catch (error) {
    if (error instanceof MockExamError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    throw error;
  }
  return new NextResponse(null, { status: 204 });
}
