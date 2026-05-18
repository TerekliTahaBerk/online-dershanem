import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { PrivacyRightsCard } from "@/components/panel/privacy/privacy-rights-card";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const ctx = await requirePanelRole("admin");
  const me = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true, email: true, role: true, createdAt: true } });
  const [users, students, teachers, parents] = await Promise.all([
    prisma.user.count(), prisma.student.count(), prisma.teacher.count(), prisma.parent.count(),
  ]);
  return (
    <>
      <PageHeader title="Ayarlar" subtitle="Sistem genel bakış" />
      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <KpiCard label="Kullanıcılar" value={users} />
        <KpiCard label="Öğrenciler" value={students} />
        <KpiCard label="Öğretmenler" value={teachers} />
        <KpiCard label="Veliler" value={parents} />
      </div>
      <Card>
        <CardHeader title="Yönetici hesabı" subtitle="Aktif oturum bilgileri" />
        <CardBody>
          <div className="od-grid" style={{ gridTemplateColumns: "1fr", gap: 8, fontSize: 13 }}>
            <div><span className="od-muted">Ad: </span>{me?.name ?? "—"}</div>
            <div><span className="od-muted">Email: </span>{me?.email}</div>
            <div><span className="od-muted">Rol: </span>{me?.role}</div>
            <div><span className="od-muted">Hesap oluşturuldu: </span>{me?.createdAt ? new Intl.DateTimeFormat("tr-TR").format(me.createdAt) : "—"}</div>
          </div>
        </CardBody>
      </Card>
      <div style={{ marginTop: 16 }}>
        <PrivacyRightsCard />
      </div>
    </>
  );
}
