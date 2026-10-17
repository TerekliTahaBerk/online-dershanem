import { NextResponse } from "next/server";
import { assignOdkExam } from "@/lib/odk/exam-commands-server";
import { loadOdkExamAssignments } from "@/lib/odk/exam-assignments-server";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { assignmentCreateSchema } from "@/lib/odk/admin-schemas";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:exam:assign"); if (!auth.ok) return auth.response;
  const routeParams = idParamsSchema.safeParse(await context.params);
  if (!routeParams.success) return invalidApiInput();
  const { id } = routeParams.data;
  return NextResponse.json(await loadOdkExamAssignments(id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:exam:assign"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.assign", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:assign:${auth.session.userId}`, rateLimit: { max: 40, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const routeParams = idParamsSchema.safeParse(await context.params);
  if (!routeParams.success) return invalidApiInput();
  const { id } = routeParams.data;
  const parsed = assignmentCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Atama geçerli görünmüyor." }, { status: 400 });
  return assignOdkExam(id, parsed.data, auth.session.userId);
}
