import { NextResponse } from "next/server";
import { requireCoachingMutation, coachingErrorResponse } from "@/lib/coaching-api";
import { createCoachingSession, type CoachingActor } from "@/lib/coaching-experience-server";
import { coachingCreateSchema } from "@/lib/coaching-experience";
export async function POST(request: Request) {
  const auth = await requireCoachingMutation(request); if (!auth.ok) return auth.response;
  try {
    const input = coachingCreateSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await createCoachingSession(auth.session as CoachingActor, input), { status: 201 });
  }
  catch (error) { return coachingErrorResponse(error); }
}
