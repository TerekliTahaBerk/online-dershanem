import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Package, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

function formatPrice(kurus: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(
    kurus / 100
  );
}

export default async function PanelPaketlerPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      student: {
        include: {
          packages: {
            include: { package: true },
            orderBy: { assignedAt: "desc" },
          },
        },
      },
    },
  });

  if (!user?.student) redirect("/panel");

  const assignedPackages = user.student.packages.map((sp) => sp.package);

  return (
    <>
      <div className="pd-page-header">
        <h1 className="pd-page-title">Paketlerim</h1>
        <p className="pd-page-sub">Size tanımlanmış paketler</p>
      </div>

      <div className="pd-page-body">
        {assignedPackages.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 24px",
              background: "var(--pd-bg-elevated)",
              border: "1px solid var(--pd-line)",
              borderRadius: 16,
            }}
          >
            <Package size={32} style={{ color: "var(--pd-muted-2)", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--pd-ink-2)" }}>Henüz paketiniz yok</p>
            <p style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 4 }}>
              Paket bilgisi için danışmanınızla iletişime geçin.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {assignedPackages.map((pkg) => {
              const subjects = pkg.subjects.split(",").map((s: string) => s.trim()).filter(Boolean);
              return (
                <div key={pkg.id} className="pd-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "var(--pd-accent-soft)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <BookOpen size={18} style={{ color: "var(--pd-accent)" }} />
                    </div>
                    <span
                      className="pd-chip"
                      style={{ fontSize: 11 }}
                    >
                      {pkg.lessonCount} ders
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--pd-ink)" }}>{pkg.name}</div>
                    {pkg.description && (
                      <div style={{ fontSize: 13, color: "var(--pd-muted)", marginTop: 4, lineHeight: 1.5 }}>
                        {pkg.description}
                      </div>
                    )}
                  </div>

                  {subjects.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {subjects.map((s: string) => (
                        <span key={s} className="pd-chip pd-chip-accent" style={{ fontSize: 11 }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: 16,
                      borderTop: "1px solid var(--pd-line)",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--pd-ink)",
                    }}
                  >
                    {formatPrice(pkg.price)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
