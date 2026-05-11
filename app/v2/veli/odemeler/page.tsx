import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Wallet, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getParentWithChildren } from "@/lib/parent-context";
import { PageHeader } from "@/components/od/page-header";
import { KpiCard } from "@/components/od/charts/kpi-card";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

function fmtTL(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

const STATUS_TONE: Record<string, "mint" | "yellow" | "blush" | "neutral"> = {
  COMPLETED: "mint",
  PENDING: "yellow",
  FAILED: "blush",
  CANCELLED: "blush",
};

export default async function ParentPaymentsPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");
  const ctx = await getParentWithChildren(session.user.id);
  if (!ctx) return notFound();

  const [intents, accounting] = await Promise.all([
    prisma.purchaseIntent.findMany({
      where: { studentId: { in: ctx.childIds } },
      orderBy: { submittedAt: "desc" },
      take: 50,
      include: { student: { select: { fullName: true } } },
    }),
    prisma.accountingEntry.findMany({
      where: { studentId: { in: ctx.childIds }, type: "INCOME" },
      orderBy: { occurredAt: "desc" },
      take: 50,
      include: { student: { select: { fullName: true } }, package: { select: { name: true } } },
    }),
  ]);

  const totalPaid = accounting.reduce((acc, a) => acc + a.amount, 0);
  const pendingCount = intents.filter((i) => i.status === "PENDING").length;

  return (
    <div className="space-y-od-5">
      <PageHeader title="Ödemeler" description="Sipariş ve ödeme geçmişi" />

      <div className="grid gap-od-3 md:grid-cols-3">
        <KpiCard tone="mint" label="Toplam Ödenen" value={fmtTL(totalPaid)} />
        <KpiCard tone="yellow" label="Bekleyen Sipariş" value={pendingCount} />
        <KpiCard tone="sky" label="Toplam Sipariş" value={intents.length} />
      </div>

      <Card>
        <CardContent className="space-y-od-2 p-od-3">
          <h3 className="text-od-h4 font-semibold">Siparişlerim</h3>
          {intents.length === 0 ? (
            <p className="text-od-tiny text-od-mute">Sipariş yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-od-small">
                <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                  <tr>
                    <th className="px-od-4 py-od-2">Tarih</th>
                    <th className="px-od-4 py-od-2">Çocuk</th>
                    <th className="px-od-4 py-od-2">Paket</th>
                    <th className="px-od-4 py-od-2">Durum</th>
                    <th className="px-od-4 py-od-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {intents.map((i) => (
                    <tr key={i.id} className="border-b border-od-border/60">
                      <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">
                        {format(i.submittedAt, "dd MMM yyyy", { locale: tr })}
                      </td>
                      <td className="px-od-4 py-od-2 font-medium">{i.student?.fullName ?? "—"}</td>
                      <td className="px-od-4 py-od-2">{i.packageName}</td>
                      <td className="px-od-4 py-od-2">
                        <Badge tone={STATUS_TONE[i.status] ?? "neutral"} size="sm">{i.status}</Badge>
                      </td>
                      <td className="px-od-4 py-od-2">
                        {i.paymentLink && i.status === "PENDING" && (
                          <a
                            href={i.paymentLink}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex items-center gap-1 text-od-tiny text-pastel-sky-ink"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Öde
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-od-2 p-od-3">
          <h3 className="text-od-h4 font-semibold">Ödeme Geçmişi</h3>
          {accounting.length === 0 ? (
            <p className="text-od-tiny text-od-mute">Henüz ödeme yok.</p>
          ) : (
            <table className="w-full text-od-small">
              <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                <tr>
                  <th className="px-od-4 py-od-2">Tarih</th>
                  <th className="px-od-4 py-od-2">Çocuk</th>
                  <th className="px-od-4 py-od-2">Paket / Açıklama</th>
                  <th className="px-od-4 py-od-2">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {accounting.map((a) => (
                  <tr key={a.id} className="border-b border-od-border/60">
                    <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">
                      {format(a.occurredAt, "dd MMM yyyy", { locale: tr })}
                    </td>
                    <td className="px-od-4 py-od-2 font-medium">{a.student?.fullName ?? "—"}</td>
                    <td className="px-od-4 py-od-2 text-od-mute">{a.package?.name ?? a.description ?? "—"}</td>
                    <td className="px-od-4 py-od-2 font-medium text-pastel-mint-ink">{fmtTL(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {intents.length === 0 && accounting.length === 0 && (
        <EmptyState tone="yellow" icon={Wallet} title="Henüz ödeme/sipariş yok" />
      )}
    </div>
  );
}
