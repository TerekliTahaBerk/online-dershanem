import { NextResponse } from "next/server";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { bookletAssignmentSchema } from "@/lib/odk/admin-schemas";
import { loadBookletAssignments, setBookletAssignment } from "@/lib/odk/booklet-assignment-server";

/** Öğrenci başına kitapçık: GET liste (seçim + başlamışsa gerçek kitapçık), PUT seçim (yalnız başlamadan önce). */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:exam:assign"); if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const data = await loadBookletAssignments(params.data.id);
  return data ? NextResponse.json(data) : NextResponse.json({ error: "Denemeyi bulamadık." }, { status: 404 });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:exam:assign"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.booklets.assign", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:booklets-assign:${auth.session.userId}`, rateLimit: { max: 200, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const parsed = bookletAssignmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Öğrenci ve kitapçık (A–E ya da otomatik) gerekli." }, { status: 400 });
  return setBookletAssignment(params.data.id, parsed.data, auth.session.userId);
}
