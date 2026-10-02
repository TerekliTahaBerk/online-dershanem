import { NextResponse } from "next/server";
import { requireCoachingMutation, coachingErrorResponse } from "@/lib/coaching-api";
import { mutateCoachingSession, type CoachingActor } from "@/lib/coaching-experience-server";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireCoachingMutation(request); if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try { return NextResponse.json(await mutateCoachingSession(auth.session as CoachingActor, id, await request.json().catch(() => null))); }
  catch (error) { return coachingErrorResponse(error); }
}
