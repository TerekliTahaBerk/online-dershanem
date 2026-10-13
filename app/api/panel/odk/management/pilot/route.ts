import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { staffJson, PRIVATE_NO_STORE } from "@/lib/panel/staff-api";
import { loadOdkPilotWorkspace } from "@/lib/odk/pilot-workspace-server";
import { createOdkPilot, createOdkPilotSchema, transitionOdkPilot, transitionOdkPilotSchema } from "@/lib/odk/pilot-commands-server";
import { roleCoverage } from "@/lib/pilot-rollout";
import { guardMutation } from "@/lib/security/mutation-guard";
import { operationDigest, GroupMutationError, readGroupReceipt } from "@/lib/panel/group-mutation-core";
import { runEducationMutation } from "@/lib/panel/education-write";
import { prisma } from "@/lib/prisma";
const commandSchema = z.discriminatedUnion("operation", [createOdkPilotSchema.omit({ requestKey: true }).extend({ operation: z.literal("create") }).strict(), z.object({ operation: z.literal("transition"), id: z.string().regex(/^[\w-]{1,191}$/), input: transitionOdkPilotSchema }).strict()]);
const controls = z.object({ key: z.string().uuid(), revision: z.string().regex(/^[a-f0-9]{64}$/) });
export async function GET() {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const { candidates, runs, readiness, revision } = await loadOdkPilotWorkspace();
  return staffJson({ contractVersion: 1, currentAdminId: auth.session.userId, revision, readiness, candidates: candidates.map((u) => ({ id: u.id, label: u.fullName || u.email, role: u.role })), runs: runs.map((r) => ({ id: r.id, name: r.name, status: r.status, version: r.version, revision: operationDigest(r), memberCount: r.members.length, coverage: roleCoverage(r.members.map((m) => m.role)), createdAt: r.createdAt.toISOString(), startedAt: r.startedAt?.toISOString() ?? null, stoppedAt: r.stoppedAt?.toISOString() ?? null, stopReason: r.stopReason })) });
}
export async function POST(request: Request) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.odk.pilot", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:odk-pilot:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403, headers: PRIVATE_NO_STORE });
  const parsed = commandSchema.safeParse(await request.json().catch(() => null)); const control = controls.safeParse({ key: request.headers.get("X-Od-Idempotency-Key"), revision: request.headers.get("X-Od-Expected-Revision") });
  if (!parsed.success || !control.success) return NextResponse.json({ error: "Pilot işlemi, anahtar veya sürüm geçersiz." }, { status: 400, headers: PRIVATE_NO_STORE });
  const command = parsed.data, actorId = auth.session.userId, key = `odk-pilot:${actorId}:${control.data.key}`, digest = operationDigest({ command, revision: control.data.revision });
  try {
    const result = await runEducationMutation({ lockName: 'odk-pilot-write', key, digest, actorId, kind: 'odk-pilot', targetKind: 'odk-pilot', action: `odk.native.pilot.${command.operation}`, execute: async (db) => {
      if (command.operation === "create") { if ((await loadOdkPilotWorkspace(db)).revision !== control.data.revision) throw new GroupMutationError("ODK_CONFLICT", "Pilot adayları veya koşular değişti. Seçimi kontrol edin."); }
      else { const run = await db.odkPilotRun.findUnique({ where: { id: command.id }, include: { members: { orderBy: { userId: "asc" }, select: { role: true, userId: true } } } }); if (!run) throw new GroupMutationError("NOT_FOUND", "Pilot koşusu bulunamadı.", 404); if (operationDigest(run) !== control.data.revision) throw new GroupMutationError("ODK_CONFLICT", "Pilot değişti. Güncel durumu kontrol edin."); }
      const response = command.operation === "create" ? await createOdkPilot({ name: command.name, userIds: command.userIds, requestKey: control.data.key }, actorId, db) : await transitionOdkPilot(command.id, command.input, actorId, db);
      const body = await response.json(); if (!response.ok) throw new GroupMutationError("ODK_PILOT_REJECTED", body.error, response.status);
      return Response.json({ ok: true, id: body.run.id });
    } });
    return staffJson({ ...(result.body as object), replayed: result.replayed });
  } catch (error) {
    if (error instanceof GroupMutationError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: PRIVATE_NO_STORE });
    if (typeof error === "object" && error && "code" in error && ["P2002", "P2034", "P2025"].includes(String(error.code))) {
      const receipt = await prisma.auditLog.findUnique({ where: { idempotencyKey: key } });
      if (receipt) { try { return staffJson({ ...(readGroupReceipt(receipt.payload, digest).body as object), replayed: true }); } catch (conflict) { if (conflict instanceof GroupMutationError) return NextResponse.json({ error: conflict.message, code: conflict.code }, { status: conflict.status, headers: PRIVATE_NO_STORE }); throw conflict; } }
      return NextResponse.json({ error: "Pilot durumu çakıştı. Güncel görünümü kontrol edin.", code: "ODK_CONFLICT" }, { status: 409, headers: PRIVATE_NO_STORE });
    }
    throw error;
  }
}
