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
  childName: string;
  title: string;
  subject: string | null;
  teacherName: string;
  duration: number;
  status: string;
};

const COLUMNS: ExportColumn<Row>[] = [
  {
    key: "scheduledAt",
    header: "Tarih",
    format: (r) => format(r.scheduledAt, "yyyy-MM-dd HH:mm"),
  },
  { key: "childName", header: "Çocuk" },
  { key: "title", header: "Ders" },
  { key: "subject", header: "Konu" },
  { key: "teacherName", header: "Öğretmen" },
  { key: "duration", header: "Süre (dk)" },
  {
    key: "status",
    header: "Durum",
    format: (r) => STATUS_LABEL[r.status] ?? r.status,
  },
];

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "PARENT" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parent = await prisma.parent.findUnique({
    where: { userId: session.user.id },
    include: { students: { select: { studentId: true } } },
  });
  if (!parent) {
    return NextResponse.json({ error: "no parent profile" }, { status: 404 });
  }
  const childIds = parent.students.map((s) => s.studentId);
  if (childIds.length === 0) {
    return NextResponse.json({ error: "no children" }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const formatKind = parseFormat(sp.get("format"));
  const status = sp.getAll("status").filter((s) => STATUSES.has(s)) as any[];
  const childFilter = sp
    .getAll("childId")
    .filter((id) => childIds.includes(id));
  const from = sp.get("from");
  const to = sp.get("to");

  const where: Prisma.LessonWhereInput = {
    studentId: { in: childFilter.length ? childFilter : childIds },
  };
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
      teacher: { select: { fullName: true } },
    },
  });

  const data: Row[] = lessons.map((l) => ({
    scheduledAt: l.scheduledAt,
    childName: l.student.fullName,
    title: l.title ?? l.subject ?? "—",
    subject: l.subject,
    teacherName: l.teacher.fullName,
    duration: l.duration,
    status: l.status,
  }));

  const ts = new Date().toISOString().slice(0, 10);
  const filename = `cocuklarin-dersleri-${ts}`;

  if (formatKind === "xlsx") {
    return buildExportResponse(formatKind, filename, toXlsx(data, COLUMNS, "Dersler"));
  }
  return buildExportResponse(formatKind, filename, toCsv(data, COLUMNS));
}
