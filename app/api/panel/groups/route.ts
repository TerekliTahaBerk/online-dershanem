import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  subject: z.string().trim().min(2).max(80),
  level: z.string().trim().max(40).optional(),
  teacherId: z.string().min(1),
  studentIds: z.array(z.string().min(1)).max(4).default([]),
});

export async function POST(request: Request) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({
    action: "panel.groups.create",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:groups:${auth.session.userId}`,
    rateLimit: { max: 40, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Grup bilgilerini kontrol edin." }, { status: 400 });
  const studentIds = [...new Set(parsed.data.studentIds)];

  const [teacher, students] = await Promise.all([
    prisma.user.findFirst({ where: { id: parsed.data.teacherId, role: "TEACHER", status: "ACTIVE" }, select: { id: true } }),
    prisma.studentProfile.findMany({ where: { id: { in: studentIds }, user: { status: "ACTIVE" } }, select: { id: true } }),
  ]);
  if (!teacher) return NextResponse.json({ error: "Aktif öğretmen bulunamadı." }, { status: 400 });
  if (students.length !== studentIds.length) return NextResponse.json({ error: "Öğrenci seçimini kontrol edin." }, { status: 400 });

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      subject: parsed.data.subject,
      level: parsed.data.level || null,
      teacherId: teacher.id,
      capacity: 4,
      enrollments: { create: studentIds.map((studentId) => ({ studentId })) },
    },
  });
  await logAudit({ actorUserId: auth.session.userId, entityType: "Group", entityId: group.id, action: "group.created", summary: `${group.name} grubu oluşturuldu`, payload: { teacherId: teacher.id, studentCount: studentIds.length } });
  return NextResponse.json({ id: group.id });
}
