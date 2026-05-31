import Link from "next/link";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { PageHeader } from "@/components/panel/ui/page-header";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  getStudentOdkContext,
  getAvailableOdkExamsForStudent,
  getStudentOdkAttempts,
  getStudentOdkSummary,
  type OdkAvailableExam,
} from "@/lib/panel/odk-student";
import { OdkAttemptList } from "@/components/panel/odk/student/odk-attempt-list";
import {
  ExamBoardCard,
  cadenceTone,
  type ExamBoardTone,
} from "@/components/panel/odk/exam-board-card";

export const metadata: Metadata = {
  title: "Denemelerim · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_INFO: Record<
  OdkAvailableExam["status"],
  {
    label: string;
    tone: ExamBoardTone;
    cta?: { label: string; href: (e: OdkAvailableExam) => string | null; dark?: boolean };
  }
> = {
  AVAILABLE: {
    label: "Başlanabilir",
    tone: "lavender",
    cta: { label: "Başla", dark: true, href: (e) => `/panel/ogrenci/odk/baslat/${e.id}` },
  },
  IN_PROGRESS: {
    label: "Devam ediyor",
    tone: "sky",
    cta: {
      label: "Devam et",
      dark: true,
      href: (e) => (e.lastAttemptId ? `/panel/ogrenci/odk/cozum/${e.lastAttemptId}` : null),
    },
  },
  COMPLETED: {
    label: "Tamamlandı",
    tone: "mint",
    cta: {
      label: "Sonucu gör",
      href: (e) => (e.lastAttemptId ? `/panel/ogrenci/odk/sonuc/${e.lastAttemptId}` : null),
    },
  },
  EXPIRED: { label: "Süresi doldu", tone: "blush" },
  NOT_YET: { label: "Henüz açılmadı", tone: "yellow" },
};

const dateFmt = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });

export default async function StudentOdkExamsPage() {
  const ctx = await requireOdkPanel("ogrenci");
  const studentCtx = await getStudentOdkContext(ctx.userId, ctx.actualRole);

  const [exams, attempts, summary] = await Promise.all([
    getAvailableOdkExamsForStudent(studentCtx),
    getStudentOdkAttempts(ctx.userId, { take: 10, onlySubmitted: true }),
    getStudentOdkSummary(ctx.userId, ctx.actualRole),
  ]);

  const upcoming = exams
    .filter((e) => e.status === "NOT_YET" && e.startsAt)
    .sort((a, b) => a.startsAt!.getTime() - b.startsAt!.getTime())
    .slice(0, 6);
  const mainList = exams.filter((e) => e.status !== "NOT_YET");

  function renderExamCard(e: OdkAvailableExam) {
    const info = STATUS_INFO[e.status];
    const meta: Array<{ icon?: string; label: string }> = [
      { icon: "⏱", label: `${e.durationMinutes} dk` },
      { icon: "✏️", label: `${e.totalQuestions} soru` },
    ];
    if (e.classLevel) meta.unshift({ icon: "🎓", label: `${e.classLevel}. sınıf` });

    let footnote: string | null = null;
    if (e.status === "COMPLETED" && e.lastAttemptScore != null) {
      footnote = `Son net: ${e.lastAttemptScore.toFixed(2)}`;
    } else if (e.status === "IN_PROGRESS") {
      footnote = "Devam eden bir çözümün var.";
    } else if (e.status === "EXPIRED") {
      footnote = "Bu denemenin süresi doldu.";
    }

    let action: React.ReactNode = null;
    if (info.cta) {
      const href = info.cta.href(e);
      if (href) {
        action = (
          <Link href={href} className={`od-btn sm${info.cta.dark ? " dark" : ""}`}>
            {info.cta.label}
          </Link>
        );
      }
    }

    return (
      <ExamBoardCard
        key={e.id}
        eyebrow={
          <span
            className={`soft-pill is-${cadenceTone(e.cadenceFamily)}`}
            style={{ fontSize: 10, padding: "1px 7px" }}
          >
            {e.cadenceFamily}
          </span>
        }
        title={e.title}
        statusLabel={info.label}
        tone={info.tone}
        meta={meta}
        footnote={footnote}
        action={action}
      />
    );
  }

  const inProgress = summary.inProgressAttempt;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Öğrenci", href: "/panel/ogrenci" },
          { label: "ODK", href: "/panel/ogrenci/odk" },
          { label: "Denemelerim" },
        ]}
        title="Denemelerim"
        subtitle={`${ctx.name ?? ""} · Erişebileceğin denemelerin ve son sonuçların`}
        right={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Link href="/panel/ogrenci/odk/gelisim" className="od-btn ghost sm">Gelişim</Link>
            <Link href="/panel/ogrenci/odk/kazanim-analizim" className="od-btn ghost sm">Kazanım analizi</Link>
            <Link href="/panel/ogrenci/hedefim" className="od-btn ghost sm">Hedefim</Link>
          </div>
        }
      />

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <div className="mini-kpi-card">
          <div className="k-label">Erişilebilir deneme</div>
          <div className="k-value">{summary.availableCount}</div>
        </div>
        <div className="mini-kpi-card">
          <div className="k-label">Tamamlanan</div>
          <div className="k-value">{summary.completedCount}</div>
        </div>
        <div className="mini-kpi-card">
          <div className="k-label">Son net</div>
          <div className="k-value">
            {summary.latestNet != null ? summary.latestNet.toFixed(2) : "—"}
          </div>
        </div>
        <div className="mini-kpi-card">
          <div className="k-label">En iyi net</div>
          <div className="k-value">
            {summary.bestNet != null ? summary.bestNet.toFixed(2) : "—"}
          </div>
        </div>
      </div>

      {inProgress ? (
        <div
          className="pastel-event-card tone-sky"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 18px",
            borderRadius: 16,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              className="soft-pill is-sky"
              style={{ fontSize: 10.5, padding: "2px 9px", alignSelf: "flex-start" }}
            >
              Devam ediyor
            </span>
            <strong style={{ fontSize: 14, marginTop: 4 }}>{inProgress.examTitle}</strong>
          </div>
          <Link
            href={`/panel/ogrenci/odk/cozum/${inProgress.id}`}
            className="od-btn dark sm"
          >
            Devam et
          </Link>
        </div>
      ) : null}

      <div className={`od-exam-layout${upcoming.length > 0 ? " has-rail" : ""}`}>
        <div>
          <h2 className="od-exam-board-title">
            Erişebileceğin denemeler
            <span className="od-exam-board-title-count">{mainList.length}</span>
          </h2>
          {mainList.length === 0 ? (
            <div className="soft-card" style={{ padding: 0 }}>
              <EmptyState
                icon="folder"
                title="Henüz erişilebilir deneme yok"
                description="Erişim tagların aktif olduğunda yeni denemeler burada görünür. Sorun varsa danışmanına yaz."
              />
            </div>
          ) : (
            <div className="od-exam-grid">{mainList.map(renderExamCard)}</div>
          )}

          <h2 className="od-exam-board-title">
            Son denemeler
            <span className="od-exam-board-title-count">{attempts.length}</span>
          </h2>
          <OdkAttemptList attempts={attempts} showCheatHints />
        </div>

        {upcoming.length > 0 ? (
          <aside className="od-exam-rail" aria-label="Yaklaşan denemeler">
            <h3 className="od-exam-rail-title">Yaklaşan denemeler</h3>
            <ul className="od-exam-rail-list">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <span className="od-exam-rail-item">
                    <span className="od-exam-rail-item-date">
                      {e.startsAt ? dateFmt.format(e.startsAt) : "—"}
                    </span>
                    <span className="od-exam-rail-item-title" title={e.title}>{e.title}</span>
                    <span className="od-exam-rail-item-meta">
                      {e.cadenceFamily} · {e.durationMinutes} dk
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </>
  );
}
