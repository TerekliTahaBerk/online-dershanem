"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useOptimistic, useState } from "react";
import type { LeadLostReasonCode, LeadStage } from "@prisma/client";
import { transitionLeadStageAction } from "@/app/panel/yonetim/isletme/actions";
import {
  LEAD_LOST_REASON_CODES,
  LEAD_LOST_REASON_LABELS,
  LEAD_STAGE_LABELS,
  LEAD_STAGES,
  isFollowUpOverdue,
  leadDisplayName,
  PRODUCT_INTEREST_LABELS,
} from "@/lib/business/leads";

export type FunnelLeadCard = {
  id: string;
  stage: LeadStage;
  firstName: string | null;
  lastName: string | null;
  studentName: string | null;
  instagramScopedId: string | null;
  phone: string | null;
  email: string | null;
  productInterest: keyof typeof PRODUCT_INTEREST_LABELS;
  nextFollowUpAt: string | null;
  lastContactAt: string;
  priority: string;
  estimatedValueCents: number | null;
};

type Props = {
  initialLeads: FunnelLeadCard[];
  stageCounts: Record<string, number>;
  canWrite: boolean;
};

export function SalesFunnelBoard({ initialLeads, stageCounts, canWrite }: Props) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [optimisticLeads, addOptimistic] = useOptimistic(
    leads,
    (current, update: { id: string; stage: LeadStage }) =>
      current.map((lead) => (lead.id === update.id ? { ...lead, stage: update.stage } : lead)),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [lostPrompt, setLostPrompt] = useState<{ id: string; from: LeadStage } | null>(null);
  const [lostCode, setLostCode] = useState<LeadLostReasonCode>("PRICE");
  const [lostDetail, setLostDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const counts = LEAD_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = optimisticLeads.filter((lead) => lead.stage === stage).length;
      return acc;
    },
    { ...stageCounts } as Record<string, number>,
  );

  async function commitStage(
    leadId: string,
    stage: LeadStage,
    lost?: { code: LeadLostReasonCode; detail?: string },
  ) {
    const previous = leads;
    setError(null);
    setPendingId(leadId);
    startTransition(() => {
      addOptimistic({ id: leadId, stage });
    });
    const result = await transitionLeadStageAction({
      id: leadId,
      stage,
      lostReasonCode: lost?.code,
      lostReasonDetail: lost?.detail,
    });
    setPendingId(null);
    if (!result.ok) {
      setLeads(previous);
      setError(
        result.error === "LOST_REASON_REQUIRED"
          ? "Kaybedildi aşaması için kayıp nedeni zorunlu."
          : result.error === "SAME_STAGE"
            ? null
            : "Aşama güncellenemedi.",
      );
      if (result.error === "LOST_REASON_REQUIRED") {
        const from = previous.find((l) => l.id === leadId)?.stage ?? "NEW";
        setLostPrompt({ id: leadId, from });
      }
      return;
    }
    // Mutation response is authoritative.
    setLeads((current) =>
      current.map((lead) =>
        lead.id === result.lead.id ? { ...lead, stage: result.lead.stage } : lead,
      ),
    );
    router.refresh();
  }

  function requestStageChange(leadId: string, stage: LeadStage) {
    if (!canWrite || pendingId) return;
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.stage === stage) return;
    if (stage === "LOST") {
      setLostPrompt({ id: leadId, from: lead.stage });
      return;
    }
    void commitStage(leadId, stage);
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">
          {error}
        </p>
      ) : null}

      {lostPrompt ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lost-reason-title"
          className="panel-surface fixed inset-x-4 top-24 z-50 mx-auto max-w-md p-4 shadow-lg md:inset-x-auto"
        >
          <h2 id="lost-reason-title" className="text-sm font-extrabold">
            Kayıp nedeni zorunlu
          </h2>
          <p className="mt-1 text-xs text-[var(--site-muted)]">
            LOST aşamasına geçmek için bir neden seçin. Bu veri raporlanır.
          </p>
          <label className="mt-3 block text-xs font-bold">
            Neden
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={lostCode}
              onChange={(event) => setLostCode(event.target.value as LeadLostReasonCode)}
            >
              {LEAD_LOST_REASON_CODES.map((code) => (
                <option key={code} value={code}>
                  {LEAD_LOST_REASON_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 block text-xs font-bold">
            Detay {lostCode === "OTHER" ? "(zorunlu)" : "(isteğe bağlı)"}
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={lostDetail}
              onChange={(event) => setLostDetail(event.target.value)}
              required={lostCode === "OTHER"}
            />
          </label>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-xs font-bold"
              onClick={() => setLostPrompt(null)}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className="rounded-xl bg-[var(--brand-olive)] px-3 py-2 text-xs font-bold text-white"
              onClick={() => {
                const id = lostPrompt.id;
                setLostPrompt(null);
                void commitStage(id, "LOST", { code: lostCode, detail: lostDetail });
              }}
            >
              Kaybedildi olarak işaretle
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {LEAD_STAGES.map((stage) => (
          <section
            key={stage}
            className="panel-surface min-h-40 p-3"
            onDragOver={(event) => {
              if (!canWrite) return;
              event.preventDefault();
            }}
            onDrop={(event) => {
              if (!canWrite) return;
              event.preventDefault();
              const id = event.dataTransfer.getData("text/lead-id") || draggingId;
              if (id) requestStageChange(id, stage);
              setDraggingId(null);
            }}
            aria-label={`${LEAD_STAGE_LABELS[stage]} sütunu`}
          >
            <h2 className="mb-3 text-xs font-extrabold">
              {LEAD_STAGE_LABELS[stage]} · {counts[stage] ?? 0}
            </h2>
            <div className="space-y-2">
              {optimisticLeads
                .filter((lead) => lead.stage === stage)
                .map((lead) => {
                  const overdue = isFollowUpOverdue(
                    lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : null,
                  );
                  return (
                    <article
                      key={lead.id}
                      draggable={canWrite && pendingId !== lead.id}
                      onDragStart={(event) => {
                        setDraggingId(lead.id);
                        event.dataTransfer.setData("text/lead-id", lead.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      className={`rounded-xl border bg-white p-3 ${overdue ? "border-rose-300 ring-1 ring-rose-200" : ""} ${pendingId === lead.id ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-xs font-bold">{leadDisplayName(lead)}</p>
                        {overdue ? (
                          <span className="shrink-0 text-[9px] font-extrabold uppercase text-rose-700">
                            Gecikmiş
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-[10px] text-[var(--site-muted)]">
                        {PRODUCT_INTEREST_LABELS[lead.productInterest]}
                        {lead.estimatedValueCents
                          ? ` · ~${Math.round(lead.estimatedValueCents / 100)} TL`
                          : ""}
                      </p>
                      <a
                        href={`/panel/yonetim/isletme/adaylar?lead=${lead.id}&focus=all`}
                        className="mt-2 inline-block text-[10px] font-bold text-[var(--brand-olive)] underline"
                      >
                        Detay
                      </a>
                      {canWrite ? (
                        <label className="mt-2 block text-[10px] font-bold text-[var(--site-muted)]">
                          Aşamayı değiştir
                          <select
                            aria-label={`${leadDisplayName(lead)} aşaması`}
                            className="mt-1 w-full rounded-lg border p-1 text-[10px]"
                            value={lead.stage}
                            disabled={pendingId === lead.id}
                            onChange={(event) =>
                              requestStageChange(lead.id, event.target.value as LeadStage)
                            }
                          >
                            {LEAD_STAGES.map((option) => (
                              <option key={option} value={option}>
                                {LEAD_STAGE_LABELS[option]}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </article>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
