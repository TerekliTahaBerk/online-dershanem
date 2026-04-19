import { Wallet, Users, TrendingUp } from "lucide-react";
import { whyUs } from "@/lib/content";

const icons = [Wallet, Users, TrendingUp];

export function WhyUsSection() {
  return (
    <section className="pd-section">
      <div className="pd-section-header">
        <div className="pd-section-head-txt">
          <span className="pd-eyebrow">Farkımız</span>
          <h2>
            Neden binlerce öğrenci
            <br />
            Online Dershanem&apos;i seçiyor?
          </h2>
          <p>Butik sınıf, ders bazlı özgür seçim ve sürdürülebilir disiplin — klasik dershane kalıplarını kırıyoruz.</p>
        </div>
      </div>
      <div className="pd-section-inner">
        <div className="pd-feat-grid">
          {whyUs.map((w, i) => {
            const Icon = icons[i % icons.length];
            return (
              <div className="pd-feat-card" key={w.title}>
                <div className="pd-feat-icon">
                  <Icon size={20} />
                </div>
                <h4>{w.title}</h4>
                <p>{w.content}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
