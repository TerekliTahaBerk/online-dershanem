"use client";

import { UsersRound } from "lucide-react";
import { OutcomePicker, type OutcomeOption } from "@/components/panel/outcome-picker";
import { PanelTable, PanelTableCell, PanelTableRow } from "@/components/panel/panel-table";
import { EmptyState, LABEL_CLASS, Section, buttonClass, inputClass } from "@/components/panel/ui";
import { ATTENDANCE_OPTIONS, type OutcomeSkipReason } from "./types";
import type { LessonCloseState } from "./use-lesson-close";

/** DERS — işlenen konu, yoklama tablosu (istisnalar) ve kazanımlar. */
export function LessonLessonTab({ state, outcomes }: { state: LessonCloseState; outcomes: OutcomeOption[] }) {
  const { form, flags } = state;
  const showTable = !flags.quickLessonCloseEnabled || state.showStudentExceptions || state.exceptionCount > 0;
  return (
    <>
      <Section title="Konu" divider={false}>
        <label className="block">
          <span className={LABEL_CLASS}>Bugün ne işlediniz?</span>
          <input
            value={form.topic}
            onChange={(event) => state.patchSharedForm({ topic: event.target.value })}
            className={inputClass("mt-1.5 text-[15px] font-semibold")}
            placeholder="Örn. Üslü ifadelerde dört işlem"
          />
        </label>
      </Section>

      <Section
        title="Yoklama"
        description={
          flags.quickLessonCloseEnabled ? `${state.exceptionCount} istisna · diğerleri burada` : "Sadece farklıysa not ekleyin"
        }
        actions={
          <span className="inline-flex items-center gap-2">
            <span className="text-[13px] tabular-nums text-pn-text-secondary">
              {form.students.length}/{form.students.length}
            </span>
            {flags.quickLessonCloseEnabled ? (
              <>
                <button type="button" onClick={state.markEveryonePresent} className={buttonClass("secondary", "sm")}>
                  <UsersRound size={14} aria-hidden="true" /> Tümü burada
                </button>
                <button
                  type="button"
                  onClick={() => state.setShowStudentExceptions((current) => !current)}
                  className={buttonClass("secondary", "sm")}
                >
                  {state.showStudentExceptions ? "İstisnaları gizle" : "İstisna ekle"}
                </button>
              </>
            ) : null}
          </span>
        }
      >
        {showTable ? (
          <PanelTable caption="Yoklama ve öğrenciye özel notlar" columns={["Öğrenci", "Yoklama", "Özel not"]}>
            {form.students.map((student) => (
              <PanelTableRow key={student.id}>
                <PanelTableCell>
                  <span className="font-semibold text-pn-text">{student.name}</span>
                  {student.supportLabels.length ? (
                    <ul aria-label={`${student.name} işlevsel destekleri`} className="mt-1 flex flex-wrap gap-1">
                      {student.supportLabels.map((label) => (
                        <li
                          key={label}
                          className="rounded-full bg-(--pn-tone-info-soft) px-2 py-0.5 text-[11px] font-semibold text-(--pn-tone-info)"
                        >
                          {label}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </PanelTableCell>
                <PanelTableCell>
                  <div className="grid min-w-[240px] grid-cols-4 gap-1 rounded-md bg-pn-surface-subtle p-1">
                    {ATTENDANCE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-label={`${student.name}: ${option.label}`}
                        aria-pressed={student.attendance === option.value}
                        onClick={() => state.patchStudent(student.id, { attendance: option.value })}
                        className={`min-h-10 rounded px-1 text-[12.5px] font-semibold transition-colors ${
                          student.attendance === option.value ? option.active : "text-pn-text-secondary hover:bg-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </PanelTableCell>
                <PanelTableCell>
                  <textarea
                    aria-label={`${student.name} için özel not`}
                    value={student.note}
                    onChange={(event) => state.patchStudent(student.id, { note: event.target.value })}
                    className={inputClass("min-h-16 min-w-[200px] resize-y text-[13px]")}
                    placeholder="Farklı bir durum yoksa boş bırakın…"
                  />
                </PanelTableCell>
              </PanelTableRow>
            ))}
          </PanelTable>
        ) : (
          <EmptyState
            title="Grup varsayımı hazır"
            body="Farklı bir durum yoksa öğrenci satırlarını açmanız gerekmez."
          />
        )}
      </Section>

      {flags.learningOutcomesEnabled ? (
        <Section title="Kazanımlar">
          <OutcomePicker outcomes={outcomes} value={form.outcomeLinks} onChange={state.setOutcomeLinks} withEvidence />
          {!form.outcomeLinks.length ? (
            <label className="mt-4 block">
              <span className={LABEL_CLASS}>Kazanım seçmeden devam etme nedeni</span>
              <select
                value={form.outcomeSkipReason || ""}
                onChange={(event) => state.setOutcomeSkipReason((event.target.value || null) as OutcomeSkipReason)}
                className={inputClass("mt-1.5")}
                aria-label="Kazanım erteleme nedeni"
              >
                <option value="">Dersi tamamlamadan önce seçin</option>
                <option value="COMPLETE_LATER">Sonra tamamlayacağım</option>
                <option value="CATALOG_MISSING">Katalogda uygun kazanım yok</option>
                <option value="NOT_APPLICABLE">Bu ders için uygulanabilir değil</option>
              </select>
            </label>
          ) : null}
        </Section>
      ) : null}
    </>
  );
}
