# Student 360 / Öğrenci Detay Merkezi

Bu not, paneldeki **Öğrenci 360** ekranının mimarisini, erişim sınırlarını ve
risk modelini özetler. Amaç: admin, öğretmen veya koç bir öğrenci profilini
açtığında akademik durum, risk, plan, iletişim ve (yetkiliyse) paket bilgisini
başka ekranlara dağılmadan okuyabilsin.

## Rotalar

| Rol | Path | Liste dönüşü |
| --- | --- | --- |
| ADMIN | `/panel/yonetim/ogrenciler/[id]?sekme=` | `/panel/yonetim/ogrenciler` |
| TEACHER (grup veya koç) | `/panel/ogretmen/ogrenci/[id]?sekme=` | `/panel/ogretmen/gruplar` |
| PARENT / STUDENT | — | `notFound()` |

Sekmeler `?sekme=` ile seçilir. Geçersiz veya yetkisiz sekme güvenli varsayılana
(`genel`) düşer.

## Katmanlar

```
page.tsx
  └─ loadStudent360Bundle()          lib/panel/student-360-server.ts
       ├─ resolveStudent360Access()  yatay erişim + commerce flag
       ├─ visibleStudent360Tabs()    saf: flag + permission
       ├─ sekme bazlı Prisma / servis sorguları
       └─ deriveStudent360RiskSignals() + summarizeStudent360Risk()
  └─ Student360View                  components/panel/student-360-view.tsx
```

Saf kurallar (DB yok): `lib/panel/student-360.ts`  
Sunucu agregasyonu: `lib/panel/student-360-server.ts`  
UI: `components/panel/student-360-view.tsx`

Mevcut reusable servisler yeniden kullanılır:

- `getStudentCoaching` / `findCoachAssignmentForCoach`
- `getStudentGoals`
- `listStudentExams` (ODK, yalnız overview)
- feature flag’li müdahale / check-in / digest / review / recovery sorguları

## Üst özet (her istekte)

Kim → durum → sorun → aksiyon sırası:

1. Ad, sınıf / hedef, ürünler (OD/OK/ODK), grup, öğretmen/koç
2. Paket özeti (öğretmende yalnız ürün etiketleri; tutar/sipariş yok)
3. Son giriş (`User.lastLoginAt`)
4. Risk seviyesi + “Bu öğrenci neden riskli?” açıklamaları
5. Role göre aksiyon linkleri

## Sekmeler ve lazy yükleme

`loadStudent360Bundle` aktif sekmeye göre sorgu başlatır (İşletme paneli
`needsX` kalıbı). Risk özeti header için her zaman hesaplanır; ağır listeler
(geçmiş dersler, ödev geçmişi, deneme detayı, siparişler) yalnız ilgili sekmede
çekilir.

| Sekme | Flag / permission |
| --- | --- |
| Genel bakış | her zaman |
| Akademik | her zaman |
| Dersler | her zaman |
| Koçluk | `adaptivePlan` |
| Denemeler | `mockExamAnalysis` |
| Risk & müdahale | `interventionInbox` |
| Veli & iletişim | her zaman (digest: `parentWeeklyDigest`) |
| Paket & ticari | yalnız `canViewCommerce` (ADMIN) |

## Erişim kontrolü

### Dikey

- `requireRole("ADMIN" | "TEACHER")` sayfa girişinde
- Veli / öğrenci `resolveStudent360Access` içinde reddedilir → 404

### Yatay (öğretmen)

1. Aktif `Enrollment` + aktif `Group.teacherId = viewer` → `teacher_group`
2. veya aktif `CoachAssignment` → `coach`
3. aksi → 404 (403 değil)

Öğretmen deneme bölümleri kendi ders alanıyla (`subjects`) sınırlanır.
Öğretmen ders notları yalnız kendi derslerindeki notlardır.

### Ticari izolasyon

- `canViewStudent360Commerce(role)` → yalnız ADMIN
- `odOrders` select’i öğretmen isteklerinde Prisma’ya hiç gitmez
- Paket sekmesi ve “Hesap / paket işlemleri” aksiyonu öğretmende üretilmez

Menü gizleme güvenlik sınırı değildir; karar sunucu loader’dadır.

## Risk modeli (açıklanabilir)

Kara kutu skor yoktur. Her sinyalin `reason` alanı “Bu öğrenci neden riskli?”
sorusuna düz Türkçe cevap verir.

Örnek kurallar (`deriveStudent360RiskSignals`):

| Kod | Örnek reason | Puan |
| --- | --- | --- |
| ABSENCE | Son 14 günde 2 ders kaçırdı | 25 |
| OVERDUE_ASSIGNMENT | 3 ödev gecikmiş | 10×adet (max 30) |
| PLAN_UNDERPERFORMING | Haftalık plan %42 tamamlandı | 20 |
| EXAM_DROP | Son denemede net düştü | 20 |
| HELP_REQUEST | Açık yardım talebi | 15 |
| INACTIVE_LOGIN | 14+ gündür giriş yok | 15–25 |
| REVIEW_QUEUE_GROWTH | Tekrar kuyruğu şişti | 15 |
| PROVISIONING_* / GROUP_* / … | Operasyon eksikleri | 10–30 |

`summarizeStudent360Risk`:

- `high`: ≥50 puan veya ağır yüksek sinyal
- `medium`: ≥25 veya orta/yüksek sinyal
- `low`: puan > 0
- `none`: sinyal yok

Operasyon eksikleri (`deriveStudent360Issues`) aynı risk listesine eklenir;
ticari provisioning sinyali yalnız commerce gören izleyicide puanlanır.

## UX ilkeleri

- Bilgi yoğun ama sakin; 10 metrik kartı yığını yok
- Bir composition: özet şeridi → risk cümlesi → aksiyonlar → sekme içeriği
- Mevcut panel primitive’leri (`PanelCard`, `PanelHeading`, `PanelFilterLink`,
  `PanelAttentionCard`)

## Testler

`lib/student-360-ops.test.ts`:

- admin / öğretmen sekme ve aksiyon görünürlüğü
- permission isolation (ticari link yok)
- feature flag kombinasyonları
- paket yok / deneme yok → risk yok
- riskli öğrenci → açıklanabilir reason’lar
- paket durumu (none / active / expiring / provisioning_blocked)

Yatay erişim ve veli reddi sunucu tarafında `notFound()` sözleşmesidir; birim
testleri saf permission fonksiyonlarını kapsar.

## Bilinçli sınırlar

- Müdahale “oluştur” aksiyonu ilgili inbox sayfasına yönlendirir; inline create
  formu bu part’ta yok
- Öğretmen grup yönetimi admin eğitim ekranındadır
- ODK deneme listesi overview’da başlık olarak görünür; tam ODK sonuç akışı
  ayrı ODK ağacında kalır
- `privateNote` koçluk servisinden hâlâ seçilmez
