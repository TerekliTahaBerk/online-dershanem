import { redirect } from "next/navigation";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { canStudentAccessExam } from "@/lib/access/odk";

export const dynamic = "force-dynamic";

/**
 * Server-side "başlat" handler. POST veya GET ile çağrılabilir; idempotent.
 * Var olan IN_PROGRESS attempt varsa onu kullanır, yoksa yenisini açar
 * ve /panel/ogrenci/odk/cozum/[attemptId] sayfasına yönlendirir.
 */
export default async function StartExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireOdkPanel("ogrenci");
  const { id: examId } = await params;

  const allowed = await canStudentAccessExam(ctx.userId, ctx.actualRole, examId);
  if (!allowed) redirect("/panel/ogrenci/odk/denemeler");

  const exam = await prisma.odkExam.findUnique({
    where: { id: examId },
    select: { id: true, status: true },
  });
  if (!exam) redirect("/panel/ogrenci/odk/denemeler");
  if (exam.status !== "PUBLISHED" && ctx.actualRole !== "ADMIN") {
    redirect("/panel/ogrenci/odk/denemeler");
  }

  const existing = await prisma.odkExamAttempt.findFirst({
    where: { userId: ctx.userId, examId, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
  if (existing) redirect(`/panel/ogrenci/odk/cozum/${existing.id}`);

  const created = await prisma.odkExamAttempt.create({
    data: { userId: ctx.userId, examId, status: "IN_PROGRESS" },
    select: { id: true },
  });
  redirect(`/panel/ogrenci/odk/cozum/${created.id}`);
}
