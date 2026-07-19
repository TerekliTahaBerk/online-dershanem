# Kazanım kataloğu ve kanıt defteri işletim standardı

## Akademik model

Hiyerarşi `CurriculumVersion → Subject → Unit → LearningOutcome ↔ Skill` şeklindedir. Ders ve ödevler bir ile üç aktif kazanıma bağlanır. Eski müfredat kayıtları silinmez; sürüm `ARCHIVED` yapılır ve tarihsel kanıtlar kendi sürümüne bağlı kalır.

Sürüm yaşam döngüsü:

1. `DRAFT`: Admin resmî kaynak URL'sini, dersleri, üniteleri, kazanımları ve becerileri hazırlar. Öğretmen seçiminde görünmez.
2. `ACTIVE`: Öğretmen arama, favori ve son kullanılanlar üzerinden seçim yapabilir.
3. `ARCHIVED`: Yeni bağlantı kurulamaz; mevcut ders/ödev ve öğrenci kanıtı korunur.

Katalog içeriği resmî kaynaktan doğrulanmalıdır. MEB/ÖSYM soruları veya açıklamaları lisans kontrolü olmadan kopyalanmaz; katalog yalnız kod, kısa kazanım ifadesi, kaynak bağlantısı ve öğretim becerisi taşır.

## Kanıt türleri

| Tür | Anlamı | Öğrenci/veli dili |
|---|---|---|
| `TAUGHT` | Derste işlendi | İşlendi |
| `OBSERVED` | Öğretmen uygulamayı gözledi | Uygulaması gözlendi |
| `INDEPENDENT` | Bağımsız uygulama veya tamamlanan bağlantılı ödev | Bağımsız uygulandı |
| `NEEDS_REVIEW` | Öğretmen yeniden ele alınmasını istedi | Tekrar planlandı |

İlk sürüm mastery puanı, yüzde, sınıf ortalaması veya öğrenci sıralaması üretmez. Kanıt, “öğrenci bu konuyu kesin öğrendi” iddiası değil; öğretmenin doğruladığı öğrenme olayıdır.

Öğrenci yalnız katıldığı (`PRESENT`/`LATE`) tamamlanmış derslerin kanıtını ve kendi tamamladığı ödevleri görür. Veli yalnız bağlı öğrencinin aynı sakin özetini görür. Başka öğrencinin kanıtı hiçbir sorguya girmez.

## Eksik etiket kuyruğu

Kazanım seçmeden ders/ödev tamamlamak mümkündür ancak kontrollü neden gerekir:

- `COMPLETE_LATER`: öğretmen sonra etiketleyecek;
- `CATALOG_MISSING`: uygun katalog kaydı yok, admin kataloğu incelemeli;
- `NOT_APPLICABLE`: bu iş için kazanım etiketi anlamlı değil.

Öğretmen son dersleri yeniden açıp etiketleyebilir. Etiketsiz ödevler “Kazanım etiketi bekliyor” kutusuyla listelenir ve kart üzerinden geriye dönük bağlanabilir. Admin katalog ekranı son 30 günlük ders/ödev etiketleme kapsamını gösterir; öğretmen sıralaması göstermez.

## Rollout ve kalite kapıları

- Özellik `PANEL_FEATURE_LEARNING_OUTCOMES=true` ile açılır; güvenli varsayılan kapalıdır.
- İlk pilotta en az iki grup ve öğretmen tarafından dil kontrolü yapılır.
- Hedef: ders ve ödevlerin en az %70'i kazanımla etiketlenmeli; “katalogda yok” oranı katalog boşluğunu belirlemek için haftalık incelenmelidir.
- Bağlantı event'i yalnız hedef türü, 0–3 arası sayaç, tekrar sayısı ve kontrollü erteleme nedeni taşır; kazanım, ders, grup ve kullanıcı kimliği taşımaz.
- Yeni katalog sürümü aktif edilmeden örnek ders/ödev, öğrenci görünümü, veli izolasyonu ve arşiv davranışı test edilir.

## Saklama ve düzeltme

Kazanım bağlantıları çocuk akademik profilinin parçasıdır ve ilgili ders/ödevle aynı saklama kararına tabidir. Katalog sürümü kişisel veri değildir; fakat öğrenciye bağlanan kanıtlar erişim/silme talebine dahil edilir. Yanlış kanıt öğretmen tarafından değiştirilir; değişiklik tarihsel ders/ödev kaydında güncellenir ve audit gerektiren toplu düzeltmeler admin tarafından kayıt altına alınır.
