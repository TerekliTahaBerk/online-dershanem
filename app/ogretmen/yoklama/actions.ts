"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeacher } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { recordBulkAttendance, type AttendanceStatus } from "@/lib/attendance";

const StatusEnum = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

const RowSchema = z.object({
  studentId: z.string().min(1),
  status: StatusEnum,
  minutesLate: z.coerce.number().int().min(0).max(600).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const SaveSchema = z.object({
  classroomId: z.string().min(1).optional(),
  lessonId: z.string().min(1).optional(),
  sessionDate: z.string().min(1),
  rows: z.array(RowSchema).min(1),
});

export async function saveAttendanceAction(input: z.infer<typeof SaveSchema>) {
  const { session, teacherId, isAdmin } = await requireTeacher();
  const recordedById = session.user?.id;
  if (!recordedById) throw new Error("Oturum bulunamadı");
  const data = SaveSchema.parse(input);

  // Yetki: öğretmen sadece kendi sınıfının/dersinin yoklamasını alabilir
  if (!isAdmin && teacherId) {
    if (data.classroomId) {
      const owns = await prisma.classroomTeacher.findUnique({
        where: { classroomId_teacherId: { classroomId: data.classroomId, teacherId } },
        select: { teacherId: true },
      });
      if (!owns) throw new Error("Bu sınıfa erişiminiz yok");
    }
    if (data.lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: data.lessonId },
        select: { teacherId: true },
      });
      if (!lesson || lesson.teacherId !== teacherId) throw new Error("Bu derse erişiminiz yok");
    }
  }

  const sessionDate = new Date(data.sessionDate);
  const result = await recordBulkAttendance({
    rows: data.rows.map((r) => ({
      studentId: r.studentId,
      status: r.status as AttendanceStatus,
      minutesLate: r.minutesLate ?? null,
      notes: r.notes ?? null,
    })),
    recordedById,
    context: data.lessonId ? "LESSON" : "CLASSROOM_SESSION",
    lessonId: data.lessonId,
    classroomId: data.classroomId,
    sessionDate,
  });

  revalidatePath("/ogretmen/yoklama");
  if (data.classroomId) revalidatePath(`/ogretmen/siniflarim/${data.classroomId}`);
  return { ok: true as const, ...result };
}
