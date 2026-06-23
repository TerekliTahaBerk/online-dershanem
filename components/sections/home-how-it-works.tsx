import Link from "next/link";

/**
 * Nasıl işler — 4 adım. Kritik mesaj: kullanıcı register/login ile uğraşmaz;
 * ödeme sonrası öğrenci hesabını ekip hazırlar. Guest checkout akışıyla uyumlu.
 * Sade editorial numaralandırma; dekoratif pill/eyebrow ve ikon yok.
 */

const STEPS = [
  {
    n: "01",
    title: "Paketini seç",
    text: "Deneme Kulübü, Ders Paketi veya en avantajlısı Tam Destek — öğrenciye uygun olanı seç.",
  },
  {
    n: "02",
    title: "Öğrenci bilgilerini bırak",
    text: "Kısa bir formda öğrenci ve veli bilgilerini ilet. Hesap açmana, kayıt olmana gerek yok.",
  },
  {
    n: "03",
    title: "Ödemeyi tamamla",
    text: "Güvenli ödeme ekranında işlemi tamamla. Tüm süreç birkaç dakika sürer.",
  },
  {
    n: "04",
    title: "Ekip hesabını hazırlar",
    text: "Öğrenci hesabını ekibimiz oluşturur ve giriş bilgilerini seninle paylaşır.",
  },
];

export function HomeHowItWorks() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[30px] font-normal leading-[1.14] tracking-tight text-[var(--od-ink)] sm:text-[42px]">
            Dört adımda başla, gerisini biz kuralım.
          </h2>
          <p className="mt-5 text-[15.5px] leading-[1.85] text-[var(--od-ink-soft)]">
            Karmaşık üyelik adımları yok. Ödeme sonrası öğrenci hesabını ekibimiz
            hazırlar; sen sadece başlamayı seç.
          </p>
        </header>

        <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ n, title, text }) => (
            <li
              key={n}
              className="flex flex-col gap-3 rounded-[20px] border border-[var(--od-line)] bg-[var(--od-cream)] p-7"
            >
              <span className="font-display text-[28px] leading-none text-[var(--od-olive)]">
                {n}
              </span>
              <h3 className="font-display text-[19px] leading-tight text-[var(--od-ink)]">
                {title}
              </h3>
              <p className="text-[13.5px] leading-relaxed text-[var(--od-ink-soft)]">
                {text}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex justify-center">
          <Link
            href="/paketler/"
            className="inline-flex items-center justify-center rounded-full bg-[var(--od-ink)] px-7 py-3.5 text-[14.5px] font-medium text-white transition hover:bg-[#2A2A22]"
          >
            Matematik Paketlerini İncele
          </Link>
        </div>
      </div>
    </section>
  );
}
