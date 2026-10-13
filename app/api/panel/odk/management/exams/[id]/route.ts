import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { ODK_EXAM_LIST_PERMISSIONS } from "@/lib/products/staff-permission-matrix";
import { staffJson, PRIVATE_NO_STORE } from "@/lib/panel/staff-api";
import { loadOdkExamReport, loadOdkExamWorkspace } from "@/lib/odk/exam-workspace-server";
import { loadExamHistory, loadStaffViewer } from "@/lib/odk/staff-management-data";
import { toMobileOdkExamWorkspace } from "@/lib/mobile/odk-exam-views";

/**
 * K03 · Deneme çalışma alanı — web `app/panel/odk/yonetim/sinavlar/[id]` ile
 * AYNI yükleyici (`loadOdkExamWorkspace`) ve sekme izinleri. Yalnız GET;
 * yazmalar sekmeye özgü uçlardan (K03b/K03c) geçer.
 */
const querySchema = z.object({ sekme: z.string().max(20).optional(), filtre: z.string().max(20).optional() }).strict();

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN", "TEACHER"); if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params); if (!params.success) return invalidApiInput();
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return NextResponse.json({ error: "Sekme geçersiz." }, { status: 400, headers: PRIVATE_NO_STORE });
  // İzin, pahalı okumalardan önce (web: requireAnyStaffPermission(ODK_EXAM_LIST_PERMISSIONS)).
  const viewer = await loadStaffViewer(auth.session.userId);
  if (!ODK_EXAM_LIST_PERMISSIONS.some((permission) => viewer.permissions.has(permission))) return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403, headers: PRIVATE_NO_STORE });
  const now = new Date();
  const ws = await loadOdkExamWorkspace(auth.session.userId, params.data.id, query.data, now, { includeOutcomeOptions: false });
  if (!ws) return NextResponse.json({ error: "Deneme bulunamadı.", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_NO_STORE });
  const [report, history] = await Promise.all([
    ws.tab === "raporlar" ? loadOdkExamReport(ws.exam.id, ws.assignedCount, ws.attempts) : Promise.resolve(null),
    ws.tab === "gecmis" ? loadExamHistory(ws.exam) : Promise.resolve(null),
  ]);
  return staffJson(toMobileOdkExamWorkspace(ws, { now, report, history }));
}
