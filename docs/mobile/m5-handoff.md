# M5 devir notu — Push bildirimleri ve senkronizasyon

M4 tamamlandı; M5'e hiçbir şey başlatılmadı. Push teslimi M4'te **uygulanmadı**.

## 1. Mevcut bildirim entegrasyonu (M1–M4)

- **Bildirim kutusu:** Uygulama içi bildirimler `GET /api/panel/notifications` uçlarından gelir; okundu yazması da bu uçlarla yapılır (M1, `app/(app)/notifications.tsx`).
- **Dokunma eşlemesi:** `mapNotificationHref` (`mobile/src/navigation/route-map.ts`) web `href`'ini **yalnız yetkili menü öğesi varken** native hedefe çevirir. Sorgu dizesi atılır; eşleşme yoksa kullanıcı listede kalır.
- **Derin bağlantı:** `sanitizeIncomingPath` dar bir izin listesi uygular.

## 2. Native hedefler (bildirim / derin bağlantı)

| Web yolu | Native hedef | Koşul |
| --- | --- | --- |
| menüdeki herhangi bir `webPath` | sekme veya `/screen/<id>` | öğe yetkili menüde |
| `/panel/ogrenci/takvim/<id>` | `/od/lesson/<id>` | OD, `lessons` |
| `/panel/ogrenci/tekrar`, `/telafi` | `/od/review-recovery?tab=` | OD, `review-recovery` |
| `/panel/odk/ogrenci/denemeler/<id>` (ve `/coz`) | `/odk/exam/<id>` | ODK, `odk-exams` |
| `/panel/odk/ogrenci/denemeler/<id>/sonuc` | `/odk/exam/<id>/result` | ODK, `odk-exams` |

İzinli derin bağlantılar:
- `od/(lesson|assignment)/<id>`
- `od/review-recovery`
- `yon/task/<id>`
- `odk/exam/<id>`, `odk/exam/<id>/result`

**Çalışma alanı uyumsuzluğu:** Bildirim başka bir çalışma alanına aitse (ör. ODK sonucu, kullanıcı OD'deyken), şu anki eşleme `none` döner ve kullanıcı listede kalır. M5'te "önce çalışma alanı geçişi (`selectWorkspace`), sonra hedef" akışı eklenebilir. Bu akışın deseni `features/odk/hooks.ts#useCrossProductOpen`'da var.

## 3. Deneme Ligi bildirim kaynakları (bugün)

- **Öğrenciye giden ODK bildirimi YOK.** Taranan uçlar:
  - Sonuç yayını (`app/api/odk/admin/exams/[id]/release`) bildirim üretmiyor.
  - Deneme planlama / açılış bildirim üretmiyor.
- **Tek ODK bildirimi:** `lib/odk/provisioning.ts` yöneticilere "öğrenci hesabı açılacak" bildirimi gönderiyor (personel, öğrenci değil).

## 4. Fırsatlar (yetki gerektirir; M5 ürün kararı)

- **Yaklaşan deneme hatırlatması:**
  - Örneğin pencere açılmadan X dk önce ve geç giriş kapanmadan önce.
  - Hedef: `/panel/odk/ogrenci/denemeler/<id>`.
  - Alıcı yalnız o deneme için aktif sözleşme hakkı olan öğrenciler (`listActiveOdkContracts`).
- **Sonuç yayını:**
  - `RELEASED` ve sözleşmeye göre yayın zamanı geçtiğinde, yalnız `studentReports` hakkı olan ve skoru `PUBLISHED` olan öğrencilere.
  - Hedef: `…/<id>/sonuc`.
  - Zamanlanmış yayında (`resultsReleaseMode = SCHEDULED`) bildirim zamanı yayın zamanıyla eşlenmeli. Erken bildirim sonuç ekranında 404'e düşer.
- **Cevap anahtarı yayını:** Sonuçtan bağımsız zamanlanabilir (`answerKeyReleaseMode`). Ayrı bir bildirim olmalı.

## 5. Gizlilik ve yük kısıtları

Bildirim içeriği kilit ekranında görünür. Bu yüzden:
- **İçerikte olmamalı:** Net, puan, doğru/yanlış sayısı, kazanım adı, başka öğrenci bilgisi.
- **Önerilen içerik:** Yalnız "Deneme sonucun açıklandı" gibi genel metin + deneme başlığı. Başlık da hassas sayılırsa çıkarılabilir.
- **Push yükü:** Yalnız `href` (web yolu) ve bildirim kimliği taşımalı. Token, deneme verisi ve sözleşme bilgisi taşımamalı.
- **Hedef açılışı:** Mobil istemci hedefi açarken yetkiyi yeniden doğrular (rota kapısı + sunucu 404). Bildirim yetki taşımaz.
- **Hak iptal edilirse:** Eski bildirim güvenli boş duruma düşer.

## 6. Yeniden kullanılabilir temeller

| Temel | Yer |
| --- | --- |
| Ürün bağımsız veri katmanı | `features/shared/workspace-data.tsx` (OD / OK / ODK) |
| Ön plana dönüşte yenileme | `lib/query/query-client.ts` (`focusManager`) — push sonrası geçersizleme için |
| Çalışma alanı geçişi | `SessionProvider.selectWorkspace` |
| Rota kapıları | `OdRouteGate`, `YonRouteGate`, `OdkRouteGate`, `/screen/[id]` |
| Önbellek temizliği | `queryClient.clear()`, `clearMaterialFiles()` (materyal + cevap anahtarı) |

## 7. M4'ten açık kalanlar

- **Kalıcı testler** (kullanıcı talimatıyla yazılmadı; önerilir):
  - **Entegrasyon:** ODK okuma uçları için şu sınırlar:
    - Ürün yok / revoked / süresi geçmiş hak.
    - HIDDEN skor.
    - Gizli anahtarda `correctOption` yok.
    - `studentReports=false`.
    - Başka öğrencinin skoru.
    - Süresi dolmuş denemede yan etki yok.
    - Web / mobil okuma eşliği.
  - **Mobil Jest:** ODK eşlemesi, `OdkRouteGate`, derin bağlantı, sonuç filtreleri, AYT görünümü, cevap anahtarı indirmesinin Bearer kullanması ve URL'de token olmaması, hesap değişiminde önbellek izolasyonu.
- **BLOCKED:** Web sonuç sayfasında `correctOption` yayın politikası. Ayrıntı: [m4-security-review.md](./m4-security-review.md) §5.
- **Liste sayfalaması:** Liste en yeni 50 denemeyle sınırlı; `truncated` bildiriliyor. Sayfalama için `listStudentExams`'a imleç gerekir.
- **Gerçek cihaz duman testi:**
  - ODK Bugün, liste, ayrıntı ve sonuç.
  - Web sınav devamı (sistem tarayıcısında giriş).
  - Cevap anahtarı PDF'i.
- **`mobile.yml` CI işi:** PR'da koşmalı.
- **Önceden var olan E2E sıra kirlilikleri:**
  - `odk-exam-flow` → `odk-product-quality`.
  - `kocum-lifecycle` → `panel-experience`.
