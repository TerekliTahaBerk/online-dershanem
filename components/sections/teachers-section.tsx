import Image from "next/image";

type Teacher = {
  name: string;
  title: string;
  bio: string;
  /** /public altında görsel yolu; yoksa baş harf rozeti gösterilir. */
  image?: string;
};

// ⚠️ Gerçek öğretmen verisi eklenene kadar BOŞ bırakılır. Buraya YALNIZCA
// gerçek, izinli öğretmen bilgisi girilir — sahte isim/üniversite/derece/fotoğraf
// EKLENMEZ. Dizi doldurulduğunda bölüm otomatik olarak profil kartlarına geçer.
const teachers: Teacher[] = [];

// Veri yokken gösterilen dürüst, iddiasız ekip ilkeleri (kişi iddiası içermez).
const teamPrinciples = [
  {
    title: "Yalnızca matematik",
    body: "Ekibimizdeki her öğretmen tek branşa odaklanır: matematik. Tüm hazırlık tek derse kurulur.",
  },
  {
    title: "Sınav müfredatına hâkim",
    body: "LGS, TYT ve AYT matematik konuları ve güncel soru tipleriyle düzenli çalışan öğretmenlerle dersler planlanır.",
  },
  {
    title: "Adıyla tanıyan takip",
    body: "En fazla 4 kişilik grupta öğretmen her öğrencinin çözüm tarzını ve takıldığı noktaları yakından izler.",
  },
];

export function TeachersSection() {
  return (
    <section className="border-b border-[var(--od-line)] bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="max-w-3xl">
          <h2 className="text-[34px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
            Öğretmenlerimiz.
          </h2>
          <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
            Dersler, yalnızca matematiğe odaklanan eğitmen ekibimizle yürütülür.
            Öğretmen–grup eşleşmesi öğrencinin seviyesine ve hedefine göre
            yapılır.
          </p>
        </div>

        {teachers.length > 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((t) => (
              <article
                key={t.name}
                className="rounded-[22px] border border-[var(--od-line)] bg-[var(--od-cream)] p-6"
              >
                <div className="flex items-center gap-4">
                  {t.image ? (
                    <Image
                      src={t.image}
                      alt={t.name}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--od-olive)]/10 text-[18px] font-extrabold text-[var(--od-olive)]"
                    >
                      {t.name.charAt(0)}
                    </span>
                  )}
                  <div>
                    <h3 className="text-[17px] font-extrabold text-[var(--od-ink)]">{t.name}</h3>
                    <p className="text-[13px] text-[var(--od-ink-soft)]">{t.title}</p>
                  </div>
                </div>
                <p className="mt-4 text-[14px] leading-7 text-[var(--od-ink-soft)]">{t.bio}</p>
              </article>
            ))}
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {teamPrinciples.map((p) => (
                <div
                  key={p.title}
                  className="rounded-[22px] border border-[var(--od-line)] bg-[var(--od-cream)] p-6"
                >
                  <h3 className="text-[16px] font-extrabold text-[var(--od-ink)]">{p.title}</h3>
                  <p className="mt-2 text-[14px] leading-7 text-[var(--od-ink-soft)]">{p.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[13px] leading-6 text-[var(--od-ink-soft)]">
              Öğrencinizin dersini yürütecek öğretmenle ilgili detayları ön
              görüşmede paylaşırız.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
