import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";
import { setPurchaseStatusAction } from "./_actions";

export const dynamic = "force-dynamic";

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePanelRole("admin");
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { studentFullName: { contains: q, mode: "insensitive" as const } },
          { packageName: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const intents = await prisma.purchaseIntent.findMany({
    where,
    orderBy: { submittedAt: "desc" }, take: 100,
  });
  return (
    <>
      <PageHeader
        title="Ödemeler"
        subtitle={`${intents.length} kayıt${q ? ` · "${q}"` : ""}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <SearchInput placeholder="Öğrenci, paket…" />
            <ExportButton entity="odemeler" />
          </div>
        }
      />
      <Card>
        <table className="od-table">
          <thead><tr><th>Öğrenci</th><th>Paket</th><th>Durum</th><th>Tarih</th><th></th></tr></thead>
          <tbody>
            {intents.map((p) => (
              <tr key={p.id}>
                <td>{p.studentFullName}</td>
                <td>{p.packageName}</td>
                <td><Badge tone={p.status === "PAID" ? "ok" : p.status === "FAILED" ? "bad" : "warn"}>{p.status}</Badge></td>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR").format(p.submittedAt)}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  {p.status !== "PAID" && (
                    <form action={setPurchaseStatusAction.bind(null, p.id, "PAID")} style={{ display: "inline" }}>
                      <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-ok)" }}>Ödendi</button>
                    </form>
                  )}
                  {p.status !== "FAILED" && (
                    <form action={setPurchaseStatusAction.bind(null, p.id, "FAILED")} style={{ display: "inline" }}>
                      <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>İptal</button>
                    </form>
                  )}
                  {p.status !== "PENDING" && (
                    <form action={setPurchaseStatusAction.bind(null, p.id, "PENDING")} style={{ display: "inline" }}>
                      <button type="submit" className="od-btn od-btn-ghost od-btn-sm">Beklemede</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
