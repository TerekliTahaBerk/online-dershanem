"use client";

import { useMemo, useState } from "react";
import { CalendarDays, GripVertical } from "lucide-react";
import { addIstanbulCalendarDays, formatIstanbulDateInput, istanbulWeekStart } from "@/lib/istanbul-time";

type CoachTask = {
  id: string;
  title: string;
  scheduledFor: string;
  durationMinutes: number;
  status: string;
  subject?: string | null;
  sourceType: string;
};

type Props = {
  planId: string;
  planVersion: number;
  weekStartIso: string;
  studentId: string;
  studentName: string;
  tasks: CoachTask[];
};

const dayFmt = new Intl.DateTimeFormat("tr-TR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Istanbul",
});

/**
 * Desktop drag & drop + erişilebilir "Tarihi Değiştir" alternatifi.
 */
export function CoachWeekCalendar({
  planId,
  planVersion,
  weekStartIso,
  studentId,
  studentName,
  tasks: initial,
}: Props) {
  const [tasks, setTasks] = useState(initial);
  const [version, setVersion] = useState(planVersion);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dateDraft, setDateDraft] = useState<Record<string, string>>({});

  const weekStart = useMemo(() => istanbulWeekStart(new Date(weekStartIso)), [weekStartIso]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addIstanbulCalendarDays(weekStart, i)),
    [weekStart],
  );

  async function reschedule(taskId: string, scheduledFor: Date) {
    setBusyId(taskId);
    const response = await fetch(`/api/panel/kocum/tasks/${taskId}/reschedule`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scheduledFor: scheduledFor.toISOString(),
        expectedPlanVersion: version,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setBusyId(null);
    if (!response.ok) {
      setMessage(body.error || "Tarih değiştirilemedi.");
      return;
    }
    setVersion(body.version ?? version + 1);
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, scheduledFor: body.scheduledFor || scheduledFor.toISOString() } : task,
      ),
    );
    setMessage("Görev tarihi güncellendi.");
  }

  function onDrop(day: Date, taskId: string) {
    void reschedule(taskId, day);
  }

  return (
    <section className="panel-surface p-5 sm:p-6" aria-labelledby={`coach-cal-${planId}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.07em] text-[var(--brand-olive)]">
            Koç takvimi
          </p>
          <h2 id={`coach-cal-${planId}`} className="mt-1 text-lg font-extrabold">
            {studentName}
          </h2>
          <p className="mt-1 text-xs text-[var(--site-muted)]">
            Sürükleyerek taşıyın veya her görevde Tarihi Değiştir kullanın.
          </p>
        </div>
        <a
          className="panel-quick-action"
          href={`/panel/ogretmen/ogrenci/${studentId}?tab=kocluk`}
        >
          Öğrenci 360
        </a>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-7">
        {days.map((day) => {
          const key = formatIstanbulDateInput(day);
          const dayTasks = tasks.filter((task) => formatIstanbulDateInput(new Date(task.scheduledFor)) === key);
          return (
            <div
              key={key}
              className="min-h-[140px] rounded-xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-2"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = event.dataTransfer.getData("text/task-id");
                if (taskId) onDrop(day, taskId);
              }}
            >
              <p className="flex items-center gap-1 text-[10px] font-extrabold text-[var(--site-muted)]">
                <CalendarDays size={12} />
                {dayFmt.format(day)}
              </p>
              <ul className="mt-2 space-y-2">
                {dayTasks.map((task) => (
                  <li
                    key={task.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/task-id", task.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    className="rounded-lg border border-[var(--site-line)] bg-white p-2 text-xs shadow-sm"
                  >
                    <p className="flex items-start gap-1 font-extrabold">
                      <GripVertical size={12} className="mt-0.5 shrink-0 text-[var(--site-muted)]" aria-hidden />
                      <span>{task.title}</span>
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--site-muted)]">
                      {task.durationMinutes} dk · {task.status}
                    </p>
                    <label className="mt-2 block">
                      <span className="sr-only">Tarihi Değiştir</span>
                      <input
                        type="date"
                        className="panel-input text-[11px]"
                        value={dateDraft[task.id] ?? key}
                        disabled={busyId === task.id}
                        onChange={(event) =>
                          setDateDraft((current) => ({ ...current, [task.id]: event.target.value }))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="panel-quick-action mt-1 w-full text-[10px]"
                      disabled={busyId === task.id}
                      onClick={() => {
                        const value = dateDraft[task.id] ?? key;
                        void reschedule(task.id, new Date(`${value}T12:00:00+03:00`));
                      }}
                    >
                      Tarihi Değiştir
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p aria-live="polite" className="mt-3 text-xs font-bold text-[var(--brand-olive)]">
        {message}
      </p>
    </section>
  );
}
