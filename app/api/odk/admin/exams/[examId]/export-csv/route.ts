import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { prisma } from "@/lib/prisma";
import {
  hasOdkExamAttemptSectionScoresColumn,
  hasOdkExamAttemptTabSwitchCountColumn,
} from "@/lib/odk-exam-schema";

type SectionScore = {
  title: string;
  correct: number;
  wrong: number;
  blank: number;
  net: number;
};

type IntegrityFlags = {
  suspiciouslyFastAnswers?: number;
  avgAnswerIntervalMs?: number;
  burstAnswerGroups?: number;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const session = await getServerAuthSession();
  const access = getPanelAccess(session?.user);
  if (!session || !access.hasAdminPanel) {
    return new Response("Yetkisiz", { status: 401 });
  }

  const { examId } = await params;
  const [hasSectionScoresColumn, hasTabSwitchCountColumn] = await Promise.all([
    hasOdkExamAttemptSectionScoresColumn(),
    hasOdkExamAttemptTabSwitchCountColumn(),
  ]);

  const exam = await prisma.odkExam.findUnique({
    where: { id: examId },
    select: { title: true, sections: { select: { title: true }, orderBy: { orderIndex: "asc" } } },
  });
  if (!exam) return new Response("Sınav bulunamadı", { status: 404 });

  const sectionTitles = exam.sections.map((s) => s.title);

  const csvRow = (cells: string[]) =>
    cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",") + "\r\n";

  const headers = [
    "Ad Soyad", "E-posta", "Net", "Doğru", "Yanlış", "Boş",
    "Süre (dk)", "Tab İhlali", "Hızlı Cevap (şüpheli)", "Ort. Cevap Hızı (sn)", "Gönderim Tarihi",
    ...sectionTitles.flatMap((t) => [`${t} Net`, `${t} D`, `${t} Y`, `${t} B`]),
  ];

  // P1: streaming CSV — pages through attempts in batches of 200 so large exams
  // don't timeout or exhaust memory in the route handler.
  const filename = `${exam.title.replace(/[^a-zA-Z0-9À-ɏ\s]/g, "")}-sonuclar.csv`;
  const PAGE_SIZE = 200;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(new TextEncoder().encode("﻿" + csvRow(headers))); // BOM for Excel

      let cursor: string | undefined;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const batch = await prisma.odkExamAttempt.findMany({
          where: { examId, status: "SUBMITTED" },
          select: {
            id: true,
            score: true,
            correctCount: true,
            wrongCount: true,
            blankCount: true,
            durationSeconds: true,
            resultPayload: true,
            ...(hasTabSwitchCountColumn ? { tabSwitchCount: true } : {}),
            ...(hasSectionScoresColumn ? { sectionScores: true } : {}),
            submittedAt: true,
            user: { select: { name: true, email: true } },
          },
          orderBy: { score: "desc" },
          take: PAGE_SIZE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });

        for (const a of batch) {
          const sections = ("sectionScores" in a ? (a.sectionScores as SectionScore[] | null) : null) ?? [];
          const secMap = new Map(sections.map((s) => [s.title, s]));
          const payload = a.resultPayload as { integrityFlags?: IntegrityFlags } | null;
          const flags = payload?.integrityFlags;

          const cells = [
            a.user.name ?? "", a.user.email,
            Number(a.score ?? 0).toFixed(2),
            String(a.correctCount), String(a.wrongCount), String(a.blankCount),
            a.durationSeconds ? String(Math.round(a.durationSeconds / 60)) : "",
            String("tabSwitchCount" in a ? (a.tabSwitchCount ?? 0) : 0),
            flags?.suspiciouslyFastAnswers != null ? String(flags.suspiciouslyFastAnswers) : "",
            flags?.avgAnswerIntervalMs != null ? (flags.avgAnswerIntervalMs / 1000).toFixed(1) : "",
            a.submittedAt ? new Date(a.submittedAt).toLocaleString("tr-TR") : "",
            ...sectionTitles.flatMap((t) => {
              const s = secMap.get(t);
              return s ? [s.net.toFixed(2), String(s.correct), String(s.wrong), String(s.blank)] : ["", "", "", ""];
            }),
          ];
          controller.enqueue(new TextEncoder().encode(csvRow(cells)));
        }

        if (batch.length < PAGE_SIZE) break;
        cursor = batch[batch.length - 1].id;
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Transfer-Encoding": "chunked",
    },
  });
}
