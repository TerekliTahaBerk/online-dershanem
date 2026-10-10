import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { OdStartCard } from "@/components/panel/od-start-card";
import type { OdCustomerStart } from "@/lib/od/onboarding-customer";

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
export function NoProductAccess({ role, start = null }: { role: UserRole; start?: OdCustomerStart | null }) {
  const isStaff = role === "ADMIN" || role === "TEACHER";
  if (!isStaff) return <div className="max-w-[640px]">
    <h1 className="mb-5 text-2xl font-bold text-dc-ink">Hoş geldiniz</h1>
    <OdStartCard start={start} />
    {!start && <Link href="/paketler" className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-dc-ink text-white hover:bg-black min-h-10 px-3.5 text-[13.5px]">Paketini Oluştur</Link>}
  </div>;

  return (
    <div className="max-w-[640px]">
      <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-dc-ink">
        {isStaff ? "Hesabınız hazır; çalışma alanınız henüz tanımlanmadı." : "Hesabın hazır! Az kaldı."}
      </h1>
      <p className="mt-3 text-[15.5px] leading-[1.65] text-dc-ink-muted">
        {isStaff
          ? "Bu hesaba henüz bir çalışma alanı tanımlanmamış. Yönetim ekibi tanımı yaptığında ilgili bölümler burada açılır."
          : "Paketin tanımlanınca derslerin, koçluğun ve denemelerin bu panelde açılacak. Paketini oluşturduğunda ya da ödemen tamamlandığında ekibimiz erişimini hemen açar."}
      </p>

      <div className="mt-6 rounded-[14px] border border-dc-line bg-white p-5">
        <h2 className="text-[15px] font-bold text-dc-ink">Sıradaki adım</h2>
        <ul className="mt-3 flex flex-col gap-2 text-[14.5px] leading-[1.6] text-dc-ink-muted">
          <li>Paket kurucudan sana uygun ürünleri seç.</li>
          <li>Kısa bir ön görüşmede paketini ve başlangıç tarihini birlikte netleştirelim.</li>
          <li>Erişimin açılınca bu sayfa kendiliğinden dolacak.</li>
        </ul>

        {!isStaff ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/paketler" className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-dc-ink text-white hover:bg-black min-h-10 px-3.5 text-[13.5px]">
              Paketini Oluştur
            </Link>
            <Link
              href="/iletisim"
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
