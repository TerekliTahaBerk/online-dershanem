import Link from "next/link";
import { FileText } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const familyLabels: Record<string, string> = {
  TYT: "TYT", AYT: "AYT", LGS: "LGS", KPSS: "KPSS", ALES: "ALES",
};

async function getAccessibleExams(userId: string) {
  const now = new Date();

  // Get user's active access tags
  const userTags = await prisma.odkUserAccessTag.findMany({
    where: {
      userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { accessTagId: true },
  });

  const tagIds = userTags.map((t) => t.accessTagId);

  // Get published exams that either have no access tags (open) or match user's tags
  const [openExams, taggedExams] = await Promise.all([
    prisma.odkExam.findMany({
      where: {
        status: "PUBLISHED",
        examAccessTags: { none: {} },
      },
      include: {
        sections: { select: { questionCount: true } },
      },
      orderBy: { startsAt: "desc" },
    }),
    tagIds.length > 0
      ? prisma.odkExam.findMany({
          where: {
            status: "PUBLISHED",
            examAccessTags: { some: { accessTagId: { in: tagIds } } },
          },
          include: {
            sections: { select: { questionCount: true } },
          },
          orderBy: { startsAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  // Merge and deduplicate
  const seen = new Set<string>();
  const allExams = [...openExams, ...taggedExams].filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  // Get user's attempts for these exams
  const attempts = await prisma.odkExamAttempt.findMany({
    where: { userId, examId: { in: allExams.map((e) => e.id) } },
    select: { examId: true, status: true, score: true },
  });

  const attemptMap = new Map(attempts.map((a) => [a.examId, a]));

  return allExams.map((exam) => ({
    ...exam,
    totalQuestions: exam.sections.reduce((s, sec) => s + sec.questionCount, 0),
    myAttempt: attemptMap.get(exam.id) ?? null,
  }));
}

export default async function OdkSinavlarimPage() {
  const session = await getServerAuthSession();
  const exams = await getAccessibleExams(session!.user.id);

  const available = exams.filter((e) => !e.myAttempt);
  const inProgress = exams.filter((e) => e.myAttempt?.status === "IN_PROGRESS");
  const completed = exams.filter((e) => e.myAttempt?.status === "SUBMITTED");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Sınavlarım</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {exams.length} sınava erişimin var · {completed.length} tamamlandı
        </p>
      </div>

      {exams.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white py-16 text-center">
          <FileText className="h-8 w-8 text-stone-300 mb-3" />
          <p className="text-sm font-medium text-stone-500">Henüz erişilebilir sınav yok</p>
          <p className="text-xs text-stone-400 mt-1">Paket satın aldığında sınavlar burada görünecek.</p>
        </div>
      )}

      {inProgress.length > 0 && (
        <ExamSection title="Devam Eden" exams={inProgress} badge="in-progress" />
      )}
      {available.length > 0 && (
        <ExamSection title="Çözebileceklerin" exams={available} badge="available" />
      )}
      {completed.length > 0 && (
        <ExamSection title="Tamamlananlar" exams={completed} badge="completed" />
      )}
    </div>
  );
}

type ExamItem = {
  id: string;
  title: string;
  cadenceFamily: string;
  durationMinutes: number;
  totalQuestions: number;
  myAttempt: { status: string; score: unknown } | null;
};

function ExamSection({
  title,
  exams,
  badge,
}: {
  title: string;
  exams: ExamItem[];
  badge: "available" | "in-progress" | "completed";
}) {
  const badgeStyles = {
    available:    "bg-emerald-50 text-emerald-700",
    "in-progress": "bg-amber-50 text-amber-700",
    completed:    "bg-stone-100 text-stone-600",
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-stone-700">{title}</h2>
      <div className="space-y-2">
        {exams.map((exam) => (
          <div
            key={exam.id}
            className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-5 py-4 hover:border-emerald-200 transition"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <p className="font-medium text-stone-900 truncate">{exam.title}</p>
                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600 shrink-0">
                  {familyLabels[exam.cadenceFamily] ?? exam.cadenceFamily}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {exam.durationMinutes} dk · {exam.totalQuestions} soru
                {exam.myAttempt?.status === "SUBMITTED" && exam.myAttempt.score != null && (
                  <> · Net: <strong className="text-stone-600">{Number(exam.myAttempt.score).toFixed(2)}</strong></>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4 shrink-0">
              {exam.myAttempt && (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeStyles[badge]}`}>
                  {badge === "in-progress" ? "Devam ediyor" : badge === "completed" ? "Tamamlandı" : ""}
                </span>
              )}
              <Link
                href={`/odk/panel/sinavlar/${exam.id}`}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
              >
                {badge === "in-progress" ? "Devam Et" : badge === "completed" ? "Sonucu Gör" : "Başla"}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
