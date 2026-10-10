# M9 manuel V1 kabul matrisi

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

Tüm senaryolar gerçek signed build ve izole staging hesabıyla yürütülür. Bu liste otomatik test değildir. PASS için kanıt, tarih, build/OS ve reviewer zorunlu; “çalışıyor olmalı” kabul edilmez. PII içeren video/log eklenmez.

| ID | Senaryo | PASS/FAIL | Kanıt / ticket | Tarih / reviewer | Build / cihaz / OS |
| --- | --- | --- | --- | --- | --- |
| AUTH-01 | Geçerli/geçersiz giriş, hesap bulunabilirliği sızmıyor | NOT VERIFIED | — | — | — |
| AUTH-02 | Parola sıfırlama e-postası ve web tamamlama, deep link güvenliği | NOT VERIFIED | — | — | — |
| AUTH-03 | Zorunlu parola değişimi ve MFA TOTP/recovery kapıları | NOT VERIFIED | — | — | — |
| AUTH-04 | Token expiry/iptal, askıya alınmış/silinmiş hesap ve minimum sürüm kapısı | NOT VERIFIED | — | — | — |
| AUTH-05 | Çıkış + relaunch + hesap değişimi; token/cache/materyal/push temizliği | NOT VERIFIED | — | — | — |
| OD-01 | Bugün, ders listesi/detayı, yoklama özeti ve HTTPS meeting | NOT VERIFIED | — | — | — |
| OD-02 | Ödev/teslim/review/recovery; feature kapalı/boş/hata | NOT VERIFIED | — | — | — |
| OD-03 | Materyal indirme/paylaşım, iptal edilen erişim ve dış URL satış engeli | NOT VERIFIED | — | — | — |
| OD-04 | Gelişim ve PUBLISHED haftalık özet | NOT VERIFIED | — | — | — |
| OK-01 | Yön Bugün/APPROVED plan/görev/hedef/check-in | NOT VERIFIED | — | — | — |
| OK-02 | Koç görüşmesi, saat isteği, web handoff ve özel not gizliliği | NOT VERIFIED | — | — | — |
| ODK-01 | Liste/detay/durum ve açık bilgisayar gereksinimi; native sınav yok | NOT VERIFIED | — | — | — |
| ODK-02 | RELEASED+PUBLISHED sonuç; erken doğru cevap/anahtar yok | NOT VERIFIED | — | — | — |
| ODK-03 | Hak iptali ve başka öğrenci sonucu: 404; ranking yalnız mevcut onaylı kapsam | NOT VERIFIED | — | — | — |
| PARENT-01 | İki çocuk arası geçiş, cache temizliği ve yabancı studentId reddi | NOT VERIFIED | — | — | — |
| PARENT-02 | Ders/attendance/ödev/öğretmen/progress/koçluk/ODK rapor kapsamı | NOT VERIFIED | — | — | — |
| PARENT-03 | PUBLISHED digest/feedbackAvailable; PREPARING/izinsiz bağlantı | NOT VERIFIED | — | — | — |
| STAFF-01 | Öğretmen ders/yoklama/kapanış; version conflict ve tekrar anahtarı | NOT VERIFIED | — | — | — |
| STAFF-02 | Teslim review ve yardım; başka öğretmen/aktif olmayan kayıt reddi | NOT VERIFIED | — | — | — |
| STAFF-03 | Koç aktif atama/not INTERNAL görünürlüğü/görüşme/task/plan onayı | NOT VERIFIED | — | — | — |
| STAFF-04 | Enforce izin reddi; OD öğretmenliği OK verisi açmıyor; ADMIN bilgi ekranı | NOT VERIFIED | — | — | — |
| PRIV-01 | Hesap gizlilik ve silme talep erişimi; composer yoksa anlaşılır hata | NOT VERIFIED | — | — | — |
| PRIV-02 | Onaylı silme lifecycle sonrası oturum/push/kişisel veriler; silme ≠ suspend | NOT VERIFIED | — | — | — |
| PUSH-01 | Kapalı push ile in-app bildirim kutusu; öğrenci/veli contextual izin | NOT VERIFIED | — | — | — |
| PUSH-02 | Etkinse foreground/background/cold start/deep link/quiet hours/tercih/revoke | NOT VERIFIED | — | — | — |
| LINK-01 | Bozuk/yetkisiz/cross-workspace bildirim ve deep link; token URL taşınmıyor | NOT VERIFIED | — | — | — |
| NET-01 | Uçak modu/timeout/5xx/retry/background/resume; sahte başarılı mutation yok | NOT VERIFIED | — | — | — |
| UI-01 | Safe areas, scroll, keyboard, küçük ekran, tab/header, uzun Türkçe metin | NOT VERIFIED | — | — | — |
| UI-02 | Dynamic Type en büyük, VoiceOver/Android TalkBack, light/system dark | NOT VERIFIED | — | — | — |
| REL-01 | Yeni binary/update/fingerprint ve backend version uyumu | NOT VERIFIED | — | — | — |
| SALE-01 | Fiyat/checkout/PAYTR/satış CTA yok; izinli web hedeflerinde de satış yönlendirmesi yok | NOT VERIFIED | — | — | — |

M6 P-1/P-2/P-3 sınırları ve S-3 yardım ürünü mevcut davranış olarak kontrol edilir; desteklenmeyen özellik store metninde vaat edilmez. P-4 ve S-5/S-6/S-7 açık bulgular release ticket'ında karar alır. Yeni senaryolar için otomatik test dosyası eklenmedi.
