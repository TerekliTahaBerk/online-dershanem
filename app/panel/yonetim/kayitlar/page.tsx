import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { EmptyState, PageHeader, ViewTabs } from "@/components/panel/ui";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "", label: "Tümü" },
  { value: "User", label: "Kişiler" },
  { value: "Group", label: "Gruplar" },
  { value: "Lesson", label: "Dersler" },
  { value: "ParentStudent", label: "Veli bağlantıları" },
  { value: "LeadSubmission", label: "Talepler" },
  { value: "OdOrder", label: "Siparişler" },
] as const;

const ENTITY_LABELS: Record<string, string> = {
  User: "Kişi",
  Group: "Grup",
  Lesson: "Ders",
  ParentStudent: "Veli bağlantısı",
  LeadSubmission: "Talep",
  OdOrder: "Sipariş",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

/** İŞLEM GEÇMİŞİ — tür görünümleri (`?tur=`) ve sade kayıt listesi (Design Phase 6). */
export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const { tur = "" } = await searchParams;
  const allowedType = FILTERS.some((filter) => filter.value === tur) ? tur : "";
  const logs = await prisma.auditLog.findMany({
    where: allowedType ? { entityType: allowedType } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const actorIds = [
    ...new Set(
      logs
        .map((log) => log.actorUserId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, fullName: true, email: true },
      })
    : [];
  const actorNames = new Map(
    actors.map((actor) => [actor.id, actor.fullName || actor.email]),
  );

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="İşlem geçmişi">
      <PageHeader
        title="İşlem geçmişi"
        description="Panelde yapılan önemli değişiklikleri, işlemi yapan hesabı ve zamanı tek yerde görün."
        metadata={`Son ${logs.length} kayıt`}
      />
      <div className="mt-2">
        <ViewTabs
          label="Kayıt türü filtresi"
          activeId={allowedType || "tumu"}
          tabs={FILTERS.map((filter) => ({
            id: filter.value || "tumu",
            label: filter.label,
            href: filter.value ? `/panel/yonetim/kayitlar?tur=${filter.value}` : "/panel/yonetim/kayitlar",
          }))}
        />
      </div>

      {logs.length ? (
        <ol aria-label="İşlem kayıtları" className="mt-4 divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
          {logs.map((log) => (
            <li key={log.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-[13.5px]">
              <span className="min-w-0">
                <span className="mr-2 text-[12px] font-semibold text-pn-text-muted">{ENTITY_LABELS[log.entityType] || log.entityType}</span>
                <span className="text-pn-text">{log.summary || log.action}</span>
                <span className="block text-[12.5px] text-pn-text-muted">
                  {log.actorUserId ? actorNames.get(log.actorUserId) || "Silinmiş kullanıcı" : "Sistem"} · {log.action}
                </span>
              </span>
              <time dateTime={log.createdAt.toISOString()} className="shrink-0 text-[12.5px] tabular-nums text-pn-text-muted">
                {formatDate(log.createdAt)}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState className="mt-4" title="Bu türde henüz işlem yok." body="Yeni yönetim işlemleri burada otomatik görünür." />
      )}
      <p className="mt-3 text-[12.5px] text-pn-text-muted">En yeni 100 kayıt gösterilir.</p>
    </PanelShell>
  );
}
