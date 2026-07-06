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
  { label: "Ders Paketleri", href: "/ders-paketleri/" },
  { label: "Kamplar", href: "/kamplar/" },
  { label: "Hakkımızda", href: "/hakkimizda/" },
] as const;

/** Sağ üst birincil CTA — lead / satış odaklı (self-register yok). */
export const navCta = { label: "Ücretsiz görüşme", href: "/iletisim/" } as const;
export const navLogin = { label: "Giriş yap", href: "/giris/" } as const;

/* ---------------- Hero ---------------- */

export const hero = {
  pill: "Maksimum 4 kişilik canlı matematik dersi",
  title: ["Netlerini artırmak", "sandığından daha kolay."],
  subtitle:
    "Canlı matematik dersleri, küçük grup düzeni ve ders sonrası takip ile öğrencinin neyi, neden çalışacağını netleştiriyoruz.",
  primary: { label: "Ders Paketlerini İncele", href: "/ders-paketleri/" },
  secondary: { label: "Ücretsiz görüşme", href: "/iletisim/" },
  floatingCards: [
    { title: "En fazla 4 öğrenci", sub: "Herkes görünür, herkes soru sorar" },
    { title: "Canlı matematik dersi", sub: "LGS · TYT · AYT" },
    { title: "Ders sonrası takip", sub: "Ödev ve çalışma yönü" },
  ],
} as const;

/* ---------------- Sosyal kanıt (üniversite barı) ---------------- */

export const socialProof = {
  text: "LGS, TYT ve AYT matematiğinde öğrenciler seviyesine göre ilerler.",
  badges: ["LGS", "TYT", "AYT", "Matematik", "Küçük grup", "Canlı ders", "Ders sonrası takip"],
} as const;

/* ---------------- Ana değer önerisi (iki büyük kart) ---------------- */

export const valueProps = {
  eyebrow: "Neden Online Dershanem",
  title: "Dersi anlatıp bırakmıyoruz.",
  subtitle:
    "Küçük grup dersi, öğretmen gözlemi ve ders sonrası yönlendirme aynı planın içinde ilerler.",
} as const;

/* ---------------- İlk 30 gün ---------------- */

export const first30 = {
  title: ["İlk 30 günde matematikte", "ne değişir?"],
  timeline: ["Bugün", "7. Gün", "30. Gün"],
  columns: [
    {
      title: "Hemen başla",
      items: [
        "Öğrencinin sınıfı ve hedefi alınır",
        "Matematikte zorlandığı yerler konuşulur",
        "Uygun küçük grup planlanır",
      ],
    },
    {
      title: "Rutinini oturt",
      items: [
        "Canlı derslere düzenli katılır",
        "Derste soru sorar ve çözümünü gösterir",
        "Ders sonrası ne çalışacağı netleşir",
      ],
    },
    {
      title: "Farkı gör",
      items: [
        "Konu eksikleri daha görünür olur",
        "Çalışma düzeni oturur",
        "Deneme ve ödev takibi anlamlı hale gelir",
      ],
    },
  ],
  cta: { label: "Ücretsiz görüşme", href: "/iletisim/" },
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
    name: "TYT öğrencisi",
    detail: "Matematik çalışma düzeni",
  },
  {
    tag: "LGS hazırlık",
    quote:
      "Soru sorabildiğim ve çözümümü gösterebildiğim bir ders düzeni tam aradığım şeydi.",
    name: "8. sınıf velisi",
    detail: "Küçük grup canlı ders",
  },
  {
    tag: "Veli görüşü",
    quote:
      "Haftalık kısa notlar, süreci tahmin etmek yerine somut olarak görmemizi sağladı.",
    name: "LGS öğrencisi velisi",
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
    q: "Dersler kaç kişilik?",
    a: "Canlı matematik dersleri en fazla 4 öğrencilik küçük gruplarda yapılır.",
  },
  {
    q: "Öğrenci derste soru sorabiliyor mu?",
    a: "Evet. Küçük grup düzeni öğrencinin soru sorması, çözümünü göstermesi ve öğretmenden doğrudan geri bildirim alması için kurulmuştur.",
  },
  {
    q: "Ödeme sonrası ne olacak?",
    a: "Ekibimiz sizinle iletişime geçer, öğrencinin seviyesini konuşur, uygun küçük grubu belirler ve ilk dersi planlar.",
  },
  {
    q: "Hesap oluşturmak gerekiyor mu?",
    a: "Hayır. Paketi satın almak ve ilk ders planlamasını yapmak için hesap oluşturmanız gerekmez.",
  },
  {
    q: "Ders başlamadan önce görüşebilir miyiz?",
    a: "Evet. Ücretsiz ön görüşmede öğrencinin sınıfını, seviyesini ve hedefini konuşabiliriz.",
  },
  {
    q: "Çocuğum matematikte çok gerideyse uygun mu?",
    a: "Seviyesi ve hedefi ön görüşmede değerlendirilir. Uygun bir grup varsa ders tam öğrencinin ihtiyaç duyduğu noktadan planlanır.",
  },
  {
    q: "LGS, TYT ve AYT için uygun mu?",
    a: "Evet. Grup ve ders içeriği öğrencinin hazırlandığı sınava ve mevcut seviyesine göre belirlenir.",
  },
  {
    q: "İstediğim zaman iptal edebilir miyim?",
    a: "Paket aylık ilerler ve taahhüt içermez. Bir sonraki ay devam etmemeyi tercih edebilirsiniz.",
  },
];

/* ---------------- Footer ---------------- */

export const footerColumns = [
  {
    title: "Platform",
    links: [
      { label: "Ders Paketleri", href: "/ders-paketleri/" },
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
  "Canlı matematik dersi, küçük grup ve ders sonrası takip sistemiyle öğrencinin yolunu netleştirir.";
