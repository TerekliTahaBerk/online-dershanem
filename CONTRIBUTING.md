# Katkı rehberi

Online Dershanem kapalı lisanslı bir üründür. Katkılar, yalnızca proje sahibi tarafından yetkilendirilmiş katkıcılar için kabul edilir. Bir değişikliğe başlamadan önce mevcut issue'ları kontrol edin ve kapsamı bir issue üzerinden netleştirin.

## Geliştirme akışı

1. `main` dalının güncel olduğundan emin olun ve kısa, açıklayıcı bir özellik dalı açın.
2. `.env.example` dosyasını `.env.local` olarak kopyalayın; gerçek sırları hiçbir zaman commit etmeyin.
3. Küçük, odaklı değişiklikler yapın ve davranış değişikliklerini testlerle destekleyin.
4. İlgili dokümantasyonu ve `CHANGELOG.md` içindeki `Unreleased` bölümünü güncelleyin.
5. Pull request şablonundaki doğrulama listesini tamamlayın.

## Zorunlu kontroller

```bash
npm ci
npm run lint
npm run lint:hygiene
npm run typecheck
npm run test:unit
```

Değişikliğin kapsamına göre entegrasyon, Playwright ve build kontrollerini de çalıştırın. Şema değişikliklerinde migration dosyasını ekleyin; canlı veritabanında `prisma db push` kullanmayın.

## Commit ve pull request ilkeleri

- Commit mesajlarını kısa, emir kipinde ve tek bir amacı anlatacak şekilde yazın.
- Kişisel veri, erişim anahtarı, üretim URL'si içeren gizli uç noktalar veya müşteri verisi eklemeyin.
- Ekran veya davranış değişikliklerinde doğrulama kanıtını pull request açıklamasına ekleyin.
- Yetkilendirme, ödeme veya kişisel veri akışlarında riskleri ve geri alma planını açıkça belirtin.

Davranış kuralları için [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), güvenlik bildirimleri için [SECURITY.md](SECURITY.md) geçerlidir.
