import { NextRequest, NextResponse } from "next/server";
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

type Row = {
  occurredAt: Date;
  type: "INCOME" | "EXPENSE";
  category: string;
  related: string;
  description: string;
  amount: number;
};

const COLUMNS: ExportColumn<Row>[] = [
  {
    key: "occurredAt",
    header: "Tarih",
    format: (r) => r.occurredAt.toISOString().slice(0, 10),
  },
  {
    key: "type",
    header: "Tip",
    format: (r) => (r.type === "INCOME" ? "Gelir" : "Gider"),
  },
  { key: "category", header: "Kategori" },
  { key: "related", header: "İlgili" },
  { key: "description", header: "Açıklama" },
  {
    key: "amount",
    header: "Tutar (TL)",
    format: (r) => (r.amount / 100).toFixed(2),
  },
];

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await enforce(session.user.id, session.user.role, "accounting.read");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const format = parseFormat(sp.get("format"));
  const type = sp.get("type"); // INCOME | EXPENSE | null
  const from = sp.get("from"); // YYYY-MM-DD
  const to = sp.get("to");

  const where: any = {};
  if (type === "INCOME" || type === "EXPENSE") where.type = type;
  if (from || to) {
    where.occurredAt = {};
    if (from) where.occurredAt.gte = new Date(from);
    if (to) where.occurredAt.lte = new Date(to);
  }

  const entries = await prisma.accountingEntry.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: 5000,
    include: {
      student: { select: { fullName: true } },
      teacher: { select: { fullName: true } },
      package: { select: { name: true } },
    },
  });

  const data: Row[] = entries.map((e) => ({
    occurredAt: e.occurredAt,
    type: e.type as "INCOME" | "EXPENSE",
    category: e.category ?? "",
    related:
      e.student?.fullName ??
      e.teacher?.fullName ??
      e.package?.name ??
      "",
    description: e.description ?? "",
    amount: e.amount,
  }));

  const ts = new Date().toISOString().slice(0, 10);
  const filename = `muhasebe-${ts}`;

  if (format === "xlsx") {
    return buildExportResponse(format, filename, toXlsx(data, COLUMNS, "Muhasebe"));
  }
  return buildExportResponse(format, filename, toCsv(data, COLUMNS));
}
