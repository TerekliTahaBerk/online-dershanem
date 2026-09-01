"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, CircleAlert, ListChecks, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import {
  getLowerSafeMinutes,
  getOverloadRequest,
  type OverloadOption,
} from "@/lib/adaptive-plan-overload";
import { sendPanelEvent } from "@/lib/panel-event-client";
import {
  buildTodayFocus,
  buildWeeklyProgress,
  planStatusLabel,
  splitPlanTasks,
  taskDateKey,
  taskStatusLabel,
} from "@/lib/student-plan-view";
import {
  completionFieldsForKind,
  type CompletionField,
  type KocumTaskKind,
} from "@/lib/kocum/plan-tasks";
import { formatMinutesAsHours } from "@/lib/kocum/metrics";

/**
 * ÖĞRENCİ · TEK DOMİNANT PLAN DENEYİMİ.
 *
 * Önceki tasarımda aynı `WeeklyPlanTask` listesi hem düz bir liste hem de
 * ayrı bir 7 günlük ızgarada iki kez temsil edilme riski taşıyordu. Burada
 * her görev TAM OLARAK BİR yerde render edilir:
 *   - bugüne ait görevler yalnız "Bugünkü odak" bölümünde (primary),
 *   - diğer günlerin görevleri yalnız "Haftalık plan" listesinde (secondary).
 * Hiçbir görev iki bölümde birden basılmaz; haftalık liste bugünün
 * satırında sadece bir sayaç gösterir, tekrar detay basmaz.
 *
 * Hiyerarşi: bugünkü odak > haftalık plan + tek tamamlanma göstergesi >
 * plan değişiklik isteği (onaylı planın üstünde, akışı bastırmadan) >
 * tercihler (varsayılan kapalı, plan yokken birincil konu).
 */

type Preference = {
  availableDays: number[];
  minutesPerDay: number;
  nextExamAt: string | null;
  examLabel: string | null;
  planningEnabled: boolean;
  overwhelmPulse: number | null;
};

type Task = {
  id: string;
  title: string;
  scheduledFor: string;
  durationMinutes: number;
  taskKind?: KocumTaskKind;
  sourceType:
    | "ASSIGNMENT"
    | "REVIEW"
    | "WEAK_OUTCOME"
    | "EXAM_PREP"
    | "RECOVERY"
    | "MANUAL_COACH"
    | "MOCK_EXAM"
    | "SYSTEM_SUGGESTED"
    | "TEMPLATE"
    | "PERSONAL_GOAL";
  reasonCode: "DUE_SOON" | "REVIEW_DUE" | "NEEDS_REVIEW" | "EXAM_APPROACHING" | "CAPACITY_BALANCE" | "MISSED_LESSON";
  status: "PLANNED" | "IN_PROGRESS" | "DONE" | "PARTIAL" | "COULD_NOT" | "SKIPPED";
  actualMinutes?: number | null;
  targetType?: "QUESTIONS" | "MINUTES" | "PAGES" | "VIDEOS" | "NONE" | null;
  targetValue?: number | null;
  actualQuestions?: number | null;
  subject?: string | null;
};

type CompletionDraft = {
  status: "DONE" | "PARTIAL" | "COULD_NOT";
  actualQuestions: string;
  actualCorrect: string;
  actualIncorrect: string;
  actualBlank: string;
  actualMinutes: string;
  studentNote: string;
  difficultyFelt: string;
  energyFelt: string;
};

type UpcomingExam = {
  id: string;
  title: string;
  startsAt: string;
};

type CoachSummarySnippet = {
  studentVisibleText: string | null;
  strengths: string | null;
  focusAreas: string | null;
  nextWeekFocus: string | null;
};

type Plan = {
  id: string;
  status: "DRAFT" | "APPROVED" | "CHANGE_REQUESTED" | "ARCHIVED";
  version: number;
  capacityMinutes: number;
  changeRequestCategory: string | null;
  tasks: Task[];
};

type CoachingSnapshot = {
  coachName: string;
  nextScheduledAt: string | null;
  sharedNote: string | null;
  focus: string | null;
  overdue: boolean;
};

const days = [
  { id: 1, label: "Pzt" },
  { id: 2, label: "Sal" },
  { id: 3, label: "Çar" },
  { id: 4, label: "Per" },
  { id: 5, label: "Cum" },
  { id: 6, label: "Cmt" },
  { id: 7, label: "Paz" },
];

const sourceLabels: Record<Task["sourceType"], string> = {
  ASSIGNMENT: "Ödev",
  REVIEW: "Tekrar",
  WEAK_OUTCOME: "Konu tekrarı",
  EXAM_PREP: "Sınav hazırlığı",
  RECOVERY: "Telafi",
  MANUAL_COACH: "Koç görevi",
  MOCK_EXAM: "Deneme",
  SYSTEM_SUGGESTED: "Öneri",
  TEMPLATE: "Şablon",
  PERSONAL_GOAL: "Hedef",
};

const changeCategoryLabels: Record<string, string> = {
  TOO_MUCH: "Plan fazla yoğun",
  WRONG_DAYS: "Günler bana uymuyor",
  PRIORITY: "Öncelik doğru görünmüyor",
  OTHER: "Başka bir neden",
};
const overloadOptionLabels: Record<OverloadOption, string> = {
  REDUCE_LIGHT: "Biraz azalt",
  REDUCE_HEAVY: "Çok azalt",
  CHANGE_DAYS: "Günleri değiştirmek istiyorum",
};
function isOverloadOption(value: string): value is OverloadOption {
  return value === "REDUCE_LIGHT" || value === "REDUCE_HEAVY" || value === "CHANGE_DAYS";
}

const dayHeading = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "short" });
const dateTime = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

function emptyDraft(status: CompletionDraft["status"], task: Task): CompletionDraft {
  return {
    status,
    actualQuestions: task.targetType === "QUESTIONS" && task.targetValue ? String(task.targetValue) : "",
    actualCorrect: "",
    actualIncorrect: "",
    actualBlank: "",
    actualMinutes: task.durationMinutes > 0 ? String(task.durationMinutes) : "",
    studentNote: "",
    difficultyFelt: "",
    energyFelt: "",
  };
}

function fieldLabel(field: CompletionField): string {
  return {
    actualQuestions: "Çözülen soru",
    actualCorrect: "Doğru",
    actualIncorrect: "Yanlış",
    actualBlank: "Boş",
    actualMinutes: "Geçen süre (dk)",
    studentNote: "Notun",
    difficultyFelt: "Zorluk (1–5)",
    energyFelt: "Çalışma hissi (1–5)",
  }[field];
}

function TaskCard({
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
}: {
  task: Task;
  canComplete: boolean;
  highlighted: boolean;
  onStart: (task: Task) => void;
  onOpenComplete: (task: Task, status: CompletionDraft["status"]) => void;
  draft: CompletionDraft | null;
  onDraftChange: (next: CompletionDraft) => void;
  onSubmitComplete: (task: Task) => void;
  onCancelComplete: () => void;
  busy: boolean;
}) {
  const done = task.status === "DONE" || task.status === "PARTIAL";
  const fields = completionFieldsForKind(task.taskKind || "CUSTOM");
  const plannedVsActual =
    task.actualMinutes != null || task.actualQuestions != null ? (
      <p className="mt-1 text-xs text-[var(--site-muted)]">
        Planlanan
        {task.targetType === "QUESTIONS" && task.targetValue ? ` · ${task.targetValue} soru` : ""}
        {task.durationMinutes > 0 ? ` · ${task.durationMinutes} dk` : ""}
        {" · "}
        Gerçekleşen
        {task.actualQuestions != null ? ` · ${task.actualQuestions} soru` : ""}
        {task.actualMinutes != null ? ` · ${task.actualMinutes} dk` : ""}
      </p>
    ) : null;

  return (
    <article
      className={`rounded-2xl border p-4 ${
        done
          ? "border-emerald-200 bg-emerald-50/60"
          : highlighted
            ? "border-[var(--brand-olive)] bg-[#FBF7EC]"
            : "border-[var(--site-line)] bg-white"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[var(--site-muted)]">
            <CalendarDays size={13} />
            <span>{dayHeading.format(new Date(task.scheduledFor))}</span>
            {task.durationMinutes > 0 ? <span>· {task.durationMinutes} dk</span> : null}
            {task.targetType === "QUESTIONS" && task.targetValue ? (
              <span>· {task.targetValue} soru</span>
            ) : null}
            <span>· {sourceLabels[task.sourceType]}</span>
            <span>· {taskStatusLabel(task.status)}</span>
          </p>
          <h3 className={`mt-1 font-extrabold ${highlighted ? "text-base" : "text-sm"}`}>{task.title}</h3>
          {plannedVsActual}
        </div>
        {canComplete && task.status !== "DONE" && task.status !== "SKIPPED" && !draft ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {task.status === "PLANNED" ? (
              <button type="button" onClick={() => onStart(task)} className="panel-quick-action" aria-label="Göreve başla">
                Başladım
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onOpenComplete(task, "DONE")}
              className={`panel-quick-action ${highlighted ? "panel-quick-action-primary" : ""}`}
              aria-label="Görevi tamamla"
            >
              <Check size={14} /> Tamamla
            </button>
            <button
              type="button"
              onClick={() => onOpenComplete(task, "PARTIAL")}
              className="panel-quick-action"
              aria-label="Kısmen tamamla"
            >
              Kısmen
            </button>
            <button
              type="button"
              onClick={() => onOpenComplete(task, "COULD_NOT")}
              className="panel-quick-action"
              aria-label="Yapamadım"
            >
              Yapamadım
            </button>
          </div>
        ) : done ? (
          <span className="shrink-0 text-xs font-bold text-emerald-800">Tamamlandı</span>
        ) : null}
      </div>

      {draft ? (
        <form
          className="mt-4 space-y-3 rounded-xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitComplete(task);
          }}
        >
          <p className="text-xs font-extrabold">
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
                    onChange={(e) => onDraftChange({ ...draft, studentNote: e.target.value })}
                  />
                </label>
              ) : (
                <label key={field}>
                  <span className="panel-label">{fieldLabel(field)}</span>
                  <input
                    type="number"
                    min={field === "difficultyFelt" || field === "energyFelt" ? 1 : 0}
                    max={field === "difficultyFelt" || field === "energyFelt" ? 5 : 720}
                    className="panel-input mt-1"
                    value={draft[field]}
                    onChange={(e) => onDraftChange({ ...draft, [field]: e.target.value })}
                  />
                </label>
              ),
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="panel-quick-action panel-quick-action-primary">
              Kaydet
            </button>
            <button type="button" disabled={busy} onClick={onCancelComplete} className="panel-quick-action">
              Vazgeç
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

export function StudentAdaptivePlan({
  initialPreference,
  initialPlan,
  initialCoaching,
  initialCoachSummary,
  upcomingExams,
  today,
}: {
  initialPreference: Preference;
  initialPlan: Plan | null;
  initialCoaching: CoachingSnapshot | null;
  initialCoachSummary?: CoachSummarySnippet | null;
  upcomingExams?: UpcomingExam[];
  today: string;
}) {
  const [preference, setPreference] = useState(initialPreference);
  const [plan, setPlan] = useState(initialPlan);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [activeCompletionId, setActiveCompletionId] = useState<string | null>(null);
  const [completionDraft, setCompletionDraft] = useState<CompletionDraft | null>(null);
  const [overloadActionOpen, setOverloadActionOpen] = useState(false);
  const [overloadOption, setOverloadOption] = useState<OverloadOption>("REDUCE_LIGHT");
  // Plan yokken tercihler ANA KONUDUR (varsayılan açık); plan kurulunca
  // ikincil bir panele geçer (varsayılan kapalı).
  const [controlsOpen, setControlsOpen] = useState(!initialPlan);
  const preferencesHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (controlsOpen) preferencesHeadingRef.current?.focus();
  }, [controlsOpen]);

  useEffect(() => {
    if (plan?.status !== "APPROVED") setOverloadActionOpen(false);
  }, [plan?.status]);

  async function savePreference() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/panel/adaptive-plan/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...preference,
        nextExamAt: preference.nextExamAt ? new Date(`${preference.nextExamAt.slice(0, 10)}T12:00:00.000Z`).toISOString() : null,
        examLabel: preference.nextExamAt ? preference.examLabel || "OKUL SINAVI" : null,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    setMessage(response.ok ? "Tercihlerin kaydedildi." : body.error || "Tercihler kaydedilemedi.");
  }

  async function generate() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/panel/adaptive-plan/generate", { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(body.error || "Plan oluşturulamadı.");
    window.location.reload();
  }

  async function completeQuick(task: Task, status: "IN_PROGRESS") {
    sendPanelEvent({
      name: "plan_task_started",
      properties: {
        product: "OK",
        actionKind: "COMPLETE_PLAN_TASK",
        reasonCode: task.reasonCode,
        ageBand: "NA",
        evidenceBand: "NA",
        role: "STUDENT",
      },
    });
    const response = await fetch(`/api/panel/kocum/tasks/${task.id}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const legacy = await fetch(`/api/panel/adaptive-plan/tasks/${task.id}/complete`, { method: "POST" });
      if (!legacy.ok) return setMessage("Görev güncellenemedi.");
    }
    setPlan((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((item) => (item.id === task.id ? { ...item, status } : item)),
          }
        : current,
    );
    setMessage("Göreve başladın.");
  }

  async function submitCompletion(task: Task) {
    if (!completionDraft) return;
    setBusy(true);
    sendPanelEvent({
      name: "plan_task_started",
      properties: {
        product: "OK",
        actionKind: "COMPLETE_PLAN_TASK",
        reasonCode: task.reasonCode,
        ageBand: "NA",
        evidenceBand: "NA",
        role: "STUDENT",
      },
    });

    const toInt = (value: string) => (value.trim() === "" ? null : Number(value));
    const payload = {
      status: completionDraft.status,
      actualQuestions: toInt(completionDraft.actualQuestions),
      actualCorrect: toInt(completionDraft.actualCorrect),
      actualIncorrect: toInt(completionDraft.actualIncorrect),
      actualBlank: toInt(completionDraft.actualBlank),
      actualMinutes: toInt(completionDraft.actualMinutes),
      studentNote: completionDraft.studentNote.trim() || null,
      difficultyFelt: toInt(completionDraft.difficultyFelt),
      energyFelt: toInt(completionDraft.energyFelt),
    };

    const response = await fetch(`/api/panel/kocum/tasks/${task.id}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(body.error || "Görev güncellenemedi.");
      return;
    }

    setPlan((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((item) =>
              item.id === task.id
                ? {
                    ...item,
                    status: completionDraft.status,
                    actualMinutes: payload.actualMinutes,
                    actualQuestions: payload.actualQuestions,
                  }
                : item,
            ),
          }
        : current,
    );
    setActiveCompletionId(null);
    setCompletionDraft(null);
    setMessage(
      completionDraft.status === "DONE"
        ? "Harika — görev tamamlandı."
        : completionDraft.status === "PARTIAL"
          ? "Kısmi tamamlanma kaydedildi."
          : "Durum kaydedildi.",
    );
  }

  async function requestChange() {
    if (!plan) return;
    const overloadRequest = getOverloadRequest(overloadOption);
    setBusy(true);
    const response = await fetch(`/api/panel/adaptive-plan/${plan.id}/request-change`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category: overloadRequest.category,
        overwhelmPulse: overloadRequest.overwhelmPulse,
        option: overloadOption,
        expectedVersion: plan.version,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(body.error || "Talep iletilemedi.");
    setPreference((current) => ({ ...current, overwhelmPulse: overloadRequest.overwhelmPulse }));
    setPlan({
      ...plan,
      status: "CHANGE_REQUESTED",
      version: plan.version + 1,
      changeRequestCategory: overloadRequest.category,
    });
    setOverloadActionOpen(false);
    setMessage("Değişiklik talebin koçuna iletildi.");
  }

  const tasks = plan?.tasks ?? [];
  const { todayPending, todayCompleted, remainingWeek, overdue } = splitPlanTasks(tasks, today);
  const firstOpenTodayTask = todayPending[0] ?? null;
  const canComplete = plan?.status === "APPROVED";
  const weekProgress = buildWeeklyProgress(tasks, today);
  const todayFocus = buildTodayFocus(todayPending);
  const weeklyGroups = remainingWeek.reduce(
    (map, task) => {
      const key = taskDateKey(task.scheduledFor);
      if (!map[key]) map[key] = [];
      map[key].push(task);
      return map;
    },
    {} as Record<string, Task[]>,
  );
  const weekKeys = Object.keys(weeklyGroups).sort();
  const upcomingDayKeys = weekKeys.filter((key) => key > today);
  const pastDayKeys = weekKeys.filter((key) => key < today);

  function renderTaskCard(task: Task, highlighted: boolean) {
    return (
      <TaskCard
        key={task.id}
        task={task}
        canComplete={canComplete}
        highlighted={highlighted}
        busy={busy}
        draft={activeCompletionId === task.id ? completionDraft : null}
        onStart={(item) => void completeQuick(item, "IN_PROGRESS")}
        onOpenComplete={(item, status) => {
          setActiveCompletionId(item.id);
          setCompletionDraft(emptyDraft(status, item));
        }}
        onDraftChange={setCompletionDraft}
        onSubmitComplete={(item) => void submitCompletion(item)}
        onCancelComplete={() => {
          setActiveCompletionId(null);
          setCompletionDraft(null);
        }}
      />
    );
  }

  const preferenceFields = (
    <>
      <div>
        <span className="panel-label">Çalışmak istediğim günler</span>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {days.map((day) => (
            <button
              key={day.id}
              type="button"
              aria-pressed={preference.availableDays.includes(day.id)}
              onClick={() =>
                setPreference((current) => ({
                  ...current,
                  availableDays: current.availableDays.includes(day.id)
                    ? current.availableDays.filter((id) => id !== day.id)
                    : [...current.availableDays, day.id].sort(),
                }))
              }
              className={`rounded-xl px-2 py-2 text-xs font-bold ${
                preference.availableDays.includes(day.id) ? "bg-[var(--brand-olive)] text-white" : "bg-[var(--site-bg-warm)]"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>
      <label className="mt-4 block">
        <span className="panel-label">Bir günde ayırabileceğim süre</span>
        <select
          className="panel-input mt-2"
          value={preference.minutesPerDay}
          onChange={(event) => setPreference({ ...preference, minutesPerDay: Number(event.target.value) })}
        >
          {[20, 30, 45, 60, 90].map((value) => (
            <option key={value} value={value}>
              {value} dakika
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <label>
          <span className="panel-label">Yaklaşan sınav türü</span>
          <select
            className="panel-input mt-2"
            value={preference.examLabel || ""}
            onChange={(event) => setPreference({ ...preference, examLabel: event.target.value || null })}
          >
            <option value="">Yok</option>
            {["LGS", "TYT", "AYT", "YDT", "OKUL SINAVI"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="panel-label">Tarih</span>
          <input
            type="date"
            className="panel-input mt-2"
            disabled={!preference.examLabel}
            value={preference.nextExamAt?.slice(0, 10) || ""}
            onChange={(event) => setPreference({ ...preference, nextExamAt: event.target.value || null })}
          />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="panel-label">Bu planın yoğunluğu bana nasıl geliyor?</span>
        <select
          className="panel-input mt-2"
          value={preference.overwhelmPulse || ""}
          onChange={(event) => setPreference({ ...preference, overwhelmPulse: event.target.value ? Number(event.target.value) : null })}
        >
          <option value="">Yanıtlamak istemiyorum</option>
          <option value="1">Çok rahat</option>
          <option value="2">Rahat</option>
          <option value="3">Dengeli</option>
          <option value="4">Biraz fazla</option>
          <option value="5">Fazla</option>
        </select>
      </label>
      <label className="mt-4 flex items-start gap-3 rounded-xl bg-[var(--site-bg-warm)] p-3 text-xs">
        <input
          type="checkbox"
          checked={preference.planningEnabled}
          onChange={(event) => setPreference({ ...preference, planningEnabled: event.target.checked })}
        />
        <span>
          <strong className="block">Haftalık plan önerisi açık</strong>
          <span className="mt-1 block text-[var(--site-muted)]">İstediğin zaman kapatabilirsin; mevcut akademik kayıtların silinmez.</span>
        </span>
      </label>
    </>
  );

  return (
    <div className="flex flex-col gap-5">
      {!plan ? (
        <section aria-labelledby="plan-setup-heading" className="panel-surface p-5 sm:p-6">
          <p className="text-xs font-extrabold uppercase tracking-[.07em] text-[var(--brand-olive)]">Haftalık plan</p>
          <h2 id="plan-setup-heading" ref={preferencesHeadingRef} tabIndex={-1} className="mt-1 text-xl font-semibold outline-none">
            Bu hafta için aktif bir plan görünmüyor.
          </h2>
          <p className="mt-2 text-sm text-[var(--site-muted)]">Aşağıdan gün ve süre tercihlerini kaydettiğinde planın hazırlanır.</p>
          <div className="mt-5">{preferenceFields}</div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" disabled={busy || !preference.availableDays.length} onClick={() => void savePreference()} className="panel-quick-action">
              <Check size={14} /> Tercihleri Kaydet
            </button>
            <button
              type="button"
              disabled={busy || !preference.planningEnabled}
              onClick={() => void generate()}
              className="panel-quick-action panel-quick-action-primary"
            >
              <RefreshCw size={14} /> Planı Oluştur
            </button>
          </div>
        </section>
      ) : null}

      {plan ? (
        <section aria-labelledby="today-focus-heading" className="panel-surface border-l-4 border-l-[var(--brand-olive)] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.07em] text-[var(--brand-olive)]">Bugünkü odak</p>
              <h2 id="today-focus-heading" className="mt-1 text-xl font-semibold">{todayFocus.headline}</h2>
              {todayFocus.detail ? <p className="mt-1 text-sm text-[var(--site-muted)]">{todayPending.length} çalışma · {todayFocus.detail}</p> : null}
              <p className="mt-2 text-xs font-bold text-[var(--site-muted)]">{planStatusLabel(plan.status)}</p>
            </div>
            <button
              type="button"
              onClick={() => setControlsOpen((open) => !open)}
              aria-expanded={controlsOpen}
              aria-controls="plan-preferences-panel"
              className="panel-quick-action"
            >
              <SlidersHorizontal size={14} /> Plan Tercihleri
            </button>
          </div>
        </section>
      ) : null}

      {plan ? (
        <section aria-labelledby="today-tasks-heading" className="panel-surface p-5 sm:p-6">
          <h2 id="today-tasks-heading" className="text-sm font-extrabold text-[var(--site-ink)]">Bugünkü çalışmalar</h2>
          {todayPending.length ? (
            <div className="mt-5 space-y-3">
              {todayPending.map((task) => renderTaskCard(task, task.id === firstOpenTodayTask?.id))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--site-line)] p-6 text-center">
              <ListChecks className="mx-auto text-[var(--site-muted)]" />
              <p className="mt-2 text-sm font-bold">Bugün planında çalışma görünmüyor.</p>
            </div>
          )}
          {todayCompleted.length ? (
            <details className="mt-4 rounded-xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-3">
              <summary className="cursor-pointer text-xs font-bold text-[var(--site-muted)]">
                Tamamlananlar ({todayCompleted.length})
              </summary>
              <div className="mt-3 space-y-2">
                {todayCompleted.map((task) => renderTaskCard(task, false))}
              </div>
            </details>
          ) : null}
          {preference.overwhelmPulse && preference.overwhelmPulse >= 4 ? (
            <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              <CircleAlert size={15} className="shrink-0" />
              Bu hafta plan yoğun görünüyor. Değişiklik isteyerek koçundan destek alabilirsin.
            </p>
          ) : null}
        </section>
      ) : null}

      {plan ? (
        <section aria-labelledby="week-progress-heading" className="panel-surface p-5 sm:p-6">
          <h2 id="week-progress-heading" className="text-sm font-extrabold text-[var(--site-ink)]">Bu hafta</h2>
          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[var(--site-muted)]">
              <span>{weekProgress.completedCount} / {weekProgress.totalCount} görev tamamlandı</span>
              <span>Plan uyumu %{weekProgress.percent}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--site-muted)]">
              <span>
                {weekProgress.completedLabel} / {weekProgress.plannedLabel} plan
              </span>
              {weekProgress.questionTarget > 0 ? (
                <span>
                  {weekProgress.questionActual} / {weekProgress.questionTarget} soru
                </span>
              ) : null}
              {overdue.length ? <span className="font-bold text-amber-800">{overdue.length} geciken</span> : null}
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-dc-line-soft"
              role="progressbar"
              aria-valuenow={weekProgress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Bu hafta ${weekProgress.completedCount}/${weekProgress.totalCount} görev tamamlandı`}
            >
              <div className="h-full rounded-full bg-dc-brand" style={{ width: `${weekProgress.percent}%` }} />
            </div>
          </div>

          {weekProgress.subjectDistribution.length ? (
            <div className="mt-5">
              <h3 className="text-xs font-extrabold uppercase tracking-[.07em] text-[var(--site-muted)]">
                Ders dağılımı
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-[var(--site-muted)]">
                {weekProgress.subjectDistribution.map((row) => (
                  <li key={row.subject} className="flex flex-wrap justify-between gap-2">
                    <span className="font-bold text-[var(--site-ink)]">{row.subject}</span>
                    <span>
                      {formatMinutesAsHours(row.actualMinutes)} / {formatMinutesAsHours(row.plannedMinutes)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-5 text-[var(--site-muted)]">
                Akademik bağlantı: çalışma süresi ile deneme netleri birlikte izlenebilir; bu bir neden-sonuç iddiası değildir.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {upcomingExams && upcomingExams.length ? (
        <section aria-labelledby="upcoming-exam-heading" className="panel-surface p-5 sm:p-6">
          <h2 id="upcoming-exam-heading" className="text-sm font-extrabold">Yaklaşan deneme</h2>
          <ul className="mt-3 space-y-2">
            {upcomingExams.map((exam) => (
              <li key={exam.id} className="rounded-xl border border-[var(--site-line)] px-3 py-2 text-sm">
                <p className="font-bold">{exam.title}</p>
                <p className="text-xs text-[var(--site-muted)]">{dateTime.format(new Date(exam.startsAt))}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="coach-section-heading" className="panel-surface p-5 sm:p-6">
        <h2 id="coach-section-heading" className="text-sm font-extrabold text-[var(--site-ink)]">Koçundan</h2>
        {initialCoaching ? (
          <div className="mt-3 rounded-2xl border border-dc-line-soft bg-dc-surface-soft px-4 py-3">
            <p className="text-sm font-bold text-dc-ink-body">{initialCoaching.coachName}</p>
            {initialCoaching.focus ? <p className="mt-1 text-xs text-[var(--site-muted)]">Bu haftaki odak: {initialCoaching.focus}</p> : null}
            {initialCoaching.sharedNote ? (
              <p className="mt-2 text-sm text-dc-ink-body">{initialCoaching.sharedNote}</p>
            ) : (
              <p className="mt-2 text-xs text-[var(--site-muted)]">Bu hafta için yeni bir koç notu yok.</p>
            )}
            {initialCoachSummary?.studentVisibleText ? (
              <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm text-dc-ink-body">
                {initialCoachSummary.studentVisibleText}
              </p>
            ) : null}
            {initialCoachSummary?.nextWeekFocus ? (
              <p className="mt-2 text-xs font-bold text-[var(--site-muted)]">
                Gelecek hafta: {initialCoachSummary.nextWeekFocus}
              </p>
            ) : null}
            {initialCoaching.nextScheduledAt ? (
              <p className="mt-2 text-xs font-bold text-[var(--site-muted)]">Sonraki görüşme: {dateTime.format(new Date(initialCoaching.nextScheduledAt))}</p>
            ) : null}
            {initialCoaching.overdue ? (
              <p className="mt-2 text-xs font-bold text-amber-900">Görüşme zamanı geçti. Uygun bir zamanda koçundan yeni görüşme isteyebilirsin.</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--site-muted)]">Henüz atanmış bir koç görünmüyor.</p>
        )}
      </section>

      {plan ? (
        <section aria-labelledby="week-remaining-heading" className="panel-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="week-remaining-heading" className="text-sm font-extrabold text-[var(--site-ink)]">Haftanın kalanı</h2>
            <button
              type="button"
              disabled={busy || !preference.planningEnabled || plan.status === "APPROVED"}
              onClick={() => void generate()}
              className="panel-quick-action"
            >
              <RefreshCw size={14} /> Haftayı Dengele
            </button>
          </div>

          {upcomingDayKeys.length || pastDayKeys.length ? (
            <div className="mt-4 space-y-4">
              {upcomingDayKeys.map((dateKey) => (
                <div key={dateKey}>
                  <h3 className="text-xs font-extrabold uppercase tracking-[.07em] text-[var(--site-muted)]">
                    {dayHeading.format(new Date(`${dateKey}T00:00:00.000+03:00`))}
                  </h3>
                  <div className="mt-2 space-y-2">
                    {weeklyGroups[dateKey].map((task) => renderTaskCard(task, false))}
                  </div>
                </div>
              ))}
              {pastDayKeys.length ? (
                <details className="rounded-xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-3">
                  <summary className="cursor-pointer text-xs font-bold text-[var(--site-muted)]">Geçmiş günler ({pastDayKeys.length})</summary>
                  <ul className="mt-2 space-y-1 text-xs text-[var(--site-muted)]">
                    {pastDayKeys.map((dateKey) => {
                      const rows = weeklyGroups[dateKey];
                      const completed = rows.filter((task) => task.status === "DONE").length;
                      const pending = rows.filter((task) => task.status === "PLANNED").length;
                      return (
                        <li key={dateKey}>
                          {dayHeading.format(new Date(`${dateKey}T00:00:00.000+03:00`))}: {completed} tamamlandı · {pending} bekliyor
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--site-line)] p-6 text-center">
              <ListChecks className="mx-auto text-[var(--site-muted)]" />
              <p className="mt-2 text-sm font-bold">Haftanın kalanında planlanan çalışma görünmüyor.</p>
            </div>
          )}
        </section>
      ) : null}

      {plan ? (
        <section aria-labelledby="change-request-heading" className="panel-surface p-5 sm:p-6">
          <h2 id="change-request-heading" className="text-sm font-extrabold text-[var(--site-ink)]">Değişiklik / destek</h2>
          {plan.status === "CHANGE_REQUESTED" ? (
            <p className="mt-3 rounded-2xl bg-[#fff9dc] p-4 text-xs font-bold text-[var(--brand-olive)]">
              Değişiklik talebin koçuna iletildi: {changeCategoryLabels[plan.changeRequestCategory ?? ""] ?? "Belirtilmedi"}
            </p>
          ) : plan.status === "APPROVED" ? (
            <div className="mt-3 rounded-2xl bg-[#fff9dc] p-4">
              <p className="text-sm font-bold">Planında değişiklik mi gerekiyor?</p>
              <p className="mt-1 text-xs text-[var(--site-muted)]">Planım fazla yoğun veya günlerim değiştiğinde buradan koçuna talep gönderebilirsin.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!overloadActionOpen) {
                      const next = getLowerSafeMinutes(preference.minutesPerDay);
                      if (next) setPreference((current) => ({ ...current, minutesPerDay: next, overwhelmPulse: 4 }));
                    }
                    setOverloadActionOpen((open) => !open);
                  }}
                  className="panel-quick-action"
                >
                  Değişiklik İste
                </button>
                <button type="button" onClick={() => setControlsOpen(true)} className="panel-quick-action">
                  Planım fazla yoğun
                </button>
              </div>
              {overloadActionOpen ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select
                    value={overloadOption}
                    onChange={(event) => {
                      if (isOverloadOption(event.target.value)) setOverloadOption(event.target.value);
                    }}
                    className="panel-input flex-1"
                    aria-label="Plan değişiklik nedeni"
                  >
                    {Object.entries(overloadOptionLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <button type="button" disabled={busy} onClick={() => void requestChange()} className="panel-quick-action">
                    Talebi Gönder
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--site-muted)]">Plan onaylandığında değişiklik ve destek taleplerini buradan iletebilirsin.</p>
          )}
        </section>
      ) : null}

      {plan && controlsOpen ? (
        <aside id="plan-preferences-panel" className="panel-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={17} className="text-[var(--brand-olive)]" />
              <h2 id="plan-preferences-panel-heading" ref={preferencesHeadingRef} tabIndex={-1} className="text-sm font-extrabold outline-none">
                Plan Tercihleri
              </h2>
            </div>
            <button type="button" onClick={() => setControlsOpen(false)} className="panel-quick-action">
              <X size={14} /> Kapat
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--site-muted)]">Planı değil, sadece ayarları buradan değiştir.</p>
          <div className="mt-5">{preferenceFields}</div>
          <button
            type="button"
            disabled={busy || !preference.availableDays.length}
            onClick={() => void savePreference()}
            className="panel-quick-action panel-quick-action-primary mt-4 w-full justify-center"
          >
            <Check size={14} /> Tercihleri Kaydet
          </button>
        </aside>
      ) : null}
      <p aria-live="polite" className="min-h-[1rem] text-xs font-bold text-[var(--brand-olive)]">
        {message}
      </p>
    </div>
  );
}
