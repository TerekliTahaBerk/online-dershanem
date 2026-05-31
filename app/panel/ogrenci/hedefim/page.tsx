import Link from "next/link";

import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { requireStudent } from "@/lib/panel-student";
import {
  getStudentActiveGoal,
  getStudentCurrentAcademicSnapshot,
  getStudentNetTrend,
  getStudentGoalGap,
  getStudentRoadmapRecommendations,
} from "@/lib/panel/academic-roadmap";
import { AcademicGoalCard } from "@/components/panel/academic-roadmap/academic-goal-card";
import { AcademicGoalForm } from "@/components/panel/academic-roadmap/academic-goal-form";
import { AcademicCurrentLevelCard } from "@/components/panel/academic-roadmap/academic-current-level";
import { AcademicGapCard } from "@/components/panel/academic-roadmap/academic-gap-card";
import { RoadmapRecommendations } from "@/components/panel/academic-roadmap/roadmap-recommendations";
import { AcademicTrend } from "@/components/panel/academic-roadmap/academic-trend";

export const dynamic = "force-dynamic";

type SearchParams = { ok?: string };

/**
 * Student Academic Roadmap — Phase 2 / Session 7.
 *
 * The page never invents data. If the student has no goal we show a setup
 * CTA next to honest empty states for current level / gap / trend. Every
 * section degrades to empty rather than fabricating numbers.
 */
export default async function StudentAcademicRoadmapPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { student } = await requireStudent();
  const sp = await searchParams;

  if (!student) {
    return (
      <>
        <PageHeader
          title="Akademik Yol Haritam"
          breadcrumbs={[
            { label: "Öğrenci", href: "/panel/ogrenci" },
            { label: "Akademik yol haritam" },
          ]}
        />
        <Card>
          <CardBody>
            <EmptyState
              icon="user"
              title="Öğrenci profili bulunamadı"
              description="Yol haritası özelliğini kullanmak için hesabının bir öğrenci kaydına bağlı olması gerekiyor."
              action={
                <Link href="/iletisim" className="od-btn od-btn-primary od-btn-sm">
                  İletişime geç
                </Link>
              }
            />
          </CardBody>
        </Card>
      </>
    );
  }

  const [goal, snapshot, trend, recommendations] = await Promise.all([
    getStudentActiveGoal(student.id),
    getStudentCurrentAcademicSnapshot(student.id, student.userId),
    getStudentNetTrend(student.id, student.userId, 10),
    getStudentRoadmapRecommendations(student.id, student.userId),
  ]);
  const gap = getStudentGoalGap(goal, snapshot);

  return (
    <>
      <PageHeader
        title="Akademik Yol Haritam"
        subtitle={
          goal
            ? "Hedefini gerçek verilerle takip et."
            : "Hedef belirleyerek yol haritanı kişiselleştir."
        }
        breadcrumbs={[
          { label: "Öğrenci", href: "/panel/ogrenci" },
          { label: "Akademik yol haritam" },
        ]}
        meta={
          goal ? <Badge tone="accent">Aktif hedef</Badge> : null
        }
      />

      {sp.ok === "1" ? (
        <Card padded>
          <div className="od-row" style={{ gap: 8, alignItems: "center" }}>
            <Badge tone="ok">Kaydedildi</Badge>
            <span className="od-muted" style={{ fontSize: 13 }}>
              Hedefin güncellendi.
            </span>
          </div>
        </Card>
      ) : null}

      {/* Row 1 — goal + form (1.2 / 1) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <AcademicGoalCard goal={goal} />
        <Card>
          <CardHeader
            title={goal ? "Hedefi güncelle" : "Hedefini belirle"}
            subtitle="Tek aktif hedefin olur — kaydettiğinde önceki yerine geçer"
          />
          <CardBody>
            <AcademicGoalForm goal={goal} />
          </CardBody>
        </Card>
      </div>

      {/* Row 2 — current level + gap (1.4 / 1) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <AcademicCurrentLevelCard snapshot={snapshot} />
        <AcademicGapCard gap={gap} />
      </div>

      {/* Row 3 — recommendations (full) */}
      <div style={{ marginBottom: 12 }}>
        <RoadmapRecommendations items={recommendations} />
      </div>

      {/* Row 4 — trend (full) */}
      <div style={{ marginBottom: 12 }}>
        <AcademicTrend points={trend} />
      </div>
    </>
  );
}
