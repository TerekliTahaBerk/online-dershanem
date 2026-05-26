# OnlineDershanem (OD) + OnlineDenemeKulübü (ODK)
## UI/UX Redesign Brief — Claude Design Input Document

**Hazırlanma tarihi:** 2026-05-26
**Hazırlayan:** Internal product/eng audit (read-only, kod değişikliği yok)
**Hedef alıcı:** Claude Design (visual + interaction system tasarımı)
**Kapsam:** Public website + 4 panel (Admin / Öğretmen / Öğrenci / Veli) +
ODK exam experience + Analytics + Live Lesson + Payment/Billing + Design System
**Statü:** Discovery & Brief — implementation öncesi tek kaynak.
**Referanslar:** `docs/state-analysis-2026-05-26.md`, `docs/brand-voice.md`,
`docs/panel-system-master-plan.md`, `docs/od-odk-audit-2026-05.md`,
`docs/production-readiness-roadmap.md`.

> Bu doküman **yeniden tasarımın brief'idir**, implementasyon planı değildir.
> Claude Design'ın çıktısı: design system + her panel için high-fidelity
> ekranlar + interaction rules + responsive davranış kuralları.

---

## İçindekiler

- A. Platform Overview
- B. Product Positioning (OD vs ODK)
- C. Feature Map (tam envanter)
- D. User Roles & Permission Model
- E. User Flows (Öğrenci / Öğretmen / Veli / Admin)
- F. Design Goals & Reference Inspiration
- G. Design Language (tone, mood, motion)
- H. Public Website Brief
- I. Admin Panel Brief
- J. Student Panel Brief
- K. Teacher Panel Brief
- L. Parent Panel Brief
- M. ODK Exam Experience Brief
- N. Analytics Experience Brief
- O. Live Lesson Experience Brief
- P. Payment / Billing / Entitlement Brief
- Q. Sidebar / Topbar / Navigation Brief
- R. Design System Brief (token + component)
- S. Responsive / Mobile-First Strategy
- T. Current Design Debt
- U. Redesign Opportunities
- V. Priority Recommendations (Claude Design'a iş sırası)

---

## A. Platform Overview

**Tek monorepo, tek Next.js 15 (App Router) uygulaması** içinde iki ürün:

1. **OnlineDershanem (OD)** — butik (maks. 4 kişilik) online dershane.
   Canlı dersler, sınıflar, ödevler, öğretmen-öğrenci-veli üçgeni,
   ders programı, paket satışı.
2. **OnlineDenemeKulübü (ODK)** — veri-odaklı dijital deneme sistemi.
   TYT/AYT/LGS/KPSS/ALES denemeleri, sınav salonu, autosave + cheat
   tracker, kazanım analizi, paket + erişim tag sistemi.

**Teknik kısa profil:**
- Next.js 15 App Router, React Server Components.
- Prisma 6 + Postgres (Neon), 76+ model.
- NextAuth v4 (JWT).
- Tailwind CSS + custom `pd-*` (Premium Design) token sistemi
  (theme-aware, light + dark).
- Pusher (realtime) + Expo Push + iki-katmanlı cache (Upstash + memory).
- Vercel Cron (8 job), AuditLog her kritik mutation'da.
- Expo (React Native) mobil app — JWT, push token, parent/student/teacher
  endpoint aileleri.
- PayTR iframe ödeme (ODK uçtan uca, OD yarım).
- KVKK akışı (data export + soft delete + cron hard-delete) tam.

**Mevcut olgunluk:** ~%75–80. Backbone üretim seviyesinde, kritik UX
açıkları belirli ve sayılı (bkz. T bölümü).

**Markaların görsel kimliği (mevcut):**
- Off-white / paper paleti: `#FAFAF7`, `#F1EFE9`, `#FBFBF8`
- Olive accent: `#3A4A2C` (OD ana renk)
- Pastel ikincil tonlar: sky, yellow, mint, blush, lavender
- Display serif + sans body
- "Linear / Notion / Opennote-vari" sade, kağıt hissi yüksek estetik

---

## B. Product Positioning

### B.1 OD — "Butik online dershane"

> Özel dersin yakınlığı, dershanenin ekonomisi.

- **Hedef kitle:** Veliler birincil karar verici, öğrenci kullanıcı.
- **Vaad:** Maks. 4 kişilik gruplar, kişisel takip, veli paneli, haftalık
  ritim ("Pazar 14:00 deneme, Pazartesi 09:00 rapor").
- **Görsel ton:** Sıcak, profesyonel, eğitimci, güven veren.
  Olive + mint + cream + sıcak sarı vurgu.
- **Tasarım hissi:** "Premium butik" — Linear'ın disiplini + Notion'un
  kağıt sıcaklığı.

### B.2 ODK — "Veri-odaklı deneme sistemi"

> Deneme bittiğinde çalışma başlasın.

- **Hedef kitle:** Lise/üniversite/sınav hazırlık öğrencisi birincil
  kullanıcı; bireysel satış + B2B.
- **Vaad:** Türkiye'nin en iyi dijital sınav salonu deneyimi, ÖSYM
  standardı puanlama, kazanım analizi, autosave + güvenli oturum.
- **Görsel ton:** Daha "tool / utility" — Stripe Dashboard + Linear
  disiplini, daha az sıcak süs, daha çok density + clarity.
- **Accent:** ODK için `sky` veya `lavender` ikincil aksan (OD olive
  korunarak); ürün switcher'da görsel ayırım yapan tek değişken.

### B.3 Marka ayrımı kuralı (tek satır)

> **Aynı design system, iki accent ve iki ton mood.**
> OD = warm-paper + olive. ODK = cool-paper + lavender/sky.
> Logo lockup, typography, spacing, component vocabulary ortak.

---

## C. Feature Map (tam envanter)

Aşağıdaki liste **tasarımı yapılacak yüzeylerin tamamı**. Hiçbir feature
atlanmamıştır. (Detaylı durum için `docs/state-analysis-2026-05-26.md` §D.)

### C.1 Public website (marketing + conversion)

- Ana sayfa (`/`) — 14 section: hero, metrics, programs, OD preview,
  ODK preview, how-it-works, comparison, weekly-study-flow, teachers
  preview, testimonials, video testimonials, pricing, faq, yellow CTA,
  final CTA, footer.
- OD landing (`/online-dershane`)
- ODK landing (`/deneme-kulubu`, `/odk-paketleri`)
- Paketler (`/paketler`) — OD/ODK karışık
- Sınav sayfaları (`/tyt`, `/ayt`, `/lgs`, `/yks`)
- Programs: `/online-ozel-ders`, `/kamplar`
- Hocalar (`/hocalar`), Başarı hikayeleri (`/basari-hikayeleri`)
- Blog (`/blog`, `/blog/[slug]`)
- SSS (`/sss`), Misyonumuz, Kariyer, İletişim
- Auth: `/giris`, `/kayit`, `/sifremi-unuttum`
- Sepet/checkout: `/sepet`
- Legal: `/gizlilik`, `/kvkk`, `/iade`
- OG image generator (10 route), dinamik sitemap

### C.2 Admin panel

Dashboard (OD), Dashboard (ODK), Öğrenciler, Öğretmenler, Veliler,
Veli-öğrenci bağlama, Sınıflar, Dersler (Course), Ders programı,
Canlı dersler, Ödevler, Paketler (OD), Paketler (ODK), Ödemeler (OD),
Ödemeler (ODK), Muhasebe, Denemeler (ODK), ODK Siparişler, ODK
Erişim tagları, Cheat/proctor logları, Kazanım analizi, Audit logs,
Background jobs (eksik), Bildirimler/Inbox, Ayarlar, Yetkiler (RBAC),
Maaşlar/Payroll, İstatistikler, Raporlar, Hesap silme talepleri,
İndirim kodları, Devamsızlık, Admin inbox.

### C.3 Öğretmen panel

Dashboard, Bugünkü dersler, Canlı dersler, Yoklama (quick UI),
Sınıflarım, Öğrencilerim (risk badge), Öğrenci notları, Ödevler
(auto-advance), Deneme analizleri (ODK), Riskli öğrenciler,
Bildirimler, Profil, Veliye mesaj (yarım), Kazanclarım (Payroll),
Sınıf duyurusu (eksik), Mesajlar.

### C.4 Öğrenci panel

Dashboard, Sınıfım, Derslerim, Canlı dersler, Ders detayları,
Ödevler, Performansım, Öğretmenlerim, Bildirimler, Profil, Paketim;
ODK alt-ürünü: Dashboard, Aktif denemeler, Sınav salonu, Sonuç,
Analiz (kazanım), Dereceler (eksik), Yardım, Geri bildirim (eksik).

### C.5 Veli panel

Dashboard (R5 rebuild), Çocuklarım, Çocuk detayı (zayıf),
Canlı ders takibi (eksik), Devamsızlık, Ödev durumu, Deneme sonuçları,
Kazanım analizi, Öğretmen notları, Bildirimler, Ödeme durumu,
Öğretmenle iletişim (eksik), Profil + KVKK.

### C.6 Cross-cutting platform features

- Realtime (Pusher SSE) — bildirim, lesson durumu, exam state.
- Notification merkezi (Notification + InboxMessage, çift sistem).
- Cron jobs (8): lesson reminders, assignment reminders, parent weekly
  digest, notification digest, email retry, account deletion, KVKK,
  vb.
- AuditLog — admin görüntüleyicisi.
- KVKK: data export, account deletion request, 24h soft → cron hard
  delete.
- Coupon / discount.
- Cheat/proctor: focus loss, copy attempt, tab switch, fullscreen
  exit → `OdkExamAttemptEvent`.
- Cache invalidation (TTL only — invalidation UI yok).

---

## D. User Roles & Permission Model

5 rol, JWT'de `role` claim:

| Rol | Birincil kapsam | Ürün erişimi |
|---|---|---|
| **ADMIN** | tüm operasyon | OD + ODK |
| **TEACHER** | kendi sınıf/öğrenci scope'u | OD birincil, ODK bazı analiz |
| **STUDENT** | kendi içerik + paket entitlement | paketine göre |
| **PARENT** | bağlı çocukları | çocuğun entitlement'ı |
| **STAFF / SUPPORT** | (rol var, UI az) | sınırlı admin |

**Tasarım implikasyonu:**
- Tek panel shell (`/panel/...`), rol bazlı sidebar üretimi
  (`getSectionsForRole`).
- Product switcher (OD / ODK) bağlam aksanını ve menü filtresini
  değiştirir.
- Admin → "View-as" (impersonation) feature'ı eksik ama tasarımı
  yapılmalı (rol/öğrenci perspektifinden ekran kontrolü).
- Entitlement → paket yoksa "Yükselt / Satın al" empty state.

---

## E. User Flows (must-design)

### E.1 Öğrenci flows

1. **Kayıt + onboarding**
   `/kayit` → e-posta doğrulama → `/panel/ogrenci` ilk açılışta
   ürün-bağlı tanıtım kartları (OD ya da ODK ya da ikisi).
2. **Dashboard girişi**
   "Bugün ne var?" — bugünkü canlı dersler, açık ödevler, aktif
   denemeler, son bildirimler. Tek ekran, tek bakış.
3. **Canlı derse katılma**
   Dashboard → ders kartı → countdown / "katıl" CTA → lesson
   lifecycle state (waiting / live / ended) → Meet açılır.
   *Mevcut: link click only; tasarımda waiting/live state ve
   countdown şart.*
4. **Ödev görüntüleme + teslim**
   Ödevler → liste → detay → dosya yükle / inline cevap → submit
   → toast.
5. **Deneme çözme (ODK)**
   ODK dashboard → aktif denemeler → "Başla" → tam ekran focus mode
   (sidebar/topbar gizli) → PDF iframe sol + optical form sağ + sticky
   timer + autosave indicator + cheat warning counter → submit
   confirm modal (boş sayısı, doğru/yanlış henüz değil) → sonuç
   ekranı (net, score, percentile placeholder) → kazanım analizi.
6. **Analiz inceleme**
   Bölüm bazlı net + kazanım heatmap + bireysel ilerleme grafiği +
   "şu kazanımda zayıfsın, şu içeriği çalış" cross-sell.
7. **Paket görüntüleme + upgrade**
   Paketim → aktif paket card + kalan süre + içerik listesi +
   "yükselt" CTA → checkout.
8. **Bildirim**
   Topbar bell → açılır panel (read/unread filter) → ya da
   `/panel/.../bildirimler` tam liste.

### E.2 Öğretmen flows

1. **Dashboard**
   Bugün: dersler, yoklama bekleyenler, gradlenmemiş ödevler,
   riskli öğrenci sayısı.
2. **Canlı ders başlatma** *(target experience)*
   Bugünkü ders kartı → "Dersi başlat" (lifecycle PENDING→LIVE) →
   Meet açılır → otomatik yoklama topla → manuel override pill UI →
   "Dersi bitir" → özet (kim katıldı, geç kim kaldı).
3. **Yoklama** — R4'te quick UI çalışıyor; pill (var/yok/geç/mazeretli) +
   sınıf preset + risk rozeti. Tasarım korunup standartlaştırılmalı.
4. **Öğrenci analizi**
   Öğrencilerim → öğrenci detay → devam, ödev, ODK perf, kazanım,
   notlar tek timeline.
5. **Ödev yönetimi**
   Ödev oluştur (sınıf seç → dosya → due) → bulk assign → öğrenci
   submission → grade auto-advance flow.
6. **Öğrenci notları**
   TeacherComment + StudentNote ayrımı UI'da belirsiz → tek "Notlar"
   sekmesi + tag (academic / behavioral / parent-visible).
7. **Riskli öğrenciler**
   Risk skoru + neden listesi (devam/ödev gecikme) + tek-tıkla
   aksiyon (mesaj/randevu).
8. **Veli ile mesaj** *(eksik, tasarlanmalı)*
   InboxMessage thread.

### E.3 Veli flows

1. **Dashboard**
   R5 rebuild ile çalışıyor: çocuk başına kart + critical alert +
   weekly digest. Tasarım dilini buradan al.
2. **Çocuk takibi (detay sayfası — REBUILD GEREKLİ)**
   OD + ODK birleşik timeline: devam, ödev, deneme, not, ödeme,
   öğretmen mesajı.
3. **Devamsızlık**
   Liste + ay görünüm + kritik eşik vurgusu.
4. **Ödev durumu**
   "Bekleyen / Teslim edildi / Geç teslim / Notlandı" sekmeli.
5. **Deneme sonuçları**
   ODK + manuel ExamResult karma timeline. Veli için **terminoloji
   sadeleştirilmeli** (kazanım = "konu", net = "doğru-yanlış skoru").
6. **Bildirimler**
   Critical / digest / channel preference (push, e-posta, in-app).
7. **Öğretmenle iletişim** *(eksik, tasarlanmalı)*
   InboxMessage thread + permission (kendi çocuğunun öğretmeni).
8. **Ödeme durumu**
   Aktif paketler + fatura geçmişi + "yenile" CTA.

### E.4 Admin flows

1. **Operasyon dashboard**
   Bugünün KPI'ları: aktif öğrenci, bekleyen ödeme, geciken yoklama,
   açık talep, son cron run, son audit anomalisi. "Command center"
   hissi.
2. **Öğrenci yönetimi**
   Liste (filter, search, bulk) → detay → tab'lı (akademik /
   paket / veli / not / audit).
3. **Öğretmen yönetimi**
   Aynı pattern + Payroll sekmesi.
4. **Paketler**
   OD + ODK ayrı tablar (aynı şablon). Drawer-based create.
5. **Ödemeler**
   OD (lead-style yarım) + ODK (otomatik tam). Refund action + state
   transition log.
6. **Denemeler**
   Wizard ile create → detail editor (PDF, JSON answer key, kazanım,
   access tag). Hem wizard hem editor mevcut, görsel olarak premium
   "tool feel" eksik.
7. **Analytics**
   Cached dashboard'lar. Export (CSV/Excel) eksik.
8. **Audit logs**
   Filter chip + range search + entity linkleri. Mevcut hâli sade.
9. **Background jobs (EKSİK — tasarlanmalı)**
   Cron run history, last error, manual trigger button.
10. **Muhasebe**
    AccountingEntry tablosu + service filtresi (OD/ODK).

---

## F. Design Goals & Reference Inspiration

### F.1 Hedef hissiyat (sıralı)

1. **Linear-disiplin:** keskin spacing, az renk, çok hiyerarşi.
2. **Stripe Dashboard density:** information-dense ama nefes alır.
3. **Notion yumuşaklığı:** "kağıt" hissi, sıcak off-white, serif
   display.
4. **Opennote / butik SaaS:** premium eğitim platformu, jenerik
   ed-tech değil.
5. **Realtime-feeling:** state transitions belirgin, "diri" hissi
   (ders LIVE rozeti, autosave nabız, online dot).

### F.2 Kaçınılacak hisler

- ❌ Bootstrap-vari boş yuvarlak köşeler ve mavi linkler ("classic
  ed-tech").
- ❌ Marketing-page gradient overload.
- ❌ Material Design'ın aşırı elevation/shadow oyunu.
- ❌ Dashboard "widget salad" (dağınık card grid).
- ❌ Veli için aşırı jargon (kazanım, net, percentile yerine sade
  Türkçe).
- ❌ Öğretmen panelinde marketing CTA agresifliği.

### F.3 Brand voice ile uyum (zorunlu)

`docs/brand-voice.md`'den özet:
- Vaad → mekanik: "Pazar 14:00 deneme, Pazartesi 09:00 rapor."
- Sen-dili (öğrenci).
- Bilgi tonu (veli).
- Fiil, mecaz değil.
- Tek vaad, tek cümle.
- Yasaklı: "kaliteli eğitim", "sektörün lideri", "değerli velimiz",
  "%100 garanti".

Tasarımdaki bütün copy stub'ları bu kurala bağlı kalır.

### F.4 Per-panel mood matrix

| Panel | Mood | Density | Renk sıcaklığı | Notlar |
|---|---|---|---|---|
| Public site | Premium butik | Düşük (nefes alır) | Sıcak (cream + olive) | Marketing |
| Admin | Command-center | Yüksek | Nötr | Tool, hızlı |
| Student | Motive edici | Orta | Sıcak + motive ediciaccent | "İlerliyorsun" |
| Teacher | Operasyonel | Orta-yüksek | Nötr | Tool feel |
| Parent | Sade, güven verici | Düşük | Sıcak | Kısa cümle, az veri yoğunluğu |
| ODK exam | Low-distraction | Çok düşük (focus mode) | Cool, az renk | Yalnızca soruya odak |

---

## G. Design Language

### G.1 Mevcut token altyapısı (KORUNACAK)

`tailwind.config.ts` + `app/globals.css` zaten **theme-aware pd-*
token sistemi** kurmuş. Claude Design bu sistemi **revize edip
genişletmeli**, sıfırdan üretmemeli.

**Mevcut anahtarlar:**
- Surface: `--pd-bg`, `--pd-bg-elevated`, `--pd-bg-subtle`,
  `--pd-bg-muted`
- Ink: `--pd-ink`, `--pd-ink-2`, `--pd-ink-3`, `--pd-muted`,
  `--pd-muted-2`
- Lines: `--pd-line`, `--pd-line-2`, `--pd-line-strong`
- Accent: `--pd-accent` (olive `#3A4A2C`), `--pd-accent-hover`,
  `--pd-accent-soft`
- Sidebar: dedicated tokens
- Pastel scale (sky/yellow/mint/blush/lavender) — info, warn, success,
  danger, special için

**Mevcut typography:**
- `od-display 36/44`, `od-h1 28/36`, `od-h2 22/30`, `od-h3 18/26`,
  `od-body 14/22`, `od-small 13/20`, `od-tiny 12/18`
- Display: serif (var --font-display)
- Body: sans (var --font-sans)

**Mevcut shadow scale:** `od-sm`, `od-md`, `od-lg`, `od-xl` (soft,
çok düşük opacity).

**Mevcut motion:**
- `od-fade-in 200ms ease-out`
- `od-slide-up 220ms cubic-bezier(0.2, 0.8, 0.2, 1)`
- `od-slide-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)`

### G.2 Brief'in design language hedefi

Claude Design **bu altyapıyı**:
- ✅ Validate edip kullansın (sıfırdan token üretmesin).
- ✅ Eksik tokens için ekleme önersin: `--pd-data-grid-bg`,
  `--pd-realtime-pulse`, `--pd-product-od-accent`,
  `--pd-product-odk-accent` (per-product accent override).
- ✅ Light + dark her ikisini eşit kalitede tasarlasın (dark zaten
  altyapıda var).
- ✅ Semantic ↔ raw token ayrımı yapsın: `--pd-success-bg`,
  `--pd-warn-bg` gibi semantic'ler pastel raw'lara map'lensin.

---

## H. Public Website Brief

### H.1 Mevcut durum kısa

14 section ana sayfa + 25+ alt sayfa. SEO + OG generator olgun.
Brand voice tutarlı. Marka ayrımı navbar'da net ama paketler
sayfasında karışık.

### H.2 Tespit edilen sorunlar

| # | Sorun | Önem |
|---|---|---|
| H-1 | OD ve ODK paketleri tek listede → kullanıcı "ne aldığını" anlamıyor | 🟠 |
| H-2 | OD paket satın alma CTA'sı PayTR'ye değil, lead/iletişim form'una gidiyor | 🔴 (ürün) |
| H-3 | SSS kategorize değil (öğrenci/veli/ödeme/teknik); tek uzun liste | 🟡 |
| H-4 | Blog `/blog/[slug]` TOC + related + breadcrumb JSON-LD eksik | 🟡 |
| H-5 | `/tyt`, `/ayt`, `/lgs`, `/yks` sayfalarından ODK paketlerine cross-sell yok | 🟡 |
| H-6 | `/online-ozel-ders` standalone; OD paketleriyle ilişkisi yok | 🟡 |
| H-7 | Mobile'da sticky CTA / bottom nav yok | 🟡 |
| H-8 | "Küçük grup canlı ders" claim hero'da güçlü, ama proof element az (real ders fotoğrafı / öğretmen yüzleri yetersiz) | 🟡 |
| H-9 | Pricing section comparison karmaşık; tek bakışta "ne içerir" netliği zayıf | 🟡 |
| H-10 | Hero CTA hierarchy çok rakip ("Ücretsiz dene", "Paketleri gör", "Sınava katıl") — tek primary'ye düşürülmeli | 🟡 |

### H.3 Claude Design'a talep

#### H.3.1 Genel direktif

Public site **mevcut "Linear x Opennote x Notion" hissini** korusun.
Tonu yumuşatma, daha **butik / premium** hale getir. Marketing
clichelerini tasarımla bastır (boyut, hierarchy, beyaz alan).

#### H.3.2 Section-by-section redesign

1. **Hero** — single primary CTA, secondary text-link. Sağda *real*
   teacher headshot grid veya küçük grup ders fotoğrafı. "Pazar 14:00
   deneme, Pazartesi 09:00 rapor" tipi mekanik vaad.
2. **Metrics strip** — sayılar gerçek (brand voice kuralı). Üç sayı
   max, büyük serif rakamlar.
3. **Programs section** — OD ve ODK iki kart, ürün accent ayrımı
   tasarımda gözüksün. Her kart 2 cümle + 1 CTA.
4. **How it works** — 3 adım: kayıt → planlama → ritim. Editorial
   illüstrasyon (vektör, çok renkli değil).
5. **OD preview** — küçük grup ders fotoğrafı + 3 vaad chip + CTA.
6. **ODK preview** — sınav salonu mock'u (dashboard UI screenshot
   olarak), "deneme bittiğinde rapor açılır" vaadi.
7. **Comparison** — "Özel ders vs Klasik dershane vs OD" 3-kolon
   tablo. Premium tablo tasarımı (bkz. R.7).
8. **Weekly study flow** — haftalık ritim grafik (cumartesi deneme,
   pazartesi rapor, vb.) — editorial chart.
9. **Teachers preview** — yatay scroll, hover'da bio. Real foto.
10. **Testimonials** — quote-driven, "X annesi", "Y öğrencisi"
    ad+sınıf. Video testimonials için aynı section'da inline preview.
11. **Pricing** — OD ve ODK iki kolon, her birinde 2-3 plan. Kart
    içinde "ne içerir" çek-listesi. **Plan adları kısa olsun.**
12. **FAQ** — kategorize (Genel / Ödeme / Öğrenci / Veli / Teknik).
    Search yok, accordion var.
13. **Final CTA** — full-bleed olive arka plan, beyaz serif başlık,
    tek CTA.
14. **Footer** — 4 kolon: Ürün / Sınav / Şirket / Yasal. Newsletter
    YOK (KVKK gereği opt-in burada zor).

#### H.3.3 Paketler sayfası özel

- **Sekme veya tab**: "Online Dershane" / "Deneme Kulübü" net ayrım.
- Her sekmede 2-3 plan kartı.
- Kart altında: "Ne dahil değil" (transparency).
- "Bu paket hangi sınav için?" filter chip (TYT, AYT, LGS, YKS).
- Comparison table tek-bakışta kararlaştırıcı.
- OD planları için **"Görüşme planla"** CTA'sı OD-PayTR canlıya
  geçene kadar paralel olarak gözüksün (graceful).

#### H.3.4 Blog yeniden

- Article header: kategori chip + okuma süresi + tarih + yazar.
- TOC sticky sol kolon (desktop).
- Related posts altta (kategori bazlı).
- Breadcrumb JSON-LD.
- Cover image opsiyonel ama 16:9 lock.

---

## I. Admin Panel Brief

### I.1 Hedef hissiyat

**"Command center."** Linear + Stripe Dashboard. Tablo merkezli,
filter-driven, drawer-heavy. Marketing renk YOK, yalnızca semantic
renkler (success/warn/danger).

### I.2 Anchor screens

1. **Operasyon dashboard**
   - 4 KPI tile (aktif öğrenci, bugün ders, bekleyen ödeme, riskli
     öğrenci) — sade rakam + delta.
   - 2 panel: "Cron job son durumu" (sistemsel sağlık) + "Son audit
     anomalileri" (operasyonel sağlık).
   - 1 zaman tüneli: bugünkü olaylar (yeni satış, hesap silme talebi,
     refund, vb.).
2. **Liste sayfası şablonu (öğrenci / öğretmen / veli / paket / ödeme
   / deneme)** — **tek bir grid component standardı**:
   - Sticky header (search + filter chips + bulk action bar).
   - Density toggle (compact / comfortable).
   - Column visibility selector.
   - Row hover'da action button cluster.
   - Pagination (server-side, mevcut helper wire edilmeli).
   - Empty state with primary CTA.
3. **Detay sayfası şablonu** — sol kolon kimlik kartı + sağda tablar
   (akademik / paket / veli / not / ödeme / audit). Drawer'lar
   inline action'lar için (notification gönder, paket ata, refund).
4. **Wizard şablonu** — adımlı (1/4, 2/4, ...), sticky footer
   (Geri / Devam / İptal), validation summary üstte. Deneme oluşturma
   wizard'ı buradan inspire alıyor.
5. **Audit logs** — chronological feed + sol filter rail (actor,
   action, refType, range, severity).
6. **Background jobs (NEW)** — cron tablosu: job adı, son run,
   süre, exit status, last error, "manual run" button (audit'li).

### I.3 Critical UX kuralları

- **Drawer for quick, page for complex.** Hesap edit → drawer; paket
  oluşturma → wizard; deneme oluşturma → wizard + detail page.
- **Toast** her server action sonucunda.
- **Confirm modal** silme/iptal/refund'da; destructive button kırmızı
  semantic, ikincil "İptal" text-button.
- **"View-as" / impersonation** topbar action menüsünde (admin only,
  audit'li).
- **Product switcher** sidebar üstünde, OD/ODK accent'i değiştirir.
- **Command palette (`⌘K`)** rol bazlı komut listesi (mevcut altyapı
  `lib/panel-nav.ts` + `command-palette.tsx`).

---

## J. Student Panel Brief

### J.1 Hedef hissiyat

**"Motive edici ama dağınık değil."** Öğrenci için tek bakışta "bugün
ne var, ne yaptım, neredeyim". Gamification light dokunuşu (streak,
weekly progress) ama jenerik rozet/coin yok.

### J.2 Anchor screens

1. **Dashboard ("Bugün")**
   - Hero: "Bugün 2 ders + 1 deneme + 3 ödev." Tek cümle özet.
   - 4 widget: bugünkü dersler (countdown'lı), açık ödevler (due
     date), aktif denemeler (kalan süre), son bildirimler.
   - Sağda mini "haftalık ritim" widget'i: hafta görünümü pill grid.
2. **Derslerim** — kart grid, ders öncesi/sırası/sonrası state ayrı
   (waiting, live, ended). LIVE rozeti nabız animasyonlu.
3. **Ödevler** — tab: bekleyen / teslim / notlu. Filter chip per ders.
4. **Performansım** — 3 chart: net trend, devam oranı, kazanım
   heatmap. Açıklayıcı tek cümle her chart üstünde.
5. **ODK Dashboard** — ürün accent değişir (sky/lavender), aynı
   shell. "Aktif deneme" CTA güçlü.
6. **ODK Aktif denemeler** — kart grid (deneme adı, süre, başlama
   tarihi, "Başla" CTA). "Henüz çözmedin" badge.
7. **ODK Sonuç + Analiz** — bkz. M (Exam Experience Brief).
8. **Paketim** — aktif kart + kalan süre çubuğu + içerik checklist +
   "yükselt" CTA.
9. **Profilim** — sade form + KVKK kartı (data export, hesap silme).

### J.3 Empty + loading states

- "Henüz deneme çözmedin" → primary CTA + tek cümle motive eden Türkçe.
- Loading: skeleton (gerçek shape; spinner değil).
- Error: kısa Türkçe + retry button.

---

## K. Teacher Panel Brief

### K.1 Hedef hissiyat

**"Operasyonel tool."** Density yüksek, click sayısı düşük.
"Bugün yapılacaklar"ı tek ekrandan bitirebilmeli.

### K.2 Anchor screens

1. **Dashboard ("Bugün")**
   - Bugünkü dersler timeline (saat sırasıyla).
   - Yoklama bekleyenler (CTA: hızlı yoklama).
   - Notlandırılmamış ödevler.
   - Riskli öğrenciler (top 5).
2. **Yoklama (mevcut UI iyi)** — pill (var/yok/geç/mazeretli) +
   bulk preset (hepsi var) + risk badge. Korunup standartlaştırılmalı.
3. **Öğrencilerim** — risk badge sütunu + arama + filter (sınıf,
   risk eşiği).
4. **Öğrenci detayı (NEW unified)** — tek timeline: devam, ödev,
   ODK perf, not, mesaj. Sol kolon: kimlik + veli iletişim quick
   action.
5. **Ödevler** — auto-advance grading view (R4 zaten iyi).
6. **Riskli öğrenciler** — risk skoru + neden listesi + "veliye mesaj
   gönder" CTA.
7. **Veliye mesaj (NEW)** — InboxMessage thread UI.
8. **Sınıfa duyuru (NEW)** — compose modal + öğrenci/veli toggle +
   "kanal seç" (in-app, push, e-posta).
9. **Kazanclarım (Payroll)** — aylık breakdown + status (pending /
   paid).

### K.3 Yoklama UX kuralı (NB)

- **Tek tıkla "hepsi var" preset** + outlier'lar tek tıkla işaretle.
- Geç/mazeretli için süre/sebep modal.
- Submit → toast + "geri al" 5s undo.

---

## L. Parent Panel Brief

### L.1 Hedef hissiyat

**"Sade, güven verici."** Veli **birincil müşteri** (özellikle OD).
Az kelime, büyük rakam yok, "iyi mi / kötü mü" net hissi.
**Jargonsuz Türkçe.**

### L.2 Anchor screens

1. **Dashboard (R5 base — koru, polish et)**
   - Çocuk başına kart: durum (iyi/dikkat/kritik renkli rozet),
     bu hafta devam %, son deneme net, son ödev durumu.
   - Critical alert banner (varsa) en üstte.
   - "Bu haftaki özet" küçük chart (sade).
2. **Çocuklarım listesi** — kart grid (R5 standardı).
3. **Çocuk detayı (REBUILD — kritik)**
   - Sol: kimlik + okul + sınıf + öğretmen + iletişim quick.
   - Sağ: birleşik timeline (OD + ODK iç içe): ders, devam, ödev,
     deneme, not, ödeme. Filter chip (kategori).
   - Üstte: 3 KPI (devam %, ödev tamamlama %, son deneme).
   - Tab: "Haftalık özet" / "Notlar" / "Mesajlar" / "Belgeler".
4. **Devamsızlık** — ay görünümü grid + liste.
5. **Ödev durumu** — sekmeli (bekleyen / teslim / notlu / geç).
6. **Deneme sonuçları** — kart liste, "konu zayıflığı" sade dil
   ("Çocuğun **paragraf** konusunda zorlanıyor").
7. **Öğretmenle iletişim (NEW)** — thread UI (öğretmen-veli
   permission'lı).
8. **Ödeme durumu** — aktif paketler + fatura geçmişi + "yenile" CTA.
9. **Profilim + KVKK** — bildirim tercihleri (weekly digest aç/kapa,
   critical-only).

### L.3 Veli için terminoloji rehberi

| Teknik (kullanma) | Veli dili (kullan) |
|---|---|
| Kazanım | Konu |
| Net | Doğru-yanlış skoru |
| Percentile | Sıralama |
| Attempt | Deneme |
| Submission | Teslim |
| Risk skoru | Dikkat seviyesi |

---

## M. ODK Exam Experience Brief

> Hedef: **Türkiye'deki en iyi dijital deneme deneyimi.**

### M.1 Mod ve davranış

- **Tam-ekran focus mode** — sidebar/topbar yok. Sadece exam shell.
- **Sticky timer** sağ üst — son 5 dakikada renk olive→amber→red.
- **Autosave indicator** — sol üst, küçük nabız + "Son kayıt 14:32".
  Internet koptuğunda **inline banner: "Bağlantı koptu, son cevabın
  saklı, tekrar bağlanıyoruz..."** + reconnect olunca **"Bağlandı,
  kaldığın yerden devam ediyorsun"**.
- **Cheat warning counter** — sticky, "Uyarı 1/3" tipi.
- **Section navigator** — sol sticky veya alt sticky drawer
  (mobile/tablet).
- **Answer palette** — soru numara grid, doğru/işaretli/boş için 3
  durum (sadece görsel; gerçek doğru/yanlış sonuçta).

### M.2 Ekranlar

1. **Pre-exam briefing** — tam ekran modal:
   - Deneme adı + bölümler + süre + kural özeti (3 madde).
   - "Hazır mısın? Tam ekrana geçeceğim." CTA.
2. **Exam shell**
   - Sol 60%: PDF iframe (pinch zoom + zoom +/- button).
   - Sağ 40%: optical form (soru numara grid + A/B/C/D/E).
   - Üst bar: timer + autosave + cheat warning + section selector.
   - Alt bar: "Önceki / Sonraki / Bitir".
3. **Pre-submit summary modal** — "20 soru boş bıraktın. Devam etmek
   istiyor musun?" tablo görünümü (bölüm × boş sayısı).
4. **Submitted screen** — sade "Cevapların alındı, rapor hazırlanıyor"
   + 5-10 sn progress.
5. **Result page**
   - Hero: toplam net + bölüm bazlı net + "geçen denemene göre +X".
   - Section breakdown chart.
   - Kazanım heatmap (öğrenciye sade dil).
   - Cross-sell: "Bu kazanımları çalışmana yardımcı olacak içerikler".
6. **Mobile/tablet solving**
   - PDF üst, optical form alt (vertical stack).
   - Sticky bottom bar: timer + "Soru paleti" drawer butonu.

### M.3 Edge UX

- **Süre bitti → otomatik submit** + tam ekran "Süre bitti, cevapların
  kaydedildi" overlay.
- **Fullscreen exit (Mac/iOS güvenilir değil)** → graceful "Tam ekrana
  dön" banner + warning counter +1.
- **Tab switch** → invisible warning + counter +1.
- **Network kayıp** → autosave queue, görünür banner.

### M.4 Accessibility

- Keyboard navigation (arrow keys for question, 1-5 keys for answer).
- Yüksek kontrast modu (dark theme exam shell hazır).
- Screen reader: aria-label per soru numara, "Bölüm 1, Soru 5,
  cevap işaretli C".

---

## N. Analytics Experience Brief

### N.1 Mevcut

5 dashboard tipi: OD admin, ODK admin, student performance, teacher
analytics, parent insights. Risk engine cached 5dk. Kazanım analizi
mevcut. Leaderboard YOK. QuestionAnalysis YOK. CSV export YOK.

### N.2 Chart dili

- **Sade çizgi grafik** — gradient yok, tek renk + grid line.
- **Bar chart** — yatay tercih (kategori uzun olduğunda).
- **Heatmap** — kazanım için, 4-5 skor bin'i (zayıf → güçlü), pastel
  scale (blush → mint).
- **KPI card** — büyük rakam + delta (↑ %12) + sparkline (opsiyonel).
- **Empty state** — "Henüz veri yok, ilk denemeni çöz" + CTA.

### N.3 Per-rol analytics screen

1. **Admin (OD / ODK ayrı dashboard)** — funnel, gelir, aktif kullanıcı,
   churn, cron sağlığı. CSV export.
2. **Teacher** — sınıf bazlı net trend + risk dağılımı + kazanım
   heatmap.
3. **Student** — kişisel net trend + kazanım heatmap + zaman yatırımı
   (haftalık).
4. **Parent** — sade Türkçe özet: "Bu hafta {çocuk} 3 deneme çözdü,
   son denemede TYT Mat 18 net (geçenden +3)."
5. **Leaderboard (NEW)** — opt-in, kohort içi, anonim isim tercihi
   ("KaplanY24").

### N.4 Realtime indicator dili

- **Pulse dot** (olive) = LIVE / connected.
- **Amber dot** = sync pending.
- **Red dot** = disconnected.
- **Spinner** sadece >300ms loading'de görünür.

---

## O. Live Lesson Experience Brief

> **Mevcut durum: backend yarım (Meet link string only).**
> Tasarım target experience'ı çizmeli — engineering bunu hedefleyecek.

### O.1 Lesson lifecycle states

`SCHEDULED → STARTING_SOON (T-5min) → LIVE → ENDED → ARCHIVED`

Her state için ayrı kart görünümü.

### O.2 Ekranlar

1. **Yaklaşan ders kartı (öğrenci/öğretmen/veli)**
   - Ders adı + saat + öğretmen avatar + countdown ("23 dakika sonra").
   - T-5min: "Katılmaya hazırlan" CTA aktive olur.
2. **LIVE state**
   - Pulse rozet + "ŞU AN CANLI".
   - "Katıl" primary CTA (öğrenci/öğretmen için ayrı endpoint).
   - Öğretmen için: "Dersi başlat / bitir" + attendance widget.
3. **Yoklama widget (öğretmen)**
   - Sınıf öğrenci listesi + canlı katılım dot (yeşil/gri/sarı=geç).
   - Manuel override pill her satırda.
4. **Lesson timeline (veli)**
   - "Çocuğun şu an derste" / "Geç katıldı (5 dk)" / "Tamamladı".
   - Hafta görünümü mini grid.
5. **Teacher controls**
   - Dersi başlat / bitir, yoklama kapat, kayıt linki ekle, ders notu
     ekle.
6. **Post-lesson summary**
   - Kim katıldı, kim eksik, ders notu, kayıt linki, ödev atama
     shortcut.

### O.3 Realtime affordances

- Pusher subscribe → katılım dot'ları gerçek-zaman güncellenir.
- "Öğretmen henüz başlatmadı" banner waiting state'te.
- Network problem → "Bağlantın zayıf" inline banner.

---

## P. Payment / Billing / Entitlement Brief

### P.1 Ekranlar

1. **Checkout (web)** — sade tek-sayfa: paket özeti + kupon alanı +
   KVKK onay + "Öde" → PayTR iframe açılır. Loading state belirgin.
2. **Order confirmation** — başarılı: yeşil hero + "paketin aktif" +
   "Panele git" CTA. Başarısız: "yeniden dene" + iletişim CTA.
3. **Sepet (`/sepet`)** — minimal, çok ürün desteği var.
4. **Faturalar (öğrenci/veli/admin)** — tablo + PDF indir (gelecekte
   e-arşiv).
5. **Refund flow (admin)** — confirm modal + sebep + auto-revoke
   entitlement uyarısı + accounting reverse note.
6. **Entitlement empty state (panel'in herhangi bir yerinde paket
   yoksa)** — "Bu içeriği görmek için OD/ODK paketin gerek" + CTA.

### P.2 Trust strip elementleri

- "256-bit SSL" (varsa).
- "PayTR güvencesi".
- "Cayma hakkı 14 gün".
- KVKK badge.
- Tüm ödeme adımlarında footer'da görünür.

### P.3 Pricing transparency

- Plan kartında "ne dahil" + "ne dahil değil".
- Aylık/3 aylık/yıllık toggle (varsa).
- Kampanya rozeti GERÇEK ise gösterilir (brand voice kuralı).

---

## Q. Sidebar / Topbar / Navigation Brief

### Q.1 Mevcut altyapı

- `components/panel/shell/panel-shell.tsx` (server) + `panel-shell-client.tsx`
- `sidebar.tsx`, `topbar.tsx`, `sidebar-brand-switcher.tsx`,
  `notification-bell.tsx`, `command-palette.tsx`
- `getSectionsForRole(role, flags)` ile rol-bazlı menü.

### Q.2 Hedef

#### Sidebar
- 240px sabit (desktop), collapse → 64px icon-only.
- Üstte: logo + product switcher (OD / ODK).
- Section gruplama: "Ana", "Eğitim", "Operasyon", "Analytics", "Ayarlar"
  (rol-bazlı).
- Active item: background pill + active icon color.
- Hover: subtle background.
- Alt: user avatar mini + ayarlar.

#### Topbar
- Sol: breadcrumb (route bazlı).
- Orta: command palette trigger (`⌘K`).
- Sağ: notification bell (unread count badge) + theme toggle +
  user menu (avatar dropdown — profil, view-as, çıkış).

#### Command palette (`⌘K`)
- Rol-bazlı action listesi (mevcut `getCommandsForRole`).
- Kategoriler: "Git", "Yarat", "Yönet", "Yardım".
- Recent kullanılanlar üstte.

#### Notification center
- Bell click → 380px panel sağdan.
- Tabs: "Hepsi / Okunmamış / Critical".
- Item: icon + tek satır + zaman + tıklanınca route'a git.
- Footer: "Bildirim tercihleri" link.

#### Mobile drawer
- Hamburger → tam ekran drawer slide-from-left.
- Bottom tab bar (NEW): rol bazlı 4-5 sekme (örn. öğrenci: Bugün /
  Dersler / ODK / Bildirim / Profil).

#### Breadcrumb
- Route segment'lerinden auto, custom override desteği.

#### Quick actions
- Admin topbar'da "+ Yeni" dropdown: öğrenci, öğretmen, paket, deneme
  vb. (rol bazlı).

---

## R. Design System Brief

### R.1 Strateji

**Mevcut `pd-*` token sistemini revize edip genişlet, sıfırdan üretme.**
OD ve ODK **aynı sistem, ürün accent override**.

### R.2 Token taxonomy

```
RAW (renk paleti)
 └── SEMANTIC (rol bazlı: success, warn, danger, info, neutral)
      └── COMPONENT (button-primary-bg, table-row-hover-bg, ...)
```

Eksik raw token önerileri:
- `--pd-product-od-accent`, `--pd-product-odk-accent` (per-product accent
  override).
- `--pd-realtime-pulse` (olive).
- `--pd-data-grid-bg`, `--pd-data-grid-row-hover`, `--pd-data-grid-line`.
- `--pd-overlay-scrim` (modal/drawer arkası).

### R.3 Typography scale

Mevcut korunur (`od-display`/`od-h1-3`/`od-body`/`od-small`/`od-tiny`).
Eklenecek:
- `od-mono` (audit log, ID, code) — IBM Plex Mono veya JetBrains Mono.
- Numeric tabular variant (KPI, tablo) — `font-variant-numeric: tabular-nums`.

### R.4 Spacing scale

Tailwind default + ek:
- 4px tabanlı (`1` = 4px).
- "Dense table" için `0.5` = 2px, `1.5` = 6px.

### R.5 Component vocabulary (tasarlanacak)

#### Buttons
- Hierarchy: **primary / secondary / tertiary / ghost / destructive**.
- Sizes: xs / sm / md / lg.
- States: default / hover / active / focus-visible / disabled / loading.
- Icon-only variant (square).

#### Forms
- Input, textarea, select, multi-select, combobox, date picker, time
  picker, switch, checkbox, radio, slider, file upload (drag-drop).
- Validation: inline error (sub-text), success check, optional helper.
- Form layout: vertical stack standard, 2-col grid responsive.

#### Tables
- Sticky header, sortable column, density toggle, column visibility,
  row selection, expandable row, sticky first column on mobile.
- Empty state, loading skeleton, error state.
- Pagination (server-side).

#### Cards
- Surface variants: elevated / outlined / subtle.
- Header (title + meta + action) / body / footer.
- Per-product accent stripe (top-border 2px).

#### Modal / Drawer / Sheet
- **Modal:** centered, blocking, 480-720px.
- **Drawer:** sağdan slide, 420-560px, non-blocking için minimal scrim.
- **Sheet:** mobile-only, alttan slide.
- **Confirm dialog:** 360px, destructive butonda sağlama.

#### Badge / Tag / Chip
- Status badge (success/warn/danger/info/neutral).
- Tag (kategori, kazanım).
- Filter chip (active/inactive, removable).
- Counter badge (notification, unread).

#### Chart styles
- Line, bar (h/v), area, sparkline, heatmap, donut (kullanım sınırlı).
- Single accent + grid line + tooltip + legend.

#### Empty / loading / error
- Empty: illüstrasyon (sade SVG, brand olive line-art) + tek cümle +
  primary CTA.
- Skeleton: gerçek shape (card layout'unu mimik).
- Error: kısa Türkçe + retry + "destek ile iletişim" link.

#### Realtime indicators
- Pulse dot (canlı), connection status banner, autosave indicator,
  live counter (badge animate).

#### Toast
- Sağ alt, stack max 3, otomatik 4s dismiss, manual close.
- Variants: success / error / info / warning.

#### Animations
- Mevcut `od-fade-in`, `od-slide-up`, `od-slide-in` korunur.
- Eklenecek: `od-pulse` (realtime), `od-shake` (error feedback),
  page transition (subtle, opsiyonel).

### R.6 Accent overlay sistemi

Per-product accent override:

```css
:root[data-product="od"]  { --pd-accent: var(--pd-product-od-accent); }
:root[data-product="odk"] { --pd-accent: var(--pd-product-odk-accent); }
```

Tüm component'lar `--pd-accent`'i kullanır → ürün switcher değiştirince
tüm sistem aksanı kayar.

---

## S. Responsive / Mobile-First Strategy

### S.1 Breakpoint'ler

- `sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280 / `2xl` 1536.
- Panel layout **`lg` (1024)** breakpoint'inde sidebar görünür olur.
- Exam solver **`lg` (1024)** breakpoint'inde split (PDF + form) olur;
  altında stack.

### S.2 Mobile davranışı

- Sidebar → drawer.
- Tablolar → card view (mobile).
- Bottom tab bar (öğrenci, veli, öğretmen).
- Touch target ≥44px.
- Sticky CTA mobile'da public site'te.
- Modal → full-sheet bottom slide.

### S.3 Tablet davranışı

- Sidebar collapsed (icon only) default.
- Tablo iki-kolon olarak çalışır (master-detail).
- Exam solving: split mode, PDF üstte yarısı, form altta yarısı veya
  side-by-side (landscape).

### S.4 Mobil sınav çözme (kritik)

- PDF üst yarı (pinch zoom).
- Optical form alt yarı (sticky).
- Timer + autosave sticky top bar.
- "Soru paleti" bottom drawer.
- Cheat enforcement gracious (mobile fullscreen güvenilmez).

### S.5 Mobil analytics

- Chart'lar single-column.
- Heatmap → horizontal scroll.
- KPI cards → 2x2 grid.

---

## T. Current Design Debt

### T.1 Tutarsızlıklar

| # | Borç | Yer | Etki |
|---|---|---|---|
| T-1 | Modal vs `/yeni` route karışık (bazı CRUD modal, bazı sayfa) | tüm panel | Kullanıcı pattern öğrenemiyor |
| T-2 | Tablo filter chip standardı yok | admin liste sayfaları | Her sayfa farklı |
| T-3 | Inline validation tutarsız (bazı sayfa client-only, bazı server) | formlar | UX karmaşa |
| T-4 | Empty state'ler sadece metin, illüstrasyon yok | tüm liste | Premium hissi düşük |
| T-5 | Loading skeleton dashboard'larda yarım | panel | Algılanan hız düşük |
| T-6 | Toast var ama formların çoğu hâlâ inline error/alert | formlar | Karışık |
| T-7 | TeacherComment vs StudentNote ayrımı UI'da belirsiz | öğretmen | Kavramsal çakışma |
| T-8 | Notification + InboxMessage çift sistem | tüm panel | Bildirim deneyimi parçalı |
| T-9 | "Hangi ürün altındayım" badge bazı iç route'larda kayboluyor | breadcrumb | Bağlam kaybı |
| T-10 | Dark theme bazı section'larda kontrast düşük | exam, analytics | Erişilebilirlik |
| T-11 | Mobile admin tablolar scroll-x sadece (card view yok) | admin | Mobil kullanım zor |
| T-12 | Modal/drawer z-index çakışmaları (drawer içinde modal) | shell | Bug |
| T-13 | Pagination 20+ sayfada hardcoded `take: 100/200` | admin listeleri | Performans + UX |
| T-14 | Veli child detay sayfası dashboard standardının altında | parent | Hiyerarşi düşüş |
| T-15 | Hero CTA'lar rekabet ediyor (3 birden) | public site | Conversion |

### T.2 Görsel hierarchy zayıflıkları

- KPI rakamları yeterince büyük değil bazı dashboard'larda.
- Card grid'leri eşit ağırlıkta, "primary" card yok.
- Audit log feed kronolojik ama tek tip — severity vurgusu zayıf.
- Pricing sayfası kart karşılaştırması optikte karmaşık.

### T.3 Crowded screens

- Admin "Ödemeler (OD)" sayfası — purchase intent / event / order /
  payment dört entity tek tabloda.
- Öğrenci ODK analiz sayfası — bölüm × kazanım × cevap × zorluk
  matrisi optikte ezici.
- Teacher dashboard — 6+ widget, hiyerarşi düşük.

### T.4 Old-looking patterns

- Bazı modal'lar default browser alert.
- Form-validation Türkçe metinleri ham Zod error.
- Bazı tablolarda zebra-row (modern data grid pattern değil).

---

## U. Redesign Opportunities

### U.1 Quick wins (büyük etki, düşük efor)

1. **Standart EmptyState / Loading / Error component üçlüsü** → tüm
   liste sayfalarına uygula.
2. **Filter chip standardı** → tek bir `<FilterBar>` pattern.
3. **Toast bind** → tüm formlar standart success/error toast.
4. **Mobile bottom tab bar** → öğrenci/veli panelinde.
5. **Hero single primary CTA** → public site.
6. **SSS kategorize** → public.
7. **Per-product accent override** → tek token değişkenle ürün
   switcher görsel ayrımı.

### U.2 Medium efor, dönüştürücü

1. **Veli child detay rebuild** → unified timeline.
2. **Exam shell pre-submit summary modal + reconnect banner**.
3. **Öğrenci ODK sonuç ekranı premium chart + sade dil**.
4. **Admin "View-as" feature UI**.
5. **Background jobs admin UI** (cron health).
6. **Inbox unification + 2-way messaging UI** (öğretmen-veli, öğretmen-öğrenci).
7. **Class kazanım heatmap** (öğretmen).

### U.3 Büyük tasarım hamleleri

1. **Live lesson lifecycle UI** (waiting/live/ended + countdown +
   katılım dot).
2. **Admin command center dashboard** (KPI + cron + audit + timeline).
3. **Pricing sayfası ürün ayrımı + comparison table**.
4. **ODK exam shell premium polish** (low-distraction + smart edge
   states).
5. **Notification center premium drawer**.
6. **Dark theme genel polish** (kontrast audit).

---

## V. Priority Recommendations (Claude Design'a iş sırası)

> Aşağıdaki sıra **tasarım çıktı sırasıdır**, engineering implementasyon
> sırasından bağımsız. Engineering şu an FAZ 1 (OD-PayTR) ve FAZ 2
> (Canlı ders backbone) üzerine çalışıyor; tasarım bunlardan **bir
> sprint önde** olmalı.

### V.1 Sprint 1 — Design System Foundation (2 hafta)

1. Token revizyonu (semantic ekleme, per-product accent override).
2. Component vocabulary v1: Button, Input, Form, Table, Card, Modal,
   Drawer, Badge, Tag, Toast, EmptyState, Skeleton, Error.
3. Typography & motion finalize.
4. Light + dark eşit kalite.
5. **Çıktı:** Figma library + token JSON + interactive prototype.

### V.2 Sprint 2 — Panel Shell + Navigation (1 hafta)

1. Sidebar (collapsed + expanded + active state + per-product accent).
2. Topbar (breadcrumb + command palette trigger + notification bell +
   user menu).
3. Command palette UX.
4. Notification center drawer.
5. Mobile drawer + bottom tab bar.
6. **Çıktı:** her rol için sidebar + topbar high-fi.

### V.3 Sprint 3 — Public Website Redesign (2 hafta)

1. Home (14 section).
2. OD landing + ODK landing.
3. **Paketler (ürün ayrımı kritik).**
4. Pricing comparison.
5. Blog template + SSS kategorize.
6. Mobile sticky CTA.
7. **Çıktı:** tüm public route'lar için high-fi + responsive.

### V.4 Sprint 4 — Admin Panel Brief (2 hafta)

1. Operasyon dashboard ("command center").
2. Liste sayfası şablonu (öğrenci / öğretmen / paket / ödeme).
3. Detay sayfası şablonu (tabbed).
4. Wizard şablonu (deneme oluşturma).
5. Audit log feed.
6. Background jobs UI (NEW).
7. View-as feature UI.
8. **Çıktı:** Admin için 12+ anchor screen.

### V.5 Sprint 5 — Student + Teacher Panel (2 hafta)

1. Student dashboard + derslerim + ödevler + performansım.
2. Teacher dashboard + yoklama + öğrencilerim + ödevler + risk.
3. ODK dashboard (student variant, accent shift).
4. Empty / loading / error pattern uygulaması.
5. **Çıktı:** her rol için 8+ anchor screen.

### V.6 Sprint 6 — Parent Panel (1 hafta)

1. Dashboard polish (R5 base).
2. **Çocuk detay rebuild** (unified timeline).
3. Öğretmenle iletişim thread UI.
4. Bildirim tercihleri.
5. **Çıktı:** Veli için 6 anchor screen + jargonsuz Türkçe stub'lar.

### V.7 Sprint 7 — ODK Exam Experience (2 hafta)

1. Pre-exam briefing.
2. Exam shell (desktop split + tablet + mobile stack).
3. Pre-submit summary modal.
4. Submitted + result page.
5. Reconnect / cheat / time-up edge state'leri.
6. Mobile/tablet sınav UX.
7. **Çıktı:** "Türkiye'deki en iyi sınav salonu" prototype.

### V.8 Sprint 8 — Live Lesson Experience (1 hafta)

1. Lesson lifecycle UI (waiting/live/ended).
2. Teacher controls + attendance widget (realtime dot).
3. Parent visibility timeline.
4. Post-lesson summary.
5. **Çıktı:** live lesson 4 anchor screen + state diagram.

### V.9 Sprint 9 — Analytics + Billing (1 hafta)

1. Chart language standardı (line / bar / heatmap / KPI).
2. Per-rol analytics screen.
3. Checkout + order confirmation + faturalar.
4. Refund flow.
5. **Çıktı:** analytics + billing anchor screens.

### V.10 Sprint 10 — Polish + Handoff (1 hafta)

1. Dark theme audit (kontrast, semantic).
2. Accessibility audit (focus-visible, ARIA, keyboard nav).
3. Motion polish.
4. Empty/loading/error standardı tüm sistemde tutarlı.
5. Engineering handoff: spec dokümanları, token JSON, Figma
   component'ler, interaction guidelines.
6. **Çıktı:** production-ready design system + tüm anchor screen'ler.

---

## W. Engineering ↔ Design contract notları

Tasarımcı dikkat etmesi gereken **teknik gerçekler**:

1. **Theme system mevcut** — `data-theme="dark"` attribute, CSS
   custom properties. Token override sistemi kurulu.
2. **Tailwind config korunacak** — yeni token'lar `pd-*` namespace'ine
   eklenir.
3. **Server Components yoğun** — interaction'lar minimal client
   component'larla yapılır. "Heavy real-time interaction" bölgeleri
   (exam shell, live lesson, notification bell) client component'tır.
4. **Pusher (SSE) altyapısı mevcut** — realtime indicator'lar gerçek
   data'ya bağlanır.
5. **Cron jobs (8 adet)** — backend zaten attığı eventlere göre UI
   güncellenir.
6. **PayTR iframe** — checkout sayfasında iframe boyutu sabit
   tasarlanmalı (~480x520).
7. **Mobile app (Expo)** — bu brief web içindir; mobile uygulama
   ayrı brief gerektirebilir, ama design system token'ları paylaşılır
   (NativeWind kullanıyorlar).
8. **Accessibility yasal değil ama brand** — WCAG AA hedef.
9. **Türkçe içerik birinci sınıf** — fontlar Türkçe karakter set'i
   tam (ı, ğ, ş, ç, ö, ü).
10. **Brand voice doğrudan copy** — `docs/brand-voice.md` her
    tasarım stub copy'sinde uygulanmalı.

---

## X. Deliverables checklist (Claude Design'dan beklenen)

- [ ] Token JSON (raw + semantic + component) — `pd-*` namespace.
- [ ] Figma library: foundations (color, typography, spacing, shadow,
      motion).
- [ ] Component library (40+ component, light + dark).
- [ ] 60+ high-fi screen (public + 4 panel + ODK exam + live lesson +
      checkout).
- [ ] Per-rol prototype (clickable Figma).
- [ ] Interaction guidelines doc (motion timing, hover/focus, empty/
      loading, error patterns).
- [ ] Responsive spec (desktop / tablet / mobile her anchor için).
- [ ] Accessibility spec (focus order, ARIA, kontrast notları).
- [ ] Brand voice'a uygun copy stub'lar (Türkçe).
- [ ] Engineering handoff dokümanı (component → kod mapping önerisi).

---

## Y. Açık sorular (Claude Design ile çözülecek)

1. ODK için **dedicated accent** ne olacak? (sky / lavender / başka?)
2. Veli için "dikkat seviyesi" görsel dili: 3-band (iyi/orta/dikkat)
   mı yoksa 5-band mı?
3. Leaderboard opt-in nasıl tasarlanacak? Tamamen anonim mi, takma
   ad mı, gerçek isim mi?
4. Admin "Command Center" dashboard density seviyesi (Linear/Stripe
   arası nerede)?
5. Public site'ta video testimonial inline mı, modal mı?
6. Mobile exam solving: tam ekran browser mı, in-app webview mı
   (mobile app referansı)?
7. Dark theme **default** mü olacak, kullanıcı tercihi mi?
   (Şu an: light default + system aware + manual override.)
8. Per-product accent override **otomatik route bazlı** mı (rota
   `/panel/.../odk/*` ise ODK accent) yoksa **kullanıcı tercihi**
   (product switcher) mi?

---

## Z. Sonuç

**OD + ODK platformu** backbone'u olgun, UX/UI tarafı premium
zihniyetle kurulmuş ama **tutarlılık + derinleşme** ihtiyaç içinde.

Claude Design'dan beklenen **tek bir unified design system** ile:

- public site'in **butik premium** hissini koruyarak conversion'ı
  yükseltmek,
- admin panelini **command-center** haline getirmek,
- öğretmen panelini **operasyonel tool** disiplinine oturtmak,
- öğrenci panelini **motive edici ama dağınık olmayan** hale getirmek,
- veli panelini **sade, jargonsuz, güven verici** kılmak,
- ODK exam shell'ini **Türkiye'nin en iyi dijital deneme deneyimi**
  yapmak,
- live lesson'a **realtime lifecycle UI** giydirmek.

Mevcut `pd-*` token sistemi **silinmez**, üzerine inşa edilir.
OD ve ODK **aynı sistem + ürün accent override** ile ayrışır.

**Bu brief, Claude Design'a verilecek tek input dokümanıdır.**
Implementation, ayrı sprint dosyalarında (`docs/sprint-N-changelog.md`)
takip edilir.

---

*Doküman sonu.*
