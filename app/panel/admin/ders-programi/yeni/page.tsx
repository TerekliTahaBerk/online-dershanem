import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { ToastForm } from "@/components/ui/toast-form";
import { createLessonAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function NewLessonPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; classroomId?: string; teacherId?: string; studentId?: string }>;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;

  const [teachers, classrooms, students, courses] = await Promise.all([
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    prisma.classroom.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, branch: true, _count: { select: { students: true } } },
    }),
    prisma.student.findMany({
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
      take: 500,
    }),
    prisma.course.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true, subject: true },
    }),
  ]);

  // Bugünün tarihi YYYY-MM-DD (default)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  return (
    <>
      <PageHeader
        title="Yeni ders planla"
        subtitle="Tek seferlik veya haftalık tekrarlı"
        right={
          <Link href="/panel/admin/ders-programi" className="od-btn od-btn-ghost od-btn-sm">
            ← Programa dön
          </Link>
        }
      />

      <Card>
        <CardBody>
          <ToastForm action={createLessonAction} className="od-grid g-2" style={{ gap: 16 }}>
            <Field label="Ders tanımı (Course)">
              <Select name="courseId" defaultValue={sp.courseId ?? ""}>
                <option value="">— Seçilmedi (özel ders) —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title} · {c.subject}</option>
                ))}
              </Select>
            </Field>

            <Field label="Öğretmen *">
              <Select name="teacherId" required defaultValue={sp.teacherId ?? ""}>
                <option value="" disabled>Seçin…</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.fullName}</option>
                ))}
              </Select>
            </Field>

            <Field label="Sınıf (grup dersi)">
              <Select name="classroomId" defaultValue={sp.classroomId ?? ""}>
                <option value="">— Bireysel ders —</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.branch ? ` · ${c.branch}` : ""} ({c._count.students} öğr.)
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Öğrenci (sadece bireysel)">
              <Select name="studentId" defaultValue={sp.studentId ?? ""}>
                <option value="">— (Sınıf seçtiyseniz boş bırakın) —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </Select>
            </Field>

            <Field label="Başlık (opsiyonel)">
              <Input name="title" maxLength={120} placeholder="Course seçtiyseniz boş bırakabilirsiniz" />
            </Field>

            <Field label="Branş / konu">
              <Input name="subject" maxLength={80} />
            </Field>

            <Field label="Tarih *">
              <Input name="scheduledDate" type="date" required defaultValue={todayStr} />
            </Field>

            <Field label="Başlangıç saati">
              <Input name="scheduledTime" type="time" defaultValue="17:00" />
            </Field>

            <Field label="Süre (dakika)">
              <Input name="duration" type="number" min={15} max={300} defaultValue={60} />
            </Field>

            <Field label="Durum">
              <Select name="status" defaultValue="SCHEDULED">
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </Select>
            </Field>

            <Field label="Online ders linki">
              <Input name="googleMeetLink" type="url" placeholder="https://meet.google.com/…" />
            </Field>

            <Field label="Lokasyon">
              <Input name="location" placeholder="Şube / Online" />
            </Field>

            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Notlar">
                <Textarea name="notes" rows={3} maxLength={1000} />
              </Field>
            </div>

            <fieldset
              style={{
                gridColumn: "1 / -1",
                border: "1px solid var(--pd-line)",
                borderRadius: 8,
                padding: 12,
                display: "grid",
                gap: 8,
              }}
            >
              <legend style={{ fontSize: 12, fontWeight: 600, padding: "0 6px" }}>Tekrar</legend>
              <label style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <span><input type="radio" name="recurrence" value="none" defaultChecked /> Tek seferlik</span>
                <span><input type="radio" name="recurrence" value="weekly" /> Haftalık</span>
                <span><input type="radio" name="recurrence" value="biweekly" /> İki haftada bir</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="od-muted" style={{ fontSize: 12 }}>Tekrar sayısı:</span>
                <Input name="weeklyCount" type="number" min={1} max={52} defaultValue={4} style={{ width: 80 }} />
                <span className="od-muted" style={{ fontSize: 11 }}>
                  (max 52 — yalnızca haftalık/iki haftalık seçilirse)
                </span>
              </div>
            </fieldset>

            <fieldset
              style={{
                gridColumn: "1 / -1",
                border: "1px solid var(--pd-line)",
                borderRadius: 8,
                padding: 12,
                display: "grid",
                gap: 6,
              }}
            >
              <legend style={{ fontSize: 12, fontWeight: 600, padding: "0 6px" }}>Bildirim</legend>
              <label><input type="checkbox" name="notifyStudents" defaultChecked /> Öğrencilere bildirim gönder</label>
              <label><input type="checkbox" name="notifyTeacher" defaultChecked /> Öğretmene bildirim gönder</label>
              <label><input type="checkbox" name="notifyParents" defaultChecked /> Velilere bildirim gönder (varsa)</label>
            </fieldset>

            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions>
                <Link href="/panel/admin/ders-programi" className="od-btn od-btn-ghost">İptal</Link>
                <button type="submit" className="od-btn od-btn-primary">Planla</button>
              </FormActions>
            </div>
          </ToastForm>
        </CardBody>
      </Card>
    </>
  );
}
