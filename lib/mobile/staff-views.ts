import { MOBILE_STAFF_CONTRACT_VERSION, type MobileStaffTarget, type MobileTeacherHome, type MobileTeacherFlags } from "@/lib/mobile-contracts/staff";
import type { TeacherWorkspace } from "@/lib/panel/teacher-workspace";

/**
 * PERSONEL MOBİL PROJEKSİYONLARI (M7). İş kuralı yeniden hesaplanmaz; alan
 * seçilir, tarihler ISO, web yolları native hedefe çevrilir. Dikkat
 * listesinin sayısal skoru ve ders bağlantısı (Bugün) gönderilmez.
 */

/** Öğretmen paneli web yolu → native hedef. Tanınmayan öğretmen yolu açık web devamıdır. */
export function staffTargetForHref(href: string | null | undefined): MobileStaffTarget {
  if (!href) return { type: "none" };
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "");
  const lesson = /^\/panel\/ogretmen\/ders\/([\w-]{1,191})$/.exec(path);
  if (lesson) return { type: "lesson", lessonId: lesson[1] };
  if (path === "/panel/ogretmen/odevler") return { type: "submissions" };
  if (path === "/panel/ogretmen/yardim") return { type: "help" };
  if (path === "/panel/ogretmen/plan") return { type: "coach-plans" };
  const prep = /^\/panel\/ogretmen\/hazirlik\/([\w-]{1,191})$/.exec(path);
  if (prep) return { type: "coach-student", studentId: prep[1] };
  if (/^\/panel\/(?:ogretmen|odk\/ogretmen)(?:\/[\w\-/]*)?$/.test(path) && !path.includes("..")) return { type: "web", path };
  return { type: "none" };
}

export function toMobileTeacherHome(workspace: TeacherWorkspace, flags: MobileTeacherFlags): MobileTeacherHome {
  return {
    contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
    generatedAt: workspace.generatedAt,
    summary: workspace.summary,
    flags,
    todayLessons: workspace.todayLessons.map((lesson) => ({
      id: lesson.id,
      startsAt: lesson.startsAt,
      endsAt: lesson.endsAt,
      title: lesson.title,
      groupName: lesson.groupName,
      subject: lesson.subject,
      studentCount: lesson.studentCount,
      status: lesson.status,
      prepStatus: lesson.prepStatus,
      prepLabel: lesson.prepLabel,
    })),
    pending: workspace.pending.map((item) => ({ id: item.id, kind: item.kind, title: item.title, detail: item.detail, ctaLabel: item.ctaLabel, dueAt: item.dueAt, target: staffTargetForHref(item.href) })),
    attention: workspace.riskyStudents.map((item) => ({ studentId: item.studentId, studentName: item.studentName, groupName: item.groupName, reason: item.whyRisky, lastSignal: item.lastSignal })),
    upcoming: workspace.upcoming.map((item) => ({ id: item.id, kind: item.kind, title: item.title, detail: item.detail, at: item.at, target: staffTargetForHref(item.href) })),
  };
}

export const PLAN_STATUS_LABEL: Record<string, string> = { DRAFT: "Taslak", CHANGE_REQUESTED: "Değişiklik istendi", APPROVED: "Yayında", ARCHIVED: "Arşivlendi" };
export const TASK_STATUS_LABEL: Record<string, string> = { PLANNED: "Planlandı", IN_PROGRESS: "Devam ediyor", DONE: "Tamamlandı", PARTIAL: "Kısmen", COULD_NOT: "Yapılamadı", SKIPPED: "Atlandı" };

export function displayName(user: { fullName: string | null; email: string }): string {
  return user.fullName?.trim() || user.email;
}
