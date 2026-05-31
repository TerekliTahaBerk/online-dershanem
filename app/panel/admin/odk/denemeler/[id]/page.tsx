import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { getOdkAdminExamDetail } from "@/lib/panel/odk-admin";
import { getOdkCadenceLabel } from "@/lib/panel/odk-admin-display";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { ExamDetailEditor } from "@/components/panel/odk/admin/exam-detail-editor";
import { OdkAdminExamStatusBadge } from "@/components/panel/odk/admin/odk-admin-exam-status-badge";
import { OdkExamReadinessChecklist } from "@/components/panel/odk/admin/odk-exam-readiness-checklist";
import { OdkExamActionBar } from "@/components/panel/odk/admin/odk-exam-action-bar";

export const metadata: Metadata = {
  title: "Deneme Detayı · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminOdkExamDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOdkPanel("admin");
  const { id } = await params;

  // Aggregated detail (rules + sections + access + attempts) from helper.
  const detail = await getOdkAdminExamDetail(id);
  if (!detail) notFound();

  // Bits the existing ExamDetailEditor still needs that the helper does not
  // currently expose — fetched separately to keep the helper focused.
  const [accessTags, files, examAccessTags] = await Promise.all([
    prisma.odkAccessTag.findMany({
      where: { isActive: true, service: "ODK" },
      orderBy: { title: "asc" },
      select: { id: true, key: true, title: true, description: true },
    }),
    prisma.odkExamFile.findMany({
      where: { examId: id },
      select: { fileType: true, publicUrl: true, originalFileName: true, byteSize: true },
    }),
    prisma.odkExamAccessTag.findMany({
      where: { examId: id },
      select: { accessTagId: true },
    }),
  ]);

  const bookletFile = files.find((f) => f.fileType === "BOOKLET_PDF") ?? null;
  const answerKeyFile = files.find((f) => f.fileType === "ANSWER_KEY_PDF") ?? null;
  const linkedTagIds = examAccessTags.map((t) => t.accessTagId);

  const numFmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

  return (
    <>
      <PageHeader
        title={detail.title}
        subtitle={`${getOdkCadenceLabel(detail.cadenceFamily)}${detail.classLevel ? ` · ${detail.classLevel}. sınıf` : ""} · ${detail.durationMinutes} dk`}
        right={
          <>
            <OdkAdminExamStatusBadge status={detail.status} />
            <Link href={`/panel/admin/odk/denemeler/${detail.id}/cozumler`} className="od-btn od-btn-ghost">
              Çözümler
            </Link>
            <Link href="/panel/admin/odk/denemeler" className="od-btn od-btn-ghost">
              Denemelere dön
            </Link>
          </>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Yaşam döngüsü" subtitle="Yayınla, arşivle, geri al — geçmiş çözümler her durumda korunur." />
        <CardBody>
          <OdkExamActionBar
            examId={detail.id}
            status={detail.status}
            readiness={detail.readiness}
          />
        </CardBody>
      </Card>

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <OdkExamReadinessChecklist readiness={detail.readiness} />

        <Card>
          <CardHeader title="Genel" />
          <CardBody>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", fontSize: 13, margin: 0 }}>
              <dt className="od-muted">Slug</dt><dd className="od-mono">{detail.slug}</dd>
              <dt className="od-muted">Bölüm</dt><dd>{detail.sections.length} bölüm · {detail.totalQuestionCount} soru</dd>
              <dt className="od-muted">Cevap anahtarı</dt><dd>{detail.answerKeyRowCount} / {detail.totalQuestionCount}</dd>
              <dt className="od-muted">Kazanım</dt><dd>{detail.outcomeReadyCount} hazır · {detail.outcomeMissingCount} eksik</dd>
              <dt className="od-muted">Erişim tagı</dt><dd>{detail.access.tagCount} tag · {detail.access.grantedUserCount} grant (örtüşmeli)</dd>
              <dt className="od-muted">Çözüm</dt><dd>{detail.attempts.totalCount}</dd>
              <dt className="od-muted">Oluşturulma</dt><dd>{dateFmt.format(detail.createdAt)}</dd>
              {detail.publishedAt ? (
                <>
                  <dt className="od-muted">İlk yayın</dt>
                  <dd>{dateFmt.format(detail.publishedAt)}</dd>
                </>
              ) : null}
            </dl>
          </CardBody>
        </Card>
      </div>

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader
            title="Bölüm dağılımı"
            subtitle={`${detail.sections.length} bölüm · ${detail.totalQuestionCount} soru`}
          />
          <CardBody>
            {detail.sections.length === 0 ? (
              <div className="od-muted" style={{ fontSize: 13 }}>Henüz bölüm tanımlanmamış.</div>
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Bölüm</th>
                    <th>Soru</th>
                    <th>Cevap</th>
                    <th>Kazanım</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.sections.map((s) => (
                    <tr key={s.id}>
                      <td className="od-mono">{s.orderIndex + 1}</td>
                      <td>{s.title}</td>
                      <td>{s.questionCount}</td>
                      <td>
                        {s.answerCount} / {s.questionCount}
                        {s.missingAnswerCount > 0 ? (
                          <span className="od-muted" style={{ marginLeft: 6, fontSize: 11 }}>
                            ({s.missingAnswerCount} eksik)
                          </span>
                        ) : null}
                      </td>
                      <td>
                        {s.outcomeReadyCount} / {s.questionCount}
                        {s.missingOutcomeCount > 0 ? (
                          <span className="od-muted" style={{ marginLeft: 6, fontSize: 11 }}>
                            ({s.missingOutcomeCount} eksik)
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Erişim tagı özeti"
            subtitle={
              detail.access.tagCount === 0
                ? "Bağlı tag yok — yayınlama bloke."
                : `${detail.access.tagCount} tag bağlı`
            }
          />
          <CardBody>
            {detail.access.tags.length === 0 ? (
              <div className="od-muted" style={{ fontSize: 13 }}>
                Henüz erişim tagı bağlanmamış. Aşağıdaki düzenleyiciden ekleyin.
              </div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {detail.access.tags.map((t) => (
                  <li key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                    <span>
                      <strong>{t.title}</strong>{" "}
                      <span className="od-mono od-muted" style={{ fontSize: 11 }}>{t.key}</span>
                    </span>
                    <span className="od-muted" style={{ fontSize: 12 }}>
                      {t.grantedUserCount} kullanıcı
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardHeader
          title="Çözüm özeti"
          subtitle={
            detail.attempts.totalCount === 0
              ? "Henüz çözüm yok."
              : `Toplam ${detail.attempts.totalCount} · ${detail.attempts.submittedCount} tamamlanmış · ${detail.attempts.inProgressCount} devam · ${detail.attempts.abandonedCount} terkedilmiş`
          }
          right={
            <Link href={`/panel/admin/odk/denemeler/${detail.id}/cozumler`} className="od-btn od-btn-ghost">
              Tümünü gör
            </Link>
          }
        />
        <CardBody>
          {detail.attempts.totalCount === 0 ? (
            <div className="od-muted" style={{ fontSize: 13 }}>Henüz çözüm yok.</div>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12, fontSize: 13 }}>
                <span><strong>Ortalama puan:</strong>{" "}
                  {detail.attempts.averageScore == null ? "—" : numFmt.format(detail.attempts.averageScore)}
                </span>
                <span><strong>İhlal işaretli:</strong> {detail.attempts.flaggedCount}</span>
              </div>
              {detail.attempts.recent.length > 0 ? (
                <table className="od-table">
                  <thead>
                    <tr>
                      <th>Öğrenci</th>
                      <th>Durum</th>
                      <th>Başladı</th>
                      <th>Bitti</th>
                      <th>Puan</th>
                      <th>İhlal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.attempts.recent.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{a.userName}</div>
                          {a.userEmail ? (
                            <div className="od-mono od-muted" style={{ fontSize: 11 }}>{a.userEmail}</div>
                          ) : null}
                        </td>
                        <td>{a.status}</td>
                        <td className="od-mono od-muted" style={{ fontSize: 11 }}>
                          {a.startedAt ? dateFmt.format(a.startedAt) : "—"}
                        </td>
                        <td className="od-mono od-muted" style={{ fontSize: 11 }}>
                          {a.submittedAt ? dateFmt.format(a.submittedAt) : "—"}
                        </td>
                        <td>{a.score == null ? "—" : numFmt.format(a.score)}</td>
                        <td>{a.cheatViolationCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>

      <ExamDetailEditor
        exam={{
          id: detail.id,
          title: detail.title,
          status: detail.status,
          totalSlots: detail.totalQuestionCount,
          officialAnswerCount: detail.answerKeyRowCount,
          kazanimReady: detail.outcomeReadyCount,
          kazanimMissingCount: detail.outcomeMissingCount,
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
