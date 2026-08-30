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
export function ParentVisibility() {
  return (
    <section className="site-container py-[var(--dc-section-tight)]">
      <div className="max-w-[640px]">
        <h2 className="font-display text-[28px] leading-[1.12] tracking-[-0.025em] text-dc-ink sm:text-[36px]">
          Süreci takip et, öğrencinin alanını koru.
        </h2>
        <p className="mt-3.5 text-[16.5px] leading-[1.65] text-dc-ink-body">
          Veli görünümünde derse katılım, plan ilerlemesi ve gelişim özeti görünür.
          Öğrencinin ekranı birebir paylaşılmaz; veliye uygun takip bilgileri ayrı
          bir özet olarak sunulur.
        </p>
      </div>
    </section>
  );
}
