import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCoachStudents } from "@/lib/panel/coaching";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { istanbulWeekStart } from "@/lib/istanbul-time";
export async function CoachAttention({ userId }: { userId: string }) {
  const students = await getCoachStudents(userId);
  if (!students.length) return null;
  const approved = getPanelFeatureFlags().adaptivePlan ? await prisma.weeklyPlan.findMany({ where: { weekStart: istanbulWeekStart(new Date()), status: "APPROVED", student: { coachAssignments: { some: { endedAt: null, coach: { userId } } } } }, select: { studentId: true } }) : null;
  const approvedIds = new Set(approved?.map((plan) => plan.studentId));
  const signals = students.filter((student) => student.overdue || (approved !== null && !approvedIds.has(student.studentId)));
  return <section aria-label="Koçlukta sıradaki adımlar" className="panel-card mt-5 p-5"><h2 className="text-lg font-bold">Koçlukta sıradaki adımlar</h2>{signals.length ? <ul className="mt-3 space-y-3">{signals.map((student) => <li key={student.studentId}><Link className="font-semibold text-dc-brand-strong" href={`/panel/ogretmen/hazirlik/${student.studentId}`}>{student.name}</Link><p className="text-sm text-dc-ink-muted">{[student.overdue ? "Görüşme saati yeniden planlanabilir" : null, approved !== null && !approvedIds.has(student.studentId) ? "Haftalık plan onay bekliyor" : null].filter(Boolean).join(" · ")}</p></li>)}</ul> : <p className="mt-3 text-sm">Koçlukta bekleyen plan veya görüşme adımı yok.</p>}</section>;
}
