import { NextResponse } from "next/server";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { jsonImportCommitSchema, jsonImportPreviewSchema } from "@/lib/odk/admin-schemas";
import { commitOdkImport, previewOdkImport } from "@/lib/odk/exam-commands-server";

/** JSON içe aktarma — kural ortak servisten (`lib/odk/exam-commands-server.ts`, mobil K03b ile aynı). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:exam:edit"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.outcome.import_preview", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:out-preview:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const parsed = jsonImportPreviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "JSON gövdesi gerekli." }, { status: 400 });
  return previewOdkImport("outcomes", id, parsed.data.payload, auth.session.userId);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:exam:edit"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.outcome.import_commit", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:out-commit:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const parsed = jsonImportCommitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "importId gerekli." }, { status: 400 });
  return commitOdkImport("outcomes", id, parsed.data.importId, auth.session.userId);
}
