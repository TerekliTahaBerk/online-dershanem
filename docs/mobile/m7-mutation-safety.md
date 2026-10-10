# M7 yazma güvenliği

Tüm personel yazmaları **mevcut** uçlara gider. Yeni yazma ucu yok.

## Ortak kurallar

- **Yalnız çevrimiçi.** Çevrimdışıyken gönder düğmeleri devre dışıdır ve uyarı gösterilir. Yazılanlar ekranda kalır. Kuyruk yok.
- **İyimser tamamlama yok.** Başarı yalnız sunucu yanıtından sonra gösterilir; ardından yalnız bu personelin ürün kapsamındaki sorgular geçersiz kılınır (`useInvalidateStaff`).
- **Onay iletişim kutusu.** Bildirim doğuran veya geri alınamaz işlemlerde sistem onayı istenir: ders kapanışı, değerlendirme, öneri, plan onayı, görüşme tamamlama, paylaşılan not.
- **Hata eşlemesi (`writeError`):**
  - 409 → uyarı + yeniden yükleme;
  - 428 → web devamı;
  - ağ / zaman aşımı → "kayıt yapılmadı";
  - diğer → sunucu mesajı.
- **Sabit tekrar anahtarı (`useStableKey`).** Aynı mantıksal gönderim aynı anahtarı kullanır. Belirsiz sonuçta (ağ, zaman aşımı, geçersiz yanıt) anahtar korunur, böylece sunucu ikinci kez uygulamaz. İçerik değişince yeni anahtar üretilir.

## İşlem bazında

| İşlem | Eşzamanlılık | Tekrar | Çakışma davranışı |
| --- | --- | --- | --- |
| Ders kapanışı | `expectedVersion = closeVersion` | `idempotencyKey` (uuid), içerik + sürüme bağlı | 409 `LESSON_CLOSE_CONFLICT` → uyarı, sunucu verisi yeniden yüklenir, düzenlemeler korunur, "sunucudakine dön" seçeneği; tekrar deneme **bilinçli** düğmeyle |
| Ders kaydı (kapanış değil) | — | — | Son yazan kazanır (web ile aynı) |
| Teslim değerlendirme | `expectedVersion` | — | 409 / 404 (kuyruktan çıkmış) → uyarı + yeniden yükleme |
| Yardım yanıtı | `expectedVersion` | — | 409 → uyarı + liste yenilenir |
| Görüşme oluşturma | — | `idempotencyKey` (öğrenci + saat + bağlantı) | Aynı anahtar → aynı kayıt (probe 34) |
| Görüşme SAVE / COMPLETE | `expectedVersion` | `idempotencyKey` (sürüm + içerik) | 409 → uyarı + yeniden yükleme |
| Koç notu | — | — | Çift dokunma `isPending` ile engellenir |
| Görev taşıma | `expectedPlanVersion` | — | 409 → yeniden yükleme; hafta dışı 400 |
| Öneri inceleme | yalnız PENDING | — | İkinci deneme 404 → liste yenilenir |
| Plan onayı | `expectedVersion` + DRAFT | — | İkinci onay reddedilir (probe 41d) |

## Doğrulama (probe)

- Kapanış: yanlış sürüm 409; anahtarsız 400; aynı anahtarla tekrar `replayed: true`; sürüm tam bir kez arttı (9–12).
- Değerlendirme: eksik rubric 400; eski sürüm 409; ikinci değerlendirme reddedildi (17–20).
- Görüşme: geçmiş saat 400; http bağlantı 400; tekrar anahtarı tek kayıt; eski sürüm 409; hafta dışı karar 400 (31–37).
- Plan: hafta dışı taşıma 400; eski sürüm 409; çift onay reddedildi (41–41d).
