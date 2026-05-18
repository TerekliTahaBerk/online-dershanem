import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { createPayrollAction } from "../_actions";
import { PayrollForm } from "../_form";

export const dynamic = "force-dynamic";

export default async function NewPayrollPage() {
  await requirePanelRole("admin");
  const teachers = await prisma.teacher.findMany({
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });
  return (
    <>
      <PageHeader
        title="Yeni öğretmen ödemesi"
        right={
          <Link href="/panel/admin/maaslar" className="od-btn od-btn-ghost od-btn-sm">
            ← Liste
          </Link>
        }
      />
      <Card>
        <CardBody>
          <PayrollForm action={createPayrollAction} teachers={teachers} submitLabel="Oluştur" />
        </CardBody>
      </Card>
    </>
  );
}
