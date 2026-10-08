import type { MockExamErrorCategory } from "@prisma/client";
import { CheckCircle2 } from "lucide-react";
import { buttonClass } from "@/components/panel/ui";
import {
  mockExamErrorLabels,
  type summarizeMockExamTrend,
} from "@/lib/mock-exams";
import type { MockExamView } from "./types";

type MockExamTrend = ReturnType<typeof summarizeMockExamTrend>;

function heatClass(count: number) {
  return count >= 3
    ? "bg-amber-200 text-amber-950"
    : count === 2
      ? "bg-amber-100 text-amber-900"
      : count === 1
        ? "bg-pn-accent-soft text-pn-accent"
        : "bg-slate-50 text-slate-400";
}

/** Kişisel hata eğilimi ısı tablosu + tek "sonraki küçük eylem" önerisi. */
export function ExamAnalysis({
  trend,
  latestExam,
  canReview,
  onApprove,
  first = false,
}: {
  trend: MockExamTrend;
  /** Görünen listedeki en yeni deneme; onay bu kayda yazılır. */
  latestExam: MockExamView | undefined;
  canReview: boolean;
  onApprove: (examId: string, action: string) => void;
  /** Sayfadaki ilk bölümse üst ayraç çizilmez. */
  first?: boolean;
}) {
  const recurring = trend.recurringError;
  return (
    <section
      className={`grid gap-8 xl:grid-cols-[1.15fr_.85fr] ${first ? "" : "mt-8 border-t border-pn-border pt-6"}`}
    >
      <article className="min-w-0">
        <h2 className="text-[15px] font-semibold leading-[22px] text-pn-text">
          Kişisel hata eğilimi
        </h2>
        <p className="mt-0.5 text-[13px] leading-5 text-pn-text-muted">
          Sonuçlar yalnız öğrencinin kendi denemeleriyle karşılaştırılır.
        </p>
        <div
          className="mt-4 overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Kişisel hata eğilimi tablosu"
        >
          <table className="w-full min-w-[620px] text-[13px]">
            <thead>
              <tr>
                <th className="pb-2 text-left text-[12px] font-medium text-pn-text-muted">
                  Bölüm
                </th>
                {Object.values(mockExamErrorLabels).map((label) => (
                  <th
                    key={label}
                    className="px-2 pb-2 text-center text-[11px] font-medium text-pn-text-muted"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trend.heatmap.map((row) => (
                <tr key={row.key} className="border-t border-pn-border">
                  <th className="py-3 text-left font-medium text-pn-text">
                    {row.subject}
                  </th>
                  {Object.keys(mockExamErrorLabels).map((category) => {
                    const count =
                      row.categories[category as MockExamErrorCategory];
                    return (
                      <td key={category} className="px-2 text-center">
                        <span
                          className={`inline-grid h-8 w-8 place-items-center rounded-md font-semibold ${heatClass(count)}`}
                        >
                          {count}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!trend.heatmap.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-pn-text-muted"
                  >
                    İlk deneme kaydedildiğinde eğilim oluşacak.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
      <article className="min-w-0">
        <h2 className="text-[15px] font-semibold leading-[22px] text-pn-text">
          Sonraki küçük eylem
        </h2>
        {recurring ? (
          <div className="mt-4 rounded-md bg-(--pn-tone-warning-soft) p-4">
            <p className="text-[12px] font-semibold text-(--pn-tone-warning)">
              {mockExamErrorLabels[recurring.category]} · son 3 denemede{" "}
              {recurring.count} işaret
            </p>
            <p className="mt-2 text-[13px] font-medium leading-5 text-pn-text">
              {recurring.action}
            </p>
            {canReview && latestExam && !latestExam.nextAction ? (
              <button
                type="button"
                onClick={() => onApprove(latestExam.id, recurring.action)}
                className={buttonClass("primary", "sm", "mt-3")}
              >
                <CheckCircle2 size={13} aria-hidden /> Öğretmen olarak onayla
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 rounded-md bg-pn-surface-subtle p-4 text-[13px] text-pn-text-muted">
            Tekrarlayan bir neden oluştuğunda burada yalnız bir uygulanabilir
            adım gösterilecek.
          </p>
        )}
      </article>
    </section>
  );
}
