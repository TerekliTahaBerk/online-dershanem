import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { updatePayrollAction } from "../../_actions";
import { PayrollForm } from "../../_form";

export const dynamic = "force-dynamic";

export default async function EditPayrollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanelRole("admin");
  const { id } = await params;
  const [item, teachers] = await Promise.all([
    prisma.teacherPayroll.findUnique({
      where: { id },
      include: { teacher: { select: { id: true, fullName: true } } },
    }),
    prisma.teacher.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }),
  ]);
  if (!item) notFound();

  return (
    <>
      <PageHeader
        title={`Düzenle · ${item.teacher.fullName}`}
        right={
          <Link href="/panel/admin/maaslar" className="od-btn od-btn-ghost od-btn-sm">
            ← Liste
          </Link>
        }
      />
      <Card>
        <CardBody>
          <PayrollForm
            action={updatePayrollAction.bind(null, item.id)}
            teachers={teachers}
            lockTeacher
            submitLabel="Güncelle"
            defaults={{
              teacherId: item.teacherId,
              periodStart: item.periodStart,
              periodEnd: item.periodEnd,
              amount: item.amount,
              status: item.status,
              notes: item.notes,
            }}
          />
        </CardBody>
      </Card>
    </>
  );
}
