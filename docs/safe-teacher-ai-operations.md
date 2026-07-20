# Güvenli AI öğretmen yardımcısı işletim standardı

## Ürün sınırı

`teacher-draft-v1` yalnız öğretmenin ödev veya mini kontrol taslağı hazırlama süresini azaltır. Açık sohbet, soru çözücü, otomatik notlandırma, risk/ruh sağlığı çıkarımı, disiplin kararı ve öğrenci/veliyle otomatik iletişim kapsam dışıdır. Taslak daima öğretmen incelemesi bekler; onay bile otomatik yayın değildir.

## Veri minimizasyonu

İzin verilen girdiler:

- ders başlığı, grup dersi ve seviye,
- öğrenciye bağlı olmayan ortak ders konusu, ortak not, sonraki hedef ve çalışma notu,
- derse bağlı en fazla üç kazanım kodu ve başlığı.

Öğrenciye özel ders notu, ad, yoklama/yoklama notu, deneme ham sonucu, check-in, yardım isteği, accommodation, veli, ödeme, dosya ve materyal içeriği kullanılmaz. Aktif grup öğrenci adları yalnız sunucuda redaksiyon sözlüğü olarak okunur ve prompta eklenmez. E-posta, telefon, 11 haneli kimlik benzeri değer, URL ve bilinen adlar dış çağrıdan önce yer tutucuyla değiştirilir.

## Gateway kapıları

Dış model çağrısı için aşağıdakilerin tamamı gerekir:

1. `AI_DRAFT_PROVIDER=openai`: sağlayıcı açıkça seçilmiş olmalı; varsayılan `fallback` dış çağrı yapmaz.
2. `AI_DRAFT_EXTERNAL_TRANSFER_APPROVED=true`: KVKK işleme/aktarım değerlendirmesi, sağlayıcı sözleşmesi ve veri konumu operasyonu tamamlanmış olmalı.
3. `OPENAI_API_KEY`: yalnız sunucuda bulunur.
4. `OPENAI_AI_DRAFT_MODEL`: rollout sırasında bilinçli olarak sabitlenen model adı; kod içinde sessiz “son model” varsayımı yoktur.
5. `AI_DRAFT_INPUT_MICRO_USD_PER_MILLION_TOKENS` ve `AI_DRAFT_OUTPUT_MICRO_USD_PER_MILLION_TOKENS`: seçili modelin doğrulanmış fiyat oranları.
6. Günlük öğretmen istek ve maliyet tavanı.

Kapılardan biri eksikse, kota aşılırsa, 12 saniyelik timeout oluşursa, sağlayıcı hata verirse veya çıktı doğrulanmazsa kaynaklı deterministik fallback döner. Kullanıcı işini sürdürebilir; sistem model kullanmış gibi davranmaz.

Gateway OpenAI Responses API'yi `store:false`, sınırlı çıktı tokenı ve strict JSON schema ile çağırır. Sağlayıcıdaki veri saklama/zero data retention ayarları ayrıca kurum hesabında doğrulanmalıdır; istek alanı tek başına hukuki veya operasyonel yeterlilik sayılmaz. Resmî referanslar: [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), [veri kontrolleri](https://developers.openai.com/api/docs/guides/your-data), [18 yaş altı API rehberi](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance).

## Prompt injection ve çıktı doğrulama

- Kaynak satırları “güvenilmeyen alıntı veri” olarak etiketlenir. Önceki talimatı/sistem mesajını değiştirmeye çalışan ifade algılanırsa dış çağrı yapılmaz.
- Model yalnız gönderilen kaynak ID'lerini citation olarak döndürebilir. Uydurma citation çıktıyı fallback'e çevirir.
- Başlık, yönerge, kısa kontrol, 2–3 ölçüt ve citation alanları strict şemayla sınırlıdır.
- Tanı, utandırma, ceza, sıralama, yüzdelik, sınav garantisi, e-posta ve URL gibi içerik sunucu kontrolünde reddedilir.
- Bu kontroller öğretmen doğrulamasının yerine geçmez. Matematiksel doğruluk ve pedagojik uygunluk insan sorumluluğundadır.

## İnsan denetimi ve audit

Taslak `DRAFT` statüsünde açılır. Öğretmen kaynak etiketlerini ve model/fallback durumunu görür; başlık, yönerge, kontrol sorusu ve ölçütleri düzenleyebilir. `APPROVED`, `REJECTED` ve `FLAGGED` terminal durumlardır; eski sekme `version` kontrolüyle `409` alır. Flag yalnız kontrollü hata nedenidir; prompt/çıktı audit payload'ına veya ürün event'ine kopyalanmaz.

## Eval ve rollout

- `npm run eval:teacher-ai` dört altın vakayı dış çağrı olmadan çalıştırır: LGS matematik ödevi, TYT mini kontrol, kişisel veri redaksiyonu ve prompt injection fallback'i.
- Canlı eval `AI_EVAL_ACKNOWLEDGE_COST=true` olmadan model çağırmaz. Canlı eval öncesi sağlayıcı kapıları ve ayrı test projesi/anahtarı kullanılır.
- Pilot 3–5 öğretmenle başlar. En az 20 incelenmiş taslaktan önce kabul/flag oranına karar anlamı yüklenmez.
- Guardrail'ler: doğrulanmış hata/flag `<%2`, gizlilik olayı `0`, uydurma citation `0`, p95 `<8 sn`, öğretmen başına günlük maliyet tavan altında. Kabul oranı tek başına başarı değildir.
- Admin raporunda onay, fallback, flag ve bilinen maliyet görünür. Dış model kullanıldığı halde maliyet `Eksik` ise rollout durdurulur.

## Geri alma

Gizlilik olayı, uydurma kaynak, otomatik yayın, maliyet oranı eksikliği veya hata guardrail ihlalinde önce `AI_DRAFT_EXTERNAL_TRANSFER_APPROVED=false` yapılarak dış çağrı kesilir. Gerekirse `PANEL_FEATURE_TEACHER_AI_DRAFTS=false` ile yüzey kapatılır. Mevcut taslak/audit kayıtları veri yönetişimi politikası doğrulanmadan silinmez; öğrenciye yayınlanmış içerik bulunmadığından geri alma akademik kaydı değiştirmez.
