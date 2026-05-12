type Delta = { value: string; trend: "up" | "down" | "flat" };

type Props = {
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
  delta?: Delta;
  spark?: React.ReactNode;
};

export function KpiCard({ label, value, meta, delta, spark }: Props) {
  return (
    <div className="od-card od-kpi">
      <div className="od-kpi-label">{label}</div>
      <div className="od-kpi-value">{value}</div>
      <div className="od-kpi-meta">
        {delta ? (
          <span className={`od-delta od-delta-${delta.trend}`}>
            {delta.trend === "up" ? "↑" : delta.trend === "down" ? "↓" : "→"} {delta.value}
          </span>
        ) : null}
        {meta}
      </div>
      {spark ? <div className="od-kpi-spark">{spark}</div> : null}
    </div>
  );
}
