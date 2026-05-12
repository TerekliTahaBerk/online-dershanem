import { prisma } from "@/lib/prisma";
import { requireParent, getChildIds } from "@/lib/panel-parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Field, Input, Textarea, Select, FormActions } from "@/components/panel/ui/form";
import { sendMessageToTeacherAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function ParentTeachers() {
  const { parent } = await requireParent();
  if (!parent) return <Card><EmptyState icon="users" title="Veli profili yok" /></Card>;
  const childIds = await getChildIds(parent.id);
  if (childIds.length === 0) return <><PageHeader title="Öğretmenlerle" /><Card><EmptyState icon="users" title="Bağlı çocuk yok" /></Card></>;

  const [teachers, comments] = await Promise.all([
    prisma.teacher.findMany({
      where: {
        OR: [
          { lessons: { some: { studentId: { in: childIds } } } },
          { classrooms: { some: { classroom: { students: { some: { studentId: { in: childIds }, leftAt: null } } } } } },
        ],
      },
      select: { id: true, fullName: true, email: true, subjects: true, phone: true },
    }),
    prisma.teacherComment.findMany({
      where: { studentId: { in: childIds }, visibleToParent: true },
      orderBy: { createdAt: "desc" }, take: 30,
      include: { teacher: { select: { fullName: true } }, student: { select: { fullName: true } } },
    }),
  ]);
  return (
    <>
      <PageHeader title="Öğretmenlerle" subtitle={`${teachers.length} öğretmen, ${comments.length} not`} />
      <div className="od-grid g-2">
        <Card>
          <table className="od-table">
            <thead><tr><th>Öğretmen</th><th>Branş</th><th>Email</th><th>Telefon</th></tr></thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}><td>{t.fullName}</td><td>{t.subjects}</td><td className="od-muted">{t.email ?? "—"}</td><td className="od-mono">{t.phone ?? "—"}</td></tr>
              ))}
              {teachers.length === 0 ? <tr><td colSpan={4} style={{ padding: 16 }} className="od-muted">Öğretmen yok.</td></tr> : null}
            </tbody>
          </table>
        </Card>
        <Card>
          <table className="od-table">
            <thead><tr><th>Tarih</th><th>Öğretmen</th><th>Çocuk</th><th>Not</th></tr></thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id}>
                  <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR").format(c.createdAt)}</td>
                  <td>{c.teacher.fullName}</td>
                  <td>{c.student.fullName}</td>
                  <td style={{ maxWidth: 280 }}>{c.content}</td>
                </tr>
              ))}
              {comments.length === 0 ? <tr><td colSpan={4} style={{ padding: 16 }} className="od-muted">Not yok.</td></tr> : null}
            </tbody>
          </table>
        </Card>
      </div>

      {teachers.length > 0 ? (
        <>
          <CardHeader title="Öğretmene mesaj gönder" subtitle="Mesajınız öğretmenin gelen kutusuna iletilir" />
          <div className="od-grid g-2">
            {teachers.map((t) => (
              <Card key={`msg-${t.id}`}>
                <CardHeader title={t.fullName} subtitle={t.subjects ?? ""} />
                <CardBody>
                  <form action={sendMessageToTeacherAction} style={{ display: "grid", gap: 10 }}>
                    <input type="hidden" name="teacherId" value={t.id} />
                    <Field label="Çocuk">
                      <Select name="studentId" required defaultValue="">
                        <option value="" disabled>Seçin…</option>
                        {parent.students.map(({ student }) => (
                          <option key={student.id} value={student.id}>{student.fullName}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Konu">
                      <Input name="title" required maxLength={120} placeholder="Konu" />
                    </Field>
                    <Field label="Mesaj">
                      <Textarea name="body" required rows={3} maxLength={2000} placeholder="Öğretmene iletmek istediğiniz mesaj..." />
                    </Field>
                    <FormActions>
                      <button type="submit" className="od-btn od-btn-primary od-btn-sm">Gönder</button>
                    </FormActions>
                  </form>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
