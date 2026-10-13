import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { staffJson, PRIVATE_NO_STORE } from "@/lib/panel/staff-api";
import { loadOdkResultsQueue, QUEUE_TABS } from "@/lib/odk/results-queue-server";
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";
import { examWorkspaceHref, PUBLICATION_STAGES } from "@/lib/odk/staff-workspace";
const actions = { PUANLANIYOR: "Puanla", INCELEME: "Yayın önizleme", BEKLIYOR: "Aç", YAYINLANDI: "Sonuçları gör" };
export async function GET(request: Request) {
  const auth = await requireApiStaffPermission("odk:result:score"); if (!auth.ok) return auth.response;
  const parsed = z.object({ asama: z.string().max(30).optional() }).safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Aşama geçersiz." }, { status: 400, headers: PRIVATE_NO_STORE });
  const { tab, shown, counts } = await loadOdkResultsQueue(parsed.data.asama);
  return staffJson({ contractVersion: 1, tab, tabs: QUEUE_TABS.map((t) => ({ ...t, count: counts.get(t.id) || 0 })), rows: shown.map(({ exam, unscored, scored, published, review, stage }) => ({ id: exam.id, title: exam.title, family: getOdkExamFamilyCode(exam), endsAt: exam.endsAt?.toISOString() ?? null, submitted: exam.attempts.length, assigned: exam._count.assignments, unscored, scored, published, review, stage, stageLabel: PUBLICATION_STAGES.find((s) => s.id === stage)!.label, actionLabel: review && stage !== "YAYINLANDI" ? "İncele" : actions[stage], href: examWorkspaceHref(exam.id, review && stage !== "YAYINLANDI" ? "butunluk" : "puanlama") })) });
}
