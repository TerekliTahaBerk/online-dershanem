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
        right={
          <Link
            href="/panel/admin/odemeler/vadeler/yeni"
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            + Yeni Vade
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Toplam Bekleyen
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {formatMoneyTRY(totalOutstanding)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Gösterilen Kayıt
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {rows.length}
          </div>
          <div className="text-xs text-slate-500">son 200 kayıt</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Geciken
          </div>
          <div
            className={`mt-1 text-2xl font-semibold ${
              overdueCount > 0 ? "text-rose-700" : "text-slate-900"
            }`}
          >
            {overdueCount}
          </div>
        </div>
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Durum</span>
          <select
            name="status"
            defaultValue={status}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block flex-1 text-sm">
          <span className="font-medium text-slate-700">Ara</span>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Başlık, öğrenci, paket"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Filtrele
        </button>
      </form>

      <AdminPaymentScheduleTable rows={rows} />
    </div>
  );
}
