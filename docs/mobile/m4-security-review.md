# M4 güvenlik incelemesi — Deneme Ligi

## 1. Yetki zinciri (her yeni uç)

1. **Kimlik:** Bearer veya çerez (M1). Kimliksiz istek 401 döner.
2. **Ürün kapısı:** `requireApiProductRole("ODK","STUDENT")`.
   - Rol STUDENT olmalı.
   - ODK pilot kapısından geçmeli.
   - Aktif ürün erişimi olmalı; yoksa 404 `PRODUCT_ACCESS_REQUIRED`.
   - Çalışma alanı seçimi tek başına yeterli değildir.
3. **Deneme hakkı:**
   - Liste yalnız aktif sözleşmelerdeki denemeleri okur (`listActiveOdkContracts`): başlamış, iptal edilmemiş, süresi dolmamış hak.
   - Ayrıntı ve sonuç her istekte `getActiveOdkExamGrant` ile deneme bazında doğrular.
   - Yayınlanmamış (`publishedAt` null) veya taslak deneme dönmez.
4. **Sonuç yayını** (`getReleasedStudentResult`). Şunların **hepsi** gerekir:
   - `studentReports` hakkı.
   - Sınav `RELEASED`.
   - `contractResultAvailable`: sözleşme yayın modu ve zamanı.
   - Öğrencinin **kendi** teslim edilmiş denemesi.
   - Skor `publicationStatus = PUBLISHED`.
5. **Cevap anahtarı:**
   - Sonuçtan **bağımsız** `contractAnswerKeyAvailable` kontrolü yapılır.
   - Dosya ucu (`/answer-key`) hakkı, `studentReports`'u ve anahtar yayınını kendisi yeniden doğrular.
   - Sonuç yanıtındaki `answerKey.available` yalnız düğme görünürlüğü içindir.

Öğrenci kimliği hiçbir uçta istemciden alınmaz. Yanıtlar `private, no-store` döner.

## 2. İzin listeli projeksiyon (`lib/mobile/odk-views.ts`)

| Asla dönmez | Not |
| --- | --- |
| Deneme cevap listesi (`answers`), sürüm ayarları (`settings`), dosya yolları (`blobPathname`) | Ayrıntıda yalnız soru **sayısı** ve bölüm başlıkları |
| Meet bağlantısı (`meetUrl`) | Yalnız `meetRequired`; bağlantı web sınav akışında |
| Bütünlük (integrity) düzeyi, inceleme / moderasyon verisi | Seçilmez |
| Sözleşme anlık görüntüsü, paket / ödeme bilgisi | Seçilmez |
| Başka öğrencinin denemesi / skoru | Sorgular `studentUserId = oturum` ile filtreli; karşılaştırma yalnız kendi sonuçları |
| Yayınlanmamış skor | Liste / Bugün neti yalnız `PUBLISHED`; sonuç ucu 404 |
| Gizli doğru cevap | `correctOption` yalnız `answerKeyAvailable` iken; aksi halde `null` |

## 3. Yan etkiler

- **Ayrıntı ucu salt okunurdur.**
  - Web ayrıntı sayfası, süresi dolmuş açık denemeyi okurken otomatik teslim eder (mevcut davranış, değişmedi).
  - Mobil uç `finalizeExpired: false` ile çağırır ve yazma yapmaz. Geçici senaryo A'da DB durumu `IN_PROGRESS` kaldı.
- **Mobil kod yazma yapmaz.** Deneme başlatma, cevap, kalp atışı, bütünlük olayı, oturum kapatma veya teslim çağrısı yoktur.
- **Çapraz ürün önerileri hiçbir şey oluşturmaz.** Görev, tekrar öğesi veya plan değişikliği yazılmaz. Yalnız mevcut çalışma alanı geçişi sunucuya yazılır.

## 4. Mobil istemci

- **Önbellek:**
  - Sorgu önbelleği yalnız bellektedir. Anahtar kullanıcı + `ODK` + kaynak + deneme kimliği + görünümden oluşur.
  - Çalışma alanı değişiminde ve çıkışta silinir.
  - Sonuç sorgusu ekrandan çıkınca 1 dk sonra bellekten atılır.
  - Hak iptal edilirse bir sonraki yenilemede (ön plan, aşağı çekme, ekran açılışı) sunucu 404 döner ve ekran boş durum gösterir.
- **Cevap anahtarı:**
  - Yalnız `Authorization: Bearer` başlıkla indirilir; token URL'de değildir. `Linking.openURL` kullanılmaz.
  - Hedef `cache/odk-answer-keys/<kullanıcı>/` dizinidir. Ad yalnız deneme kimliğinden üretilir.
  - Çıkış / oturum düşmesi / hesap değişiminde `clearMaterialFiles()` bu dizini de siler.
  - Sunucu 2xx dışı yanıt verirse indirme hata verir (expo-file-system); bozuk dosya yazılmaz.
- **Web sınav devamı:**
  - `openOnWeb`, yalnız aynı kökendeki `/panel` yolunu sistem tarayıcı sekmesinde açar.
  - Token, çerez veya tek kullanımlık giriş anahtarı taşınmaz. Öğrencinin tarayıcıda ayrıca giriş yapması gerekebilir; ekranda bu açıkça söylenir.
  - Başlatma ve devam kararlarını web sınav sistemi verir: süre, oturum kilidi, cihaz kontrolü.
- **Rota kapısı:**
  - `/odk/exam/[id]` ve `/result`, `OdkRouteGate` ile korunur: Deneme Ligi çalışma alanı + `odk-exams` menüde.
  - Kimlikte yalnız `[\w-]{1,64}` kabul edilir.
  - Derin bağlantı izin listesi dar tutuldu. Bildirim eşlemesi menü kontrolü yapar.
  - Yetkisiz kullanıcı elle kurulmuş bir rotayla ODK verisi alamaz: istemci kapısı boş durum gösterir, sunucu 404 döner.
- **Çapraz çalışma alanı:** OD/Yön'deki `odk-exams` OD dış denemelerine düşmez. Yalnız ODK ACTIVE ise geçiş önerilir.

## 5. Bulgular / BLOCKED

1. **(Yüksek — web, değiştirilmedi) Web sonuç sayfası doğru cevapları anahtar yayınından önce gösteriyor.**
   - **Yer:** `app/panel/odk/ogrenci/denemeler/[id]/sonuc/page.tsx`.
   - **Davranış:** "Doğru" sütunu ve soru ayrıntısındaki "Doğru cevap" alanı `correctOption`'ı koşulsuz basıyor.
   - **Etki:** Sözleşme `answerKeyReleaseMode = SCHEDULED | ADMIN_AFTER_END` ise anahtar sonuçtan sonra açılabilir. Bu durumda web anahtar PDF'i kapalıyken doğru cevapları açığa çıkarıyor.
   - **Mobil:** Bu alanı yalnız anahtar açıkken taşıyor.
   - **Gereken karar:** Web'de aynı koşulun uygulanması mı, yoksa "soru başına doğru cevap" ile "anahtar PDF'i"nin ayrı politikalar olduğunun teyidi mi. **BLOCKED (ürün / güvenlik kararı).**
2. **(Bilgi — mevcut davranış) Liste ve Bugün `RESULT_RELEASED`'ı sözleşme yayınından türetir.**
   - Skor gizliyse (`HIDDEN`) durum "Sonuç açıklandı" olur, ama net gösterilmez ve sonuç ucu 404 döner.
   - Veri sızıntısı yok; kullanıcı deneyiminde tutarsızlık var. Mobil 404'ü "Sonuç henüz açıklanmadı" olarak gösterir.
3. **(Bilgi) Telemetri:** Mobil sonuç ucu `odk_result_viewed` olayını kaydetmez.
4. **(Risk) Kalıcı otomatik güvence yok.** M4 uçları için kalıcı yetki testleri yazılmadı (kullanıcı talimatı). Geçici betikle doğrulandı; regresyon koruması yok.
