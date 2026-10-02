import { NextResponse } from "next/server";
import { requireCoachingMutation, coachingErrorResponse } from "@/lib/coaching-api";
import { mutateCoachingSession, type CoachingActor } from "@/lib/coaching-experience-server";
import { z } from "zod";
import { coachingMutationSchema } from "@/lib/coaching-experience";
const paramsSchema = z.object({ id: z.string().min(1) }).strict();
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireCoachingMutation(request); if (!auth.ok) return auth.response;
  try {
    const { id } = paramsSchema.parse(await context.params);
    const input = coachingMutationSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await mutateCoachingSession(auth.session as CoachingActor, id, input));
  }
  catch (error) { return coachingErrorResponse(error); }
}
