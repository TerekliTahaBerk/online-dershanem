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
  DRAFT: "Taslak",
  PUBLISHED: "Yayında",
  CLOSED: "Kapalı",
};
const STATUSES = new Set(Object.keys(STATUS_LABEL));

type Row = {
  title: string;
  subject: string | null;
  teacherName: string;
  target: string;
  dueAt: Date | null;
  status: string;
  submissionCount: number;
  createdAt: Date;
};

const COLUMNS: ExportColumn<Row>[] = [
  { key: "title", header: "Başlık" },
  { key: "subject", header: "Ders" },
  { key: "teacherName", header: "Öğretmen" },
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
  try {
    await enforce(session.user.id, session.user.role as any, "assignments.read");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw e;
  }

  const sp = req.nextUrl.searchParams;
  const formatKind = parseFormat(sp.get("format"));
  const status = sp.getAll("status").filter((s) => STATUSES.has(s)) as any[];

  const where: Prisma.AssignmentWhereInput = {};
  if (status.length) where.status = { in: status };

  const assignments = await prisma.assignment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: {
      teacher: { select: { fullName: true } },
      classroom: { select: { name: true } },
      student: { select: { fullName: true } },
      _count: { select: { submissions: true } },
    },
  });

  const data: Row[] = assignments.map((a) => ({
    title: a.title,
    subject: a.subject,
    teacherName: a.teacher?.fullName ?? "—",
    target: a.classroom?.name ?? a.student?.fullName ?? "Tüm öğrenciler",
    dueAt: a.dueAt,
    status: a.status,
    submissionCount: a._count.submissions,
    createdAt: a.createdAt,
  }));

  const ts = new Date().toISOString().slice(0, 10);
  const filename = `odevler-${ts}`;

  if (formatKind === "xlsx") {
    return buildExportResponse(formatKind, filename, toXlsx(data, COLUMNS, "Ödevler"));
  }
  return buildExportResponse(formatKind, filename, toCsv(data, COLUMNS));
}
