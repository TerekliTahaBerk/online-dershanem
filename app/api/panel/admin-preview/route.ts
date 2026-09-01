import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { endAdminPreview, hasAdminPreviewPermission, startAdminPreview } from "@/lib/auth/admin-preview";
import { isPreviewableRole } from "@/lib/panel/preview-context";
import { previewErrorMessage } from "@/lib/panel/preview-resolution";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";

export const dynamic = "force-dynamic";

const startSchema = z.object({
  previewRole: z.enum(["STUDENT", "PARENT", "TEACHER"]),
  previewUserId: z.string().min(1).max(80),
  returnPath: z.string().max(240).optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requireApiAccountRole("ADMIN");
  if (!auth.ok) return auth.response;
  if (!hasAdminPreviewPermission(auth.session)) {
    return NextResponse.json({ error: previewErrorMessage("FORBIDDEN") }, { status: 403 });
  }

  const guard = await guardMutation({
    action: "admin.preview.start",
    requireSameOrigin: true,
    headers: request.headers,
    userId: auth.session.userId,
    rateLimit: { max: 30, windowMs: 15 * 60_000 },
    allowAdminPreviewWrite: true,
  });
  if (!guard.ok) return mutationGuardResponse(guard);

  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isPreviewableRole(parsed.data.previewRole)) {
    return NextResponse.json({ error: "Önizleme isteği geçersiz." }, { status: 400 });
  }

  const result = await startAdminPreview({
    actor: auth.session,
    previewRole: parsed.data.previewRole,
    previewUserId: parsed.data.previewUserId,
    returnPath: parsed.data.returnPath,
  });
  if (!result.ok) {
    return NextResponse.json({ error: previewErrorMessage(result.error) }, { status: 400 });
  }

  return NextResponse.json(
    { ok: true, homePath: result.homePath, context: result.context },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  const auth = await requireApiAccountRole("ADMIN");
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "admin.preview.end",
    requireSameOrigin: true,
    headers: request.headers,
    userId: auth.session.userId,
    rateLimit: { max: 60, windowMs: 15 * 60_000 },
    allowAdminPreviewWrite: true,
  });
  if (!guard.ok) return mutationGuardResponse(guard);

  const result = await endAdminPreview(auth.session);
  return NextResponse.json(
    { ok: true, returnPath: result.returnPath },
    { headers: { "Cache-Control": "no-store" } },
  );
}
