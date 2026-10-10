"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  CircleAlert,
  ListChecks,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { Drawer, useDrawerParam } from "@/components/panel/primitives/drawer";
import { EmptyState, StatusBadge, buttonClass } from "@/components/panel/primitives";
import {
  getLowerSafeMinutes,
  getOverloadRequest,
  type OverloadOption,
} from "@/lib/adaptive-plan-overload";
import { sendPanelEvent } from "@/lib/panel-event-client";
import {
  buildTodayFocus,
  buildWeeklyProgress,
  groupPlanTasksByDay,
  planStatusLabel,
  splitPlanTasks,
} from "@/lib/student-plan-view";
import { formatMinutesAsHours } from "@/lib/kocum/metrics";
import { PreferenceFields } from "./PreferenceFields";
import { TaskCard } from "./TaskCard";
import {
  changeCategoryLabels,
  dateTime,
  dayHeading,
  emptyDraft,
  isOverloadOption,
  overloadOptionLabels,
  sourceLabels,
} from "./constants";
import type {
  CompletionDraft,
  ExamCountdownView,
  StudentAdaptivePlanProps,
  Task,
} from "./types";

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

/** Geri sayım başlığı: kalan tam hafta yoksa "bu hafta" denir, "0 hafta" değil. */
function examCountdownHeadline(countdown: ExamCountdownView): string {
  const label = countdown.examLabel || "Sınav";
  if (countdown.weeksRemaining < 1) return `${label} bu hafta`;
  return `${label}'a ${countdown.weeksRemaining} hafta`;
}

/** Plan yoğunluğunun neden değiştiğini açıklar — kapasite artışı sürpriz olmamalı. */
function examCountdownNote(tier: ExamCountdownView["tier"]): string {
  return {
    FAR: "Planın her zamanki temposunda ilerliyor.",
    APPROACHING: "Sınav yaklaşıyor; planın biraz yoğunlaştı.",
    NEAR: "Son haftalar: günlük planın biraz daha dolu, sen yaparsın.",
    FINAL_WEEK: "Son hafta: planın en yoğun temposunda. Az kaldı, dayan!",
  }[tier];
}

export function StudentAdaptivePlan(props: StudentAdaptivePlanProps) {
  const {
    initialPreference,
    initialPlan,
    initialCoaching,
    initialCoachSummary,
    upcomingExams,
    today,
    // Varsayılan `true` = mevcut Online Koçum davranışı. KPSS gibi onay
    // gerektirmeyen ürünlerde onay/koç arayüzü hiç render edilmez.
    requiresApproval = true,
    examCountdown = null,
  } = props;
  const [preference, setPreference] = useState(initialPreference);
  const [plan, setPlan] = useState(initialPlan);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [activeCompletionId, setActiveCompletionId] = useState<string | null>(
    null,
  );
  const [completionDraft, setCompletionDraft] =
    useState<CompletionDraft | null>(null);
  const [overloadActionOpen, setOverloadActionOpen] = useState(false);
  const [overloadOption, setOverloadOption] =
    useState<OverloadOption>("REDUCE_LIGHT");
  // Plan yokken tercihler ANA KONUDUR (varsayılan açık); plan kurulunca
  // ikincil bir panele geçer (varsayılan kapalı).
  const [controlsOpen, setControlsOpen] = useState(!initialPlan);
  const preferencesHeadingRef = useRef<HTMLHeadingElement>(null);
  // Görünüm (?gorunum=hafta) ve görev paneli (?gorev=gorev:<id>) URL'de tutulur.
  const [viewParam, setViewParam] = useDrawerParam("gorunum");
  const view: "liste" | "hafta" = viewParam === "hafta" ? "hafta" : "liste";
  const [taskParam, setTaskParam] = useDrawerParam("gorev");
  const openTaskId = taskParam?.startsWith("gorev:") ? taskParam.slice(6) : null;
  const closeTask = useCallback(() => {
    setTaskParam(null);
    setActiveCompletionId(null);
    setCompletionDraft(null);
  }, [setTaskParam]);
  const closeControls = useCallback(() => setControlsOpen(false), []);

  useEffect(() => {
    // Plan yokken tercihler sayfanın ana konusudur; başlığa odaklanılır.
    if (controlsOpen && !plan) preferencesHeadingRef.current?.focus();
  }, [controlsOpen, plan]);

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
        nextExamAt: preference.nextExamAt
          ? new Date(
              `${preference.nextExamAt.slice(0, 10)}T12:00:00.000Z`,
            ).toISOString()
          : null,
        examLabel: preference.nextExamAt
          ? preference.examLabel || "OKUL SINAVI"
          : null,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    setMessage(
      response.ok
        ? "Tercihlerini kaydettik."
        : body.error || "Tercihlerini kaydedemedik. Bir daha dener misin?",
    );
  }

  async function generate() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/panel/adaptive-plan/generate", {
      method: "POST",
    });
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
    /*
     * YEDEK ÇAĞRI KALDIRILDI — YANLIŞ İŞİ YAPIYORDU.
     *
     * Bu düğme "Başladım" demek. Yedek uç
     * (`/api/panel/adaptive-plan/tasks/[id]/complete`) ise görevi koşulsuz
     * `DONE` yazıyor VE ödev kaynaklıysa Dershanem `AssignmentProgress`
     * kaydını da tamamlanmış işaretliyordu. Yani birincil çağrı herhangi bir
     * nedenle düşerse (doğrulama, hız limiti, geçici hata) öğrenci "başladım"
     * dediği görevi TAMAMLANMIŞ buluyor, ödevi de kapanıyordu — üstelik
     * ekranda "Başladın" yazdığı için fark edilmiyordu.
     */
    if (!response.ok) return setMessage("Görev güncellenemedi.");

    setPlan((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((item) =>
              item.id === task.id ? { ...item, status } : item,
            ),
          }
        : current,
    );
    setMessage("Başladın, kolay gelsin!");
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

    const toInt = (value: string) =>
      value.trim() === "" ? null : Number(value);
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
      setMessage(body.error || "Görevi güncelleyemedik. Bir daha dener misin?");
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
    // Kayıt sonrası görev paneli kapanır; sonuç canlı bölgede duyurulur.
    setTaskParam(null);
    setMessage(
      completionDraft.status === "DONE"
        ? "Harika, bir görev daha tamam!"
        : completionDraft.status === "PARTIAL"
          ? "Kaydettik. Yarısı bile ilerlemedir!"
          : "Durumunu kaydettik.",
    );
  }

  async function requestChange() {
    if (!plan) return;
    const overloadRequest = getOverloadRequest(overloadOption);
    setBusy(true);
    const response = await fetch(
      `/api/panel/adaptive-plan/${plan.id}/request-change`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: overloadRequest.category,
          overwhelmPulse: overloadRequest.overwhelmPulse,
          option: overloadOption,
          expectedVersion: plan.version,
        }),
      },
    );
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(body.error || "Talep iletilemedi.");
    setPreference((current) => ({
      ...current,
      overwhelmPulse: overloadRequest.overwhelmPulse,
    }));
    setPlan({
      ...plan,
      status: "CHANGE_REQUESTED",
      version: plan.version + 1,
      changeRequestCategory: overloadRequest.category,
    });
    setOverloadActionOpen(false);
    setMessage("İsteğini koçuna ilettik. Planına birlikte bakacaksınız.");
  }

  const tasks = plan?.tasks ?? [];
  const { todayPending, overdue } = splitPlanTasks(tasks, today);
  const canComplete = plan?.status === "APPROVED";
  /*
   * Koç onaylı plan kilitlidir (mevcut OK davranışı); otomatik onaylı planda
   * kilitleyen bir insan kararı yoktur — aksi halde KPSS öğrencisi ilk plandan
   * sonra haftasını bir daha dengeleyemezdi. Sunucu tarafı aynı kuralı
   * `canRegeneratePlan` ile uygular.
   */
  const canRegenerate = !plan || plan.status !== "APPROVED" || plan.autoApproved;
  const weekProgress = buildWeeklyProgress(tasks, today);
  const todayFocus = buildTodayFocus(todayPending);
  const dayGroups = groupPlanTasksByDay(tasks, today);
  const openTask = openTaskId ? tasks.find((task) => task.id === openTaskId) ?? null : null;
  const overdueIds = new Set(overdue.map((task) => task.id));

  function openComplete(task: Task, status: CompletionDraft["status"]) {
    setActiveCompletionId(task.id);
    setCompletionDraft(emptyDraft(status, task));
    setTaskParam(`gorev:${task.id}`);
  }

  function renderRow(task: Task) {
    const done = task.status === "DONE" || task.status === "PARTIAL";
    const meta = [
      task.subject,
      task.targetType === "QUESTIONS" && task.targetValue ? `${task.targetValue} soru` : null,
      sourceLabels[task.sourceType],
    ]
      .filter(Boolean)
      .join(" · ");
    const open = task.status === "PLANNED" || task.status === "IN_PROGRESS";
    return (
      <li key={task.id} className="flex min-h-(--pn-row-h) flex-wrap items-center gap-x-3 gap-y-1 border-b border-pn-border py-2">
        <span
          aria-hidden="true"
          className={`grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border ${
            done ? "border-pn-accent bg-pn-accent text-white" : "border-pn-border-strong"
          }`}
        >
          {done ? <Check size={11} /> : null}
        </span>
        <button
          type="button"
          onClick={() => setTaskParam(`gorev:${task.id}`)}
          aria-haspopup="dialog"
          className="min-w-0 flex-1 text-left"
        >
          <span className={`block text-[14px] font-medium ${done ? "text-pn-text-muted line-through" : "text-pn-text"}`}>
            {task.title}
          </span>
          {meta ? <span className="block text-[12.5px] text-pn-text-muted">{meta}</span> : null}
        </button>
        <span className="shrink-0 text-[12.5px] tabular-nums text-pn-text-muted">{task.durationMinutes} dk</span>
        {overdueIds.has(task.id) ? (
          <StatusBadge label="Gecikti" tone="warning" />
        ) : task.status === "IN_PROGRESS" ? (
          <StatusBadge label="Başladın" tone="info" />
        ) : task.status === "COULD_NOT" ? (
          <StatusBadge label="Yapamadım" tone="neutral" />
        ) : null}
        {canComplete && open ? (
          <button
            type="button"
            onClick={() => openComplete(task, "DONE")}
            aria-label="Görevi tamamla"
            className={buttonClass("secondary", "sm")}
          >
            Tamamla
          </button>
        ) : null}
      </li>
    );
  }

  const preferenceFields = (
    <PreferenceFields preference={preference} setPreference={setPreference} />
  );

  return (
    <div>
      {!plan ? (
        <section aria-labelledby="plan-setup-heading">
          <h2
            id="plan-setup-heading"
            ref={preferencesHeadingRef}
            tabIndex={-1}
            className="text-[16px] font-semibold text-pn-text outline-hidden"
          >
            Bu hafta için henüz bir planın yok.
          </h2>
          <p className="mt-1 text-[14px] text-pn-text-secondary">
            Uygun günlerini ve ayırabileceğin süreyi aşağıdan kaydet; planını buna göre hazırlayalım.
          </p>
          <div className="mt-5 max-w-[720px]">{preferenceFields}</div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={busy || !preference.availableDays.length}
              onClick={() => void savePreference()}
              className={buttonClass("secondary", "md")}
            >
              <Check size={14} aria-hidden="true" /> Tercihleri Kaydet
            </button>
            <button
              type="button"
              disabled={busy || !preference.planningEnabled}
              onClick={() => void generate()}
              className={buttonClass("primary", "md")}
            >
              <RefreshCw size={14} aria-hidden="true" /> Planı Oluştur
            </button>
          </div>
        </section>
      ) : null}

      {plan ? (
        <section aria-labelledby="week-summary-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="week-summary-heading" className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-pn-text">
                Bu hafta
                <StatusBadge
                  label={planStatusLabel(plan.status, { autoApproved: plan.autoApproved })}
                  tone={plan.status === "APPROVED" ? "success" : plan.status === "CHANGE_REQUESTED" ? "warning" : "neutral"}
                />
              </h2>
              <p className="mt-0.5 text-[13px] text-pn-text-muted">
                {weekProgress.totalCount} görev · {weekProgress.completedCount} tamamlandı · {weekProgress.completedLabel} / {weekProgress.plannedLabel}
                {weekProgress.questionTarget > 0 ? ` · ${weekProgress.questionActual} / ${weekProgress.questionTarget} soru` : ""}
                {overdue.length ? ` · ${overdue.length} geciken` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setControlsOpen((open) => !open)}
                aria-expanded={controlsOpen}
                aria-haspopup="dialog"
                className={buttonClass("secondary", "sm")}
              >
                <SlidersHorizontal size={14} aria-hidden="true" /> Plan Tercihleri
              </button>
              <button
                type="button"
                disabled={busy || !preference.planningEnabled || !canRegenerate}
                onClick={() => void generate()}
                className={buttonClass("ghost", "sm")}
              >
                <RefreshCw size={14} aria-hidden="true" /> Haftayı Dengele
              </button>
            </div>
          </div>
          <div
            className="mt-3 h-1.5 max-w-[480px] overflow-hidden rounded-full bg-pn-surface-subtle"
            role="progressbar"
            aria-valuenow={weekProgress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Bu hafta ${weekProgress.completedCount}/${weekProgress.totalCount} görev tamamlandı`}
          >
            <div className="h-full rounded-full bg-pn-accent-marker" style={{ width: `${weekProgress.percent}%` }} />
          </div>
          <p className="mt-2 text-[13.5px] text-pn-text">
            <span className="font-medium">Bugün:</span> {todayFocus.headline}
            {todayFocus.detail ? <span className="text-pn-text-muted"> · {todayPending.length} çalışma · {todayFocus.detail}</span> : null}
          </p>
          {examCountdown ? (
            <p className="mt-1 text-[13px] text-pn-text-secondary" aria-label="Sınava kalan">
              <span className="font-medium">{examCountdownHeadline(examCountdown)}</span> · {dateTime.format(new Date(examCountdown.examAt))} · {examCountdownNote(examCountdown.tier)}
            </p>
          ) : null}
          {preference.overwhelmPulse && preference.overwhelmPulse >= 4 ? (
            <p className="mt-3 flex gap-2 rounded-md bg-(--pn-tone-warning-soft) px-3 py-2 text-[13px] text-(--pn-tone-warning)">
              <CircleAlert size={15} className="shrink-0" aria-hidden="true" />
              Bu hafta planın biraz yoğun görünüyor. Zorlanırsan koçundan değişiklik isteyebilirsin.
            </p>
          ) : null}
        </section>
      ) : null}

      {!plan && examCountdown ? (
        <p className="mt-6 text-[13px] text-pn-text-secondary" aria-label="Sınava kalan">
          <span className="font-medium">{examCountdownHeadline(examCountdown)}</span> · {dateTime.format(new Date(examCountdown.examAt))} · {examCountdownNote(examCountdown.tier)}
        </p>
      ) : null}

      {plan ? (
        <section aria-labelledby="plan-tasks-heading" className="mt-8 border-t border-pn-border pt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="plan-tasks-heading" className="text-[15px] font-semibold text-pn-text">
              Görevler
            </h2>
            <nav aria-label="Plan görünümü" className="inline-flex gap-0.5 rounded-md border border-pn-border bg-pn-surface-subtle p-0.5">
              {(["liste", "hafta"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-current={view === item ? "page" : undefined}
                  onClick={() => setViewParam(item === "liste" ? null : item)}
                  className={`min-h-8 rounded-[5px] px-3 text-[12.5px] font-semibold ${
                    view === item ? "bg-white text-pn-text shadow-sm" : "text-pn-text-secondary"
                  }`}
                >
                  {item === "liste" ? "Liste" : "Hafta"}
                </button>
              ))}
            </nav>
          </div>

          {!dayGroups.length ? (
            <EmptyState className="mt-4" icon={ListChecks} title="Bu hafta planında çalışma görünmüyor." />
          ) : view === "hafta" ? (
            <div className="panel-nav-scroll mt-4 overflow-x-auto pb-2">
              <ol aria-label="Haftalık plan" className="grid min-w-[840px] grid-cols-7">
                {weekColumns(dayGroups).map((day) => (
                  <li key={day.key} className="border-l border-pn-border px-2 first:border-l-0" aria-current={day.isToday ? "date" : undefined}>
                    <p className={`py-1.5 text-[12.5px] font-semibold capitalize ${day.isToday ? "text-pn-accent" : "text-pn-text-secondary"}`}>
                      {dayHeading.format(new Date(`${day.key}T00:00:00.000+03:00`))}
                    </p>
                    <ul className="space-y-1">
                      {day.tasks.map((task) => (
                        <li key={task.id}>
                          <button
                            type="button"
                            onClick={() => setTaskParam(`gorev:${task.id}`)}
                            aria-haspopup="dialog"
                            className={`block w-full rounded-md px-2 py-1.5 text-left hover:bg-pn-hover ${
                              task.status === "DONE" || task.status === "PARTIAL" ? "text-pn-text-muted line-through" : "text-pn-text"
                            }`}
                          >
                            <span className="block text-[12.5px] font-medium leading-4">{task.title}</span>
                            <span className="block text-[11.5px] text-pn-text-muted">{task.durationMinutes} dk</span>
                          </button>
                        </li>
                      ))}
                      {!day.tasks.length ? <li className="px-2 py-2 text-[12px] text-pn-text-muted">—</li> : null}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="mt-3 space-y-5">
              {dayGroups.filter((day) => !day.isPast).map((day) => (
                <div key={day.key}>
                  <h3 className="flex items-baseline justify-between gap-3 text-[13px] font-semibold capitalize text-pn-text-secondary">
                    <span className={day.isToday ? "text-pn-accent" : undefined}>
                      {day.isToday ? "Bugün · " : ""}
                      {dayHeading.format(new Date(`${day.key}T00:00:00.000+03:00`))}
                    </span>
                    <span className="tabular-nums text-pn-text-muted">
                      {day.done}/{day.total}
                    </span>
                  </h3>
                  <ul className="mt-1 border-t border-pn-border">{day.tasks.map((task) => renderRow(task))}</ul>
                </div>
              ))}
              {dayGroups.some((day) => day.isPast) ? (
                <details className="group" open={overdue.length > 0}>
                  <summary className="cursor-pointer text-[13px] font-medium text-pn-text-secondary">
                    Geçmiş günler ({dayGroups.filter((day) => day.isPast).length})
                  </summary>
                  <div className="mt-3 space-y-4">
                    {dayGroups.filter((day) => day.isPast).map((day) => (
                      <div key={day.key}>
                        <h3 className="flex items-baseline justify-between gap-3 text-[13px] font-semibold capitalize text-pn-text-muted">
                          <span>{dayHeading.format(new Date(`${day.key}T00:00:00.000+03:00`))}</span>
                          <span className="tabular-nums">
                            {day.done}/{day.total}
                          </span>
                        </h3>
                        <ul className="mt-1 border-t border-pn-border">{day.tasks.map((task) => renderRow(task))}</ul>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          )}

          {weekProgress.subjectDistribution.length ? (
            <div className="mt-6">
              <h3 className="text-[13px] font-semibold text-pn-text">Ders dağılımı</h3>
              <dl className="mt-1 grid gap-y-1">
                {weekProgress.subjectDistribution.map((row) => (
                  <div key={row.subject} className="flex flex-wrap justify-between gap-2 text-[13px]">
                    <dt className="text-pn-text">{row.subject}</dt>
                    <dd className="tabular-nums text-pn-text-muted">
                      {formatMinutesAsHours(row.actualMinutes)} / {formatMinutesAsHours(row.plannedMinutes)}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-[12px] text-pn-text-muted">
                Çalışma süren ile deneme netlerini yan yana görebilirsin; ama biri diğerinin tek nedeni değil.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {upcomingExams && upcomingExams.length ? (
        <section aria-labelledby="upcoming-exam-heading" className="mt-8 border-t border-pn-border pt-6">
          <h2 id="upcoming-exam-heading" className="text-[15px] font-semibold text-pn-text">
            Yaklaşan deneme
          </h2>
          <ul className="mt-2 border-t border-pn-border">
            {upcomingExams.map((exam) => (
              <li key={exam.id} className="flex flex-wrap justify-between gap-2 border-b border-pn-border py-2 text-[14px]">
                <span className="font-medium text-pn-text">{exam.title}</span>
                <span className="text-[13px] text-pn-text-muted">{dateTime.format(new Date(exam.startsAt))}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {requiresApproval ? (
        <section aria-labelledby="coach-section-heading" className="mt-8 border-t border-pn-border pt-6">
          <h2 id="coach-section-heading" className="text-[15px] font-semibold text-pn-text">
            Koçundan
          </h2>
          {initialCoaching ? (
            <div className="mt-2 space-y-1.5 text-[14px]">
              <p className="font-medium text-pn-text">{initialCoaching.coachName}</p>
              {initialCoaching.focus ? <p className="text-pn-text-secondary">Bu haftaki odak: {initialCoaching.focus}</p> : null}
              {initialCoaching.sharedNote ? (
                <blockquote className="border-l-2 border-pn-accent-marker pl-3 text-pn-text">{initialCoaching.sharedNote}</blockquote>
              ) : (
                <p className="text-[13px] text-pn-text-muted">Bu hafta için yeni bir koç notu yok.</p>
              )}
              {initialCoachSummary?.studentVisibleText ? (
                <p className="text-pn-text">{initialCoachSummary.studentVisibleText}</p>
              ) : null}
              {initialCoachSummary?.nextWeekFocus ? (
                <p className="text-[13px] text-pn-text-secondary">Gelecek hafta: {initialCoachSummary.nextWeekFocus}</p>
              ) : null}
              {initialCoaching.nextScheduledAt ? (
                <p className="text-[13px] text-pn-text-secondary">Sonraki görüşme: {dateTime.format(new Date(initialCoaching.nextScheduledAt))}</p>
              ) : null}
              {initialCoaching.overdue ? (
                <p className="text-[13px] text-(--pn-tone-warning)">
                  Görüşme zamanı geçti. Sana uyan bir zamanda koçundan yeni bir görüşme isteyebilirsin.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-[14px] text-pn-text-muted">Henüz atanmış bir koç görünmüyor.</p>
          )}
        </section>
      ) : null}

      {plan && requiresApproval ? (
        <section aria-labelledby="change-request-heading" className="mt-8 border-t border-pn-border pt-6">
          <h2 id="change-request-heading" className="text-[15px] font-semibold text-pn-text">
            Değişiklik / destek
          </h2>
          {plan.status === "CHANGE_REQUESTED" ? (
            <p className="mt-2 text-[14px] text-pn-text-secondary">
              İsteğin koçuna ulaştı: {changeCategoryLabels[plan.changeRequestCategory ?? ""] ?? "Belirtilmedi"}
            </p>
          ) : plan.status === "APPROVED" ? (
            <div className="mt-2">
              <p className="text-[14px] text-pn-text-secondary">
                Plan fazla yoğun gelirse ya da günlerin değişirse buradan koçuna söyleyebilirsin.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!overloadActionOpen) {
                      const next = getLowerSafeMinutes(preference.minutesPerDay);
                      if (next)
                        setPreference((current) => ({
                          ...current,
                          minutesPerDay: next,
                          overwhelmPulse: 4,
                        }));
                    }
                    setOverloadActionOpen((open) => !open);
                  }}
                  className={buttonClass("secondary", "md")}
                >
                  Değişiklik İste
                </button>
                <button type="button" onClick={() => setControlsOpen(true)} className={buttonClass("ghost", "md")}>
                  Planım fazla yoğun
                </button>
              </div>
              {overloadActionOpen ? (
                <div className="mt-3 flex max-w-[560px] flex-col gap-2 sm:flex-row">
                  <select
                    value={overloadOption}
                    onChange={(event) => {
                      if (isOverloadOption(event.target.value)) setOverloadOption(event.target.value);
                    }}
                    className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 flex-1"
                    aria-label="Plan değişiklik nedeni"
                  >
                    {Object.entries(overloadOptionLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button type="button" disabled={busy} onClick={() => void requestChange()} className={buttonClass("primary", "md")}>
                    Koçuma İlet
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-[14px] text-pn-text-muted">
              Plan onaylandığında değişiklik ve destek isteklerini buradan iletebileceksin.
            </p>
          )}
        </section>
      ) : null}

      {plan ? (
        <Drawer
          open={controlsOpen}
          onClose={closeControls}
          title="Plan Tercihleri"
          description="Buradan planı değil, sadece çalışma tercihlerini değiştirirsin."
          footer={
            <button
              type="button"
              disabled={busy || !preference.availableDays.length}
              onClick={() => void savePreference()}
              className={buttonClass("primary", "md", "w-full justify-center")}
            >
              <Check size={14} aria-hidden="true" /> Tercihleri Kaydet
            </button>
          }
        >
          {preferenceFields}
          {message ? (
            <p role="status" className="mt-3 text-[13px] font-medium text-pn-text-secondary">
              {message}
            </p>
          ) : null}
        </Drawer>
      ) : null}

      <Drawer
        open={Boolean(openTask)}
        onClose={closeTask}
        title={openTask?.title ?? "Görev"}
        description={
          openTask
            ? `${dayHeading.format(new Date(openTask.scheduledFor))} · ${openTask.durationMinutes} dk · ${sourceLabels[openTask.sourceType]}`
            : undefined
        }
      >
        {openTask ? (
          <>
            <TaskCard
              task={openTask}
              canComplete={canComplete}
              highlighted={false}
              busy={busy}
              draft={activeCompletionId === openTask.id ? completionDraft : null}
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
            {!canComplete ? (
              <p className="mt-3 text-[13px] text-pn-text-muted">
                Koçun planı onayladığında bu görevi buradan işaretleyebileceksin.
              </p>
            ) : null}
          </>
        ) : null}
      </Drawer>

      <p aria-live="polite" className="mt-6 min-h-4 text-[13px] font-medium text-pn-text-secondary">
        {(plan && controlsOpen) || openTask ? "" : message}
      </p>
    </div>
  );
}

/** Hafta görünümü: planın ilk gününün haftası, Pazartesi–Pazar, boş günler dahil. */
function weekColumns<T extends Task>(groups: Array<{ key: string; tasks: T[]; isToday: boolean }>) {
  const first = new Date(`${groups[0].key}T12:00:00.000+03:00`);
  const weekday = (first.getUTCDay() + 6) % 7;
  const monday = new Date(first.getTime() - weekday * 86_400_000);
  return Array.from({ length: 7 }, (_, index) => {
    const key = new Date(monday.getTime() + index * 86_400_000).toISOString().slice(0, 10);
    const group = groups.find((item) => item.key === key);
    return { key, tasks: group?.tasks ?? [], isToday: group?.isToday ?? false };
  });
}
