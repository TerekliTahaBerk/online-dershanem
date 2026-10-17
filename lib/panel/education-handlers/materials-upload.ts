import { onEducationRollback } from "@/lib/panel/education-write";
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma as defaultDb } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { transactionalAudit, transactionalNotificationFilter, transactionalNotificationEmails } from "@/lib/panel/education-write";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["application/pdf", "PDF" as const],
  ["video/mp4", "VIDEO" as const],
]);
const uploadSchema = z.object({
  file: z.instanceof(File),
  groupId: z.string().trim().min(1).max(191),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(1000),
  captionsAvailable: z.boolean(),
  transcript: z.string().trim().max(8000),
});

function cleanFileName(value: string) {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "materyal";
}

export async function POST(request: Request, _context: { params: Promise<{ id: string }> }, prisma: PrismaClient = defaultDb) {
  const logAudit = transactionalAudit(prisma);
  const filterNotificationRows = transactionalNotificationFilter(prisma);
  const queuePanelNotificationEmails = transactionalNotificationEmails(prisma);
  const auth = await requireApiOdRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.materials.upload", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:materials:upload:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Dosya deposu henüz yapılandırılmadı. Yöneticiye bildirin." }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const parsed = uploadSchema.safeParse({
    file: form?.get("file"),
    groupId: form?.get("groupId"),
    title: form?.get("title"),
    description: form?.get("description") ?? "",
    captionsAvailable: form?.get("captionsAvailable") === "on",
    transcript: form?.get("transcript") ?? "",
  });
  if (!parsed.success) return NextResponse.json({ error: "Lütfen dosya ve materyal alanlarını bir kez daha kontrol eder misiniz?" }, { status: 400 });
  const { file, groupId, title, description, captionsAvailable, transcript } = parsed.data;
  const kind = ALLOWED_TYPES.get(file.type);
  if (!kind) return NextResponse.json({ error: "Yalnızca PDF veya MP4 dosyası yükleyebilirsiniz." }, { status: 415 });
  if (!file.size || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Dosya boyutu en fazla 4 MB olabilir." }, { status: 413 });

  const group = await prisma.group.findFirst({ where: { id: groupId, isActive: true, ...(auth.session.role === "TEACHER" ? { teacherId: auth.session.userId } : {}) }, include: { enrollments: { where: { endedAt: null }, include: { student: { select: { userId: true, parents: { where: { active: true, endedAt: null, canViewAcademic: true }, select: { parentId: true } } } } } } } });
  if (!group) return NextResponse.json({ error: "Yetkili olduğunuz grup şu an görünmüyor." }, { status: 404 });

  const blob = await put(`panel-materials/${group.id}/${cleanFileName(file.name)}`, file, { access: "private", addRandomSuffix: true, contentType: file.type });
  onEducationRollback(prisma, () => del(blob.url));
  let material;
  try {
    material = await prisma.learningMaterial.create({ data: { groupId: group.id, createdById: auth.session.userId, title, description: description || null, url: blob.url, blobPathname: blob.pathname, fileName: file.name.slice(0, 255), mimeType: file.type, fileSize: file.size, kind, captionsAvailable: kind === "VIDEO" && captionsAvailable, transcript: transcript || null } });
  } catch (error) {
    await del(blob.url).catch(() => undefined);
    throw error;
  }

  const students = [...new Set(group.enrollments.map((item) => item.student.userId))];
  const parents = [...new Set(group.enrollments.flatMap((item) => item.student.parents.map((link) => link.parentId)))];
  const rawRows = [...students.map((userId) => ({ userId, type: "SYSTEM" as const, title: "Yeni bir ders materyali eklendi 📎", body: material.title, href: "/panel/ogrenci/materyaller" })), ...parents.map((userId) => ({ userId, type: "SYSTEM" as const, title: "Yeni bir ders materyali eklendi 📎", body: material.title, href: "/panel/veli/takip" }))];
  const rows = await filterNotificationRows(rawRows);
  if (rows.length) await prisma.notification.createMany({ data: rows });
  await queuePanelNotificationEmails(rawRows);
  await logAudit({ actorUserId: auth.session.userId, entityType: "LearningMaterial", entityId: material.id, action: "material.uploaded", summary: `${material.title} dosyası yüklendi`, payload: { groupId: group.id, kind, fileSize: file.size } });
  return NextResponse.json({ material: { id: material.id, title: material.title, description: material.description || "", url: material.url, kind: material.kind, groupName: group.name, isActive: material.isActive, captionsAvailable: material.captionsAvailable, transcript: material.transcript || "" } });
}
