import { NetTrendCard } from "@/components/panel/student/home-cards";
import { SubjectTrendCard } from "@/components/panel/student/subject-trend";
import { PanelEmpty } from "@/components/panel/ui";
import { GidisatStrengthSupport } from "@/components/panel/analiz/gidisat-hero";
import type { AcademicInsights } from "@/lib/progress-insights/types";

/**
 * Akademik gidişat bloğu — toplam net + ders serileri + güçlü/destek.
 * Veri yoksa uydurma sayı göstermez.
 */
export function AcademicBlock({
  academic,
  emptyTitle = "Grafik için en az iki deneme gerekiyor.",
  emptyBody = "İkinci deneme sonucu girildiğinde gelişim eğrisi burada açılır.",
  showStrengthSupport = true,
}: {
  academic: AcademicInsights;
  emptyTitle?: string;
  emptyBody?: string;
  showStrengthSupport?: boolean;
}) {
  const hasTrend = academic.netTrend.length >= 2;
  const hasSubjects = academic.subjectSeries.length > 0 && academic.labels.length >= 2;

  if (!hasTrend && !hasSubjects && academic.examCount === 0) {
    return (
      <div className="mt-6">
        <PanelEmpty title={emptyTitle} body={emptyBody} />
      </div>
    );
  }

  const caption =
    academic.netTrend.length >= 2
      ? `Toplam net ${academic.netTrend[0]!.net.toLocaleString("tr-TR")} → ${academic.netTrend[academic.netTrend.length - 1]!.net.toLocaleString("tr-TR")}.`
      : undefined;

  return (
    <section className="mt-6" aria-labelledby="analiz-akademik-baslik">
      <h2 id="analiz-akademik-baslik" className="text-[15px] font-extrabold text-dc-ink">
        Akademik gidişat
      </h2>

      {hasTrend && caption ? (
        <NetTrendCard points={academic.netTrend} caption={caption} />
      ) : academic.examCount > 0 ? (
        <div className="mt-4">
          <PanelEmpty title={emptyTitle} body={emptyBody} />
        </div>
      ) : null}

      {hasSubjects ? (
        <SubjectTrendCard
          series={academic.subjectSeries}
          labels={academic.labels}
          caption={academic.subjectCaption}
        />
      ) : null}

      {showStrengthSupport ? (
        <GidisatStrengthSupport
          strengths={academic.strengths}
          supports={academic.supportAreas}
        />
      ) : null}
    </section>
  );
}
