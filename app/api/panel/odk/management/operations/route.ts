import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { staffJson, PRIVATE_NO_STORE } from "@/lib/panel/staff-api";
import { hasStaffPermission } from "@/lib/products/staff-permissions";
import { loadOdkOpsConsole } from "@/lib/odk/ops-console-server";
import { toMobileOdkOpsConsole } from "@/lib/mobile/odk-ops-views";

/**
 * K04 · Canlı operasyon — web `app/panel/odk/yonetim/operasyon` ile AYNI
 * yükleyici ve süzgeçler (`loadOdkOpsConsole`). `odk:ops:live` izni; inceleme
 * eylemleri ayrıca `odk:integrity:review` ister (`canReview`). Yalnız GET.
 */
const querySchema = z.object({
  deneme: z.string().regex(/^[\w-]{1,64}$/).optional(),
  gorunum: z.string().max(20).optional(),
  durum: z.string().max(20).optional(),
  butunluk: z.string().max(20).optional(),
  kalp: z.string().max(5).optional(),
  q: z.string().max(80).optional(),
}).strict();

export async function GET(request: Request) {
  const auth = await requireApiStaffPermission("odk:ops:live"); if (!auth.ok) return auth.response;
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Süzgeç geçersiz." }, { status: 400, headers: PRIVATE_NO_STORE });
  const [data, canReview] = await Promise.all([loadOdkOpsConsole(parsed.data), hasStaffPermission(auth.session.userId, "odk:integrity:review")]);
  return staffJson(toMobileOdkOpsConsole({ ...data, canReview }));
}
