import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildExportResponse,
  parseFormat,
  toCsv,
  toXlsx,
  type ExportColumn,
} from "@/lib/export";

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Planlı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};
const STATUSES = new Set(Object.keys(STATUS_LABEL));

type Row = {
  scheduledAt: Date;
  title: string;
  subject: string | null;
  studentName: string;
  classroomName: string | null;
  duration: number;
  status: string;
  meetLink: string | null;
};

const COLUMNS: ExportColumn<Row>[] = [
  {
    key: "scheduledAt",
    header: "Tarih",
    format: (r) => format(r.scheduledAt, "yyyy-MM-dd HH:mm"),
  },
  { key: "title", header: "Başlık" },
  { key: "subject", header: "Ders" },
  { key: "studentName", header: "Öğrenci" },
  { key: "classroomName", header: "Sınıf" },
  { key: "duration", header: "Süre (dk)" },
  {
    key: "status",
    header: "Durum",
    format: (r) => STATUS_LABEL[r.status] ?? r.status,
  },
  { key: "meetLink", header: "Meet Linki" },
];

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!teacher) {
    return NextResponse.json({ error: "no teacher profile" }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const formatKind = parseFormat(sp.get("format"));
  const status = sp.getAll("status").filter((s) => STATUSES.has(s)) as any[];
  const from = sp.get("from");
  const to = sp.get("to");

  const where: Prisma.LessonWhereInput = { teacherId: teacher.id };
  if (status.length) where.status = { in: status };
  if (from || to) {
    where.scheduledAt = {};
    if (from) where.scheduledAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where.scheduledAt.lte = end;
    }
  }

  const lessons = await prisma.lesson.findMany({
    where,
    orderBy: { scheduledAt: "desc" },
    take: 5000,
    include: {
      student: { select: { fullName: true } },
      classroom: { select: { name: true } },
    },
  });

  const data: Row[] = lessons.map((l) => ({
    scheduledAt: l.scheduledAt,
    title: l.title ?? l.subject ?? "—",
    subject: l.subject,
    studentName: l.student.fullName,
    classroomName: l.classroom?.name ?? null,
    duration: l.duration,
    status: l.status,
    meetLink: l.googleMeetLink,
  }));

  const ts = new Date().toISOString().slice(0, 10);
  const filename = `derslerim-${ts}`;

  if (formatKind === "xlsx") {
    return buildExportResponse(formatKind, filename, toXlsx(data, COLUMNS, "Derslerim"));
  }
  return buildExportResponse(formatKind, filename, toCsv(data, COLUMNS));
}
