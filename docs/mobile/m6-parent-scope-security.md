# M6 veli kapsamı ve güvenlik tasarımı

## 1. Kimlik kuralları

| Kavram | Değer | Kullanıldığı yer |
| --- | --- | --- |
| `studentId` | `StudentProfile.id` | Veli bağlamı, tüm `/api/panel/parent/*` uçları, mobil seçici, sorgu anahtarları |
| Öğrenci `User.id` | `ParentChild.userId` | YALNIZ sunucuda: ürün erişimi (`getAccessibleProductCodes`), ODK raporu (`getOdkAudienceStudentReport`) |

`StudentProfile.id === User.id` varsayılmaz. ODK rapor ucu istemciden `StudentProfile.id` alır, çocuğu velinin kapsamında çözer ve `child.userId`'yi sunucuda kullanır. İstemcinin öğrenci `User.id` göndermesi 404 ile sonuçlanır (probe ile doğrulandı).

## 2. Sunucu kapısı (`lib/panel/parent-api.ts#requireParentChild`)

`resolveParentScope` ile aynı kural; tek fark, web'deki `notFound()` yerine JSON 404 dönmesi:

1. `requireApiAccountRole("PARENT")`: oturum, parola değişimi ve MFA kapıları.
2. `studentId` biçim doğrulaması (zorunlu).
3. `listParentVisibleChildren(parentId, "academic")`:
   - `ParentStudent.active = true`, `endedAt = null`, `canViewAcademic = true`;
   - öğrencinin aktif ürünlerinden en az biri veliye görünür (OD / OK / ODK), ya da hiç aktif ürünü yok (mevcut "hazırlanıyor" davranışı);
   - yalnız KPSS → kapsam dışı.
4. Bulunamazsa 404 `CHILD_NOT_FOUND`. Varlık ve sayı bilgisi sızmaz.

Ürün, bayrak ve kaynak kontrolleri her uçta ayrıca yapılır. Ürün kararı **çocuğun** `products` listesinden verilir, velinin toplam erişiminden değil.

## 3. İki amaç: academic / account

| Amaç | Kullanan | Akademik veri |
| --- | --- | --- |
| `academic` | `children`, `home`, `lessons`, `assignments`, `teachers`, `insights`, `coaching`, `digests`, `external-exams`, `odk/parent/report` | Evet |
| `account` | YALNIZ `GET /api/panel/parent/account` | Hayır: ad + ürün etiketi + `academicAccess` bilgisi |

Hesap ucu hiçbir akademik ucu yetkilendirmez. Akademik izni kapalı çocuk tüm akademik uçlarda 404 alır (probe ile doğrulandı).

## 4. Çoklu çocuk bağlamı (mobil)

Kod: `mobile/src/features/parent/parent-context.tsx`.

- **Çocuk listesi:** `GET /api/panel/parent/children`; bootstrap ile aynı kaynak, ikinci bir kayıt yok.
- **Seçim:** yalnız bellekte. Cihaz depolamasına çocuk kimliği veya verisi yazılmaz.
- **Varsayılan:** ilk çocuk YALNIZ açık seçim yapılmamışken seçilir.
- **Liste değişince:** seçim yeniden doğrulanır. Seçili çocuk listeden düşerse:
  1. veri gösterimi durur;
  2. o çocuğun önbelleği iptal edilip silinir;
  3. "erişim değişti" durumu gösterilir;
  4. çocuk kalırsa açık seçim istenir. Başka çocuğa sessizce geçilmez.
- **Sorgu `CHILD_NOT_FOUND` alırsa:** aynı işlem uygulanır, ayrıca çocuk listesi ve bootstrap yenilenir.
- **Sorgu anahtarı:** `['user', veliId, 'parent', 'PARENT', 'child', studentId, kaynak]`.
  - Çocuk değişince önceki çocuğun anahtarı eşleşmez ve bellekten silinir.
  - `placeholderData` / önceki veri kullanılmaz.
- **Yanıt koruması:** `ParentQueryView`, yanıttaki `studentId` seçili çocukla eşleşmezse veriyi çizmez (yarış durumunda yanlış ad altında veri yok).
- **Çıkış / hesap değişimi:** `queryClient.clear()` (M1).
- **Çalışma alanı değişimi:** veli anahtarlarını silmez; veri çalışma alanına değil çocuğa aittir.

## 5. Bilinen politika çatışmaları (değiştirilmedi, karar bekliyor)

| Kod | Konu | Durum |
| --- | --- | --- |
| P-1 | Haftalık özet geri bildirim ucu `requireApiOdRole` velinin KENDİ OD üyeliğini ister. Yalnız OK veya ODK çocuğu olan veli özeti okuyabilir ama geri bildirim veremez (web'de de 404). | **BLOCKED — ürün / güvenlik kararı gerekli.** Mobil formu `feedbackAvailable=false` iken göstermez; uç yetkisi genişletilmedi. |
| P-2 | Veliye koçluk görüşmesi için saat değişikliği talebi web'de açık (backend PARENT'ı yetkilendiriyor). | Mobilde salt okunur; talep web devam yolu. M7 / sonrası karar. |
| P-3 | Web koçluk ekranı veliye görüşme katılım bağlantısını gösteriyor. | Mobil yanıtta `meetingUrl` yok (daha dar). Karar gerekirse eklenir. |
| P-4 | Ana sayfadaki plan gerçekleşme yüzdesi, durum süzgeci olmayan son OK planından (taslak dahil) görev sayılarını kullanır (mevcut `loadParentCalmHome`). İçerik sızmaz, yalnız sayı. | AÇIK (düşük). Web ile aynı yükleyici korunarak değiştirilmedi; düzeltme önerisi m7-handoff'ta. |

## 6. M6'da düzeltilen web bulgusu

`app/panel/veli/kocluk` plan sorgusu `status = APPROVED` süzüyordu ama ürün süzmüyordu. Öğrencinin veli-free (KPSS) onaylı planı "Bu hafta" altında veliye görünebilirdi. Ortak yükleyici `productRef.code = "OK"` süzgecini ekledi; web ve mobil artık aynı. Probe ile doğrulandı: KPSS planı seçilmiyor.

## 7. Personel adları

Mevcut yardımcılar ad yoksa e-postaya düşüyor (`fullName || email`). Veli JSON projeksiyonları, `@` içeren veya boş adı "Öğretmen" / "Koç" ile maskeler ya da alanı `null` yapar. Web görünümü değiştirilmedi.

## 8. Bildirim (push) ile açılış

- **Push yükü:** yalnız `notificationId` (M5, değişmedi).
- **Hedef:** sunucudan kimlikli okunan bildirim kaydının `href`'i.
- **Çocuk kapsamlı veli hedefinde:**
  - `href` içinde `studentId` varsa güncel listeyle doğrulanır. Listede değilse bildirim kutusu açılır.
  - `studentId` yoksa ve tek çocuk varsa o seçilir.
  - `studentId` yoksa ve birden çok çocuk varsa bildirim kutusu açılır (belirsiz). İlk çocuğa düşülmez.
- **Dış derin bağlantıdaki `studentId`:** kullanılmaz; `sanitizeIncomingPath` sorgu dizesini atar.
- **Çalışma alanı:** veli menüsü etkin çalışma alanına göre kapsamlıdır. `workspaceForWebPath` veli yollarını OD / OK / ODK'ye eşler; hedef yeni menüde yeniden doğrulanır.
