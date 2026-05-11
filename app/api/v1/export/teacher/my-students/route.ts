import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
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
  NEW: "Yeni",
  FOLLOW_UP: "Takip",
  ACTIVE: "Aktif",
  AT_RISK: "Riskli",
  COMPLETED: "Tamamlandı",
  INACTIVE: "Pasif",
};
const STATUSES = new Set(Object.keys(STATUS_LABEL));

type Row = {
  fullName: string;
  phone: string;
  email: string | null;
  classLevel: string | null;
  examType: string | null;
  city: string | null;
  status: string;
  lessonCount: number;
};

const COLUMNS: ExportColumn<Row>[] = [
  { key: "fullName", header: "Ad Soyad" },
  { key: "phone", header: "Telefon" },
  { key: "email", header: "E-posta" },
  { key: "classLevel", header: "Sınıf" },
  { key: "examType", header: "Sınav" },
  { key: "city", header: "Şehir" },
  {
    key: "status",
    header: "Durum",
    format: (r) => STATUS_LABEL[r.status] ?? r.status,
  },
  { key: "lessonCount", header: "Ders Sayısı" },
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
  const format = parseFormat(sp.get("format"));
  const status = sp.getAll("status").filter((s) => STATUSES.has(s)) as any[];
  const classLevel = sp.getAll("classLevel");
  const examType = sp.getAll("examType");

  // Distinct studentIds via teacher's lessons
  const lessonStudents = await prisma.lesson.findMany({
    where: { teacherId: teacher.id },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  const ids = lessonStudents.map((l) => l.studentId);

  const where: Prisma.StudentWhereInput = { id: { in: ids } };
  if (status.length) where.status = { in: status };
  if (classLevel.length) where.classLevel = { in: classLevel };
  if (examType.length) where.examType = { in: examType };

  const students = await prisma.student.findMany({
    where,
    select: {
      fullName: true,
      phone: true,
      email: true,
      classLevel: true,
      examType: true,
      city: true,
      status: true,
      _count: { select: { lessons: { where: { teacherId: teacher.id } } } },
    },
    orderBy: { fullName: "asc" },
    take: 5000,
  });

  const data: Row[] = students.map((s) => ({
    fullName: s.fullName,
    phone: s.phone,
    email: s.email,
    classLevel: s.classLevel,
    examType: s.examType,
    city: s.city,
    status: s.status,
    lessonCount: s._count.lessons,
  }));

  const ts = new Date().toISOString().slice(0, 10);
  const filename = `ogrencilerim-${ts}`;

  if (format === "xlsx") {
    return buildExportResponse(format, filename, toXlsx(data, COLUMNS, "Öğrencilerim"));
  }
  return buildExportResponse(format, filename, toCsv(data, COLUMNS));
}
