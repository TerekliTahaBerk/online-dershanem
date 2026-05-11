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
  DRAFT: "Taslak",
  PUBLISHED: "Yayında",
  CLOSED: "Kapalı",
};
const STATUSES = new Set(Object.keys(STATUS_LABEL));

type Row = {
  title: string;
  subject: string | null;
  target: string;
  dueAt: Date | null;
  status: string;
  submissionCount: number;
  createdAt: Date;
};

const COLUMNS: ExportColumn<Row>[] = [
  { key: "title", header: "Başlık" },
  { key: "subject", header: "Ders" },
  { key: "target", header: "Hedef" },
  {
    key: "dueAt",
    header: "Son Teslim",
    format: (r) => (r.dueAt ? format(r.dueAt, "yyyy-MM-dd HH:mm") : ""),
  },
  {
    key: "status",
    header: "Durum",
    format: (r) => STATUS_LABEL[r.status] ?? r.status,
  },
  { key: "submissionCount", header: "Gönderim" },
  {
    key: "createdAt",
    header: "Oluşturulma",
    format: (r) => format(r.createdAt, "yyyy-MM-dd"),
  },
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
  const classroomId = sp.getAll("classroomId");

  const where: Prisma.AssignmentWhereInput = { teacherId: teacher.id };
  if (status.length) where.status = { in: status };
  if (classroomId.length) where.classroomId = { in: classroomId };

  const assignments = await prisma.assignment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      classroom: { select: { name: true } },
      student: { select: { fullName: true } },
      _count: { select: { submissions: true } },
    },
  });

  const data: Row[] = assignments.map((a) => ({
    title: a.title,
    subject: a.subject,
    target: a.classroom?.name ?? a.student?.fullName ?? "Genel",
    dueAt: a.dueAt,
    status: a.status,
    submissionCount: a._count.submissions,
    createdAt: a.createdAt,
  }));

  const ts = new Date().toISOString().slice(0, 10);
  const filename = `odevlerim-${ts}`;

  if (formatKind === "xlsx") {
    return buildExportResponse(formatKind, filename, toXlsx(data, COLUMNS, "Ödevlerim"));
  }
  return buildExportResponse(formatKind, filename, toCsv(data, COLUMNS));
}
