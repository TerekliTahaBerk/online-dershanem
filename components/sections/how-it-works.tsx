import { howItWorks } from "@/lib/content";

export function HowItWorks() {
  return (
    <section id="nasil-calisir" className="pd-section">
      <div className="pd-section-header">
        <div className="pd-section-head-txt">
          <span className="pd-eyebrow">Nasıl Çalışır</span>
          <h2>5 adımda ölçülebilir gelişim</h2>
          <p>Öğrenci kaydından net artışına kadar her adımı sistematik olarak yönetiyoruz.</p>
        </div>
      </div>
      <div className="pd-section-inner">
        <div className="pd-how-grid">
          {howItWorks.map((s, i) => (
            <div className="pd-how-step" key={s.title}>
              <div className="pd-how-num">0{i + 1}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
