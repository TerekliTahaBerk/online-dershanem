import { teachers } from "@/lib/content";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TeacherSection() {
  return (
    <section id="egitmenler" className="pd-section" style={{ background: "var(--pd-bg-subtle)" }}>
      <div className="pd-section-header">
        <div className="pd-section-head-txt">
          <span className="pd-eyebrow">Eğitmen Kadrosu</span>
          <h2>Öğrenciye en yakın öğretmenler.</h2>
          <p>Deneyimli, iletişimi güçlü, sınav odaklı.</p>
        </div>
      </div>
      <div className="pd-section-inner">
        <div className="pd-teachers-grid">
          {teachers.map((t) => (
            <div className="pd-teacher-card" key={t.name}>
              <div className="pd-teacher-photo">{initials(t.name)}</div>
              <div className="pd-teacher-branch">{t.branch}</div>
              <div className="pd-teacher-name">{t.name}</div>
              <div className="pd-teacher-uni">{t.uni}</div>
              <div className="pd-teacher-quote">&ldquo;{t.quote}&rdquo;</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
