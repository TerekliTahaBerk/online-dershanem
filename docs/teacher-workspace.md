# Öğretmen günlük çalışma alanı (Part 6)

Öğretmen paneli menü gezmeyi azaltacak şekilde **"Bugün ne yapmam gerekiyor?"**
sorusuna cevap veren bir ana akışa toplandı.

## Ana yüzeyler

| Yüzey | Route | Ne gösterir |
| --- | --- | --- |
| Teacher Home | `/panel/ogretmen` | Bugünkü dersler, bekleyen işler, riskli öğrenciler, yaklaşanlar |
| Öğrenci listesi | `/panel/ogretmen/gruplar` | Risk / plan / son ders / deneme özeti + filtreler |
| Ders kapanışı | `/panel/ogretmen/ders/[id]` | Mevcut quick lesson close workspace |
| Müdahale | `/panel/ogretmen/mudahale` | Kural gelen kutusu + elle "Müdahale oluştur" |

## Feature flag sadeleşmesi

Kapalı bayrak ilgili kalemi hem ana sayfadan hem listeden düşürür:

- `quickLessonClose` → kapanış CTA metni
- `studentCheckIn` → yardım talepleri / yardım filtresi
- `interventionInbox` → açık müdahaleler + oluştur formu
- `adaptivePlan` → plan onayı / plan geride filtresi
- `reviewQueue` → tekrar kuyruğu bekleyenleri
- `mockExamAnalysis` → deneme düşüşü / yaklaşan deneme
- `assignmentEvidence` → değerlendirilmemiş ödevler

## Yatay yetki

- Ana sayfa ve roster sorguları `group.teacherId = session.userId` ile sınırlıdır.
- Öğrenci 360 ve elle müdahale oluşturma kapsam dışı kimlikte `404` döner.
- URL'den `ogrenci=` parametresi yalnız öğretmenin kendi roster'ında varsa formu önceden seçer.

## UX kararları (günlük interaction azaltma)

1. **Tek soru, tek sayfa:** Girişte ders + bekleyen iş + risk + yaklaşanlar birlikte; menü gezmeden ilk aksiyon seçilir.
2. **Yardım talebi üstte:** Açık yardım varsa bekleyen işler derslerin üstüne çıkar.
3. **Ders satırında çoklu CTA:** Dersi aç / öğrenci / materyal / kapanış aynı satırda; ayrı ekran aramak gerekmez.
4. **Hızlı kapanış birincil yol:** Kapanış bekleyen derste CTA doğrudan workspace'e gider; 4 kişilik grupta istisna tabanlı giriş hedefi 1–2 dk.
5. **Risk listesi kısa tutulur:** En fazla 8 öğrenci; "neden + son sinyal + 360" ile tanı koymadan yönlendirir.
6. **Öğrenci listesi kart/özet:** Yoğun admin tablosu yerine mobil uyumlu satırlar ve filtre çipleri.
7. **Elle müdahale 4 alan:** Tip, açıklama, aksiyon, takip tarihi — Student 360'ten `?ogrenci=` ile ön seçimli.

## Testler

- Unit: `lib/teacher-workspace.test.ts`, mevcut `teacher-home-read-model` / `teacher-attention`
- Yatay erişim: mevcut panel-access E2E + müdahale create API scope
- Senaryolar: boş gün, günlük ders, açık yardım, risk listesi, quick close yolu
