import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { OdkSectionScore } from "@/lib/panel/odk-student";

export function OdkSectionBreakdown({
  sections,
}: {
  sections: OdkSectionScore[];
}) {
  if (sections.length === 0) {
    return (
      <Card>
        <CardHeader title="Bölüm bazında" />
        <CardBody>
          <EmptyState
            icon="chart"
            title="Bölüm verisi yok"
            description="Bu deneme için kayıtlı bölüm dağılımı bulunmuyor."
          />
        </CardBody>
      </Card>
    );
  }

  // Highlight the worst section as a quick visual cue.
  const worst = [...sections].sort((a, b) => a.net - b.net)[0];

  return (
    <Card>
      <CardHeader
        title="Bölüm bazında"
        subtitle="Net = doğru − yanlış / 4"
      />
      <CardBody>
        <table className="od-table">
          <thead>
            <tr>
              <th>Bölüm</th>
              <th>Soru</th>
              <th>Doğru</th>
              <th>Yanlış</th>
              <th>Boş</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => {
              const isWorst = worst && s.sectionId === worst.sectionId;
              return (
                <tr
                  key={s.sectionId}
                  style={
                    isWorst ? { background: "rgba(254, 226, 226, 0.4)" } : {}
                  }
                >
                  <td>
                    <strong>{s.title}</strong>
                  </td>
                  <td>{s.questionCount}</td>
                  <td style={{ color: "#16a34a", fontWeight: 600 }}>
                    {s.correct}
                  </td>
                  <td style={{ color: "#dc2626" }}>{s.wrong}</td>
                  <td className="od-muted">{s.blank}</td>
                  <td style={{ fontWeight: 700 }}>{s.net.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
