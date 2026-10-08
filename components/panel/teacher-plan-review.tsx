"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Clock3, ListChecks } from "lucide-react";
import { sendPanelEvent } from "@/lib/panel-event-client";

type Plan = {
  id: string;
  studentName: string;
  status: "DRAFT" | "APPROVED" | "CHANGE_REQUESTED" | "ARCHIVED";
  version: number;
  capacityMinutes: number;
  changeRequestCategory: string | null;
  tasks: {
    id: string;
    title: string;
    scheduledFor: string;
    durationMinutes: number;
    reasonCode: string;
  }[];
};
const date = new Intl.DateTimeFormat("tr-TR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
export function TeacherPlanReview({ plans: initial }: { plans: Plan[] }) {
  const [plans, setPlans] = useState(initial);
  const [message, setMessage] = useState("");
  const openedAt = useRef(performance.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  async function approve(plan: Plan) {
    if (busyId) return;
    if (
      !window.confirm(
        `${plan.studentName} için plan onaylanıp kilitlenecek. Devam edilsin mi?`,
      )
    ) {
      return;
    }
    setBusyId(plan.id);
    setMessage("");
    try {
      await approveRequest(plan);
    } catch {
      setMessage("Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.");
    } finally {
      setBusyId(null);
    }
  }
  async function approveRequest(plan: Plan) {
    const response = await fetch(
      `/api/panel/adaptive-plan/${plan.id}/approve`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: plan.version }),
      },
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(body.error || "Plan onaylanamadı.");
    setPlans((current) =>
      current.map((item) =>
        item.id === plan.id
          ? { ...item, status: "APPROVED", version: item.version + 1 }
          : item,
      ),
    );
    sendPanelEvent({
      name: "plan_review_completed",
      properties: {
        durationMs: Math.min(
          30 * 60 * 1000,
          Math.round(performance.now() - openedAt.current),
        ),
        taskCount: plan.tasks.length,
        approved: true,
      },
    });
    setMessage(`${plan.studentName} için plan onaylandı ve kilitlendi.`);
  }
  if (!plans.length)
    return (
      <div className="overflow-hidden rounded-[10px] border border-pn-border bg-white p-8 text-center">
        <ListChecks className="mx-auto text-(--site-muted)" />
        <h2 className="mt-3 font-extrabold">İncelenecek plan yok.</h2>
        <p className="mt-1 text-sm text-(--site-muted)">
          Öğrenci öneri oluşturduğunda burada görünür.
        </p>
      </div>
    );
  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <article key={plan.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-pn-text">{plan.studentName}</h2>
              <p className="mt-1 text-xs text-(--site-muted)">
                Haftalık kapasite {plan.capacityMinutes} dk ·{" "}
                {plan.tasks.length} iş · kural adaptive-v1
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${plan.status === "APPROVED" ? "bg-(--pn-tone-success-soft) text-(--pn-tone-success)" : plan.status === "CHANGE_REQUESTED" ? "bg-(--pn-tone-warning-soft) text-(--pn-tone-warning)" : "bg-(--pn-tone-info-soft) text-(--pn-tone-info)"}`}
            >
              {plan.status === "APPROVED"
                ? "Onaylandı"
                : plan.status === "CHANGE_REQUESTED"
                  ? "Değişiklik istendi"
                  : "Taslak"}
            </span>
          </div>
          {plan.changeRequestCategory ? (
            <p className="mt-3 rounded-md bg-(--pn-tone-warning-soft) px-3 py-2 text-[13px] font-medium text-(--pn-tone-warning)">
              Öğrenci geri bildirimi:{" "}
              {plan.changeRequestCategory === "TOO_MUCH"
                ? "Öğrenci bu haftanın yoğunluğunu fazla buldu."
                : plan.changeRequestCategory === "WRONG_DAYS"
                  ? "Öğrenci çalışma günlerini değiştirmek istiyor."
                  : plan.changeRequestCategory === "PRIORITY"
                    ? "Öncelik sırası değişmeli."
                    : "Başka bir neden"}
            </p>
          ) : null}
          <div className="mt-3 border-t border-pn-border">
            {plan.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-baseline justify-between gap-3 border-b border-pn-border py-2"
              >
                <p className="text-[13.5px] font-medium text-pn-text">{task.title}</p>
                <p className="flex shrink-0 items-center gap-1 text-[12px] text-pn-text-muted">
                  <Clock3 size={12} aria-hidden="true" />
                  {date.format(new Date(task.scheduledFor))} · {task.durationMinutes} dk
                </p>
              </div>
            ))}
          </div>
          {plan.status === "DRAFT" ? (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void approve(plan)}
                disabled={busyId !== null}
                className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-dc-ink text-white hover:bg-black min-h-10 px-3.5 text-[13.5px]"
              >
                <CheckCircle2 size={14} aria-hidden="true" />{" "}
                {busyId === plan.id ? "Onaylanıyor…" : "Onayla ve kilitle"}
              </button>
            </div>
          ) : null}
        </article>
      ))}
      <p
        aria-live="polite"
        className="text-xs font-bold text-(--brand-olive)"
      >
        {message}
      </p>
    </div>
  );
}
