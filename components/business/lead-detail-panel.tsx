import Link from "next/link";
import type { LeadLostReasonCode, LeadStage } from "@prisma/client";
import {
  addLeadNote,
  assignLeadOwner,
  completeLeadTask,
  createLeadTask,
  dismissLeadDuplicate,
  linkLeadOrder,
  mergeSuggestedLead,
  scheduleLeadFollowUp,
  updateLeadPriority,
  updateLeadStage,
} from "@/app/panel/yonetim/isletme/actions";
import {
  LEAD_LOST_REASON_CODES,
  LEAD_LOST_REASON_LABELS,
  LEAD_PRIORITY_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STAGE_LABELS,
  LEAD_STAGES,
  PRODUCT_INTEREST_LABELS,
  isFollowUpOverdue,
  leadDisplayName,
} from "@/lib/business/leads";
import { deriveLeadLifecycleStatus } from "@/lib/panel/operations-inbox";

const dt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  dateStyle: "short",
  timeStyle: "short",
});
const tl = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

type OwnerOption = { id: string; fullName: string };

type DuplicateLead = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  stage: LeadStage;
  source: string;
  lastContactAt: Date;
};

type LeadDetail = NonNullable<Awaited<ReturnType<typeof import("@/lib/business/queries/leads").loadLeadDetail>>>;

type Props = {
  lead: LeadDetail;
  owners: OwnerOption[];
  duplicates: DuplicateLead[];
  canWrite: boolean;
  provisioning?: {
    odStatus?: string | null;
    odkStatus?: string | null;
  };
};

function noteText(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const note = (metadata as { note?: unknown }).note;
  return typeof note === "string" ? note : null;
}

export function LeadDetailPanel({ lead, owners, duplicates, canWrite, provisioning }: Props) {
  const overdue = isFollowUpOverdue(lead.nextFollowUpAt);
  const lifecycle = deriveLeadLifecycleStatus({
    stage: lead.stage,
    productInterest: lead.productInterest,
    relatedOdOrderId: lead.relatedOdOrderId,
    relatedOdkOrderId: lead.relatedOdkOrderId,
    relatedOdUserId: lead.relatedOdUserId,
    relatedOdkUserId: lead.relatedOdkUserId,
  });
  const orderHref = lead.relatedOdOrderId
    ? `/panel/yonetim/siparisler/${lead.relatedOdOrderId}`
    : lead.relatedOdkOrderId
      ? `/panel/yonetim/siparisler/${lead.relatedOdkOrderId}`
      : null;
  const createSaleHref =
    lead.productInterest === "ONLINE_DENEME_KULUBU"
      ? "/panel/yonetim/odk"
      : "/panel/yonetim/siparisler";
  const suggestion =
    lead.matchSuggestion &&
    typeof lead.matchSuggestion === "object" &&
    !Array.isArray(lead.matchSuggestion) &&
    "leadId" in lead.matchSuggestion &&
    typeof lead.matchSuggestion.leadId === "string"
      ? lead.matchSuggestion.leadId
      : null;

  const timeline = [
    ...lead.activities.map((item) => ({
      id: `a-${item.id}`,
      at: item.createdAt,
      label: item.type,
      detail: noteText(item.metadata) || [item.fromValue, item.toValue].filter(Boolean).join(" → "),
    })),
    ...lead.tasks.map((item) => ({
      id: `t-${item.id}`,
      at: item.createdAt,
      label: item.completedAt ? "TASK_DONE" : "TASK",
      detail: item.title,
    })),
    ...lead.financialTransactions.map((item) => ({
      id: `f-${item.id}`,
      at: item.transactionAt,
      label: "PAYMENT",
      detail: `${item.description} · ${tl.format(item.netCents / 100)}`,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="space-y-4">
      <header className="panel-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.08em] text-[var(--brand-olive)]">
              Aday detayı
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-.03em]">{leadDisplayName(lead)}</h2>
            <p className="mt-1 text-xs text-[var(--site-muted)]">
              {LEAD_SOURCE_LABELS[lead.source]} · {PRODUCT_INTEREST_LABELS[lead.productInterest]} ·{" "}
              {LEAD_PRIORITY_LABELS[lead.priority]}
              {lead.estimatedValueCents ? ` · beklenen ${tl.format(lead.estimatedValueCents / 100)}` : ""}
            </p>
            <p className={`mt-2 text-xs font-bold ${lifecycle.tone === "critical" ? "text-rose-700" : lifecycle.tone === "warning" ? "text-amber-800" : "text-[var(--site-muted)]"}`}>
              {lifecycle.label} — {lifecycle.nextAction}
            </p>
          </div>
          <Link href="/panel/yonetim/isletme/adaylar?focus=today" className="text-xs font-bold underline">
            Listeye dön
          </Link>
        </div>
        {overdue ? (
          <p role="status" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-900">
            Takip gecikti{lead.nextFollowUpAt ? `: ${dt.format(lead.nextFollowUpAt)}` : ""}.
          </p>
        ) : null}
      </header>

      {(duplicates.length > 0 || suggestion) && canWrite ? (
        <section className="panel-surface border-amber-200 bg-amber-50 p-4">
          <h3 className="text-xs font-extrabold text-amber-950">Olası tekrar kayıtlar</h3>
          <p className="mt-1 text-[11px] text-amber-900">
            Otomatik birleştirme yok — karar sizde.
          </p>
          <ul className="mt-3 space-y-2">
            {duplicates.map((dup) => (
              <li key={dup.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  {leadDisplayName(dup)} · {dup.phone || dup.email || "—"} · {LEAD_STAGE_LABELS[dup.stage]}
                </span>
                <form action={mergeSuggestedLead} className="flex gap-2">
                  <input type="hidden" name="sourceId" value={lead.id} />
                  <input type="hidden" name="targetId" value={dup.id} />
                  <button className="font-bold underline">Bunu koru, bunu birleştir</button>
                </form>
              </li>
            ))}
            {suggestion && !duplicates.some((d) => d.id === suggestion) ? (
              <li className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>Önerilen eşleşme: {suggestion}</span>
                <div className="flex gap-2">
                  <form action={mergeSuggestedLead}>
                    <input type="hidden" name="sourceId" value={lead.id} />
                    <input type="hidden" name="targetId" value={suggestion} />
                    <button className="font-bold underline">Birleştir</button>
                  </form>
                  <form action={dismissLeadDuplicate}>
                    <input type="hidden" name="leadId" value={lead.id} />
                    <button className="underline">Yoksay</button>
                  </form>
                </div>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel-surface space-y-3 p-4">
          <h3 className="text-xs font-extrabold">Profil</h3>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-[var(--site-muted)]">Telefon</dt><dd className="font-bold">{lead.phone || "—"}</dd></div>
            <div><dt className="text-[var(--site-muted)]">E-posta</dt><dd className="font-bold">{lead.email || "—"}</dd></div>
            <div><dt className="text-[var(--site-muted)]">Öğrenci</dt><dd className="font-bold">{lead.studentName || "—"}</dd></div>
            <div><dt className="text-[var(--site-muted)]">Veli</dt><dd className="font-bold">{lead.parentName || "—"}</dd></div>
            <div><dt className="text-[var(--site-muted)]">Sınıf / Sınav</dt><dd className="font-bold">{[lead.grade, lead.examType].filter(Boolean).join(" · ") || "—"}</dd></div>
            <div><dt className="text-[var(--site-muted)]">Şehir</dt><dd className="font-bold">{lead.city || "—"}</dd></div>
            <div><dt className="text-[var(--site-muted)]">Kampanya</dt><dd className="font-bold">{lead.campaign?.name || lead.attributions[0]?.campaign?.name || "—"}</dd></div>
            <div><dt className="text-[var(--site-muted)]">Etiketler</dt><dd className="font-bold">{lead.tags.length ? lead.tags.join(", ") : "—"}</dd></div>
          </dl>

          {canWrite ? (
            <>
              <form action={assignLeadOwner} className="flex gap-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <select name="assignedUserId" defaultValue={lead.assignedUserId || ""} aria-label="Sorumlu" className="min-w-0 flex-1 rounded-xl border px-2 text-xs">
                  <option value="">Atanmamış</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>{owner.fullName}</option>
                  ))}
                </select>
                <button className="rounded-xl border px-3 text-xs font-bold">Sahip ata</button>
              </form>
              <form action={updateLeadPriority} className="flex gap-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <select name="priority" defaultValue={lead.priority} aria-label="Öncelik" className="min-w-0 flex-1 rounded-xl border px-2 text-xs">
                  {(Object.keys(LEAD_PRIORITY_LABELS) as Array<keyof typeof LEAD_PRIORITY_LABELS>).map((priority) => (
                    <option key={priority} value={priority}>{LEAD_PRIORITY_LABELS[priority]}</option>
                  ))}
                </select>
                <button className="rounded-xl border px-3 text-xs font-bold">Öncelik</button>
              </form>
              <form action={updateLeadStage} className="grid gap-2 rounded-xl border p-3">
                <input type="hidden" name="id" value={lead.id} />
                <input type="hidden" name="redirectTo" value="adaylar" />
                <label className="text-xs font-bold">
                  Aşama
                  <select name="stage" defaultValue={lead.stage} className="mt-1 w-full rounded-xl border px-2 py-2 text-xs">
                    {LEAD_STAGES.map((stage) => (
                      <option key={stage} value={stage}>{LEAD_STAGE_LABELS[stage]}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold">
                  Kayıp nedeni (LOST için zorunlu)
                  <select name="lostReasonCode" defaultValue={lead.lostReasonCode || ""} className="mt-1 w-full rounded-xl border px-2 py-2 text-xs">
                    <option value="">—</option>
                    {LEAD_LOST_REASON_CODES.map((code) => (
                      <option key={code} value={code}>{LEAD_LOST_REASON_LABELS[code as LeadLostReasonCode]}</option>
                    ))}
                  </select>
                </label>
                <input name="lostReasonDetail" defaultValue={lead.lostReason || ""} placeholder="Kayıp detayı" className="rounded-xl border px-2 py-2 text-xs" />
                <button className="rounded-xl bg-[var(--brand-olive)] px-3 py-2 text-xs font-bold text-white">Aşamayı kaydet</button>
              </form>
            </>
          ) : (
            <p className="text-xs">Aşama: <strong>{LEAD_STAGE_LABELS[lead.stage]}</strong>
              {lead.lostReasonCode ? ` · ${LEAD_LOST_REASON_LABELS[lead.lostReasonCode]}` : ""}
            </p>
          )}
        </section>

        <section className="panel-surface space-y-3 p-4">
          <h3 className="text-xs font-extrabold">Takip / not / görev</h3>
          {canWrite ? (
            <>
              <form action={scheduleLeadFollowUp} className="grid gap-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <label className="text-xs font-bold">
                  Takip tarihi
                  <input name="nextFollowUpAt" type="datetime-local" required className="mt-1 w-full rounded-xl border px-2 py-2 text-xs" />
                </label>
                <input name="taskTitle" placeholder="Görev (ör. Ara)" className="rounded-xl border px-2 py-2 text-xs" />
                <textarea name="note" placeholder="Not" className="min-h-16 rounded-xl border px-2 py-2 text-xs" />
                <select name="assignedUserId" defaultValue={lead.assignedUserId || ""} aria-label="Takip sorumlusu" className="rounded-xl border px-2 py-2 text-xs">
                  <option value="">Ben / mevcut sahip</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>{owner.fullName}</option>
                  ))}
                </select>
                <button className="rounded-xl bg-[var(--brand-olive)] px-3 py-2 text-xs font-bold text-white">Takip planla</button>
              </form>
              <form action={addLeadNote} className="flex">
                <input type="hidden" name="leadId" value={lead.id} />
                <input name="note" required placeholder="Hızlı not" className="min-w-0 flex-1 rounded-l-xl border px-2 text-xs" />
                <button className="rounded-r-xl border px-3 text-xs font-bold">Not</button>
              </form>
              <form action={createLeadTask} className="grid grid-cols-[1fr_auto_auto] gap-0">
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="setFollowUp" value="1" />
                <input name="title" required placeholder="Görev" className="min-w-0 rounded-l-xl border px-2 text-xs" />
                <input name="dueAt" type="datetime-local" aria-label="Görev son tarihi" className="border px-2 text-xs" />
                <button className="rounded-r-xl border px-2 text-xs font-bold">Görev</button>
              </form>
            </>
          ) : null}
          <div className="space-y-2">
            {lead.tasks.map((task) => (
              <div key={task.id} className={`rounded-xl border px-3 py-2 text-xs ${task.dueAt && !task.completedAt && isFollowUpOverdue(task.dueAt) ? "border-rose-300 bg-rose-50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{task.title}</p>
                    {task.note ? <p className="mt-1 text-[10px] text-[var(--site-muted)]">{task.note}</p> : null}
                    <p className="mt-1 text-[10px] text-[var(--site-muted)]">
                      {task.completedAt ? `Tamamlandı ${dt.format(task.completedAt)}` : task.dueAt ? `Son ${dt.format(task.dueAt)}` : "Tarihsiz"}
                    </p>
                  </div>
                  {canWrite && !task.completedAt ? (
                    <form action={completeLeadTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button className="text-[10px] font-bold underline">Tamamla</button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {lead.stage === "WON" || lead.wonAt ? (
        <section className="panel-surface p-4">
          <h3 className="text-xs font-extrabold">Kazanıldı — satış / sipariş</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link href={createSaleHref} className="rounded-xl bg-[var(--brand-olive)] px-3 py-2 font-bold text-white">
              Sipariş / satış oluştur
            </Link>
            {orderHref ? (
              <Link href={orderHref} className="rounded-xl border px-3 py-2 font-bold">
                Bağlı siparişi aç
              </Link>
            ) : null}
            {lead.relatedOdUserId || lead.relatedOdkUserId ? (
              <Link
                href={`/panel/yonetim/kullanicilar/${lead.relatedOdUserId || lead.relatedOdkUserId}`}
                className="rounded-xl border px-3 py-2 font-bold"
              >
                Öğrenci hesabı
              </Link>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] text-[var(--site-muted)]">
            Provisioning: OD {provisioning?.odStatus || (lead.relatedOdOrderId ? "bağlı" : "yok")} · ODK{" "}
            {provisioning?.odkStatus || (lead.relatedOdkOrderId ? "bağlı" : "yok")}
          </p>
          {canWrite && !orderHref ? (
            <form action={linkLeadOrder} className="mt-3 grid gap-2 sm:grid-cols-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <select name="product" defaultValue={lead.productInterest === "ONLINE_DENEME_KULUBU" ? "ODK" : "OD"} className="rounded-xl border px-2 py-2 text-xs">
                <option value="OD">OnlineDershanem siparişi</option>
                <option value="ODK">Deneme Kulübü siparişi</option>
              </select>
              <input name="orderId" required placeholder="Sipariş ID" className="rounded-xl border px-2 py-2 text-xs" />
              <button className="rounded-xl border px-3 py-2 text-xs font-bold">Mevcut siparişe bağla</button>
            </form>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel-surface p-4">
          <h3 className="text-xs font-extrabold">Instagram konuşması</h3>
          {lead.conversation ? (
            <>
              <Link
                href={`/panel/yonetim/isletme/mesaj-kutusu?conversation=${lead.conversation.id}`}
                className="mt-2 inline-block text-xs font-bold text-[var(--brand-olive)] underline"
              >
                Mesaj kutusunda aç
              </Link>
              <div className="mt-3 max-h-64 space-y-2 overflow-auto">
                {[...lead.conversation.messages].reverse().map((message) => (
                  <article
                    key={message.id}
                    className={`rounded-xl px-3 py-2 text-xs ${message.direction === "OUTBOUND" ? "ml-6 bg-[var(--brand-olive)] text-white" : "mr-6 bg-[var(--site-bg-warm)]"}`}
                  >
                    <p>{message.body || "Medya"}</p>
                    <p className="mt-1 text-[9px] opacity-70">{dt.format(message.occurredAt)}</p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-xs text-[var(--site-muted)]">Bağlı Instagram konuşması yok.</p>
          )}
        </section>

        <section className="panel-surface p-4">
          <h3 className="text-xs font-extrabold">Teklifler / ödemeler</h3>
          {lead.financialTransactions.length ? (
            lead.financialTransactions.map((tx) => (
              <p key={tx.id} className="mt-2 border-t pt-2 text-xs">
                {tx.description} · {tl.format(tx.netCents / 100)} · {tx.status}
              </p>
            ))
          ) : (
            <p className="mt-2 text-xs text-[var(--site-muted)]">Ödeme kaydı yok.</p>
          )}
          <h3 className="mt-4 text-xs font-extrabold">Timeline</h3>
          <ol className="mt-2 max-h-72 space-y-2 overflow-auto">
            {timeline.map((item) => (
              <li key={item.id} className="border-t pt-2 text-[11px]">
                <strong>{item.label}</strong>
                {item.detail ? ` · ${item.detail}` : ""}
                <span className="block text-[var(--site-muted)]">{dt.format(item.at)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
