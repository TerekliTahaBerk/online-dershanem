import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelSession, type PanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { AccountDeletionForm } from "./account-deletion-form";
import {
  createMyDeletionRequestAction,
  cancelMyDeletionRequestAction,
} from "./account-deletion-actions";

export async function HesapSilPage({ segment }: { segment: PanelRole }) {
  const ctx = await requirePanelSession();

  const requests = await prisma.accountDeletionRequest.findMany({
    where: { userId: ctx.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      reason: true,
      requestedAt: true,
      scheduledFor: true,
      reviewedAt: true,
      reviewerNotes: true,
    },
  });

  const active = requests.find((r) => r.status === "PENDING" || r.status === "APPROVED") ?? null;
  const history = requests.filter((r) => r !== active);

  const toView = (r: typeof requests[number]) => ({
    id: r.id,
    status: r.status,
    reason: r.reason,
    requestedAt: r.requestedAt.toISOString(),
    scheduledFor: r.scheduledFor.toISOString(),
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    reviewerNotes: r.reviewerNotes,
  });

  return (
    <>
      <PageHeader
        title="Hesabımı sil"
        subtitle="KVKK 11. madde — kişisel verilerin silinmesini talep et"
        breadcrumbs={[
          { label: "Panel", href: `/panel/${segment}` },
          { label: "Profilim", href: `/panel/${segment}/profilim` },
          { label: "Hesabımı sil" },
        ]}
        right={
          <Link href={`/panel/${segment}/profilim`} className="od-btn ghost sm">
            ← Profilime dön
          </Link>
        }
      />
      <AccountDeletionForm
        active={active ? toView(active) : null}
        history={history.map(toView)}
        createAction={createMyDeletionRequestAction}
        cancelAction={cancelMyDeletionRequestAction}
      />
    </>
  );
}
