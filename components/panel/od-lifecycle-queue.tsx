import { AlertTriangle, CheckCircle2, Clock3, UserCheck } from "lucide-react";
import { OrderLinkForm } from "@/components/panel/order-link-form";
import { OdOnboardingControl } from "@/components/panel/od-onboarding-control";
import { OD_ONBOARDING_LABELS, OD_ONBOARDING_NEXT_ACTION } from "@/lib/od/onboarding-state";
import { OD_NO_SLOT_OPTIONS, OD_TIME_RANGE_OPTIONS } from "@/lib/od/placement";
import { OD_LIFECYCLE_EXCEPTION_ACTIONS, OD_LIFECYCLE_EXCEPTION_LABELS } from "@/lib/od/lifecycle-exceptions";
import type { OdLifecycleQueue, OdLifecycleRow } from "@/lib/od/lifecycle-queue-server";

/**
 * OPERASYON KUYRUĞU — İSTİSNA ÖNCE (OD-013).
 *
 * Ödeme sonrası akış otomatikleştikten sonra "tüm ödenmiş siparişler" listesi
 * operasyonu yanıltıyordu: kendi kendine ilerleyen onlarca satır, gerçekten
 * bakılması gereken birkaç kaydı gömüyordu. Ekran artık şu sırayla okunur:
 *
 *   1. İSTİSNALAR — otomasyon ilerleyemiyor.
 *   2. İNSAN KARARI — yerleştirme ve ilk ders; arıza değil, işin kendisi.
 *   3. OTOMATİK — yalnız sayı. Satır basmak dikkat çalar.
 */

const dateTime = new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" });

function QueueRow({
  item,
  students,
  staff,
  tone,
}: {
  item: OdLifecycleRow;
  students: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  tone: "exception" | "decision";
}) {
  return (
    <article className="p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {item.codes.length ? (
              item.codes.map((code) => (
                <span key={code} className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-extrabold text-rose-800">
                  <AlertTriangle size={11} aria-hidden="true" /> {OD_LIFECYCLE_EXCEPTION_LABELS[code]}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-900">{OD_ONBOARDING_LABELS[item.state]}</span>
            )}
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">{item.flowType === "EXISTING_STUDENT" ? "Mevcut öğrenci" : "Yeni öğrenci"}</span>
          </div>
          <h3 className="mt-2 text-sm font-extrabold text-[var(--site-ink)]">{item.packageName}</h3>
          <p className="mt-1 text-xs text-[var(--site-muted)]">{item.customerName} · {(item.totalCents / 100).toLocaleString("tr-TR")} ₺</p>
        </div>
        <dl className="grid min-w-[320px] grid-cols-2 gap-3 text-[10.5px]">
          <div>
            <dt className="text-[var(--site-muted)]">Sıradaki aksiyon</dt>
            <dd className="mt-1 font-bold text-[var(--site-ink)]">
              {item.codes.length ? OD_LIFECYCLE_EXCEPTION_ACTIONS[item.codes[0]] : OD_ONBOARDING_NEXT_ACTION[item.state]}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--site-muted)]">Sahip</dt>
            <dd className="mt-1 font-bold text-[var(--site-ink)]">{item.ownerName ?? "Atanmamış"}</dd>
          </div>
          <div>
            <dt className="text-[var(--site-muted)]">SLA</dt>
            <dd className={`mt-1 flex items-center gap-1 font-bold ${tone === "exception" && item.codes.includes("SLA_BREACHED") ? "text-rose-700" : "text-[var(--site-ink)]"}`}>
              <Clock3 size={12} aria-hidden="true" />{item.dueAt ? dateTime.format(item.dueAt) : "SLA yok"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--site-muted)]">Durum</dt>
            <dd className="mt-1 font-bold text-[var(--site-ink)]">{OD_ONBOARDING_LABELS[item.state]} · {dateTime.format(item.stateEnteredAt)}</dd>
          </div>
        </dl>
      </div>

      {item.placementPreferences ? (
        <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-[10.5px] leading-5 text-sky-950">
          <strong>Müsaitlik:</strong> {(item.placementPreferences.timeRanges || []).map((value) => OD_TIME_RANGE_OPTIONS.find((option) => option.value === value)?.label || value).join(" · ") || "Belirtilmedi"} · <strong>En erken:</strong> {item.placementPreferences.earliestStartDate || "hemen"} · <strong>Slot yoksa:</strong> {OD_NO_SLOT_OPTIONS.find((option) => option.value === item.placementPreferences?.noSlotPreference)?.label || item.placementPreferences.noSlotPreference || "iletişim"}
        </div>
      ) : null}

      {item.missing.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.missing.map((label) => <span key={label} className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-800">{label}</span>)}
        </div>
      ) : null}

      {item.blockerReason ? <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800"><strong>Bloker:</strong> {item.blockerReason}</p> : null}

      {!item.linkedUserId ? <OrderLinkForm orderId={item.orderId} students={students} /> : null}
      <OdOnboardingControl orderId={item.orderId} state={item.state} blockedFromState={item.blockedFromState} ownerId={item.ownerId} staff={staff} />

      <details className="mt-3">
        <summary className="cursor-pointer text-[10.5px] font-bold text-[var(--brand-olive)]">Son geçişler ({item.transitions.length})</summary>
        <div className="mt-2 space-y-1">
          {item.transitions.map((transition) => (
            <p key={transition.id} className="text-[10.5px] text-[var(--site-muted)]">
              {dateTime.format(transition.occurredAt)} · {transition.fromState ? `${OD_ONBOARDING_LABELS[transition.fromState]} → ` : ""}{OD_ONBOARDING_LABELS[transition.toState]} · {transition.actorName}{transition.note ? ` · ${transition.note}` : ""}
            </p>
          ))}
        </div>
      </details>
    </article>
  );
}

export function OdLifecycleQueueSection({
  queue,
  students,
  staff,
}: {
  queue: OdLifecycleQueue;
  students: { id: string; name: string }[];
  staff: { id: string; name: string }[];
}) {
  return (
    <>
      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        <article className="panel-metric-card">
          <p className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[var(--site-muted)]">İnsan bakışı gerekiyor</p>
          <p className="mt-3 text-2xl font-black text-[var(--site-ink)]">{queue.exceptions.length}</p>
          <p className="mt-1 text-[10.5px] text-[var(--site-muted)]">Otomasyon ilerleyemedi</p>
        </article>
        <article className="panel-metric-card">
          <p className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[var(--site-muted)]">Yerleştirme kararı</p>
          <p className="mt-3 text-2xl font-black text-[var(--site-ink)]">{queue.humanDecisions.length}</p>
          <p className="mt-1 text-[10.5px] text-[var(--site-muted)]">Grup ve ilk ders kararı bekliyor</p>
        </article>
        <article className="panel-metric-card">
          <p className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[var(--site-muted)]">Kendiliğinden ilerliyor</p>
          <p className="mt-3 text-2xl font-black text-[var(--site-ink)]">{queue.automatedCount}</p>
          <p className="mt-1 text-[10.5px] text-[var(--site-muted)]">{queue.activeCount} sipariş aktifleşti</p>
        </article>
      </section>

      <section className="panel-surface mt-7">
        <div className="flex flex-col gap-3 border-b border-[var(--site-line)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[var(--site-ink)]">İstisna kuyruğu</h2>
            <p className="mt-1 text-xs text-[var(--site-muted)]">Yalnız otomasyonun ilerleyemediği kayıtlar · davet, kimlik, veli onayı ve SLA</p>
          </div>
          <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-extrabold ${queue.exceptions.length ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>{queue.exceptions.length} istisna</span>
        </div>
        <div className="divide-y divide-[var(--site-line)]">
          {queue.exceptions.map((item) => <QueueRow key={item.onboardingId} item={item} students={students} staff={staff} tone="exception" />)}
          {!queue.exceptions.length ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <CheckCircle2 size={22} className="text-emerald-700" aria-hidden="true" />
              <p className="text-sm font-bold text-[var(--site-ink)]">İstisna yok.</p>
              <p className="text-xs text-[var(--site-muted)]">Ödeme sonrası hesap, davet ve veli bağlantısı akışı kendi kendine ilerliyor.</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel-surface mt-7">
        <div className="flex flex-col gap-3 border-b border-[var(--site-line)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-[var(--site-ink)]"><UserCheck size={17} aria-hidden="true" /> Yerleştirme kararı bekleyenler</h2>
            <p className="mt-1 text-xs text-[var(--site-muted)]">Hesabı kurulmuş öğrenciler · kapasiteye göre grup ve ilk ders kararı insana aittir</p>
          </div>
          <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-900">{queue.humanDecisions.length} kayıt</span>
        </div>
        <div className="divide-y divide-[var(--site-line)]">
          {queue.humanDecisions.map((item) => <QueueRow key={item.onboardingId} item={item} students={students} staff={staff} tone="decision" />)}
          {!queue.humanDecisions.length ? <p className="p-8 text-center text-sm text-[var(--site-muted)]">Yerleştirme bekleyen öğrenci yok.</p> : null}
        </div>
      </section>
    </>
  );
}
