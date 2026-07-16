import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.relationships.delete", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:relations:delete:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const { id } = await context.params;
  const result = await prisma.parentStudent.deleteMany({ where: { id } });
  if (!result.count) return NextResponse.json({ error: "Veli bağlantısı bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
