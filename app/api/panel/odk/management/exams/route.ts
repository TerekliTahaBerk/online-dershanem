import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProductRole, requireApiStaffPermission } from "@/lib/auth/api-guards";
import { ODK_EXAM_LIST_PERMISSIONS } from "@/lib/products/staff-permission-matrix";
import { staffJson, PRIVATE_NO_STORE } from "@/lib/panel/staff-api";
import { loadOdkExamList } from "@/lib/odk/exam-list-server";
import { loadOdkExamCatalog } from "@/lib/odk/exam-catalog-server";
import { createOdkExam, createOdkSeries } from "@/lib/odk/exam-create-server";
import { createExamSchema, createSeriesSchema } from "@/lib/odk/admin-schemas";
import { examViewOf, ODK_EXAM_VIEWS } from "@/lib/odk/staff-workspace";
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";
import { guardMutation } from "@/lib/security/mutation-guard";
import { runEducationMutation } from "@/lib/panel/education-write";
import { GroupMutationError, operationDigest, readGroupReceipt } from "@/lib/panel/group-mutation-core";
import { prisma } from "@/lib/prisma";
const commandSchema = z.discriminatedUnion("operation", [z.object({ operation: z.literal("exam"), input: createExamSchema }).strict(), z.object({ operation: z.literal("series"), input: createSeriesSchema }).strict()]);
const controls = z.object({ key: z.string().uuid(), revision: z.string().regex(/^[a-f0-9]{64}$/) });
export async function GET(request: Request) {
  const auth = await requireApiProductRole("ODK", "ADMIN", "TEACHER"); if (!auth.ok) return auth.response;
  const parsedQuery = z.object({ q: z.string().max(80).optional(), aile: z.string().max(80).optional(), durum: z.string().max(30).optional(), gorunum: z.string().max(30).optional(), page: z.string().regex(/^\d{1,6}$/).optional() }).safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsedQuery.success) return NextResponse.json({ error: "Filtre geçersiz." }, { status: 400, headers: PRIVATE_NO_STORE });
  const params = parsedQuery.data;
  // Permission is checked before expensive list/readiness/catalog reads.
  const { loadStaffViewer } = await import("@/lib/odk/staff-management-data");
  const viewer = await loadStaffViewer(auth.session.userId);
  if (!ODK_EXAM_LIST_PERMISSIONS.some((p) => viewer.permissions.has(p))) return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403, headers: PRIVATE_NO_STORE });
  const list = await loadOdkExamList(auth.session.userId, params);
  const catalog = list.canCreate ? await loadOdkExamCatalog() : { revision: operationDigest(null), families: list.familyRecords.map((f) => ({ code: f.code, name: f.name, legacy: false })), series: [], templates: [] };
  const pageSize = 50, page = Math.max(1, Math.min(Math.ceil(list.shown.length / pageSize) || 1, Number.parseInt(params.page || "1", 10) || 1));
  return staffJson({ contractVersion: 1, ...catalog, canCreate: list.canCreate, query: list.query, familyCode: list.familyRecord?.code ?? null, status: list.status ?? null, view: list.view, total: list.shown.length, page, pageSize,
    views: ODK_EXAM_VIEWS.map((v) => ({ ...v, count: list.counts.get(v.id) || 0 })),
    rows: list.shown.slice((page - 1) * pageSize, page * pageSize).map((e) => ({ id: e.id, title: e.title, familyCode: getOdkExamFamilyCode(e), status: e.status, view: examViewOf(e, list.now), seriesTitle: e.series?.title ?? null, startsAt: e.startsAt?.toISOString() ?? null, endsAt: e.endsAt?.toISOString() ?? null, assigned: e._count.assignments, attempts: e._count.attempts, submitted: e.attempts.length, blockingIssues: list.blockingByExam.get(e.id) ?? null })) });
}
export async function POST(request: Request) {
  const auth = await requireApiStaffPermission("odk:exam:edit"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.odk.exam.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:odk-create:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { headers: PRIVATE_NO_STORE, status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  const control = controls.safeParse({ key: request.headers.get("X-Od-Idempotency-Key"), revision: request.headers.get("X-Od-Expected-Revision") });
  if (!parsed.success || !control.success) return NextResponse.json({ error: parsed.error?.issues[0]?.message || "İşlem, anahtar veya sürüm geçersiz." }, { status: 400, headers: PRIVATE_NO_STORE });
  const actorId = auth.session.userId, command = parsed.data, key = `odk-create:${actorId}:${control.data.key}`, digest = operationDigest({ command, revision: control.data.revision });
  try {
    const result = await runEducationMutation({ key, digest, actorId, kind: "odk-exam", targetKind: "odk-exam", action: `odk.native.${command.operation}.create`, execute: async (db) => {
      if ((await loadOdkExamCatalog(db)).revision !== control.data.revision) throw new GroupMutationError("ODK_CONFLICT", "Katalog değişti. Güncel aile ve seri seçimini kontrol edin.");
      const response = command.operation === "exam" ? await createOdkExam(command.input, actorId, db) : await createOdkSeries(command.input, actorId, db);
      const body = await response.json(); if (!response.ok) throw new GroupMutationError("ODK_CREATE_REJECTED", body.error, response.status);
      return Response.json({ ok: true, id: body.exam?.id || body.series.id });
    } });
    return staffJson({ ...(result.body as object), replayed: result.replayed });
  } catch (error) {
    if (error instanceof GroupMutationError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: PRIVATE_NO_STORE });
    if (typeof error === "object" && error && "code" in error && ["P2002", "P2034", "P2025"].includes(String(error.code))) {
      const receipt = await prisma.auditLog.findUnique({ where: { idempotencyKey: key } });
      if (receipt) { try { return staffJson({ ...(readGroupReceipt(receipt.payload, digest).body as object), replayed: true }); } catch (conflict) { if (conflict instanceof GroupMutationError) return NextResponse.json({ error: conflict.message, code: conflict.code }, { status: conflict.status, headers: PRIVATE_NO_STORE }); throw conflict; } }
      return NextResponse.json({ error: "Adres kullanılıyor veya katalog değişti. Listeyi yenileyin.", code: "ODK_CONFLICT" }, { status: 409, headers: PRIVATE_NO_STORE });
    }
    throw error;
  }
}
