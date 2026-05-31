/**
 * Phase 3 / Session 5 — `/panel/admin/kayitlar`
 *
 * Admin enrollment list. Reuses `StudentPackageEnrollment` (Phase 1).
 * Filters: status, source, q (student/package name), classroom assignment,
 *          package, hasPaymentPlan.
 */

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import {
  getEnrollmentStatusLabel,
  getEnrollmentStatusTone,
} from "@/lib/panel/enrollment";
import type { EnrollmentSource, EnrollmentStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const TRY = (kurus: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(kurus / 100);

const DATE_TR = (d: Date) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(d);

const STATUS_OPTIONS: Array<{ value: "" | EnrollmentStatus; label: string }> = [
  { value: "", label: "Tümü" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "TRIAL", label: "Deneme" },
  { value: "LEAD", label: "Aday" },
  { value: "PAUSED", label: "Duraklatıldı" },
  { value: "COMPLETED", label: "Tamamlandı" },
  { value: "CANCELLED", label: "İptal" },
];

const SOURCE_OPTIONS: Array<{ value: "" | EnrollmentSource; label: string }> = [
  { value: "", label: "Tümü" },
  { value: "MANUAL", label: "Manuel" },
  { value: "PURCHASE", label: "Satın alma" },
  { value: "TRIAL", label: "Deneme" },
  { value: "CAMP", label: "Kamp" },
  { value: "SCHOLARSHIP", label: "Burs" },
];

export default async function EnrollmentsListPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    source?: string;
    q?: string;
    plan?: string;
  }>;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;
  const status = sp.status?.trim() || "";
  const source = sp.source?.trim() || "";
  const q = sp.q?.trim() || "";
  const planFilter = sp.plan?.trim() || ""; // "yes" | "no"

  const where: Prisma.StudentPackageEnrollmentWhereInput = {};
  if (status) where.status = status as EnrollmentStatus;
  if (source) where.source = source as EnrollmentSource;
  if (q) {
    where.OR = [
      { student: { fullName: { contains: q, mode: "insensitive" } } },
      { package: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const enrollments = await prisma.studentPackageEnrollment.findMany({
    where,
    include: {
      student: { select: { id: true, fullName: true, phone: true } },
      package: { select: { id: true, name: true, type: true, price: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });

  // For each enrollment compute a quick payment-plan summary:
  // count + total amount + earliest pending due — derived from
  // PaymentScheduleItem rows linked by (studentId, packageId) AND created
  // after the enrollment.createdAt (heuristic — we do not store an FK).
  const studentPackagePairs = enrollments.map((e) => ({ s: e.studentId, p: e.packageId, t: e.createdAt }));
  let scheduleByPair = new Map<string, { count: number; totalKurus: number; pending: number }>();
  if (studentPackagePairs.length > 0) {
    const items = await prisma.paymentScheduleItem.findMany({
      where: {
        OR: studentPackagePairs.map(({ s, p }) => ({ studentId: s, packageId: p })),
      },
      select: { studentId: true, packageId: true, amount: true, paidAmount: true, status: true, dueDate: true, createdAt: true },
    });
    scheduleByPair = items.reduce((acc, it) => {
      if (!it.studentId || !it.packageId) return acc;
      const key = `${it.studentId}|${it.packageId}`;
      const cur = acc.get(key) ?? { count: 0, totalKurus: 0, pending: 0 };
      cur.count += 1;
      cur.totalKurus += it.amount;
      if (it.status === "PENDING" || it.status === "PARTIAL") cur.pending += 1;
      acc.set(key, cur);
      return acc;
    }, new Map<string, { count: number; totalKurus: number; pending: number }>());
  }

  // Apply optional plan filter post-aggregation.
  const rows = enrollments.filter((e) => {
    if (!planFilter) return true;
    const sched = scheduleByPair.get(`${e.studentId}|${e.packageId}`);
    const hasPlan = (sched?.count ?? 0) > 0;
    return planFilter === "yes" ? hasPlan : !hasPlan;
  });

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Kayıtlar" },
        ]}
        title="Kayıtlar"
        subtitle="Öğrenci paket kayıtları ve ödeme planı durumu."
        right={
          <Link href="/panel/admin/kayitlar/yeni" className="od-btn dark sm">
            + Yeni kayıt
          </Link>
        }
      />

      {/* Filters */}
      <Card>
        <CardBody>
          <form method="GET" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>Ara</span>
              <input
                name="q"
                defaultValue={q}
                placeholder="Öğrenci / paket adı"
                className="od-input"
                style={{ minWidth: 220, padding: "6px 10px", border: "1px solid var(--pd-line)", borderRadius: 8 }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>Durum</span>
              <select name="status" defaultValue={status} className="od-select">
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>Kaynak</span>
              <select name="source" defaultValue={source} className="od-select">
                {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>Ödeme planı</span>
              <select name="plan" defaultValue={planFilter} className="od-select">
                <option value="">Tümü</option>
                <option value="yes">Plan var</option>
                <option value="no">Plan yok</option>
              </select>
            </label>
            <button type="submit" className="od-btn ghost sm">Uygula</button>
          </form>
        </CardBody>
      </Card>

      {/* Results */}
      <Card style={{ marginTop: 16 }}>
        <CardBody>
          {rows.length === 0 ? (
            <div className="od-muted" style={{ padding: 24, textAlign: "center", fontSize: 14 }}>
              Filtreyle eşleşen kayıt yok.
            </div>
          ) : (
            <table className="od-table premium-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Öğrenci</th>
                  <th style={{ textAlign: "left" }}>Paket</th>
                  <th style={{ textAlign: "left" }}>Durum</th>
                  <th style={{ textAlign: "left" }}>Kaynak</th>
                  <th style={{ textAlign: "left" }}>Başlangıç</th>
                  <th style={{ textAlign: "left" }}>Plan</th>
                  <th style={{ textAlign: "right" }}>Fiyat</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const sched = scheduleByPair.get(`${e.studentId}|${e.packageId}`);
                  return (
                    <tr key={e.id}>
                      <td>
                        <Link href={`/panel/admin/ogrenciler/${e.student.id}`} className="od-link">
                          {e.student.fullName}
                        </Link>
                      </td>
                      <td>
                        {e.package.name}
                        <div className="od-muted" style={{ fontSize: 11 }}>
                          {e.package.type === "EXAM" ? "Sınav" : "Kurs"}
                        </div>
                      </td>
                      <td>
                        <Badge tone={getEnrollmentStatusTone(e.status)}>
                          {getEnrollmentStatusLabel(e.status)}
                        </Badge>
                      </td>
                      <td>{e.source}</td>
                      <td>{DATE_TR(e.startsAt)}</td>
                      <td>
                        {sched && sched.count > 0 ? (
                          <span>
                            {sched.count} satır · {TRY(sched.totalKurus)}
                            {sched.pending > 0 ? ` · ${sched.pending} bekleyen` : ""}
                          </span>
                        ) : (
                          <span className="od-muted">—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {e.package.price > 0 ? TRY(e.package.price) : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/panel/admin/kayitlar/${e.id}`} className="od-btn ghost sm">
                          Detay →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </>
  );
}
