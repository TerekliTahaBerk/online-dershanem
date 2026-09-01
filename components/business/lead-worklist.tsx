import Link from "next/link";
import type { LeadSource, LeadStage, ProductInterest } from "@prisma/client";
import {
  LEAD_PRIORITY_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STAGE_LABELS,
  LEAD_STAGES,
  PRODUCT_INTEREST_LABELS,
  isFollowUpOverdue,
  isFollowUpToday,
  leadDisplayName,
  nextActionForLead,
  type LeadListFocus,
} from "@/lib/business/leads";
import type { LeadListItem } from "@/lib/business/queries/leads";

const dt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  dateStyle: "short",
  timeStyle: "short",
});

type OwnerOption = { id: string; fullName: string };
type CampaignOption = { id: string; name: string };

type Props = {
  leads: LeadListItem[];
  owners: OwnerOption[];
  campaigns: CampaignOption[];
  filters: {
    focus: LeadListFocus;
    stage?: string;
    ownerId?: string;
    source?: string;
    campaignId?: string;
    interest?: string;
    q?: string;
  };
  selectedLeadId?: string;
};

const FOCUS_OPTIONS: Array<{ value: LeadListFocus; label: string }> = [
  { value: "today", label: "Bugün ilgilenmem gerekenler" },
  { value: "overdue", label: "Geciken takipler" },
  { value: "no_activity", label: "7+ gün temas yok" },
  { value: "all", label: "Tüm adaylar" },
];

export function LeadWorklist({ leads, owners, campaigns, filters, selectedLeadId }: Props) {
  return (
    <div className="space-y-4">
      <form method="get" className="panel-surface grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Aday filtreleri">
        <label className="text-xs font-bold">
          Odak
          <select name="focus" defaultValue={filters.focus} className="mt-1 w-full rounded-xl border px-3 py-2 text-xs">
            {FOCUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          Aşama
          <select name="stage" defaultValue={filters.stage ?? "ALL"} className="mt-1 w-full rounded-xl border px-3 py-2 text-xs">
            <option value="ALL">Tümü</option>
            {LEAD_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {LEAD_STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          Sorumlu
          <select name="owner" defaultValue={filters.ownerId ?? "ALL"} className="mt-1 w-full rounded-xl border px-3 py-2 text-xs">
            <option value="ALL">Tümü</option>
            <option value="UNASSIGNED">Atanmamış</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          Kaynak
          <select name="source" defaultValue={filters.source ?? "ALL"} className="mt-1 w-full rounded-xl border px-3 py-2 text-xs">
            <option value="ALL">Tümü</option>
            {(Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]).map((source) => (
              <option key={source} value={source}>
                {LEAD_SOURCE_LABELS[source]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          Kampanya
          <select name="campaign" defaultValue={filters.campaignId ?? "ALL"} className="mt-1 w-full rounded-xl border px-3 py-2 text-xs">
            <option value="ALL">Tümü</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          İlgi
          <select name="interest" defaultValue={filters.interest ?? "ALL"} className="mt-1 w-full rounded-xl border px-3 py-2 text-xs">
            <option value="ALL">Tümü</option>
            {(Object.keys(PRODUCT_INTEREST_LABELS) as ProductInterest[]).map((interest) => (
              <option key={interest} value={interest}>
                {PRODUCT_INTEREST_LABELS[interest]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold sm:col-span-2">
          Ara
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Ad, telefon, e-posta…"
            className="mt-1 w-full rounded-xl border px-3 py-2 text-xs"
          />
        </label>
        <button className="rounded-xl bg-[var(--brand-olive)] px-3 py-2 text-xs font-bold text-white xl:col-span-4">
          Filtrele
        </button>
      </form>

      <p className="text-xs text-[var(--site-muted)]">
        {filters.focus === "today"
          ? "Bugün ilgilenmen gereken adaylar — gecikenler üstte."
          : `${leads.length} aday listeleniyor.`}
      </p>

      <div className="space-y-2">
        {leads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--site-line)] px-5 py-10 text-center text-sm text-[var(--site-muted)]">
            Bu filtreyle aday yok. Takip tarihi planlayın veya &quot;Tüm adaylar&quot;a geçin.
          </div>
        ) : (
          leads.map((lead) => {
            const overdue = isFollowUpOverdue(lead.nextFollowUpAt);
            const today = isFollowUpToday(lead.nextFollowUpAt);
            const action = nextActionForLead(lead);
            const href = `/panel/yonetim/isletme/adaylar?lead=${lead.id}&focus=${filters.focus}`;
            const campaignName =
              lead.campaign?.name || lead.attributions[0]?.campaign?.name || null;
            return (
              <Link
                key={lead.id}
                href={href}
                className={`panel-surface block p-4 transition hover:bg-[var(--site-bg-warm)] ${selectedLeadId === lead.id ? "ring-2 ring-[var(--brand-olive)]" : ""} ${overdue ? "border-rose-300" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="truncate text-sm">{leadDisplayName(lead)}</strong>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold">
                        {LEAD_STAGE_LABELS[lead.stage as LeadStage]}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold">
                        {LEAD_PRIORITY_LABELS[lead.priority]}
                      </span>
                      {overdue ? (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          Gecikmiş takip
                        </span>
                      ) : today ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          Bugün
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--site-muted)]">
                      İstiyor: {PRODUCT_INTEREST_LABELS[lead.productInterest]}
                      {campaignName ? ` · ${campaignName}` : ""}
                      {" · "}
                      {LEAD_SOURCE_LABELS[lead.source]}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-[var(--site-muted)]">
                    <p>Son temas</p>
                    <time dateTime={lead.lastContactAt.toISOString()}>{dt.format(lead.lastContactAt)}</time>
                  </div>
                </div>
                <p className={`mt-3 text-xs font-bold ${overdue ? "text-rose-700" : "text-[var(--brand-olive)]"}`}>
                  Sıradaki: {action}
                  {lead.nextFollowUpAt ? ` · Takip ${dt.format(lead.nextFollowUpAt)}` : ""}
                </p>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
