"use client";

import { Sparkles } from "lucide-react";
import { EmptyState, PropertyList, PropertyRow, Section } from "@/components/panel/ui";
import type { LessonCloseState } from "./use-lesson-close";

/** HAZIRLIK — önceki dersin bağlamı, akıllı öneri ve kapanış varsayımları. */
export function LessonPrepTab({ state, onPreviousGoalApplied }: { state: LessonCloseState; onPreviousGoalApplied: () => void }) {
  const { form, flags } = state;
  const previous = form.previousContext;
  return (
    <>
      <Section title="Önceki ders" divider={false}>
        {previous ? (
          <PropertyList>
            <PropertyRow label="Konu">{previous.topic || "—"}</PropertyRow>
            <PropertyRow label="Hedef">{previous.nextGoal || "—"}</PropertyRow>
            <PropertyRow label="Çalışma">{previous.homework || "—"}</PropertyRow>
          </PropertyList>
        ) : (
          <EmptyState title="İlk ders; önceki hedef yok." body="Bu grubun tamamlanmış bir önceki dersi bulunmuyor." />
        )}
        {form.previousGoal ? (
          <button
            type="button"
            onClick={() => {
              state.applyPreviousGoal();
              onPreviousGoalApplied();
            }}
            className="mt-4 flex w-full items-start gap-3 rounded-[10px] border border-pn-border bg-pn-surface-subtle p-3.5 text-left transition-colors hover:bg-pn-hover"
          >
            <Sparkles size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-pn-accent" />
            <span>
              <span className="block text-[13px] font-semibold text-pn-text">Geçen dersten akıllı öneri</span>
              <span className="mt-0.5 block text-[13.5px] leading-6 text-pn-text-secondary">{form.previousGoal}</span>
            </span>
          </button>
        ) : null}
      </Section>

      {flags.quickLessonCloseEnabled ? (
        <Section title="Kapanış varsayımları" description="Yalnız farklı olanı düzenleyin; geri kalanı varsayılanla kaydolur.">
          <PropertyList>
            <PropertyRow label="Grup varsayımı">Herkes burada</PropertyRow>
            <PropertyRow label="Önceki bağlam">{previous?.nextGoal || "İlk ders; önceki hedef yok"}</PropertyRow>
            <PropertyRow label="Çalışma biçimi">Yalnız farklı olanı düzenleyin</PropertyRow>
          </PropertyList>
        </Section>
      ) : null}
    </>
  );
}
