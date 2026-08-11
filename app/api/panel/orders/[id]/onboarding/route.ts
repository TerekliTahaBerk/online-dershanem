import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { prisma } from "@/lib/prisma";
import { OD_ONBOARDING_STATES } from "@/lib/od/onboarding-state";
import { OdOnboardingError, transitionOdOnboarding } from "@/lib/od/onboarding";

const schema = z.object({
  toState: z.enum(OD_ONBOARDING_STATES),
  ownerId: z.string().min(1).nullable().optional(),
  dueAt: z.iso.datetime().nullable().optional(),
  blockerReason: z.string().trim().max(500).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.orders.onboarding.transition", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:onboarding:${auth.session.userId}`, rateLimit: { max: 120, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçiş bilgileri geçersiz." }, { status: 400 });
  const { id } = await context.params;
  if (parsed.data.ownerId) {
    const owner = await prisma.user.findFirst({ where: { id: parsed.data.ownerId, role: { in: ["ADMIN", "TEACHER"] }, status: "ACTIVE" }, select: { id: true } });
    if (!owner) return NextResponse.json({ error: "Aktif operasyon sorumlusu bulunamadı." }, { status: 404 });
  }

  try {
    const onboarding = await transitionOdOnboarding({
      orderId: id,
      toState: parsed.data.toState,
      actorUserId: auth.session.userId,
      ownerId: parsed.data.ownerId,
      dueAt: parsed.data.dueAt === undefined ? undefined : parsed.data.dueAt === null ? null : new Date(parsed.data.dueAt),
      blockerReason: parsed.data.blockerReason,
      note: parsed.data.note,
    });
    return NextResponse.json({ ok: true, onboarding });
  } catch (error) {
    if (error instanceof OdOnboardingError) {
      const status = error.code === "NOT_FOUND" ? 404 : error.code === "CONFLICT" ? 409 : 422;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    throw error;
  }
}
