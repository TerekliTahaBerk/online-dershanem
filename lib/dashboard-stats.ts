import { prisma } from "@/lib/prisma";

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const monKey = (d: Date) => `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, "0")}`;

export function buildEmptyDays(days: number): { x: string; y: number; iso: string }[] {
  const out: { x: string; y: number; iso: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    out.push({ x: monKey(d), y: 0, iso: dayKey(d) });
  }
  return out;
}

/** Generic count-over-days based on createdAt-style field. */
export async function studentRegistrationsLast30(): Promise<{ x: string; y: number }[]> {
  const since = new Date(Date.now() - 30 * 86400000);
  const rows = await prisma.student.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const buckets = buildEmptyDays(30);
  for (const r of rows) {
    const k = dayKey(r.createdAt);
    const b = buckets.find((x) => x.iso === k);
    if (b) b.y++;
  }
  return buckets.map(({ x, y }) => ({ x, y }));
}

export async function leadsVsPaidLast30(): Promise<{ name: string; data: { x: string; y: number }[] }[]> {
  const since = new Date(Date.now() - 30 * 86400000);
  const [leads, paids] = await Promise.all([
    prisma.leadSubmission.findMany({ where: { submittedAt: { gte: since } }, select: { submittedAt: true } }),
    prisma.purchaseIntent.findMany({ where: { status: "PAID", submittedAt: { gte: since } }, select: { submittedAt: true } }),
  ]);
  const lb = buildEmptyDays(30);
  const pb = buildEmptyDays(30);
  for (const r of leads) { const b = lb.find((x) => x.iso === dayKey(r.submittedAt)); if (b) b.y++; }
  for (const r of paids) { const b = pb.find((x) => x.iso === dayKey(r.submittedAt)); if (b) b.y++; }
  return [
    { name: "Lead", data: lb.map(({ x, y }) => ({ x, y })) },
    { name: "Ödeme", data: pb.map(({ x, y }) => ({ x, y })) },
  ];
}

export async function incomeVsExpenseLast30(): Promise<{ name: string; data: { x: string; y: number }[] }[]> {
  const since = new Date(Date.now() - 30 * 86400000);
  const rows = await prisma.accountingEntry.findMany({
    where: { occurredAt: { gte: since } },
    select: { type: true, amount: true, occurredAt: true },
  });
  const ib = buildEmptyDays(30);
  const eb = buildEmptyDays(30);
  for (const r of rows) {
    const bucket = (r.type === "INCOME" ? ib : eb).find((x) => x.iso === dayKey(r.occurredAt));
    if (bucket) bucket.y += r.amount / 100; // → TL
  }
  return [
    { name: "Gelir", data: ib.map(({ x, y }) => ({ x, y: Math.round(y) })) },
    { name: "Gider", data: eb.map(({ x, y }) => ({ x, y: Math.round(y) })) },
  ];
}

export async function studentStatusBreakdown(): Promise<{ name: string; value: number }[]> {
  const groups = await prisma.student.groupBy({ by: ["status"], _count: { _all: true } });
  return groups.map((g) => ({ name: g.status, value: g._count._all }));
}

export async function classroomLevelBreakdown(): Promise<{ name: string; value: number }[]> {
  const groups = await prisma.classroom.groupBy({ by: ["level"], _count: { _all: true } });
  return groups.map((g) => ({ name: g.level, value: g._count._all }));
}
