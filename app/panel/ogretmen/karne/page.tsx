import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function TeacherReports() {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  const comments = await prisma.teacherComment.findMany({
    where: { teacherId: teacher.id }, orderBy: { createdAt: "desc" }, take: 100,
    include: { student: { select: { fullName: true } } },
  });
  return (
    <>
      <PageHeader title="Karne / Yorumlar" subtitle={`${comments.length} yorum`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Öğrenci</th><th>Yorum</th><th>Puan</th><th>Veliyle paylaşım</th><th>Tarih</th></tr></thead>
          <tbody>
            {comments.map((c) => (
              <tr key={c.id}>
                <td>{c.student.fullName}</td>
                <td style={{ maxWidth: 360 }}>{c.content}</td>
                <td className="od-mono">{c.rating ?? "—"}</td>
                <td>{c.visibleToParent ? "✓" : "—"}</td>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR").format(c.createdAt)}</td>
              </tr>
            ))}
            {comments.length === 0 ? <tr><td colSpan={5} style={{ padding: 24, textAlign: "center" }} className="od-muted">Yorum yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
