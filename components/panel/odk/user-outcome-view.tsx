import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import type { UserOutcomeReport } from "@/lib/odk/user-outcomes";

const fmtDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(d) : "—";

export function UserOutcomeView({ report }: { report: UserOutcomeReport }) {
  if (report.totalAttempts === 0) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            icon="chart"
            title="Henüz tamamlanmış deneme yok"
            description="Bu öğrenci kazanım analizi için yeterli sayıda denemeyi henüz çözmedi."
          />
        </CardBody>
      </Card>
    );
  }

  const overallSuccess =
    report.totalQuestions > 0 ? (report.totalCorrect / report.totalQuestions) * 100 : 0;

  return (
    <>
      <div className="od-kpi-grid" style={{ marginBottom: 12 }}>
        <KpiCard label="Çözülen deneme" value={report.totalAttempts} meta="Submitted" />
        <KpiCard label="Toplam soru" value={report.totalQuestions} />
        <KpiCard
          label="Başarı"
          value={`%${Math.round(overallSuccess)}`}
          meta={`${report.totalCorrect} D / ${report.totalWrong} Y / ${report.totalBlank} B`}
        />
        <KpiCard
          label="Analiz edilen kazanım"
          value={report.byOutcome.length}
          meta="≥2 deneme"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <CardHeader title="Ders bazlı performans" subtitle={`${report.byLesson.length} ders`} />
          <CardBody>
            {report.byLesson.length === 0 ? (
              <EmptyState title="Veri yok" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Ders</th>
                    <th>D/Y/B</th>
                    <th>Başarı</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byLesson.map((l) => {
                    const pct = l.total > 0 ? Math.round((l.correct / l.total) * 100) : 0;
                    return (
                      <tr key={l.lesson}>
                        <td>
                          <strong>{l.lesson}</strong>{" "}
                          <span className="od-muted" style={{ fontSize: 11 }}>
                            ({l.attemptCount} deneme)
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <span style={{ color: "#16a34a" }}>{l.correct}</span>
                          {" / "}
                          <span style={{ color: "#dc2626" }}>{l.wrong}</span>
                          {" / "}
                          <span className="od-muted">{l.blank}</span>
                        </td>
                        <td>
                          <Badge tone={pct >= 70 ? "ok" : pct >= 45 ? "warn" : "bad"}>%{pct}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Konu bazlı performans" subtitle={`İlk 15 konu`} />
          <CardBody>
            {report.byTopic.length === 0 ? (
              <EmptyState title="Konu meta yok" description="Resmi cevap anahtarında konu bilgisi yok." />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Ders</th>
                    <th>Konu</th>
                    <th>D/Y/B</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byTopic.slice(0, 15).map((t) => {
                    const pct = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
                    return (
                      <tr key={`${t.lesson}-${t.topic}`}>
                        <td style={{ fontSize: 12 }}>{t.lesson}</td>
                        <td style={{ fontSize: 12 }}>{t.topic}</td>
                        <td style={{ fontSize: 12 }} className="od-mono">
                          {t.correct}/{t.wrong}/{t.blank}
                        </td>
                        <td>
                          <Badge tone={pct >= 70 ? "ok" : pct >= 45 ? "warn" : "bad"}>%{pct}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <CardHeader
            title="En zayıf kazanımlar"
            subtitle="Hata oranı (yanlış+boş)/toplam"
          />
          <CardBody>
            {report.weakOutcomes.length === 0 ? (
              <EmptyState
                title="Yeterli veri yok"
                description="Aynı kazanımı en az 2 kez denemiş olmak gerekir."
              />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Ders</th>
                    <th>Kod</th>
                    <th>Kazanım</th>
                    <th>D/Y/B</th>
                    <th>Hata</th>
                  </tr>
                </thead>
                <tbody>
                  {report.weakOutcomes.map((r) => {
                    const pct = Math.round(r.errorRate * 100);
                    return (
                      <tr key={`w-${r.lesson}-${r.code}`}>
                        <td style={{ fontSize: 12 }}>{r.lesson}</td>
                        <td>
                          <code style={{ fontSize: 11 }}>{r.code}</code>
                        </td>
                        <td style={{ fontSize: 12 }}>{r.outcome || "—"}</td>
                        <td style={{ fontSize: 12 }} className="od-mono">
                          {r.correct}/{r.wrong}/{r.blank}
                        </td>
                        <td>
                          <Badge tone={pct >= 60 ? "bad" : pct >= 35 ? "warn" : "ok"}>%{pct}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="En güçlü kazanımlar" subtitle="Doğru oranı" />
          <CardBody>
            {report.strongOutcomes.length === 0 ? (
              <EmptyState title="Yeterli veri yok" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Ders</th>
                    <th>Kod</th>
                    <th>Kazanım</th>
                    <th>D/Y/B</th>
                    <th>Başarı</th>
                  </tr>
                </thead>
                <tbody>
                  {report.strongOutcomes.map((r) => {
                    const pct = Math.round(r.successRate * 100);
                    return (
                      <tr key={`s-${r.lesson}-${r.code}`}>
                        <td style={{ fontSize: 12 }}>{r.lesson}</td>
                        <td>
                          <code style={{ fontSize: 11 }}>{r.code}</code>
                        </td>
                        <td style={{ fontSize: 12 }}>{r.outcome || "—"}</td>
                        <td style={{ fontSize: 12 }} className="od-mono">
                          {r.correct}/{r.wrong}/{r.blank}
                        </td>
                        <td>
                          <Badge tone={pct >= 75 ? "ok" : pct >= 50 ? "warn" : "bad"}>%{pct}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Denemeler arası gelişim"
          subtitle="Eski → yeni (net ve başarı yüzdesi)"
        />
        <CardBody>
          {report.progress.length === 0 ? (
            <EmptyState title="Veri yok" />
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Deneme</th>
                  <th>Gönderim</th>
                  <th>D/Y/B</th>
                  <th>Net</th>
                  <th>Başarı</th>
                </tr>
              </thead>
              <tbody>
                {report.progress.map((p, i) => (
                  <tr key={p.attemptId}>
                    <td className="od-muted">{i + 1}</td>
                    <td>
                      <Link href={`/panel/admin/odk/cozumler/${p.attemptId}`}>{p.examTitle}</Link>
                    </td>
                    <td className="od-mono od-muted">{fmtDate(p.submittedAt)}</td>
                    <td className="od-mono" style={{ fontSize: 12 }}>
                      {p.correct}/{p.wrong}/{p.blank}
                    </td>
                    <td className="od-mono">{p.net.toFixed(2)}</td>
                    <td>
                      <Badge
                        tone={p.scorePct >= 70 ? "ok" : p.scorePct >= 45 ? "warn" : "bad"}
                      >
                        %{Math.round(p.scorePct)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </>
  );
}
