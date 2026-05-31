import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { ParentPaymentSummary } from "@/lib/panel/parent-dashboard";

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "2-digit" });
const fmt = (k: number) => `₺${(k / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;

const STATUS_TONE: Record<string, "ok" | "warn" | "bad" | "neutral"> = {
  PAID: "ok", PENDING: "warn", FAILED: "bad", OTHER: "neutral",
};
const STATUS_LABEL: Record<string, string> = {
  PAID: "Ödendi", PENDING: "Beklemede", FAILED: "Başarısız", OTHER: "—",
};

type Props = { summary: ParentPaymentSummary };

/**
 * Payment summary — uses real DB data only:
 *   - PurchaseIntent (recent purchase requests)
 *   - AccountingEntry (real INCOME entries, last 90 days)
 *
 * Honest about limits: there is no recurring "due/overdue" model in this
 * codebase. We label that section as "deferred" rather than inventing
 * fake amounts.
 */
export function ParentPaymentSummaryCard({ summary }: Props) {
  const empty =
    summary.recentIntents.length === 0 &&
    summary.recentPaidEntries.length === 0 &&
    summary.dueSummary === null;

  return (
    <Card>
      <CardHeader
        title="Ödemeler"
        subtitle={summary.paidLast90DaysKurus > 0
          ? `Son 90 gün: ${fmt(summary.paidLast90DaysKurus)}`
          : undefined}
        right={
          <Link href="/panel/veli/odemeler" className="od-btn od-btn-ghost od-btn-sm">
            Tümü →
          </Link>
        }
      />
      <CardBody>
        {empty ? (
          <EmptyState
            icon="money"
            title="Ödeme kaydı bulunmuyor."
            description="Ödeme yapıldığında ya da paket alındığında burada listelenecek."
          />
        ) : (
          <>
            {/* Phase 2 / Session 10 — gerçek vade özeti veya dürüst boş durum */}
            {summary.dueSummary ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  marginBottom: 10,
                  background:
                    summary.dueSummary.overdueCount > 0
                      ? "rgba(244, 63, 94, 0.08)"
                      : "var(--pd-soft)",
                  fontSize: 13,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    Toplam bekleyen
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    {fmt(summary.dueSummary.totalOutstandingKurus)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    Yaklaşan / Geciken
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    {summary.dueSummary.upcomingCount} /{" "}
                    <span
                      style={{
                        color:
                          summary.dueSummary.overdueCount > 0
                            ? "#be123c"
                            : "inherit",
                      }}
                    >
                      {summary.dueSummary.overdueCount}
                    </span>
                  </div>
                </div>
                {summary.dueSummary.nextDueDate ? (
                  <div style={{ gridColumn: "1 / -1", fontSize: 12, opacity: 0.8 }}>
                    Sıradaki:{" "}
                    <strong>{summary.dueSummary.nextDueTitle ?? "—"}</strong>{" "}
                    — {DATE_FMT.format(summary.dueSummary.nextDueDate)}
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  marginBottom: 10,
                  background: "var(--pd-soft)",
                  fontSize: 12,
                }}
                className="od-muted"
              >
                ℹ Bu öğrenci için tanımlı vade kaydı yok. Aşağıda yalnızca
                gerçek ödeme ve fatura kayıtları gösteriliyor.
              </div>
            )}

            {summary.recentPaidEntries.length > 0 ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: 0.6, margin: "6px 0" }}>
                  Son ödemeler
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                  {summary.recentPaidEntries.map((e) => (
                    <div key={e.id} style={{
                      display: "grid", gridTemplateColumns: "70px 1fr auto", gap: 8,
                      padding: "6px 10px", borderRadius: 6, background: "var(--pd-soft)",
                      fontSize: 13, alignItems: "center",
                    }}>
                      <span className="od-mono od-muted" style={{ fontSize: 12 }}>
                        {DATE_FMT.format(e.occurredAt)}
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.description ?? e.category}
                      </span>
                      <span className="od-mono" style={{ fontWeight: 600 }}>
                        {fmt(e.amountKurus)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {summary.recentIntents.length > 0 ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: 0.6, margin: "6px 0" }}>
                  Son satın alma talepleri
                  {summary.pendingIntentCount > 0
                    ? <Badge tone="warn">{summary.pendingIntentCount} bekleyen</Badge>
                    : null}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {summary.recentIntents.map((i) => (
                    <div key={i.id} style={{
                      display: "grid", gridTemplateColumns: "70px 1fr auto", gap: 8,
                      padding: "6px 10px", borderRadius: 6, background: "var(--pd-soft)",
                      fontSize: 13, alignItems: "center",
                    }}>
                      <span className="od-mono od-muted" style={{ fontSize: 12 }}>
                        {DATE_FMT.format(i.date)}
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {i.packageName}
                      </span>
                      <Badge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
}
