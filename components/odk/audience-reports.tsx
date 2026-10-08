import Link from "next/link";
import {
  EmptyState,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  PropertyList,
  PropertyRow,
  Section,
} from "@/components/panel/ui";
import { WEAK_ACCURACY, netChange, previousComparable, reportSummarySentences } from "@/lib/odk/parent-report";

type Student = { userId: string; name: string; context: string };
type Report = {
  student: { userId: string; name: string };
  exams: Array<{
    id: string;
    title: string;
    family: string;
    takenAt: Date;
    correctCount: number;
    wrongCount: number;
    blankCount: number;
    totalNet: number;
    integrityNotice?: string | null;
  }>;
  trends: Array<{
    outcomeId: string;
    code: string;
    title: string;
    unitName: string;
    latestAccuracy: number;
    previousAccuracy: number | null;
    delta: number | null;
    evidenceCount: number;
    questionCount: number;
  }>;
};
const date = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" });
const net = (value: number) => value.toFixed(2);

function trendLabel(delta: number | null) {
  if (delta === null) return "İlk ölçüm";
  if (delta >= 10) return `+${delta.toFixed(0)} puan`;
  if (delta <= -10) return `${delta.toFixed(0)} puan`;
  return "Benzer düzey";
}

/**
 * DENEME LİGİ SONUÇ RAPORU — sade düzen (docs/panel-design-roadmap.md §11.7).
 * Veli, öğretmen ve yönetimin ayrıntılı görünümü: öğrenci bağlamı başlıkta,
 * son açıklanan sonuç (net, D/Y/B, kendi önceki denemesine göre değişim),
 * düz dil özet, deneme geçmişi ve kazanım eğilimleri tabloları. Görünürlük
 * kuralları rapor sunucusundadır; burada sıralama ya da başka öğrenciyle
 * karşılaştırma yapılmaz.
 */
export function OdkAudienceReports({
  role,
  basePath,
  students,
  selectedUserId,
  report,
}: {
  role: "ADMIN" | "TEACHER" | "PARENT";
  basePath: string;
  students: Student[];
  selectedUserId: string | null;
  report: Report | null;
}) {
  const pair = report ? previousComparable(report.exams) : null;
  const latest = pair ? report!.exams.find((exam) => exam.id === pair.latest.id)! : null;
  const change = pair ? netChange(pair.latest, pair.previous) : null;
  const summary = report ? reportSummarySentences(report.exams, report.trends) : [];
  const selected = students.find((student) => student.userId === selectedUserId) ?? null;
  const others = students.filter((student) => student.userId !== selectedUserId);
  const weakCount = report?.trends.filter((trend) => trend.latestAccuracy < WEAK_ACCURACY).length ?? 0;

  return (
    <>
      <PageHeader
        title={role === "PARENT" ? "Deneme raporu" : "Öğrenci deneme raporu"}
        description="Sonuçlar yalnız yayınlandıktan sonra görünür. Eğilimler öğrencinin kendi önceki ölçümüyle karşılaştırılır; sıralama yapılmaz."
        metadata={
          selected ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-pn-text-secondary">
              <span>
                Öğrenci: <strong className="font-semibold text-pn-text">{selected.name}</strong>
                {selected.context ? <span className="text-pn-text-muted"> · {selected.context}</span> : null}
              </span>
              {others.length ? (
                <nav aria-label="Öğrenci seçimi" className="flex flex-wrap items-center gap-1">
                  <span aria-hidden="true" className="text-pn-text-muted">
                    ·
                  </span>
                  {others.map((student) => (
                    <Link
                      key={student.userId}
                      href={`${basePath}?ogrenci=${encodeURIComponent(student.userId)}`}
                      className="rounded px-1.5 py-0.5 underline-offset-2 hover:bg-pn-hover hover:text-pn-text hover:underline"
                    >
                      {student.name}
                      <span className="sr-only"> öğrencisine geç</span>
                    </Link>
                  ))}
                </nav>
              ) : null}
            </span>
          ) : undefined
        }
      />

      {!students.length ? (
        <EmptyState
          className="mt-6"
          title={
            role === "ADMIN"
              ? "Henüz denemeye katılmış öğrenci yok."
              : role === "TEACHER"
                ? "Aktif grubunuza bağlı öğrenci bulunmuyor."
                : "Henüz bağlı öğrenciniz bulunmuyor."
          }
          body="Açıklanmış sonuç oluştuğunda rapor otomatik güncellenir."
        />
      ) : !report || !latest ? (
        <EmptyState
          className="mt-6"
          title="Açıklanmış sonuç henüz yok."
          body="Öğrenci denemeyi tamamlayıp sonuç açıklandığında rapor burada oluşur."
        />
      ) : (
        <>
          <Section title="Son açıklanan deneme" divider={false}>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <p className="text-[15px] font-semibold text-pn-text">
                {latest.title}
                <span className="ml-2 text-[13px] font-normal text-pn-text-muted">
                  {latest.family} · {date.format(latest.takenAt)}
                </span>
              </p>
              <p className="tabular-nums text-pn-text-secondary">
                <strong className="text-[26px] font-semibold text-pn-text">{net(latest.totalNet)}</strong> net
              </p>
            </div>
            <PropertyList className="mt-3">
              <PropertyRow label="Doğru · yanlış · boş">
                {latest.correctCount} · {latest.wrongCount} · {latest.blankCount}
              </PropertyRow>
              <PropertyRow label="Kendi önceki denemesine göre">
                {change === null ? "İlk deneme" : `${change > 0 ? "+" : ""}${net(change)} net`}
              </PropertyRow>
              {latest.integrityNotice ? <PropertyRow label="Not">{latest.integrityNotice}</PropertyRow> : null}
            </PropertyList>
            {summary.length ? (
              <div className="mt-4 space-y-1 text-[14.5px] leading-[1.65] text-pn-text" aria-label="Kısa özet">
                {summary.map((sentence) => (
                  <p key={sentence}>{sentence}</p>
                ))}
              </div>
            ) : null}
          </Section>

          <Section title="Deneme geçmişi">
            <PanelTable caption="Deneme geçmişi" columns={["Deneme", "Tür", "Tarih", "Net", "D · Y · B"]}>
              {[...report.exams].reverse().map((exam) => (
                <PanelTableRow key={exam.id}>
                  <PanelTableCell>
                    <span className="font-medium text-pn-text">{exam.title}</span>
                    {exam.integrityNotice ? <span className="block text-[12.5px] text-pn-text-muted">{exam.integrityNotice}</span> : null}
                  </PanelTableCell>
                  <PanelTableCell>{exam.family}</PanelTableCell>
                  <PanelTableCell>
                    <span className="tabular-nums">{date.format(exam.takenAt)}</span>
                  </PanelTableCell>
                  <PanelTableCell>
                    <span className="tabular-nums">{net(exam.totalNet)}</span>
                  </PanelTableCell>
                  <PanelTableCell>
                    <span className="tabular-nums">
                      {exam.correctCount} · {exam.wrongCount} · {exam.blankCount}
                    </span>
                  </PanelTableCell>
                </PanelTableRow>
              ))}
            </PanelTable>
          </Section>

          <Section
            title="Kazanım eğilimleri"
            description={`Yüzde, bağlı sorulardaki doğru oranıdır; az sorulu ölçümlerde yeni kanıt bekleyin.${weakCount ? ` ${weakCount} kazanım %${WEAK_ACCURACY} altında.` : ""}`}
          >
            {report.trends.length ? (
              <PanelTable caption="Kazanım eğilimleri" columns={["Kazanım", "Son doğruluk", "Değişim", "Kanıt"]}>
                {report.trends.map((trend) => (
                  <PanelTableRow key={trend.outcomeId}>
                    <PanelTableCell>
                      <span className="text-pn-text">{trend.title}</span>
                      <span className="block text-[12.5px] text-pn-text-muted">
                        {trend.code} · {trend.unitName}
                      </span>
                    </PanelTableCell>
                    <PanelTableCell tone={trend.latestAccuracy < WEAK_ACCURACY ? "warn" : "default"}>
                      <span className="tabular-nums">%{trend.latestAccuracy.toFixed(0)}</span>
                    </PanelTableCell>
                    <PanelTableCell>{trendLabel(trend.delta)}</PanelTableCell>
                    <PanelTableCell>
                      <span className="tabular-nums">
                        {trend.evidenceCount} deneme · {trend.questionCount} soru
                      </span>
                      {trend.questionCount < 3 ? <span className="block text-[12.5px] text-pn-text-muted">Yeni kanıt gerekli</span> : null}
                    </PanelTableCell>
                  </PanelTableRow>
                ))}
              </PanelTable>
            ) : (
              <p className="text-[14px] text-pn-text-muted">Kazanım verisi bulunmuyor.</p>
            )}
            <p className="mt-4 text-[13px] text-pn-text-muted">
              Tek bir denemeyi kesin yargı olarak kullanmayın; tekrarlayan kazanım kanıtı ve öğrencinin kendi eğilimi daha anlamlıdır.
            </p>
          </Section>
        </>
      )}
    </>
  );
}
