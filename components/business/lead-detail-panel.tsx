import { buttonClass, inputClass } from "@/components/panel/primitives";
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
const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

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

type LeadDetail = NonNullable<
  Awaited<
    ReturnType<typeof import("@/lib/business/queries/leads").loadLeadDetail>
  >
>;

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
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return null;
  const note = (metadata as { note?: unknown }).note;
  return typeof note === "string" ? note : null;
}

export function LeadDetailPanel({
  lead,
  owners,
  duplicates,
  canWrite,
  provisioning,
}: Props) {
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
      ? "/panel/odk/yonetim"
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
      detail:
        noteText(item.metadata) ||
        [item.fromValue, item.toValue].filter(Boolean).join(" → "),
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
      <header className="overflow-hidden rounded-[10px] border border-pn-border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[.08em] text-pn-accent">
              Aday detayı
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-.03em]">
              {leadDisplayName(lead)}
            </h2>
            <p className="mt-1 text-[13px] text-pn-text-muted">
              {LEAD_SOURCE_LABELS[lead.source]} ·{" "}
              {PRODUCT_INTEREST_LABELS[lead.productInterest]} ·{" "}
              {LEAD_PRIORITY_LABELS[lead.priority]}
              {lead.estimatedValueCents
                ? ` · beklenen ${tl.format(lead.estimatedValueCents / 100)}`
                : ""}
            </p>
            <p
              className={`mt-2 text-[13px] font-medium ${lifecycle.tone === "critical" ? "text-rose-700" : lifecycle.tone === "warning" ? "text-amber-800" : "text-pn-text-muted"}`}
            >
              {lifecycle.label} — {lifecycle.nextAction}
            </p>
          </div>
          <Link
            href="/panel/yonetim/isletme/adaylar?focus=today"
            className="text-[13px] font-medium underline"
          >
            Listeye dön
          </Link>
        </div>
        {overdue ? (
          <p
            role="status"
            className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-medium text-rose-900"
          >
            Takip gecikti
            {lead.nextFollowUpAt ? `: ${dt.format(lead.nextFollowUpAt)}` : ""}.
          </p>
        ) : null}
      </header>

      {(duplicates.length > 0 || suggestion) && canWrite ? (
        <section className="overflow-hidden rounded-[10px] border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-[15px] font-semibold text-amber-950">
            Olası tekrar kayıtlar
          </h3>
          <p className="mt-1 text-[12px] text-amber-900">
            Otomatik birleştirme yok — karar sizde.
          </p>
          <ul className="mt-3 space-y-2">
            {duplicates.map((dup) => (
              <li
                key={dup.id}
                className="flex flex-wrap items-center justify-between gap-2 text-[13px]"
              >
                <span>
                  {leadDisplayName(dup)} · {dup.phone || dup.email || "—"} ·{" "}
                  {LEAD_STAGE_LABELS[dup.stage]}
                </span>
                <form action={mergeSuggestedLead} className="flex gap-2">
                  <input type="hidden" name="sourceId" value={lead.id} />
                  <input type="hidden" name="targetId" value={dup.id} />
                  <button className={buttonClass("secondary", "md", "underline")}>
                    Bunu koru, bunu birleştir
                  </button>
                </form>
              </li>
            ))}
            {suggestion && !duplicates.some((d) => d.id === suggestion) ? (
              <li className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <span>Önerilen eşleşme: {suggestion}</span>
                <div className="flex gap-2">
                  <form action={mergeSuggestedLead}>
                    <input type="hidden" name="sourceId" value={lead.id} />
                    <input type="hidden" name="targetId" value={suggestion} />
                    <button className={buttonClass("secondary", "md", "underline")}>Birleştir</button>
                  </form>
                  <form action={dismissLeadDuplicate}>
                    <input type="hidden" name="leadId" value={lead.id} />
                    <button className={buttonClass("secondary", "md", "underline")}>Yoksay</button>
                  </form>
                </div>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-[10px] border border-pn-border bg-white space-y-3 p-4">
          <h3 className="text-[15px] font-semibold">Profil</h3>
          <dl className="grid grid-cols-2 gap-2 text-[13px]">
            <div>
              <dt className="text-pn-text-muted">Telefon</dt>
              <dd className="font-medium">{lead.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-pn-text-muted">E-posta</dt>
              <dd className="font-medium">{lead.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-pn-text-muted">Öğrenci</dt>
              <dd className="font-medium">{lead.studentName || "—"}</dd>
            </div>
            <div>
              <dt className="text-pn-text-muted">Veli</dt>
              <dd className="font-medium">{lead.parentName || "—"}</dd>
            </div>
            <div>
              <dt className="text-pn-text-muted">Sınıf / Sınav</dt>
              <dd className="font-medium">
                {[lead.grade, lead.examType].filter(Boolean).join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-pn-text-muted">Şehir</dt>
              <dd className="font-medium">{lead.city || "—"}</dd>
            </div>
            <div>
              <dt className="text-pn-text-muted">Kampanya</dt>
              <dd className="font-medium">
                {lead.campaign?.name ||
                  lead.attributions[0]?.campaign?.name ||
                  "—"}
              </dd>
            </div>
            <div>
              <dt className="text-pn-text-muted">Etiketler</dt>
              <dd className="font-medium">
                {lead.tags.length ? lead.tags.join(", ") : "—"}
              </dd>
            </div>
          </dl>

          {canWrite ? (
            <>
              <form action={assignLeadOwner} className="flex gap-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <select
                  name="assignedUserId"
                  defaultValue={lead.assignedUserId || ""}
                  aria-label="Sorumlu"
                  className={inputClass("min-w-0 flex-1 w-auto")}
                >
                  <option value="">Atanmamış</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.fullName}
                    </option>
                  ))}
                </select>
                <button className={buttonClass("secondary", "md")}>
                  Sahip ata
                </button>
              </form>
              <form action={updateLeadPriority} className="flex gap-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <select
                  name="priority"
                  defaultValue={lead.priority}
                  aria-label="Öncelik"
                  className={inputClass("min-w-0 flex-1 w-auto")}
                >
                  {(
                    Object.keys(LEAD_PRIORITY_LABELS) as Array<
                      keyof typeof LEAD_PRIORITY_LABELS
                    >
                  ).map((priority) => (
                    <option key={priority} value={priority}>
                      {LEAD_PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </select>
                <button className={buttonClass("secondary", "md")}>
                  Öncelik
                </button>
              </form>
              <form
                action={updateLeadStage}
                className="grid gap-2 rounded-md border p-3 items-end"
              >
                <input type="hidden" name="id" value={lead.id} />
                <input type="hidden" name="redirectTo" value="adaylar" />
                <label className="text-[13px] font-medium">
                  Aşama
                  <select
                    name="stage"
                    defaultValue={lead.stage}
                    className={inputClass("mt-1 w-full")}
                  >
                    {LEAD_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {LEAD_STAGE_LABELS[stage]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[13px] font-medium">
                  Kayıp nedeni (LOST için zorunlu)
                  <select
                    name="lostReasonCode"
                    defaultValue={lead.lostReasonCode || ""}
                    className={inputClass("mt-1 w-full")}
                  >
                    <option value="">—</option>
                    {LEAD_LOST_REASON_CODES.map((code) => (
                      <option key={code} value={code}>
                        {LEAD_LOST_REASON_LABELS[code as LeadLostReasonCode]}
                      </option>
                    ))}
                  </select>
                </label>
                <input
                  name="lostReasonDetail"
                  defaultValue={lead.lostReason || ""}
                  placeholder="Kayıp detayı"
                  className={inputClass("w-auto")}
                />
                <button className={buttonClass("primary", "md")}>
                  Aşamayı kaydet
                </button>
              </form>
            </>
          ) : (
            <p className="text-[13px]">
              Aşama: <strong>{LEAD_STAGE_LABELS[lead.stage]}</strong>
              {lead.lostReasonCode
                ? ` · ${LEAD_LOST_REASON_LABELS[lead.lostReasonCode]}`
                : ""}
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-[10px] border border-pn-border bg-white space-y-3 p-4">
          <h3 className="text-[15px] font-semibold">Takip / not / görev</h3>
          {canWrite ? (
            <>
              <form action={scheduleLeadFollowUp} className="grid gap-2 items-end">
                <input type="hidden" name="leadId" value={lead.id} />
                <label className="text-[13px] font-medium">
                  Takip tarihi
                  <input
                    name="nextFollowUpAt"
                    type="datetime-local"
                    required
                    className={inputClass("mt-1 w-full")}
                  />
                </label>
                <input
                  name="taskTitle"
                  placeholder="Görev (ör. Ara)"
                  className={inputClass("w-auto")}
                />
                <textarea
                  name="note"
                  placeholder="Not"
                  className={inputClass("min-h-16 w-auto")}
                />
                <select
                  name="assignedUserId"
                  defaultValue={lead.assignedUserId || ""}
                  aria-label="Takip sorumlusu"
                  className={inputClass("w-auto")}
                >
                  <option value="">Ben / mevcut sahip</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.fullName}
                    </option>
                  ))}
                </select>
                <button className={buttonClass("primary", "md")}>
                  Takip planla
                </button>
              </form>
              <form action={addLeadNote} className="flex">
                <input type="hidden" name="leadId" value={lead.id} />
                <input
                  name="note"
                  required
                  placeholder="Hızlı not"
                  className={inputClass("min-w-0 flex-1 w-auto")}
                />
                <button className={buttonClass("secondary", "md")}>
                  Not
                </button>
              </form>
              <form
                action={createLeadTask}
                className="grid grid-cols-[1fr_auto_auto] gap-0 items-end"
              >
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="setFollowUp" value="1" />
                <input
                  name="title"
                  required
                  placeholder="Görev"
                  className={inputClass("min-w-0 w-auto")}
                />
                <input
                  name="dueAt"
                  type="datetime-local"
                  aria-label="Görev son tarihi"
                  className={inputClass("w-auto")}
                />
                <button className={buttonClass("secondary", "sm")}>
                  Görev
                </button>
              </form>
            </>
          ) : null}
          <div className="space-y-2">
            {lead.tasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-md border px-3 py-2 text-[13px] ${task.dueAt && !task.completedAt && isFollowUpOverdue(task.dueAt) ? "border-rose-300 bg-rose-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    {task.note ? (
                      <p className="mt-1 text-[12px] text-pn-text-muted">
                        {task.note}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[12px] text-pn-text-muted">
                      {task.completedAt
                        ? `Tamamlandı ${dt.format(task.completedAt)}`
                        : task.dueAt
                          ? `Son ${dt.format(task.dueAt)}`
                          : "Tarihsiz"}
                    </p>
                  </div>
                  {canWrite && !task.completedAt ? (
                    <form action={completeLeadTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button className={buttonClass("secondary", "md", "underline")}>
                        Tamamla
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {lead.stage === "WON" || lead.wonAt ? (
        <section className="overflow-hidden rounded-[10px] border border-pn-border bg-white p-4">
          <h3 className="text-[15px] font-semibold">
            Kazanıldı — satış / sipariş
          </h3>
          <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
            <Link
              href={createSaleHref}
              className="rounded-md bg-pn-accent px-3 py-2 font-medium text-white"
            >
              Sipariş / satış oluştur
            </Link>
            {orderHref ? (
              <Link
                href={orderHref}
                className="rounded-md border px-3 py-2 font-medium"
              >
                Bağlı siparişi aç
              </Link>
            ) : null}
            {lead.relatedOdUserId || lead.relatedOdkUserId ? (
              <Link
                href={`/panel/yonetim/kullanicilar/${lead.relatedOdUserId || lead.relatedOdkUserId}`}
                className="rounded-md border px-3 py-2 font-medium"
              >
                Öğrenci hesabı
              </Link>
            ) : null}
          </div>
          <p className="mt-2 text-[12px] text-pn-text-muted">
            Provisioning: OD{" "}
            {provisioning?.odStatus ||
              (lead.relatedOdOrderId ? "bağlı" : "yok")}{" "}
            · ODK{" "}
            {provisioning?.odkStatus ||
              (lead.relatedOdkOrderId ? "bağlı" : "yok")}
          </p>
          {canWrite && !orderHref ? (
            <form
              action={linkLeadOrder}
              className="mt-3 grid gap-2 sm:grid-cols-3 items-end"
            >
              <input type="hidden" name="leadId" value={lead.id} />
              <select
                name="product"
                defaultValue={
                  lead.productInterest === "ONLINE_DENEME_KULUBU" ? "ODK" : "OD"
                }
                className={inputClass("w-auto")}
              >
                <option value="OD">onlinedershanem. siparişi</option>
                <option value="ODK">onlinedenemekulübüm. siparişi</option>
              </select>
              <input
                name="orderId"
                required
                placeholder="Sipariş ID"
                className={inputClass("w-auto")}
              />
              <button className={buttonClass("secondary", "md")}>
                Mevcut siparişe bağla
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-[10px] border border-pn-border bg-white p-4">
          <h3 className="text-[15px] font-semibold">Instagram konuşması</h3>
          {lead.conversation ? (
            <>
              <Link
                href={`/panel/yonetim/isletme/mesaj-kutusu?conversation=${lead.conversation.id}`}
                className="mt-2 inline-block text-[13px] font-medium text-pn-accent underline"
              >
                Mesaj kutusunda aç
              </Link>
              <div className="mt-3 max-h-64 space-y-2 overflow-auto">
                {[...lead.conversation.messages].reverse().map((message) => (
                  <article
                    key={message.id}
                    className={`rounded-md px-3 py-2 text-[13px] ${message.direction === "OUTBOUND" ? "ml-6 bg-pn-accent text-white" : "mr-6 bg-pn-surface-subtle"}`}
                  >
                    <p>{message.body || "Medya"}</p>
                    <p className="mt-1 text-[12px] opacity-70">
                      {dt.format(message.occurredAt)}
                    </p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-[13px] text-pn-text-muted">
              Bağlı Instagram konuşması yok.
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-[10px] border border-pn-border bg-white p-4">
          <h3 className="text-[15px] font-semibold">Teklifler / ödemeler</h3>
          {lead.financialTransactions.length ? (
            lead.financialTransactions.map((tx) => (
              <p key={tx.id} className="mt-2 border-t pt-2 text-[13px]">
                {tx.description} · {tl.format(tx.netCents / 100)} · {tx.status}
              </p>
            ))
          ) : (
            <p className="mt-2 text-[13px] text-pn-text-muted">
              Ödeme kaydı yok.
            </p>
          )}
          <h3 className="mt-4 text-[15px] font-semibold">Timeline</h3>
          <ol className="mt-2 max-h-72 space-y-2 overflow-auto">
            {timeline.map((item) => (
              <li key={item.id} className="border-t pt-2 text-[12px]">
                <strong>{item.label}</strong>
                {item.detail ? ` · ${item.detail}` : ""}
                <span className="block text-pn-text-muted">
                  {dt.format(item.at)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
