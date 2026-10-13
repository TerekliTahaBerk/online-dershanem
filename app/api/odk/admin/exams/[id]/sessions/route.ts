import { NextResponse } from "next/server";
import { updateOdkExamSessions } from "@/lib/odk/exam-commands-server";
import { z } from "zod";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

const schema = z.object({
  sessions: z
    .array(z.object({ key: z.string().min(1).max(40), durationMinutes: z.number().int(), breakAfterMinutes: z.number().int() }))
    .min(2)
    .max(6),
});

/**
 * Oturumlu denemenin (LGS) süre / ara düzenlemesi. Yalnız taslak sürümde;
 * oturum anahtarları ve bölüm dağılımı şablondan gelir, değişmez. Sürüm süresi
 * oturum sürelerinin toplamına eşitlenir (başlatma ucu planı okur).
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:exam:edit"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.sessions.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:sessions:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Oturum alanlarını kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  return updateOdkExamSessions(id, parsed.data.sessions, auth.session.userId);
}
