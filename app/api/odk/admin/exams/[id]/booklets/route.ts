import { NextResponse } from "next/server";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { bookletOrdersCommitSchema, bookletOrdersPreviewSchema } from "@/lib/odk/admin-schemas";
import { previewBookletOrders, replaceBookletOrders } from "@/lib/odk/booklet-server";

/** Çoklu kitapçık sırası: POST önizleme (yazmaz), PUT hash korumalı kayıt (yalnız taslak). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:exam:edit"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.booklets.preview", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:booklets-preview:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const parsed = bookletOrdersPreviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kitapçık sırası satırları geçersiz." }, { status: 400 });
  return previewBookletOrders(params.data.id, parsed.data.rows);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:exam:edit"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.booklets.commit", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:booklets-commit:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const parsed = bookletOrdersCommitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kitapçık sırası ve önizleme hash'i gerekli." }, { status: 400 });
  return replaceBookletOrders(params.data.id, parsed.data, auth.session.userId);
}
