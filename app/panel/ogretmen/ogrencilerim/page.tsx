import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { getTeacherStudentRisks } from "@/lib/teacher-utils";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TeacherStudents() {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { lessons: { some: { teacherId: teacher.id } } },
        { classrooms: { some: { classroom: { teachers: { some: { teacherId: teacher.id } } } } } },
      ],
    },
    take: 200,
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, classLevel: true, examType: true, status: true, phone: true },
  });

  const riskMap = await getTeacherStudentRisks(teacher.id, students.map((s) => s.id));
  const sorted = [...students].sort((a, b) => {
    const ra = riskMap.get(a.id)?.score ?? 0;
    const rb = riskMap.get(b.id)?.score ?? 0;
    if (rb !== ra) return rb - ra;
    return a.fullName.localeCompare(b.fullName, "tr");
  });
  const highRiskCount = Array.from(riskMap.values()).filter((r) => r.level === "high").length;

  return (
    <>
      <PageHeader
        title="Öğrencilerim"
        subtitle={`${students.length} öğrenci${highRiskCount > 0 ? ` · ${highRiskCount} yüksek risk` : ""}`}
      />
      <Card>
        <table className="od-table">
          <thead><tr><th>Ad</th><th>Risk</th><th>Sınıf</th><th>Sınav</th><th>Telefon</th><th>Durum</th><th></th></tr></thead>
          <tbody>
            {sorted.map((s) => {
              const r = riskMap.get(s.id);
              return (
                <tr key={s.id}>
                  <td><Link href={`/panel/ogretmen/ogrencilerim/${s.id}`} className="od-link">{s.fullName}</Link></td>
                  <td>
                    {r && r.score > 0 ? (
                      <Badge tone={r.level === "high" ? "bad" : r.level === "medium" ? "warn" : "neutral"}>
                        ⚠ {r.score}
                      </Badge>
                    ) : (
                      <span className="od-muted">—</span>
                    )}
                  </td>
                  <td>{s.classLevel ?? "—"}</td>
                  <td>{s.examType ?? "—"}</td>
                  <td className="od-mono">{s.phone}</td>
                  <td><Badge tone={s.status === "ACTIVE" ? "ok" : "neutral"}>{s.status}</Badge></td>
                  <td><Link href={`/panel/ogretmen/ogrencilerim/${s.id}`} className="od-btn od-btn-ghost od-btn-sm">Aç</Link></td>
                </tr>
              );
            })}
            {students.length === 0 ? <tr><td colSpan={7} style={{ padding: 24, textAlign: "center" }} className="od-muted">Öğrenci yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
