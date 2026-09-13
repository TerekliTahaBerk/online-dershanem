import { createHash } from "node:crypto";
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";

const MAX_PDF_SIZE = 30 * 1024 * 1024;
const uploadSchema = z.object({ file: z.instanceof(File), type: z.enum(["BOOKLET_PDF", "ANSWER_KEY_PDF"]) });
function cleanName(name: string) { return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 100) || "deneme.pdf"; }

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.file.upload", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:file:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Private dosya deposu yapılandırılmamış." }, { status: 503 });
  const form = await request.formData().catch(() => null);
  const parsed = uploadSchema.safeParse({ file: form?.get("file"), type: form?.get("type") });
  if (!parsed.success || parsed.data.file.type !== "application/pdf") return NextResponse.json({ error: "Geçerli bir PDF ve dosya türü seçin." }, { status: 400 });
  const { file, type } = parsed.data;
  if (!file.size || file.size > MAX_PDF_SIZE) return NextResponse.json({ error: "PDF en fazla 30 MB olabilir." }, { status: 413 });
  const routeParams = idParamsSchema.safeParse(await context.params);
  if (!routeParams.success) return invalidApiInput();
  const { id } = routeParams.data;
  const exam = await prisma.odkExam.findFirst({ where: { id, status: "DRAFT", currentVersion: { status: "DRAFT" } }, select: { currentVersionId: true } });
  if (!exam?.currentVersionId) return NextResponse.json({ error: "Yalnız taslak sürüme PDF yüklenebilir." }, { status: 409 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") return NextResponse.json({ error: "Dosya içeriği PDF biçiminde değil." }, { status: 415 });
  const blob = await put(`odk-exams/${id}/${exam.currentVersionId}/${cleanName(file.name)}`, bytes, { access: "private", addRandomSuffix: true, contentType: "application/pdf" });
  const existing = await prisma.odkExamFile.findUnique({ where: { versionId_type: { versionId: exam.currentVersionId, type } }, select: { blobPathname: true } });
  try {
    await prisma.odkExamFile.upsert({ where: { versionId_type: { versionId: exam.currentVersionId, type } }, create: { versionId: exam.currentVersionId, type, blobPathname: blob.pathname, fileName: file.name.slice(0, 255), mimeType: file.type, byteSize: file.size, checksum: createHash("sha256").update(bytes).digest("hex"), uploadedById: auth.session.userId }, update: { blobPathname: blob.pathname, fileName: file.name.slice(0, 255), mimeType: file.type, byteSize: file.size, checksum: createHash("sha256").update(bytes).digest("hex"), uploadedById: auth.session.userId, createdAt: new Date() } });
  } catch (error) {
    await del(blob.url).catch(() => undefined); throw error;
  }
  if (existing?.blobPathname) await del(existing.blobPathname).catch(() => undefined);
  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkExam", entityId: id, action: "odk.exam_file_uploaded", summary: `${type} private PDF yüklendi`, payload: { type, byteSize: file.size } });
  return NextResponse.json({ ok: true });
}
