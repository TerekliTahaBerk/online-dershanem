import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { sendAnnouncementAction } from "../../_actions";

export const dynamic = "force-dynamic";

export default async function NewAnnouncement() {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  const classrooms = await prisma.classroom.findMany({
    where: { teachers: { some: { teacherId: teacher.id } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, branch: true },
  });
  return (
    <>
      <PageHeader
        title="Yeni duyuru"
        right={<Link href="/panel/ogretmen/duyurular" className="od-btn od-btn-ghost od-btn-sm">← Liste</Link>}
      />
      <Card>
        <CardBody>
          <form action={sendAnnouncementAction} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Hedef sınıf">
              <Select name="classroomId" defaultValue="">
                <option value="">— Tüm sınıflarımdaki öğrenciler —</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.branch ? ` · ${c.branch}` : ""}</option>
                ))}
              </Select>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Başlık *"><Input name="title" required /></Field>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="İçerik *"><Textarea name="body" rows={5} required /></Field>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions>
                <button className="od-btn od-btn-primary" type="submit">Gönder</button>
              </FormActions>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
