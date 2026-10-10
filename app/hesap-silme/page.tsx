import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Hesap Silme Talebi",
  description: "Online Dershanem hesabınız ve kişisel verileriniz için silme talebi bilgileri.",
  canonical: "/hesap-silme",
  imageAlt: "Online Dershanem hesap silme",
});

export default function AccountDeletionPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-16">
      <h1 className="text-3xl font-semibold">Online Dershanem — Hesap silme talebi</h1>
      <p>Online Dershanem, Yön Koçluk ve Deneme Ligi hesabınızla ilişkili kişisel verilerin silinmesini talep edebilirsiniz.</p>
      <ol className="list-decimal space-y-3 pl-6">
        <li>Hesabınıza kayıtlı e-posta adresinizden <a className="underline" href="mailto:iletisim@onlinedershanem.com?subject=Hesap%20silme%20talebi">iletisim@onlinedershanem.com</a> adresine “Hesap silme talebi” konusuyla yazın.</li>
        <li>Parolanızı, doğrulama kodunuzu veya öğrencinin özel eğitim belgelerini e-postaya eklemeyin. Kimlik ve varsa veli yetkisi ayrıca doğrulanır.</li>
        <li>Silme kapsamı, saklanması gereken kayıtlar ve tamamlanma süresi destek ekibince değerlendirilip bildirilmelidir.</li>
      </ol>
      <p>E-posta göndermek hesabı hemen kapatmaz veya silmez. Hesabı devre dışı bırakmak da verilerin silindiği anlamına gelmez. Eğitim ve mali kayıtlardaki saklama yükümlülükleri ayrıca değerlendirilir.</p>
      <p>Bu başvuru bilgileri inceleme aşamasındadır. Kesin saklama süreleri ve tam silme süreci henüz doğrulanmamıştır.</p>
      <a className="underline" href="/gizlilik">Gizlilik açıklaması</a>
    </main>
  );
}
