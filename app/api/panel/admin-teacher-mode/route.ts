import { NextResponse } from "next/server";
import { requireApiAccountRole } from "@/lib/auth/api-guards";
import {
  canUseAdminTeacherMode,
  endAdminTeacherMode,
  startAdminTeacherMode,
} from "@/lib/auth/admin-teacher-mode";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireApiAccountRole("ADMIN");
  if (!auth.ok) return auth.response;
  if (!canUseAdminTeacherMode(auth.session)) {
    return NextResponse.json({ error: "Yalnız yöneticiler öğretmen çalışma moduna geçebilir." }, { status: 403 });
  }

  const guard = await guardMutation({
    action: "admin.teacher_mode.start",
    requireSameOrigin: true,
    headers: request.headers,
    userId: auth.session.userId,
    rateLimit: { max: 30, windowMs: 15 * 60_000 },
    allowAdminPreviewWrite: true,
  });
  if (!guard.ok) return mutationGuardResponse(guard);

  const result = await startAdminTeacherMode(auth.session);
  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.error === "PROFILE_FAILED"
            ? "Öğretmen profili oluşturulamadı."
            : "Öğretmen çalışma modu açılamadı.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { ok: true, homePath: result.homePath },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  const auth = await requireApiAccountRole("ADMIN");
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "admin.teacher_mode.end",
    requireSameOrigin: true,
    headers: request.headers,
    userId: auth.session.userId,
    rateLimit: { max: 60, windowMs: 15 * 60_000 },
    allowAdminPreviewWrite: true,
  });
  if (!guard.ok) return mutationGuardResponse(guard);

  const result = await endAdminTeacherMode(auth.session);
  return NextResponse.json(
    { ok: true, returnPath: result.returnPath },
    { headers: { "Cache-Control": "no-store" } },
  );
}
