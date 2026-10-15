import type { ExamSessionPlan } from "./exam-sessions";

/**
 * Yönetici çözücü önizlemesi (Faz 5 / P1-3): gerçek attempt yaratmadan,
 * öğrencinin seçilen oturumda göreceği çözücü durumunu kurar. Önceki oturumlar
 * kilitli, sonrakiler yaklaşan görünür; süre önizleme anından başlar.
 */
export function buildPreviewSession(input: { plan: ExamSessionPlan | null; requestedKey: string | null | undefined; now: Date; durationMinutes: number }) {
  const { plan, now } = input;
  if (!plan) {
    return { session: null, deadlineAt: new Date(now.getTime() + input.durationMinutes * 60_000), nextSessionKey: null };
  }
  const index = Math.max(0, plan.findIndex((item) => item.key === input.requestedKey));
  const current = plan[index];
  const deadlineAt = new Date(now.getTime() + current.durationMinutes * 60_000);
  return {
    session: {
      phase: "SESSION" as const,
      currentKey: current.key,
      currentTitle: current.title,
      isLast: index === plan.length - 1,
      deadlineAt: deadlineAt.toISOString(),
      breakEndsAt: null,
      sessions: plan.map((item, position) => ({ key: item.key, title: item.title, durationMinutes: item.durationMinutes, status: (position < index ? "LOCKED" : position === index ? "ACTIVE" : "UPCOMING") as "LOCKED" | "ACTIVE" | "UPCOMING" })),
    },
    deadlineAt,
    nextSessionKey: plan[index + 1]?.key ?? null,
  };
}
