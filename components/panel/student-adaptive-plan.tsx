"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, CircleAlert, ListChecks, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { formatIstanbulDateInput } from "@/lib/istanbul-time";
import {
  getLowerSafeMinutes,
  getOverloadRequest,
  type OverloadOption,
} from "@/lib/adaptive-plan-overload";
import { sendPanelEvent } from "@/lib/panel-event-client";

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
  sourceType: "ASSIGNMENT" | "REVIEW" | "WEAK_OUTCOME" | "EXAM_PREP" | "RECOVERY";
  reasonCode: "DUE_SOON" | "REVIEW_DUE" | "NEEDS_REVIEW" | "EXAM_APPROACHING" | "CAPACITY_BALANCE" | "MISSED_LESSON";
  status: "PLANNED" | "DONE" | "SKIPPED";
};

type Plan = {
  id: string;
  status: "DRAFT" | "APPROVED" | "CHANGE_REQUESTED" | "ARCHIVED";
  version: number;
  capacityMinutes: number;
  changeRequestCategory: string | null;
  tasks: Task[];
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

const reasons: Record<Task["reasonCode"], string> = {
  DUE_SOON: "Son tarihi yaklaştığı için önce",
  REVIEW_DUE: "Hatırlama zamanı geldiği için",
  NEEDS_REVIEW: "Tekrar gerekli görüldüğü için",
  EXAM_APPROACHING: "Yaklaşan sınava küçük bir adım olduğu için",
  CAPACITY_BALANCE: "Günlük sürene uyduğu için",
  MISSED_LESSON: "Kaçırdığın dersin 72 saatlik küçük telafisi olduğu için",
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

function taskDateKey(scheduledFor: string) {
  return formatIstanbulDateInput(new Date(scheduledFor));
}

function TaskCard({
  task,
  canComplete,
  highlighted,
  onComplete,
}: {
  task: Task;
  canComplete: boolean;
  highlighted: boolean;
  onComplete: (task: Task) => void;
}) {
  const done = task.status === "DONE";
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
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--site-muted)]">
            <CalendarDays size={13} /> {dayHeading.format(new Date(task.scheduledFor))} · {task.durationMinutes} dk
          </p>
          <h3 className={`mt-1 font-extrabold ${highlighted ? "text-base" : "text-sm"}`}>{task.title}</h3>
          <p className="mt-2 text-xs text-[var(--brand-olive)]">Neden: {reasons[task.reasonCode]}</p>
        </div>
        {canComplete ? (
          <button
            type="button"
            disabled={done}
            onClick={() => onComplete(task)}
            className={`shrink-0 panel-quick-action ${highlighted ? "panel-quick-action-primary" : ""}`}
          >
            {done ? "Tamamlandı" : "Tamamla"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function StudentAdaptivePlan({
  initialPreference,
  initialPlan,
  today,
}: {
  initialPreference: Preference;
  initialPlan: Plan | null;
  today: string;
}) {
  const [preference, setPreference] = useState(initialPreference);
  const [plan, setPlan] = useState(initialPlan);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
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
    setMessage(response.ok ? "Tercihlerin kaydedildi. Şimdi açıklanabilir öneriyi oluşturabilirsin." : body.error || "Tercihler kaydedilemedi.");
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

  async function complete(task: Task) {
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
    const response = await fetch(`/api/panel/adaptive-plan/tasks/${task.id}/complete`, { method: "POST" });
    if (!response.ok) return setMessage("Görev tamamlanamadı.");
    setPlan((current) =>
      current ? { ...current, tasks: current.tasks.map((item) => (item.id === task.id ? { ...item, status: "DONE" } : item)) } : current,
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
    setMessage("Değişiklik isteğin öğretmenine iletildi. Günlük süreyi bir kademe azaltıp kaydederek güvenli bir başlangıç yapabilirsin.");
  }

  const tasks = plan?.tasks ?? [];
  // Tek kaynak-tek görünüm: bugüne ait görevler ile diğer günlerin görevleri
  // ayrık kümeler — hiçbir görev iki listede birden yer almaz.
  const todayTasks = tasks.filter((task) => taskDateKey(task.scheduledFor) === today);
  const upcomingTasks = tasks.filter((task) => taskDateKey(task.scheduledFor) !== today);
  const firstOpenTodayTask = todayTasks.find((task) => task.status !== "DONE") ?? null;
  const canComplete = plan?.status === "APPROVED";

  const doneCount = tasks.filter((task) => task.status === "DONE").length;
  const totalCount = tasks.length;
  const completionPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const statusHeadline = plan
    ? plan.status === "APPROVED"
      ? "Öğretmenin onayladı"
      : plan.status === "CHANGE_REQUESTED"
        ? "Değişiklik bekleniyor"
        : "Öğretmen onayı bekleniyor"
    : "Henüz plan oluşturulmadı";

  const preferenceFields = (
    <>
      <div>
        <span className="panel-label">Uygun günler</span>
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
          <span className="panel-label">Yaklaşan sınav</span>
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
        <span className="panel-label">Bu yoğunluk bana nasıl geliyor?</span>
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
      {/* Plan yokken tercihler birincil konudur. */}
      {!plan ? (
        <section aria-labelledby="plan-setup-heading" className="panel-surface p-5 sm:p-6">
          <p className="text-xs font-extrabold uppercase tracking-[.07em] text-[var(--brand-olive)]">Başlangıç</p>
          <h2 id="plan-setup-heading" ref={preferencesHeadingRef} tabIndex={-1} className="mt-1 text-xl font-semibold outline-none">
            Uygun günlerini ve süreni bildir
          </h2>
          <p className="mt-2 text-sm text-[var(--site-muted)]">Planın bu tercihlere göre kurulur; istediğin zaman değiştirebilirsin.</p>
          <div className="mt-5">{preferenceFields}</div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" disabled={busy || !preference.availableDays.length} onClick={() => void savePreference()} className="panel-quick-action">
              <Check size={14} /> Tercihleri kaydet
            </button>
            <button
              type="button"
              disabled={busy || !preference.planningEnabled}
              onClick={() => void generate()}
              className="panel-quick-action panel-quick-action-primary"
            >
              <RefreshCw size={14} /> Öneri oluştur
            </button>
          </div>
        </section>
      ) : null}

      {/* PRIMARY: bugünkü odak. */}
      {plan ? (
        <section aria-labelledby="today-focus-heading" className="panel-surface border-l-4 border-l-[var(--brand-olive)] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.07em] text-[var(--brand-olive)]">Bugünkü odak</p>
              <h2 id="today-focus-heading" className="mt-1 text-xl font-semibold">
                {statusHeadline}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setControlsOpen((open) => !open)}
              aria-expanded={controlsOpen}
              aria-controls="plan-preferences-panel"
              className="panel-quick-action"
            >
              <SlidersHorizontal size={14} /> Tercihleri değiştir
            </button>
          </div>

          {todayTasks.length ? (
            <div className="mt-5 space-y-3">
              {todayTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  canComplete={canComplete}
                  highlighted={task.id === firstOpenTodayTask?.id}
                  onComplete={complete}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--site-line)] p-6 text-center">
              <ListChecks className="mx-auto text-[var(--site-muted)]" />
              <p className="mt-2 text-sm font-bold">Bugün için planlanmış görev yok.</p>
            </div>
          )}

          {preference.overwhelmPulse && preference.overwhelmPulse >= 4 ? (
            <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              <CircleAlert size={15} className="shrink-0" />
              Planın fazla geldiğini belirttin. Gün veya süreyi azaltıp yeniden dengeleyebilirsin.
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Haftalık plan: tek liste + tek tamamlanma göstergesi. */}
      {plan ? (
        <section aria-labelledby="week-plan-heading" className="panel-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="week-plan-heading" className="text-sm font-extrabold text-[var(--site-ink)]">
              Haftalık plan
            </h2>
            <button
              type="button"
              disabled={busy || !preference.planningEnabled || plan.status === "APPROVED"}
              onClick={() => void generate()}
              className="panel-quick-action"
            >
              <RefreshCw size={14} /> Kalan haftayı dengele
            </button>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--site-muted)]">
              <span>Bu hafta tamamlanan</span>
              <span>
                {doneCount}/{totalCount} görev
              </span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-dc-line-soft"
              role="progressbar"
              aria-valuenow={completionPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Bu hafta ${doneCount}/${totalCount} görev tamamlandı`}
            >
              <div className="h-full rounded-full bg-dc-brand" style={{ width: `${completionPct}%` }} />
            </div>
          </div>

          {totalCount ? (
            <ol className="mt-5 space-y-3">
              {todayTasks.length ? (
                <li className="rounded-2xl border border-dashed border-[var(--site-line)] bg-[var(--site-bg-warm)] px-4 py-3 text-xs font-bold text-[var(--site-muted)]">
                  Bugün · {todayTasks.length} görev · yukarıda "Bugünkü odak" bölümünde gösteriliyor
                </li>
              ) : null}
              {upcomingTasks.map((task) => (
                <li key={task.id}>
                  <TaskCard task={task} canComplete={canComplete} highlighted={false} onComplete={complete} />
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--site-line)] p-6 text-center">
              <ListChecks className="mx-auto text-[var(--site-muted)]" />
              <p className="mt-2 text-sm font-bold">Açık ödev veya tekrar geldiğinde plan burada oluşur.</p>
            </div>
          )}

          {/* Plan değişiklik isteği: onaylı planın üstünde görünür, akışı bastırmaz. */}
          {plan.status === "APPROVED" ? (
            <div className="mt-5 rounded-2xl bg-[#fff9dc] p-4">
              <button
                type="button"
                onClick={() => {
                  if (!overloadActionOpen) {
                    setOverloadOption("REDUCE_LIGHT");
                    const next = getLowerSafeMinutes(preference.minutesPerDay);
                    if (next) setPreference((current) => ({ ...current, minutesPerDay: next, overwhelmPulse: 4 }));
                    else setPreference((current) => ({ ...current, overwhelmPulse: 4 }));
                    setMessage("Yoğunluk geri bildirimi açıldı. Güvenli azaltma önerisi uygulandı; kaydetmeden kalıcı olmaz.");
                  }
                  setOverloadActionOpen(true);
                  setControlsOpen(true);
                }}
                className="panel-quick-action"
              >
                Bu plan bana fazla geldi
              </button>
              {overloadActionOpen ? (
                <div className="mt-3">
                  <p className="text-xs text-[var(--site-muted)]">
                    Öneri: günlük süreyi bir kademe azaltıp tercihleri kaydet, ardından yeni haftalık öneri oluştur.
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <select
                    value={overloadOption}
                    onChange={(event) => {
                      if (isOverloadOption(event.target.value)) setOverloadOption(event.target.value);
                    }}
                    className="panel-input flex-1"
                    aria-label="Plan değişiklik nedeni"
                  >
                    {Object.entries(overloadOptionLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button type="button" disabled={busy} onClick={() => void requestChange()} className="panel-quick-action">
                    Değişiklik iste
                  </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {plan.status === "CHANGE_REQUESTED" ? (
            <p className="mt-5 rounded-2xl bg-[#fff9dc] p-4 text-xs font-bold text-[var(--brand-olive)]">
              Değişiklik isteğin iletildi: {changeCategoryLabels[plan.changeRequestCategory ?? ""] ?? "Belirtilmedi"}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Tercihler: plan varken varsayılan kapalı ikincil panel. */}
      {plan && controlsOpen ? (
        <aside id="plan-preferences-panel" className="panel-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={17} className="text-[var(--brand-olive)]" />
              <h2 id="plan-preferences-panel-heading" ref={preferencesHeadingRef} tabIndex={-1} className="text-sm font-extrabold outline-none">
                Tercihler
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
            <Check size={14} /> Tercihleri kaydet
          </button>
        </aside>
      ) : null}
      <p aria-live="polite" className="min-h-[1rem] text-xs font-bold text-[var(--brand-olive)]">
        {message}
      </p>
    </div>
  );
}
