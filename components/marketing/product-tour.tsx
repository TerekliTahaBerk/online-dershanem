import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { HeroLessonMockup, ParentNoteMockup, PlannerMockup } from "@/components/marketing/mockups";

const chapters = [
  {
    kicker: "Ürün deneyimi 01",
    title: "Canlı derste öğrenci görünür.",
    body: "En fazla dört kişilik grupta öğrenci yalnızca dinlemez; çözümünü gösterir, sorusunu sorar ve takıldığı adımı öğretmeniyle birlikte açar.",
    visual: <HeroLessonMockup />,
  },
  {
    kicker: "Ürün deneyimi 02",
    title: "Öğrenci ne çalışacağını bilir.",
    body: "Ders bittiğinde konu, ödev, tekrar ve sıradaki hedef açık kalır. Öğrenci haftayı nereden devam edeceğini bilerek planlar.",
    visual: <PlannerMockup />,
  },
  {
    kicker: "Ürün deneyimi 03",
    title: "Veli süreci görür.",
    body: "İşlenen konu, zorlanılan nokta, bu haftanın çalışması ve sonraki hedef sade bir ders özetiyle paylaşılır.",
    visual: <ParentNoteMockup />,
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
        </div>
        <div className="mt-16 space-y-24 sm:mt-24 sm:space-y-32">
          {chapters.map((chapter, index) => (
            <article key={chapter.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
              <div className={index % 2 ? "lg:order-2" : ""}>
                <p className="site-kicker">{chapter.kicker}</p>
                <h3 className="mt-4 text-[clamp(2.1rem,4.5vw,3.5rem)] font-semibold leading-[1.03] tracking-[-.04em] text-[var(--site-ink)]">{chapter.title}</h3>
                <p className="mt-6 max-w-[560px] text-[17px] leading-8 text-[var(--site-body)]">{chapter.body}</p>
                {index === 0 ? (
                  <Link href="/ders-paketleri/" className="mt-7 inline-flex items-center gap-2 text-[15px] font-semibold text-[var(--brand-olive)] hover:underline">
                    Paketleri gör <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
              <div className={`${index % 2 ? "lg:order-1" : ""} rounded-[26px] bg-[var(--brand-olive-tint)] p-3 sm:p-6`}>{chapter.visual}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
