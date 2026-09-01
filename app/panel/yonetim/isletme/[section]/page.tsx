import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, Bot, CircleDollarSign, Inbox, Megaphone, UsersRound } from "lucide-react";
import { AiMode, ConversationStatus, LeadSource, LeadStage, LeadTemperature, ProductInterest, type Prisma } from "@prisma/client";
import type { BusinessPermission } from "@/lib/business/permissions";
import { getUserBusinessPermissions, requireBusinessPage } from "@/lib/business/permissions";
import { FINANCE_SECTIONS, SECTION_LABELS, SECTION_PERMISSIONS, isBusinessSection, visibleSections, type BusinessSectionSlug } from "@/lib/business/sections";
import { prisma } from "@/lib/prisma";
import { PanelShell } from "@/components/panel/panel-shell";
import { BusinessNav } from "@/components/business/business-nav";
import { ReplyForm } from "@/components/business/reply-form";
import { InboxAutoRefresh } from "@/components/business/inbox-auto-refresh";
import { LeadWorklist } from "@/components/business/lead-worklist";
import { LeadDetailPanel } from "@/components/business/lead-detail-panel";
import { SalesFunnelBoard } from "@/components/business/sales-funnel-board";
import { LeadMetricsPanel } from "@/components/business/lead-metrics-panel";
import { addConversationTag, addLeadNote, assignBusinessRole, assignConversation, createAdvertisement, createCampaign, createFinancialTransaction, createKnowledgeEntry, createLeadTask, createManualLead, createPromptVersion, linkLeadLifecycle, lockAccountingPeriod, markConversationRead, requestAISuggestion, resolveReconciliation, reverseFinancialTransaction, revokeBusinessRole, runReconciliation, setConversationControl, setManualAttribution, syncMetaAds, updateRetentionSettings, versionKnowledgeEntry } from "../actions";
import { calculateAdMetrics } from "@/lib/business/finance";
import { businessFlags } from "@/lib/business/flags";
import { formatIstanbulDateInput, resolveIstanbulDateRange } from "@/lib/istanbul-time";
import { countConversations, loadBusinessOverviewKpis, loadDeductibleVatCents, loadLeadStageCounts } from "@/lib/business/queries/overview";
import { findDuplicateLeads, loadFunnelLeads, loadLeadDetail, loadLeadWorklist, loadSalesOwners } from "@/lib/business/queries/leads";
import { loadLeadAnalytics } from "@/lib/business/lead-metrics";
import type { LeadListFocus } from "@/lib/business/leads";
import { loadLeadLifecycleDetail } from "@/lib/lifecycle/lead-detail-server";
import { LeadLifecyclePanel } from "@/components/panel/lead-lifecycle-panel";
import { AutomationRulesPanel } from "@/components/business/automation-rules-panel";

export const dynamic = "force-dynamic";
const tl = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const dt = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });
const permissionFor = (section: BusinessSectionSlug): BusinessPermission => SECTION_PERMISSIONS[section];

function Card({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Inbox }) { return <article className="panel-metric-card"><Icon size={18} className="text-[var(--brand-olive)]"/><p className="mt-4 text-2xl font-semibold text-[var(--site-ink)]">{value}</p><p className="mt-1 text-xs font-bold text-[var(--site-muted)]">{label}</p></article>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-[var(--site-line)] px-5 py-10 text-center text-sm text-[var(--site-muted)]">{text}</div>; }

/**
 * Mutation'ın hangi iş biriminde çalışacağını taşır.
 *
 * Kullanıcı tek birime erişiyorsa gizli input yeterlidir. Birden fazla birime
 * erişiyorsa seçim ZORUNLUDUR — sunucu `resolveMutationUnit` ile formdan gelen
 * değeri erişim listesine karşı doğrular, yani gizli/kurcalanmış bir değer
 * yanlış birime yazamaz.
 */
function UnitField({ units }: { units: { id: string; name: string }[] }) {
  if (units.length === 1) return <input type="hidden" name="businessUnitId" value={units[0].id} />;
  return (
    <label className="text-xs font-bold text-[var(--site-muted)]">
      İş birimi
      <select name="businessUnitId" required defaultValue="" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
        <option value="" disabled>Birim seçin</option>
        {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
      </select>
    </label>
  );
}

export default async function BusinessSectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { section: rawSection } = await params; const query = await searchParams;
  if (!isBusinessSection(rawSection)) notFound();
  const section: BusinessSectionSlug = rawSection;
  if (!businessFlags.panel || (FINANCE_SECTIONS.includes(section) && !businessFlags.finance)) notFound();
  const access = await requireBusinessPage(permissionFor(section));
  // Menü, kullanıcının gerçekten açabildiği bölümlerle sınırlıdır — aynı
  // izin kaynağından beslenir, böylece menü ile route asla ayrışmaz.
  const granted = await getUserBusinessPermissions(access.session);
  const allowedSections = visibleSections(granted, { financeEnabled: businessFlags.finance });
  // Yazma yüzeyleri izne göre render edilir. Bu YALNIZ görünürlüktür; her
  // server action `actions.ts` içinde kendi guard'ını ayrıca çalıştırır.
  const can = (permission: BusinessPermission) => granted.has(permission);
  const product = typeof query.product === "string" ? query.product : "ALL";
  const scopedUnits = access.units.filter((unit) => product === "ALL" || unit.product === product);
  const unitIds = (scopedUnits.length ? scopedUnits : access.units).map((unit) => unit.id);
  const selectedConversation = typeof query.conversation === "string" ? query.conversation : undefined;
  const selectedLeadId = typeof query.lead === "string" ? query.lead : undefined;
  const messageCursor = typeof query.messageCursor === "string" ? query.messageCursor : undefined;
  // Tarih aralığı İstanbul yerel gününe göre çözümlenir; geçersiz/ters/aşırı
  // geniş aralıklar sessizce farklı bir aralığa dönüşmez, `notice` ile bildirilir.
  const { from, to, notice: rangeNotice } = resolveIstanbulDateRange({ from: query.from, to: query.to, defaultDays: 30, maxDays: 366 });
  const conversationCursor = typeof query.cursor === "string" ? query.cursor : undefined;
  const needsInbox = section === "mesaj-kutusu" || section === "genel-bakis";
  const needsLeads = false; // overview KPI'ları aggregate; aday listesi ayrı worklist sorgusu
  const needsCampaigns = ["genel-bakis", "kampanyalar", "reklamlar", "mesaj-kutusu", "adaylar"].includes(section);
  const needsFinance = ["genel-bakis", "gelirler", "giderler", "vergiler"].includes(section);
  const leadFocusRaw = typeof query.focus === "string" ? query.focus : "today";
  const leadFocus: LeadListFocus =
    leadFocusRaw === "overdue" || leadFocusRaw === "no_activity" || leadFocusRaw === "all" || leadFocusRaw === "mine"
      ? leadFocusRaw
      : "today";
  const leadStageFilter =
    typeof query.stage === "string" && Object.values(LeadStage).includes(query.stage as LeadStage)
      ? (query.stage as LeadStage)
      : "ALL";
  const leadSourceFilter =
    typeof query.source === "string" && Object.values(LeadSource).includes(query.source as LeadSource)
      ? (query.source as LeadSource)
      : "ALL";
  const leadInterestFilter =
    typeof query.interest === "string" && Object.values(ProductInterest).includes(query.interest as ProductInterest)
      ? (query.interest as ProductInterest)
      : "ALL";
  const leadOwnerFilter = typeof query.owner === "string" ? query.owner : "ALL";
  const leadCampaignFilter = typeof query.campaign === "string" ? query.campaign : "ALL";
  const leadQuery = typeof query.q === "string" ? query.q : undefined;
  const inboxWhere: Prisma.BusinessConversationWhereInput = { businessUnitId: { in: unitIds }, ...(section === "genel-bakis" ? { lastMessageAt: { gte: from, lte: to } } : {}), ...(typeof query.status === "string" && Object.values(ConversationStatus).includes(query.status as ConversationStatus) ? { status: query.status as ConversationStatus } : {}), ...(query.unread === "1" ? { unreadCount: { gt: 0 } } : {}), ...(typeof query.temperature === "string" && Object.values(LeadTemperature).includes(query.temperature as LeadTemperature) ? { temperature: query.temperature as LeadTemperature } : {}), ...(typeof query.ai === "string" && Object.values(AiMode).includes(query.ai as AiMode) ? { aiMode: query.ai as AiMode } : {}), ...(typeof query.q === "string" && query.q.trim() ? { OR: [{ username: { contains: query.q.trim(), mode: "insensitive" } }, { displayName: { contains: query.q.trim(), mode: "insensitive" } }, { instagramScopedUserId: { contains: query.q.trim() } }] } : {}) };
  const needsKpis = section === "genel-bakis" || section === "vergiler";
  const [messagesPage, conversationsPage, selectedDetail, _overviewLeads, campaigns, ads, transactions, reconciliations, knowledge, rules, integrations, jobs, audit, kpis, staff, periods, prompts, settingsUnits, deductibleVatCents, settingsUsers, roleAssignments, inboxTotal, funnelCounts, leadWorklist, funnelLeads, salesOwners, leadAnalytics] = await Promise.all([
    selectedConversation ? prisma.businessMessage.findMany({ where: { conversation: { id: selectedConversation, businessUnitId: { in: unitIds } } }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 101, ...(messageCursor ? { cursor: { id: messageCursor }, skip: 1 } : {}) }) : Promise.resolve([]),
    needsInbox ? prisma.businessConversation.findMany({ where: inboxWhere, include: { lead: true, messages: { orderBy: { occurredAt: "desc" }, take: 1 } }, orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }], take: 31, ...(conversationCursor ? { cursor: { id: conversationCursor }, skip: 1 } : {}) }) : Promise.resolve([]),
    selectedConversation ? prisma.businessConversation.findFirst({ where: { id: selectedConversation, businessUnitId: { in: unitIds } }, include: { lead: { include: { activities: { orderBy: { createdAt: "desc" }, take: 20 }, tasks: { orderBy: { createdAt: "desc" }, take: 20 }, attributions: { orderBy: { createdAt: "desc" }, take: 5, include: { campaign: true, advertisement: true } }, financialTransactions: { orderBy: { transactionAt: "desc" }, take: 10 } } }, aiExecutions: { orderBy: { createdAt: "desc" }, take: 1 } } }) : Promise.resolve(null),
    needsLeads ? prisma.businessLead.findMany({ where: { businessUnitId: { in: unitIds }, ...(section === "genel-bakis" ? { createdAt: { gte: from, lte: to } } : {}) }, orderBy: { updatedAt: "desc" }, take: 100 }) : Promise.resolve([]),
    needsCampaigns ? prisma.businessCampaign.findMany({ where: { businessUnitId: { in: unitIds } }, include: { adSets: { include: { advertisements: true } } }, orderBy: { createdAt: "desc" }, take: 50 }) : Promise.resolve([]),
    needsCampaigns ? prisma.businessAdvertisement.findMany({ where: { adSet: { campaign: { businessUnitId: { in: unitIds } } } }, include: { adSet: { include: { campaign: true } } }, take: 100 }) : Promise.resolve([]),
    needsFinance ? prisma.financialTransaction.findMany({ where: { businessUnitId: { in: unitIds }, transactionAt: { gte: from, lte: to } }, orderBy: { transactionAt: "desc" }, take: 500 }) : Promise.resolve([]),
    section === "mutabakat" ? prisma.reconciliationRecord.findMany({ where: { businessUnitId: { in: unitIds } }, orderBy: { createdAt: "desc" }, take: 100 }) : Promise.resolve([]),
    section === "ai-bilgi-merkezi" ? prisma.knowledgeBaseEntry.findMany({ where: { businessUnitId: { in: unitIds } }, orderBy: { updatedAt: "desc" }, take: 100 }) : Promise.resolve([]),
    section === "otomasyon-kurallari" ? prisma.automationRule.findMany({ where: { businessUnitId: { in: unitIds } }, include: { executions: { orderBy: { createdAt: "desc" }, take: 5 } }, orderBy: { updatedAt: "desc" }, take: 100 }) : Promise.resolve([]),
    section === "entegrasyonlar" ? prisma.integrationConnection.findMany({ where: { businessUnitId: { in: unitIds } }, orderBy: { updatedAt: "desc" } }) : Promise.resolve([]),
    section === "sistem-kayitlari" ? prisma.backgroundJob.findMany({ where: { OR: [{ businessUnitId: { in: unitIds } }, { businessUnitId: null }] }, orderBy: { createdAt: "desc" }, take: 50 }) : Promise.resolve([]),
    section === "sistem-kayitlari" ? prisma.auditLog.findMany({ where: { entityType: { in: ["BusinessLead", "BusinessConversation", "FinancialTransaction", "InstagramWebhookEvent", "ReconciliationRecord", "AccountingPeriod"] } }, orderBy: { createdAt: "desc" }, take: 50 }) : Promise.resolve([]),
    needsKpis ? loadBusinessOverviewKpis({ unitIds, from, to }) : Promise.resolve(null),
    section === "mesaj-kutusu" || section === "adaylar" || section === "satis-hunisi"
      ? prisma.businessRoleAssignment.findMany({ where: { businessUnitId: { in: unitIds }, role: { in: ["SUPER_ADMIN", "ADMIN", "SALES", "SUPPORT"] } }, include: { user: { select: { id: true, fullName: true } } }, take: 100 })
      : Promise.resolve([]),
    section === "vergiler" ? prisma.accountingPeriod.findMany({ where: { businessUnitId: { in: unitIds } }, orderBy: { startsAt: "desc" }, take: 24 }) : Promise.resolve([]),
    section === "ai-bilgi-merkezi" ? prisma.aIPromptVersion.findMany({ where: { OR: [{ businessUnitId: { in: unitIds } }, { businessUnitId: null }] }, orderBy: [{ name: "asc" }, { version: "desc" }], take: 50 }) : Promise.resolve([]),
    section === "ayarlar" ? prisma.businessUnit.findMany({ where: { id: { in: unitIds } }, select: { id: true, name: true, retentionDays: true } }) : Promise.resolve([]),
    section === "vergiler" ? loadDeductibleVatCents({ unitIds, from, to }) : Promise.resolve(0),
    section === "ayarlar" ? prisma.user.findMany({ where: { status: "ACTIVE" }, select: { id: true, fullName: true, email: true }, orderBy: { fullName: "asc" }, take: 200 }) : Promise.resolve([]),
    section === "ayarlar" ? prisma.businessRoleAssignment.findMany({ where: { businessUnitId: { in: unitIds } }, include: { user: { select: { fullName: true } }, businessUnit: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 }) : Promise.resolve([]),
    section === "mesaj-kutusu" ? countConversations(inboxWhere) : Promise.resolve(0),
    section === "satis-hunisi" ? loadLeadStageCounts(unitIds) : Promise.resolve({} as Record<string, number>),
    section === "adaylar"
      ? loadLeadWorklist(unitIds, {
          focus: leadFocus,
          stage: leadStageFilter,
          ownerId: leadOwnerFilter,
          source: leadSourceFilter,
          campaignId: leadCampaignFilter,
          interest: leadInterestFilter,
          q: leadQuery,
        })
      : Promise.resolve([]),
    section === "satis-hunisi" ? loadFunnelLeads(unitIds) : Promise.resolve([]),
    section === "adaylar" || section === "genel-bakis" || section === "raporlar" ? loadSalesOwners(unitIds) : Promise.resolve([]),
    section === "genel-bakis" || section === "raporlar" ? loadLeadAnalytics({ unitIds, from, to }) : Promise.resolve(null),
  ]);
  const conversations = conversationsPage.slice(0, 30); const nextCursor = conversationsPage.length > 30 ? conversationsPage[30].id : null;
  const income = kpis?.incomeCents ?? 0;
  const expense = kpis?.expenseCents ?? 0;
  const selected = selectedDetail;
  const messages = messagesPage.slice(0, 100); const nextMessageCursor = messagesPage.length > 100 ? messagesPage[100].id : null;
  const orderedMessages = [...messages].reverse();
  const leadDetail =
    section === "adaylar" && selectedLeadId ? await loadLeadDetail(selectedLeadId, unitIds) : null;
  const leadLifecycleDetail =
    section === "adaylar" && selectedLeadId
      ? await loadLeadLifecycleDetail(selectedLeadId, { businessUnitIds: unitIds })
      : null;
  const leadDuplicates =
    leadDetail
      ? await findDuplicateLeads({
          id: leadDetail.id,
          businessUnitId: leadDetail.businessUnitId,
          normalizedPhone: leadDetail.normalizedPhone,
          normalizedEmail: leadDetail.normalizedEmail,
        })
      : [];
  const ownerOptions = (salesOwners.length ? salesOwners : staff).map((item) => ({
    id: item.user.id,
    fullName: item.user.fullName || "İsimsiz",
  }));
  const uniqueOwners = Array.from(new Map(ownerOptions.map((o) => [o.id, o])).values());
  const ownerNameMap: Record<string, string> = Object.fromEntries(uniqueOwners.map((o) => [o.id, o.fullName]));
  const provisioning =
    leadDetail
      ? {
          odStatus: leadDetail.relatedOdOrderId
            ? (
                await prisma.odOrder.findFirst({
                  where: { id: leadDetail.relatedOdOrderId },
                  select: { provisioningStatus: true },
                })
              )?.provisioningStatus ?? null
            : null,
          odkStatus: leadDetail.relatedOdkOrderId
            ? (
                await prisma.odkOrder.findFirst({
                  where: { id: leadDetail.relatedOdkOrderId },
                  select: { provisioningStatus: true },
                })
              )?.provisioningStatus ?? null
            : null,
        }
      : undefined;

  return <PanelShell role={access.session.role} fullName={access.session.fullName} email={access.session.email} workspace="BUSINESS" nav={<BusinessNav active={section} allowed={allowedSections} />}>
    <header className="mb-5"><p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-[var(--brand-olive)]">Reklam, CRM ve Finans</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-[var(--site-ink)]">{SECTION_LABELS[section]}</h1><p className="mt-2 text-sm text-[var(--site-muted)]">{access.units.map((unit) => unit.name).join(" · ")} · Europe/Istanbul</p></header>
    <div className="mt-5">
      {section === "genel-bakis" && kpis && <><form method="get" className="panel-surface mb-4 flex flex-wrap gap-3 p-4"><label className="text-xs">Başlangıç<input name="from" type="date" defaultValue={formatIstanbulDateInput(from)} className="ml-2 rounded-xl border p-2"/></label><label className="text-xs">Bitiş<input name="to" type="date" defaultValue={formatIstanbulDateInput(to)} className="ml-2 rounded-xl border p-2"/></label><select name="product" defaultValue={product} aria-label="Ürün" className="rounded-xl border px-3 text-xs"><option value="ALL">Tüm ürünler</option><option value="OD">OnlineDershanem</option><option value="ODK">OnlineDenemeKulübü</option></select><button className="rounded-xl bg-[var(--brand-olive)] px-4 text-xs font-bold text-white">Uygula</button></form>{rangeNotice?<p role="status" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">{rangeNotice}</p>:null}<p className="mb-3 text-xs text-[var(--site-muted)]">{formatIstanbulDateInput(from)} – {formatIstanbulDateInput(to)} · {product === "ALL" ? "Tüm iş birimleri" : product} · TRY · Europe/Istanbul</p><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><Card label="Konuşma" value={kpis.conversationTotal} icon={Inbox}/><Card label="Yeni aday" value={kpis.newLeads} icon={UsersRound}/><Card label="Satış" value={kpis.wonLeads} icon={BarChart3}/><Card label="Reklam harcaması" value={tl.format(kpis.adSpendCents/100)} icon={Megaphone}/><Card label="Net gelir" value={tl.format(kpis.netCents/100)} icon={CircleDollarSign}/><Card label="İnsan bekleyen" value={kpis.waitingHumanConversations} icon={Bot}/></section><section className="panel-surface mt-5 p-5"><h2 className="text-sm font-extrabold">Operasyon özeti</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><p className="rounded-xl bg-emerald-50 p-4 text-sm">Gelir <strong className="block text-lg">{tl.format(income/100)}</strong></p><p className="rounded-xl bg-rose-50 p-4 text-sm">Gider <strong className="block text-lg">{tl.format(expense/100)}</strong></p><p className="rounded-xl bg-amber-50 p-4 text-sm">Tahmini net <strong className="block text-lg">{tl.format(kpis.netCents/100)}</strong></p></div><div className="mt-5 grid gap-3 md:grid-cols-3" aria-label="Satış hunisi grafiği">{["NEW","QUALIFIED","WON"].map((stage)=>{const count=kpis.leadsByStage[stage] ?? 0;return <div key={stage}><div className="flex justify-between text-xs"><span>{stage}</span><strong>{count}</strong></div><div className="mt-1 h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-[var(--brand-olive)]" style={{width:`${kpis.leadTotal ? Math.max(4,count/kpis.leadTotal*100) : 0}%`}}/></div></div>})}</div></section>{leadAnalytics ? <div className="mt-5"><h2 className="mb-3 text-sm font-extrabold">CRM satış metrikleri</h2><LeadMetricsPanel analytics={leadAnalytics} ownerNames={ownerNameMap} /></div> : null}</>}

      {section === "mesaj-kutusu" && <>
        <InboxAutoRefresh/>
        <form method="get" className="panel-surface mb-4 grid gap-2 p-3 sm:grid-cols-3 xl:grid-cols-6" aria-label="Konuşma filtreleri">
          <input name="q" defaultValue={typeof query.q === "string" ? query.q : ""} placeholder="Kullanıcı ara" className="rounded-xl border px-3 py-2 text-xs"/>
          <select name="status" defaultValue={typeof query.status === "string" ? query.status : "ALL"} aria-label="Durum" className="rounded-xl border px-3 py-2 text-xs"><option value="ALL">Tüm durumlar</option>{Object.values(ConversationStatus).map((value)=><option key={value}>{value}</option>)}</select>
          <select name="temperature" defaultValue={typeof query.temperature === "string" ? query.temperature : "ALL"} aria-label="Sıcaklık" className="rounded-xl border px-3 py-2 text-xs"><option value="ALL">Tüm sıcaklıklar</option>{Object.values(LeadTemperature).map((value)=><option key={value}>{value}</option>)}</select>
          <select name="ai" defaultValue={typeof query.ai === "string" ? query.ai : "ALL"} aria-label="AI modu" className="rounded-xl border px-3 py-2 text-xs"><option value="ALL">Tüm AI modları</option>{Object.values(AiMode).map((value)=><option key={value}>{value}</option>)}</select>
          <label className="flex items-center gap-2 rounded-xl border px-3 text-xs"><input type="checkbox" name="unread" value="1" defaultChecked={query.unread === "1"}/> Yalnız okunmamış</label>
          <button className="rounded-xl bg-[var(--brand-olive)] px-3 py-2 text-xs font-bold text-white">Filtrele</button>
        </form>
        <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <section className="panel-surface overflow-hidden">
            <p className="border-b border-[var(--site-line)] px-4 py-3 text-xs font-bold text-[var(--site-muted)]">Filtreye uyan toplam {inboxTotal} konuşma · {conversations.length} tanesi gösteriliyor</p>
            <div className="divide-y divide-[var(--site-line)]">{conversations.length ? conversations.map((c)=><Link key={c.id} href={`?conversation=${c.id}`} className={`block p-4 hover:bg-[var(--site-bg-warm)] ${selectedConversation===c.id?"bg-[var(--brand-olive-soft)]":""}`}><div className="flex justify-between gap-3"><strong className="truncate text-sm">{c.displayName||c.username||c.instagramScopedUserId}</strong><time className="text-[10px] text-[var(--site-muted)]">{dt.format(c.lastMessageAt)}</time></div><p className="mt-1 truncate text-xs text-[var(--site-muted)]">{c.messages[0]?.body||"Medya mesajı"}</p><div className="mt-2 flex flex-wrap gap-1 text-[9px] font-bold"><span className="rounded-full bg-white px-2 py-1">{c.status}</span><span className="rounded-full bg-white px-2 py-1">AI {c.aiMode}</span><span className="rounded-full bg-white px-2 py-1">{c.temperature}</span>{c.tags.slice(0,2).map((tag)=><span key={tag} className="rounded-full bg-white px-2 py-1">#{tag}</span>)}{c.unreadCount?<span className="rounded-full bg-rose-600 px-2 py-1 text-white">{c.unreadCount}</span>:null}</div></Link>):<Empty text="Filtreyle eşleşen konuşma yok."/>}</div>
            {nextCursor?<Link href={`?cursor=${nextCursor}`} className="m-3 block rounded-xl border p-2 text-center text-xs font-bold">Sonraki sayfa</Link>:null}
          </section>
          <section className="panel-surface p-5">{selected?<>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-extrabold">{selected.displayName||selected.instagramScopedUserId}</h2><p className="text-xs text-[var(--site-muted)]">{selected.temperature} · {selected.productInterest} · {selected.summary || "Özet bekleniyor"}</p><div className="mt-2 flex flex-wrap gap-1">{selected.tags.map((tag)=><span key={tag} className="rounded-full bg-[var(--brand-olive-soft)] px-2 py-1 text-[10px]">#{tag}</span>)}</div></div><form action={setConversationControl} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={selected.id}/><select aria-label="AI modu" name="aiMode" defaultValue={selected.aiMode} className="rounded-xl border px-2 py-1 text-xs">{Object.values(AiMode).map((value)=><option key={value}>{value}</option>)}</select><select aria-label="Konuşma durumu" name="status" defaultValue={selected.status} className="rounded-xl border px-2 py-1 text-xs">{Object.values(ConversationStatus).map((value)=><option key={value}>{value}</option>)}</select><button className="rounded-xl border px-3 text-xs font-bold">Kaydet</button></form></div>
            <div className="mt-3 flex flex-wrap gap-2"><form action={markConversationRead}><input type="hidden" name="id" value={selected.id}/><button className="rounded-xl border px-3 py-2 text-xs">Okundu işaretle</button></form><form action={requestAISuggestion}><input type="hidden" name="id" value={selected.id}/><button className="rounded-xl border px-3 py-2 text-xs font-bold">AI önerisi üret</button></form><form action={assignConversation} className="flex"><input type="hidden" name="id" value={selected.id}/><select aria-label="Sorumlu personel" name="assignedUserId" defaultValue={selected.assignedUserId || ""} className="rounded-l-xl border px-2 text-xs"><option value="">Atanmamış</option>{staff.map((item)=><option key={item.id} value={item.user.id}>{item.user.fullName} · {item.role}</option>)}</select><button className="rounded-r-xl border px-2 text-xs">Ata</button></form><form action={addConversationTag} className="flex"><input type="hidden" name="id" value={selected.id}/><input aria-label="Etiket" name="tag" required placeholder="Etiket" className="w-24 rounded-l-xl border px-2 text-xs"/><button className="rounded-r-xl border px-2 text-xs">Ekle</button></form></div>
            {nextMessageCursor?<Link href={`?conversation=${selected.id}&messageCursor=${nextMessageCursor}`} className="mt-4 block text-center text-xs font-bold underline">Daha eski 100 mesajı yükle</Link>:null}<div className="mt-5 max-h-[520px] space-y-3 overflow-auto" aria-live="polite">{orderedMessages.map((m)=><article key={m.id} className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${m.direction==="OUTBOUND"?"ml-auto bg-[var(--brand-olive)] text-white":"bg-[var(--site-bg-warm)]"}`}><p>{m.body||"Medya"}</p><p className="mt-1 text-[9px] opacity-70">{m.senderType} · {m.status} · {dt.format(m.occurredAt)}{m.failureCode ? ` · ${m.failureCode}` : ""}</p></article>)}</div>
            {selected.aiExecutions[0]?.decision && typeof selected.aiExecutions[0].decision === "object" && "reply" in selected.aiExecutions[0].decision && typeof selected.aiExecutions[0].decision.reply === "string" ? <section className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-3"><p className="text-[10px] font-extrabold uppercase text-sky-800">AI cevap önerisi · düzenleyip gönderilebilir</p><ReplyForm conversationId={selected.id} initialText={selected.aiExecutions[0].decision.reply}/></section> : null}
            <ReplyForm conversationId={selected.id}/>
            {selected.lead?<div className="mt-5 grid gap-3 lg:grid-cols-2"><section className="rounded-2xl border p-3"><h3 className="text-xs font-extrabold">Aday notu ve görev</h3><form action={addLeadNote} className="mt-2 flex"><input type="hidden" name="leadId" value={selected.lead.id}/><input name="note" required placeholder="Not ekle" className="min-w-0 flex-1 rounded-l-xl border px-2 text-xs"/><button className="rounded-r-xl border px-2 text-xs">Ekle</button></form><form action={createLeadTask} className="mt-2 grid grid-cols-[1fr_auto_auto]"><input type="hidden" name="leadId" value={selected.lead.id}/><input name="title" required placeholder="Görev" className="min-w-0 rounded-l-xl border px-2 text-xs"/><input aria-label="Son tarih" name="dueAt" type="datetime-local" className="border px-2 text-xs"/><button className="rounded-r-xl border px-2 text-xs">Oluştur</button></form>{selected.lead.activities.map((item)=><p key={item.id} className="mt-2 border-t pt-2 text-[10px]">{item.type} · {dt.format(item.createdAt)}</p>)}{selected.lead.tasks.map((item)=><p key={item.id} className="mt-2 text-[10px]">Görev: {item.title} · {item.completedAt?"Tamamlandı":"Açık"}</p>)}{selected.lead.financialTransactions.map((item)=><p key={item.id} className="mt-2 text-[10px]">Ödeme: {item.description} · {tl.format(item.netCents/100)} · {item.status}</p>)}</section><section className="rounded-2xl border p-3"><h3 className="text-xs font-extrabold">Kampanya atfı</h3><form action={setManualAttribution} className="mt-2 grid gap-2"><input type="hidden" name="leadId" value={selected.lead.id}/><select name="campaignId" aria-label="Kampanya" className="rounded-xl border p-2 text-xs"><option value="">Kampanya seç</option>{campaigns.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select><select name="advertisementId" aria-label="Reklam" className="rounded-xl border p-2 text-xs"><option value="">Reklam seç</option>{ads.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="rounded-xl border p-2 text-xs font-bold">Manuel atıf oluştur</button></form>{selected.lead.attributions.map((item)=><p key={item.id} className="mt-2 text-[10px]">{item.model} · {item.campaign?.name || item.advertisement?.name || "—"} · %{Number(item.confidence)*100}</p>)}</section></div>:null}
          </>:<Empty text="Detay için bir konuşma seçin."/>}</section>
        </div>
      </>}

      {section === "adaylar" && (
        <>
          {can("lead:write") ? (
            <form action={createManualLead} className="panel-surface mb-4 grid gap-3 p-4 sm:grid-cols-5">
              <UnitField units={access.units} />
              <input name="firstName" required placeholder="Ad" className="rounded-xl border px-3 py-2 text-sm" />
              <input name="phone" placeholder="Telefon" className="rounded-xl border px-3 py-2 text-sm" />
              <input name="email" type="email" placeholder="E-posta" className="rounded-xl border px-3 py-2 text-sm" />
              <select name="productInterest" className="rounded-xl border px-3 py-2 text-sm">
                <option value="UNKNOWN">Ürün bilinmiyor</option>
                <option value="ONLINE_DERSHANEM">OnlineDershanem</option>
                <option value="ONLINE_DENEME_KULUBU">Deneme Kulübü</option>
              </select>
              <button className="rounded-xl bg-[var(--brand-olive)] px-3 py-2 text-sm font-bold text-white">Aday ekle</button>
            </form>
          ) : null}
          {selectedLeadId ? (
            leadDetail ? (
              <div className="mb-6 space-y-4">
                <LeadDetailPanel
                  lead={leadDetail}
                  owners={uniqueOwners}
                  duplicates={leadDuplicates}
                  canWrite={can("lead:write")}
                  provisioning={provisioning}
                />
                {leadLifecycleDetail ? (
                  <LeadLifecyclePanel
                    detail={leadLifecycleDetail}
                    linkAction={can("lead:write") ? linkLeadLifecycle : undefined}
                  />
                ) : null}
              </div>
            ) : (
              <Empty text="Aday bulunamadı veya erişim dışı." />
            )
          ) : null}
          <LeadWorklist
            leads={leadWorklist}
            owners={uniqueOwners}
            campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
            selectedLeadId={selectedLeadId}
            filters={{
              focus: leadFocus,
              stage: leadStageFilter,
              ownerId: leadOwnerFilter,
              source: leadSourceFilter,
              campaignId: leadCampaignFilter,
              interest: leadInterestFilter,
              q: leadQuery,
            }}
          />
        </>
      )}
      {section === "satis-hunisi" && (
        <SalesFunnelBoard
          canWrite={can("lead:write")}
          stageCounts={funnelCounts}
          initialLeads={funnelLeads.map((lead) => ({
            id: lead.id,
            stage: lead.stage,
            firstName: lead.firstName,
            lastName: lead.lastName,
            studentName: lead.studentName,
            instagramScopedId: lead.instagramScopedId,
            phone: lead.phone,
            email: lead.email,
            productInterest: lead.productInterest,
            nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
            lastContactAt: lead.lastContactAt.toISOString(),
            priority: lead.priority,
            estimatedValueCents: lead.estimatedValueCents,
          }))}
        />
      )}
      {(section === "kampanyalar" || section === "reklamlar") && <>{section === "kampanyalar"?<form action={createCampaign} className="panel-surface mb-4 grid gap-3 p-4 sm:grid-cols-5"><UnitField units={access.units}/><input aria-label="Kampanya adı" name="name" required placeholder="Kampanya adı" className="rounded-xl border px-3 py-2 text-sm"/><input aria-label="Platform" name="platform" defaultValue="INSTAGRAM" className="rounded-xl border px-3 py-2 text-sm"/><input aria-label="Bütçe TL" name="budgetTl" type="number" min="0" step="0.01" placeholder="Bütçe TL" className="rounded-xl border px-3 py-2 text-sm"/><select aria-label="Ürün" name="productInterest" className="rounded-xl border px-3 py-2 text-sm"><option>UNKNOWN</option><option>ONLINE_DERSHANEM</option><option>ONLINE_DENEME_KULUBU</option></select><button className="rounded-xl bg-[var(--brand-olive)] text-sm font-bold text-white">Kampanya ekle</button></form>:<form action={createAdvertisement} className="panel-surface mb-4 grid gap-2 p-4 sm:grid-cols-3 xl:grid-cols-6"><select required aria-label="Kampanya" name="campaignId" className="rounded-xl border p-2 text-xs"><option value="">Kampanya</option>{campaigns.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select><input required name="adSetName" aria-label="Reklam seti" placeholder="Reklam seti" className="rounded-xl border p-2 text-xs"/><input required name="name" aria-label="Reklam adı" placeholder="Reklam adı" className="rounded-xl border p-2 text-xs"/>{[["spentTl","Harcama TL"],["impressions","Gösterim"],["clicks","Tıklama"],["messageStarts","Mesaj"],["leadCount","Lead"],["saleCount","Satış"],["revenueTl","Gelir TL"]].map(([name,label])=><input key={name} name={name} aria-label={label} type="number" min="0" step={name.endsWith("Tl")?"0.01":"1"} defaultValue="0" className="rounded-xl border p-2 text-xs"/>)}<button className="rounded-xl bg-[var(--brand-olive)] p-2 text-xs font-bold text-white">Manuel reklam ekle</button></form>}<DataTable headers={["Ad","Kampanya","Harcama","CPM","CPC","CTR","Mesaj maliyeti","Lead maliyeti","Satış maliyeti","ROAS"]} rows={ads.map((a)=>{const metrics=calculateAdMetrics({ ...a, leads: a.leadCount, sales: a.saleCount });return <tr key={a.id} className="border-t"><td className="p-3 font-bold">{a.name}</td><td className="p-3">{a.adSet.campaign.name}</td><td className="p-3">{tl.format(a.spentCents/100)}</td><td className="p-3">{tl.format(metrics.cpmCents/100)}</td><td className="p-3">{tl.format(metrics.cpcCents/100)}</td><td className="p-3">%{(metrics.ctr*100).toFixed(2)}</td><td className="p-3">{tl.format(metrics.costPerMessageCents/100)}</td><td className="p-3">{tl.format(metrics.costPerLeadCents/100)}</td><td className="p-3">{tl.format(metrics.costPerSaleCents/100)}</td><td className="p-3">{metrics.roas.toFixed(2)}x</td></tr>})}/></>}
      {(section === "gelirler" || section === "giderler") && <>{can("finance:write") ? <form action={createFinancialTransaction} className="panel-surface mb-4 grid gap-3 p-4 sm:grid-cols-3 xl:grid-cols-5"><UnitField units={access.units}/><select aria-label="Hareket türü" name="kind" defaultValue={section === "giderler" ? "EXPENSE" : "MANUAL_INCOME"} className="rounded-xl border px-3 py-2 text-sm"><option>MANUAL_INCOME</option><option>EXPENSE</option><option>ADJUSTMENT</option></select><input aria-label="Açıklama" name="description" required placeholder="Açıklama" className="rounded-xl border px-3 py-2 text-sm"/><input aria-label="Kategori" name="category" required placeholder="Kategori" className="rounded-xl border px-3 py-2 text-sm"/><input aria-label="Tutar TL" name="amountTl" type="number" step="0.01" min="0.01" required placeholder="Tutar TL" className="rounded-xl border px-3 py-2 text-sm"/><input aria-label="İşlem tarihi" name="transactionDate" type="date" className="rounded-xl border px-3 py-2 text-sm"/><input aria-label="KDV oranı" name="vatRate" type="number" min="0" max="100" step="0.01" defaultValue="0" placeholder="KDV %" className="rounded-xl border px-3 py-2 text-sm"/><input aria-label="Stopaj oranı" name="withholdingRate" type="number" min="0" max="100" step="0.01" defaultValue="0" placeholder="Stopaj %" className="rounded-xl border px-3 py-2 text-sm"/><input aria-label="Komisyon TL" name="commissionTl" type="number" min="0" step="0.01" defaultValue="0" placeholder="Komisyon TL" className="rounded-xl border px-3 py-2 text-sm"/><button className="rounded-xl bg-[var(--brand-olive)] p-2 text-sm font-bold text-white">Kaydet</button></form> : null}<TransactionTable rows={transactions.filter((x)=>section==="giderler"?x.kind==="EXPENSE":x.kind!=="EXPENSE")} canReverse={can("finance:reverse")}/></>}
      {section === "vergiler" && kpis && <><div role="note" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Bu ekran operasyonel takip ve tahmini raporlama amaçlıdır. Resmî beyan ve muhasebe işlemleri için mali müşavir kontrolü gerekir.</div><p className="mb-3 text-xs text-[var(--site-muted)]">{formatIstanbulDateInput(from)} – {formatIstanbulDateInput(to)} · TRY · KDV dahil tutarlar üzerinden hesaplanır</p><section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6"><Card label="Vergi dahil gelir" value={tl.format(income/100)} icon={CircleDollarSign}/><Card label="Hesaplanan KDV" value={tl.format(kpis.vatCents/100)} icon={CircleDollarSign}/><Card label="İndirilecek KDV" value={tl.format(deductibleVatCents/100)} icon={CircleDollarSign}/><Card label="Stopaj" value={tl.format(kpis.withholdingCents/100)} icon={CircleDollarSign}/><Card label="Komisyon" value={tl.format(kpis.commissionCents/100)} icon={CircleDollarSign}/><Card label="Tahmini net kâr" value={tl.format((income-expense-kpis.vatCents)/100)} icon={BarChart3}/></section><section className="panel-surface mt-4 grid gap-4 p-4 md:grid-cols-2"><div><h2 className="text-sm font-extrabold">Muhasebe dönemleri</h2>{periods.map((item)=><p key={item.id} className="mt-2 text-xs">{dt.format(item.startsAt)} – {dt.format(item.endsAt)} · <strong>{item.status}</strong></p>)}</div><form action={lockAccountingPeriod} className="grid gap-2"><UnitField units={access.units}/><h2 className="text-sm font-extrabold">Dönem kilitle</h2><input aria-label="Başlangıç" required name="startsAt" type="date" className="rounded-xl border p-2 text-xs"/><input aria-label="Bitiş" required name="endsAt" type="date" className="rounded-xl border p-2 text-xs"/><button className="rounded-xl border p-2 text-xs font-bold">Onayla ve kilitle</button><p className="text-[10px] text-[var(--site-muted)]">Kilitli dönemde sessiz değişiklik yapılamaz; yalnız ters/düzeltme kaydı kullanılır.</p></form></section></>}
      {section === "mutabakat" && <><form action={runReconciliation} className="mb-4"><button className="rounded-xl bg-[var(--brand-olive)] px-4 py-2 text-xs font-bold text-white">PayTR · sipariş · ledger mutabakatını çalıştır</button></form>{reconciliations.length?<DataTable headers={["Sağlayıcı","Dış ID","Beklenen","Gerçek","Durum","İşlem"]} rows={reconciliations.map(x=><tr key={x.id} className="border-t"><td className="p-3">{x.provider}</td><td className="p-3">{x.externalId||"—"}</td><td className="p-3">{tl.format((x.expectedCents||0)/100)}</td><td className="p-3">{tl.format((x.actualCents||0)/100)}</td><td className="p-3 font-bold">{x.status}</td><td className="p-3">{x.status!=="MATCHED"?<form action={resolveReconciliation} className="flex gap-1"><input type="hidden" name="id" value={x.id}/><select aria-label="Çözüm" name="status" className="rounded border p-1"><option>MANUALLY_MATCHED</option><option>CORRECTED</option></select><button className="underline">Kaydet</button></form>:"—"}</td></tr>)}/>:<Empty text="Mutabakat kaydı yok; taramayı çalıştırın."/>}</>}
      {section === "raporlar" && (
        <div className="space-y-4">
          {leadAnalytics ? <LeadMetricsPanel analytics={leadAnalytics} ownerNames={ownerNameMap} /> : null}
          <section className="panel-surface p-5">
            <h2 className="font-extrabold">Dışa aktarma</h2>
            <p className="mt-2 text-sm text-[var(--site-muted)]">Tüm hücreler CSV formula injection korumasıyla hazırlanır.</p>
            <Link href="/api/admin/business/reports.csv" className="mt-4 inline-flex rounded-xl bg-[var(--brand-olive)] px-4 py-2 text-xs font-bold text-white">
              CSV indir
            </Link>
          </section>
        </div>
      )}
      {section === "ai-bilgi-merkezi" && <><div className="grid gap-4 xl:grid-cols-2"><form action={createKnowledgeEntry} className="panel-surface grid gap-3 p-4 sm:grid-cols-2"><UnitField units={access.units}/><h2 className="font-extrabold sm:col-span-2">Bilgi kaydı</h2><input aria-label="Başlık" name="title" required placeholder="Başlık" className="rounded-xl border px-3 py-2 text-sm"/><input aria-label="Kategori" name="category" required placeholder="Kategori" className="rounded-xl border px-3 py-2 text-sm"/><select aria-label="Ürün" name="productInterest" className="rounded-xl border px-3 py-2 text-sm"><option>UNKNOWN</option><option>ONLINE_DERSHANEM</option><option>ONLINE_DENEME_KULUBU</option></select><div className="grid grid-cols-2 gap-2"><input aria-label="Geçerlilik başlangıcı" name="validFrom" type="date" className="rounded-xl border px-2 text-xs"/><input aria-label="Geçerlilik bitişi" name="validUntil" type="date" className="rounded-xl border px-2 text-xs"/></div><textarea aria-label="İçerik" name="content" required placeholder="Doğrulanmış içerik" className="min-h-24 rounded-xl border px-3 py-2 text-sm sm:col-span-2"/><button className="rounded-xl bg-[var(--brand-olive)] p-2 text-sm font-bold text-white sm:col-span-2">Bilgi ekle</button></form><form action={createPromptVersion} className="panel-surface grid gap-3 p-4"><UnitField units={access.units}/><h2 className="font-extrabold">AI prompt sürümü</h2><input aria-label="Prompt adı" name="name" required defaultValue="instagram-sales" className="rounded-xl border p-2 text-sm"/><textarea aria-label="Ek sistem kuralları" name="systemPrompt" required minLength={20} placeholder="Marka dili ve izinli ek sistem kuralları" className="min-h-32 rounded-xl border p-3 text-sm"/><button className="rounded-xl border p-2 text-sm font-bold">Yeni aktif sürüm oluştur</button>{prompts.map((item)=><p key={item.id} className="text-[10px]">{item.name} v{item.version} · {item.isActive?"Aktif":"Pasif"}</p>)}</form></div>{knowledge.length?<div className="mt-4 grid gap-3 md:grid-cols-2">{knowledge.map(x=><article key={x.id} className="panel-surface p-4"><div className="flex justify-between"><strong>{x.title}</strong><span className="text-[10px]">v{x.version} · {x.isActive?"Aktif":"Pasif"}</span></div><form action={versionKnowledgeEntry} className="mt-2 grid gap-2"><input type="hidden" name="id" value={x.id}/><textarea aria-label={`${x.title} içeriği`} name="content" defaultValue={x.content} className="min-h-24 rounded-xl border p-2 text-sm"/><select aria-label="Aktiflik" name="isActive" defaultValue={String(x.isActive)} className="rounded-xl border p-2 text-xs"><option value="true">Aktif</option><option value="false">Pasif</option></select><button className="rounded-xl border p-2 text-xs font-bold">Yeni sürüm olarak kaydet</button></form><p className="mt-2 text-[10px] text-[var(--site-muted)]">{x.category} · {x.source||"Manuel"}</p></article>)}</div>:<Empty text="Bilgi merkezi kaydı yok."/>}</>}
      {section === "otomasyon-kurallari" && (
        <AutomationRulesPanel
          units={access.units}
          rules={rules}
          canWrite={can("automation:write")}
          dryRunNotice={
            typeof query.dryRun === "string" && typeof query.rule === "string"
              ? { result: query.dryRun, matched: query.matched === "1", ruleId: query.rule }
              : null
          }
        />
      )}
      {section === "entegrasyonlar" && <><div className="mb-4 flex flex-wrap gap-2"><Link href="/api/integrations/instagram/health" className="rounded-xl border px-4 py-2 text-xs font-bold">Instagram canlı sağlık kontrolü</Link><form action={syncMetaAds}><button className="rounded-xl border px-4 py-2 text-xs font-bold">Meta Ads senkronize et</button></form></div><div className="grid gap-3 md:grid-cols-2">{["INSTAGRAM","OPENAI","META_ADS","EMAIL"].map(provider=>{const item=integrations.find(x=>x.provider===provider);return <article key={provider} className="panel-surface p-5"><strong>{provider}</strong><p className="mt-2 text-sm">{item?.status||"DISCONNECTED"}</p><p className="mt-1 text-xs text-[var(--site-muted)]">Son kontrol: {item?.lastHealthAt?dt.format(item.lastHealthAt):"Henüz yok"}{item?.lastErrorCode?` · ${item.lastErrorCode}`:""}</p><p className="mt-1 text-xs text-[var(--site-muted)]">Secret değerleri yalnız sunucu ortamından okunur.</p></article>})}</div></>}
      {section === "sistem-kayitlari" && <div className="grid gap-4 xl:grid-cols-2"><section className="panel-surface p-4"><h2 className="mb-3 font-extrabold">Arka plan işleri</h2>{jobs.map(x=><p key={x.id} className="border-t py-2 text-xs"><strong>{x.type}</strong> · {x.status} · deneme {x.attempts}/{x.maxAttempts}</p>)}</section><section className="panel-surface p-4"><h2 className="mb-3 font-extrabold">Audit kayıtları</h2>{audit.map(x=><p key={x.id} className="border-t py-2 text-xs"><strong>{x.action}</strong> · {x.entityType} · {dt.format(x.createdAt)}</p>)}</section></div>}
      {section === "ayarlar" && <div className="grid gap-4 xl:grid-cols-2"><section className="panel-surface p-5"><h2 className="font-extrabold">Güvenli varsayılanlar</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--site-body)]"><li>AI başlangıç modu: SUGGESTION</li><li>Kapalı/spam konuşmalar saklama süresi sonunda anonimleştirilir.</li><li>Finans kayıtları hard delete edilmez; ters kayıt kullanılır.</li><li>Entegrasyon anahtarları istemciye gönderilmez.</li></ul>{can("settings:write") ? <form action={updateRetentionSettings} className="mt-5 flex flex-wrap items-end gap-2"><label className="text-xs">KVKK saklama süresi (gün)<input name="retentionDays" type="number" min="30" max="3650" defaultValue={settingsUnits[0]?.retentionDays ?? 730} className="ml-2 rounded-xl border p-2"/></label><button className="rounded-xl border px-4 py-2 text-xs font-bold">Tüm yetkili iş birimlerine uygula</button></form> : null}</section>{can("role:read") ? <section className="panel-surface p-5"><h2 className="font-extrabold">İş birimi rolleri</h2>{can("role:write") ? <form action={assignBusinessRole} className="mt-3 grid gap-2"><select required aria-label="Kullanıcı" name="userId" className="rounded-xl border p-2 text-xs"><option value="">Kullanıcı seçin</option>{settingsUsers.map((user)=><option key={user.id} value={user.id}>{user.fullName} · {user.email}</option>)}</select><select required aria-label="İş birimi" name="businessUnitId" className="rounded-xl border p-2 text-xs">{settingsUnits.map((unit)=><option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><select aria-label="İşletme rolü" name="role" className="rounded-xl border p-2 text-xs">{["SUPER_ADMIN","ADMIN","SALES","SUPPORT","ACCOUNTING","VIEWER"].map((role)=><option key={role}>{role}</option>)}</select><button className="rounded-xl border p-2 text-xs font-bold">Rol ata</button></form> : null}{roleAssignments.map((item)=><div key={item.id} className="mt-2 flex items-center justify-between gap-2 border-t pt-2 text-[10px]"><span>{item.user.fullName} · {item.businessUnit.name} · {item.role}</span>{can("role:write")?<form action={revokeBusinessRole}><input type="hidden" name="id" value={item.id}/><button className="font-bold text-rose-700 underline">Kaldır</button></form>:null}</div>)}</section> : null}</div>}
    </div>
  </PanelShell>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[] }) { return rows.length?<div className="panel-surface overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead><tr>{headers.map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{rows}</tbody></table></div>:<Empty text="Kayıt bulunmuyor."/>; }
function TransactionTable({ rows, canReverse }: { rows: Awaited<ReturnType<typeof prisma.financialTransaction.findMany>>; canReverse: boolean }) { return <DataTable headers={["Tarih","Açıklama","Kaynak","Kategori","Net","Vergi","Durum","İşlem"]} rows={rows.map(x=><tr key={x.id} className="border-t"><td className="p-3">{dt.format(x.transactionAt)}</td><td className="p-3 font-bold">{x.description}</td><td className="p-3">{x.source}</td><td className="p-3">{x.category}</td><td className="p-3">{tl.format(x.netCents/100)}</td><td className="p-3">{tl.format(x.vatCents/100)}</td><td className="p-3">{x.status}</td><td className="p-3">{!x.cancelledAt&&canReverse?<form action={reverseFinancialTransaction}><input type="hidden" name="id" value={x.id}/><button className="text-rose-700 underline">Ters kayıt</button></form>:x.cancelledAt?"İptal":"—"}</td></tr>)}/>; }
