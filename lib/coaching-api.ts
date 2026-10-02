import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireApiAccountRole, requireApiProductRole } from "./auth/api-guards";
import { checkPilotAccess } from "./pilot-access";
import { guardMutation } from "./security/mutation-guard";
import { CoachingExperienceError } from "./coaching-experience-server";
export async function requireCoachingMutation(request: Request) {
  const account = await requireApiAccountRole("TEACHER", "STUDENT", "PARENT");
  if (!account.ok) return account;
  // Veli erişimi çocuğun aktif OK üyeliği ve ilişkisinden hizmet sorgusunda çözülür.
  const auth = account.session.role === "PARENT" ? account : await requireApiProductRole("OK", "TEACHER", "STUDENT");
  if (!auth.ok) return auth;
  const pilot = await checkPilotAccess(auth.session.userId, auth.session.role);
  if (!pilot.allowed) return { ok: false as const, response: NextResponse.json({ error: "Görüşme bulunamadı." }, { status: 404 }) };
  const guard = await guardMutation({ action: "panel.coaching.session", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:coaching-session:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60_000 } });
  if (!guard.ok) return { ok: false as const, response: NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 }) };
  return auth;
}
export function coachingErrorResponse(error: unknown) {
  if (error instanceof CoachingExperienceError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: "Görüşme bilgilerini kontrol edin." }, { status: 400 });
  throw error;
}
