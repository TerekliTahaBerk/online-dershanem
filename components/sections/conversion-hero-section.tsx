import Link from "next/link";
import { ArrowRight, Mic, Users } from "lucide-react";

const trust = [
  { n: "1.200+", l: "Aktif ve mezun öğrenci" },
  { n: "50+", l: "Uzman eğitmen kadrosu" },
  { n: "%98", l: "Öğrenci-veli memnuniyeti" },
  { n: "30K+", l: "Canlı ders saati" }
];

const roster = [
  { n: "Merve Y.", i: "MY", speaking: true },
  { n: "Ayşe D.", i: "AD" },
  { n: "Can Ö.", i: "CÖ" },
  { n: "Elif K.", i: "EK" },
  { n: "Pelin A.", i: "PA" }
];

export function ConversionHeroSection() {
  return (
    <section className="pd-hero">
      <div className="pd-hero-grid" />
      <div className="pd-hero-inner">
        <div>
          <div className="pd-hero-badge">
            <span className="pd-hero-badge-tag">YENİ</span>
            <span>TYT · AYT · LGS — Küçük Grup Canlı Ders</span>
            <ArrowRight size={14} />
          </div>

          <h1>
            Kalabalıktan çık,
            <br />
            <em>hedefine odaklan.</em>
          </h1>

          <p className="pd-hero-sub">
            Toplu paket zorunluluğu yok. Sadece ihtiyacın olan dersi seç, maksimum 4 kişilik butik sınıfta
            canlı ders + koçluk + deneme analiziyle net artışını hızlandır.
          </p>

          <div className="pd-hero-cta">
            <Link href="/paketler/" className="pd-btn pd-btn-primary pd-btn-lg">
              Paketleri Gör <ArrowRight size={16} />
            </Link>
            <Link href="/kamplar/" className="pd-btn pd-btn-ghost pd-btn-lg">
              Kampları İncele
            </Link>
          </div>

          <div className="pd-hero-trust">
            {trust.map((t) => (
              <div key={t.l} className="pd-hero-trust-item">
                <span className="pd-hero-trust-num">{t.n}</span>
                <span className="pd-hero-trust-label">{t.l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pd-hero-visual">
          <div className="pd-hero-visual-card">
            <div className="pd-live-topbar">
              <span className="pd-live-dot" />
              <span className="pd-live-title">TYT Matematik · Türev Uygulamaları</span>
              <span className="pd-live-meta">00:42:18</span>
            </div>
            <div className="pd-live-stage">
              <div className="pd-whiteboard">
                <div className="pd-wb-eq">f(x) = 3x² − 12x + 7</div>
                <div className="pd-wb-step">f&apos;(x) = 6x − 12</div>
                <div className="pd-wb-step">
                  6x − 12 = 0 ⇒ <span className="pd-wb-hl">x = 2</span>
                </div>
                <div className="pd-wb-step" style={{ marginTop: 10 }}>
                  f&apos;&apos;(x) = 6 &gt; 0 → <span className="pd-wb-hl">yerel min</span>
                </div>
                <div className="pd-wb-step">f(2) = −5</div>
              </div>
              <div className="pd-live-roster">
                {roster.map((r) => (
                  <div key={r.i} className={`pd-roster-item ${r.speaking ? "speaking" : ""}`}>
                    <div className="pd-roster-avatar">{r.i}</div>
                    <div style={{ flex: 1 }}>{r.n}</div>
                    {r.speaking && <Mic size={12} />}
                  </div>
                ))}
              </div>
            </div>
            <div className="pd-live-footer">
              <button className="pd-live-btn mic" aria-label="Mikrofon">
                <Mic size={12} />
              </button>
              <button className="pd-live-btn" aria-label="Katılımcılar">
                <Users size={12} />
              </button>
              <span style={{ marginLeft: "auto" }}>5 katılımcı · 4 / 4 max kontenjan</span>
            </div>
          </div>
          <div className="pd-hero-pill" style={{ top: "-12px", right: "-20px" }}>
            <span className="pd-dot" /> Max 4 kişilik grup
          </div>
          <div className="pd-hero-pill-stat" style={{ bottom: "-16px", left: "-30px" }}>
            <span className="v">+14 net</span>
            <span>bu ayki ortalama artış</span>
          </div>
        </div>
      </div>
    </section>
  );
}
