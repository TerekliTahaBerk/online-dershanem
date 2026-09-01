# Sakin Veli Paneli (Part 7)

Veli paneli tek soruya cevap verir:

> Çocuğum nasıl gidiyor ve benim şu anda yapmam gereken bir şey var mı?

Bu sorunun dışına çıkan öğretmen operasyonları, risk skorları ve iç notlar
gösterilmez.

## Ana yüzeyler

| Yüzey | Route | Ne gösterir |
| --- | --- | --- |
| Bugün | `/panel/veli` | Öğrenci adı, genel durum, haftanın özeti, dört temel alan |
| Gelişim | `/panel/veli/takip` | Ders eğilimi, deneme trendi, güçlü / destek alanları |
| Koçluk | `/panel/veli/kocluk` | Haftalık hedef, plan gerçekleşme, paylaşılan koç özeti |
| Haftalık özet | `/panel/veli/haftalik` | Yayınlanmış öğretmen özeti + sistem yaklaşanları (ayrı) |

## Ana sayfa blokları (en fazla 6)

1. Genel durum
2. Bu haftanın özeti (deterministik metin; Dino isteğe bağlı)
3. Bu hafta (plan / katılım / çalışmalar / yaklaşanlar)
4. Akademik gelişim
5. Koçluk (yalnız Online Koçum varsa)
6. Gereken aksiyon (yalnız gerçek veli eylemi varsa; yoksa sakin boş durum)

## Dil

- Kullanılmaz: “Risk skoru: 74”, teşhis, sınıf sırası, utandırıcı etiketler
- Kullanılır: “Son iki haftada çalışma düzeninde düşüş var.”, “Matematik performansı yükseliyor.”

## Haftalık özet

`parentWeeklyDigest` bayrağı açıksa:

- **Yayınlanmış özet:** öğretmen önizleyip yayınladığı `calm-digest-v1` metni
  - Neler iyi gidiyor?
  - Nerede destek gerekiyor?
  - Önümüzdeki hafta ne var?
- **Sistemden görünenler:** takvim / koçluk kayıtlarından otomatik yaklaşanlar  
  İki kaynak aynı kartta karıştırılmaz.

## Çoklu çocuk

- `resolveParentScope` URL `studentId` değerini yalnız bağlı çocuklar arasında arar.
- Bağlı olmayan kimlik → `404` (sessizce başka çocuğa düşülmez).
- `ChildSwitcher` + menü `withParentStudentContext` seçimi korur.

## Veliye özellikle gizlenen bilgiler

| Kategori | Neden gizli |
| --- | --- |
| Öğretmen özel ders notları (`LessonNote` özel alanlar) | Öğrenciye özel pedagojik not; aileye açılmaz |
| Koç birebir özel görüşme notları (`privateNote`) | Yalnız koç ekranında; `getStudentCoaching` seçmez |
| Diğer öğrenciler | Yatay erişim yok; scope yalnız bağlı çocuk |
| İç operasyon risk skorları / müdahale vaka notları | Öğretmen operasyonu; veliye vaka ekranı yok |
| Ticari internal / audit kayıtları | Operasyon ve uyum alanı |
| Öğrenci check-in / yardım serbest metni | Varsayılan mahremiyet; veliye açılmaz |
| Akran karşılaştırması / sınıf sıralaması | Kaygı üretmez; yalnız kendi geçmişi |

## Dino AI

Bayrak açıksa ana özetin altında contextual “Bu haftayı açıkla” katmanı vardır.
Akademik bölümde destek alanı ve deneme değişimi için ek Dino aksiyonları
açılabilir. Ana bilgi kaynağı deterministik özet kalır; Dino zorunlu değildir.

Ayrıntılı mimari: `docs/dino-context-architecture.md`.

## Testler

- Unit: `lib/panel/parent-calm.test.ts`, mevcut `parent-home-summary.test.ts`
- Yatay erişim: `tests/e2e/panel-access.spec.ts` (yabancı `studentId` → 404)
- Senaryolar: tek çocuk, çoklu çocuk, veri yok, plan yok, haftalık digest, mobil
