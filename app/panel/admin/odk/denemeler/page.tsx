import Link from "next/link";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { ExportButton } from "@/components/panel/ui/export-button";

export const metadata: Metadata = {
  title: "ODK Denemeler · Admin",
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

const FAMILY_TONE: Record<string, "accent" | "purple" | "teal" | "neutral"> = {
  TYT: "accent",
  AYT: "purple",
  LGS: "teal",
  KPSS: "neutral",
  ALES: "neutral",
};

export default async function AdminOdkExamsList() {
  await requireOdkPanel("admin");
  const exams = await prisma.odkExam.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      title: true,
      slug: true,
      cadenceFamily: true,
      classLevel: true,
      status: true,
      durationMinutes: true,
      startsAt: true,
      endsAt: true,
      publishedAt: true,
      createdAt: true,
      _count: { select: { sections: true, attempts: true, files: true, examAccessTags: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="ODK Denemeler"
        subtitle={`Toplam ${exams.length} deneme · TYT / AYT / LGS dijital sınav yönetimi`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <ExportButton entity="odk-denemeler" label="Excel" />
            <Link href="/panel/admin/odk/denemeler/yeni" className="od-btn od-btn-primary">
              Yeni deneme
            </Link>
          </div>
        }
      />

      {exams.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="report"
              title="Henüz deneme yok"
              description="Sağ üstteki “Yeni deneme” butonuyla ilk denemenizi oluşturun."
            />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <table className="od-table">
            <thead>
              <tr>
                <th>Deneme</th>
                <th>Tür</th>
                <th>Sınıf</th>
                <th>Süre</th>
                <th>Bölüm</th>
                <th>Çözüm</th>
                <th>Durum</th>
                <th>Oluşturulma</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/panel/admin/odk/denemeler/${e.id}`} style={{ fontWeight: 600 }}>
                      {e.title}
                    </Link>
                    <div className="od-mono od-muted" style={{ fontSize: 11 }}>{e.slug}</div>
                  </td>
                  <td><Badge tone={FAMILY_TONE[e.cadenceFamily] ?? "neutral"}>{e.cadenceFamily}</Badge></td>
                  <td>{e.classLevel ?? "—"}</td>
                  <td>{e.durationMinutes} dk</td>
                  <td>{e._count.sections}</td>
                  <td>{e._count.attempts}</td>
                  <td><Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge></td>
                  <td className="od-mono od-muted" style={{ fontSize: 11 }}>
                    {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(e.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
