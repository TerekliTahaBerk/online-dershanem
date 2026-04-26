import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BadgeCheck, ExternalLink, Tent, Users } from "lucide-react";

export const dynamic = "force-dynamic";

type CategoryTab = "TUMU" | "AYT" | "TYT" | "LGS";

const categoryLabels: Record<string, string> = {
  AYT: "AYT Matematik",
  TYT: "TYT Matematik",
  LGS: "LGS",
};

const categoryChipStyle: Record<string, { background: string; color: string }> = {
  AYT: { background: "#dbeafe", color: "#1d4ed8" },
  TYT: { background: "#ede9fe", color: "#7c3aed" },
  LGS: { background: "#ffedd5", color: "#c2410c" },
};

const sharedFeatures = [
  "8 Kişilik Sınıf Yapısı",
  "Haftalık Detaylı PDF Materyali",
  "Konu Bazlı Mini Deneme Uygulaması",
  "Soru Çözüm Seansı ve Çözüm Notları",
  "Düzenli Eksik Analizi ve Tekrar Planı",
];

function formatPrice(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

const tabs: { label: string; value: CategoryTab }[] = [
  { label: "Tümü", value: "TUMU" },
  { label: "AYT Matematik", value: "AYT" },
  { label: "TYT Matematik", value: "TYT" },
  { label: "LGS", value: "LGS" },
];

export default async function PanelKamplarPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const params = await searchParams;
  const kategori = (params.kategori?.toUpperCase() as CategoryTab) || "TUMU";

  const camps = await prisma.camp.findMany({
    where: {
      isActive: true,
      ...(kategori !== "TUMU" ? { category: kategori as "AYT" | "TYT" | "LGS" } : {}),
    },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <div className="pd-page-header">
        <h1 className="pd-page-title">Kamplar</h1>
        <p className="pd-page-sub">Açık kamp programlarını inceleyip size uygun olanı seçin.</p>
      </div>

      <div className="pd-page-body">
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--pd-bg-subtle)", padding: 4, borderRadius: 12, width: "fit-content", marginBottom: 20 }}>
          {tabs.map((tab) => (
            <a
              key={tab.value}
              href={`/panel/kamplar${tab.value === "TUMU" ? "" : `?kategori=${tab.value}`}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                background: kategori === tab.value ? "var(--pd-bg-elevated)" : "transparent",
                color: kategori === tab.value ? "var(--pd-ink)" : "var(--pd-muted)",
                boxShadow: kategori === tab.value ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 120ms ease",
              }}
            >
              {tab.label}
            </a>
          ))}
        </div>

        {camps.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 24px",
              background: "var(--pd-bg-elevated)",
              border: "1px solid var(--pd-line)",
              borderRadius: 16,
            }}
          >
            <Tent size={32} style={{ color: "var(--pd-muted-2)", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--pd-ink-2)" }}>Bu kategoride açık kamp görünmüyor</p>
            <p style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 4 }}>Yeni kamp açıldığında burada yayınlanacak.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {camps.map((camp) => {
              const chipStyle = categoryChipStyle[camp.category] ?? { background: "var(--pd-bg-subtle)", color: "var(--pd-muted)" };
              return (
                <div key={camp.id} className="pd-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          ...chipStyle,
                        }}
                      >
                        {categoryLabels[camp.category]}
                      </span>
                      <span className="pd-chip" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Users size={10} /> Max {camp.quota} Öğrenci
                      </span>
                    </div>

                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--pd-ink)", lineHeight: 1.4 }}>{camp.name}</div>
                    <p style={{ fontSize: 13, color: "var(--pd-muted)", lineHeight: 1.55, flex: 1 }}>{camp.detail}</p>

                    <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {sharedFeatures.map((f) => (
                        <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--pd-muted)" }}>
                          <BadgeCheck size={13} style={{ color: "var(--pd-accent)", marginTop: 1, flexShrink: 0 }} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div
                      style={{
                        borderRadius: 10,
                        border: "1px solid var(--pd-line)",
                        background: "var(--pd-bg-subtle)",
                        padding: "10px 14px",
                      }}
                    >
                      {camp.originalPrice > camp.price && (
                        <div style={{ fontSize: 12, color: "var(--pd-muted-2)", textDecoration: "line-through" }}>
                          {formatPrice(camp.originalPrice)}
                        </div>
                      )}
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--pd-ink)" }}>{formatPrice(camp.price)}</div>
                      {camp.startDate && (
                        <div style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 4 }}>
                          Başlangıç:{" "}
                          {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(camp.startDate)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: "0 20px 20px" }}>
                    {camp.paytrLink ? (
                      <a
                        href={camp.paytrLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pd-btn pd-btn-accent"
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        <ExternalLink size={14} /> Kayıt Ol
                      </a>
                    ) : (
                      <div
                        style={{
                          background: "var(--pd-bg-subtle)",
                          border: "1px solid var(--pd-line)",
                          borderRadius: 10,
                          padding: "10px 16px",
                          textAlign: "center",
                          fontSize: 13,
                          color: "var(--pd-muted)",
                          fontWeight: 500,
                        }}
                      >
                        Başvuru Yakında Açılacak
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Calendar */}
        <div className="pd-card" style={{ marginTop: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--pd-line)" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--pd-ink)" }}>Kamp Takvimi</div>
            <div style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 2 }}>Kamplar en geç 1 Mayıs tarihinde başlar.</div>
          </div>
          <div style={{ padding: 0 }}>
            <iframe
              src="https://calendar.google.com/calendar/embed?src=c7e9bc8f3695d608c263a450c1402dba131bc20a71b86ece44737de9115d9772%40group.calendar.google.com&ctz=Europe%2FIstanbul"
              style={{ border: 0, display: "block" }}
              width="100%"
              height="500"
              frameBorder="0"
              scrolling="no"
              title="Kamplar Takvimi"
            />
          </div>
        </div>
      </div>
    </>
  );
}
