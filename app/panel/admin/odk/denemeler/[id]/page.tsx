import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { ExamDetailEditor } from "@/components/panel/odk/admin/exam-detail-editor";

export const metadata: Metadata = {
  title: "Deneme Detayı · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "ok" | "warn" | "neutral"> = {
  PUBLISHED: "ok",
  DRAFT: "warn",
  ARCHIVED: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "Yayında",
  DRAFT: "Taslak",
  ARCHIVED: "Arşiv",
};

export default async function AdminOdkExamDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOdkPanel("admin");
  const { id } = await params;

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { orderIndex: "asc" } },
      files: true,
      examAccessTags: { include: { accessTag: true } },
      _count: { select: { attempts: true } },
    },
  });
  if (!exam) notFound();

  const [accessTags, kazanimReady, kazanimMissingCount, officialAnswerCount] = await Promise.all([
    prisma.odkAccessTag.findMany({
      where: { isActive: true, service: "ODK" },
      orderBy: { title: "asc" },
      select: { id: true, key: true, title: true, description: true },
    }),
    prisma.odkExamOfficialAnswer.count({
      where: { examId: id, learningOutcomeCode: { not: null } },
    }),
    prisma.odkExamOfficialAnswer.count({
      where: { examId: id, learningOutcomeCode: null },
    }),
    prisma.odkExamOfficialAnswer.count({
      where: { examId: id },
    }),
  ]);

  const totalSlots = exam.sections.reduce((a, s) => a + s.questionCount, 0);
  const bookletFile = exam.files.find((f) => f.fileType === "BOOKLET_PDF");
  const answerKeyFile = exam.files.find((f) => f.fileType === "ANSWER_KEY_PDF");
  const linkedTagIds = exam.examAccessTags.map((t) => t.accessTagId);

  // Yayın için checklist
  const publishChecklist = [
    { ok: !!bookletFile, label: "Deneme PDF'i yüklü" },
    { ok: officialAnswerCount === totalSlots && totalSlots > 0, label: `Cevap anahtarı ${officialAnswerCount}/${totalSlots} soru` },
    { ok: kazanimMissingCount === 0 && kazanimReady > 0, label: `Tüm sorular için kazanım atanmış (${kazanimReady}/${officialAnswerCount})` },
    { ok: linkedTagIds.length > 0, label: "En az 1 erişim tagı bağlı" },
  ];

  return (
    <>
      <PageHeader
        title={exam.title}
        subtitle={`${exam.cadenceFamily}${exam.classLevel ? ` · ${exam.classLevel}. sınıf` : ""} · ${exam.durationMinutes} dk`}
        right={
          <>
            <Badge tone={STATUS_TONE[exam.status]}>{STATUS_LABEL[exam.status]}</Badge>
            <Link href={`/panel/admin/odk/denemeler/${exam.id}/cozumler`} className="od-btn od-btn-ghost">
              Çözümler
            </Link>
            <Link href="/panel/admin/odk/denemeler" className="od-btn od-btn-ghost">
              Denemelere dön
            </Link>
          </>
        }
      />

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader title="Yayın hazırlığı" subtitle="Tüm maddeler tamamlanmadan deneme yayınlanamaz." />
          <CardBody>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {publishChecklist.map((c, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: c.ok ? "#16a34a" : "#cbd5e1",
                    color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700,
                  }}>{c.ok ? "✓" : "•"}</span>
                  <span style={{ color: c.ok ? "var(--pd-ink-1)" : "var(--pd-ink-3)" }}>{c.label}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Genel" />
          <CardBody>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", fontSize: 13, margin: 0 }}>
              <dt className="od-muted">Slug</dt><dd className="od-mono">{exam.slug}</dd>
              <dt className="od-muted">Bölüm</dt><dd>{exam.sections.length} bölüm · {totalSlots} soru</dd>
              <dt className="od-muted">Çözüm</dt><dd>{exam._count.attempts}</dd>
              <dt className="od-muted">Oluşturulma</dt><dd>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(exam.createdAt)}</dd>
              {exam.publishedAt ? (
                <>
                  <dt className="od-muted">Yayın</dt>
                  <dd>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(exam.publishedAt)}</dd>
                </>
              ) : null}
            </dl>
          </CardBody>
        </Card>
      </div>

      <ExamDetailEditor
        exam={{
          id: exam.id,
          title: exam.title,
          status: exam.status,
          totalSlots,
          officialAnswerCount,
          kazanimReady,
          kazanimMissingCount,
          bookletFile: bookletFile
            ? { url: bookletFile.publicUrl, name: bookletFile.originalFileName, byteSize: bookletFile.byteSize }
            : null,
          answerKeyFile: answerKeyFile
            ? { url: answerKeyFile.publicUrl, name: answerKeyFile.originalFileName, byteSize: answerKeyFile.byteSize }
            : null,
        }}
        availableTags={accessTags}
        linkedTagIds={linkedTagIds}
      />
    </>
  );
}
