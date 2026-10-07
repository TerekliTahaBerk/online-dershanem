import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getInterventionInbox } from "@/lib/intervention-inbox-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { InterventionInbox } from "@/components/panel/intervention-inbox";
import { InterventionCreateForm } from "@/components/panel/intervention-create-form";
import {
  PAGE_EYEBROW_CLASS,
  PAGE_TITLE_CLASS,
  PAGE_DESCRIPTION_CLASS,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

export default async function TeacherInterventionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("TEACHER");
  if (!getPanelFeatureFlags().interventionInbox) notFound();

  const query = await searchParams;
  const initialStudentId =
    typeof query.ogrenci === "string" ? query.ogrenci : "";

  const [rows, groups] = await Promise.all([
    getInterventionInbox({ role: "TEACHER", userId: session.userId }),
    prisma.group.findMany({
      where: { teacherId: session.userId, isActive: true },
      select: {
        enrollments: {
          where: { endedAt: null },
          select: {
            student: {
              select: {
                id: true,
                user: { select: { fullName: true, email: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const students = groups
    .flatMap((group) =>
      group.enrollments.map((enrollment) => ({
        id: enrollment.student.id,
        name: enrollment.student.user.fullName || enrollment.student.user.email,
      })),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  const scopedInitial =
    initialStudentId &&
    students.some((student) => student.id === initialStudentId)
      ? initialStudentId
      : "";

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header>
        <p className={PAGE_EYEBROW_CLASS}>
          <Inbox size={15} /> İnsan müdahalesi
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Sinyal, sahibi ve küçük eylemiyle gelsin.
        </h1>
        <p className={PAGE_DESCRIPTION_CLASS}>
          Tek günlük dalgalanma veya opak risk puanı yok. Kural sinyali veya
          kendi gözleminizle kayıt açın; bağlamı siz doğrularsınız.
        </p>
      </header>
      <div className="mt-7 space-y-5">
        <InterventionCreateForm
          students={students}
          initialStudentId={scopedInitial}
        />
        <InterventionInbox rows={rows} />
      </div>
    </PanelShell>
  );
}
