import { AiMode, ConversationStatus, LeadTemperature } from "@prisma/client";
import { AUTOMATION_ACTION_LABELS, AUTOMATION_TRIGGER_LABELS } from "@/lib/automation/definitions";
import { calculateAdMetrics } from "@/lib/business/finance";
import {
  LEAD_LOST_REASON_LABELS,
  LEAD_PRIORITY_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STAGE_LABELS,
  LEAD_STAGES,
  PRODUCT_INTEREST_LABELS,
  isFollowUpOverdue,
  leadDisplayName,
} from "@/lib/business/leads";
import type { BusinessPermission } from "@/lib/business/permission-matrix";
import type { BusinessSectionData } from "@/lib/business/section-data-server";
import { SECTION_LABELS, type BusinessSectionSlug } from "@/lib/business/sections";
import { formatIstanbulDateInput } from "@/lib/istanbul-time";
import type { MobileBusinessCard, MobileBusinessLead, MobileBusinessRow, MobileBusinessSection } from "@/lib/mobile-contracts/business";
import { deriveLeadLifecycleStatus } from "@/lib/panel/operations-inbox";

/**
 * İŞLETME mobil projeksiyonu (P2.7). Web `isletme/[section]` sayfasının
 * gösterdiği alanlar ve hesaplar (ör. `calculateAdMetrics`, `leadDisplayName`,
 * `deriveLeadLifecycleStatus`, aşama / kaynak etiketleri) aynen kullanılır;
 * tablo ve grafikler karta çevrilir.
 */

type Tone = MobileBusinessCard["metrics"][number]["tone"];
type Ctx = { section: BusinessSectionSlug; data: BusinessSectionData; units: { id: string; name: string }[]; granted: ReadonlySet<BusinessPermission>; query: Record<string, string | string[] | undefined> };

const tl = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const dt = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });
const money = (cents: number) => tl.format(cents / 100);
const metric = (label: string, value: string | number, tone: Tone = "neutral") => ({ label, value: String(value), tone });
const row = (title: string, parts: Partial<Omit<MobileBusinessRow, "title">> = {}): MobileBusinessRow => ({ id: parts.id ?? null, title, subtitle: parts.subtitle ?? null, meta: parts.meta ?? null, badge: parts.badge ?? null, target: parts.target ?? null });
const card = (id: string, title: string, parts: { note?: string | null; metrics?: MobileBusinessCard["metrics"]; rows?: MobileBusinessRow[]; empty?: string }): MobileBusinessCard => ({
  id,
  title,
  note: parts.note ?? null,
  metrics: parts.metrics ?? [],
  rows: parts.rows ?? [],
  empty: (parts.rows ?? []).length || (parts.metrics ?? []).length ? null : (parts.empty ?? "Kayıt bulunmuyor."),
});

const RANGE_SECTIONS: BusinessSectionSlug[] = ["genel-bakis", "gelirler", "giderler", "vergiler", "raporlar"];
const enumOptions = (values: string[], all: string) => [{ value: "ALL", label: all }, ...values.map((value) => ({ value, label: value }))];

function leadAnalyticsCards(data: BusinessSectionData): MobileBusinessCard[] {
  const a = data.leadAnalytics;
  if (!a) return [];
  const owner = (id: string | null) => (id ? (data.ownerNameMap[id] ?? "Bilinmeyen sorumlu") : "Sorumlu yok");
  return [
    card("lead-metrics", "CRM satış metrikleri", {
      metrics: [metric("Aday", a.leadCount), metric("Açık", a.openLeadCount), metric("Kazanılan", a.wonLeadCount, "success"), metric("Kaybedilen", a.lostLeadCount), metric("Geciken takip", a.followUpOverdueCount, a.followUpOverdueCount ? "warning" : "neutral")],
    }),
    card("lead-sources", "Kaynağa göre dönüşüm", { rows: a.sourceConversion.map((item) => row(LEAD_SOURCE_LABELS[item.source], { meta: `${item.won}/${item.total} kazanıldı · %${Math.round(item.rate * 100)}` })), empty: "Bu aralıkta aday yok." }),
    card("lead-stages", "Aşama dağılımı", { rows: a.stageConversion.map((item) => row(LEAD_STAGE_LABELS[item.stage], { meta: String(item.count) })), empty: "Bu aralıkta aday yok." }),
    card("lead-stage-time", "Aşamada ortalama süre", { rows: a.averageMsInStage.map((item) => row(LEAD_STAGE_LABELS[item.stage], { meta: `${(item.averageMs / 86_400_000).toFixed(1)} gün · ${item.samples} örnek` })), empty: "Yeterli geçiş verisi yok." }),
    card("lead-owners", "Sorumlu performansı", { rows: a.ownerPerformance.map((item) => row(owner(item.ownerId), { meta: `${item.total} aday · ${item.won} kazanılan · ${item.lost} kaybedilen · ${item.overdue} geciken` })), empty: "Sorumlu verisi yok." }),
    card("lead-lost", "Kayıp nedenleri", { rows: a.lostReasons.map((item) => row(item.code === "UNKNOWN" ? "Belirtilmedi" : LEAD_LOST_REASON_LABELS[item.code], { meta: String(item.count) })), empty: "Kayıp yok." }),
  ];
}

function overview(ctx: Ctx): MobileBusinessCard[] {
  const { data } = ctx;
  const k = data.kpis;
  if (!k) return [];
  return [
    card("kpis", "Göstergeler", {
      metrics: [metric("Konuşma", k.conversationTotal), metric("Yeni aday", k.newLeads), metric("Satış", k.wonLeads, "success"), metric("Reklam harcaması", money(k.adSpendCents)), metric("Net gelir", money(k.netCents)), metric("İnsan bekleyen", k.waitingHumanConversations, k.waitingHumanConversations ? "warning" : "neutral")],
    }),
    card("operations", "Operasyon özeti", {
      metrics: [metric("Gelir", money(data.income), "success"), metric("Gider", money(data.expense), "critical"), metric("Tahmini net", money(k.netCents), "warning")],
      rows: (["NEW", "QUALIFIED", "WON"] as const).map((stage) => row(LEAD_STAGE_LABELS[stage], { meta: `${k.leadsByStage[stage] ?? 0} / ${k.leadTotal}` })),
    }),
    ...leadAnalyticsCards(data),
  ];
}

function inbox(ctx: Ctx): Pick<MobileBusinessSection, "cards" | "filters" | "nextCursor" | "conversation"> {
  const { data, query } = ctx;
  const value = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "ALL");
  const rows = data.conversations.map((c) =>
    row(c.displayName || c.username || c.instagramScopedUserId, {
      id: c.id,
      subtitle: c.messages[0]?.body || "Medya mesajı",
      meta: [dt.format(c.lastMessageAt), c.status, `AI ${c.aiMode}`, c.temperature, ...c.tags.slice(0, 2).map((tag) => `#${tag}`)].join(" · "),
      badge: c.unreadCount ? { label: String(c.unreadCount), tone: "warning" } : null,
      target: { kind: "conversation", id: c.id },
    }),
  );
  const selected = data.selected;
  const suggestion = selected?.aiExecutions[0]?.decision;
  const lead = selected?.lead ?? null;
  return {
    filters: [
      { key: "status", label: "Durum", value: value("status"), options: enumOptions(Object.values(ConversationStatus), "Tüm durumlar") },
      { key: "temperature", label: "Sıcaklık", value: value("temperature"), options: enumOptions(Object.values(LeadTemperature), "Tüm sıcaklıklar") },
      { key: "ai", label: "AI modu", value: value("ai"), options: enumOptions(Object.values(AiMode), "Tüm AI modları") },
      { key: "unread", label: "Okunma", value: query.unread === "1" ? "1" : "ALL", options: [{ value: "ALL", label: "Tümü" }, { value: "1", label: "Yalnız okunmamış" }] },
    ],
    cards: [card("conversations", "Konuşmalar", { note: `Filtreye uyan toplam ${data.inboxTotal} konuşma · ${data.conversations.length} tanesi gösteriliyor`, rows, empty: "Filtreyle eşleşen konuşma yok." })],
    nextCursor: data.nextCursor,
    conversation: selected
      ? {
          id: selected.id,
          name: selected.displayName || selected.instagramScopedUserId,
          summary: `${selected.temperature} · ${selected.productInterest} · ${selected.summary || "Özet bekleniyor"}`,
          tags: selected.tags,
          status: selected.status,
          aiMode: selected.aiMode,
          temperature: selected.temperature,
          assignedUserId: selected.assignedUserId,
          olderCursor: data.nextMessageCursor,
          messages: data.orderedMessages.map((m) => ({ id: m.id, body: m.body || "Medya", outbound: m.direction === "OUTBOUND", meta: `${m.senderType} · ${m.status} · ${dt.format(m.occurredAt)}${m.failureCode ? ` · ${m.failureCode}` : ""}` })),
          aiSuggestion: suggestion && typeof suggestion === "object" && !Array.isArray(suggestion) && "reply" in suggestion && typeof suggestion.reply === "string" ? suggestion.reply : null,
          leadId: lead?.id ?? null,
          revision: selected.updatedAt.toISOString(),
          staff: [{ value: "", label: "Atanmamış" }, ...data.staff.map((item) => ({ value: item.user.id, label: `${item.user.fullName || "İsimsiz"} · ${item.role}` }))],
          cards: lead
            ? [
                card("lead-activities", "Aday etkinliği", { rows: lead.activities.map((item) => row(item.type, { meta: dt.format(item.createdAt) })), empty: "Etkinlik yok." }),
                card("lead-tasks", "Görevler", { rows: lead.tasks.map((item) => row(item.title, { badge: item.completedAt ? { label: "Tamamlandı", tone: "success" } : { label: "Açık", tone: "info" } })), empty: "Görev yok." }),
                card("lead-payments", "Ödemeler", { rows: lead.financialTransactions.map((item) => row(item.description, { meta: money(item.netCents), badge: { label: item.status, tone: "neutral" } })), empty: "Ödeme yok." }),
                card("lead-attribution", "Kampanya atfı", { rows: lead.attributions.map((item) => row(item.campaign?.name || item.advertisement?.name || "—", { meta: `${item.model} · %${Number(item.confidence) * 100}` })), empty: "Atıf yok." }),
              ]
            : [],
        }
      : null,
  };
}

const FOCUS_OPTIONS = [
  { value: "today", label: "Bugün ilgilenmem gerekenler" },
  { value: "overdue", label: "Geciken takipler" },
  { value: "no_activity", label: "7+ gün temas yok" },
  { value: "all", label: "Tüm adaylar" },
];

function followUp(at: Date | null): MobileBusinessLead["followUp"] {
  if (!at) return { label: "Planlı takip yok", tone: "warning" };
  return isFollowUpOverdue(at) ? { label: `Takip gecikti: ${dt.format(at)}`, tone: "critical" } : { label: `Sonraki takip: ${dt.format(at)}`, tone: "info" };
}

function matchSuggestionId(value: unknown): string | null {
  return value && typeof value === "object" && !Array.isArray(value) && "leadId" in value && typeof (value as { leadId: unknown }).leadId === "string" ? (value as { leadId: string }).leadId : null;
}

function noteText(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const note = (metadata as { note?: unknown }).note;
  return typeof note === "string" ? note : null;
}

function leads(ctx: Ctx): Pick<MobileBusinessSection, "cards" | "filters" | "lead" | "notice"> {
  const { data } = ctx;
  const owners = data.uniqueOwners;
  const rows = data.leadWorklist.map((lead) => {
    const overdue = isFollowUpOverdue(lead.nextFollowUpAt);
    return row(leadDisplayName(lead), {
      id: lead.id,
      subtitle: `${LEAD_STAGE_LABELS[lead.stage]} · ${PRODUCT_INTEREST_LABELS[lead.productInterest]} · ${lead.assignedUserId ? (data.ownerNameMap[lead.assignedUserId] ?? "Sorumlu") : "Sorumlu yok"}`,
      meta: [lead.nextFollowUpAt ? `Takip ${dt.format(lead.nextFollowUpAt)}` : "Takip planı yok", lead.campaign?.name, lead.tasks.length ? `${lead.tasks.length} açık görev` : null].filter(Boolean).join(" · "),
      badge: overdue ? { label: "Gecikti", tone: "critical" } : lead.priority === "URGENT" || lead.priority === "HIGH" ? { label: LEAD_PRIORITY_LABELS[lead.priority], tone: "warning" } : null,
      target: { kind: "lead", id: lead.id },
    });
  });
  const d = data.leadDetail;
  let detail: MobileBusinessLead | null = null;
  if (d) {
    const lifecycle = deriveLeadLifecycleStatus({ stage: d.stage, productInterest: d.productInterest, relatedOdOrderId: d.relatedOdOrderId, relatedOdkOrderId: d.relatedOdkOrderId, relatedOdUserId: d.relatedOdUserId, relatedOdkUserId: d.relatedOdkUserId });
    const timeline = [
      ...d.activities.map((item) => ({ id: `a-${item.id}`, at: item.createdAt, label: item.type, detail: noteText(item.metadata) || [item.fromValue, item.toValue].filter(Boolean).join(" → ") })),
      ...d.tasks.map((item) => ({ id: `t-${item.id}`, at: item.createdAt, label: item.completedAt ? "TASK_DONE" : "TASK", detail: item.title })),
      ...d.financialTransactions.map((item) => ({ id: `f-${item.id}`, at: item.transactionAt, label: "PAYMENT", detail: `${item.description} · ${money(item.netCents)}` })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());
    const life = data.leadLifecycleDetail;
    const orderId = d.relatedOdOrderId ?? d.relatedOdkOrderId;
    detail = {
      id: d.id,
      name: leadDisplayName(d),
      stage: d.stage,
      stageLabel: LEAD_STAGE_LABELS[d.stage],
      subtitle: `${LEAD_SOURCE_LABELS[d.source]} · ${PRODUCT_INTEREST_LABELS[d.productInterest]} · ${LEAD_PRIORITY_LABELS[d.priority]}${d.estimatedValueCents ? ` · beklenen ${money(d.estimatedValueCents)}` : ""}`,
      lifecycle: { label: lifecycle.label, nextAction: lifecycle.nextAction },
      followUp: followUp(d.nextFollowUpAt),
      revision: d.updatedAt.toISOString(),
      assignedUserId: d.assignedUserId,
      priority: d.priority,
      owners: [{ value: "", label: "Atanmamış" }, ...data.uniqueOwners.map((owner) => ({ value: owner.id, label: owner.fullName }))],
      tasks: d.tasks.map((task) => ({ id: task.id, title: task.title, dueAt: task.dueAt?.toISOString() ?? null, done: Boolean(task.completedAt) })),
      duplicates: data.leadDuplicates.map((dup) => ({ value: dup.id, label: `${leadDisplayName(dup)} · ${LEAD_STAGE_LABELS[dup.stage]}` })),
      suggestionLeadId: matchSuggestionId(d.matchSuggestion),
      cards: [
        card("lead-info", "Bilgiler", {
          rows: [
            row("Telefon", { meta: d.phone || "—" }),
            row("E-posta", { meta: d.email || "—" }),
            row("Öğrenci", { meta: d.studentName || "—" }),
            row("Veli", { meta: d.parentName || "—" }),
            row("Sınıf / sınav", { meta: [d.grade, d.examType].filter(Boolean).join(" · ") || "—" }),
            row("Şehir", { meta: d.city || "—" }),
            row("Kampanya", { meta: d.campaign?.name || d.attributions[0]?.campaign?.name || "—" }),
            row("Etiketler", { meta: d.tags.length ? d.tags.join(", ") : "—" }),
            row("Sorumlu", { meta: d.assignedUserId ? (data.ownerNameMap[d.assignedUserId] ?? "—") : "Atanmamış" }),
            ...(d.stage === "LOST" ? [row("Kayıp nedeni", { meta: [d.lostReasonCode ? LEAD_LOST_REASON_LABELS[d.lostReasonCode] : null, d.lostReason].filter(Boolean).join(" · ") || "—" })] : []),
          ],
        }),
        card("lead-timeline", "Zaman çizelgesi", { rows: timeline.map((item) => row(item.label, { id: item.id, subtitle: item.detail || null, meta: dt.format(item.at) })), empty: "Henüz etkinlik yok." }),
        card("lead-attribution", "Atıf", { rows: d.attributions.map((item) => row(item.campaign?.name || item.advertisement?.name || "—", { meta: `${item.model} · %${Number(item.confidence) * 100}` })), empty: "Atıf yok." }),
        card("lead-duplicates", "Olası kopyalar", { rows: data.leadDuplicates.map((dup) => row(leadDisplayName(dup), { id: dup.id, meta: `${dup.phone || dup.email || "—"} · ${LEAD_STAGE_LABELS[dup.stage]}`, target: { kind: "lead", id: dup.id } })), empty: "Kopya aday yok." }),
        card("lead-lifecycle", "Satıştan erişime", {
          note: `${lifecycle.label} — ${lifecycle.nextAction}`,
          rows: [
            ...(orderId ? [row("Sipariş", { meta: [data.provisioning?.odStatus ?? data.provisioning?.odkStatus ?? null, life?.orderSummary?.provisioningGuidance ?? null].filter(Boolean).join(" · ") || null, target: { kind: "order", id: orderId } })] : []),
            ...(life?.timeline ?? []).map((event) => row(event.label, { id: event.id, subtitle: event.detail, meta: dt.format(event.occurredAt) })),
          ],
          empty: "Sipariş veya erişim bağı yok.",
        }),
      ],
    };
  }
  return {
    filters: [
      { key: "focus", label: "Odak", value: data.leadFocus, options: FOCUS_OPTIONS },
      { key: "stage", label: "Aşama", value: data.leadStageFilter, options: [{ value: "ALL", label: "Tüm aşamalar" }, ...LEAD_STAGES.map((stage) => ({ value: stage, label: LEAD_STAGE_LABELS[stage] }))] },
      { key: "owner", label: "Sorumlu", value: data.leadOwnerFilter, options: [{ value: "ALL", label: "Tüm sorumlular" }, { value: "UNASSIGNED", label: "Atanmamış" }, ...owners.map((owner) => ({ value: owner.id, label: owner.fullName }))] },
      { key: "source", label: "Kaynak", value: data.leadSourceFilter, options: [{ value: "ALL", label: "Tüm kaynaklar" }, ...Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({ value, label }))] },
      { key: "interest", label: "Ürün", value: data.leadInterestFilter, options: [{ value: "ALL", label: "Tüm ürünler" }, ...Object.entries(PRODUCT_INTEREST_LABELS).map(([value, label]) => ({ value, label }))] },
      { key: "campaign", label: "Kampanya", value: data.leadCampaignFilter, options: [{ value: "ALL", label: "Tüm kampanyalar" }, ...data.campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name }))] },
    ],
    cards: [card("worklist", "Aday iş listesi", { note: `${rows.length} aday`, rows, empty: "Bu görünümde aday yok." })],
    lead: detail,
    notice: data.selectedLeadId && !d ? "Aday bulunamadı veya erişim dışı." : null,
  };
}

function funnel(ctx: Ctx): MobileBusinessCard[] {
  const { data } = ctx;
  return [
    card("funnel-counts", "Aşama sayıları", { metrics: LEAD_STAGES.map((stage) => metric(LEAD_STAGE_LABELS[stage], data.funnelCounts[stage] ?? 0, stage === "WON" ? "success" : "neutral")) }),
    ...LEAD_STAGES.filter((stage) => data.funnelLeads.some((lead) => lead.stage === stage)).map((stage) =>
      card(`funnel-${stage}`, LEAD_STAGE_LABELS[stage], {
        rows: data.funnelLeads
          .filter((lead) => lead.stage === stage)
          .map((lead) => row(leadDisplayName(lead), { id: lead.id, subtitle: `${PRODUCT_INTEREST_LABELS[lead.productInterest]} · ${LEAD_PRIORITY_LABELS[lead.priority]}`, meta: lead.nextFollowUpAt ? `Takip ${dt.format(lead.nextFollowUpAt)}` : `Son temas ${dt.format(lead.lastContactAt)}`, badge: isFollowUpOverdue(lead.nextFollowUpAt) ? { label: "Gecikti", tone: "critical" } : null, target: { kind: "lead", id: lead.id } })),
      }),
    ),
  ];
}

function adsCard(data: BusinessSectionData): MobileBusinessCard {
  return card("ads", "Reklamlar", {
    rows: data.ads.map((ad) => {
      const m = calculateAdMetrics({ ...ad, leads: ad.leadCount, sales: ad.saleCount });
      return row(ad.name, {
        id: ad.id,
        subtitle: `${ad.adSet.campaign.name} · harcama ${money(ad.spentCents)}`,
        meta: `CPM ${money(m.cpmCents)} · CPC ${money(m.cpcCents)} · CTR %${(m.ctr * 100).toFixed(2)} · mesaj ${money(m.costPerMessageCents)} · lead ${money(m.costPerLeadCents)} · satış ${money(m.costPerSaleCents)}`,
        badge: { label: `ROAS ${m.roas.toFixed(2)}x`, tone: m.roas >= 1 ? "success" : "warning" },
      });
    }),
    empty: "Reklam kaydı yok.",
  });
}

function finance(ctx: Ctx): MobileBusinessCard[] {
  const expense = ctx.section === "giderler";
  const rows = ctx.data.transactions.filter((x) => (expense ? x.kind === "EXPENSE" : x.kind !== "EXPENSE"));
  return [
    card("transactions", expense ? "Giderler" : "Gelirler", {
      note: `${rows.length} kayıt · toplam net ${money(rows.filter((x) => !x.cancelledAt).reduce((sum, x) => sum + x.netCents, 0))}`,
      rows: rows.map((x) => row(x.description, { id: x.id, subtitle: `${dt.format(x.transactionAt)} · ${x.source} · ${x.category}`, meta: `Net ${money(x.netCents)} · Vergi ${money(x.vatCents)}`, badge: x.cancelledAt ? { label: "Ters kayıtlı", tone: "neutral" } : { label: x.status, tone: x.status === "PAID" ? "success" : "info" } })),
      empty: "Bu aralıkta kayıt yok.",
    }),
  ];
}

function taxes(ctx: Ctx): MobileBusinessCard[] {
  const { data } = ctx;
  const k = data.kpis;
  if (!k) return [];
  return [
    card("taxes", "Vergi özeti", {
      metrics: [metric("Vergi dahil gelir", money(data.income)), metric("Hesaplanan KDV", money(k.vatCents)), metric("İndirilecek KDV", money(data.deductibleVatCents)), metric("Stopaj", money(k.withholdingCents)), metric("Komisyon", money(k.commissionCents)), metric("Tahmini net kâr", money(data.income - data.expense - k.vatCents), "warning")],
    }),
    card("periods", "Muhasebe dönemleri", { rows: data.periods.map((item) => row(`${dt.format(item.startsAt)} – ${dt.format(item.endsAt)}`, { id: item.id, badge: { label: item.status, tone: item.status === "LOCKED" ? "neutral" : "info" } })), empty: "Dönem kaydı yok." }),
  ];
}

function sectionBody(ctx: Ctx): Pick<MobileBusinessSection, "cards"> & Partial<MobileBusinessSection> {
  const { data, granted } = ctx;
  switch (ctx.section) {
    case "genel-bakis":
      return { cards: overview(ctx) };
    case "mesaj-kutusu":
      return inbox(ctx);
    case "adaylar":
      return leads(ctx);
    case "satis-hunisi":
      return { cards: funnel(ctx) };
    case "kampanyalar":
      return {
        cards: [
          card("campaigns", "Kampanyalar", { rows: data.campaigns.map((c) => row(c.name, { id: c.id, subtitle: `${c.platform} · ${PRODUCT_INTEREST_LABELS[c.productInterest]} · ${c.adSets.length} reklam seti`, meta: `Bütçe ${money(c.budgetCents)} · harcama ${money(c.spentCents)}`, badge: { label: c.status, tone: c.status === "ACTIVE" ? "success" : "neutral" } })), empty: "Kampanya yok." }),
          adsCard(data),
        ],
      };
    case "reklamlar":
      return { cards: [adsCard(data)] };
    case "gelirler":
    case "giderler":
      return { cards: finance(ctx) };
    case "vergiler":
      return { cards: taxes(ctx), notice: "Bu ekran operasyonel takip ve tahmini raporlama amaçlıdır. Resmî beyan ve muhasebe işlemleri için mali müşavir kontrolü gerekir. Tutarlar KDV dahil hesaplanır." };
    case "mutabakat":
      return { cards: [card("reconciliation", "Mutabakat kayıtları", { rows: data.reconciliations.map((x) => row(`${x.provider} · ${x.externalId || "—"}`, { id: x.id, meta: `Beklenen ${money(x.expectedCents || 0)} · Gerçek ${money(x.actualCents || 0)}`, badge: { label: x.status, tone: x.status === "MATCHED" ? "success" : "warning" } })), empty: "Mutabakat kaydı yok; taramayı çalıştırın." })] };
    case "raporlar":
      return { cards: leadAnalyticsCards(data), notice: "CSV dışa aktarımı mobilde sunulmaz (E5); web panelinden indirilebilir." };
    case "ai-bilgi-merkezi":
      return {
        cards: [
          card("knowledge", "Bilgi kayıtları", { rows: data.knowledge.map((x) => row(x.title, { id: x.id, subtitle: `${x.category} · ${x.source || "Manuel"}`, badge: { label: `v${x.version} · ${x.isActive ? "Aktif" : "Pasif"}`, tone: x.isActive ? "success" : "neutral" } })), empty: "Bilgi merkezi kaydı yok." }),
          card("prompts", "AI prompt sürümleri", { rows: data.prompts.map((x) => row(`${x.name} v${x.version}`, { id: x.id, badge: { label: x.isActive ? "Aktif" : "Pasif", tone: x.isActive ? "success" : "neutral" } })), empty: "Prompt sürümü yok." }),
        ],
      };
    case "otomasyon-kurallari":
      return {
        cards: [
          card("rules", "Otomasyon kuralları", {
            rows: data.rules.map((rule) =>
              row(rule.name, {
                id: rule.id,
                subtitle: `${AUTOMATION_TRIGGER_LABELS[rule.triggerType as keyof typeof AUTOMATION_TRIGGER_LABELS] || rule.triggerType} · ${actionSummary(rule.actions)}`,
                meta: `Son çalışma: ${rule.lastRunAt ? dt.format(rule.lastRunAt) : "Henüz yok"} · Çalıştırma: ${rule.runCount} · Hata (son 5): ${rule.executions.filter((item) => item.result === "FAILED").length}`,
                badge: { label: rule.isActive ? "Aktif" : "Pasif", tone: rule.isActive ? "success" : "neutral" },
              }),
            ),
            empty: "Otomasyon kuralı yok.",
          }),
          card("executions", "Son çalıştırmalar", { rows: data.rules.flatMap((rule) => rule.executions.map((execution) => row(rule.name, { id: execution.id, subtitle: `${execution.dryRun ? "DRY · " : ""}${execution.result}${execution.matched ? " · eşleşti" : " · eşleşmedi"} · ${execution.durationMs} ms${execution.errorCode ? ` · ${execution.errorCode}` : ""}`, meta: dt.format(execution.createdAt), badge: execution.result === "FAILED" ? { label: "Hata", tone: "critical" } : null }))), empty: "Çalıştırma yok." }),
        ],
      };
    case "entegrasyonlar":
      return {
        cards: [
          card("integrations", "Entegrasyonlar", {
            note: "Secret değerleri yalnız sunucu ortamından okunur. Bağlantı kurulumu mobilde yok (E3).",
            rows: ["INSTAGRAM", "OPENAI", "META_ADS", "EMAIL"].map((provider) => {
              const item = data.integrations.find((x) => x.provider === provider);
              const status = item?.status || "DISCONNECTED";
              return row(provider, { meta: `Son kontrol: ${item?.lastHealthAt ? dt.format(item.lastHealthAt) : "Henüz yok"}${item?.lastErrorCode ? ` · ${item.lastErrorCode}` : ""}`, badge: { label: status, tone: status === "CONNECTED" ? "success" : status === "DISCONNECTED" ? "neutral" : "warning" } });
            }),
          }),
        ],
      };
    case "sistem-kayitlari":
      return {
        cards: [
          card("jobs", "Arka plan işleri", { rows: data.jobs.map((x) => row(x.type, { id: x.id, meta: `deneme ${x.attempts}/${x.maxAttempts}`, badge: { label: x.status, tone: x.status === "FAILED" ? "critical" : "neutral" } })), empty: "İş kaydı yok." }),
          card("audit", "Audit kayıtları", { rows: data.audit.map((x) => row(x.action, { id: x.id, subtitle: x.entityType, meta: dt.format(x.createdAt) })), empty: "Audit kaydı yok." }),
        ],
      };
    case "ayarlar":
      return {
        cards: [
          card("defaults", "Güvenli varsayılanlar", { rows: ["AI başlangıç modu: SUGGESTION", "Kapalı/spam konuşmalar saklama süresi sonunda anonimleştirilir.", "Finans kayıtları hard delete edilmez; ters kayıt kullanılır.", "Entegrasyon anahtarları istemciye gönderilmez."].map((text) => row(text)) }),
          card("retention", "KVKK saklama süresi", { rows: data.settingsUnits.map((unit) => row(unit.name, { id: unit.id, meta: `${unit.retentionDays} gün` })), empty: "İş birimi yok." }),
          ...(granted.has("role:read") ? [card("roles", "İş birimi rolleri", { rows: data.roleAssignments.map((item) => row(item.user.fullName || "İsimsiz", { id: item.id, subtitle: item.businessUnit.name, badge: { label: item.role, tone: "info" } })), empty: "Rol ataması yok." })] : []),
        ],
      };
  }
}

function actionSummary(actions: unknown): string {
  if (!Array.isArray(actions)) return "—";
  return actions.map((item) => {
    const type = item && typeof item === "object" && "type" in item ? String((item as { type: string }).type) : "?";
    return AUTOMATION_ACTION_LABELS[type as keyof typeof AUTOMATION_ACTION_LABELS] || type;
  }).join(", ") || "—";
}

export function toMobileBusinessSection(ctx: Ctx): MobileBusinessSection {
  const { section, data, units } = ctx;
  const body = sectionBody(ctx);
  return {
    contractVersion: 1,
    slug: section,
    label: SECTION_LABELS[section],
    units: units.map((unit) => unit.name).join(" · "),
    range: RANGE_SECTIONS.includes(section) ? { from: formatIstanbulDateInput(data.from), to: formatIstanbulDateInput(data.to), notice: data.rangeNotice ?? null } : null,
    product: section === "genel-bakis" ? { value: data.product, options: [{ value: "ALL", label: "Tüm ürünler" }, { value: "OD", label: "onlinedershanem." }, { value: "ODK", label: "OnlineDenemeKulübü" }] } : null,
    filters: body.filters ?? [],
    notice: body.notice ?? null,
    cards: body.cards,
    nextCursor: body.nextCursor ?? null,
    conversation: body.conversation ?? null,
    lead: body.lead ?? null,
    can: { conversationRead: ctx.granted.has("conversation:read"), conversationReply: ctx.granted.has("conversation:reply"), leadWrite: ctx.granted.has("lead:write") },
    options: {
      stages: LEAD_STAGES.map((stage) => ({ value: stage, label: LEAD_STAGE_LABELS[stage] })),
      lostReasons: Object.entries(LEAD_LOST_REASON_LABELS).map(([value, label]) => ({ value, label })),
      priorities: Object.entries(LEAD_PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
      aiModes: Object.values(AiMode).map((value) => ({ value, label: value })),
      statuses: Object.values(ConversationStatus).map((value) => ({ value, label: value })),
      productInterests: Object.entries(PRODUCT_INTEREST_LABELS).map(([value, label]) => ({ value, label })),
      units: units.map((unit) => ({ value: unit.id, label: unit.name })),
    },
  };
}


