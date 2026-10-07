import type { CoachExamSummary } from "@/lib/kocum/coach-workspace";

const NET = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

/** Son deneme toplam neti ve önceki denemeye göre değişim (renk tek başına anlam taşımaz). */
export function ExamCell({ exam }: { exam: CoachExamSummary | undefined }) {
  if (!exam) return <span className="text-pn-text-muted">—</span>;
  return (
    <span className="tabular-nums">
      {NET.format(exam.net)} net
      {exam.delta !== null ? (
        <span className={exam.delta >= 0 ? "text-(--pn-tone-success)" : "text-(--pn-tone-warning)"}>
          {" "}
          {exam.delta >= 0 ? "▲" : "▼"} {NET.format(Math.abs(exam.delta))}
          <span className="sr-only">{exam.delta >= 0 ? " artış" : " düşüş"}</span>
        </span>
      ) : null}
    </span>
  );
}
