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
          Veliler neyi takip edebilir?
        </h2>
        <p className="mt-3.5 text-[16.5px] leading-[1.65] text-dc-ink-body">
          Derse katılım, ders sonrası öğretmen notu, haftalık planın ne kadarının
          yapıldığı ve deneme sonuçları. Veli özeti, öğrencinin ekranıyla aynı veriyi
          gösterir.
        </p>
      </div>
    </section>
  );
}
