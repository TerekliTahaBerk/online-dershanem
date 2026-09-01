import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getInterventionInbox } from "@/lib/intervention-inbox-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { InterventionInbox } from "@/components/panel/intervention-inbox";
import { InterventionCreateForm } from "@/components/panel/intervention-create-form";

export const dynamic = "force-dynamic";

export default async function TeacherInterventionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("TEACHER");
  if (!getPanelFeatureFlags().interventionInbox) notFound();

  const query = await searchParams;
  const initialStudentId = typeof query.ogrenci === "string" ? query.ogrenci : "";

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
    initialStudentId && students.some((student) => student.id === initialStudentId)
      ? initialStudentId
      : "";

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
      <header>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]">
          <Inbox size={15} /> İnsan müdahalesi
        </p>
        <h1 className="mt-2 text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em]">
          Sinyal, sahibi ve küçük eylemiyle gelsin.
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--site-body)]">
          Tek günlük dalgalanma veya opak risk puanı yok. Kural sinyali veya kendi gözleminizle kayıt
          açın; bağlamı siz doğrularsınız.
        </p>
      </header>
      <div className="mt-7 space-y-5">
        <InterventionCreateForm students={students} initialStudentId={scopedInitial} />
        <InterventionInbox rows={rows} />
      </div>
    </PanelShell>
  );
}
