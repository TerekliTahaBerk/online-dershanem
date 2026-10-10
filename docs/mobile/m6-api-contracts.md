# M6 API sözleşmeleri — Veli (PARENT)

Paylaşılan sözleşme: `lib/mobile-contracts/parent.ts` (`@contracts/parent`). Bağımlılıksız doğrulayıcılar; `v.object` yalnız şemadaki alanları geçirir. Sunucu projeksiyonları: `lib/mobile/parent-views.ts`.

## Ortak kurallar (her akademik uç)

| Adım | Kural | Hata |
| --- | --- | --- |
| 1 | Kimlik + parola / MFA kapıları (`requireApiAccountRole("PARENT")`) | 401 / 403 / 428 |
| 2 | Rol yalnız PARENT | 403 `FORBIDDEN` |
| 3 | `studentId` zorunlu, 1–191 karakter. **Değer `StudentProfile.id`** | 400 `VALIDATION` |
| 4 | Çocuk `listParentVisibleChildren(parentId, "academic")` içinde aranır (aktif + bitmemiş + `canViewAcademic` + veliye görünür ürün) | 404 `CHILD_NOT_FOUND` |
| 5 | Çocuğun KENDİ ürünü (velinin toplamı değil) | `available: false` |
| 6 | Özellik bayrağı | 404 `FEATURE_DISABLED` |
| 7 | Kaynak kuralları (yayın, görünürlük, hak) | kaynağa göre |
| 8 | Yalnız izin listeli alanlar; tarihler ISO; `Cache-Control: private, no-store` | — |

- `CHILD_NOT_FOUND`: başka ailenin çocuğu, var olmayan kimlik, bitmiş bağlantı, akademik izni kapalı bağlantı ve yalnız KPSS çocuğu **ayırt edilmez**. İlk çocuğa sessizce düşülmez.
- Yeni hata kodu `CHILD_NOT_FOUND` `lib/mobile-contracts/api.ts` kataloğuna eklendi. Mobil karşılığı `not_found`; veli bağlamı bu kodla yetki düşmesini algılar.

## Uçlar

| Uç | Kaynak (web ile ortak) | Notlar |
| --- | --- | --- |
| `GET /api/panel/parent/children` | `listParentVisibleChildren(…, "academic")`; bootstrap `workspace.parent.children` ile aynı kaynak | `{ studentId, name, products[] }`. KPSS kodu ve profil alanı yok |
| `GET /api/panel/parent/home?studentId=` | `loadParentCalmHome` | Durum cümlesi, eylemler, haftalık / akademik / koçluk / özet. Hedefler `navId` (web yolu değil) |
| `GET /api/panel/parent/lessons?studentId=` | `loadParentLessons` (yeni, web Dersler kullanır) | Yalnız ortak ders notunun **konusu** (`studentId: null`). Yoklama `{key,label,tone}` sunucuda. Çocukta OD yoksa `available:false` |
| `GET /api/panel/parent/assignments?studentId=` | `loadParentAssignments` (yeni, web Ödevler kullanır) | Yalnız GET (POST → 405). `deriveAssignmentDisplayStatus` + kanonik etiket. Grup `active / late / done` |
| `GET /api/panel/parent/teachers?studentId=` | `listParentVisibleTeachers` | `{ id (atama), subject, name, bio }`. E-posta / telefon yok; ad yoksa "Öğretmen" |
| `GET /api/panel/parent/insights?studentId=` | `loadStudentProgressInsight({ audience: "parent_calm" })` | `state: READY / PREPARING`. Deneme eğilimi yalnız çocuğun OD / ODK'si varsa. Bayrak `progressInsights` |
| `GET /api/panel/parent/coaching?studentId=` | `loadParentCoaching` + `loadParentCoachingSessions` (yeni, web Koçluk kullanır) | Plan `APPROVED` + `productRef = OK`; özet `PUBLISHED`; not `PARENT_VISIBLE`. Görüşmeler salt okunur, `meetingUrl` yok |
| `GET /api/panel/parent/digests?studentId=` | `loadParentDigest` (yeni, web Haftalık kullanır) | Yalnız `PUBLISHED`; `upcoming` ayrı alan (otomatik). `feedbackAvailable` = velinin OD erişimi. Bayrak `parentWeeklyDigest` |
| `GET /api/panel/parent/external-exams?studentId=` | `MockExam` (web Denemeler ile aynı kural) | DIŞ denemeler, Deneme Ligi değil. Çocukta OD / ODK. Bayrak `mockExamAnalysis` |
| `GET /api/odk/parent/report?studentId=` | `getOdkAudienceStudentReport({ role: "PARENT" })` | Velinin ODK erişimi (web ile aynı) + çocukta ODK. **Öğrenci `User.id` sunucuda çözülür**; istemciden kabul edilmez. Rapor yoksa `available:false` |
| `GET /api/panel/parent/account` | `listParentVisibleChildren(…, "account")` + `"academic"` | `account` amacı. Akademik veri yok; `academicAccess` yalnız bilgi. Sipariş / tutar / ödeme yok (MD-09) |

### Mevcut mutasyon (değişmedi)

`POST /api/panel/weekly-digests/[id]/feedback` — `{ helpful: boolean|null, anxietyPulse: 1–5|null }`, en az biri dolu.

- Kapı `requireApiOdRole("STUDENT","PARENT")`, yani **velinin kendi OD erişimi** gerekir.
- Özet `PUBLISHED` olmalı ve veli aktif + `canViewAcademic` bağlantıyla bağlı olmalı (aksi 404).
- Mobil formu yalnız `feedbackAvailable` doğruysa gösterir.
- Yetki **genişletilmedi**. Yalnız OK veya yalnız ODK çocuğu olan veli, mobilde ve web'de 404 alır (bkz. m6-parent-scope-security §5).

## DTO alan özeti

Tam tipler `lib/mobile-contracts/parent.ts` içinde. Hiçbir DTO şunları içermez:

- öğretmenin öğrenciye özel notu, ders notu gövdesi / ödev / hedef alanları;
- koç iç notu, `STUDENT_VISIBLE` not, ham check-in, enerji / zorluk, öğrenci görev notu;
- taslak plan veya özet, risk / müdahale verisi;
- yayınlanmamış skor, bütünlük sinyali, doğru cevap;
- başka öğrenci, personel e-posta / telefonu, Meet bağlantısı, sipariş / tutar.

## Web yolu → veli menü kimliği

`parentNavIdForWebPath` (sözleşme dosyasında, saf). Sunucu (eylem / yaklaşan hedefleri) ve mobil (bildirim dokunuşu) aynı tabloyu kullanır. Sorgu dizesi yok sayılır; tanınmayan yol `null` döner.

| Yol | navId |
| --- | --- |
| `/panel/veli` | `today` |
| `/panel/veli/takvim` | `lessons` |
| `/panel/veli/odevler` | `assignments` |
| `/panel/veli/ogretmenler` | `teachers` |
| `/panel/veli/analiz` | `analiz` |
| `/panel/veli/takip` | `progress` |
| `/panel/veli/kocluk` | `coaching` |
| `/panel/veli/haftalik` | `weekly-digest` |
| `/panel/veli/denemeler` | `mock-exams` |
| `/panel/veli/hesap` | `account` |
| `/panel/odk/veli/raporlar` | `odk-reports` |
