"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";

type HomeCamp = {
  tag: string;
  name: string;
  detail: string;
  dates: string;
  slots: string;
  hrs: string;
  price: string;
};

const campPaymentLink = "https://www.paytr.com/link/dQECKnq";
const homeCamps: HomeCamp[] = [
  {
    tag: "AYT KAMPI",
    name: "AYT Belirleyici Konular Kampı",
    detail: "Trigonometri, Türev, Limit ve Logaritma konularında net artıran yoğun tekrar.",
    dates: "2 haftalık yoğun program",
    slots: "8 kişi",
    hrs: "Haftada 12 saat",
    price: "₺2.000,00"
  },
  {
    tag: "TYT KAMPI",
    name: "Problemler Kampı",
    detail: "Problemlerde hızlı model kurma, çözüm stratejileri ve süre yönetimi.",
    dates: "10 günlük hız kampı",
    slots: "8 kişi",
    hrs: "Haftada 10 saat",
    price: "₺2.000,00"
  },
  {
    tag: "LGS KAMPI",
    name: "Yeni Nesil Sorular Kampı",
    detail: "Problem çözme, mantık ve çok adımlı sorularda yeni nesil yaklaşım.",
    dates: "3 haftalık odak kampı",
    slots: "8 kişi",
    hrs: "Haftada 8 saat",
    price: "₺2.000,00"
  }
];

export function CampsPreviewSection() {
  return (
    <section id="ana-sayfa-kamplar" className="pd-section">
      <div className="pd-section-header">
        <div className="pd-section-head-txt">
          <span className="pd-eyebrow">Kamplar</span>
          <h2>
            Yoğun takipli sınav kampları.
            <br />
            Kısa sürede yüksek net.
          </h2>
          <p>Tatil dönemlerinde ve sınav haftasına kadar sürdürülebilir yüksek tempo. Her kampın sonunda ölçülebilir sonuç.</p>
        </div>
        <Link href="/kamplar/" className="pd-btn pd-btn-ghost">
          Tüm Kampları Gör <ArrowRight size={14} />
        </Link>
      </div>

      <div className="pd-section-inner">
        <div className="pd-camp-grid">
          {homeCamps.map((camp) => (
            <article key={camp.name} className="pd-camp-card">
              <div className="pd-camp-hdr">
                <div className="pd-camp-tag">{camp.tag}</div>
                <span className="pd-camp-status">Kayıt Açık</span>
              </div>
              <div className="pd-camp-body">
                <h3>{camp.name}</h3>
                <p>{camp.detail}</p>
                <div className="pd-camp-meta">
                  <div>
                    <div className="pd-camp-meta-k">Tarih</div>
                    <div className="pd-camp-meta-v">{camp.dates}</div>
                  </div>
                  <div>
                    <div className="pd-camp-meta-k">Kontenjan</div>
                    <div className="pd-camp-meta-v">{camp.slots}</div>
                  </div>
                  <div>
                    <div className="pd-camp-meta-k">Süre</div>
                    <div className="pd-camp-meta-v">{camp.hrs}</div>
                  </div>
                  <div>
                    <div className="pd-camp-meta-k">Yer</div>
                    <div className="pd-camp-meta-v">Online / Canlı</div>
                  </div>
                </div>
              </div>
              <div className="pd-camp-foot">
                <div>
                  <div className="pd-camp-price">{camp.price}</div>
                  <div className="pd-camp-price-sub">tek seferlik</div>
                </div>
                <PurchaseFunnelTrigger
                  source={`home_camp_${camp.tag}_${camp.name}_purchase`}
                  packageName={`${camp.name} Kampı`}
                  paymentLink={campPaymentLink}
                  className="pd-btn pd-btn-primary pd-camp-cta"
                  analyticsId={`home_camp_${camp.tag}_${camp.name}_purchase`}
                >
                  Detaylar <ArrowRight size={14} />
                </PurchaseFunnelTrigger>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
