import { NextResponse } from "next/server";
import { requireApiRecentStaffStepUp, requireApiStaffPermission } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { bookletCorrectionCommitSchema, bookletOrdersPreviewSchema } from "@/lib/odk/admin-schemas";
import { commitBookletCorrection, previewBookletCorrection } from "@/lib/odk/booklet-server";

/**
 * Kitapçık sırası düzeltmesi (taslak sonrası): POST etkiyi önizler (yazmaz),
 * PUT hash korumalı uygular — cevaplar konuma göre taşınır, gerekirse yeniden
 * puanlanır. Cevap anahtarı revizyonuyla aynı yetki (`odk:key:revise`).
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:key:revise"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.booklets.correction.preview", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:booklets-correction-preview:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const parsed = bookletOrdersPreviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kitapçık sırası satırları geçerli görünmüyor." }, { status: 400 });
  return previewBookletCorrection(params.data.id, parsed.data.rows);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  // Sonuçları değiştirebilen işlem: anahtar revizyonu gibi yakın zamanda kimlik doğrulaması ister.
  const auth = await requireApiRecentStaffStepUp("odk:key:revise"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.booklets.correction.commit", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:booklets-correction:${auth.session.userId}`, rateLimit: { max: 10, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const parsed = bookletCorrectionCommitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kitapçık sırası, önizleme hash'i ve en az 5 karakterlik gerekçe gerekli." }, { status: 400 });
  return commitBookletCorrection(params.data.id, parsed.data, { userId: auth.session.userId, role: auth.session.role });
}
