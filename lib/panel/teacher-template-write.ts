import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardMutation } from "@/lib/security/mutation-guard";
import { requireStaffApi, PRIVATE_NO_STORE } from "./staff-api";
import { GroupMutationError, operationDigest, readGroupReceipt } from "./group-mutation-core";

const fields = z.object({ title: z.string().trim().min(2).max(60), note: z.string().trim().max(2000).default(""), nextGoal: z.string().trim().max(500).default(""), homework: z.string().trim().max(1000).default("") });
const controls = z.object({ key: z.string().uuid().optional(), revision: z.string().regex(/^[a-f0-9]{64}$/).optional() });
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_NO_STORE });
const select = { id: true, title: true, note: true, nextGoal: true, homework: true, updatedAt: true } as const;

/** One teacher lock covers the 20-template cap, ownership, revision and receipt. */
export async function writeTeacherTemplate(request: Request, id?: string) {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  const teacherId = auth.session.userId;
  const guard = await guardMutation({ action: `panel.teacher.templates.${request.method.toLowerCase()}`, requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:teacher-template:${teacherId}`, rateLimit: { max: 40, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return json({ error: guard.message }, guard.code === "RATE_LIMIT" ? 429 : 403);
  const input = request.method === "DELETE" ? null : fields.safeParse(await request.json().catch(() => null));
  if (input && !input.success) return json({ error: "Lütfen şablon alanlarını bir kez daha kontrol eder misiniz?" }, 400);
  const control = controls.safeParse({ key: request.headers.get("X-Od-Idempotency-Key") ?? undefined, revision: request.headers.get("X-Od-Expected-Revision") ?? undefined });
  if (!control.success || (/^Bearer\s+/i.test(request.headers.get("authorization") ?? "") && (!control.data.key || (id && !control.data.revision)))) return json({ error: "İşlem anahtarı ve güncel şablon sürümü gerekli." }, 400);
  const { key, revision } = control.data;
  const data = input?.success ? input.data : null;
  const digest = operationDigest({ teacherId, method: request.method, id, data, revision });
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`teacher-template:${teacherId}`}, 0))::text`;
      if (key) {
        const receipt = await tx.auditLog.findUnique({ where: { idempotencyKey: `teacher-template:${teacherId}:${key}` } });
        if (receipt) return readGroupReceipt(receipt.payload, digest);
      }
      const existing = id ? await tx.teacherNoteTemplate.findFirst({ where: { id, teacherId }, select }) : null;
      if (id && !existing) throw new GroupMutationError("NOT_FOUND", "Şablon bulunamadı; kaldırılmış ya da değişmiş olabilir.", 404);
      if (existing && revision && operationDigest(existing) !== revision) throw new GroupMutationError("TEMPLATE_CONFLICT", "Şablon bu arada güncellenmiş; güncel hâline göz atıp tekrar deneyebilirsiniz.");
      if (!id && await tx.teacherNoteTemplate.count({ where: { teacherId } }) >= 20) throw new GroupMutationError("TEMPLATE_LIMIT", "En fazla 20 kişisel şablon kaydedebilirsiniz.", 400);
      let output: Record<string, unknown>;
      if (request.method === "DELETE") {
        await tx.teacherNoteTemplate.delete({ where: { id: id! } });
        output = { ok: true, replayed: false };
      } else {
        const values = { title: data!.title, note: data!.note || null, nextGoal: data!.nextGoal || null, homework: data!.homework || null };
        const template = id ? await tx.teacherNoteTemplate.update({ where: { id }, data: values, select }) : await tx.teacherNoteTemplate.create({ data: { teacherId, ...values }, select });
        output = { ...template, revision: operationDigest(template), replayed: false };
      }
      await tx.auditLog.create({ data: { actorUserId: teacherId, actorType: "USER", entityType: "TeacherNoteTemplate", entityId: id ?? String(output.id), action: `teacher.template_${request.method === "POST" ? "created" : request.method === "DELETE" ? "deleted" : "updated"}`, summary: "Kişisel ders şablonu kaydedildi", idempotencyKey: key ? `teacher-template:${teacherId}:${key}` : null, payload: { operationDigest: digest, result: JSON.parse(JSON.stringify(output)) } as Prisma.InputJsonValue } });
      return output;
    }, { isolationLevel: "Serializable" });
    return json(result);
  } catch (error) {
    if (error instanceof GroupMutationError) return json({ error: error.message, code: error.code }, error.status);
    if (error && typeof error === "object" && "code" in error && ["P2034", "P2002"].includes(String(error.code))) return json({ error: "Şablon bu arada güncellenmiş; lütfen tekrar dener misiniz?", code: "TEMPLATE_CONFLICT" }, 409);
    throw error;
  }
}
