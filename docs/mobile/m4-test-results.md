# M4 test sonuçları

Tüm komutlar bu oturumda, 2026-10-09'da, `claude/loving-goodall-972n6c` dalında gerçekten çalıştırıldı.

**Test yazma politikası:**
- Kullanıcının kalıcı talimatı ("Kesinlikle test yazma") korundu; M4 isteği de bunu istiyor. Depoya **yeni test dosyası veya senaryosu eklenmedi**.
- **Güncellenen mevcut beklentiler:** M4'ün bilinçli olarak değiştirdiği davranış (Deneme Ligi yer tutucusu → native ekran) yüzünden iki mevcut beklenti en küçük farkla güncellendi:
  - `src/navigation/navigation.test.ts`: ODK eşleme beklentisi.
  - `src/test/app-flow.test.tsx`: Deneme Ligi-only öğrencide `placeholder-today` → `odk-home`.
- **Telafi:** Yetki ve yayın sınırları, çalışan üretim derlemesine karşı **geçici, commit'lenmeyen** bir betikle doğrulandı (§2). Bu betik CI'da koşmaz. Kalıcı güvence için önerilen testler [m5-handoff.md](./m5-handoff.md) §7'de.

## 1. Özet

| Katman | Komut | Sonuç |
| --- | --- | --- |
| Taban (M4 öncesi) | mobil tsc / lint / Jest | ✅ temiz, 141/141 |
| Mobil TypeScript / lint | `npm run typecheck`, `npm run lint` | ✅ 0 hata / 0 sorun |
| Mobil Jest | `npx jest --ci` | ✅ **141/141** (iki yer tutucu beklentisi güncellendikten sonra; öncesinde bu 2 test bilinçli davranış değişikliği nedeniyle başarısızdı) |
| Mobil paketleme | `expo export` android / ios | ✅ Android 3,4 MB, iOS 3,1 MB |
| Paket sızıntı taraması | Prisma, `server-only`, ortam değişkeni adları, `getReleasedStudentResult`, `getStudentExam`, `loadOdkStudent*`, `listActiveOdkContracts`, `contractSnapshot`, `integrityLevel`, `blobPathname`, `privateNote` | ✅ 0 eşleşme |
| Sözleşme sınırı / token | `check-mobile-contracts` (7 dosya) / `check-mobile-tokens` | ✅ |
| Kök typecheck / lint / hijyen / API doğrulama | — | ✅ (198 route, 218 metot) |
| Kök unit + kapsam | `npm run test:unit:coverage` | ⚠️ **928/929**. Tek hata önceden var olan `public-marketing-products` CSS testi. Kapsam 93,20 / 81,11 / 73,97 (eşikler karşılanıyor) |
| Entegrasyon (CI ortamı, `db:bootstrap:fresh` + `db:seed`) | `npm run test:integration` | ✅ **100/100** |
| E2E (`next start`, chromium, 9 paket) | — | ⚠️ 66 test: 64 geçti, 2 başarısız (aşağıda) |
| E2E `odk-product-quality` tek başına, taze DB | — | ✅ **8/8** |
| Geçici yetki / yayın senaryoları (commit'lenmez) | `scratchpad/m4-probe/{probe.sh,scenarios.ts}` | ✅ **17/17** + uç taraması |

E2E paket ayrıntısı:

| Paket | Sonuç |
| --- | --- |
| `mobile-api` | 18/18 |
| `odk-exam-flow` | 2/2 (web sonuç sayfası dahil; refaktörden sonra çalışıyor) |
| `odk-lgs-sessions` | 2/2 |
| `panel-access` | 10/10 |
| `permission-matrix` | 15/15 |
| `panel-auth-smoke` | 4/4 |
| `phase0-security` | 4/4 |
| `coaching-experience` | 3/3 |
| `odk-product-quality` | 6/8 toplu koşuda |

**`odk-product-quality` toplu koşu hatası (2 test, öğrenci masaüstü / mobil):**
- Hata: "Execution context was destroyed … navigation".
- Neden: Aynı koşuda önce çalışan `odk-exam-flow`, tohumdaki açık denemeyi teslim ediyor. Bu yüzden `/coz` sayfası tarama sırasında ayrıntıya yönlendiriyor.
- Sınama: Taze veritabanında tek başına koşulunca 8/8 geçti.
- Sonuç: Test sırası kirliliği, M4 regresyonu değil.

## 2. Geçici yetki / yayın senaryoları (E2E veritabanı, gerçek HTTP)

### Uç taraması (`probe.sh`)

| Durum | Sonuç |
| --- | --- |
| ODK öğrencisi | home 200, liste 200, `gorunum=acik` 200, ayrıntı 200 |
| Açıklanmamış sonuç | 404 |
| Cevap anahtarı | 404 |
| Olmayan deneme | 404 |
| Geçersiz `gorunum` | 400 |
| OD-only öğrenci | Tüm ODK uçlarında 404 `PRODUCT_ACCESS_REQUIRED` |
| Kimliksiz istek | 401 |
| Ayrıntı yanıtı | `answers`, `settings`, `meetUrl`, `blobPathname`, `integrity`, `correctOption`, `selectedOption` YOK |
| LGS oturum planı | Gerçek yapılandırmadan: Sözel 75 dk + 45 dk ara + Sayısal 80 dk, toplam 200 |

### Senaryolar (`scenarios.ts`)

| # | Senaryo | Sonuç |
| --- | --- | --- |
| A | Süresi dolmuş açık deneme: ayrıntı `WAITING_RESULT` + `expired` | PASS |
| A | DB'de deneme hâlâ `IN_PROGRESS` (okuma yazma yapmadı) | PASS |
| A | `Cache-Control: private, no-store` | PASS |
| B | Puanlanmış ama `HIDDEN` skor → sonuç 404 | PASS |
| B | Listede net yok | PASS |
| C | `PUBLISHED` skor → sonuç 200, net sunucu skoru (0,67) | PASS |
| C | Anahtar sonuçla birlikte açıksa `correctOption` dolu | PASS |
| C | Listede `RESULT_RELEASED` + net | PASS |
| D | Sonuç açık, anahtar gizli (`ADMIN_AFTER_END`) → sonuç 200, `answerKey.available=false` | PASS |
| D | Hiçbir soruda `correctOption` yok; yanıtta gizli doğru cevap yok | PASS |
| D | Cevap anahtarı ucu 404: sonuç başarısı anahtara yetki vermiyor | PASS |
| E | Sözleşmede `studentReports=false` → sonuç 404 | PASS |
| F | Başka öğrencinin yayınlanmış skoru → 404 | PASS |
| G | Hak iptal edildi (`revokedAt`) → ayrıntı 404 | PASS |
| G | Hak iptal edildi → liste boş | PASS |

İstenen sınır listesinden **koşulmayanlar**:
- OK-only ve tüm ürünlü öğrenci için ODK ucu çağrısı. Ürün kapısı aynı `requireApiProductRole` olduğundan OD-only sonucuyla aynı yolu izler.
- Pilot kapalı durumu.
- Süresi geçmiş (`expiresAt`) hak. `revokedAt` ile aynı sorgu filtresi; ayrıca koşulmadı.
- Deneme hakkı (attempt limit) dolu durumu.
- Cevap anahtarı PDF'inin gerçek indirilmesi. E2E ortamında Blob deposu yok.
- AYT alan filtresi. Tohumda AYT sonucu yok; mantık `resultTrackView` ile web'le ortak.

## 3. Yapılamayanlar

- **Gerçek cihaz / simülatör testi YAPILMADI.** Doğrulanamayanlar:
  - Sistem tarayıcısında web sınav ekranının açılması.
  - PDF paylaşım / önizleme.
  - Ekran okuyucu ve dinamik yazı boyutu.
  - Çalışma alanı geçişi sonrası yönlendirme.
- **Kalıcı M4 testleri yok.** Yeni uçların yetki ve yayın sınırları yalnız yukarıdaki geçici betikle doğrulandı. Regresyonda bu güvence otomatik değil.
- **`mobile.yml` CI işi:** Bu dalda koşmadı (PR yok).
