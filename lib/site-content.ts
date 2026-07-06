/**
 * PUBLIC MARKETING SITE — içerik kaynağı.
 *
 * Bu dosya yeni public sitenin (Home / Ders Paketleri / Kamplar / Hakkımızda /
 * Giriş) metin ve liste verilerini tek yerde tutar.
 *
 * ÖNEMLİ: Fiyat/ürün kimliği burada DEĞİLDİR. Ödeme-kritik fiyat kaynağı
 * `lib/content.ts` → `subjectPackageGroups`'tur. Buradaki her şey pazarlama
 * metnidir; abartılı/kanıtlanmamış başarı vaadi içermez.
 */
import { contact } from "@/lib/content";

export const waHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;
export const telHref = `tel:${contact.phone.replace(/[^\d+]/g, "")}`;

/* ---------------- Navigasyon ---------------- */

export const primaryNav = [
  { label: "Ders Paketleri", href: "/paketler/" },
  { label: "Kamplar", href: "/kamplar/" },
  { label: "Hakkımızda", href: "/hakkimizda/" },
] as const;

/** Sağ üst birincil CTA — lead / satış odaklı (self-register yok). */
export const navCta = { label: "Ücretsiz görüşme", href: "/iletisim/" } as const;
export const navLogin = { label: "Giriş yap", href: "/giris/" } as const;

/* ---------------- Hero ---------------- */

export const hero = {
  pill: "Yeni dönem kayıtları başladı",
  title: ["Netlerini artırmak", "sandığından daha kolay."],
  subtitle:
    "En fazla 4 kişilik canlı matematik dersi, kişiye özel çalışma planı ve veliye net gelişim notu — hepsi tek yerde.",
  primary: { label: "Paketleri İncele", href: "/paketler/" },
  secondary: { label: "Ücretsiz görüşme", href: "/iletisim/" },
  floatingCards: [
    { title: "Kişiye özel plan", sub: "Bu hafta ne çalışılacağı belli" },
    { title: "Haftalık takip", sub: "Ödev ve öğretmen notu" },
    { title: "Veliye net not", sub: "Süreç somut olarak görünür" },
  ],
} as const;

/* ---------------- Sosyal kanıt (üniversite barı) ---------------- */

export const socialProof = {
  text: "Türkiye'nin en iyi okullarına giden yolda, sağlam bir matematik temeli.",
  universities: [
    { name: "Boğaziçi Üniversitesi", src: "/universities/bogazici-logo.png" },
    { name: "ODTÜ", src: "/universities/odtu-logo.png" },
    { name: "İstanbul Teknik Üniversitesi", src: "/universities/itu-logo.png" },
    { name: "Yıldız Teknik Üniversitesi", src: "/universities/ytu-logo.png" },
    { name: "Galatasaray Üniversitesi", src: "/universities/gsu-logo.png" },
  ],
} as const;

/* ---------------- Ana değer önerisi (iki büyük kart) ---------------- */

export const valueProps = {
  eyebrow: "Neden Online Dershanem",
  title: "Başarı için her şey tek yerde.",
  subtitle:
    "Deneyimli öğretmenler, kişiye özel plan ve düzenli takip. Hepsi öğrenciyi hedefine sadece bir adım daha yaklaştırmak için bir arada.",
} as const;

/* ---------------- İlk 30 gün ---------------- */

export const first30 = {
  title: ["İlk 30 günde", "neler değişir?"],
  timeline: ["Bugün", "7. Gün", "30. Gün"],
  columns: [
    {
      title: "Hemen başla",
      items: [
        "Seviye ve hedef analizi yapılır",
        "İlk kişisel çalışma planın çıkar",
        "Öğretmeninle yol haritan netleşir",
      ],
    },
    {
      title: "Rutinini oturt",
      items: [
        "Haftalık canlı dersler başlar",
        "Eksiklerin birlikte tespit edilir",
        "Günlük çalışma düzenin takip edilir",
      ],
    },
    {
      title: "Farkı gör",
      items: [
        "Deneme analizlerin netleşir",
        "Çalışma disiplinin belirginleşir",
        "Hedefine daha bilinçli ilerlersin",
      ],
    },
  ],
  cta: { label: "Ücretsiz tanış", href: "/iletisim/" },
} as const;

/* ---------------- Başarı hikayeleri (fake foto YOK) ---------------- */

export type Story = {
  tag: string;
  quote: string;
  name: string;
  detail: string;
};

export const stories: Story[] = [
  {
    tag: "YKS hazırlık",
    quote:
      "Ders sonunda ne çalışacağımı bilmek haftayı çok daha düzenli götürmemi sağladı.",
    name: "Öğrenci deneyimi",
    detail: "TYT · AYT Matematik",
  },
  {
    tag: "LGS hazırlık",
    quote:
      "Soru sorabildiğim ve çözümümü gösterebildiğim bir ders düzeni tam aradığım şeydi.",
    name: "Öğrenci deneyimi",
    detail: "8. sınıf · Canlı ders",
  },
  {
    tag: "Veli görüşü",
    quote:
      "Haftalık kısa notlar, süreci tahmin etmek yerine somut olarak görmemizi sağladı.",
    name: "Veli deneyimi",
    detail: "Düzenli takip",
  },
  {
    tag: "TYT hazırlık",
    quote:
      "Kalabalık sınıfta kaybolmadan, kendi tempoma yakın bir grupla ilerledim.",
    name: "Öğrenci deneyimi",
    detail: "En fazla 4 kişi",
  },
  {
    tag: "AYT hazırlık",
    quote:
      "Türev ve integralde takıldığım yerleri birlikte çözünce eksiklerim hızla kapandı.",
    name: "Öğrenci deneyimi",
    detail: "İleri matematik",
  },
];

/* ---------------- Sıkça sorulan sorular ---------------- */

export type Faq = { q: string; a: string };

export const homeFaqs: Faq[] = [
  {
    q: "Online Dershanem nasıl çalışıyor?",
    a: "En fazla 4 öğrencilik canlı matematik dersleri Google Meet üzerinden yapılır. Her ders soru-cevap ve birlikte çözümle ilerler; sonunda haftalık çalışma planı, ödev ve öğretmen notuyla kapanır.",
  },
  {
    q: "Hangi sınavlara hazırlanabilirim?",
    a: "LGS, TYT ve AYT matematik için hazırlık sunuyoruz. Ders içeriği öğrencinin seviyesine ve hedeflediği sınava göre uyarlanır.",
  },
  {
    q: "Koçluk / takip hizmeti dahil mi?",
    a: "Evet. Düzenli takip modelin bir parçası: haftalık plan, ödev kontrolü ve veliye anlaşılır gelişim notu her hafta paylaşılır.",
  },
  {
    q: "Paketler nasıl başlar?",
    a: "Ödemeyi PayTR üzerinden güvenle tamamlarsınız; ardından ekibimiz sizinle iletişime geçer, öğrenciyi seviyesine uygun küçük gruba yerleştirir ve ilk dersi planlar. Satın alma için hesap açmanıza gerek yoktur.",
  },
  {
    q: "İstediğim zaman bırakabilir miyim?",
    a: "Evet. Ders Paketi aylık ilerler; taahhüt yoktur, dilediğiniz zaman devam etmemeyi tercih edebilirsiniz.",
  },
  {
    q: "Ücretsiz görüşme nasıl yapılır?",
    a: "İletişim sayfasından bilgilerinizi bırakır veya WhatsApp'tan yazarsınız. Kısa bir ön görüşmede öğrencinin seviyesini ve hedefini konuşur, doğru başlangıca birlikte karar veririz.",
  },
];

/* ---------------- Footer ---------------- */

export const footerColumns = [
  {
    title: "Platform",
    links: [
      { label: "Ders Paketleri", href: "/paketler/" },
      { label: "Kamplar", href: "/kamplar/" },
      { label: "Matematik Ders Paketi", href: "/matematik-ders-paketi/" },
      { label: "Başarı Hikayeleri", href: "/#basari-hikayeleri" },
    ],
  },
  {
    title: "Kurumsal",
    links: [
      { label: "Hakkımızda", href: "/hakkimizda/" },
      { label: "Misyonumuz", href: "/misyonumuz/" },
      { label: "İletişim", href: "/iletisim/" },
      { label: "Blog", href: "/blog/" },
    ],
  },
  {
    title: "Destek",
    links: [
      { label: "Sıkça Sorulanlar", href: "/sss/" },
      { label: "İade Politikası", href: "/iade/" },
      { label: "Gizlilik", href: "/gizlilik/" },
      { label: "KVKK", href: "/kvkk/" },
    ],
  },
] as const;

export const footerTagline =
  "Koçluk, kişiye özel plan ve akıllı takip sistemiyle matematik hazırlığını sadeleştirir.";
