"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, CheckCircle2, CircleAlert, ClipboardPlus } from "lucide-react";
import type { OutcomeOption } from "@/components/panel/outcome-picker";
import { buttonClass } from "@/components/panel/ui";
import { cn } from "@/lib/utils/cn";
import { LessonCloseTab } from "./close-tab";
import { LessonLessonTab } from "./lesson-tab";
import { LessonPrepTab } from "./prep-tab";
import { LESSON_TABS, type LessonData, type LessonTab } from "./types";
import { useLessonClose, type SaveState } from "./use-lesson-close";

function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex min-w-[118px] items-center gap-1.5 text-[12.5px] font-semibold",
        state === "error" ? "text-(--pn-tone-critical)" : "text-pn-text-secondary",
      )}
    >
      {state === "saving" ? (
        <>
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-(--pn-tone-warning) motion-safe:animate-pulse" />
          Kaydediliyor
        </>
      ) : null}
      {state === "saved" ? (
        <>
          <Check size={14} aria-hidden="true" className="text-(--pn-tone-success)" />
          Kaydedildi
        </>
      ) : null}
      {state === "error" ? (
        <>
          <CircleAlert size={14} aria-hidden="true" />
          Tekrar deneyin
        </>
      ) : null}
      {state === "idle" ? "Otomatik kayıt açık" : null}
    </span>
  );
}

/**
 * EĞİTMEN · DERS ALANI (docs/panel-design-roadmap.md §9, Design Phase 8).
 *
 * Hazırlık / Ders / Kapanış sekmeleri tek bir kapanış durumunu paylaşır
 * (`useLessonClose`); sekme değişince form kaybolmaz (paneller bağlı kalır,
 * yalnız gizlenir). Kapanış çubuğu her sekmede görünür: ders tek işlemle
 * kapanır. Seçili sekme `?sekme=` ile paylaşılabilir; değişim sunucuya
 * gitmez (`history.replaceState`).
 */
export function TeacherLessonWorkspace({
  lesson,
  initialTab = "ders",
  baselineMetricsEnabled,
  learningOutcomesEnabled,
  quickLessonCloseEnabled,
  outcomes,
}: {
  lesson: LessonData;
  initialTab?: LessonTab;
  baselineMetricsEnabled: boolean;
  learningOutcomesEnabled: boolean;
  quickLessonCloseEnabled: boolean;
  outcomes: OutcomeOption[];
}) {
  const state = useLessonClose(lesson, { baselineMetricsEnabled, learningOutcomesEnabled, quickLessonCloseEnabled });
  const [tab, setTab] = useState<LessonTab>(initialTab);
  const tabRefs = useRef<Record<LessonTab, HTMLButtonElement | null>>({ hazirlik: null, ders: null, kapanis: null });
  const baseId = useId();

  function selectTab(next: LessonTab, focus = false) {
    setTab(next);
    if (focus) tabRefs.current[next]?.focus();
    const url = new URL(window.location.href);
    url.searchParams.set("sekme", next);
    window.history.replaceState(window.history.state, "", url);
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = LESSON_TABS.findIndex((item) => item.id === tab);
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (event.key === "Home") return (event.preventDefault(), selectTab(LESSON_TABS[0].id, true));
    if (event.key === "End") return (event.preventDefault(), selectTab(LESSON_TABS[LESSON_TABS.length - 1].id, true));
    if (!step) return;
    event.preventDefault();
    selectTab(LESSON_TABS[(index + step + LESSON_TABS.length) % LESSON_TABS.length].id, true);
  }

  const { completed, saveState, assignmentPreview, assignmentRecipients } = state;
  const closeDisabled =
    completed || saveState === "saving" || Boolean(quickLessonCloseEnabled && assignmentPreview && !assignmentRecipients.length);

  return (
    <div>
      <div role="tablist" aria-label="Ders alanı bölümleri" className="-mb-px flex gap-1 overflow-x-auto border-b border-pn-border">
        {LESSON_TABS.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={active}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => selectTab(item.id)}
              onKeyDown={onTabKeyDown}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-[13.5px] font-medium transition-colors",
                active ? "border-pn-text text-pn-text" : "border-transparent text-pn-text-secondary hover:text-pn-text",
              )}
            >
              {item.label}
              {item.id === "ders" && quickLessonCloseEnabled && state.exceptionCount ? (
                <span className="ml-1.5 text-[12px] tabular-nums text-pn-text-muted">{state.exceptionCount}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {LESSON_TABS.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== tab}
          className="pt-2"
        >
          {item.id === "hazirlik" ? <LessonPrepTab state={state} onPreviousGoalApplied={() => selectTab("ders")} /> : null}
          {item.id === "ders" ? <LessonLessonTab state={state} outcomes={outcomes} /> : null}
          {item.id === "kapanis" ? <LessonCloseTab state={state} /> : null}
        </div>
      ))}

      {/* Kapanış çubuğu: her sekmede görünür, ekranın altına yapışır. */}
      <div className="sticky bottom-0 z-10 mt-8 border-t border-pn-border bg-white/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <SaveIndicator state={saveState} />
            <p aria-live="polite" className="mt-0.5 text-[13px] text-pn-text-secondary">
              {state.actionMessage ||
                (completed
                  ? "Bu ders tamamlandı."
                  : "Notlar taslak olarak kaydolur; hazır olduğunuzda tek işlemle kapatın.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (!quickLessonCloseEnabled) return void state.createAssignment();
                if (state.toggleAssignmentPreview() && !assignmentPreview) selectTab("kapanis");
              }}
              className={buttonClass("secondary", "md")}
            >
              <ClipboardPlus size={14} aria-hidden="true" />{" "}
              {quickLessonCloseEnabled ? (assignmentPreview ? "Ödevi çıkar" : "Ödev taslağını önizle") : "Ödeve dönüştür"}
            </button>
            <button type="button" disabled={closeDisabled} onClick={state.close} className={buttonClass("primary", "md")}>
              <CheckCircle2 size={14} aria-hidden="true" />{" "}
              {completed ? "Ders tamamlandı" : quickLessonCloseEnabled ? "Dersi güvenle kapat" : "Dersi tamamla"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
