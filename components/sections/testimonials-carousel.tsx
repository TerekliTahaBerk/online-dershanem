const stories = [
  { university: "YKS hazırlık", quote: "Ders sonunda ne çalışacağımı bilmek haftayı daha düzenli götürmemi sağladı.", name: "Öğrenci deneyimi", result: "Küçük grup" },
  { university: "LGS hazırlık", quote: "Soru sorabildiğim ve çözümümü gösterebildiğim bir ders düzeni arıyordum.", name: "Öğrenci deneyimi", result: "Canlı ders" },
  { university: "Veli görüşü", quote: "Haftalık kısa notlar, süreci tahmin etmek yerine görmemize yardımcı oldu.", name: "Veli deneyimi", result: "Düzenli takip" },
  { university: "YKS hazırlık", quote: "Kalabalık sınıfta kaybolmadan kendi tempoma yakın bir grupla ilerledim.", name: "Öğrenci deneyimi", result: "En fazla 4 kişi" },
];

export function TestimonialsCarousel() {
  return (
    <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-6 [scrollbar-width:none] sm:mx-0 sm:px-0">
      {stories.map((story, index) => (
        <article key={index} className="min-w-[82vw] snap-start rounded-2xl border border-[var(--od-line)] bg-[var(--od-paper)] p-7 sm:min-w-[350px]">
          <div className="flex h-44 items-end rounded-[22px] bg-[linear-gradient(135deg,#f5e2d4,#f8f6f0)] p-5">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--od-olive)]">{story.university}</span>
          </div>
          <blockquote className="mt-6 min-h-[96px] text-[15px] leading-6 text-[var(--od-ink-soft)]">“{story.quote}”</blockquote>
          <div className="mt-5 border-t border-[var(--od-line)] pt-4">
            <div className="font-display text-lg">{story.name}</div>
            <div className="mt-1 text-xs text-[#99978f]">{story.result}</div>
          </div>
        </article>
      ))}
    </div>
  );
}
