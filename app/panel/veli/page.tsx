import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";

export const dynamic = "force-dynamic";

export default async function ParentDashboard() {
  const ctx = await requirePanelRole("veli");
  const parent = await prisma.parent.findFirst({
    where: { userId: ctx.userId },
    include: { students: { include: { student: true } } },
  });

  if (!parent || parent.students.length === 0) {
    return (
      <>
        <PageHeader title="Veli Paneli" />
        <Card>
          <EmptyState
            icon="users"
            title="Bağlı bir çocuk bulunmuyor"
            description="Yönetimle iletişime geçerek çocuklarınızın hesaplarını bağlatabilirsiniz."
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={`Hoş geldin, ${parent.fullName}`} subtitle={`${parent.students.length} çocuk`} />
      <div className="od-grid g-2">
        {parent.students.map(({ student }) => (
          <Card key={student.id}>
            <CardHeader title={student.fullName} subtitle={`${student.classLevel ?? "—"} · ${student.examType ?? "—"}`} />
            <CardBody>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div><span className="od-muted">Telefon: </span><span className="od-mono">{student.phone}</span></div>
                <div><span className="od-muted">Şehir: </span>{student.city ?? "—"}</div>
                <div><Badge tone="accent">{student.status}</Badge></div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
