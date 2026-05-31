/**
 * Phase 2 / Session 10 — Admin: Vadeler (Payment Schedule)
 * Listeleme + filtreler. Mutasyonlar tablo içindeki client butonlardan.
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { AdminPaymentScheduleTable } from "@/components/panel/admin/finance/admin-payment-schedule-table";
import {
  formatMoneyTRY,
  type PaymentScheduleRow,
  type PaymentScheduleDisplayStatus,
} from "@/lib/panel/parent-finance";

export const dynamic = "force-dynamic";

type StatusFilter =
  | "ALL"
  | "PENDING"
  | "OVERDUE"
  | "PARTIAL"
  | "PAID"
  | "CANCELLED";

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Tümü" },
  { value: "PENDING", label: "Bekliyor" },
  { value: "OVERDUE", label: "Geciken" },
  { value: "PARTIAL", label: "Kısmi" },
  { value: "PAID", label: "Ödenen" },
  { value: "CANCELLED", label: "İptal" },
];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AdminPaymentSchedules({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;
  const status = (sp.status as StatusFilter) ?? "ALL";
  const q = sp.q?.trim() ?? "";

  // Build a base where clause; OVERDUE filter is post-derived.
  const where: Record<string, unknown> = {};
  if (status === "PENDING") where.status = "PENDING";
  else if (status === "PARTIAL") where.status = "PARTIAL";
  else if (status === "PAID") where.status = "PAID";
  else if (status === "CANCELLED") where.status = "CANCELLED";
  else if (status === "OVERDUE")
    where.AND = [{ status: "PENDING" }, { dueDate: { lt: startOfToday() } }];

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" as const } },
      { student: { fullName: { contains: q, mode: "insensitive" as const } } },
      { package: { name: { contains: q, mode: "insensitive" as const } } },
    ];
  }

  const items = await prisma.paymentScheduleItem.findMany({
    where,
    include: {
      student: { select: { id: true, fullName: true } },
      package: { select: { id: true, name: true } },
    },
    orderBy: [{ dueDate: "asc" }],
    take: 200,
  });

  const today = startOfToday();
  const rows: PaymentScheduleRow[] = items.map((s) => {
    const remaining = Math.max(0, s.amount - s.paidAmount);
    const days = Math.round(
      (s.dueDate.getTime() - today.getTime()) / 86_400_000,
    );
    let displayStatus: PaymentScheduleDisplayStatus = s.status;
    if (s.status === "PENDING" && s.dueDate.getTime() < today.getTime()) {
      displayStatus = "OVERDUE";
    }
    return {
      id: s.id,
      title: s.title,
      amountKurus: s.amount,
      paidAmountKurus: s.paidAmount,
      remainingKurus: remaining,
      dueDate: s.dueDate,
      status: s.status,
      displayStatus,
      paidAt: s.paidAt,
      paymentLink: s.paymentLink,
      note: s.note,
      createdAt: s.createdAt,
      studentId: s.studentId,
      studentFullName: s.student?.fullName ?? null,
      parentId: s.parentId,
      packageId: s.packageId,
      packageName: s.package?.name ?? null,
      purchaseIntentId: s.purchaseIntentId,
      accountingEntryId: s.accountingEntryId,
      daysUntilDue: days,
    };
  });

  // Aggregate metrics for header
  const totalOutstanding = rows
    .filter((r) => r.displayStatus !== "PAID" && r.displayStatus !== "CANCELLED")
    .reduce((sum, r) => sum + r.remainingKurus, 0);
  const overdueCount = rows.filter((r) => r.displayStatus === "OVERDUE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vadeli Ödemeler"
        subtitle="Veli ve öğrencilere atanmış vade kayıtları. OVERDUE durumu otomatik türetilir."
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Ödemeler", href: "/panel/admin/odemeler" },
          { label: "Vadeli Ödemeler" },
        ]}
        right={
          <Link
            href="/panel/admin/odemeler/vadeler/yeni"
            className="od-btn dark sm"
          >
            + Yeni Vade
          </Link>
        }
      />

      <div className="od-finance-kpi-grid">
        <div className="mini-kpi-card">
          <div className="k-label">Toplam Bekleyen</div>
          <div className="k-value">{formatMoneyTRY(totalOutstanding)}</div>
        </div>
        <div className="mini-kpi-card">
          <div className="k-label">Gösterilen Kayıt</div>
          <div className="k-value">{rows.length}</div>
          <div className="k-meta">son 200 kayıt</div>
        </div>
        <div className="mini-kpi-card">
          <div className="k-label">Geciken</div>
          <div className={`k-value ${overdueCount > 0 ? "od-money-negative" : ""}`}>
            {overdueCount}
          </div>
        </div>
      </div>

      <form
        method="GET"
        className="od-form-card od-form-grid"
      >
        <label>
          <span>Durum</span>
          <select name="status" defaultValue={status}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="full">
          <span>Ara</span>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Başlık, öğrenci, paket"
          />
        </label>
        <div className="full">
          <button type="submit" className="od-btn dark sm">
            Filtrele
          </button>
        </div>
      </form>

      <AdminPaymentScheduleTable rows={rows} />
    </div>
  );
}
