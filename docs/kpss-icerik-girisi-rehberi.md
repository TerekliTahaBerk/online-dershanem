# KPSS Eğitim Bilimleri içerik girişi

> Bu taslak, yayına alınmadan önce bir eğitim bilimleri alan uzmanı tarafından ÖSYM'nin güncel konu ağırlıklarına göre doğrulanmalı ve düzenlenmelidir. Seed yalnızca `subject → unit → placeholder outcome` iskeleti kurar; doğrulanmış müfredat veya kazanım üretmez.

Placeholder LearningOutcome kayıtları yapısal doğrulama içindir, gerçek kazanım metinleri içerik ekibi tarafından bu kayıtların ÜZERİNE YAZILARAK girilmelidir, yeni kayıt olarak değil.

## Taslak iskeleti hazırlama

Aktif bir yönetici bulunan ve migration'ları uygulanmış veritabanında:

```bash
KPSS_CURRICULUM_CREATED_BY_ID="<aktif-admin-id>" node scripts/seed-kpss-curriculum-draft.mjs
```

Script idempotenttir: sürümü, 10 dersi, her dersin `GENEL` ünitesini ve ünite başına tek bir yapısal placeholder kazanımı upsert eder. Sürümü her çalıştırmada `DRAFT` durumunda tutar ve gerçek kazanım metni üretmez. Çıktıdaki `units` dizisi o veritabanındaki güncel ünite kimliklerini verir.

Varsayılan ilk kurulumda örnek kimlikler:

- `curriculum_unit_kpss_2026_gelisim_psikolojisi`
- `curriculum_unit_kpss_2026_ogrenme_psikolojisi`
- `curriculum_unit_kpss_2026_olcme_degerlendirme`

Başka bir kayıt daha önce aynı ders/ünite koduyla oluşturulduysa kimlik farklı olabilir; daima son script çıktısını esas alın.

## API ile tek kazanım ekleme

`POST /api/panel/curriculum/outcomes` yalnız oturum açmış `ADMIN` kullanıcılara açıktır ve aynı-origin koruması uygular. Endpoint doğrudan `unitId` almaz; `versionId + subjectCode + unitCode` ile dersi ve üniteyi bulur/upsert eder. Ünite kimlikleri doğrulama ve dış sistem eşlemesi için referanstır.

```bash
curl -X POST "https://<panel-host>/api/panel/curriculum/outcomes" \
  -H "content-type: application/json" \
  -H "origin: https://<panel-host>" \
  -H "cookie: <admin-oturum-cookie>" \
  --data '{
    "versionId": "curriculum_kpss_egitim_bilimleri_2026_taslak",
    "subjectCode": "GELISIM-PSIKOLOJISI",
    "subjectName": "Gelişim Psikolojisi",
    "unitCode": "GENEL",
    "unitName": "Genel — detaylandırılacak",
    "outcomeCode": "UZMAN-TARAFINDAN-BELIRLENECEK-001",
    "title": "Alan uzmanının doğruladığı kazanım başlığı",
    "description": "İsteğe bağlı uzman açıklaması",
    "skills": []
  }'
```

Başarılı yanıt `{ "id": "<learning-outcome-id>" }` biçimindedir. Aynı ünitede aynı `outcomeCode` ikinci kez gönderilirse `409` döner; endpoint kazanımları upsert etmez.

## Mevcut API sınırları

- `POST /api/panel/curriculum/versions` yalnız legacy `LGS/TYT/AYT/YDT` sürümü oluşturur. KPSS taslağı için seed script'i kullanılır.
- `POST /api/panel/curriculum/outcomes` tek istekte yalnız bir kazanım oluşturur.
- CSV veya toplu kazanım içe aktarma yoktur.
- Sonraki görev adayı: önizleme, satır bazlı hata raporu ve idempotency anahtarı olan bulk import endpoint'i.
- Sonraki görev adayı: aynı takvim yılında birden çok KPSS dönemi ayrı izlenecekse ayrıca dönem alanı/modeli.
