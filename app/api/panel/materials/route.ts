import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

const schema = z.object({ groupId: z.string().min(1), lessonId: z.string().min(1).nullable().optional(), assignmentId: z.string().min(1).nullable().optional(), title: z.string().trim().min(2).max(140), description: z.string().trim().max(1000).optional(), url: z.string().url().max(1000).refine((value) => value.startsWith("https://") || value.startsWith("http://")), kind: z.enum(["LINK", "PDF", "VIDEO"]), captionsAvailable: z.boolean().default(false), transcript: z.string().trim().max(8000).optional() }).strict();

/**
 * Öğrenci Materyaller verisi — JSON karşılığı.
 *
 * `app/panel/ogrenci/materyaller/page.tsx` ile AYNI sorgu, tercih puanlama
 * (`score`) ve sıralama mantığı. Dosya İNDİRME ayrı kalır — mevcut
 * `/api/panel/materials/[id]/file` route'u zaten Bearer destekli
 * (`requireApiOdRole` üzerinden), YENİDEN YAZILMADI.
 */
export async function GET() {
  const auth = await requireApiOdRole("STUDENT");
  if (!auth.ok) return auth.response;

  const flags = getPanelFeatureFlags();
  const accessibilityEnabled = flags.accessibilityProfile;
  const [profile, preference, networkPreference] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId: auth.session.userId }, select: { id: true } }),
    accessibilityEnabled
      ? prisma.accessibilityPreference.findUnique({ where: { userId: auth.session.userId }, select: { captionsPreferred: true, transcriptPreferred: true } })
      : null,
    flags.offlineMode ? prisma.networkPreference.findUnique({ where: { userId: auth.session.userId }, select: { lowDataMode: true } }) : null,
  ]);

  if (!profile) {
    return NextResponse.json({ profile: null, lowDataMode: false, materials: [] });
  }

  const materials = await prisma.learningMaterial.findMany({
    where: { isActive: true, group: { enrollments: { some: { studentId: profile.id, endedAt: null } } } },
    orderBy: { createdAt: "desc" },
    include: { group: { select: { name: true, subject: true } } },
  });

  const lowDataMode = Boolean(networkPreference?.lowDataMode);
  const score = (material: (typeof materials)[number]) =>
    Number(Boolean(preference?.captionsPreferred && material.captionsAvailable)) +
    Number(Boolean(preference?.transcriptPreferred && material.transcript)) +
    Number(Boolean(lowDataMode && material.transcript)) * 3 +
    Number(Boolean(lowDataMode && material.kind === "LINK"));

  const ordered = [...materials].sort((a, b) => score(b) - score(a) || b.createdAt.getTime() - a.createdAt.getTime());

  return NextResponse.json({
    profile: { id: profile.id },
    lowDataMode,
    preferenceActive: Boolean(preference?.captionsPreferred || preference?.transcriptPreferred),
    materials: ordered.map((m) => ({
      id: m.id,
      kind: m.kind,
      title: m.title,
      description: m.description,
      groupName: m.group.name,
      subject: m.group.subject,
      url: m.blobPathname ? null : m.url,
      hasFile: Boolean(m.blobPathname),
      fileName: m.fileName,
      mimeType: m.mimeType,
      captionsAvailable: m.captionsAvailable,
      transcript: m.transcript,
      preferred: score(m) > 0,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.materials.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:materials:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } }); if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Materyal alanlarını kontrol edin." }, { status: 400 });
  const data = parsed.data;
  const group = await prisma.group.findFirst({ where: { id: data.groupId, isActive: true, ...(auth.session.role === "TEACHER" ? { teacherId: auth.session.userId } : {}) }, include: { enrollments: { where: { endedAt: null }, include: { student: { select: { userId: true, parents: { select: { parentId: true } } } } } } } });
  if (!group) return NextResponse.json({ error: "Yetkili olduğunuz grup bulunamadı." }, { status: 404 });
  if (data.lessonId && !await prisma.lesson.findFirst({ where: { id: data.lessonId, groupId: group.id }, select: { id: true } })) return NextResponse.json({ error: "Ders bu gruba ait değil." }, { status: 400 });
  if (data.assignmentId && !await prisma.assignment.findFirst({ where: { id: data.assignmentId, groupId: group.id }, select: { id: true } })) return NextResponse.json({ error: "Ödev bu gruba ait değil." }, { status: 400 });
  const material = await prisma.learningMaterial.create({ data: { groupId: group.id, lessonId: data.lessonId || null, assignmentId: data.assignmentId || null, createdById: auth.session.userId, title: data.title, description: data.description || null, url: data.url, kind: data.kind, captionsAvailable: data.kind === "VIDEO" && data.captionsAvailable, transcript: data.transcript || null } });
  const students = [...new Set(group.enrollments.map((item) => item.student.userId))]; const parents = [...new Set(group.enrollments.flatMap((item) => item.student.parents.map((link) => link.parentId)))];
  const rawNotificationRows = [...students.map((userId) => ({ userId, type: "SYSTEM" as const, title: "Yeni ders materyali", body: material.title, href: "/panel/ogrenci/materyaller" })), ...parents.map((userId) => ({ userId, type: "SYSTEM" as const, title: "Yeni ders materyali", body: material.title, href: "/panel/veli/takip" }))];
  const notificationRows = await filterNotificationRows(rawNotificationRows);
  if (notificationRows.length) await prisma.notification.createMany({ data: notificationRows });
  await queuePanelNotificationEmails(rawNotificationRows);
  await logAudit({ actorUserId: auth.session.userId, entityType: "LearningMaterial", entityId: material.id, action: "material.created", summary: `${material.title} paylaşıldı`, payload: { groupId: group.id, kind: material.kind } });
  return NextResponse.json({ material: { id: material.id, title: material.title, description: material.description || "", url: material.url, kind: material.kind, groupName: group.name, isActive: material.isActive, captionsAvailable: material.captionsAvailable, transcript: material.transcript || "" } });
}
