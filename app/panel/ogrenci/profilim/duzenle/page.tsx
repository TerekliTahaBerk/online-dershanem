import Link from "next/link";
import { requireStudent } from "@/lib/panel-student";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, FormActions } from "@/components/panel/ui/form";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { updateStudentProfileAction } from "../../_actions";

export const dynamic = "force-dynamic";

export default async function EditStudentProfile() {
  const { student } = await requireStudent();
  if (!student) return <Card><EmptyState icon="user" title="Öğrenci profili yok" /></Card>;
  return (
    <>
      <PageHeader
        title="Profili düzenle"
        right={<Link href="/panel/ogrenci/profilim" className="od-btn od-btn-ghost od-btn-sm">← Geri</Link>}
      />
      <Card>
        <CardBody>
          <form action={updateStudentProfileAction} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Email"><Input name="email" type="email" defaultValue={student.email ?? ""} /></Field>
            <Field label="Şehir"><Input name="city" defaultValue={student.city ?? ""} /></Field>
            <Field label="İlçe"><Input name="district" defaultValue={student.district ?? ""} /></Field>
            <Field label="Okul"><Input name="schoolName" defaultValue={student.schoolName ?? ""} /></Field>
            <Field label="Sınıf"><Input name="classLevel" defaultValue={student.classLevel ?? ""} /></Field>
            <Field label="Sınav türü"><Input name="examType" defaultValue={student.examType ?? ""} /></Field>
            <Field label="Hedef"><Input name="targetGoal" defaultValue={student.targetGoal ?? ""} /></Field>
            <Field label="Hedef okul"><Input name="targetSchool" defaultValue={student.targetSchool ?? ""} /></Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary" type="submit">Kaydet</button></FormActions>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
