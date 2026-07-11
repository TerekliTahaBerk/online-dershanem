import {
  BookOpenCheck,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  MessageSquareText,
  Video,
} from "lucide-react";

const features = [
  {
    icon: Video,
    kicker: "01 · Canlı ders",
    title: "Sadece izlemek yok; derse katılım var.",
    body: "Öğrenci sorusunu sorar, çözümünü gösterir ve öğretmenden doğrudan geri bildirim alır.",
    className: "lg:col-span-2 bg-[#26341f] text-white",
    iconClass: "bg-white/10 text-[#f4d86a]",
  },
  {
    icon: CalendarDays,
    kicker: "02 · Küçük grup",
    title: "Benzer hedef, doğru tempo.",
    body: "LGS ve YKS öğrencileri seviyelerine göre en fazla 4 kişilik gruplarda ilerler.",
    className: "bg-[#f4d86a] text-[#26341f]",
    iconClass: "bg-white/45 text-[#26341f]",
  },
  {
    icon: ClipboardCheck,
    kicker: "03 · Ders sonrası plan",
    title: "Masaya oturduğunda nereden başlayacağını bilir.",
    body: "İşlenen konu, tekrar yönü ve ödev her ders sonrasında açık biçimde netleşir.",
    className: "bg-[var(--brand-orange-tint)] text-[var(--site-ink)]",
    iconClass: "bg-white text-[var(--brand-orange-ink)]",
  },
  {
    icon: BookOpenCheck,
    kicker: "04 · Ödev ve tekrar",
    title: "Dersler birbirine bağlanır.",
    body: "Bir sonraki derse kadar yapılacak çalışma, gelişigüzel değil öğrencinin eksiğine göre belirlenir.",
    className: "bg-white text-[var(--site-ink)]",
    iconClass: "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]",
  },
  {
    icon: MessageSquareText,
    kicker: "05 · Öğretmen notu",
    title: "Veli süreci sade biçimde görür.",
    body: "Ne işlendi, nerede zorlanıldı ve sıradaki hedef ne? Süreç kısa, anlaşılır notlarla takip edilir.",
    className: "lg:col-span-2 bg-[#eef1e8] text-[var(--site-ink)]",
    iconClass: "bg-white text-[var(--brand-orange-ink)]",
  },
  {
    icon: ChartNoAxesCombined,
    kicker: "06 · Düzenli gelişim",
    title: "Amaç yalnızca konu bitirmek değil.",
    body: "Ders, ödev ve tekrar aynı çalışma düzeninin parçası olur; öğrencinin matematik rutini güçlenir.",
    className: "bg-white text-[var(--site-ink)]",
    iconClass: "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]",
  },
];

export function ValueProps() {
  return (
    <section id="nasil-calisir" className="scroll-mt-24 bg-white">
      <div className="site-container py-20 sm:py-28">
        <div className="grid items-end gap-7 lg:grid-cols-[1fr_.7fr]">
          <div>
            <p className="site-eyebrow">Online Dershanem sistemi</p>
            <h2 className="mt-4 max-w-4xl font-display text-[clamp(2.9rem,6vw,5.8rem)] leading-[.94] text-[var(--site-ink)]">
              Tek ders değil, çalışan bir <span className="site-hl">matematik düzeni.</span>
            </h2>
          </div>
          <p className="max-w-xl text-[16px] leading-7 text-[var(--site-body)] sm:text-[18px]">
            Canlı dersten öğretmen notuna kadar bütün parçalar aynı amaca hizmet eder: öğrencinin eksiğini görmesi ve bir sonraki adımını bilmesi.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, kicker, title, body, className, iconClass }) => (
            <article
              key={title}
              className={`min-h-[290px] rounded-[30px] border border-[var(--site-line)] p-7 sm:p-8 ${className}`}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-[11px] font-extrabold uppercase tracking-[.12em]">{kicker}</span>
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}>
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
              </div>
              <h3 className="mt-10 max-w-xl font-display text-[clamp(1.9rem,3vw,3rem)] leading-[1.02]">{title}</h3>
              <p className="mt-5 max-w-xl text-[14.5px] leading-6 opacity-75 sm:text-[15.5px] sm:leading-7">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
