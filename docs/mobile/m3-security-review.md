# M3 güvenlik incelemesi — Yön Koçluk

## 1. Yetki ve kapsam

| Uç | Kapı | Kapsam |
| --- | --- | --- |
| `GET student/yon`, `student/plan`, `student/coaching`, `student/goals` | `requireApiProductRole("OK","STUDENT")` | Öğrenci profili oturumdaki `userId`'den çözülür; istemciden kimlik alınmaz |
| `GET student/check-in` | `requireApiAnyProductRole(["OD","OK"],"STUDENT")` | Web sayfasıyla aynı (`requireFirstAccessibleProductRole(["OD","OK"])`) |
| Yazmalar | Mevcut uçlar, değişmedi | Görev: `loadPlanTaskForStudentMutation` (sahiplik); görüşme: `coachingAssignmentScope` + pilot + `guardMutation`; check-in: grup/koç ataması sunucuda doğrulanır |

- **Ürün erişimi yoksa:** Deneme Ligi-only ve OD-only öğrenci Yön uçlarından 404 `PRODUCT_ACCESS_REQUIRED` alır (mevcut guard).
- **Bayrak kapalıysa:** `plan` ve `check-in` uçları 404 `FEATURE_DISABLED` döner. Web sayfaları ise `notFound()` ile aynı sonucu verir.
- **`adaptivePlan` kapalıyken:**
  - Yön Bugün açılır, ancak `canComplete=false` olur ve tamamlama kontrolleri gösterilmez.
  - Korumasız alternatif yazma ucu açılmadı.

## 2. Gizlilik — sunucuda filtreleme

| Veri | Durum |
| --- | --- |
| Görüşme `privateNote` | Hiçbir yükleyicide `select` edilmez (yorumla işaretli); sızıntı taramasında mobil pakette `privateNote` metni yok |
| INTERNAL koç notları | Yalnız `STUDENT_VISIBLE` / `PARENT_VISIBLE` (`canViewerSeeCoachNote` ile aynı) |
| Personel zaman çizelgesi (STAFF/INTERNAL) | Yön uçlarında okunmaz |
| Taslak plan görevleri | Mobile verilmez (yalnız durum + sayı); koçun eklediği çalışmalar yalnız APPROVED plandan |
| Koç haftalık özeti | Yalnız `PUBLISHED`; `parentVisibleText`, `planCompletionPct` yanıtta yok |
| Görüşme bağlantısı | Yalnız `https:` (`safeMeetingUrl`); mobil ayrıca `isSafeExternalUrl` ile açar; yeni saat önerisi bekleyen görüşmede bağlantı verilmez (web ile aynı) |
| Deneme Ligi sınavları | Planım mobil yükleyicisinde okunmaz (`includeUpcomingOdkExams` yalnız web) |
| Check-in geçmişi | Yalnız öğrencinin kendi kayıtları; veli görmez (mevcut politika) |

## 3. Yazma güvenliği

- **Otomatik tekrar yok:** Hiçbir yazma otomatik tekrarlanmaz. Başarı mesajı yalnız sunucu onayından sonra gösterilir. Gönderim sürerken düğmeler kapalıdır.
- **Görev tamamlama:**
  - Sunucu durum makinesi kullanılır: aynı istek NOOP olur; geçersiz veya eşzamanlı geçiş 409 döner.
  - 409'da yetkili durum yeniden yüklenip açıklanır.
  - Ödeve bağlı görevde ilerleme senkronu yalnız sunucuda, aynı işlemde yapılır. İstemci OD'ye yazmaz; yalnız OD önbelleğini bayat işaretler.
- **Görüşme:**
  - Mobil yalnız `REQUEST` gönderir. `SAVE`, `ACCEPT` ve `COMPLETE` mobil kodda yoktur. Sunucu da öğrenciye `SAVE` / `COMPLETE`'i 404 ile reddeder.
  - `idempotencyKey` native v4 UUID'dir. Aynı mantıksal yazmada yeniden kullanılır; sonucu belirsiz yazmada korunur.
- **Plan değişiklik talebi / yardım geri bildirimi:** `expectedVersion` ile gönderilir; çakışma 409 döner.
- **Tercihler:** PATCH tüm alanları ister. Mobil, düzenlemediği alanları sunucudaki değerle geri gönderir; veri kaybı olmaz.
- **Check-in:** Serializable işlem, haftalık hak ve açık yardım isteği tekilliği sunucuda uygulanır. Sonucu belirsiz gönderimde kullanıcıya "kaydın oluşmuş olabilir" denir ve geçmiş yenilenir; tekrar gönderim otomatik yapılmaz.

## 4. Mobil istemci

- **Önbellek:**
  - Sorgu önbelleği yalnız bellekte tutulur. Anahtar kullanıcı + çalışma alanı (`OK`) + kaynak şeklindedir.
  - Çalışma alanı değişince ve çıkışta temizlenir (M1).
  - Hassas veri cihaz depolamasına yazılmaz. Çevrimdışı mutasyon kuyruğu yoktur.
- **Rota kapısı:** `/yon/task/[id]` rotası `YonRouteGate` ile korunur: yalnız Yön çalışma alanında ve "Planım" yetkili menüdeyken açılır. Kimlikte yalnız `[\w-]{1,64}` kabul edilir.
- **Derin bağlantı:** İzin listesine yalnız `yon/task/<id>` eklendi. Sorgu dizesi atılır.
- **Çapraz ürün:**
  - Yön "Haftalık" ekranı OD özet ucunu yalnız aktif OD üyeliği varken çağırır; sunucu ayrıca doğrular.
  - Yön `assignments` OD ucunu hiç çağırmaz.
- **Bundle:** Sunucu modülleri, Prisma ve ortam değişkeni adları pakette yok (tarama: 0 eşleşme).

## 5. BLOCKED / politika gerektiren konular

- **Ortak haftalık özet (`WeeklyDigest`) Yön-only öğrenci için:** Web sayfası (`requireRole("STUDENT")`) her öğrenciye açık. JSON uçları ve geri bildirim ise OD üyeliği istiyor. Yön-only öğrenciye mobilde açmak uç politikasını genişletmeyi gerektirir. **BLOCKED**: ürün / güvenlik kararı bekliyor; M3'te genişletilmedi.
- **Koçun önerdiği saati mobilde onaylama (`ACCEPT`):** M3 talimatı gereği öğrenciye açılmadı (web devam yolu). Açılması ürün kararıdır.
