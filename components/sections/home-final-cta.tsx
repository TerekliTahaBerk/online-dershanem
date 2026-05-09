import Link from "next/link";

export function HomeFinalCTA() {
  return (
    <section className="border-t border-[#E5E5E0] bg-[#FAFAF7] px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-[#E5E5E0] bg-gradient-to-br from-[#F4F1E8] to-[#FAFAF7] p-10 text-center sm:p-16">
        <h2 className="font-display text-[32px] font-normal leading-[1.1] tracking-tight text-[#0E0E10] sm:text-[44px]">
          Hazırlığın <em className="italic text-[#3A4A2C]">bugün</em> başlasın.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-[#5A5A5F]">
          İlk haftası deneme — kart bilgisi istemiyoruz. Memnun kalmazsan tek
          tıkla iptal edebilirsin.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/kayit"
            className="inline-flex items-center justify-center rounded-full bg-[#0E0E10] px-7 py-3.5 text-[14.5px] font-medium text-white shadow-[0_10px_30px_-12px_rgba(14,14,16,0.45)] transition hover:bg-[#1F1F23]"
          >
            Ücretsiz dene
          </Link>
          <Link
            href="/seni-arayalim/"
            className="inline-flex items-center justify-center rounded-full border border-[#0E0E10]/15 bg-white px-7 py-3.5 text-[14.5px] font-medium text-[#0E0E10] transition hover:border-[#0E0E10]/35"
          >
            Bizi ara
          </Link>
        </div>
      </div>
    </section>
  );
}
