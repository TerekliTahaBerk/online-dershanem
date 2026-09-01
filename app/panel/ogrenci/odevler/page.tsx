import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { StudentAssignmentList } from "@/components/panel/student-assignment-list";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelHeading,
  PanelSectionLabel,
  PanelEmpty,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · ÇALIŞMALAR — Online Dershanem ödevleri.
 *
 * Online Koçum plan görevleri bu sayfada listelenmez. Domain ayrımı:
 *  - Dershanem Assignment → bu sayfa (`/odevler`)
 *  - Koçum Plan Task → `/panel/ogrenci/plan` (Bugün / haftalık plan)
 *
 * Plan task bir Assignment'a referans verebilir; kopya oluşturulmaz.
 */

export default async function StudentTasksPage() {
  const session = await requireRole("STUDENT");
  const evidenceEnabled = getPanelFeatureFlags().assignmentEvidence;
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId } });

  const shell = (children: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Çalışmalar"
    >
      <div className="max-w-[860px]">{children}</div>
    </PanelShell>
  );

  if (!profile) {
    return shell(
      <>
        <PanelHeading title="Çalışmalar" />
        <PanelEmpty
          title="Profilin hazırlanıyor."
          body="Öğrenci profilin tamamlandığında çalışmaların burada listelenir."
        />
      </>,
    );
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: profile.id, endedAt: null },
    select: { groupId: true },
  });
  const groupIds = enrollments.map((e) => e.groupId);

  const [assignments] = await Promise.all([
    groupIds.length
      ? prisma.assignment.findMany({
          where: { isActive: true, groupId: { in: groupIds } },
          orderBy: { dueAt: "asc" },
          include: {
            progress: { where: { studentId: profile.id }, take: 1 },
            group: { select: { name: true, subject: true, teacher: { select: { fullName: true } } } },
            rubricCriteria: { orderBy: { position: "asc" } },
            submissions: { where: { studentId: profile.id }, orderBy: { attemptNumber: "desc" }, include: { scores: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  /*
   * Yalnız Dershanem Assignment — Koçum plan görevleri /plan sayfasındadır.
   */
  return shell(
    <>
      <PanelHeading
        title="Çalışmalar"
        description="Öğretmeninin verdiği Dershanem ödevleri. Koçunun plan görevleri için Plan sayfasına git."
      />

      {assignments.length === 0 ? (
        <PanelEmpty
          title="Bekleyen ödev yok."
          body="Öğretmenin yeni bir ödev eklediğinde burada görünecek. Haftalık çalışma planın Plan sayfasında."
        />
      ) : (
        <div className="mt-6">
          <PanelSectionLabel>Dershanem ödevleri</PanelSectionLabel>
          <div className="mt-2.5">
            <StudentAssignmentList
              evidenceEnabled={evidenceEnabled}
              assignments={assignments.map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description || "",
                dueAt: item.dueAt.toISOString(),
                groupName: item.group.name,
                subject: item.group.subject,
                status: item.progress[0]?.status || "TODO",
                version: item.progress[0]?.version || 0,
                evidenceRequired: item.evidenceRequired,
                criteria: item.rubricCriteria.map((criterion) => ({ id: criterion.id, label: criterion.label })),
                submissions: item.submissions.map((submission) => ({
                  id: submission.id,
                  attemptNumber: submission.attemptNumber,
                  status: submission.status,
                  textEvidence: submission.textEvidence,
                  feedback: submission.feedback,
                  scores: submission.scores.map((score) => ({ criterionId: score.criterionId, level: score.level })),
                })),
              }))}
            />
          </div>
        </div>
      )}
    </>,
  );
}
