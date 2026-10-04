/**
 * 11 VELİ GÖRÜNÜRLÜĞÜ — onaylı tasarım (Web.dc.html).
 *
 * BİLİNÇLİ SAPMA (§54/§55): tasarımdaki 12. bölüm (öğrenci/veli yorumları)
 * üretim metni değil, geliştiriciye yazılmış bir handoff notudur
 * ("Bu bölüm ... yayına alınacak", "Yerleşim: bir uzun alıntı..."). Handoff'un
 * bölüm haritası da "kanıt/yorum: veri yoksa kaldır" diyor. Doğrulanmış ve
 * izinli yorum bulunmadığı için o kolon YAYINA ALINMADI; uydurma yorum da
 * eklenmedi. Yorumlar geldiğinde bu bölüm iki kolona döner.
 */
const sampleRows = [
  { label: "Derse katılım", value: "Bu haftaki iki canlı derse katıldı" },
  { label: "Plan", value: "Haftalık planın büyük kısmı tamamlandı" },
  { label: "Zorlandığı konu", value: "Oran-orantı problemlerinde kurulum" },
  { label: "Sıradaki adım", value: "Koç görüşmesinde tekrar planı" },
];

export function ParentVisibility() {
  return (
    <section className="site-container py-(--dc-section-tight)">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_440px] lg:gap-16">
        <div className="max-w-[560px]">
          <h2 className="font-display text-[28px] leading-[1.12] tracking-tight text-dc-ink sm:text-[36px]">
            Süreci takip et, öğrencinin alanını koru.
          </h2>
          <p className="mt-3.5 text-[16.5px] leading-[1.65] text-dc-ink-body">
            Veli görünümünde derse katılım, plan ilerlemesi ve gelişim özeti
            görünür. Öğrencinin ekranı birebir paylaşılmaz; veliye uygun takip
            bilgileri ayrı bir özet olarak sunulur.
          </p>
        </div>

        <figure className="rounded-dc-card border border-dc-line bg-white p-5 shadow-dc-raised sm:p-6">
          <figcaption className="flex items-center justify-between gap-3 border-b border-dc-line pb-4">
            <span className="text-[15px] font-bold text-dc-ink">
              Haftalık veli özeti
            </span>
            <span className="rounded-full bg-dc-surface-muted px-2.5 py-1 text-xs font-semibold text-dc-ink-muted">
              Örnek görünüm
            </span>
          </figcaption>
          <dl className="divide-y divide-dc-line-soft">
            {sampleRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 py-3.5 sm:grid-cols-[140px_1fr] sm:gap-4"
              >
                <dt className="text-[13.5px] font-semibold text-dc-ink-muted">
                  {row.label}
                </dt>
                <dd className="text-[15px] leading-normal text-dc-ink">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </figure>
      </div>
    </section>
  );
}
