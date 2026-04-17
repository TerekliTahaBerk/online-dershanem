import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { prisma } from "@/lib/prisma";

type SectionScore = {
  title: string;
  correct: number;
  wrong: number;
  blank: number;
  net: number;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const session = await getServerAuthSession();
  const access = getPanelAccess(session?.user);
  if (!session || !access.hasAdminPanel) {
    return new NextResponse("Yetkisiz", { status: 401 });
  }

  const { examId } = await params;

  const exam = await prisma.odkExam.findUnique({
    where: { id: examId },
    select: { title: true, sections: { select: { title: true }, orderBy: { orderIndex: "asc" } } },
  });
  if (!exam) return new NextResponse("Sınav bulunamadı", { status: 404 });

  const attempts = await prisma.odkExamAttempt.findMany({
    where: { examId, status: "SUBMITTED" },
    select: {
      score: true,
      correctCount: true,
      wrongCount: true,
      blankCount: true,
      durationSeconds: true,
      tabSwitchCount: true,
      sectionScores: true,
      submittedAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { score: "desc" },
  });

  const sectionTitles = exam.sections.map((s) => s.title);

  // Build CSV header
  const headers = [
    "Ad Soyad",
    "E-posta",
    "Net",
    "Doğru",
    "Yanlış",
    "Boş",
    "Süre (dk)",
    "İhlal",
    "Gönderim Tarihi",
    ...sectionTitles.flatMap((t) => [`${t} Net`, `${t} D`, `${t} Y`, `${t} B`]),
  ];

  const rows = attempts.map((a) => {
    const sections = (a.sectionScores as SectionScore[] | null) ?? [];
    const secMap = new Map(sections.map((s) => [s.title, s]));

    const base = [
      a.user.name ?? "",
      a.user.email,
      Number(a.score ?? 0).toFixed(2),
      String(a.correctCount),
      String(a.wrongCount),
      String(a.blankCount),
      a.durationSeconds ? String(Math.round(a.durationSeconds / 60)) : "",
      String(a.tabSwitchCount ?? 0),
      a.submittedAt ? new Date(a.submittedAt).toLocaleString("tr-TR") : "",
    ];

    const secCols = sectionTitles.flatMap((t) => {
      const s = secMap.get(t);
      return s
        ? [s.net.toFixed(2), String(s.correct), String(s.wrong), String(s.blank)]
        : ["", "", "", ""];
    });

    return [...base, ...secCols];
  });

  const csvLines = [headers, ...rows].map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
  );
  const csv = "\uFEFF" + csvLines.join("\r\n"); // BOM for Excel UTF-8

  const filename = `${exam.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, "")}-sonuclar.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
