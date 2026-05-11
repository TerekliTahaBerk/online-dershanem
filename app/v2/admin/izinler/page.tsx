import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { PermissionMatrix } from "@/components/od/domain/permissions/permission-matrix";
import { requirePagePermission } from "@/lib/rbac/define-action";

export default async function PermissionsPage() {
  await requirePagePermission("permissions.read");

  const [permissions, rolePerms] = await Promise.all([
    prisma.permission.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    }),
    prisma.rolePermission.findMany({
      select: { role: true, permissionId: true },
    }),
  ]);

  const granted = rolePerms.map((rp) => `${rp.role}::${rp.permissionId}`);

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="İzin Matrisi"
        description={`${permissions.length} izin · 4 rol — ADMIN tüm izinlere sahiptir, değiştirilemez.`}
      />
      <PermissionMatrix permissions={permissions} granted={granted} />
    </div>
  );
}
