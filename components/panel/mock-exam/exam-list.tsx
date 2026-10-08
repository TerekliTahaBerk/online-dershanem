import type { UserRole } from "@prisma/client";
import { Section } from "@/components/panel/ui";
import { sectionNet } from "@/lib/mock-exams";
import { ReasonEditor } from "./reason-editor";
import type { MockExamView } from "./types";

function totals(exam: MockExamView) {
  return exam.sections.reduce(
    (sum, section) => ({
      net:
        sum.net +
        sectionNet(exam.exam, section.correctCount, section.incorrectCount),
      correct: sum.correct + section.correctCount,
      incorrect: sum.incorrect + section.incorrectCount,
      blank: sum.blank + section.blankCount,
    }),
    { net: 0, correct: 0, incorrect: 0, blank: 0 },
  );
}

/** "Son denemeler" listesi; neden düzenleme yalnız öğrenci veya inceleyici için. */
export function ExamList({
  exams,
  role,
  canReview,
  onSectionsSaved,
}: {
  exams: MockExamView[];
  role: UserRole;
  canReview: boolean;
  onSectionsSaved: (examId: string, sections: MockExamView["sections"]) => void;
}) {
  return (
    <Section title="Son denemeler">
      <div className="grid gap-3 md:grid-cols-2">
        {exams.map((exam) => {
          const sum = totals(exam);
          return (
            <article
              key={exam.id}
              className="rounded-lg border border-pn-border bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[12px] font-semibold text-pn-accent">
                    {exam.exam} ·{" "}
                    {new Intl.DateTimeFormat("tr-TR").format(
                      new Date(exam.takenAt),
                    )}
                  </span>
                  <h3 className="mt-1 text-[14px] font-semibold text-pn-text">
                    {exam.title || "Adsız deneme"}
                    {exam.publisher ? ` · ${exam.publisher}` : ""}
                  </h3>
                </div>
                <span className="whitespace-nowrap rounded-md bg-pn-accent-soft px-2 py-1 text-[12.5px] font-semibold text-pn-accent">
                  {sum.net.toLocaleString("tr-TR")} net
                </span>
              </div>
              <p className="mt-3 text-[12.5px] text-pn-text-muted">
                {sum.correct} doğru · {sum.incorrect} yanlış · {sum.blank} boş
                {exam.durationMinutes ? ` · ${exam.durationMinutes} dk` : ""}
              </p>
              {exam.nextAction ? (
                <p className="mt-3 rounded-md bg-(--pn-tone-success-soft) p-3 text-[12.5px] font-medium leading-5 text-(--pn-tone-success)">
                  Öğretmen onaylı adım: {exam.nextAction}
                </p>
              ) : null}
              {role === "STUDENT" || canReview ? (
                <ReasonEditor
                  exam={exam}
                  onSaved={(sections) => onSectionsSaved(exam.id, sections)}
                />
              ) : null}
            </article>
          );
        })}
        {!exams.length ? (
          <p className="text-[13px] text-pn-text-muted">
            Henüz deneme kaydı yok.
          </p>
        ) : null}
      </div>
    </Section>
  );
}
