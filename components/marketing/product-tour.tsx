import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LearningDashboardShowcase } from "@/components/marketing/learning-dashboard-showcase";

const chapters = [
  {
    kicker: "Ürün deneyimi 01",
    title: "Canlı derste öğrenci görünür.",
    body: "En fazla dört kişilik grupta öğrenci yalnızca dinlemez; çözümünü gösterir, sorusunu sorar ve takıldığı adımı öğretmeniyle birlikte açar.",
  },
  {
    kicker: "Ürün deneyimi 02",
    title: "Öğrenci ne çalışacağını bilir.",
    body: "Ders bittiğinde konu, ödev, tekrar ve sıradaki hedef açık kalır. Öğrenci haftayı nereden devam edeceğini bilerek planlar.",
  },
  {
    kicker: "Ürün deneyimi 03",
    title: "Veli süreci görür.",
    body: "İşlenen konu, zorlanılan nokta, bu haftanın çalışması ve sonraki hedef sade bir ders özetiyle paylaşılır.",
  },
];

export function ProductTour() {
  return (
    <section id="urun-deneyimi" className="bg-white">
      <div className="site-container site-section">
        <div className="mx-auto max-w-3xl text-center">
          <p className="site-kicker">Dersin ötesinde bir çalışma düzeni</p>
          <h2 className="mt-4 text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[1.02] tracking-[-.045em] text-[var(--site-ink)]">
            Öğrenci ne çalışacağını bilir. Veli süreci görür.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-[var(--site-body)]">
            Ders, çalışma planı ve veli özeti aynı sade düzenin parçalarıdır.
          </p>
        </div>
        <div className="mt-14 sm:mt-20">
          <LearningDashboardShowcase />
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3 sm:mt-20">
          {chapters.map((chapter, index) => (
            <article key={chapter.title} className="flex flex-col rounded-[22px] border border-[var(--site-line)] bg-white p-6 sm:p-7">
              <div>
                <p className="site-kicker">{chapter.kicker}</p>
                <h3 className="mt-4 text-[clamp(1.55rem,3vw,2rem)] font-semibold leading-[1.08] tracking-[-.03em] text-[var(--site-ink)]">{chapter.title}</h3>
                <p className="mt-4 text-[14px] leading-7 text-[var(--site-body)]">{chapter.body}</p>
                {index === 0 ? (
                  <Link href="/ders-paketleri/" className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--brand-olive)] hover:underline">
                    Paketleri gör <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
