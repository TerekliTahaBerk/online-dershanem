import { prisma } from "@/lib/prisma";
import { coachingAssignmentScope, type CoachingActor } from "@/lib/coaching-experience-server";
import { CoachingSessionControls, CoachingSessionCreate } from "./coaching-session-controls";
export async function CoachingSessions({ actor, studentId }: { actor: CoachingActor; studentId: string }) {
  const assignment = await prisma.coachAssignment.findFirst({ where: { ...coachingAssignmentScope(actor), studentId }, select: { id: true, sessions: { where: { status: "PLANNED" }, orderBy: { scheduledAt: "asc" }, take: 10, select: { id: true, version: true, scheduledAt: true, meetingUrl: true, rescheduleRequestedAt: true, rescheduleReason: true, proposedAt: true } } } });
  if (!assignment) return null;
  return <div>{assignment.sessions.map((session) => <CoachingSessionControls key={`${session.id}:${session.version}`} role={actor.role} session={{ ...session, scheduledAt: session.scheduledAt.toISOString(), rescheduleRequestedAt: session.rescheduleRequestedAt?.toISOString() ?? null, proposedAt: session.proposedAt?.toISOString() ?? null }} />)}{actor.role === "TEACHER" && <CoachingSessionCreate studentId={studentId} />}</div>;
}
