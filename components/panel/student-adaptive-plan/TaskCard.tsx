"use client";

/** Tek bir adaptif plan görevinin durum ve tamamlanma formunu render eder. */
import { CalendarDays, Check } from "lucide-react";
import { completionFieldsForKind } from "@/lib/kocum/plan-tasks";
import { taskStatusLabel } from "@/lib/student-plan-view";
import { dayHeading, fieldLabel, sourceLabels } from "./constants";
import { buttonClass } from "@/components/panel/primitives";
import type { TaskCardProps } from "./types";

export function TaskCard(props: TaskCardProps) {
  const {
    task,
    canComplete,
    highlighted,
    onStart,
    onOpenComplete,
    draft,
    onDraftChange,
    onSubmitComplete,
    onCancelComplete,
    busy,
  } = props;
  const done = task.status === "DONE" || task.status === "PARTIAL";
  const fields = completionFieldsForKind(task.taskKind || "CUSTOM");
  const plannedVsActual =
    task.actualMinutes != null || task.actualQuestions != null ? (
      <p className="mt-1 text-[12.5px] text-pn-text-muted">
        Planlanan
        {task.targetType === "QUESTIONS" && task.targetValue
          ? ` · ${task.targetValue} soru`
          : ""}
        {task.durationMinutes > 0 ? ` · ${task.durationMinutes} dk` : ""}
        {" · "}
        Gerçekleşen
        {task.actualQuestions != null ? ` · ${task.actualQuestions} soru` : ""}
        {task.actualMinutes != null ? ` · ${task.actualMinutes} dk` : ""}
      </p>
    ) : null;

  return (
    <article
      className={`rounded-md ${highlighted ? "border border-pn-accent-marker p-3" : ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-pn-text-muted">
            <CalendarDays size={13} />
            <span>{dayHeading.format(new Date(task.scheduledFor))}</span>
            {task.durationMinutes > 0 ? (
              <span>· {task.durationMinutes} dk</span>
            ) : null}
            {task.targetType === "QUESTIONS" && task.targetValue ? (
              <span>· {task.targetValue} soru</span>
            ) : null}
            <span>· {sourceLabels[task.sourceType]}</span>
            <span>· {taskStatusLabel(task.status)}</span>
          </p>
          <h3
            className="mt-1 text-[15px] font-semibold text-pn-text"
          >
            {task.title}
          </h3>
          {plannedVsActual}
        </div>
        {canComplete &&
        task.status !== "DONE" &&
        task.status !== "SKIPPED" &&
        !draft ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {task.status === "PLANNED" ? (
              <button
                type="button"
                onClick={() => onStart(task)}
                className={buttonClass("secondary", "sm")}
                aria-label="Göreve başla"
              >
                Başladım
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onOpenComplete(task, "DONE")}
              className={buttonClass("primary", "sm")}
              aria-label="Görevi tamamla"
            >
              <Check size={14} /> Tamamla
            </button>
            <button
              type="button"
              onClick={() => onOpenComplete(task, "PARTIAL")}
              className={buttonClass("secondary", "sm")}
              aria-label="Kısmen tamamla"
            >
              Kısmen
            </button>
            <button
              type="button"
              onClick={() => onOpenComplete(task, "COULD_NOT")}
              className={buttonClass("secondary", "sm")}
              aria-label="Yapamadım"
            >
              Yapamadım
            </button>
          </div>
        ) : done ? (
          <span className="shrink-0 text-[12.5px] font-medium text-(--pn-tone-success)">
            Tamamlandı
          </span>
        ) : null}
      </div>

      {draft ? (
        <form
          className="mt-4 space-y-3 border-t border-pn-border pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitComplete(task);
          }}
        >
          <p className="text-[13.5px] font-semibold text-pn-text">
            {draft.status === "DONE"
              ? "Tamamlama bilgisi"
              : draft.status === "PARTIAL"
                ? "Kısmi tamamlama"
                : "Yapamadım — kısa not"}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((field) =>
              field === "studentNote" ? (
                <label key={field} className="sm:col-span-2">
                  <span className="panel-label">{fieldLabel(field)}</span>
                  <textarea
                    className="panel-input mt-1 min-h-[64px]"
                    value={draft.studentNote}
                    onChange={(e) =>
                      onDraftChange({ ...draft, studentNote: e.target.value })
                    }
                  />
                </label>
              ) : (
                <label key={field}>
                  <span className="panel-label">{fieldLabel(field)}</span>
                  <input
                    type="number"
                    min={
                      field === "difficultyFelt" || field === "energyFelt"
                        ? 1
                        : 0
                    }
                    max={
                      field === "difficultyFelt" || field === "energyFelt"
                        ? 5
                        : 720
                    }
                    className="panel-input mt-1"
                    value={draft[field]}
                    onChange={(e) =>
                      onDraftChange({ ...draft, [field]: e.target.value })
                    }
                  />
                </label>
              ),
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className={buttonClass("primary", "md")}
            >
              Kaydet
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onCancelComplete}
              className={buttonClass("ghost", "md")}
            >
              Vazgeç
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
