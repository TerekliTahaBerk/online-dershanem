import Link from "next/link";

/**
 * PANEL 404.
 *
 * `/panel` altındaki `notFound()` çağrıları (yetkisiz rol, başka bir velinin
 * öğrencisi, kapalı feature flag) kök `app/not-found.tsx`'e düşüyordu: giriş
 * yapmış kullanıcıya pazarlama sayfasının 404'ü ve "Matematik Ders Paketi",
 * "Misyonumuz" gibi public bağlantılar gösteriliyor, panele dönüş yolu
 * verilmiyordu.
 *
 * Bilerek rol yönlendirmesi yapılmıyor: `/panel` zaten rolü çözüp doğru
 * panele gönderiyor, tek çıkış bağlantısı yeterli.
 *
 * BAŞLIK "Sayfa bulunamadı" OLMALI. Panel guard'ları yetkisiz erişimde bilerek
 * 403 değil `notFound()` kullanıyor: "erişiminiz yok" demek, sayfanın VAR
 * olduğunu sızdırır ve işletme bölümlerinin varlığını haritalamaya izin verir.
 * Metin bu yüzden yetki değil, yokluk anlatır (`tests/e2e/business-rbac.spec.ts`
 * bu davranışı kilitliyor).
 */
export default function PanelNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--dc-surface-muted)] px-5 py-16">
      <div className="w-full max-w-[440px] rounded-[14px] border border-dc-line bg-white p-8 text-center">
        <p aria-hidden="true" className="text-[13px] font-semibold text-dc-ink-faint">
          404
        </p>
        <h1 className="mt-2 text-[22px] font-extrabold tracking-[-0.02em] text-dc-ink">
          Sayfa bulunamadı
        </h1>
        <p className="mt-2.5 text-[14.5px] leading-[1.6] text-dc-ink-muted">
          Aradığınız sayfa taşınmış ya da kaldırılmış olabilir. Yanlışlık
          olduğunu düşünüyorsanız yöneticinize iletin.
        </p>
        <Link
          href="/panel"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-dc-brand-strong px-6 py-3 text-[15px] font-bold text-white transition-colors hover:bg-dc-brand-hover"
        >
          Panele dön
        </Link>
      </div>
    </main>
  );
}
