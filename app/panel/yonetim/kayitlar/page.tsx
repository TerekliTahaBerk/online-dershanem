import Link from "next/link";
import { History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminPageHeader } from "@/components/panel/admin-page-header";

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
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(date);
}

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<{ tur?: string }> }) {
  const session = await requireRole("ADMIN");
  const { tur = "" } = await searchParams;
  const allowedType = FILTERS.some((filter) => filter.value === tur) ? tur : "";
  const logs = await prisma.auditLog.findMany({
    where: allowedType ? { entityType: allowedType } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const actorIds = [...new Set(logs.map((log) => log.actorUserId).filter((id): id is string => Boolean(id)))];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true, email: true } })
    : [];
  const actorNames = new Map(actors.map((actor) => [actor.id, actor.fullName || actor.email]));

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
      <AdminPageHeader eyebrow="Güvenlik ve izlenebilirlik" title="İşlem geçmişi" description="Panelde yapılan önemli değişiklikleri, işlemi yapan hesabı ve zamanı tek yerde görün." icon={History} meta={`Son ${logs.length} kayıt`} />

      <nav aria-label="Kayıt türü filtresi" className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((filter) => {
          const active = allowedType === filter.value;
          return <Link key={filter.value || "all"} href={filter.value ? `/panel/yonetim/kayitlar?tur=${filter.value}` : "/panel/yonetim/kayitlar"} className={`min-w-fit rounded-full border px-3.5 py-2 text-xs font-bold transition ${active ? "border-[var(--brand-olive)] bg-[var(--brand-olive)] text-white" : "border-[var(--site-line)] bg-white text-[var(--site-muted)] hover:text-[var(--site-ink)]"}`}>{filter.label}</Link>;
        })}
      </nav>

      <section className="mt-4 overflow-hidden rounded-[24px] border border-[var(--site-line)] bg-white shadow-[var(--panel-card-shadow)]">
        <div className="divide-y divide-[var(--site-line)]">
          {logs.map((log) => (
            <article key={log.id} className="grid gap-2 px-4 py-4 transition hover:bg-[var(--site-bg-warm)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--brand-olive-soft)] px-2.5 py-1 text-[10.5px] font-bold text-[var(--brand-olive)]">{ENTITY_LABELS[log.entityType] || log.entityType}</span>
                  <p className="text-sm font-bold text-[var(--site-ink)]">{log.summary || log.action}</p>
                </div>
                <p className="mt-1.5 truncate text-xs text-[var(--site-muted)]">{log.actorUserId ? actorNames.get(log.actorUserId) || "Silinmiş kullanıcı" : "Sistem"} · {log.action}</p>
              </div>
              <time dateTime={log.createdAt.toISOString()} className="text-xs font-medium text-[var(--site-muted)] sm:text-right">{formatDate(log.createdAt)}</time>
            </article>
          ))}
          {!logs.length ? <div className="px-5 py-14 text-center"><p className="text-sm font-bold text-[var(--site-ink)]">Bu türde henüz işlem yok</p><p className="mt-1 text-xs text-[var(--site-muted)]">Yeni yönetim işlemleri burada otomatik görünecek.</p></div> : null}
        </div>
      </section>
      <p className="mt-3 text-right text-[11px] text-[var(--site-muted)]">En yeni 100 kayıt gösterilir.</p>
    </PanelShell>
  );
}
