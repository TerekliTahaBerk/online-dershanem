import { NextResponse } from "next/server";
import { z } from "zod";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PRIVATE_NO_STORE, requireStaffApi, staffFeatureDisabled, staffJson } from "@/lib/panel/staff-api";
import { loadTeacherRecovery } from "@/lib/panel/teacher-recovery-server";
import { runEducationMutation } from "@/lib/panel/education-write";
import { GroupMutationError, operationDigest, readGroupReceipt } from "@/lib/panel/group-mutation-core";
import { prisma } from "@/lib/prisma";
import { generateRecoveryPackage, publishRecoveryPackage } from "@/lib/recovery-package-server";
import { guardMutation } from "@/lib/security/mutation-guard";

export async function GET() {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().recoveryPackage) return staffFeatureDisabled("Telafi paketi henüz açık değil.");
  return staffJson({ contractVersion: 1, rows: await loadTeacherRecovery(auth.session.userId) });
}

const command = z.object({ attendanceId: z.string().min(1).max(100), action: z.enum(["generate", "publish"]) }).strict();
const controls = z.object({ key: z.string().uuid(), revision: z.string().regex(/^[a-f0-9]{64}$/) });
export async function POST(request: Request) {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  const flags = getPanelFeatureFlags();
  if (!flags.recoveryPackage) return staffFeatureDisabled("Telafi paketi henüz açık değil.");
  const guard = await guardMutation({ action: "panel.teacher.recovery", requireSameOrigin: true, headers: request.headers, rateLimitKey: `teacher:recovery:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { headers: PRIVATE_NO_STORE, status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = command.safeParse(await request.json().catch(() => null));
  const control = controls.safeParse({ key: request.headers.get("X-Od-Idempotency-Key"), revision: request.headers.get("X-Od-Expected-Revision") });
  if (!parsed.success || !control.success) return NextResponse.json({ error: "İşlem, anahtar veya sürüm geçersiz." }, { headers: PRIVATE_NO_STORE, status: 400 });
  // Re-check ownership before receipt replay: an ended enrollment must revoke reads and writes.
  const allowed = (await loadTeacherRecovery(auth.session.userId)).some((row) => row.attendanceId === parsed.data.attendanceId);
  if (!allowed) return NextResponse.json({ error: "Kayıt bulunamadı." }, { headers: PRIVATE_NO_STORE, status: 404 });
  const digest = operationDigest({ command: parsed.data, revision: control.data.revision });
  const key = `teacher-recovery:${auth.session.userId}:${control.data.key}`;
  try {
    const result = await runEducationMutation({ kind: "recovery", targetKind: "student", key, actorId: auth.session.userId, action: `recovery.${parsed.data.action}`, digest, execute: async (db) => {
      const row = (await loadTeacherRecovery(auth.session.userId, db)).find((item) => item.attendanceId === parsed.data.attendanceId);
      if (!row) throw new GroupMutationError("NOT_FOUND", "Kayıt bulunamadı.", 404);
      if (row.revision !== control.data.revision) throw new GroupMutationError("RECOVERY_CONFLICT", "Telafi kaydı değişti. Güncel görünümü kontrol edin.");
      if (parsed.data.action === "generate") {
        if (row.package && row.package.status !== "DRAFT") throw new GroupMutationError("RECOVERY_CONFLICT", "Yayınlanmış paket yenilenemez.");
        const generated = await generateRecoveryPackage(row.attendanceId, auth.session.userId, db);
        if (!generated) throw new GroupMutationError("NOT_FOUND", "Kayıt bulunamadı.", 404);
        return NextResponse.json({ id: generated.package.id, generated: true });
      }
      if (!row.package) throw new GroupMutationError("RECOVERY_CONFLICT", "Önce telafi taslağını hazırlayın.");
      const published = await publishRecoveryPackage({ packageId: row.package.id, teacherId: auth.session.userId, expectedVersion: row.package.version, rebalancePlan: flags.adaptivePlan }, db);
      if (published.kind === "NOT_FOUND") throw new GroupMutationError("NOT_FOUND", "Kayıt bulunamadı.", 404);
      if (published.kind === "CONFLICT") throw new GroupMutationError("RECOVERY_CONFLICT", "Paket değişti. Güncel görünümü kontrol edin.");
      return NextResponse.json({ published: true });
    } });
    return staffJson({ ...(result.body as object), replayed: result.replayed });
  } catch (error) {
    if (error instanceof GroupMutationError) return NextResponse.json({ error: error.message, code: error.code }, { headers: PRIVATE_NO_STORE, status: error.status });
    if (typeof error === "object" && error && "code" in error && ["P2034", "P2002", "P2025"].includes(String(error.code))) {
      // Another request may have committed this exact operation while ours retried.
      const receipt = await prisma.auditLog.findUnique({ where: { idempotencyKey: key } });
      if (receipt) {
        try {
          const replay = readGroupReceipt(receipt.payload, digest);
          return staffJson({ ...(replay.body as object), replayed: true });
        } catch (conflict) {
          if (conflict instanceof GroupMutationError) return NextResponse.json({ error: conflict.message, code: conflict.code }, { headers: PRIVATE_NO_STORE, status: conflict.status });
          throw conflict;
        }
      }
      return NextResponse.json({ error: "Kayıt değişti. Güncel görünümü kontrol edin.", code: "RECOVERY_CONFLICT" }, { headers: PRIVATE_NO_STORE, status: 409 });
    }
    throw error;
  }
}
