import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getServerAuthSession } from "@/lib/auth";
import { enforce } from "@/lib/rbac/enforce";
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

function asArray(sp: URLSearchParams, key: string): string[] {
  return sp.getAll(key).filter(Boolean);
}

function buildWhere(sp: URLSearchParams): Prisma.StudentWhereInput {
  const status = asArray(sp, "status").filter((s) => STATUSES.has(s)) as any[];
  const classLevel = asArray(sp, "classLevel");
  const examType = asArray(sp, "examType");
  const city = asArray(sp, "city");
  const tag = asArray(sp, "tag");

  const where: Prisma.StudentWhereInput = {};
  if (status.length) where.status = { in: status };
  if (classLevel.length) where.classLevel = { in: classLevel };
  if (examType.length) where.examType = { in: examType };
  if (city.length) where.city = { in: city };
  if (tag.length) where.tags = { some: { tagId: { in: tag } } };
  return where;
}

type Row = {
  fullName: string;
  phone: string;
  email: string | null;
  classLevel: string | null;
  examType: string | null;
  city: string | null;
  status: string;
  activePackage: string | null;
  lessons: number;
  tags: string;
  updatedAt: Date;
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
  { key: "activePackage", header: "Aktif Paket" },
  { key: "lessons", header: "Ders Sayısı" },
  { key: "tags", header: "Etiketler" },
  {
    key: "updatedAt",
    header: "Son Güncelleme",
    format: (r) => r.updatedAt.toISOString().slice(0, 16).replace("T", " "),
  },
];

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await enforce(session.user.id, session.user.role, "students.read");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const format = parseFormat(sp.get("format"));
  const where = buildWhere(sp);

  const rows = await prisma.student.findMany({
    where,
    select: {
      fullName: true,
      phone: true,
      email: true,
      classLevel: true,
      examType: true,
      city: true,
      status: true,
      activePackage: true,
      updatedAt: true,
      tags: { select: { tag: { select: { label: true } } } },
      _count: { select: { lessons: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });

  const data: Row[] = rows.map((r) => ({
    fullName: r.fullName,
    phone: r.phone,
    email: r.email,
    classLevel: r.classLevel,
    examType: r.examType,
    city: r.city,
    status: r.status,
    activePackage: r.activePackage,
    lessons: r._count.lessons,
    tags: r.tags.map((t) => t.tag.label).join(", "),
    updatedAt: r.updatedAt,
  }));

  const ts = new Date().toISOString().slice(0, 10);
  const filename = `ogrenciler-${ts}`;

  if (format === "xlsx") {
    return buildExportResponse(format, filename, toXlsx(data, COLUMNS, "Öğrenciler"));
  }
  return buildExportResponse(format, filename, toCsv(data, COLUMNS));
}
