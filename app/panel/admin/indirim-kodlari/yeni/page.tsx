import Link from "next/link";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { createCouponAction } from "../_actions";
import { CouponForm } from "../_form";

export const dynamic = "force-dynamic";

export default async function NewCouponPage() {
  await requirePanelRole("admin");
  return (
    <>
      <PageHeader
        title="Yeni indirim kodu"
        right={
          <Link href="/panel/admin/indirim-kodlari" className="od-btn od-btn-ghost od-btn-sm">
            ← Liste
          </Link>
        }
      />
      <Card>
        <CardBody>
          <CouponForm action={createCouponAction} submitLabel="Oluştur" />
        </CardBody>
      </Card>
    </>
  );
}
