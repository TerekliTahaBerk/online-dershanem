import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminLearningForms } from "@/components/panel/admin-learning-forms";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { BookOpenCheck } from "lucide-react";
import { EducationManagement } from "@/components/panel/education-management";
import { TeacherAssignmentManager } from "@/components/panel/teacher-assignment-manager";
import { AdminSetupWizard } from "@/components/panel/admin-setup-wizard";
import { TeacherMaterialManager } from "@/components/panel/teacher-material-manager";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelTable, PanelTableRow, PanelTableCell, PanelEmpty } from "@/components/panel/ui";

export const dynamic = "force-dynamic";

export default async function EducationAdminPage() {
  const session = await requireRole("ADMIN");
  const featureFlags = getPanelFeatureFlags();
  const [teachersRaw, studentsRaw, parentsRaw, groupsRaw, lessons, assignments, materials, outcomes] = await Promise.all([
    prisma.user.findMany({ where: { role: "TEACHER", status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
    prisma.studentProfile.findMany({ where: { user: { status: "ACTIVE" } }, orderBy: { user: { fullName: "asc" } }, include: { user: { select: { fullName: true, email: true } } } }),
    prisma.user.findMany({ where: { role: "PARENT", status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
    prisma.group.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { teacher: { select: { id: true, fullName: true, email: true } }, enrollments: { where: { endedAt: null }, include: { student: { include: { user: { select: { fullName: true, email: true } } } } } } } }),
    prisma.lesson.findMany({ where: { startsAt: { gte: new Date(Date.now() - 7 * 86400000) } }, orderBy: { startsAt: "asc" }, take: 24, include: { group: { select: { name: true } }, teacher: { select: { fullName: true, email: true } } } }),
    prisma.assignment.findMany({ orderBy: { dueAt: "desc" }, take: 40, include: { group: { select: { name: true } }, progress: true, outcomeLinks: { include: { outcome: { select: { code: true } } } } } }),
    prisma.learningMaterial.findMany({ orderBy: { createdAt: "desc" }, take: 60, include: { group: { select: { name: true } } } }),
    featureFlags.learningOutcomes ? prisma.learningOutcome.findMany({ where: { isActive: true, unit: { subject: { version: { status: "ACTIVE" } } } }, orderBy: [{ favorites: { _count: "desc" } }, { assignments: { _count: "desc" } }, { updatedAt: "desc" }, { code: "asc" }], take: 15, include: { unit: { include: { subject: true } }, skills: { include: { skill: true } }, favorites: { where: { userId: session.userId } }, assignments: { where: { linkedById: session.userId }, take: 1 } } }) : Promise.resolve([]),
  ]);
  const name = (item: { fullName: string | null; email: string }) => item.fullName || item.email;

  /*
   * GRUP GENEL BAKIŞI — onaylı tasarım (Panel.dc.html → agroups).
   *
   * Tasarım bu ekranın en üstünde grupların tablosunu istiyor; sayfada yönetim
   * araçları vardı ama liste yoktu. Doluluk `enrollments / capacity` ile
   * gerçek veriden gelir.
   *
   * Tasarımdaki "öğretmensiz grup" uyarısı UYGULANMADI: şemada `Group.teacherId`
   * zorunlu ve `onDelete: Restrict`, yani öğretmensiz grup oluşamaz. Var
   * olamayacak bir durumu saymak yanıltıcı olurdu.
   *
   * "Program" sütunu yerine SONRAKİ PLANLI DERS gösterilir: yinelenen program
   * modeli şemada yok, dersler tek tek kayıtlı.
   */
  const nextLessonByGroup = new Map<string, Date>();
  for (const lesson of lessons) {
    if (lesson.status !== "PLANNED") continue;
    const current = nextLessonByGroup.get(lesson.groupId);
    if (!current || lesson.startsAt < current) nextLessonByGroup.set(lesson.groupId, lesson.startsAt);
  }
  const WHEN = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });
  const activeGroups = groupsRaw.filter((group) => group.isActive);
  const openSeats = activeGroups.filter((g) => g.enrollments.length < g.capacity).length;
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
    <AdminPageHeader eyebrow="Eğitim operasyonu" title="Grubu kur, dersi planla." description="Tek akıştan öğretmen ekranını, öğrenci özetini ve veli görünümünü birlikte besleyin." icon={BookOpenCheck} meta={`${groupsRaw.filter((group) => group.isActive).length} aktif grup`} />
    <section className="mt-7">
      <h2 className="text-[16px] font-bold text-dc-ink">Gruplar</h2>
      <p className="mt-1 text-[13.5px] text-dc-ink-muted">{activeGroups.length} aktif grup{openSeats ? ` · ${openSeats} grupta boş kontenjan` : ""}</p>
      {activeGroups.length === 0 ? (
        <PanelEmpty title="Aktif grup yok." body="Grup oluşturulduğunda öğretmeni, doluluğu ve sonraki dersi burada listelenir." />
      ) : (
        <div className="mt-3.5">
          <PanelTable caption="Aktif gruplar" columns={["Grup", "Sınav", "Ders", "Öğretmen", "Doluluk", "Sonraki ders", ""]}>
            {activeGroups.map((group) => {
              const filled = group.enrollments.length;
              const full = filled >= group.capacity;
              const next = nextLessonByGroup.get(group.id);
              return (
                <PanelTableRow key={group.id}>
                  <PanelTableCell><Link href={`/panel/yonetim/gruplar/${group.id}`} className="text-[14px] font-bold text-dc-ink underline-offset-2 hover:text-dc-brand-hover hover:underline">{group.name}</Link></PanelTableCell>
                  <PanelTableCell>{group.level || "—"}</PanelTableCell>
                  <PanelTableCell>{group.subject}</PanelTableCell>
                  <PanelTableCell>{name(group.teacher)}</PanelTableCell>
                  <PanelTableCell tone={full ? "warn" : undefined}>{filled} / {group.capacity}{full ? " · dolu" : ""}</PanelTableCell>
                  <PanelTableCell>{next ? WHEN.format(next) : "Planlı ders yok"}</PanelTableCell>
                  <PanelTableCell><Link href={`/panel/yonetim/gruplar/${group.id}`} className="text-[13px] font-semibold text-dc-brand hover:underline">Aç</Link></PanelTableCell>
                </PanelTableRow>
              );
            })}
          </PanelTable>
        </div>
      )}
    </section>
    <div className="mt-7"><AdminSetupWizard teachers={teachersRaw.map((item) => ({ id: item.id, name: name(item) }))} students={studentsRaw.map((item) => ({ id: item.id, name: name(item.user) }))} parents={parentsRaw.map((item) => ({ id: item.id, name: name(item) }))} /></div>
    <div className="mt-7"><AdminLearningForms teachers={teachersRaw.map((item) => ({ id: item.id, name: name(item) }))} students={studentsRaw.map((item) => ({ id: item.id, name: name(item.user) }))} parents={parentsRaw.map((item) => ({ id: item.id, name: name(item) }))} groups={groupsRaw.filter((item) => item.isActive).map((item) => ({ id: item.id, name: item.name, subject: item.subject }))} /></div>
    <EducationManagement
      teachers={teachersRaw.map((item) => ({ id: item.id, name: name(item) }))}
      students={studentsRaw.map((item) => ({ id: item.id, name: name(item.user) }))}
      groups={groupsRaw.map((group) => ({ id: group.id, name: group.name, subject: group.subject, level: group.level || "", teacherId: group.teacher.id, teacherName: name(group.teacher), isActive: group.isActive, students: group.enrollments.map((item) => ({ id: item.student.id, name: name(item.student.user) })) }))}
      lessons={lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, startsAt: lesson.startsAt.toISOString(), status: lesson.status, groupName: lesson.group.name, teacherName: name(lesson.teacher) }))}
    />
    <section className="mt-9"><div className="mb-4"><h2 className="text-lg font-extrabold text-[var(--site-ink)]">Ödev merkezi</h2><p className="mt-1 text-xs text-[var(--site-muted)]">Admin tarafından verilen ödevler öğretmen, öğrenci ve veli ekranlarına aynı anda yansır.</p></div><TeacherAssignmentManager groups={groupsRaw.filter((group) => group.isActive).map((group) => ({ id: group.id, name: group.name, subject: group.subject }))} lessons={lessons.map((lesson) => ({ id: lesson.id, groupId: lesson.groupId, title: lesson.title, startsAt: lesson.startsAt.toISOString() }))} assignments={assignments.map((assignment) => ({ id: assignment.id, groupId: assignment.groupId, groupName: assignment.group.name, title: assignment.title, description: assignment.description || "", dueAt: assignment.dueAt.toISOString(), isActive: assignment.isActive, done: assignment.progress.filter((item) => item.status === "DONE").length, total: assignment.progress.length, outcomes: assignment.outcomeLinks.map((link) => link.outcome.code), evidenceRequired: false, criteria: [], submissions: [] }))} learningOutcomesEnabled={featureFlags.learningOutcomes} outcomes={outcomes.map((outcome) => ({ id: outcome.id, code: outcome.code, title: outcome.title, subject: outcome.unit.subject.name, unit: outcome.unit.name, skills: outcome.skills.map((item) => item.skill.name), favorite: outcome.favorites.length > 0, recent: outcome.assignments.length > 0 }))} /></section>
    <section className="mt-9"><div className="mb-4"><h2 className="text-lg font-extrabold text-[var(--site-ink)]">Materyal merkezi</h2><p className="mt-1 text-xs text-[var(--site-muted)]">Kaynaklar öğretmen ve öğrenci ekranlarıyla aynı veri üzerinden çalışır.</p></div><TeacherMaterialManager groups={groupsRaw.filter((group) => group.isActive).map((group) => ({ id: group.id, name: group.name, subject: group.subject }))} materials={materials.map((item) => ({ id: item.id, title: item.title, description: item.description || "", url: item.blobPathname ? `/api/panel/materials/${item.id}/file` : item.url, kind: item.kind, groupName: item.group.name, isActive: item.isActive }))} /></section>
  </PanelShell>;
}
