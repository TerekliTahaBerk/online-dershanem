import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { csvDocument } from "@/lib/csv";

const querySchema = z.object({ range: z.enum(["7", "30", "90"]).default("30") });

export async function GET(request: Request) {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ range: url.searchParams.get("range") || undefined });
  if (!parsed.success) return NextResponse.json({ error: "Rapor aralığı geçersiz." }, { status: 400 });

  const days = Number(parsed.data.range);
  const since = new Date(Date.now() - days * 86400000);
  const [lessons, groups, attendance] = await Promise.all([
    prisma.lesson.findMany({ where: { startsAt: { gte: since }, status: { not: "CANCELLED" } }, select: { teacherId: true, status: true, teacher: { select: { fullName: true, email: true } } } }),
    prisma.group.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { enrollments: { where: { endedAt: null } }, assignments: { where: { isActive: true }, include: { progress: true } } } }),
    prisma.attendance.findMany({ where: { createdAt: { gte: since } }, select: { status: true } }),
  ]);

  const teacherMap = new Map<string, { name: string; total: number; completed: number }>();
  for (const lesson of lessons) {
    const row = teacherMap.get(lesson.teacherId) || { name: lesson.teacher.fullName || lesson.teacher.email, total: 0, completed: 0 };
    row.total += 1;
    if (lesson.status === "COMPLETED") row.completed += 1;
    teacherMap.set(lesson.teacherId, row);
  }
  const present = attendance.filter((item) => item.status === "PRESENT" || item.status === "LATE").length;
  const rows: Array<Array<string | number>> = [
    ["Özet", `${days} günlük ders tamamlama`, lessons.length, lessons.filter((item) => item.status === "COMPLETED").length, lessons.length ? Math.round((lessons.filter((item) => item.status === "COMPLETED").length / lessons.length) * 100) : 0, "", "", ""],
    ["Özet", `${days} günlük katılım`, attendance.length, present, attendance.length ? Math.round((present / attendance.length) * 100) : 0, "", "", ""],
    ...[...teacherMap.values()].map((teacher) => ["Öğretmen", teacher.name, teacher.total, teacher.completed, teacher.total ? Math.round((teacher.completed / teacher.total) * 100) : 0, "", "", ""]),
    ...groups.map((group) => {
      const progress = group.assignments.flatMap((assignment) => assignment.progress);
      const done = progress.filter((item) => item.status === "DONE").length;
      return ["Grup", group.name, progress.length, done, progress.length ? Math.round((done / progress.length) * 100) : 0, group.enrollments.length, group.assignments.length, group.subject];
    }),
  ];
  const header = ["Kategori", "Ad / Gösterge", "Toplam", "Tamamlanan", "Oran (%)", "Öğrenci", "Ödev Kaydı", "Ders"];
  const csv = csvDocument([header, ...rows]);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="online-dershanem-rapor-${date}.csv"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
