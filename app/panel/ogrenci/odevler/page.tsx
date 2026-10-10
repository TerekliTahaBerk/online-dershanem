import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { StudentAssignmentList } from "@/components/panel/student-assignment-list";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelHeading,
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
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
  });

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
          title="Hesabını hazırlıyoruz."
          body="Her şey hazır olduğunda çalışmalarını burada göreceksin."
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
            group: {
              select: {
                name: true,
                subject: true,
                teacher: { select: { fullName: true } },
              },
            },
            rubricCriteria: { orderBy: { position: "asc" } },
            submissions: {
              where: { studentId: profile.id },
              orderBy: { attemptNumber: "desc" },
              include: { scores: true },
            },
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
        description="Öğretmenlerinin sana verdiği ödevler. Koçunun plan görevlerini Plan sayfasında bulabilirsin."
      />

      {assignments.length === 0 ? (
        <PanelEmpty
          title="Bekleyen ödevin yok."
          body="Her şey yolunda görünüyor. Öğretmenin yeni bir ödev eklediğinde ilk burada göreceksin."
        />
      ) : (
        <div className="mt-6 max-w-[880px]">
          <h2 className="mb-1 text-[15px] font-semibold text-pn-text">Öğretmenlerinden gelen ödevler</h2>
          <div>
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
                criteria: item.rubricCriteria.map((criterion) => ({
                  id: criterion.id,
                  label: criterion.label,
                })),
                submissions: item.submissions.map((submission) => ({
                  id: submission.id,
                  attemptNumber: submission.attemptNumber,
                  status: submission.status,
                  textEvidence: submission.textEvidence,
                  feedback: submission.feedback,
                  scores: submission.scores.map((score) => ({
                    criterionId: score.criterionId,
                    level: score.level,
                  })),
                })),
              }))}
            />
          </div>
        </div>
      )}
    </>,
  );
}
