import type { CoachingActor } from "@/lib/coaching-experience-server";
import { loadUpcomingCoachingSessions } from "@/lib/kocum/student-coaching-server";
import { CoachingSessionControls, CoachingSessionCreate } from "./coaching-session-controls";
export async function CoachingSessions({ actor, studentId }: { actor: CoachingActor; studentId: string }) {
  const sessions = await loadUpcomingCoachingSessions(actor, studentId);
  if (!sessions) return null;
  return <div>{sessions.map((session) => <CoachingSessionControls key={`${session.id}:${session.version}`} role={actor.role} session={{ ...session, scheduledAt: session.scheduledAt.toISOString(), rescheduleRequestedAt: session.rescheduleRequestedAt?.toISOString() ?? null, proposedAt: session.proposedAt?.toISOString() ?? null }} />)}{actor.role === "TEACHER" && <CoachingSessionCreate studentId={studentId} />}</div>;
}
