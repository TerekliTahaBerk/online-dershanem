import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelHeading, PanelCard, PanelCardTitle } from "@/components/panel/ui";
import { istanbulDayStart, istanbulNextDayStart } from "@/lib/istanbul-time";

export const dynamic = "force-dynamic";

/**
 * ADMIN · BUGÜNÜN OPERASYONU — onaylı tasarım (Panel.dc.html → scAdminHome).
 *
 * Tasarımın işlev tanımı: en üstte "Dikkat gerekenler" (kırmızı/sarı noktalı
 * istisna listesi, her satırda tek aksiyon), altında "Bugün" operasyon
 * sayaçları ve "Eğitmen kapasitesi".
 *
 * §26: SAĞLIKLI SİSTEM AZ YER KAPLAR. Bu yüzden istisna listesi ilk sırada ve
 * yalnız GERÇEK sinyal varken satır üretir; sorun yoksa tek satırlık sakin bir
 * durum gösterilir. Widget duvarı kurulmaz.
 *
 * Tasarımdaki "ürün dağılımı" grafiği kendi üzerinde "tasarım örnek verisi"
 * etiketi taşıyor; uydurma veri yayınlanmayacağı için (§54) o blok gerçek
 * sayımla değiştirildi.
 */

const TIME = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

type Alert = {
  id: string;
  severity: "high" | "medium";
  text: string;
  action?: { label: string; href: string };
};

export default async function AdminHomePage() {
  const session = await requireRole("ADMIN");

  const now = new Date();
  const dayStart = istanbulDayStart(now);
  const dayEnd = istanbulNextDayStart(now);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    todayLessons,
    unnotedLessons,
    stalePlans,
    manualReviewOrders,
    paidUnprovisioned,
    odCount,
    odkCount,
    teachers,
  ] = await Promise.all([
    prisma.lesson.findMany({
      where: { startsAt: { gte: dayStart, lt: dayEnd } },
      select: { id: true, status: true, startsAt: true, group: { select: { name: true } } },
    }),
    prisma.lesson.count({
      where: { startsAt: { lt: now, gte: weekAgo }, notes: { none: { studentId: null } } },
    }),
    prisma.weeklyPlan.count({ where: { status: "DRAFT", weekStart: { lt: weekAgo } } }),
    prisma.odOrder.count({ where: { provisioningStatus: "MANUAL_REVIEW" } }),
    prisma.odOrder.count({
      where: { status: "PAID", provisioningStatus: { notIn: ["SUCCEEDED", "MANUAL_REVIEW"] } },
    }),
    prisma.productMembership.count({ where: { product: "OD", revokedAt: null } }),
    prisma.productMembership.count({ where: { product: "ODK", revokedAt: null } }),
    prisma.user.findMany({
      where: { role: "TEACHER", status: "ACTIVE" },
      select: {
        id: true,
        fullName: true,
        email: true,
        taughtGroups: {
          where: { isActive: true },
          select: { enrollments: { where: { endedAt: null }, select: { id: true } } },
        },
      },
    }),
  ]);

  const cancelledToday = todayLessons.filter((l) => l.status === "CANCELLED");

  /* ── İstisnalar — yalnız gerçek sinyal ── */
  const alerts: Alert[] = [];

  if (paidUnprovisioned > 0) {
    alerts.push({
      id: "paid-unprovisioned",
      severity: "high",
      text: `${paidUnprovisioned} siparişin ödemesi alındı, ürün erişimi henüz açılmadı.`,
      // Doğrudan "erişim sorunu" filtresine açılır; admin listeyi elle taramaz.
      action: { label: "Siparişleri aç", href: "/panel/yonetim/siparisler?filtre=sorun" },
    });
  }
  if (manualReviewOrders > 0) {
    alerts.push({
      id: "provisioning-failed",
      severity: "high",
      text: `${manualReviewOrders} sipariş erişim açma için elle inceleme bekliyor.`,
      // Doğrudan "erişim sorunu" filtresine açılır; admin listeyi elle taramaz.
      action: { label: "Siparişleri aç", href: "/panel/yonetim/siparisler?filtre=sorun" },
    });
  }
  if (cancelledToday.length > 0) {
    alerts.push({
      id: "cancelled",
      severity: "high",
      text: `Bugün ${cancelledToday.length} ders iptal edildi · ${cancelledToday
        .slice(0, 2)
        .map((l) => `${l.group.name} ${TIME.format(l.startsAt)}`)
        .join(", ")}`,
      action: { label: "Takvimi aç", href: "/panel/yonetim/takvim" },
    });
  }
  if (unnotedLessons > 0) {
    alerts.push({
      id: "unnoted",
      severity: "medium",
      text: `${unnotedLessons} tamamlanmış derse henüz ders notu girilmedi.`,
      action: { label: "Eğitimi aç", href: "/panel/yonetim/egitim" },
    });
  }
  if (stalePlans > 0) {
    alerts.push({
      id: "stale-plans",
      severity: "medium",
      text: `${stalePlans} haftalık plan bir haftadan uzun süredir taslak durumunda.`,
      action: { label: "Listeyi gör", href: "/panel/yonetim/egitim" },
    });
  }

  const capacity = teachers
    .map((t) => ({
      id: t.id,
      name: t.fullName || t.email,
      students: t.taughtGroups.reduce((sum, g) => sum + g.enrollments.length, 0),
      groups: t.taughtGroups.length,
    }))
    .filter((t) => t.groups > 0)
    .sort((a, b) => b.students - a.students)
    .slice(0, 6);

  const maxStudents = Math.max(1, ...capacity.map((c) => c.students));

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Ana Sayfa"
    >
      <div className="max-w-[1080px]">
        <PanelHeading
          title="Bugünün operasyonu"
          description={`${todayLessons.length} ders planlandı${
            alerts.length ? ` · ${alerts.length} kayıt müdahale bekliyor` : " · müdahale bekleyen kayıt yok"
          }`}
        />

        <div className="mt-6 overflow-hidden rounded-[14px] border border-dc-line bg-white">
          <h2 className="border-b border-dc-line-soft px-[22px] py-4 text-[16px] font-bold text-dc-ink">
            Dikkat gerekenler
          </h2>

          {alerts.length === 0 ? (
            <p className="px-[22px] py-5 text-[14.5px] text-dc-ink-muted">
              Müdahale bekleyen kayıt yok. Ödemeler, ders notları ve planlar beklenen
              durumda.
            </p>
          ) : (
            <ul>
              {alerts.map((alert, i) => (
                <li
                  key={alert.id}
                  className={`flex flex-wrap items-center gap-4 px-[22px] py-4 ${
                    i < alerts.length - 1 ? "border-b border-dc-line-soft" : ""
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 flex-none rounded-full"
                    style={{ background: alert.severity === "high" ? "#C2493D" : "#E0A34A" }}
                  />
                  <span className="min-w-0 flex-1 text-[14.5px] font-medium text-[var(--pd-ink-3)]">
                    <span className="sr-only">
                      {alert.severity === "high" ? "Yüksek öncelik: " : "Orta öncelik: "}
                    </span>
                    {alert.text}
                  </span>
                  {alert.action ? (
                    <Link
                      href={alert.action.href}
                      className="flex-none rounded-lg border border-[#DDE4E0] bg-white px-3.5 py-2 text-[13px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
                    >
                      {alert.action.label}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <PanelCard>
            <PanelCardTitle>Bugün</PanelCardTitle>
            <dl className="mt-3.5 flex flex-col gap-3 text-[14px] font-medium text-[var(--pd-ink-3)]">
              <div className="flex justify-between gap-3">
                <dt>Canlı ders</dt>
                <dd className="text-dc-ink-muted">
                  {todayLessons.length} planlı
                  {cancelledToday.length ? ` · ${cancelledToday.length} iptal` : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Ders notu bekleyen</dt>
                <dd className="text-dc-ink-muted">{unnotedLessons}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Taslak haftalık plan</dt>
                <dd className="text-dc-ink-muted">{stalePlans}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Erişim açma (provisioning)</dt>
                <dd className="text-dc-ink-muted">
                  {manualReviewOrders ? `${manualReviewOrders} elle inceleme` : "bekleyen yok"}
                </dd>
              </div>
            </dl>
          </PanelCard>

          <PanelCard>
            <PanelCardTitle>Eğitmen yükü</PanelCardTitle>
            {capacity.length ? (
              <>
                <ul className="mt-3.5 flex flex-col gap-3.5">
                  {capacity.map((t) => {
                    const pct = Math.round((t.students / maxStudents) * 100);
                    return (
                      <li key={t.id}>
                        <div className="flex justify-between gap-3 text-[13.5px] font-medium text-[var(--pd-ink-3)]">
                          <span className="min-w-0 truncate">{t.name}</span>
                          <span className="shrink-0 text-dc-ink-muted">
                            {t.students} öğrenci · {t.groups} grup
                          </span>
                        </div>
                        <div
                          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-dc-line-soft"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${t.name} yükü`}
                        >
                          <div
                            className="h-full rounded-full bg-dc-brand"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-[12.5px] text-dc-ink-faint">
                  Yük, aktif gruplardaki öğrenci sayısından çıkar. Kapasite eşiği tanımlı
                  değil; yeni atama öncesi dağılıma bakılmalı.
                </p>
              </>
            ) : (
              <p className="mt-3 text-[14px] text-dc-ink-muted">
                Aktif grubu olan eğitmen yok.
              </p>
            )}
          </PanelCard>
        </div>

        <PanelCard className="mt-5">
          <PanelCardTitle>Ürün erişimi · aktif üyelikler</PanelCardTitle>
          <dl className="mt-3.5 flex flex-wrap gap-9 text-[14px]">
            <div>
              <dt className="text-[13px] text-dc-ink-faint">Online Dershanem</dt>
              <dd className="mt-1 text-[24px] font-extrabold text-dc-ink">{odCount}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-dc-ink-faint">Online Deneme Kulübüm</dt>
              <dd className="mt-1 text-[24px] font-extrabold text-dc-ink">{odkCount}</dd>
            </div>
          </dl>
        </PanelCard>
      </div>
    </PanelShell>
  );
}
