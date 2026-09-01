import { PanelStatCard } from "@/components/panel/ui";
import type { BehavioralInsights } from "@/lib/progress-insights/types";

/**
 * Davranışsal gidişat — katılım / çalışma / plan.
 * Denominator 0 ise kart basılmaz (uydurma yüzde yok).
 */
export function BehavioralBlock({
  behavioral,
  attendanceNote,
}: {
  behavioral: BehavioralInsights;
  attendanceNote?: string;
}) {
  const cards: Array<{
    key: string;
    title: string;
    value: string;
    progressPct?: number;
    note: string;
  }> = [];

  if (behavioral.attendance.denominator > 0 && behavioral.attendance.percent !== null) {
    cards.push({
      key: "attendance",
      title: "Ders katılımı",
      value: `${behavioral.attendance.numerator} / ${behavioral.attendance.denominator}`,
      note:
        attendanceNote ??
        `Son ${behavioral.attendance.denominator} ders · %${behavioral.attendance.percent}`,
    });
  }

  if (behavioral.assignments.denominator > 0 && behavioral.assignments.percent !== null) {
    cards.push({
      key: "assignments",
      title: "Çalışma tamamlama",
      value: `%${behavioral.assignments.percent}`,
      progressPct: behavioral.assignments.percent,
      note: `${behavioral.assignments.numerator} / ${behavioral.assignments.denominator} çalışma`,
    });
  }

  if (behavioral.plan.denominator > 0 && behavioral.plan.percent !== null) {
    cards.push({
      key: "plan",
      title: "Plan tamamlama",
      value: `%${behavioral.plan.percent}`,
      progressPct: behavioral.plan.percent,
      note: `${behavioral.plan.numerator} / ${behavioral.plan.denominator} görev`,
    });
  }

  if (!cards.length) return null;

  return (
    <section className="mt-6" aria-labelledby="analiz-davranis-baslik">
      <h2 id="analiz-davranis-baslik" className="text-[15px] font-extrabold text-dc-ink">
        Davranışsal gidişat
      </h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <PanelStatCard
            key={card.key}
            title={card.title}
            value={card.value}
            progressPct={card.progressPct}
            note={card.note}
          />
        ))}
      </div>
    </section>
  );
}
