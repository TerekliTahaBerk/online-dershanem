import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforce, ForbiddenError } from "@/lib/rbac/enforce";
import {
  buildExportResponse,
  parseFormat,
  toCsv,
  toXlsx,
  type ExportColumn,
} from "@/lib/export";

type Row = {
  createdAt: Date;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  actorType: string;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  payload: string;
};

const COLUMNS: ExportColumn<Row>[] = [
  {
    key: "createdAt",
    header: "Tarih",
    format: (r) => format(r.createdAt, "yyyy-MM-dd HH:mm:ss"),
  },
  { key: "actorName", header: "Aktör" },
  { key: "actorEmail", header: "E-posta" },
  { key: "actorRole", header: "Rol" },
  { key: "actorType", header: "Aktör Tipi" },
  { key: "entityType", header: "Varlık" },
  { key: "entityId", header: "Varlık ID" },
  { key: "action", header: "Aksiyon" },
  { key: "summary", header: "Özet" },
  { key: "payload", header: "Payload" },
];

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    await enforce(session.user.id, session.user.role as any, "audit.read");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw e;
  }

  const sp = req.nextUrl.searchParams;
  const formatKind = parseFormat(sp.get("format"));
  const entityType = sp.get("entityType");
  const action = sp.get("action");
  const actorUserId = sp.get("actorUserId");
  const q = sp.get("q");
  const from = sp.get("from");
  const to = sp.get("to");

  const where: Prisma.AuditLogWhereInput = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (actorUserId) where.actorUserId = actorUserId;
  if (q) {
    where.OR = [
      { entityType: { contains: q, mode: "insensitive" } },
      { action: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
    ];
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: {
      actor: { select: { name: true, email: true, role: true } },
    },
  });

  const data: Row[] = logs.map((l) => ({
    createdAt: l.createdAt,
    actorName: l.actor?.name ?? "",
    actorEmail: l.actor?.email ?? "",
    actorRole: l.actor?.role ?? "",
    actorType: l.actorType,
    entityType: l.entityType,
    entityId: l.entityId,
    action: l.action,
    summary: l.summary ?? "",
    payload: l.payload ? JSON.stringify(l.payload) : "",
  }));

  const ts = new Date().toISOString().slice(0, 10);
  const filename = `audit-log-${ts}`;

  if (formatKind === "xlsx") {
    return buildExportResponse(formatKind, filename, toXlsx(data, COLUMNS, "Audit"));
  }
  return buildExportResponse(formatKind, filename, toCsv(data, COLUMNS));
}
