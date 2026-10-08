# Yasal sayfalar — yayın öncesi doğrulama

9 Ekim 2026. `/gizlilik`, `/kvkk`, `/iade` içerikleri ürün akışlarına göre hazırlanmış inceleme taslaklarıdır. Sayfalarda hazırlık durumu görünürdür. Hukuki inceleme ve aşağıdaki gerçek bilgiler tamamlanmadan bu ibare kaldırılmamalıdır.

- Veri sorumlusunun resmî adı/unvanı, fiziksel başvuru adresi ve varsa KEP bilgisi işletmeden alınmalı. Marka veya package.json yazarı veri sorumlusu kimliği olarak kullanılamaz.
- Öğrenci sözleşmenin tarafı olmadığında çocuk verilerinin işleme dayanağı ayrıca belirlenmeli; veli ilişkisi ve temsil doğrulaması incelenmeli.
- Başvuru, barındırma, ödeme, e-posta ve analitik sağlayıcıları, alt işleyenleri, ülkeleri ve KVKK 9 aktarım mekanizması doğrulanmalı. Kodda entegrasyon bulunması, standart sözleşme imzalandığına kanıt değildir.
- `components/analytics/posthog.tsx` anahtar mevcutsa analitiği başlatıyor; rıza kontrolü bulunmuyor. Zorunlu olmayan analitik için uygun tercih mekanizması ve aktarım şartları sağlanmadan metne “yalnızca onayınızla çalışır” yazılamaz. Bu görevde analitik davranışı değiştirilmedi.
- `lib/data-governance/retention-policy.ts` kategori süreleri hukuki onay bekliyor. Onaylı envanter ve saklama süreleri metne işlenmeli; tüm veriler için genel 10 yıl iddiası kaldırıldı.
- Canlı ders, koçluk ve deneme sözleşmeleri, ön bilgilendirme ve erken ifa onayları gerçek ödeme akışıyla karşılaştırılmalı. Online hizmetlerin tümü otomatik olarak cayma istisnası değildir.
- Cayma dışındaki koçluk/deneme iptal hesapları işletme tarafından doğrulanmalı. Yeni bir kesinti veya iade garantisi uydurulmadı. Yasal caymada 14 günlük iade süresi operasyonla eşleştirilmeli.
- Ders/görüşme kaydı varsa kayıt amacı, erişim, hukuki dayanak ve saklama süresi ayrıca aydınlatılmalı; doğrulanmadığı için kayıt yapıldığı veya yapılmadığı iddia edilmedi.

Resmî kaynaklar her sayfanın altında bağlantılıdır. Yerel taslak hazırlamak mevzuata tam uyum veya hukuki onay anlamına gelmez; metinler yayına alınmadı.
