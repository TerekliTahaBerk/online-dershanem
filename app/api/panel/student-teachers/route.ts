import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRecentAdminStepUp, requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import {
  linkStudentTeacher,
  listActiveTeacherLinksForStudent,
  unlinkStudentTeacher,
} from "@/lib/panel/student-teacher-server";
import { StudentTeacherLinkError } from "@/lib/panel/student-teacher";

const createSchema = z.object({
  studentId: z.string().min(1),
  teacherId: z.string().min(1),
  subject: z.string().trim().min(2).max(80),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function GET(request: Request) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "studentId gerekli." }, { status: 400 });
  }
  const links = await listActiveTeacherLinksForStudent(studentId);
  return NextResponse.json({
    links: links.map((link) => ({
      id: link.id,
      studentId: link.studentId,
      teacherId: link.teacherId,
      subject: link.subject,
      startedAt: link.startedAt.toISOString(),
      teacherName: link.teacher.fullName || link.teacher.email,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({
    action: "panel.student_teacher.link",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:student-teacher:${auth.session.userId}`,
    rateLimit: { max: 80, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Öğrenci, öğretmen ve branş gerekli." }, { status: 400 });
  }

  try {
    const link = await linkStudentTeacher({
      studentId: parsed.data.studentId,
      teacherId: parsed.data.teacherId,
      subject: parsed.data.subject,
      actorUserId: auth.session.userId,
      notes: parsed.data.notes || null,
    });
    return NextResponse.json({ id: link.id });
  } catch (error) {
    if (error instanceof StudentTeacherLinkError) {
      const status = error.code === "DUPLICATE_ACTIVE" ? 409 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    throw error;
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({
    action: "panel.student_teacher.unlink",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:student-teacher-unlink:${auth.session.userId}`,
    rateLimit: { max: 80, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });

  const body = z
    .object({ id: z.string().min(1) })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Bağlantı kimliği gerekli." }, { status: 400 });

  try {
    await unlinkStudentTeacher({ linkId: body.data.id, actorUserId: auth.session.userId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof StudentTeacherLinkError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
    }
    throw error;
  }
}
