import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { updateCouponAction } from "../../_actions";
import { CouponForm } from "../../_form";

export const dynamic = "force-dynamic";

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanelRole("admin");
  const { id } = await params;
  const c = await prisma.coupon.findUnique({
    where: { id },
    include: { _count: { select: { redemptions: true } } },
  });
  if (!c) notFound();

  return (
    <>
      <PageHeader
        title={`Düzenle · ${c.code}`}
        subtitle={`${c._count.redemptions} kez kullanıldı`}
        right={
          <Link href="/panel/admin/indirim-kodlari" className="od-btn od-btn-ghost od-btn-sm">
            ← Liste
          </Link>
        }
      />
      <Card>
        <CardBody>
          <CouponForm
            action={updateCouponAction.bind(null, c.id)}
            submitLabel="Güncelle"
            defaults={{
              code: c.code,
              type: c.type,
              service: c.service,
              value: c.value,
              minOrderCents: c.minOrderCents,
              maxDiscountCents: c.maxDiscountCents,
              usageLimit: c.usageLimit,
              perUserLimit: c.perUserLimit,
              startsAt: c.startsAt,
              expiresAt: c.expiresAt,
              description: c.description,
              isActive: c.isActive,
            }}
          />
        </CardBody>
      </Card>
    </>
  );
}
