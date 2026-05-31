/**
 * Phase 2 / Session 10 — Admin: Yeni Vade Oluştur
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { PaymentScheduleForm } from "@/components/panel/admin/finance/payment-schedule-form";

export const dynamic = "force-dynamic";

export default async function NewPaymentSchedule() {
  await requirePanelRole("admin");

  const [students, parents, packages] = await Promise.all([
    prisma.student.findMany({
      select: {
        id: true,
        fullName: true,
        parents: { select: { parentId: true } },
      },
      orderBy: { fullName: "asc" },
      take: 500,
    }),
    prisma.parent.findMany({
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
      take: 500,
    }),
    prisma.package.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yeni Vade"
        subtitle="Veli/öğrenci/pakete bağlı bir ödeme planı kaydı oluşturun. Tutar TL cinsinden, kuruşlu yazılabilir."
        right={
          <Link
            href="/panel/admin/odemeler/vadeler"
            className="text-sm font-medium text-sky-700 hover:underline"
          >
            ← Listeye dön
          </Link>
        }
      />
      <PaymentScheduleForm
        options={{
          students: students.map((s) => ({
            id: s.id,
            fullName: s.fullName,
            parentIds: s.parents.map((p) => p.parentId),
          })),
          parents,
          packages,
        }}
      />
    </div>
  );
}
