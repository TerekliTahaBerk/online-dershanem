# Admin ve Ogrenci Paneli Temeli

Bu dokuman Faz 1 kapsaminda admin ve ogrenci paneli icin veri omurgasini, yetki modelini ve uygulama sirasini sabitler.

## Teknoloji Karari

- Frontend: Next.js 15 App Router + React 18 + TypeScript
- UI: Tailwind CSS + ortak tasarim tokenlari
- Backend: Next.js server actions ve route handlers
- ORM: Prisma
- Veritabani: PostgreSQL
- Kimlik dogrulama: NextAuth

## Fazlar

### Faz 1

- Rol ve panel erisim modelini sabitle
- Paket uyeliklerini iliski tablosuna tasi
- Kurs, modul ve icerik hiyerarsisini ekle
- Ogrenci ilerleme, hedef, deneme ve bildirim modellerini ekle
- Seed verisini admin, ogretmen, ogrenci ve icerik akislarini besleyecek sekilde zenginlestir

### Faz 2

- Admin dashboard KPI sorgularini yeni modellerle besle
- Ogrenci, ogretmen, paket ve icerik yonetimi ekranlarini tamamla
- Icerik yayinlama ve ogrenciye atama akislarini bagla
- Audit log ve bildirim tetiklerini action seviyesinde ekle

### Faz 3

- Ogrenci ana panelini course progress, metric snapshot ve exam result ile besle
- Derslerim, takvimim, odemelerim ve profilim ekranlarini yeni iliskilerle birlestir
- Deneme analizi ve zayif konu ekranini subject/topic istatistikleriyle bagla

### Faz 4

- Admin ekledigi icerigin ogrenci paneline yansimasini dogrula
- Paket degisikligi, ders planlama ve deneme sonucu akisini test et
- Yetki, veri tutarliligi ve regresyon testlerini tamamla

## Yetki Matrisi

### Admin

- Ogrenci, ogretmen, paket, kurs, modul, icerik, deneme sonucu ve bildirim yonetebilir
- Audit log olusturur
- Tum dashboard verilerini gorebilir

### Ogrenci

- Kendi kurs ve paket verisini gorebilir
- Kendi ilerleme, hedef, deneme ve bildirim kayitlarini gorebilir
- Profil bilgisini guncelleyebilir

### Ogretmen

- Atandigi ders ve ogrenci akislarini gorebilir
- Ders notu ve ilerleme geri bildirimi girebilir

## Veri Omurgasi

### Var olan cekirdek

- `User`
- `Student`
- `Teacher`
- `Lesson`
- `Package`
- `PurchaseIntent`
- `PurchaseEvent`

### Faz 1'de eklenen modeller

- `StudentPackageEnrollment`
- `Course`
- `CourseModule`
- `CourseContent`
- `PackageCourse`
- `StudentCourseProgress`
- `StudentContentProgress`
- `StudentGoal`
- `StudentExamResult`
- `StudentExamSubjectStat`
- `StudentExamTopicStat`
- `StudentMetricSnapshot`
- `Notification`
- `AuditLog`

## Veri Akisi

1. Admin bir `Package` ve buna bagli `Course` tanimlar.
2. Kurs `CourseModule` ve `CourseContent` ile yayinlanir.
3. Ogrenci pakete `StudentPackageEnrollment` ile baglanir.
4. Panel ilerlemesi `StudentCourseProgress` ve `StudentContentProgress` uzerinden hesaplanir.
5. Deneme sonucunda `StudentExamResult` ve alt istatistikler yazilir.
6. Olaylar `Notification` ve `AuditLog` ile izlenir.

## UI'yi Besleyecek Sorgu Kaynaklari

- Admin dashboard:
  `Student`, `Teacher`, `Lesson`, `PurchaseIntent`, `StudentPackageEnrollment`, `Course`, `AuditLog`
- Ogrenci dashboard:
  `Student`, `Lesson`, `StudentGoal`, `StudentMetricSnapshot`, `StudentExamResult`, `Notification`
- Derslerim:
  `StudentCourseProgress`, `Course`, `CourseModule`, `CourseContent`
- Deneme analizi:
  `StudentExamResult`, `StudentExamSubjectStat`, `StudentExamTopicStat`

## Faz 2 Giris Kriterleri

- Prisma schema yeni modellerle dogrulanmis olmali
- Seed ile en az bir admin, ogretmen, ogrenci, paket, kurs ve deneme sonucu uretilmeli
- Yetki matrisi ve veri akisi repo icinde dokumante edilmis olmali
