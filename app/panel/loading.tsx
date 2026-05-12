export default function Loading() {
  return (
    <div style={{ padding: 24 }}>
      <div className="od-skeleton" style={{ height: 28, width: 220, marginBottom: 16, borderRadius: 6 }} />
      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="od-skeleton" style={{ height: 96, borderRadius: 12 }} />
        ))}
      </div>
      <div className="od-skeleton" style={{ height: 280, borderRadius: 12 }} />
    </div>
  );
}
