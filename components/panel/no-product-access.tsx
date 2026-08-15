import Link from "next/link";
import type { UserRole } from "@prisma/client";

/**
 * AKTİF ÜRÜN YOK durumu.
 *
 * Kayıt olan kullanıcıya HİÇBİR ürün erişimi verilmez (bkz.
 * `app/api/auth/register/route.ts`); erişimi ödeme/onay sonrası admin açar.
 * Bu ekran o aradaki durumu dürüstçe anlatır: ne olduğunu, neden böyle
 * olduğunu ve sıradaki adımı söyler. Sahte bir "yükleniyor" ya da boş panel
 * göstermez.
 *
 * Sunum katmanıdır — asıl erişim kontrolü sunucu guard'larındadır.
 */
export function NoProductAccess({ role }: { role: UserRole }) {
  const isStaff = role === "ADMIN" || role === "TEACHER";

  return (
    <div className="max-w-[640px]">
      <h1 className="text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em] text-dc-ink">
        Hesabın hazır, ürün erişimin henüz açılmadı.
      </h1>
      <p className="mt-3 text-[15.5px] leading-[1.65] text-dc-ink-muted">
        {isStaff
          ? "Bu hesaba henüz bir çalışma alanı tanımlanmamış. Yönetim ekibi tanımı yaptığında ilgili bölümler burada açılır."
          : "Ders, koçluk ve deneme bölümleri paketin tanımlandıktan sonra bu panelde açılır. Paketini oluşturduğunda ya da ödemen tamamlandığında erişimin ekibimiz tarafından açılır."}
      </p>

      <div className="mt-6 rounded-[14px] border border-dc-line bg-white p-5">
        <h2 className="text-[15px] font-bold text-dc-ink">Sıradaki adım</h2>
        <ul className="mt-3 flex flex-col gap-2 text-[14.5px] leading-[1.6] text-dc-ink-muted">
          <li>Hangi ürünlere ihtiyacın olduğunu paket kurucudan seç.</li>
          <li>Ön görüşmede paketin ve başlangıç tarihin netleşir.</li>
          <li>Erişimin açıldığında bu sayfa kendiliğinden dolar.</li>
        </ul>

        {!isStaff ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/paketler/" className="site-btn site-btn-primary">
              Paketini Oluştur
            </Link>
            <Link
              href="/iletisim/"
              className="rounded-full border border-[#DDE4E0] bg-white px-5 py-2.5 text-[14px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
            >
              Bize ulaş
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
