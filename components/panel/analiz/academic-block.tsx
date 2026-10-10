import { NetTrendCard } from "@/components/panel/student/home-cards";
import { SubjectTrendCard } from "@/components/panel/student/subject-trend";
import { EmptyState, Section } from "@/components/panel/ui";
import { GidisatStrengthSupport } from "@/components/panel/analiz/gidisat-hero";
import type { AcademicInsights } from "@/lib/progress-insights/types";

/**
 * Akademik gidişat bloğu — toplam net + ders serileri + güçlü/destek.
 * Veri yoksa uydurma sayı göstermez.
 */
export function AcademicBlock({
  academic,
  emptyTitle = "Eğilim için en az iki deneme sonucu gerekiyor.",
  emptyBody = "İkinci deneme sonucu girildiğinde gelişim eğrisi burada oluşur.",
  showStrengthSupport = true,
}: {
  academic: AcademicInsights;
  emptyTitle?: string;
  emptyBody?: string;
  showStrengthSupport?: boolean;
}) {
  const hasTrend = academic.netTrend.length >= 2;
  const hasSubjects =
    academic.subjectSeries.length > 0 && academic.labels.length >= 2;

  if (!hasTrend && !hasSubjects && academic.examCount === 0) {
    return (
      <Section id="analiz-akademik" title="Akademik gidişat">
        <EmptyState title={emptyTitle} body={emptyBody} />
      </Section>
    );
  }

  const caption =
    academic.netTrend.length >= 2
      ? `Toplam net ${academic.netTrend[0]!.net.toLocaleString("tr-TR")} → ${academic.netTrend[academic.netTrend.length - 1]!.net.toLocaleString("tr-TR")}.`
      : undefined;

  return (
    <Section id="analiz-akademik" title="Akademik gidişat">
      {hasTrend && caption ? (
        <NetTrendCard points={academic.netTrend} caption={caption} />
      ) : academic.examCount > 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
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
    </Section>
  );
}
