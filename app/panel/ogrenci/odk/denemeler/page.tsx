import Link from "next/link";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";
import {
  getStudentOdkContext,
  getAvailableOdkExamsForStudent,
  getStudentOdkAttempts,
  getStudentOdkSummary,
} from "@/lib/panel/odk-student";
import { OdkExamCard } from "@/components/panel/odk/student/odk-exam-card";
import { OdkAttemptList } from "@/components/panel/odk/student/odk-attempt-list";

export const metadata: Metadata = {
  title: "Denemelerim · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudentOdkExamsPage() {
  const ctx = await requireOdkPanel("ogrenci");
  const studentCtx = await getStudentOdkContext(ctx.userId, ctx.actualRole);

  const [exams, attempts, summary] = await Promise.all([
    getAvailableOdkExamsForStudent(studentCtx),
    getStudentOdkAttempts(ctx.userId, { take: 10, onlySubmitted: true }),
    getStudentOdkSummary(ctx.userId, ctx.actualRole),
  ]);

  return (
    <>
      <PageHeader
        title="Denemelerim"
        subtitle={`${ctx.name ?? ""} · Erişebileceğin denemelerin ve son sonuçların`}
        right={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Link
              href="/panel/ogrenci/odk/gelisim"
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Gelişim
            </Link>
            <Link
              href="/panel/ogrenci/odk/kazanim-analizim"
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Kazanım analizi
            </Link>
            <Link
              href="/panel/ogrenci/hedefim"
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Hedefim
            </Link>
          </div>
        }
      />

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <Kpi
          label="Erişilebilir deneme"
          value={String(summary.availableCount)}
        />
        <Kpi label="Tamamlanan" value={String(summary.completedCount)} />
        <Kpi
          label="Son net"
          value={summary.latestNet != null ? summary.latestNet.toFixed(2) : "—"}
        />
        <Kpi
          label="En iyi net"
          value={summary.bestNet != null ? summary.bestNet.toFixed(2) : "—"}
        />
      </div>

      {summary.inProgressAttempt ? (
        <Card style={{ marginBottom: 16 }}>
          <CardBody>
            <div
              className="od-row od-row-between"
              style={{ gap: 12, alignItems: "center" }}
            >
              <div>
                <Badge tone="warn">Devam ediyor</Badge>{" "}
                <strong style={{ marginLeft: 6 }}>
                  {summary.inProgressAttempt.examTitle}
                </strong>
              </div>
              <Link
                href={`/panel/ogrenci/odk/cozum/${summary.inProgressAttempt.id}`}
                className="od-btn od-btn-primary od-btn-sm"
              >
                Devam et
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>
        Erişebileceğin denemeler
      </h2>
      {exams.length === 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <CardBody>
            <EmptyState
              icon="folder"
              title="Henüz erişilebilir deneme yok"
              description="Erişim tagların aktif olduğunda yeni denemeler burada görünür. Sorun varsa danışmanına yaz."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="od-grid g-2" style={{ marginBottom: 16 }}>
          {exams.map((e) => (
            <OdkExamCard key={e.id} exam={e} />
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>Son denemeler</h2>
      <OdkAttemptList attempts={attempts} showCheatHints />
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "white",
        padding: 16,
        borderRadius: 12,
        border: "1px solid var(--pd-line)",
      }}
    >
      <div className="od-muted" style={{ fontSize: 12, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}
