import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { ExamWizard } from "@/components/panel/odk/admin/exam-wizard";

export const metadata: Metadata = {
  title: "Yeni Deneme · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewExamPage() {
  await requireOdkPanel("admin");
  return (
    <>
      <PageHeader
        title="Yeni Deneme"
        subtitle="4 adımda denemeyi oluştur, PDF + JSON yükle, erişim ver ve yayınla."
      />
      <Card>
        <CardBody>
          <ExamWizard />
        </CardBody>
      </Card>
    </>
  );
}
