# M6 ekran geçişi — Veli

| Web | Native ekran (`NativeScreenKey`) | Sunucu menü id | Uç |
| --- | --- | --- | --- |
| `app/panel/veli/page.tsx` | `parent-home` | `today` | `/api/panel/parent/home` |
| `app/panel/veli/takvim` | `parent-lessons` | `lessons` | `/api/panel/parent/lessons` |
| `app/panel/veli/odevler` | `parent-assignments` (salt okunur) | `assignments` | `/api/panel/parent/assignments` |
| `app/panel/veli/ogretmenler` | `parent-teachers` | `teachers` | `/api/panel/parent/teachers` |
| `app/panel/veli/analiz` | `parent-insights` | `analiz` | `/api/panel/parent/insights` |
| `app/panel/veli/takip` (eski, analiz'e yönlendirir) | `parent-insights` | `progress` | aynı (bayrak kapalıysa "açık değil") |
| `app/panel/veli/kocluk` | `parent-coaching` | `coaching` | `/api/panel/parent/coaching` |
| `app/panel/odk/veli/raporlar` | `parent-odk-reports` | `odk-reports` | `/api/odk/parent/report` |
| `app/panel/veli/denemeler` | `parent-external-exams` ("Okul ve kurum denemeleri") | `mock-exams` | `/api/panel/parent/external-exams` |
| `app/panel/veli/haftalik` | `parent-weekly` | `weekly-digest` | `/api/panel/parent/digests` (+ mevcut geri bildirim POST) |
| `app/panel/veli/hesap` | `parent-account` | `account` | `/api/panel/parent/account` |
| `app/panel/veli/dino` | web devam yolu | `dino` | — |
| `app/panel/veli/bildirimler` | mevcut native bildirim kutusu (M1) | — | mevcut |

## Eşleme kuralları (`mobile/src/navigation/native-screens.ts`)

- PARENT için eşleme çalışma alanından bağımsızdır; sunucu menüsü yetkili kapsamı belirler.
- Veli `today` öğrenci Bugün'üne gitmez. Veli `assignments` öğrencinin yazma yetkili ödev ekranına gitmez. Veli `odk-reports` öğrenci Deneme Ligi sonuçlarına gitmez.
- Eşlenmemiş her veli öğesi bilinçli web devam yoludur (`LATER` metni). Eski "M6'da gelecek" yer tutucusu kalktı.

## Bilinçli olarak web'de kalanlar

| Özellik | Neden |
| --- | --- |
| Paket değişikliği görüşme talebi (server action) | Mobil sözleşmesi yok; yeni mutasyon icat edilmedi |
| Koçluk saat değişikliği talebi (veli) | Native varsayılan salt okunur (P-2) |
| Takvim dışa aktarma (`.ics`) | Native takvim yazma izni M6 dışı |
| Dino AI | Ayrı karar |
| Sipariş ve ödeme listesi | MD-09 |
| OD başlangıç kartı (`OdStartCard`) | Veli ana sayfasındaki web kartı mobil ana sayfaya taşınmadı |

## Ortak bileşenler

| Dosya | İçerik |
| --- | --- |
| `features/parent/parent-context.tsx` | Çocuk bağlamı, `useParentQuery` |
| `features/parent/parent-shared.tsx` | `ParentScreen` kabuğu (yükleniyor / hata / çocuk yok / hazırlanıyor / seçim gerekli), `ChildBar` ("Öğrenci: Ad" + seçici), `ParentQueryView` (kimlik eşleşme koruması), `useParentNav` (yalnız yetkili menü hedefi) |
| `lib/api/parent.ts` | Uç istemcileri |
| `lib/query/keys.ts` | `parent*` anahtarları |
