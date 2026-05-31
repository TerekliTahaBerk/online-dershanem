import Link from "next/link";

import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { MaterialTypeBadge } from "./material-type-badge";
import { getMaterialOpenUrl, type MaterialRow } from "@/lib/panel/materials";
import type { StudentMaterialRecommendations } from "@/lib/panel/materials";

type Props = {
  recommendations: StudentMaterialRecommendations;
};

function MaterialRowItem({ m }: { m: MaterialRow }) {
  const href = getMaterialOpenUrl(m);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 8,
        background: "var(--pd-soft)",
      }}
    >
      <MaterialTypeBadge type={m.type} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {m.title}
        </div>
        <div className="od-muted" style={{ fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {m.courseTitle ?? m.subject ?? m.classroomName ?? "—"}
        </div>
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="od-btn od-btn-sm">
          Aç
        </a>
      ) : (
        <Link href="/panel/ogrenci/kutuphane" className="od-btn od-btn-sm od-btn-ghost">
          Oku
        </Link>
      )}
    </div>
  );
}

/**
 * Student dashboard'una bir materyal önerisi kartı.
 * Önce "yaklaşan dersine ait materyaller", sonra "son eklenenler".
 */
export function StudentSuggestedMaterialsCard({ recommendations }: Props) {
  const { recent, byNextLessonCourse, attachedToFocus, totalAccessible } = recommendations;
  const hasAny = recent.length + byNextLessonCourse.length + attachedToFocus.length > 0;

  return (
    <Card>
      <CardHeader
        title="Sana özel materyaller"
        subtitle={
          totalAccessible > 0
            ? `Erişebileceğin ${totalAccessible} materyal`
            : "Henüz erişebileceğin materyal yok"
        }
        right={
          <Link href="/panel/ogrenci/kutuphane" className="od-btn od-btn-ghost od-btn-sm">
            Kütüphane →
          </Link>
        }
      />
      <CardBody>
        {!hasAny ? (
          <EmptyState
            icon="folder"
            title="Henüz materyal paylaşılmadı"
            description="Sınıf veya ders öğretmenin materyal paylaştığında burada listelenir."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {attachedToFocus.length > 0 ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Badge tone="purple">Öğretmenin önerdiği</Badge>
                  <span className="od-muted" style={{ fontSize: 12 }}>
                    Yaklaşan ders / ödev için
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {attachedToFocus.slice(0, 4).map((m) => <MaterialRowItem key={m.id} m={m} />)}
                </div>
              </div>
            ) : null}

            {byNextLessonCourse.length > 0 ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Badge tone="accent">Yaklaşan dersin</Badge>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {byNextLessonCourse.slice(0, 3).map((m) => <MaterialRowItem key={m.id} m={m} />)}
                </div>
              </div>
            ) : null}

            {recent.length > 0 ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Badge tone="neutral">Son eklenenler</Badge>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {recent.slice(0, 4).map((m) => <MaterialRowItem key={m.id} m={m} />)}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
