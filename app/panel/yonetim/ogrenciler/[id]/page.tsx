import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { loadStudent360Bundle } from "@/lib/panel/student-360-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelCard, PanelCardTitle } from "@/components/panel/ui";
import { Student360View } from "@/components/panel/student-360-view";
import { assignCoach } from "../../kocluk/actions";
import { retryOrderProvisioning } from "../../siparisler/[id]/actions";

export const dynamic = "force-dynamic";

export default async function AdminStudent360Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("ADMIN");
  const { id } = await params;
  const query = await searchParams;

  const bundle = await loadStudent360Bundle({
    viewer: session,
    studentProfileId: id,
    tabRaw: query.sekme,
  });

  const adminActions = (
    <div className="mt-5 space-y-5">
      <PanelCard>
        <PanelCardTitle>Operasyon kısayolları</PanelCardTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/panel/yonetim/kullanicilar/${bundle.access.studentUserId}`}
            className="rounded-[10px] border border-[#DDE4E0] bg-white px-3.5 py-2 text-[12.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
          >
            Kişi detayını aç
          </Link>
        </div>

        <form action={assignCoach} className="mt-4 rounded-[10px] border border-dc-line-soft bg-white p-3.5">
          <p className="text-[12.5px] font-bold text-dc-ink">
            {bundle.currentCoachId ? "Koç devret" : "Koç ata"}
          </p>
          <input type="hidden" name="studentId" value={bundle.access.studentProfileId} />
          <div className="mt-2.5 flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <label className="sr-only" htmlFor="coachId">
                Koç
              </label>
              <select
                id="coachId"
                name="coachId"
                required
                defaultValue={bundle.currentCoachId ?? bundle.coachOptions[0]?.id ?? ""}
                className="panel-input py-2 text-xs"
              >
                {!bundle.coachOptions.length ? <option value="">Aktif koç bulunamadı</option> : null}
                {bundle.coachOptions.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[120px]">
              <label className="sr-only" htmlFor="cadenceDays">
                Sıklık (gün)
              </label>
              <input
                id="cadenceDays"
                name="cadenceDays"
                type="number"
                min={1}
                defaultValue={bundle.currentCadenceDays ?? ""}
                className="panel-input py-2 text-xs"
                placeholder="Sıklık"
              />
            </div>
            <button
              type="submit"
              disabled={bundle.coachOptions.length === 0}
              className="rounded-[10px] border border-[#DDE4E0] bg-white px-3 py-2 text-[12px] font-bold text-dc-ink transition-colors hover:border-dc-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bundle.currentCoachId ? "Devret" : "Koç ata"}
            </button>
          </div>
        </form>

        {bundle.commerce?.orders.some(
          (order) => order.status === "PAID" && order.provisioningStatus !== "SUCCEEDED",
        ) ? (
          <div className="mt-4 space-y-2">
            {bundle.commerce.orders
              .filter((order) => order.status === "PAID" && order.provisioningStatus !== "SUCCEEDED")
              .map((order) => (
                <form key={order.id} action={retryOrderProvisioning}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button
                    type="submit"
                    className="rounded-[10px] border border-[#DDE4E0] bg-white px-3 py-2 text-[12px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
                  >
                    {order.packageName} erişimini yeniden dene
                  </button>
                </form>
              ))}
          </div>
        ) : null}
      </PanelCard>
    </div>
  );

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Öğrenci 360"
    >
      <Student360View
        bundle={bundle}
        listHref="/panel/yonetim/ogrenciler"
        adminActions={adminActions}
      />
    </PanelShell>
  );
}
