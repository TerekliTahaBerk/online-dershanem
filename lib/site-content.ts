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
  title: ["Matematikte netlerini artırmak", "sandığından daha kolay."],
  subtitle:
    "En fazla 4 kişilik canlı matematik dersleriyle öğrencinin nerede takıldığını görür, ders sonrası ne çalışacağını netleştiririz.",
  primary: { label: "Ders Paketlerini İncele", href: "/ders-paketleri/" },
  secondary: { label: "Ücretsiz görüşme", href: "/iletisim/" },
  floatingCards: [
    { title: "En fazla 4 öğrenci", sub: "Herkes görünür, herkes soru sorar" },
    { title: "Canlı matematik dersi", sub: "LGS · YKS" },
    { title: "Ders sonrası takip", sub: "Ödev ve çalışma yönü" },
  ],
} as const;

/* ---------------- Sosyal kanıt (üniversite barı) ---------------- */

export const socialProof = {
  text: "LGS ve YKS matematiğinde öğrenciler seviyesine göre ilerler.",
  badges: ["LGS", "YKS", "Matematik", "Küçük grup", "Canlı ders", "Ders sonrası takip", "PayTR güvenli ödeme"],
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
    tag: "TYT öğrencisi",
    quote: "Ders sonrası ne çalışacağını bilmek düzen kurmasını kolaylaştırdı.",
    name: "TYT öğrencisi",
    detail: "Matematik çalışma düzeni",
  },
  {
    tag: "8. sınıf velisi",
    quote: "Kalabalık sınıfta soru soramıyordu; küçük grupta daha aktif ilerlemeye başladı.",
    name: "8. sınıf velisi",
    detail: "Küçük grup canlı ders",
  },
  {
    tag: "LGS velisi",
    quote: "Veli olarak süreci daha net takip edebildik.",
    name: "LGS velisi",
    detail: "Düzenli takip",
  },
  {
    tag: "AYT öğrencisi",
    quote: "Soru çözümünü gösterince nerede hata yaptığını daha hızlı fark etmeye başladı.",
    name: "AYT öğrencisi",
    detail: "En fazla 4 kişi",
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
    q: "LGS ve YKS için uygun mu?",
    a: "Evet. İki paket vardır: LGS Matematik Ders Paketi ve YKS Matematik Ders Paketi. Grup ve ders içeriği öğrencinin hazırlandığı sınava göre belirlenir.",
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
      { label: "SSS", href: "/sss/" },
    ],
  },
  {
    title: "Kurumsal",
    links: [
      { label: "Hakkımızda", href: "/hakkimizda/" },
      { label: "İletişim", href: "/iletisim/" },
      { label: "Blog", href: "/blog/" },
      { label: "Ön görüşme", href: "/iletisim/" },
    ],
  },
  {
    title: "Destek",
    links: [
      { label: "Sıkça Sorulanlar", href: "/sss/" },
      { label: "Gizlilik", href: "/gizlilik/" },
      { label: "KVKK", href: "/kvkk/" },
      { label: "Kullanım koşulları", href: "/gizlilik/" },
      { label: "İade Politikası", href: "/iade/" },
      { label: "PayTR Güvenli Ödeme", href: "/ders-paketleri/" },
    ],
  },
] as const;

export const footerTagline =
  "En fazla 4 kişilik canlı matematik dersleri, ders sonrası çalışma yönü ve güvenli ödeme.";
