import Image from "next/image";
import Link from "next/link";
import { Users, LineChart, FileText, Map } from "lucide-react";

/**
 * Ana sayfa hero — büyük merkezi başlık + iki CTA + çevresinde organik
 * matematik bilgi kartları. Mesaj net: bu bir online MATEMATİK dershanesi.
 *
 * Görseller mevcut marka varlıklarından (doodle backdrop) gelir; ek stok
 * görsel eklenmez.
 */

const INFO_CARDS = [
  {
    Icon: Users,
    title: "Maks. 4 kişilik grup",
    text: "Öğrenci derste görünür; soru sorar, çözüme katılır.",
    bg: "var(--od-sky-soft)",
    pos: "sm:-rotate-2",
  },
  {
    Icon: LineChart,
    title: "Ders + deneme takibi",
    text: "Canlı matematik dersi ve düzenli denemeler tek sistemde.",
    bg: "#EAF1E8",
    pos: "sm:rotate-1",
  },
  {
    Icon: FileText,
    title: "Veliye gelişim özeti",
    text: "Çocuğunuzun matematikte nerede olduğunu net görürsünüz.",
    bg: "var(--od-yellow-soft)",
    pos: "sm:-rotate-1",
  },
  {
    Icon: Map,
    title: "Eksik konu haritası",
    text: "Matematikte tam olarak nerede takıldığını görüyoruz.",
    bg: "var(--od-blush)",
    pos: "sm:rotate-2",
  },
];

export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden bg-[var(--od-cream)]">
      {/* Soft pastel backdrop — doodle + gradient */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 60% at 70% 20%, var(--od-sky-soft) 0%, var(--od-cream) 65%)",
          }}
        />
        <Image
          src="/v991-nt-35.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.10] mix-blend-multiply"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(250,250,247,0.4) 0%, rgba(250,250,247,0.85) 70%, var(--od-cream) 100%)",
          }}
        />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-5 pt-20 pb-20 sm:pt-28 sm:pb-24">
        <div className="flex max-w-3xl flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--od-line)] bg-white/70 px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--od-olive)] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--od-olive)]" />
            Online matematik dershanesi
          </span>

          <h1 className="mt-6 font-display text-[38px] font-normal leading-[1.08] tracking-[0.005em] text-[var(--od-ink)] xs:text-[44px] sm:text-[64px]">
            Matematikte nerede
            <br />
            takıldığını{" "}
            <em className="italic text-[var(--od-olive)]">görüyoruz.</em>
          </h1>

          <p className="mt-7 max-w-xl text-[16px] leading-[1.8] text-[var(--od-ink-soft)] sm:text-[17.5px]">
            Çocuğunuzun matematikteki eksiklerini{" "}
            <strong className="font-medium text-[var(--od-ink)]">butik canlı dersler</strong>,
            düzenli denemeler ve veliye açık gelişim takibiyle kapatıyoruz.
            Ders ve denemeyle birlikte, aynı hafta geri dönüyoruz.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/paketler/"
              className="inline-flex items-center justify-center rounded-full bg-[var(--od-ink)] px-7 py-3.5 text-[14.5px] font-medium tracking-[0.01em] text-white shadow-[0_10px_30px_-12px_rgba(20,20,15,0.45)] transition hover:bg-[#2A2A22]"
            >
              Matematik Paketlerini İncele
            </Link>
            <Link
              href="/iletisim/"
              className="inline-flex items-center justify-center rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3.5 text-[14.5px] font-medium text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/35"
            >
              Bize Ulaşın
            </Link>
          </div>
        </div>

        {/* Organik matematik bilgi kartları — mobilde stack, masaüstünde dağınık his */}
        <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INFO_CARDS.map(({ Icon, title, text, bg, pos }) => (
            <div
              key={title}
              className={`flex flex-col gap-3 rounded-[24px] border border-[var(--od-line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(20,20,15,0.25)] backdrop-blur transition hover:-translate-y-1 ${pos}`}
            >
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{ background: bg }}
              >
                <Icon size={18} strokeWidth={1.8} className="text-[var(--od-olive)]" />
              </span>
              <h3 className="font-display text-[17px] leading-tight text-[var(--od-ink)]">
                {title}
              </h3>
              <p className="text-[13px] leading-snug text-[var(--od-ink-soft)]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
