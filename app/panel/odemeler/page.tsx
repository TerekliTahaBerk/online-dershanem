import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckCircle, Clock, CreditCard, ExternalLink, Receipt, XCircle } from "lucide-react";
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
        packageEnrollments: {
          include: {
            package: {
              include: {
                packageCourses: true;
              };
            };
          };
        };
      };
    };
  };
}>;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
}

function formatPrice(kurus?: number | null) {
  if (!kurus) return "—";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(kurus / 100);
}

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
          packageEnrollments: {
            include: {
              package: {
                include: { packageCourses: true },
              },
            },
            orderBy: { startsAt: "desc" },
          },
        },
      },
    },
  }) as unknown as UserWithStudent | null;

  const student = user?.student;
  if (!student) redirect("/panel");

  const purchases = student.purchaseIntents as unknown as PurchaseWithEvents[];
  const enrollments = student.packageEnrollments;
  const paidCount = purchases.filter((purchase) => purchase.status === "PAID").length;
  const pendingCount = purchases.filter((purchase) => purchase.status === "PENDING").length;
  const activeEnrollment = enrollments.find((enrollment) => enrollment.status === "ACTIVE") ?? null;

  return (
    <>
      <div className="pd-page-header">
        <h1 className="pd-page-title">Ödemelerim</h1>
        <p className="pd-page-sub">
          {purchases.length} kayıt · {paidCount} ödendi · {pendingCount} beklemede · {enrollments.length} üyelik
        </p>
      </div>

      <div className="pd-page-body">
        <div className="pd-kpi-grid" style={{ marginBottom: 20 }}>
          {[
            { label: "Toplam Kayıt", value: purchases.length.toString(), tone: "sky" },
            { label: "Ödendi", value: paidCount.toString(), tone: "mint" },
            { label: "Beklemede", value: pendingCount.toString(), tone: "yellow" },
            { label: "Aktif Üyelik", value: activeEnrollment ? "1" : "0", tone: "lavender" },
          ].map((kpi) => (
            <div key={kpi.label} className={`pd-kpi-card tone-${kpi.tone}`}>
              <div className="pd-kpi-label">{kpi.label}</div>
              <div className="pd-kpi-value">{kpi.value}</div>
            </div>
          ))}
        </div>

        <div className="pd-card" style={{ marginBottom: 16 }}>
          <div className="pd-card-head">
            <div>
              <div className="pd-card-title">Paket Üyeliklerim</div>
              <div className="pd-card-sub">Yeni üyelik modeli üzerinden izleniyor</div>
            </div>
          </div>
          <div className="pd-card-body">
            {enrollments.length === 0 ? (
              <div className="pd-empty-inline tone-lavender">Henüz aktif üyelik görünmüyor.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {enrollments.map((enrollment) => (
                  <div key={enrollment.id} style={{ border: "1px solid var(--pd-line)", borderRadius: 14, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--pd-ink)" }}>{enrollment.package.name}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "var(--pd-muted)" }}>
                          Başlangıç: {formatDate(enrollment.startsAt)}
                          {enrollment.endsAt ? ` · Bitiş: ${formatDate(enrollment.endsAt)}` : ""}
                        </div>
                        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span className={enrollment.status === "ACTIVE" ? "pd-chip pd-chip-accent" : "pd-chip"}>
                            {enrollment.status}
                          </span>
                          <span className="pd-chip">{enrollment.package.packageCourses.length} kurs</span>
                          {enrollment.billingPeriodLabel ? <span className="pd-chip">{enrollment.billingPeriodLabel}</span> : null}
                          {enrollment.autoRenew ? <span className="pd-chip">Otomatik yenileme</span> : null}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 600, color: "var(--pd-ink)" }}>
                          {formatPrice(enrollment.listPrice)}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--pd-muted)" }}>
                          {enrollment.discountAmount ? `${formatPrice(enrollment.discountAmount)} indirim` : "Standart fiyat"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {purchases.length === 0 ? (
          <div className="pd-empty tone-blush">
            <div className="pd-empty-icon">
              <CreditCard size={20} />
            </div>
            <div className="pd-empty-title">Henüz ödeme hareketiniz yok</div>
            <div className="pd-empty-desc">Satın alma detaylarınız burada yer alacak.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {purchases.map((purchase) => {
              const isPaid = purchase.status === "PAID";
              const isFailed = purchase.status === "FAILED";
              return (
                <div key={purchase.id} className="pd-card" style={{ overflow: "hidden" }}>
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
                          {formatDate(purchase.submittedAt)}
                          {purchase.source ? ` · ${purchase.source}` : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span
                        className={isPaid ? "pd-chip pd-chip-accent" : isFailed ? "pd-chip pd-chip-danger" : "pd-chip pd-chip-warning"}
                      >
                        {isPaid ? (
                          <><CheckCircle size={11} /> Ödendi</>
                        ) : isFailed ? (
                          <><XCircle size={11} /> Başarısız</>
                        ) : (
                          <><Clock size={11} /> Beklemede</>
                        )}
                      </span>
                      {purchase.status === "PENDING" && purchase.paymentLink ? (
                        <a
                          href={purchase.paymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pd-btn pd-btn-accent pd-btn-sm"
                        >
                          Ödemeye Git <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {purchase.events.length > 0 ? (
                    <div style={{ borderTop: "1px solid var(--pd-line)", background: "var(--pd-bg-subtle)", padding: "12px 20px" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                        Ödeme Geçmişi
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {purchase.events.map((event) => (
                          <div key={event.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pd-muted-2)", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "var(--pd-ink-2)", fontWeight: 500 }}>
                              {event.eventType.replace(/_/g, " ").toLowerCase().replace(/^\w/, (char) => char.toUpperCase())}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--pd-muted)" }}>
                              {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(event.createdAt))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
