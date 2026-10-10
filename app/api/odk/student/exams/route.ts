import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { invalidApiInput } from "@/lib/api/input-validation";
import { ODK_EXAM_LIST_LIMIT, loadOdkStudentExamList } from "@/lib/odk/student-dashboard-server";
import { toMobileOdkExamList } from "@/lib/mobile/odk-views";

const querySchema = z.object({ gorunum: z.enum(["tumu", "yaklasan", "acik", "tamamlanan"]).optional() }).strict();

/**
 * Denemelerim — web `app/panel/odk/ogrenci/denemeler` ile AYNI yükleyici ve
 * sıralama. Okuma en yeni `ODK_EXAM_LIST_LIMIT` denemeyle sınırlıdır;
 * aşılırsa `truncated: true` döner.
 */
export async function GET(request: Request) {
  const auth = await requireApiProductRole("ODK", "STUDENT");
  if (!auth.ok) return auth.response;
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return invalidApiInput();
  const view = parsed.data.gorunum ?? "tumu";
  const data = await loadOdkStudentExamList(auth.session.userId, view);
  return NextResponse.json(toMobileOdkExamList(data, view, ODK_EXAM_LIST_LIMIT), { headers: { "Cache-Control": "private, no-store" } });
}
