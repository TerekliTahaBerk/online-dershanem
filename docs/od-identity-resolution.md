# OD ödeme sonrası kimlik çözümleme politikası

Bu politika `lib/od/provisioning.ts` tarafından uygulanır. Otomasyon yalnız kesin sinyallerle hesap bağlar; benzer ad veya yalnız öğrenci telefonu otomatik merge sebebi değildir.

## Öğrenci

| Sinyal | Karar |
| --- | --- |
| Normalize edilmiş e-posta aktif `STUDENT` hesabına ait | Mevcut öğrenci kullanılır. |
| TC kimlik, daha önce hesaba bağlanmış tek bir OD siparişindeki aktif `STUDENT` hesabını gösteriyor | Mevcut öğrenci kullanılır. |
| E-posta ve TC kimlik farklı öğrenci hesaplarını gösteriyor | `MANUAL_REVIEW`; otomatik merge yapılmaz. |
| E-posta öğrenci dışı role veya askıya alınmış hesaba ait | `MANUAL_REVIEW`. |
| TC kimlik birden fazla hesaba bağlanmış | `MANUAL_REVIEW`. |
| Güvenli mevcut hesap sinyali yok ve e-posta kullanılabilir | Yeni `STUDENT` ve `StudentProfile` idempotent oluşturulur. |
| Admin manuel inceleme sonrasında açıkça bir öğrenci seçmiş | Seçilen aktif `STUDENT`, otomatik sinyallerin yerine yetkili çözüm olarak kullanılır. |

## Veli

| Sinyal | Karar |
| --- | --- |
| Öğrencinin mevcut veli bağlantısı var | Mevcut bağlantı korunur ve tekrar üretilmez. |
| Normalize edilmiş e-posta aktif `PARENT` hesabına ait | Mevcut veli kullanılır. |
| Normalize edilmiş telefon tek bir aktif `PARENT` hesabına ait | Mevcut veli kullanılır. |
| E-posta ve telefon farklı veli hesaplarını gösteriyor | `MANUAL_REVIEW`. |
| Telefon birden fazla veli hesabına ait | `MANUAL_REVIEW`. |
| Mevcut veli yok, geçerli veli e-postası var | Yeni `PARENT` oluşturulur ve öğrenciye bağlanır. |
| Veli bilgisi var fakat yeni hesap için e-posta yok | `MANUAL_REVIEW`; sentetik e-posta üretilmez. |
| Veli bilgisi hiç yok | Öğrenci hesabı ve erişimi hazırlanır; onboarding `ACCOUNT_READY` olur. |

## İdempotency, retry ve audit

- Sipariş provisioning claim'i `PENDING/RETRY_PENDING/MANUAL_REVIEW → RUNNING` atomik geçişiyle alınır; beş dakikadan eski `RUNNING` claim yeniden alınabilir.
- Kullanıcı e-postası, öğrenci profili, `(userId, product)` üyeliği ve `(parentId, studentId)` bağlantısı unique/upsert kurallarıyla çoğaltılmaz.
- OD üyeliği `source=PURCHASE` ve `sourceOdOrderId=<sipariş>` taşır.
- Ödeme transaction'ı provisioning'den önce tamamlanır. Geçici hata siparişi `PAID`, provisioning'i `RETRY_PENDING` bırakır; PayTR tekrar çağrısı eksik işi tamamlar.
- Deterministik kimlik/veri çakışmaları `MANUAL_REVIEW` ile `200 OK` döner; callback retry fırtınası oluşturmaz.
- Üyelik, veli bağlantısı, başarı, retry ve manuel inceleme sonuçları `AuditLog` kayıtlarıyla izlenir.
