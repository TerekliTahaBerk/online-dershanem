# M4 uygulama raporu — Deneme Ligi native öğrenci deneyimi

Tarih: 2026-10-09 · Dal: `claude/loving-goodall-972n6c`.

**Taban:**
- M2/M3 `main`'e birleşmedi: `origin/main` = `39fb658`.
- M4, aynı dalda M3'ün son commit'i `8990d88` üzerine kuruldu.
- M1/M2/M3 değişikliklerinin hiçbiri geri alınmadı.

**Test politikası:**
- Kullanıcının kalıcı talimatı ("Kesinlikle test yazma") korundu. M4 isteği de bu durumda talimatın korunmasını istiyor.
- Depoya **yeni otomatik test eklenmedi**.
- Telafi olarak, çalışan üretim derlemesine karşı **geçici, commit'lenmeyen** bir yetki/yayın senaryo betiği koşuldu (17/17). Ayrıntı: [m4-test-results.md](./m4-test-results.md).

## 1. Özet

Deneme Ligi (ODK) öğrenci çalışma alanında şu ekranlar artık native:
- Bugün
- Denemelerim
- Deneme ayrıntısı
- Açıklanmış sonuç: özet, dersler, AYT alan görünümü, kazanım analizi, zaman analizi, soru dökümü, gelişim, sonraki adım ve cevap anahtarı PDF'i

Sınırlar:
- **Deneme çözme native değil (kapsam dışı).** Başlatma ve devam etme, token taşımayan güvenli web devam yoluyla yapılır.
- **Hesaplama sunucuda kalır.** Mobil yeni bir durum, puan veya karşılaştırma hesabı içermez. Web sayfaları ve yeni JSON uçları aynı yükleyicileri kullanır.

## 2. Kilometre taşları

| Taş | Durum | Sonuç |
| --- | --- | --- |
| M4.0 Taban | ✅ | Dal M3 üzerinde, ağaç temiz. Mobil tsc/lint temiz, Jest 141/141. Kök durumu M3 ile aynı. ODK menüsü tamamen M4 yer tutucusuydu |
| M4.1 Okuma modelleri, sözleşmeler, uçlar | ✅ | `lib/mobile-contracts/odk.ts`; ortak yükleyiciler; 4 yeni GET ucu; izin listeli projeksiyon (`lib/mobile/odk-views.ts`) |
| M4.2 Denemelerim | ✅ | Tümü / Yaklaşan / Açık / Tamamlanan; sunucu sıralaması; devam eden deneme satırı; kesilme bildirimi (`truncated`) |
| M4.3 Ayrıntı ve başlamadan önce | ✅ | Pencere, soru sayısı, bölümler, gerçek oturum planı (LGS), geç giriş, hak, Meet. Duruma göre güvenli eylem. Salt okunur (yan etki yok) |
| M4.4 Açıklanmış sonuç | ✅ | Yayın koşulları sunucuda. Doğru cevap yalnız anahtar yayındayken. Kazanım, zaman, soru filtreleri |
| M4.5 Deneme Ligi Bugün | ✅ | Sıradaki deneme, son sonuçlar (delta), gelişim (aynı aile), odak konular |
| M4.6 Kişisel sonuçlar ve çapraz ürün | ✅ | Aile kayıt defteri; AYT "Benim alanım" (sunucu `inTrack`); önerilerde ürün kontrolü ve çalışma alanı geçişi |
| M4.7 Navigasyon, güvenlik, uyumluluk | ✅ | ODK eşlemeleri, `/odk/exam/[id]` ve `/result` rotaları, `OdkRouteGate`, derin bağlantı ve bildirim eşlemesi, OD/Yön'deki `odk-exams` |
| M4.8 Doğrulama, temizlik, M5 devri | ⚠️ | Tüm mevcut kontroller koşuldu, geçici senaryolar koşuldu, belgeler yazıldı. Kalıcı M4 testleri yazılmadı (talimat) |

## 3. Ortak yükleyiciye çıkarılan web okumaları (davranış korunarak)

| Web | Yükleyici | Mobil uç |
| --- | --- | --- |
| `components/odk/student-dl-home.tsx` | `lib/odk/student-dashboard-server.ts#loadOdkStudentHome` | `GET /api/odk/student/home` |
| `app/panel/odk/ogrenci/denemeler` | `…#loadOdkStudentExamList` | `GET /api/odk/student/exams` |
| `app/panel/odk/ogrenci/denemeler/[id]` | `getStudentExam` (mevcut; isteğe bağlı `finalizeExpired`) | `GET /api/odk/student/exams/[id]` (`finalizeExpired: false`) |
| `app/panel/odk/ogrenci/denemeler/[id]/sonuc` | `lib/odk/student-result-server.ts#loadOdkStudentResult` + `lib/odk/student-result-view.ts` | `GET /api/odk/student/exams/[id]/result` |

Alan düzeyi değişiklikler (eklemeli, web davranışı aynı):
- **`listStudentExams(userId, { limit })`:** Varsayılan 50. Mobil liste kesilmeyi bilmek için 51 ister.
- **`getStudentExam(…, { finalizeExpired })`:** Varsayılan `true`, web için davranış aynı. Yeni `attemptExpired` alanı eklendi.
- **Sonuç sunum kuralları:** AYT alanı, güçlü/geliştirilecek eşiği ve önceki deneme farkı artık `student-result-view.ts`'te tek yerde. Web ve mobil aynı fonksiyonları kullanır.

## 4. Mobil mimari

| Katman | Dosyalar | İçerik |
| --- | --- | --- |
| Veri | `features/shared/workspace-data.tsx` | `WorkspaceProduct` artık `'OD' \| 'OK' \| 'ODK'`; isteğe bağlı `gcTime` |
| ODK paylaşımlı | `features/odk/shared.tsx` | `useOdkQuery`, `OdkRouteGate`, `SENSITIVE_GC_MS` (sonuç 1 dk) |
| Ekranlar | `features/odk/` | `odk-home`, `odk-exams`, `exam-detail`, `exam-result`, `result-questions`, `odk-switch` |
| Yardımcılar | `features/odk/` | `exam-row`, `model`, `hooks` (cevap anahtarı açıcı, çapraz ürün açıcı) |
| Rotalar | `app/(app)/odk/exam/[id]/` | `index.tsx`, `result.tsx` |
| API | `lib/api/odk.ts` | Yalnız okuma. Başlatma, cevap, kalp atışı, bütünlük olayı ve teslim yok |
| Dosya | `lib/files/material-files.ts#downloadAnswerKeyFile` | Bearer, kullanıcı önbellek dizini; çıkışta temizlenir |

## 5. Önemli bulgu — web sonuç sayfası (değiştirilmedi, karar bekliyor)

Web sonuç sayfası soru başına **doğru cevabı** (`correctOption`) cevap anahtarı yayın politikasından bağımsız olarak gösteriyor:
- "Doğru" sütununda.
- Soru ayrıntısında.

Sözleşme cevap anahtarını sonuçtan **daha geç** açabiliyor (`answerKeyReleaseMode: SCHEDULED | ADMIN_AFTER_END`). Bu durumda web, anahtar PDF'i kapalıyken doğru cevapları açığa çıkarıyor.

Mobil projeksiyon bu alanı yalnız `contractAnswerKeyAvailable` true iken taşıyor. Bu, geçici senaryo D ile doğrulandı.

Web davranışını değiştirmek bir ürün/güvenlik kararıdır. **BLOCKED** olarak işaretlendi; ayrıntı [m4-security-review.md](./m4-security-review.md) §5.

## 6. Kararlar ve sınırlamalar

- **Deneme yürütme:** Mobil hiçbir durumda başlatma/devam API'si çağırmaz. AVAILABLE ve IN_PROGRESS durumunda web sınav ekranı sistem tarayıcısında açılır. Token taşınmaz; tarayıcıda yeniden giriş gerekebilir.
- **Süresi dolmuş açık deneme:** Mobil okuma DB'ye yazmaz. Deneme "süre doldu, sonuç bekleniyor" olarak gösterilir; sunucu bir sonraki yazma yolunda otomatik teslim eder.
- **Liste sınırı:** En yeni 50 deneme gösterilir. Aşılırsa ekran bunu açıkça söyler ve daha eskisi için web'e yönlendirir. Sayfalama eklenmedi (bkz. M5 devri).
- **Liste ile sonuç arasındaki fark (mevcut sunucu davranışı):**
  - Liste ve Bugün `RESULT_RELEASED` durumunu sözleşme yayınından alır.
  - Skor yayınlanmamışsa (`HIDDEN`) net gösterilmez ve sonuç ucu 404 döner. Mobil bunu "Sonuç henüz açıklanmadı" olarak gösterir.
- **ODK çalışma alanındaki diğer öğeler:** Çalışmalar, Analiz, check-in ve haftalık özet açık web devam yoluna gider. Deneme Ligi ekranları başka ürün verisi okumaz.
- **OD/Yön çalışma alanındaki `odk-exams`:** OD dış denemelerine düşmez. ODK ürünü ACTIVE ise mevcut çalışma alanı geçişini önerir.
- **Çapraz ürün önerileri:**
  - Yalnız ilgili ürün ACTIVE iken gösterilir. Geçiş sunucuya yazılır.
  - Hedef, yeni menüde rota kapılarıyla yeniden doğrulanır.
  - Görev, tekrar öğesi veya plan değişikliği oluşturulmaz. Koç önerisi yalnız bilgi olarak gösterilir.
- **Kapsam dışı (eklenmedi):** Sıralama, lig, yüzdelik dilim ve başkasıyla karşılaştırma. Sunucuda yetkili bir ürünü yok.
- **Telemetri:** Mobil sonuç ucu, web'in kaydettiği `odk_result_viewed` ürün olayını kaydetmez.
- **Gerçek cihaz / simülatör testi YAPILMADI.**
