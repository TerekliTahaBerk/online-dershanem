/**
 * Veli güven bölümü — somut, fake-SaaS olmayan; eğitim ve güven hissi öncelikli.
 * Veliye ne sunulduğunu net anlatır. Dekoratif pill/eyebrow ve ikon yok.
 */

const PARENT_FEATURES = [
  {
    title: "Anlaşılır gelişim özeti",
    text: "Çocuğunuzun matematikte nerede olduğunu, hangi konuda ilerlediğini sade bir dille görürsünüz.",
  },
  {
    title: "Eksik konu takibi",
    text: "Kapanan ve hâlâ çalışılması gereken kazanımlar listelenir; ilerleme somut olarak izlenir.",
  },
  {
    title: "Öğretmen geri bildirimi",
    text: "Dersi veren öğretmenden öğrencinin durumuna dair düzenli, yazılı yorum alırsınız.",
  },
  {
    title: "Düzenli bilgilendirme",
    text: "Deneme sonuçları ve haftalık ilerleme veliyle paylaşılır; süreçten kopmadan takip edersiniz.",
  },
];

export function HomeParentTrust() {
  return (
    <section className="bg-[var(--od-cream)] py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <header className="max-w-xl">
            <h2 className="font-display text-[30px] font-normal leading-[1.14] tracking-tight text-[var(--od-ink)] sm:text-[42px]">
              Çocuğunuzun gelişimini veriyle takip edin.
            </h2>
            <p className="mt-6 text-[15.5px] leading-[1.85] text-[var(--od-ink-soft)]">
              Matematikteki ilerlemeyi tahminle değil, somut verilerle görürsünüz.
              Hangi konunun kapandığını, hangisinin çalışılması gerektiğini ve
              öğretmenin değerlendirmesini tek akışta takip edersiniz.
            </p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            {PARENT_FEATURES.map(({ title, text }) => (
              <div
                key={title}
                className="flex flex-col gap-2 rounded-[20px] border border-[var(--od-line)] bg-white p-6"
              >
                <h3 className="font-display text-[18px] leading-tight text-[var(--od-ink)]">
                  {title}
                </h3>
                <p className="text-[13px] leading-relaxed text-[var(--od-ink-soft)]">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
