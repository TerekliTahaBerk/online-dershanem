import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Package, BookOpen, Clock, LockKeyhole } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PanelPaketlerPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const student = await prisma.student.findFirst({
    where: { userId: session.user.id },
    select: {
      packages: {
        where: { revokedAt: null },
        orderBy: { assignedAt: "desc" },
        select: {
          assignedAt: true,
          expiresAt: true,
          package: {
            select: {
              id: true,
              name: true,
              description: true,
              lessonCount: true,
              subjects: true,
              // price is intentionally excluded — never sent to students
            },
          },
        },
      },
    },
  });

  if (!student) redirect("/panel");

  const now = new Date();
  const assignments = student.packages.map((sp) => ({
    ...sp.package,
    assignedAt: sp.assignedAt,
    expiresAt: sp.expiresAt,
    isExpired: sp.expiresAt ? sp.expiresAt < now : false,
  }));

  const activeAssignments = assignments.filter((a) => !a.isExpired);
  const expiredAssignments = assignments.filter((a) => a.isExpired);

  function formatExpiry(d: Date) {
    return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  }

  function daysLeft(d: Date) {
    return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  }

  function PackageCard({ pkg, expired = false }: { pkg: typeof assignments[0]; expired?: boolean }) {
    const subjects = pkg.subjects.split(",").map((s) => s.trim()).filter(Boolean);
    const left = pkg.expiresAt && !expired ? daysLeft(pkg.expiresAt) : null;
    const urgentColor = left !== null && left <= 7 ? "var(--pd-error, #dc2626)" : "var(--pd-accent)";

    return (
      <div
        className="pd-card"
        style={{
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          opacity: expired ? 0.6 : 1,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {expired && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <LockKeyhole size={24} style={{ color: "var(--pd-muted-2)" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--pd-ink-2)" }}>Süresi Doldu</span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: expired ? "var(--pd-bg-elevated)" : "var(--pd-accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BookOpen size={18} style={{ color: expired ? "var(--pd-muted-2)" : "var(--pd-accent)" }} />
          </div>
          <span className="pd-chip" style={{ fontSize: 11 }}>{pkg.lessonCount} ders</span>
        </div>

        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--pd-ink)" }}>{pkg.name}</div>
          {pkg.description && (
            <div style={{ fontSize: 13, color: "var(--pd-muted)", marginTop: 4, lineHeight: 1.5 }}>{pkg.description}</div>
          )}
        </div>

        {subjects.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {subjects.map((s) => (
              <span key={s} className="pd-chip pd-chip-accent" style={{ fontSize: 11 }}>{s}</span>
            ))}
          </div>
        )}

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--pd-line)" }}>
          {pkg.expiresAt ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={13} style={{ color: expired ? "var(--pd-muted-2)" : urgentColor, flexShrink: 0 }} />
              {expired ? (
                <span style={{ fontSize: 12, color: "var(--pd-muted)" }}>
                  {formatExpiry(pkg.expiresAt)} tarihinde sona erdi
                </span>
              ) : (
                <span style={{ fontSize: 12, color: urgentColor, fontWeight: left !== null && left <= 7 ? 600 : 400 }}>
                  {formatExpiry(pkg.expiresAt)} tarihine kadar geçerli
                  {left !== null && left <= 30 && ` · ${left} gün kaldı`}
                </span>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={13} style={{ color: "var(--pd-accent)" }} />
              <span style={{ fontSize: 12, color: "var(--pd-accent)", fontWeight: 500 }}>Süresiz</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pd-page-header">
        <h1 className="pd-page-title">Paketlerim</h1>
        <p className="pd-page-sub">{activeAssignments.length} aktif paket</p>
      </div>

      <div className="pd-page-body" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {assignments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--pd-bg-elevated)", border: "1px solid var(--pd-line)", borderRadius: 16 }}>
            <Package size={32} style={{ color: "var(--pd-muted-2)", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--pd-ink-2)" }}>Henüz paketiniz yok</p>
            <p style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 4 }}>Paket bilgisi için danışmanınızla iletişime geçin.</p>
          </div>
        ) : (
          <>
            {activeAssignments.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--pd-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Aktif Paketler</p>
                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {activeAssignments.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)}
                </div>
              </div>
            )}
            {expiredAssignments.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--pd-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Süresi Dolanlar</p>
                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {expiredAssignments.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} expired />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
