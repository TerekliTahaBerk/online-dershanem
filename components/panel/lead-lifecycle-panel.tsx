import Link from "next/link";
import type { LeadLifecycleDetail } from "@/lib/lifecycle/lead-detail-server";
import {
  LIFECYCLE_LEAD_LABELS,
  LIFECYCLE_ORDER_LABELS,
  LIFECYCLE_PROVISIONING_LABELS,
  LIFECYCLE_STUDENT_LABELS,
} from "@/lib/lifecycle/states";

const dt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  dateStyle: "short",
  timeStyle: "short",
});

const KIND_DOT: Record<string, string> = {
  INSTAGRAM_MESSAGE: "bg-sky-500",
  LEAD_CREATED: "bg-[var(--brand-olive)]",
  CONTACTED: "bg-amber-500",
  OFFERED: "bg-violet-500",
  WON: "bg-emerald-600",
  ORDER: "bg-slate-600",
  PAYMENT: "bg-emerald-500",
  PROVISIONING: "bg-orange-500",
  STUDENT_ACCOUNT: "bg-teal-600",
  NOTE: "bg-slate-400",
  OTHER: "bg-slate-300",
};

export function LeadLifecyclePanel({
  detail,
  linkAction,
}: {
  detail: LeadLifecycleDetail;
  linkAction?: (formData: FormData) => void | Promise<void>;
}) {
  const handoffTone =
    detail.handoff.tone === "critical"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : detail.handoff.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : detail.handoff.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-[var(--site-line)] bg-white text-[var(--site-ink)]";

  return (
    <section className="panel-surface grid gap-4 p-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--site-muted)]">Lifecycle</p>
          <h2 className="mt-1 text-lg font-extrabold">
            {LIFECYCLE_LEAD_LABELS[detail.lifecycleLeadStage]}
            <span className="ml-2 text-xs font-bold text-[var(--site-muted)]">({detail.stage})</span>
          </h2>
        </div>

        <div className={`rounded-2xl border p-3 text-sm ${handoffTone}`}>
          <p className="font-extrabold">{detail.handoff.label}</p>
          <p className="mt-1 text-xs opacity-90">{detail.handoff.nextAction}</p>
          {!detail.wonLinksComplete ? (
            <p className="mt-2 text-xs font-bold">WON kaydında sipariş veya öğrenci bağı eksik.</p>
          ) : null}
        </div>

        <div className="rounded-2xl border p-3 text-xs">
          <p className="font-extrabold">Bağlı kayıtlar</p>
          <ul className="mt-2 space-y-1">
            <li>
              OD sipariş:{" "}
              {detail.links.odOrderId ? (
                <Link className="font-bold underline text-[var(--brand-olive)]" href={`/panel/yonetim/siparisler/${detail.links.odOrderId}`}>
                  {detail.links.odOrderId}
                </Link>
              ) : (
                "—"
              )}
            </li>
            <li>
              ODK sipariş:{" "}
              {detail.links.odkOrderId ? (
                <Link className="font-bold underline text-[var(--brand-olive)]" href={`/panel/yonetim/siparisler/${detail.links.odkOrderId}`}>
                  {detail.links.odkOrderId}
                </Link>
              ) : (
                "—"
              )}
            </li>
            <li>
              Öğrenci hesabı:{" "}
              {detail.links.odUserId || detail.links.odkUserId ? (
                <Link
                  className="font-bold underline text-[var(--brand-olive)]"
                  href={`/panel/yonetim/kullanicilar/${detail.links.odUserId || detail.links.odkUserId}`}
                >
                  {detail.links.odUserId || detail.links.odkUserId}
                </Link>
              ) : (
                "—"
              )}
            </li>
            <li>
              Öğrenci profili:{" "}
              {detail.links.studentProfileId ? (
                <Link className="font-bold underline text-[var(--brand-olive)]" href={`/panel/yonetim/ogrenciler/${detail.links.studentProfileId}`}>
                  {detail.links.studentProfileId}
                </Link>
              ) : (
                "—"
              )}
            </li>
          </ul>
        </div>

        {detail.orderSummary ? (
          <div className="rounded-2xl border p-3 text-xs">
            <p className="font-extrabold">
              {detail.orderSummary.product} sipariş · {LIFECYCLE_ORDER_LABELS[detail.orderSummary.status]}
            </p>
            {detail.orderSummary.provisioning ? (
              <p className="mt-1">
                Provisioning: {LIFECYCLE_PROVISIONING_LABELS[detail.orderSummary.provisioning]}
                <span className="text-[var(--site-muted)]"> ({detail.orderSummary.rawProvisioning})</span>
              </p>
            ) : null}
            {detail.orderSummary.provisioningGuidance && detail.orderSummary.provisioning !== "COMPLETED" ? (
              <p className="mt-2 rounded-xl bg-rose-50 p-2 text-rose-900">{detail.orderSummary.provisioningGuidance}</p>
            ) : null}
            {detail.orderSummary.provisioning === "FAILED" || detail.orderSummary.provisioning === "NEEDS_REVIEW" ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  href={`/panel/yonetim/siparisler/${detail.orderSummary.id}`}
                  className="rounded-xl border px-3 py-1.5 font-bold text-[var(--brand-olive)]"
                >
                  İncele
                </Link>
                <Link
                  href={`/panel/yonetim/siparisler/${detail.orderSummary.id}`}
                  className="rounded-xl border px-3 py-1.5 font-bold"
                >
                  Retry / Manuel çöz
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {detail.studentStatus ? (
          <p className="text-xs">
            Öğrenci onboarding: <strong>{LIFECYCLE_STUDENT_LABELS[detail.studentStatus]}</strong>
          </p>
        ) : null}

        <div className="rounded-2xl border p-3 text-xs">
          <p className="font-extrabold">Kimlik eşleştirme</p>
          <p className="mt-1">{detail.identityMatch.message}</p>
          {detail.identityMatch.candidate ? (
            <p className="mt-1 text-[var(--site-muted)]">
              Aday: {detail.identityMatch.candidate.fullName || detail.identityMatch.candidate.email} ·{" "}
              {detail.identityMatch.reasons.join(", ")} · %{Math.round(detail.identityMatch.confidence * 100)}
            </p>
          ) : null}
          {linkAction && (detail.identityMatch.decision === "SUGGEST" || detail.identityMatch.decision === "LINK") && detail.identityMatch.candidate ? (
            <form action={linkAction} className="mt-2 flex flex-wrap gap-2">
              <input type="hidden" name="leadId" value={detail.leadId} />
              <input type="hidden" name="userId" value={detail.identityMatch.candidate.userId} />
              <button className="rounded-xl bg-[var(--brand-olive)] px-3 py-1.5 font-bold text-white">Mevcut hesaba bağla</button>
            </form>
          ) : null}
          {linkAction && detail.stage === "WON" && !detail.wonLinksComplete ? (
            <form action={linkAction} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="leadId" value={detail.leadId} />
              <input type="hidden" name="force" value="1" />
              <input name="odOrderId" placeholder="OD sipariş id" className="rounded-xl border px-2 py-1.5" />
              <input name="userId" placeholder="Öğrenci user id" className="rounded-xl border px-2 py-1.5" />
              <button className="rounded-xl border px-3 py-1.5 font-bold">Manuel bağla</button>
            </form>
          ) : null}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--site-muted)]">Timeline</p>
        <ol className="relative mt-3 space-y-0 border-l border-[var(--site-line)] pl-4">
          {detail.timeline.map((event) => (
            <li key={event.id} className="relative pb-4">
              <span
                className={`absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full ${KIND_DOT[event.kind] ?? KIND_DOT.OTHER}`}
                aria-hidden
              />
              <p className="text-sm font-bold">{event.label}</p>
              {event.detail ? <p className="mt-0.5 text-[11px] text-[var(--site-muted)]">{event.detail}</p> : null}
              <p className="mt-0.5 text-[10px] text-[var(--site-muted)]">{dt.format(event.occurredAt)}</p>
              {event.href ? (
                <Link href={event.href} className="mt-1 inline-block text-[11px] font-bold underline text-[var(--brand-olive)]">
                  Aç
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
