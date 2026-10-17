import { createOdkSeries } from "@/lib/odk/exam-create-server";
import { NextResponse } from "next/server";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { createSeriesSchema } from "@/lib/odk/admin-schemas";

export async function POST(request: Request) {
  const auth = await requireApiStaffPermission("odk:exam:edit"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.series.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:series:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = createSeriesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Lütfen seri bilgilerini bir kez daha kontrol eder misiniz?" }, { status: 400 });
  try { return await createOdkSeries(parsed.data, auth.session.userId); }
  catch (error) {
    if (typeof error === "object" && error && "code" in error && ["P2002", "P2034"].includes(String(error.code))) return NextResponse.json({ error: "Adres zaten kullanılıyor veya kayıt değişti." }, { status: 409 });
    throw error;
  }
}
