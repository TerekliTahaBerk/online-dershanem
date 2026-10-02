import { NextResponse } from "next/server";
import { requireCoachingMutation, coachingErrorResponse } from "@/lib/coaching-api";
import { createCoachingSession, type CoachingActor } from "@/lib/coaching-experience-server";
export async function POST(request: Request) {
  const auth = await requireCoachingMutation(request); if (!auth.ok) return auth.response;
  try { return NextResponse.json(await createCoachingSession(auth.session as CoachingActor, await request.json().catch(() => null)), { status: 201 }); }
  catch (error) { return coachingErrorResponse(error); }
}
