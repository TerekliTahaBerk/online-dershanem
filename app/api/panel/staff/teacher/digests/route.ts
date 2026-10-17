import { NextResponse } from "next/server";
import { z } from "zod";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PRIVATE_NO_STORE, requireStaffApi, staffFeatureDisabled, staffJson } from "@/lib/panel/staff-api";
import { loadTeacherDigests, generateTeacherDigest, publishTeacherDigest } from "@/lib/panel/teacher-digests-server";
import { runEducationMutation } from "@/lib/panel/education-write";
import { GroupMutationError, operationDigest, readGroupReceipt } from "@/lib/panel/group-mutation-core";
import { prisma } from "@/lib/prisma";
import { guardMutation } from "@/lib/security/mutation-guard";

export async function GET() {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().parentWeeklyDigest) return staffFeatureDisabled("Haftalık özet şu an kullanıma kapalı, çok yakında açılacak.");
  return staffJson({ contractVersion: 1, rows: await loadTeacherDigests(auth.session.userId) });
}

const command = z.object({ studentId: z.string().min(1).max(100), action: z.enum(["generate", "publish"]) }).strict();
const controls = z.object({ key: z.string().uuid(), revision: z.string().regex(/^[a-f0-9]{64}$/) });
export async function POST(request: Request) {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  const flags = getPanelFeatureFlags();
  if (!flags.parentWeeklyDigest) return staffFeatureDisabled("Haftalık özet şu an kullanıma kapalı, çok yakında açılacak.");
  const guard = await guardMutation({ action: "panel.teacher.digests", requireSameOrigin: true, headers: request.headers, rateLimitKey: `teacher:digests:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { headers: PRIVATE_NO_STORE, status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = command.safeParse(await request.json().catch(() => null));
  const control = controls.safeParse({ key: request.headers.get("X-Od-Idempotency-Key"), revision: request.headers.get("X-Od-Expected-Revision") });
  if (!parsed.success || !control.success) return NextResponse.json({ error: "İşlem, anahtar veya sürüm geçersiz." }, { headers: PRIVATE_NO_STORE, status: 400 });
  // Re-check ownership before receipt replay: an ended enrollment must revoke reads and writes.
  const allowed = (await loadTeacherDigests(auth.session.userId)).some((row) => row.studentId === parsed.data.studentId);
  if (!allowed) return NextResponse.json({ error: "Aradığınız kaydı bulamadık." }, { headers: PRIVATE_NO_STORE, status: 404 });
  const digest = operationDigest({ command: parsed.data, revision: control.data.revision });
  const key = `teacher-digest:${auth.session.userId}:${control.data.key}`;
  try {
    const result = await runEducationMutation({ kind: "digest", targetKind: "student", key, actorId: auth.session.userId, action: `digest.${parsed.data.action}`, digest, execute: async (db) => {
      const row = (await loadTeacherDigests(auth.session.userId, db)).find((item) => item.studentId === parsed.data.studentId);
      if (!row) throw new GroupMutationError("NOT_FOUND", "Aradığınız kaydı bulamadık.", 404);
      if (row.revision !== control.data.revision) throw new GroupMutationError("DIGEST_CONFLICT", "Özet veya alıcılar değişti. Güncel hâline göz atıp tekrar deneyebilirsiniz.");
      if (parsed.data.action === "generate") {
        if (row.digest?.status === "PUBLISHED") throw new GroupMutationError("DIGEST_CONFLICT", "Yayınlanmış özet yenilenemez.");
        const generated = await generateTeacherDigest(row.studentId, auth.session.userId, db);
        return NextResponse.json({ id: generated.digest.id, generated: true });
      }
      if (!row.digest) throw new GroupMutationError("DIGEST_CONFLICT", "Önce özet taslağını hazırlayın.");
      return NextResponse.json(await publishTeacherDigest(row.digest.id, row.digest.version, auth.session.userId, db));
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
      return NextResponse.json({ error: "Kayıt bu arada güncellenmiş. Güncel hâline göz atıp tekrar deneyebilirsiniz.", code: "DIGEST_CONFLICT" }, { headers: PRIVATE_NO_STORE, status: 409 });
    }
    throw error;
  }
}
