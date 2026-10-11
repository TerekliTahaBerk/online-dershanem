import type { EducationRow, MobileEducation, MobileGroup360 } from "@/lib/mobile-contracts/admin-education";
import type { loadEducationManagement } from "@/lib/panel/education-management-server";
import type { Group360Bundle } from "@/lib/panel/group-360-server";
import { summarizeGroupAssignment } from "@/lib/panel/assignment-display";

const name = (user: { fullName: string | null; email: string }) => user.fullName || user.email;
const status = (value: string) => ({ PLANNED: "Planlandı", COMPLETED: "Tamamlandı", CANCELLED: "İptal" })[value] ?? value;
const date = (value: Date) => new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "short" }).format(value);
const row = (id: string, title: string, detail: string, extra: Partial<EducationRow> = {}): EducationRow => ({ id, title, detail, at: null, groupId: null, studentId: null, ...extra });

/** Salt okuma projeksiyonu: kapasite/risk/çakışma kararları ortak yükleyicide kalır. */
export function toMobileEducation(data: Awaited<ReturnType<typeof loadEducationManagement>>): MobileEducation {
  // Webin aynı sınırlı ders penceresinden türettiği sonraki planlı ders.
  const nextLessonByGroup = new Map<string, Date>();
  for (const lesson of data.lessons) {
    if (lesson.status !== "PLANNED") continue;
    const current = nextLessonByGroup.get(lesson.groupId);
    if (!current || lesson.startsAt < current) nextLessonByGroup.set(lesson.groupId, lesson.startsAt);
  }
  return {
    contractVersion: 1,
    teachers: data.teachersRaw.map((teacher) => ({ id: teacher.id, name: name(teacher) })),
    groups: data.groupsRaw.map((group) => ({ id: group.id, name: group.name, subject: group.subject, level: group.level, teacherName: name(group.teacher), active: group.isActive, filled: group.enrollments.length, capacity: group.capacity, nextLessonAt: nextLessonByGroup.get(group.id)?.toISOString() ?? null })),
    sections: [
      { id: "dersler", title: "Son 7 günden itibaren ilk 24 ders", rows: data.lessons.map((lesson) => row(lesson.id, lesson.title, `${lesson.group.name} · ${name(lesson.teacher)} · ${status(lesson.status)}`, { at: lesson.startsAt.toISOString(), groupId: lesson.groupId })) },
      { id: "odevler", title: "Son teslim tarihine göre son 40 ödev", rows: data.assignments.map((assignment) => {
        const progress = summarizeGroupAssignment({ rows: assignment.progress.map((item) => ({ progress: item.status, dueAt: assignment.dueAt })) });
        return row(assignment.id, assignment.title, `${assignment.group.name} · ${assignment.isActive ? "Aktif" : "Pasif"} · ${progress.submitted}/${progress.total} tamamlandı · ${progress.late} geciken`, { at: assignment.dueAt.toISOString(), groupId: assignment.groupId });
      }) },
      { id: "materyaller", title: "Son 60 materyal", rows: data.materials.map((material) => row(material.id, material.title, `${material.group.name} · ${material.kind} · ${material.isActive ? "Aktif" : "Pasif"}${material.description ? ` · ${material.description}` : ""}`, { groupId: material.groupId })) },
    ],
  };
}

export function toMobileGroup360(data: Group360Bundle): MobileGroup360 {
  const sections: MobileGroup360["sections"] = [];
  const add = (id: string, title: string, rows: EducationRow[]) => sections.push({ id, title, rows });
  if (data.overview) {
    add("upcoming", "Yaklaşan dersler", data.overview.upcomingLessons.map((lesson) => row(lesson.id, lesson.title, `${lesson.teacherName} · ${status(lesson.status)}`, { at: lesson.startsAt.toISOString() })));
    add("capacity", "Grup özeti", [row("capacity", `${data.overview.capacity.available} boş kontenjan`, `${data.overview.seriesCount} aktif ders serisi · ${data.overview.assignmentCount} ödev`)]);
  }
  if (data.students) add("members", "Öğrenciler", data.students.members.map((member) => row(member.studentId, member.name, [member.email, member.packages.join(", "), member.riskLabel, member.attendanceRate === null ? "Katılım verisi yok" : `Katılım %${member.attendanceRate}`, `Kayıt: ${date(member.enrolledAt)}`, member.lastActivityAt ? `Son etkinlik: ${date(member.lastActivityAt)}` : "Etkinlik yok"].filter(Boolean).join(" · "), { studentId: member.studentId })));
  if (data.program) {
    add("weekly", "Planlı dersler", data.program.weekly.map((lesson) => row(lesson.id, lesson.title, `${lesson.teacherName} · ${lesson.durationMinutes} dk${lesson.seriesId ? " · Seri ders" : ""}`, { at: lesson.startsAt.toISOString() })));
    add("series", "Ders serileri", data.program.series.map((series) => row(series.id, series.title, `${series.teacherName} · ${series.isActive ? "Aktif" : "Pasif"} · ${series.upcomingCount} yaklaşan ders`)));
    add("conflicts", "Program çakışmaları", conflictRows(data.program.conflicts));
  }
  if (data.history) {
    add("attendance", "Katılım özeti", [row("rate", data.history.attendanceRate === null ? "Katılım verisi yok" : `Katılım %${data.history.attendanceRate}`, "Tamamlanan derslerin katılım kayıtlarından")]);
    add("completed", "Son 20 tamamlanan ders", data.history.completed.map((lesson) => row(lesson.id, lesson.title, `${lesson.attendancePresent}/${lesson.attendanceTotal} katılım`, { at: lesson.startsAt.toISOString() })));
    add("cancelled", "Son 12 iptal edilen ders", data.history.cancelled.map((lesson) => row(lesson.id, lesson.title, "İptal", { at: lesson.startsAt.toISOString() })));
  }
  if (data.opsTab) {
    add("issues", "Operasyon sinyalleri", data.opsTab.issues.map((issue) => row(issue.code, issue.title, issue.description)));
    add("conflicts", "Çözülmemiş çakışmalar", conflictRows(data.opsTab.unresolvedConflicts));
  }
  const group = data.summary;
  return { contractVersion: 1, id: group.id, name: group.name, subject: group.subject, level: group.level, active: group.isActive, teacherName: group.teacher.name, filled: group.activeStudentCount, capacity: group.capacity, weeklyLessonCount: group.weeklyLessonCount, status: group.ops.label, reasons: group.ops.whyAttention, tab: data.tab, sections, revision: data.revision, teacherId: group.teacher.id, teachers: data.opsTab?.teachers ?? [], targetGroups: data.targetGroups };
}

function conflictRows(conflicts: NonNullable<Group360Bundle["program"]>["conflicts"]): EducationRow[] {
  const labels = { TEACHER: "Öğretmen", GROUP: "Grup", STUDENT: "Öğrenci" };
  return conflicts.map((conflict, index) => row(`${conflict.lessonId}-${conflict.otherLessonId}-${index}`, `${conflict.lessonTitle} ↔ ${conflict.otherLessonTitle}`, `${labels[conflict.kind]} çakışması${conflict.studentName ? ` · ${conflict.studentName}` : ""} · Diğer ders: ${date(conflict.otherStartsAt)}`, { at: conflict.startsAt.toISOString() }));
}
