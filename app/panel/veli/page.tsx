import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";
import Link from "next/link";

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

  const childIds = parent.students.map((x) => x.student.id);
  const since30 = new Date(Date.now() - 30 * 86400000);

  const [pendingAssignments, attendance30, gradedSubs, latestExam] = await Promise.all([
    prisma.assignment.count({
      where: {
        OR: [
          { studentId: { in: childIds } },
          { classroom: { students: { some: { studentId: { in: childIds }, leftAt: null } } } },
        ],
        dueAt: { gte: new Date() },
        submissions: { none: { studentId: { in: childIds }, submittedAt: { not: null } } },
      },
    }),
    prisma.attendance.findMany({
      where: { studentId: { in: childIds }, sessionDate: { gte: since30 } },
      select: { status: true },
    }),
    prisma.assignmentSubmission.count({
      where: { studentId: { in: childIds }, status: "GRADED" },
    }),
    prisma.studentExamResult.findFirst({
      where: { studentId: { in: childIds } },
      orderBy: { takenAt: "desc" },
      select: { net: true, title: true, takenAt: true, student: { select: { fullName: true } } },
    }),
  ]);

  const presentCount = attendance30.filter((a: { status: string }) => a.status === "PRESENT").length;
  const attendanceRate = attendance30.length ? Math.round((presentCount / attendance30.length) * 100) : null;

  return (
    <>
      <PageHeader title={`Hoş geldin, ${parent.fullName}`} subtitle={`${parent.students.length} çocuk`} />

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <KpiCard label="Bekleyen ödev" value={pendingAssignments} meta="Tüm çocukların" />
        <KpiCard label="30 gün devam" value={attendanceRate != null ? `%${attendanceRate}` : "—"} meta={`${attendance30.length} kayıt`} />
        <KpiCard label="Değerlendirilmiş ödev" value={gradedSubs} meta="Toplam" />
        <KpiCard label="Son net" value={latestExam?.net?.toString() ?? "—"} meta={latestExam ? `${latestExam.student.fullName} · ${latestExam.title}` : "Deneme yok"} />
      </div>

      <CardHeader title="Çocuklar" />
      <div className="od-grid g-2">
        {parent.students.map(({ student }) => (
          <Card key={student.id}>
            <CardHeader title={student.fullName} subtitle={`${student.classLevel ?? "—"} · ${student.examType ?? "—"}`} />
            <CardBody>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
                <div><span className="od-muted">Telefon: </span><span className="od-mono">{student.phone}</span></div>
                <div><span className="od-muted">Şehir: </span>{student.city ?? "—"}</div>
                <div><Badge tone="accent">{student.status}</Badge></div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Link href={`/panel/veli/cocuklarim/${student.id}`} className="od-btn od-btn-ghost od-btn-sm">Detayları gör →</Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
