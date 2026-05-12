import Link from "next/link";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "ODK Denemeleri",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudentOdkExamsPage() {
  const ctx = await requireOdkPanel("ogrenci");

  // Kullanıcının aktif ODK tagları
  const userTagRows = await prisma.odkUserAccessTag.findMany({
    where: {
      userId: ctx.userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      accessTag: { isActive: true, service: "ODK" },
    },
    select: { accessTagId: true },
  });
  const tagIds = userTagRows.map((t) => t.accessTagId);

  const exams = ctx.actualRole === "ADMIN"
    ? await prisma.odkExam.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        select: examSelect(ctx.userId),
      })
    : tagIds.length === 0
      ? []
      : await prisma.odkExam.findMany({
          where: {
            status: "PUBLISHED",
            examAccessTags: { some: { accessTagId: { in: tagIds } } },
          },
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          select: examSelect(ctx.userId),
        });

  return (
    <>
      <PageHeader title="ODK Denemeleri" subtitle="Erişim hakkınız olan denemelerin listesi" />

      {exams.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title="Henüz çözebileceğin deneme yok"
              description="Erişim tagların aktif olduğunda yeni denemeler burada görünecek. Soru için danışmanına yaz."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="od-grid g-2">
          {exams.map((e) => {
            const totalQuestions = e.sections.reduce((a, s) => a + s.questionCount, 0);
            const last = e.attempts[0] ?? null;
            return (
              <Card key={e.id}>
                <CardHeader
                  title={e.title}
                  right={<Badge tone="accent">{e.cadenceFamily}</Badge>}
                  subtitle={`${e.classLevel ? `${e.classLevel}. sınıf · ` : ""}${e.durationMinutes} dk · ${totalQuestions} soru`}
                />
                <CardBody>
                  {last ? (
                    last.status === "IN_PROGRESS" ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ fontSize: 13 }}>
                          Devam eden bir çözümün var.
                        </span>
                        <Link href={`/panel/ogrenci/odk/cozum/${last.id}`} className="od-btn od-btn-primary">
                          Devam et
                        </Link>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <Badge tone="ok">Tamamlandı</Badge>
                          <div style={{ fontSize: 12, marginTop: 4 }} className="od-muted">
                            Net: <strong>{last.score ? Number(last.score).toFixed(2) : "—"}</strong>
                          </div>
                        </div>
                        <Link href={`/panel/ogrenci/odk/sonuc/${last.id}`} className="od-btn od-btn-ghost">
                          Sonucu gör
                        </Link>
                      </div>
                    )
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <span className="od-muted" style={{ fontSize: 13 }}>Henüz başlamadın.</span>
                      <form action={`/panel/ogrenci/odk/baslat/${e.id}`} method="post">
                        <Link href={`/panel/ogrenci/odk/baslat/${e.id}`} className="od-btn od-btn-primary">
                          Sınava başla
                        </Link>
                      </form>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function examSelect(userId: string) {
  return {
    id: true,
    title: true,
    slug: true,
    cadenceFamily: true,
    classLevel: true,
    durationMinutes: true,
    publishedAt: true,
    sections: { select: { questionCount: true } },
    attempts: {
      where: { userId },
      orderBy: { startedAt: "desc" as const },
      take: 1,
      select: { id: true, status: true, score: true, submittedAt: true },
    },
  };
}
