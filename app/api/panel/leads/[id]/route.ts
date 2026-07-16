import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

const schema = z.object({ status: z.enum(["NEW", "REVIEWING", "CONTACTED", "ENROLLED", "ARCHIVED"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.leads.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:leads:${auth.session.userId}`, rateLimit: { max: 120, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Talep durumu geçersiz." }, { status: 400 });
  const { id } = await context.params;
  const result = await prisma.leadSubmission.updateMany({ where: { id }, data: { intakeStatus: parsed.data.status } });
  if (!result.count) return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
