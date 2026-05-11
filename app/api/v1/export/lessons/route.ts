import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { getServerAuthSession } from "@/lib/auth";
import { enforce, ForbiddenError } from "@/lib/rbac/enforce";
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
  studentName: string;
  teacherName: string;
  title: string;
  subject: string | null;
  duration: number;
  status: string;
};

const COLUMNS: ExportColumn<Row>[] = [
  {
    key: "scheduledAt",
    header: "Tarih",
    format: (r) => format(r.scheduledAt, "yyyy-MM-dd HH:mm"),
  },
  { key: "studentName", header: "Öğrenci" },
  { key: "teacherName", header: "Öğretmen" },
  { key: "title", header: "Başlık" },
  { key: "subject", header: "Ders" },
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
  try {
    await enforce(session.user.id, session.user.role as any, "lessons.read");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw e;
  }

  const sp = req.nextUrl.searchParams;
  const formatKind = parseFormat(sp.get("format"));
  const status = sp.getAll("status").filter((s) => STATUSES.has(s)) as any[];
  const from = sp.get("from");
  const to = sp.get("to");

  const where: Prisma.LessonWhereInput = {};
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
    take: 10000,
    include: {
      student: { select: { fullName: true } },
      teacher: { select: { fullName: true } },
    },
  });

  const data: Row[] = lessons.map((l) => ({
    scheduledAt: l.scheduledAt,
    studentName: l.student?.fullName ?? "—",
    teacherName: l.teacher?.fullName ?? "—",
    title: l.title ?? l.subject ?? "—",
    subject: l.subject,
    duration: l.duration,
    status: l.status,
  }));

  const ts = new Date().toISOString().slice(0, 10);
  const filename = `dersler-${ts}`;

  if (formatKind === "xlsx") {
    return buildExportResponse(formatKind, filename, toXlsx(data, COLUMNS, "Dersler"));
  }
  return buildExportResponse(formatKind, filename, toCsv(data, COLUMNS));
}
