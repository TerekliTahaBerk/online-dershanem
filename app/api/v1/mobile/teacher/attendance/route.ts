import { NextResponse } from "next/server";
import { z } from "zod";
import type { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  lessonId: z.string().optional(),
  classroomId: z.string().optional(),
  sessionDate: z.string(), // ISO
  records: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
      minutesLate: z.number().int().min(0).max(240).optional(),
      notes: z.string().max(500).optional(),
    }),
  ).min(1).max(200),
});

export async function POST(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "TEACHER" && auth.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Yetkisiz.");
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "BAD_REQUEST", "Geçersiz gövde.");
  const { lessonId, classroomId, sessionDate, records } = parsed.data;
  if (!lessonId && !classroomId) {
    return jsonError(400, "BAD_REQUEST", "lessonId veya classroomId zorunlu.");
  }

  const sessionAt = new Date(sessionDate);
  if (Number.isNaN(sessionAt.getTime())) {
    return jsonError(400, "BAD_REQUEST", "Geçersiz tarih.");
  }

  const ops = records.map((r) =>
    prisma.attendance.create({
      data: {
        studentId: r.studentId,
        context: lessonId ? "LESSON" : "CLASSROOM_SESSION",
        lessonId: lessonId ?? null,
        classroomId: classroomId ?? null,
        sessionDate: sessionAt,
        status: r.status as AttendanceStatus,
        minutesLate: r.minutesLate ?? null,
        notes: r.notes ?? null,
        recordedById: auth.userId,
      },
    }),
  );
  const created = await prisma.$transaction(ops);

  return NextResponse.json({ data: { count: created.length } });
}
