import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getInterventionInbox } from "@/lib/intervention-inbox-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { InterventionInbox } from "@/components/panel/intervention-inbox";
import { InterventionCreateForm } from "@/components/panel/intervention-create-form";

export const dynamic = "force-dynamic";

export default async function AdminInterventionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("ADMIN");
  if (!getPanelFeatureFlags().interventionInbox) notFound();

  const query = await searchParams;
  const initialStudentId = typeof query.ogrenci === "string" ? query.ogrenci : "";

  const [rows, studentsRaw] = await Promise.all([
    getInterventionInbox({ role: "ADMIN", userId: session.userId }),
    prisma.studentProfile.findMany({
      where: { user: { status: "ACTIVE" } },
      orderBy: { user: { fullName: "asc" } },
      take: 400,
      select: {
        id: true,
        user: { select: { fullName: true, email: true } },
      },
    }),
  ]);

  const students = studentsRaw.map((student) => ({
    id: student.id,
    name: student.user.fullName || student.user.email,
  }));
  const scopedInitial = students.some((student) => student.id === initialStudentId)
    ? initialStudentId
    : "";

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
      <AdminPageHeader
        eyebrow="İnsan müdahalesi"
        title="Hiçbir sinyal sahipsiz kalmasın."
        description="Açıklanabilir kural, 24 saat hedefi, sahiplik, sonuç ve yanlış işaret geri bildirimi tek yerde."
        icon={Inbox}
        meta={`${rows.length} kayıt`}
      />
      <div className="mt-7 space-y-5">
        <InterventionCreateForm students={students} initialStudentId={scopedInitial} />
        <InterventionInbox rows={rows} />
      </div>
    </PanelShell>
  );
}
