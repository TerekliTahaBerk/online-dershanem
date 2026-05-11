import { NextRequest, NextResponse } from "next/server";
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

type Row = {
  occurredAt: Date;
  childName: string;
  description: string;
  kind: "INTENT" | "INCOME";
  amountTL: number;
  status: string;
};

const KIND_LABEL: Record<Row["kind"], string> = {
  INTENT: "Sipariş",
  INCOME: "Tahsilat",
};

const COLUMNS: ExportColumn<Row>[] = [
  {
    key: "occurredAt",
    header: "Tarih",
    format: (r) => format(r.occurredAt, "yyyy-MM-dd"),
  },
  { key: "childName", header: "Çocuk" },
  { key: "description", header: "Açıklama" },
  {
    key: "kind",
    header: "Tür",
    format: (r) => KIND_LABEL[r.kind],
  },
  { key: "amountTL", header: "Tutar (TL)" },
  { key: "status", header: "Durum" },
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
  const kindSet = new Set(sp.getAll("kind").filter((k) => k === "INTENT" || k === "INCOME"));
  const statusSet = new Set(sp.getAll("status"));
  const childFilterRaw = sp.getAll("childId").filter((id) => childIds.includes(id));
  const targetIds = childFilterRaw.length ? childFilterRaw : childIds;

  const includeIntent = kindSet.size === 0 || kindSet.has("INTENT");
  const includeIncome = kindSet.size === 0 || kindSet.has("INCOME");

  const [intents, accounting] = await Promise.all([
    includeIntent
      ? prisma.purchaseIntent.findMany({
          where: { studentId: { in: targetIds } },
          orderBy: { submittedAt: "desc" },
          take: 5000,
          include: { student: { select: { fullName: true } } },
        })
      : Promise.resolve([] as any[]),
    includeIncome
      ? prisma.accountingEntry.findMany({
          where: { studentId: { in: targetIds }, type: "INCOME" },
          orderBy: { occurredAt: "desc" },
          take: 5000,
          include: {
            student: { select: { fullName: true } },
            package: { select: { name: true } },
          },
        })
      : Promise.resolve([] as any[]),
  ]);

  const rows: Row[] = [
    ...intents.map((i: any) => ({
      occurredAt: i.submittedAt,
      childName: i.student?.fullName ?? i.studentFullName ?? "—",
      description: i.packageName,
      kind: "INTENT" as const,
      amountTL: 0,
      status: i.status,
    })),
    ...accounting.map((a: any) => ({
      occurredAt: a.occurredAt,
      childName: a.student?.fullName ?? "—",
      description: a.package?.name ?? a.description ?? "—",
      kind: "INCOME" as const,
      amountTL: Math.round(a.amount / 100),
      status: "PAID",
    })),
  ]
    .filter((r) => statusSet.size === 0 || statusSet.has(r.status))
    .sort((a, b) => +b.occurredAt - +a.occurredAt);

  const ts = new Date().toISOString().slice(0, 10);
  const filename = `cocuklarin-odemeleri-${ts}`;

  if (formatKind === "xlsx") {
    return buildExportResponse(formatKind, filename, toXlsx(rows, COLUMNS, "Ödemeler"));
  }
  return buildExportResponse(formatKind, filename, toCsv(rows, COLUMNS));
}
