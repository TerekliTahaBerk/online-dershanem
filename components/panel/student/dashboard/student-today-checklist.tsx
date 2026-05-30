import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { StudentChecklistItem } from "@/lib/panel/student-dashboard";

const TONE_BG: Record<string, string> = {
  ok: "var(--pd-good-soft, rgba(16,185,129,0.10))",
  warn: "var(--pd-warn-soft, rgba(245,158,11,0.10))",
  bad: "var(--pd-bad-soft, rgba(220,38,38,0.10))",
  accent: "var(--pd-accent-soft, rgba(59,130,246,0.10))",
  neutral: "var(--pd-soft)",
};

const KIND_LABEL: Record<StudentChecklistItem["kind"], string> = {
  LESSON_TODAY: "Ders",
  HOMEWORK_DUE_TODAY: "Ödev",
  HOMEWORK_OVERDUE: "Geciken",
  EXAM_TODAY: "Deneme",
};

type Props = { items: StudentChecklistItem[]; firstName: string };

export function StudentTodayChecklist({ items, firstName }: Props) {
  const remaining = items.filter((i) => !i.done).length;
  return (
    <Card>
      <CardHeader
        title="Bugünkü plan"
        subtitle={
          items.length === 0
            ? `Bugün için planlı bir şey yok, ${firstName}.`
            : `${remaining}/${items.length} açık görev`
        }
      />
      <CardBody>
        {items.length === 0 ? (
          <EmptyState
            icon="check"
            title="Bugün için planlı bir şey yok"
            description="Boş zamanını çalışma odasında değerlendirebilirsin."
            action={
              <Link href="/panel/ogrenci/calisma-odasi" className="od-btn od-btn-primary od-btn-sm">
                Çalışma başlat →
              </Link>
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((it) => {
              const inner = (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "20px 60px 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: TONE_BG[it.tone] ?? "var(--pd-soft)",
                    opacity: it.done ? 0.55 : 1,
                  }}
                >
                  <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>
                    {it.done ? "✓" : it.tone === "bad" ? "!" : "•"}
                  </span>
                  <span className="od-mono od-muted" style={{ fontSize: 11 }}>
                    {it.timeLabel ?? "—"}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textDecoration: it.done ? "line-through" : "none",
                    }}
                  >
                    {it.message}
                  </span>
                  <Badge
                    tone={
                      it.tone === "ok"
                        ? "ok"
                        : it.tone === "bad"
                        ? "bad"
                        : it.tone === "warn"
                        ? "warn"
                        : it.tone === "accent"
                        ? "accent"
                        : "neutral"
                    }
                  >
                    {KIND_LABEL[it.kind]}
                  </Badge>
                </div>
              );
              return it.href ? (
                <Link key={it.id} href={it.href} style={{ textDecoration: "none", color: "inherit" }}>
                  {inner}
                </Link>
              ) : (
                <div key={it.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
