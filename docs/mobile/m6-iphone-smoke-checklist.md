# M6 iPhone duman testi kontrol listesi — Veli

> **Bu kontroller yapılmadı.** Gerçek iPhone testi ürün sahibinin Mac + iPhone'unda yapılacak. Üretim öğrenci verisi KULLANILMAZ; yalnız yerel veya staging test verisi.

## 1. Arka ucu yerelde hazırlama (Mac)

1. PostgreSQL çalışır durumda olmalı. Test veritabanı için `.env` içinde `DATABASE_URL` ve `DIRECT_URL` tanımlanır.
2. Şema ve test hesapları:
   ```bash
   ALLOW_FRESH_DB_BOOTSTRAP=true npm run db:bootstrap:fresh
   npx tsx prisma/seed-e2e.ts
   ```
   - `seed-e2e` test veli hesabını oluşturur: `parent.e2e@example.com`, parolası `E2E_PASSWORD` (yerel E2E ortamında `testpass123`).
   - Yalnız test veritabanında çalıştırın.
3. Bayraklar (isteğe bağlı): `PANEL_FEATURE_PARENT_WEEKLY_DIGEST=true`, `PANEL_FEATURE_MOCK_EXAM_ANALYSIS=true`. `progressInsights` varsayılan olarak açık.
4. Mobil isteklerin geçmesi için sunucuda `PANEL_ENABLED=true` ve `MOBILE_MIN_SUPPORTED_VERSION=1.0.0` (veya boş) olmalı.
5. Sunucuyu ağdan erişilebilir başlatın: `npm run dev -- -H 0.0.0.0` (veya `npm run build && npx next start -H 0.0.0.0`).
6. İkinci çocuk için (çoklu çocuk testi) test veritabanında bir bağlantı ekleyin:
   ```sql
   insert into parent_students (id, parent_id, student_id, relationship)
   values ('smoke-link-2', 'e2e-user-parent', 'e2e-student-profile-odk', 'Veli');
   ```

## 2. Mobil uygulamayı iPhone'da açma

1. `cd mobile && npm ci`
2. `mobile/.env`:
   ```
   EXPO_PUBLIC_API_URL=http://<Mac-LAN-IP>:3000
   ```
   - Geliştirme derlemesinde `http` kabul edilir; geliştirme dışı derlemede HTTPS zorunludur.
   - iPhone ve Mac aynı Wi-Fi ağında olmalı.
3. `npx expo start` → iPhone'da Expo Go ile QR kodunu okutun.
   - Veli ekranları Expo Go'da çalışır.
   - **Push teslimi Expo Go'da doğrulanamaz.** İmzalı geliştirme derlemesi (`eas build --profile development`) ve yapılandırılmış APNs kimlik bilgisi gerekir (M5 runbook).
4. Staging'e bağlanmak için `EXPO_PUBLIC_API_URL=https://<staging-alanı>` kullanın; staging'de yalnız test hesapları olmalı.

## 3. Kontrol listesi

| # | Adım | Beklenen | ✓ |
| --- | --- | --- | --- |
| 1 | `parent.e2e@example.com` ile giriş | Veli Bugün açılır; öğrenci Bugün'ü DEĞİL | ☐ |
| 2 | Başlıkta "Öğrenci: …" | Seçili çocuğun adı görünür | ☐ |
| 3 | (İkinci bağlantı eklendiyse) "Değiştir" | Alt sayfada iki çocuk; seçim değişir, içerik önce iskelete düşer, sonra yeni çocuğun verisi gelir | ☐ |
| 4 | Çocuk değiştirip hızlıca geri dönme | Hiçbir anda önceki çocuğun verisi yeni çocuğun adı altında görünmez | ☐ |
| 5 | Bugün | Genel durum cümlesi, Bu hafta, Akademik gelişim; varsa Yön Koçluk ve haftalık özet bölümleri | ☐ |
| 6 | Dersler | Tarih, saat, öğretmen, katılım etiketi; "Son ders özeti" ortak konu; özel not yok | ☐ |
| 7 | Ödevler | Aktif / Geciken / Tamamlanan sekmeleri; hiçbir düzenleme düğmesi yok | ☐ |
| 8 | Öğretmenler | Branş + ad + biyografi; e-posta / telefon yok | ☐ |
| 9 | Gelişim | Özet cümleleri; iki denemeden az ise dürüst "en az iki deneme" metni | ☐ |
| 10 | Yön Koçluk (OK'li çocukta) | Koç, sonraki görüşme, bu hafta, koç notları (yalnız veliye açık), hedefler; görüşme düğmesi yok | ☐ |
| 11 | Deneme Ligi raporu (ODK'li çocukta) | Yayınlanmış denemeler, D / Y / B, net, kazanımlar; sıralama yok | ☐ |
| 12 | Okul ve kurum denemeleri | Deneme Ligi'nden ayrı başlık ve liste | ☐ |
| 13 | Haftalık özet | Öğretmen özeti ve ayrı "Sistemden görünenler" bölümü; geri bildirim düğmeleri (velinin OD erişimi varsa) | ☐ |
| 14 | Geri bildirime iki kez hızlı dokunma | Tek kayıt; başarı mesajı; çift gönderim yok | ☐ |
| 15 | Hesap | Veli adı / e-posta, bağlı öğrenciler + ürünler; fiyat / ödeme yok; Bildirim ayarları ve Hesap ve güvenlik satırları çalışır | ☐ |
| 16 | Oturum açıkken bağlantıyı test veritabanında sonlandırma (`update parent_students set ended_at = now(), active = false where id = 'smoke-link-2'`) → ekranı aşağı çekip yenileme | "Öğrenci erişimi değişti" durumu; başka çocuğa sessiz geçiş yok | ☐ |
| 17 | Çıkış → başka hesapla giriş | Önceki velinin verisi görünmez | ☐ |
| 18 | Dinamik yazı boyutu (Ayarlar → Erişilebilirlik → Daha Büyük Metin) | Metinler kırpılmadan sarılır; dokunma alanları ≥44 pt | ☐ |
| 19 | Güvenli alan / çentik | Başlık ve alt çubuk güvenli alanda | ☐ |
| 20 | Öğrenci hesabıyla giriş (OD / Yön / Deneme Ligi) | M2–M4 ekranları değişmeden çalışır | ☐ |
| 21 | (Geliştirme derlemesi + APNs ile) veli bildirimi dokunuşu | Doğru çocuk ve ekran; çocuk belirsizse bildirim kutusu | ☐ |

## 4. Sonuç kaydı

Her adımın sonucu, iOS sürümü, cihaz modeli ve uygulama derleme kimliğiyle birlikte `m6-validation-results.md` dosyasına "STAGING / DEVICE VERIFIED" olarak işlenir.
