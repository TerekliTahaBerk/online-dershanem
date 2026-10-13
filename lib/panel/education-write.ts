import "server-only";
import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { requireStaffApi } from "./staff-api";
import { adminJson, requireAdminApi } from "./admin-api";
import { operationDigest, GroupMutationError, readGroupReceipt } from "./group-mutation-core";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
import { logAudit, type LogAuditInput } from "@/lib/audit";
import { sanitizeAuditPayload } from "@/lib/audit-policy";
import { LessonLifecycleError } from "./lesson-lifecycle";

export type EducationKind = "lesson" | "assignment" | "material" | "setup" | "version" | "outcome" | "submission" | "review" | "recovery" | "intervention" | "digest" | "coaching" | "ai-draft";
type Context = { params: Promise<{ id: string }> };
const transactional = new WeakSet<object>();
type Effect = () => unknown | Promise<unknown>;
const commitEffects = new WeakMap<object, Effect[]>();
const rollbackEffects = new WeakMap<object, Effect[]>();
export async function afterEducationCommit(db: PrismaClient, effect: Effect) {
  const pending = commitEffects.get(db);
  if (pending) pending.push(effect); else await effect();
}
export function onEducationRollback(db: PrismaClient, effect: Effect) { rollbackEffects.get(db)?.push(effect); }

/** Local facade only: existing shared business handlers join the outer transaction.
 * Nothing changes the global Prisma client or another request's database context. */
export function educationTransactionClient(tx: Prisma.TransactionClient): PrismaClient {
  const client = new Proxy(tx, { get(target, key) {
    if (key === "$transaction") return (operation: unknown) => typeof operation === "function" ? operation(client) : Promise.all(operation as Promise<unknown>[]);
    return Reflect.get(target, key);
  } }) as PrismaClient;
  transactional.add(client);
  commitEffects.set(client, []); rollbackEffects.set(client, []);
  return client;
}

export function transactionalAudit(db: PrismaClient) {
  return async (input: LogAuditInput) => {
    if (!transactional.has(db)) return logAudit(input);
    await db.auditLog.create({ data: { ...input, actorType: input.actorType ?? "USER", payload: input.payload == null ? undefined : sanitizeAuditPayload(input.payload) as Prisma.InputJsonValue } });
    return { ok: true as const, attempts: 1 };
  };
}
export function transactionalNotificationFilter(db: PrismaClient) {
  return (rows: Parameters<typeof filterNotificationRows>[0], preference?: Parameters<typeof filterNotificationRows>[1]) => filterNotificationRows(rows, preference, db);
}
export function transactionalNotificationEmails(db: PrismaClient) {
  return (rows: Parameters<typeof queuePanelNotificationEmails>[0], preference?: Parameters<typeof queuePanelNotificationEmails>[1]) => queuePanelNotificationEmails(rows, preference, transactional.has(db) ? db : undefined);
}

/** Includes child rows that can change without updating their parent's updatedAt. */
export async function educationSnapshot(db: Prisma.TransactionClient, kind: EducationKind | "group" | "student", id: string) {
  if (kind === "student") return db.studentProfile.findUnique({ where: { id }, include: { user: { select: { fullName: true, email: true } }, enrollments: { where: { endedAt: null }, orderBy: { id: "asc" } } } });
  if (kind === "group") return db.group.findUnique({ where: { id }, include: { enrollments: { where: { endedAt: null }, orderBy: { id: "asc" } } } });
  if (kind === "lesson") {
    const base = await db.lesson.findUnique({ where: { id } });
    return base ? { base, series: base.seriesId ? await db.lesson.findMany({ where: { seriesId: base.seriesId }, orderBy: { id: "asc" } }) : [] } : null;
  }
  if (kind === "assignment") return db.assignment.findUnique({ where: { id }, include: { outcomeLinks: { orderBy: { outcomeId: "asc" } }, rubricCriteria: { orderBy: { id: "asc" } } } });
  if (kind === "material") return db.learningMaterial.findUnique({ where: { id } });
  if (kind === "version" || kind === "outcome") return db.curriculumVersion.findUnique({ where: { id }, include: { subjects: { orderBy: { id: "asc" }, include: { units: { orderBy: { id: "asc" }, include: { outcomes: { orderBy: { id: "asc" } } } } } } } });
  if (kind === "submission") return db.assignmentSubmission.findUnique({ where: { id }, include: { assignment: { include: { rubricCriteria: { orderBy: { id: "asc" } } } } } });
  return null;
}
export const educationRevision = (snapshot: unknown) => operationDigest(snapshot);

class RejectedResponse extends Error { constructor(public response: Response) { super("Education operation rejected"); } }
const controls = z.object({ key: z.string().uuid().optional(), revision: z.string().regex(/^[a-f0-9]{64}$/).optional() });

export async function runEducationMutation(input: {
  lockName?: string; isolationLevel?: Prisma.TransactionIsolationLevel; db?: PrismaClient; key: string | null; digest: string; actorId: string; action: string;
  entityId?: string; kind: EducationKind; targetKind: EducationKind | "group" | "student";
  targetId?: unknown; expectedRevision?: string; redactFile?: boolean;
  execute: (client: PrismaClient) => Promise<Response>;
}) {
  const { db = prisma, key, digest, actorId, action, entityId, kind, targetKind, targetId, expectedRevision, redactFile, execute } = input;
  let transactionClient: PrismaClient | undefined;
  try {
    const result = await db.$transaction(async (tx) => {
        // Serializes education scheduling and identical keys, including legacy web writes.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.lockName ?? 'education-write'}, 0))::text`;
        if (key) {
          const receipt = await tx.auditLog.findUnique({ where: { idempotencyKey: key } });
          if (receipt) return readGroupReceipt(receipt.payload, digest);
        }
        if (typeof targetId === "string") {
          const snapshot = await educationSnapshot(tx, targetKind, targetId);
          if (!snapshot) throw new GroupMutationError("NOT_FOUND", "Kayıt bulunamadı.", 404);
          if (expectedRevision && educationRevision(snapshot) !== expectedRevision) throw new GroupMutationError("EDUCATION_CONFLICT", "Kayıt değişti. Güncel görünümü kontrol edin.");
        }
        transactionClient = educationTransactionClient(tx);
        const response = await execute(transactionClient);
        if (!response.ok) throw new RejectedResponse(response);
        const body = await response.json();
        if (redactFile && body.material) { body.material.url = null; body.material.hasFile = true; }
        const output = { body, status: response.status, replayed: false };
        await tx.auditLog.create({ data: { actorUserId: actorId, actorType: "USER", entityType: "EducationMutation", entityId: entityId || body.id || body.material?.id || kind, action: action, summary: "Eğitim yönetimi işlemi tamamlandı", idempotencyKey: key, payload: { operationDigest: digest, result: output } as Prisma.InputJsonValue } });
        return output;
      }, { isolationLevel: input.isolationLevel ?? "Serializable", timeout: 30_000 });
      if (transactionClient) {
        const effects = await Promise.allSettled((commitEffects.get(transactionClient) ?? []).map(async (effect) => effect()));
        if (effects.some((effect) => effect.status === "rejected")) console.error("education.after_commit_failed");
      }
    return result;
  } catch (error) {
    if (transactionClient) {
      const cleanup = await Promise.allSettled((rollbackEffects.get(transactionClient) ?? []).map(async (effect) => effect()));
      if (cleanup.some((effect) => effect.status === "rejected")) console.error("education.file_cleanup_failed");
    }
    throw error;
  }
}

export function educationWriteHandler(kind: EducationKind, execute: (request: Request, context: Context, db?: PrismaClient) => Promise<Response>) {
  return async (request: Request, context?: { params: Promise<{ id?: string }> }): Promise<Response> => {
    const actor = await requireApiAccountRole("ADMIN", "TEACHER");
    if (!actor.ok) return actor.response;
    const params: Context = { params: Promise.resolve({ id: (await context?.params)?.id ?? "" }) };
    const mobile = /^Bearer /i.test(request.headers.get("authorization") ?? "");
    const teacherMobile = actor.session.role === "TEACHER" && mobile && ["assignment", "material", "review"].includes(kind);
    if (kind === "review" && actor.session.role === "ADMIN") return execute(request, params);
    if (actor.session.role !== "ADMIN" && !teacherMobile) return execute(request, params);
    const auth = teacherMobile ? await requireStaffApi("OD", "od:lesson:teach") : await requireAdminApi({ stepUp: true });
    if (!auth.ok) return auth.response;
    const parsed = controls.safeParse({ key: request.headers.get("X-Od-Idempotency-Key") ?? undefined, revision: request.headers.get("X-Od-Expected-Revision") ?? undefined });
    if (!parsed.success) return adminJson({ error: "İşlem anahtarı veya sürüm geçersiz.", code: "INVALID_PRECONDITION" }, { status: 400 });
    if (mobile && !parsed.data.key) return adminJson({ error: "İşlem anahtarı gerekli.", code: "PRECONDITION_REQUIRED" }, { status: 400 });
    const isUpload = request.headers.get("content-type")?.includes("multipart/form-data");
    let input: Record<string, unknown>;
    try { input = isUpload ? Object.fromEntries(await request.clone().formData()) : await request.clone().text().then((text) => text ? JSON.parse(text) : kind === "material" && request.method === "PATCH" ? {} : null); }
    catch { return adminJson({ error: "İstek gövdesi geçersiz." }, { status: 400 }); }
    if (!input || typeof input !== "object" || Array.isArray(input)) return adminJson({ error: "İstek gövdesi geçersiz." }, { status: 400 });
    const file = input.file;
    if (file instanceof File && (!file.size || file.size > 4 * 1024 * 1024)) return adminJson({ error: "Dosya boyutu en fazla 4 MB olabilir." }, { status: 413 });
    const digestInput = file instanceof File ? { ...input, file: { name: file.name, type: file.type, size: file.size, digest: createHash("sha256").update(new Uint8Array(await file.arrayBuffer())).digest("hex") } } : input;
    const { id } = await params.params;
    const targetKind = id ? kind : kind === "outcome" ? "version" : (kind === "review" || kind === "lesson" && input.targetType === "STUDENT") ? "student" : "group";
    const targetId = id || (kind === "outcome" ? input.versionId : targetKind === "student" ? input.studentId : input.groupId);
    if (mobile && typeof targetId === "string" && !parsed.data.revision) return adminJson({ error: "Güncel kayıt sürümü gerekli.", code: "PRECONDITION_REQUIRED" }, { status: 400 });
    if (teacherMobile && typeof targetId === "string") {
      const groupScope = { group: { teacherId: auth.session.userId } };
      const allowed = id
        ? kind === "assignment" ? await prisma.assignment.findFirst({ where: { id, ...groupScope }, select: { id: true } }) : await prisma.learningMaterial.findFirst({ where: { id, ...groupScope }, select: { id: true } })
        : targetKind === "student" ? await prisma.studentProfile.findFirst({ where: { id: targetId, enrollments: { some: { endedAt: null, group: { teacherId: auth.session.userId, isActive: true } } } }, select: { id: true } }) : await prisma.group.findFirst({ where: { id: targetId, teacherId: auth.session.userId, isActive: true }, select: { id: true } });
      if (!allowed) return adminJson({ error: "Kayıt bulunamadı.", code: "NOT_FOUND" }, { status: 404 });
    }
    const key = parsed.data.key ? `education:${auth.session.userId}:${parsed.data.key}` : null;
    const digest = operationDigest({ path: new URL(request.url).pathname, method: request.method, input: digestInput, revision: parsed.data.revision });
    try {
      const result = await runEducationMutation({ key, digest, actorId: auth.session.userId, action: `education.${kind}.${request.method.toLowerCase()}`, entityId: id, kind, targetKind, targetId, expectedRevision: parsed.data.revision, redactFile: Boolean(isUpload), execute: (client) => execute(request, params, client) });
      return adminJson({ ...(result.body as object), replayed: result.replayed }, { status: Number(result.status) });
    } catch (error) {
      if (error instanceof RejectedResponse) { error.response.headers.set("Cache-Control", "private, no-store"); return error.response; }
      if (error instanceof GroupMutationError) return adminJson({ error: error.message, code: error.code }, { status: error.status });
      if (error instanceof LessonLifecycleError) return adminJson({ error: error.message, code: error.code }, { status: 409 });
      if (typeof error === "object" && error && "code" in error && ["P2034", "P2002"].includes(String(error.code))) {
        if (key) {
          const receipt = await prisma.auditLog.findUnique({ where: { idempotencyKey: key } });
          if (receipt) { try { const stored = readGroupReceipt(receipt.payload, digest); return adminJson({ ...(stored.body as object), replayed: true }); } catch { /* conflicting key below */ } }
        }
        return adminJson({ error: "Kayıt değişti veya aynı kod kullanılıyor. Görünümü yenileyin.", code: "EDUCATION_CONFLICT" }, { status: 409 });
      }
      throw error;
    }
  };
}
