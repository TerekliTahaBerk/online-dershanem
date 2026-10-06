import { EmptyState, List, ListRow, Section } from "@/components/panel/ui";
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
  // Yön Koçluk sinyalleri OD öğretmen ana sayfasında tek bölüm olarak görünür;
  // koç çalışma alanı (Faz 3) gelene kadar hazırlık sayfasına bağlanır.
  return (
    <Section title="Yön Koçluk · sıradaki adımlar">
      {signals.length ? (
        <List label="Koçlukta sıradaki adımlar">
          {signals.map((student) => (
            <ListRow
              key={student.studentId}
              title={student.name}
              href={`/panel/ogretmen/hazirlik/${student.studentId}`}
              description={[
                student.overdue ? "Görüşme saati yeniden planlanabilir" : null,
                approved !== null && !approvedIds.has(student.studentId) ? "Haftalık plan onay bekliyor" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          ))}
        </List>
      ) : (
        <EmptyState title="Koçlukta bekleyen plan veya görüşme adımı yok." />
      )}
    </Section>
  );
}
