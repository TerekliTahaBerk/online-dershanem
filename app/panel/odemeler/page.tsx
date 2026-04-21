import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreditCard, ExternalLink, CheckCircle, Clock, XCircle, Receipt } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type PurchaseWithEvents = Prisma.PurchaseIntentGetPayload<{
  include: { events: true };
}>;

type UserWithStudent = Prisma.UserGetPayload<{
  include: {
    student: {
      include: {
        purchaseIntents: { include: { events: true } };
      };
    };
  };
}>;

export default async function PanelOdemelerPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      student: {
        include: {
          purchaseIntents: {
            include: { events: { orderBy: { createdAt: "asc" } } },
            orderBy: { submittedAt: "desc" },
          },
        },
      },
    },
  }) as unknown as UserWithStudent | null;

  const student = user?.student;
  if (!student) redirect("/panel");

  const purchases = student.purchaseIntents as unknown as PurchaseWithEvents[];
  const paidCount = purchases.filter((p) => p.status === "PAID").length;
  const pendingCount = purchases.filter((p) => p.status === "PENDING").length;

  return (
    <>
      <div className="pd-page-header">
        <h1 className="pd-page-title">Ödemelerim</h1>
        <p className="pd-page-sub">
          {purchases.length} kayıt · {paidCount} ödendi · {pendingCount} beklemede
        </p>
      </div>

      <div className="pd-page-body">
        {/* KPI strip */}
        <div className="pd-kpi-grid" style={{ marginBottom: 20 }}>
          {[
            { label: "Toplam Kayıt", value: purchases.length.toString() },
            { label: "Ödendi", value: paidCount.toString() },
            { label: "Beklemede", value: pendingCount.toString() },
          ].map((k) => (
            <div key={k.label} className="pd-kpi-card">
              <div className="pd-kpi-label">{k.label}</div>
              <div className="pd-kpi-value">{k.value}</div>
            </div>
          ))}
        </div>

        {purchases.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 24px",
              background: "var(--pd-bg-elevated)",
              border: "1px solid var(--pd-line)",
              borderRadius: 16,
            }}
          >
            <CreditCard size={32} style={{ color: "var(--pd-muted-2)", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--pd-ink-2)" }}>Henüz ödeme hareketiniz yok</p>
            <p style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 4 }}>Satın alma detaylarınız burada yer alacak.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {purchases.map((purchase) => {
              const isPaid = purchase.status === "PAID";
              const isFailed = purchase.status === "FAILED";
              return (
                <div
                  key={purchase.id}
                  className="pd-card"
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 0 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: isPaid ? "var(--pd-accent-soft)" : "var(--pd-bg-subtle)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <CreditCard size={16} style={{ color: isPaid ? "var(--pd-accent)" : "var(--pd-muted)" }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--pd-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {purchase.packageName}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 3 }}>
                          {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(purchase.submittedAt))}
                          {purchase.source ? ` · ${purchase.source}` : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span
                        className={isPaid ? "pd-chip pd-chip-accent" : isFailed ? "pd-chip" : "pd-chip pd-chip-warning"}
                        style={isFailed ? { color: "#b91c1c", background: "#fef2f2", border: "1px solid #fca5a5" } : undefined}
                      >
                        {isPaid ? (
                          <><CheckCircle size={11} /> Ödendi</>
                        ) : isFailed ? (
                          <><XCircle size={11} /> Başarısız</>
                        ) : (
                          <><Clock size={11} /> Beklemede</>
                        )}
                      </span>
                      {purchase.status === "PENDING" && purchase.paymentLink && (
                        <a
                          href={purchase.paymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pd-btn pd-btn-accent pd-btn-sm"
                        >
                          Ödemeye Git <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>

                  {purchase.events.length > 0 && (
                    <div
                      style={{
                        borderTop: "1px solid var(--pd-line)",
                        background: "var(--pd-bg-subtle)",
                        padding: "12px 20px",
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                        Ödeme Geçmişi
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {purchase.events.map((event) => (
                          <div key={event.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pd-muted-2)", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "var(--pd-ink-2)", fontWeight: 500 }}>
                              {event.eventType.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--pd-muted)" }}>
                              {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(event.createdAt))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
