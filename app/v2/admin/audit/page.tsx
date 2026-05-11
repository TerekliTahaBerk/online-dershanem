import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { AuditTable } from "@/components/od/domain/audit/audit-table";
import { requirePagePermission } from "@/lib/rbac/define-action";
import { getServerAuthSession } from "@/lib/auth";
import { loadSavedViews } from "@/lib/services/saved-views/loader";

type SearchParams = {
  entityType?: string;
  action?: string;
  q?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
  page?: string;
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePagePermission("audit.read");
  const sp = await searchParams;
  const session = await getServerAuthSession();
  const currentUserId = session?.user?.id;

  const page = Math.max(1, Number(sp.page ?? 1));
  const take = 50;
  const skip = (page - 1) * take;

  const where: any = {
    ...(sp.entityType ? { entityType: sp.entityType } : {}),
    ...(sp.action ? { action: { contains: sp.action, mode: "insensitive" } } : {}),
    ...(sp.actorUserId ? { actorUserId: sp.actorUserId } : {}),
    ...(sp.q
      ? {
          OR: [
            { entityType: { contains: sp.q, mode: "insensitive" } },
            { action: { contains: sp.q, mode: "insensitive" } },
            { summary: { contains: sp.q, mode: "insensitive" } },
            { entityId: { contains: sp.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (sp.from || sp.to) {
    where.createdAt = {};
    if (sp.from) where.createdAt.gte = new Date(sp.from);
    if (sp.to) {
      const end = new Date(sp.to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [rows, total, savedViews] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
    loadSavedViews("audit", currentUserId),
  ]);

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Audit Log"
        description="Sistemdeki tüm yazma işlemlerinin denetim kaydı"
      />
      <AuditTable
        rows={rows as any}
        total={total}
        filter={{
          entityType: sp.entityType,
          action: sp.action,
          q: sp.q,
          actorUserId: sp.actorUserId,
          from: sp.from,
          to: sp.to,
          page,
        }}
        savedViews={savedViews}
        currentUserId={currentUserId}
      />
    </div>
  );
}
