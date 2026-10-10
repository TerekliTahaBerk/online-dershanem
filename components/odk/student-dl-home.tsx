import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session";
import { loadOdkStudentHome } from "@/lib/odk/student-dashboard-server";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  EmptyState,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  PropertyList,
  PropertyRow,
  Section,
  Sparkline,
  StatusBadge,
  buttonClass,
} from "@/components/panel/ui";

/**
 * DENEME LİGİ · ÖĞRENCİ BUGÜN (docs/panel-design-roadmap.md §11.1).
 * Beş soruya cevap verir: sıradaki deneme ne, ne zaman, ne durumda; son
 * sonuçlarım; gelişimim (yalnız kendi geçmişi — sıralama/lig görseli yok);
 * odak konularım. Sonuç verisi yalnız `resultAvailable` (sözleşme + yayın)
 * olan denemelerden okunur.
 */

const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});
const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });
const NET = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function StudentDenemeLigiHome({ session }: { session: SessionUser }) {
  // Okuma `lib/odk/student-dashboard-server.ts`'te; mobil uç (`/api/odk/student/home`) aynı yükleyiciyi kullanır.
  const { next, results, latest, trend, trendFamily, focus, now } = await loadOdkStudentHome(session.userId);

  const nextLine = (() => {
    if (!next) return null;
    if (next.state.key === "IN_PROGRESS") {
      const deadline = next.exam.attempts[0]?.deadlineAt;
      const minutes = deadline ? Math.max(0, Math.round((deadline.getTime() - now.getTime()) / 60000)) : null;
      return minutes != null ? `Devam ediyor — ${minutes} dk kaldı` : "Devam ediyor";
    }
    if (next.state.key === "AVAILABLE") return "Şimdi başlayabilirsin";
    return next.exam.startsAt ? `${DATE_TIME.format(next.exam.startsAt)}'da açılır` : "Saat bekleniyor";
  })();

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" pageTitle="Bugün">
      <div className="max-w-[920px]">
        <PageHeader
          title="Bugün"
          description="Sıradaki denemen, sonuçların ve şimdi odaklanman gereken konular burada."
          actions={
            <Link href="/panel/odk/ogrenci/denemeler" className={buttonClass("secondary", "md")}>
              Tüm denemeler
            </Link>
          }
        />

        <Section id="siradaki-deneme" title={next?.state.key === "IN_PROGRESS" ? "Devam eden deneme" : "Sıradaki deneme"} divider={false}>
          {next ? (
            <div className="flex flex-col gap-4 rounded-md border border-pn-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="rounded-[4px] bg-pn-accent-soft px-1.5 py-0.5 text-[11.5px] font-semibold text-pn-accent">
                    {next.exam.family}
                  </span>
                  <StatusBadge label={next.state.label} tone={next.state.tone} live={next.state.key === "AVAILABLE"} />
                </p>
                <p className="mt-1.5 text-[17px] font-semibold text-pn-text">{next.exam.title}</p>
                <p className="mt-0.5 text-[13.5px] text-pn-text-secondary">
                  {nextLine}
                  {next.exam.currentVersion?.durationMinutes ? ` · ${next.exam.currentVersion.durationMinutes} dakika` : ""}
                </p>
              </div>
              <Link href={next.state.href} className={buttonClass("primary", "md", "shrink-0")}>
                {next.state.key === "IN_PROGRESS" ? "Devam et" : "Denemeye git"}
              </Link>
            </div>
          ) : (
            <EmptyState title="Şimdilik planlanmış bir denemen yok." body="Yeni bir deneme açıldığında ilk burada göreceksin." />
          )}
        </Section>

        <Section
          id="son-sonuclar"
          title="Son sonuçlar"
          actions={
            results.length > 3 ? (
              <Link href="/panel/odk/ogrenci/denemeler?gorunum=tamamlanan" className={buttonClass("ghost", "sm")}>
                Tümü
              </Link>
            ) : undefined
          }
        >
          {results.length ? (
            <PanelTable caption="Son sonuçlar" columns={["Deneme", "Tarih", "Net", "Değişim", ""]}>
              {results.slice(0, 3).map((row) => (
                <PanelTableRow key={row.examId}>
                  <PanelTableCell>
                    <span className="font-medium text-pn-text">{row.title}</span>
                    <span className="ml-2 text-[12px] text-pn-text-muted">{row.family}</span>
                  </PanelTableCell>
                  <PanelTableCell>{DAY.format(row.at)}</PanelTableCell>
                  <PanelTableCell>
                    <span className="font-mono tabular-nums">{NET.format(row.net)}</span>
                  </PanelTableCell>
                  <PanelTableCell>
                    {row.delta == null ? (
                      "—"
                    ) : (
                      <span className={`tabular-nums ${row.delta >= 0 ? "text-(--pn-tone-success)" : "text-(--pn-tone-warning)"}`}>
                        {row.delta >= 0 ? "+" : "−"}
                        {NET.format(Math.abs(row.delta))}
                      </span>
                    )}
                  </PanelTableCell>
                  <PanelTableCell>
                    <Link href={`/panel/odk/ogrenci/denemeler/${row.examId}/sonuc`} className={buttonClass("ghost", "sm")}>
                      Sonuç<span className="sr-only"> · {row.title}</span>
                    </Link>
                  </PanelTableCell>
                </PanelTableRow>
              ))}
            </PanelTable>
          ) : (
            <p className="text-[14px] text-pn-text-muted">Açıklanan sonuç olduğunda burada görünecek.</p>
          )}
        </Section>

        {trend.length >= 2 ? (
          <Section id="gelisim" title="Gelişimim" description="Seni yalnızca kendinle, önceki denemelerinle karşılaştırıyoruz.">
            <div className="flex flex-wrap items-center gap-4">
              <Sparkline
                values={trend.map((row) => row.net)}
                label={`${trendFamily} toplam net: ${trend.map((row) => NET.format(row.net)).join(", ")}`}
              />
              <p className="text-[14px] text-pn-text">
                {trendFamily} netin {NET.format(trend[0].net)} → {NET.format(trend[trend.length - 1].net)}
                <span className="text-pn-text-muted"> · son {trend.length} deneme</span>
              </p>
            </div>
          </Section>
        ) : null}

        {focus.length && latest ? (
          <Section
            id="odak"
            title="Odak konular"
            description={`${latest.title} sonucuna göre biraz daha çalışırsan en çok fark yaratacak konular.`}
            actions={
              <Link href={`/panel/odk/ogrenci/denemeler/${latest.examId}/sonuc`} className={buttonClass("ghost", "sm")}>
                Sonraki adımlar
              </Link>
            }
          >
            <PropertyList>
              {focus.map((item) => (
                <PropertyRow key={item.outcome.code} label={item.outcome.code}>
                  {item.outcome.title}
                  <span className="text-pn-text-muted"> · %{Number(item.accuracyRate).toFixed(0)} doğruluk · {item.questionCount} soru</span>
                </PropertyRow>
              ))}
            </PropertyList>
          </Section>
        ) : null}
      </div>
    </PanelShell>
  );
}
