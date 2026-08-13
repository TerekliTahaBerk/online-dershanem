/**
 * PUBLIC MARKETING SITE — içerik kaynağı.
 *
 * Bu dosya public sitenin ortak pazarlama metinlerini tutar. Üç ürünün yapısal
 * kaynağı `lib/product-architecture.ts` içindedir.
 *
 * ÖNEMLİ: Fiyat/ürün kimliği burada DEĞİLDİR. Ödeme-kritik fiyat kaynağı
 * `lib/content.ts` → `subjectPackageGroups`'tur. Buradaki her şey pazarlama
 * metnidir; abartılı/kanıtlanmamış başarı vaadi içermez.
 */
import { contact } from "@/lib/content";
import { publicProducts } from "@/lib/product-architecture";

export const waHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;
export const telHref = `tel:${contact.phone.replace(/[^\d+]/g, "")}`;

/* ---------------- Navigasyon ---------------- */

export const primaryNav = [
  ...publicProducts.map(({ name, href }) => ({ label: name, accessibleLabel: name, href })),
  { label: "Ürünler", accessibleLabel: "Tüm ürünler", href: "/urunler/" },
  { label: "Hakkımızda", accessibleLabel: "Hakkımızda", href: "/hakkimizda/" },
] as const;

/** Sağ üst birincil CTA — lead / satış odaklı (self-register yok). */
export const navCta = { label: "Ürününü bul", href: "/urunler/" } as const;
/** Öğrenci paneli girişi. Panel sıfırdan yazılana kadar `/giris` "yenileniyor" mesajı + destek kanallarını gösterir. */
export const navLogin = { label: "Giriş", href: "/giris/" } as const;

/* ---------------- Hero ---------------- */

export const hero = {
  title: ["Ders, plan ve deneme", "aynı hedef için çalışsın."],
  subtitle:
    "LGS ve YKS yolculuğunda canlı ders, kişisel çalışma düzeni ve online denemeyi üç açık ürünle bir araya getiriyoruz.",
  primary: { label: "Ürünleri Keşfet", href: "/urunler/" },
  secondary: { label: "Ücretsiz görüşme", href: "/iletisim/" },
} as const;

/* ---------------- Sosyal kanıt (üniversite barı) ---------------- */

export const socialProof = {
  text: "Üç ürün, aynı öğrenme yolculuğu: ders, planlama ve ölçme.",
  badges: ["LGS", "YKS", "TYT", "AYT", "Canlı ders", "Çalışma planı", "Deneme analizi"],
} as const;

/* ---------------- Ana değer önerisi (iki büyük kart) ---------------- */

export const valueProps = {
  eyebrow: "Üç ürün, tek yolculuk",
  title: "Ders, plan ve ölçüm birbirinden haberdar.",
  subtitle:
    "Öğrencinin canlı derste, haftalık planında ve denemelerde ortaya çıkan ihtiyacı anlaşılır bir sonraki adıma dönüşür.",
} as const;

/* ---------------- İlk 30 gün ---------------- */

export const first30 = {
  title: ["İlk 30 günde", "ne netleşir?"],
  timeline: ["Bugün", "7. Gün", "30. Gün"],
  columns: [
    {
      title: "Seviyeyi görelim",
      items: [
        "Öğrencinin sınıfı ve sınav hedefi alınır",
        "Zorlandığı dersler ve çalışma alışkanlıkları konuşulur",
        "LGS veya YKS paketine göre grup planlanır",
      ],
    },
    {
      title: "Ders düzeni otursun",
      items: [
        "Canlı derslere düzenli katılır",
        "Derste soru sorar ve çözümünü gösterir",
        "Ders sonrası ne çalışacağı yazılı olarak netleşir",
      ],
    },
    {
      title: "Takip anlam kazansın",
      items: [
        "Konu eksikleri görünür hale gelir",
        "Çalışma düzeni oturur",
        "Deneme ve ödev takibi aynı plana bağlanır",
      ],
    },
  ],
  cta: { label: "Ücretsiz görüşme", href: "/iletisim/" },
} as const;

/* ---------------- Modelin hedeflediği örnek öğrenci deneyimleri ---------------- */

export type Story = {
  tag: string;
  title: string;
  body: string;
  detail: string;
};

export const stories: Story[] = [
  {
    tag: "YKS öğrencisi",
    title: "Haftalık yön netleşir",
    body: "Ders sonunda sıradaki konu ve çalışma hedefi yazılı hale gelir; öğrenci haftayı ne yapacağını bilerek planlar.",
    detail: "Matematik çalışma düzeni",
  },
  {
    tag: "8. sınıf velisi",
    title: "Soru sormak kolaylaşır",
    body: "En fazla dört kişilik grupta öğrenci çözümünü gösterir, takıldığı adımı öğretmeniyle birlikte bulur.",
    detail: "Küçük grup canlı ders",
  },
  {
    tag: "LGS velisi",
    title: "Süreç görünür olur",
    body: "İşlenen konu, zorlanılan nokta ve sıradaki hedef sade bir özetle paylaşılır; veli süreci daha kolay takip eder.",
    detail: "Düzenli takip",
  },
  {
    tag: "YKS öğrencisi",
    title: "Hata adımı yakalanır",
    body: "Öğrenci yalnız cevabı değil, çözüm yolunu da gösterir; öğretmen yanlışın başladığı adımı doğrudan ele alır.",
    detail: "En fazla 4 kişi",
  },
];

/* ---------------- Sıkça sorulan sorular ---------------- */

export type Faq = { q: string; a: string };

export const homeFaqs: Faq[] = [
  {
    q: "Online Dershanem, Online Koçum ve Online Deneme Kulübüm arasındaki fark nedir?",
    a: "Online Dershanem canlı öğrenme ve öğretmen geri bildirimine, Online Koçum haftalık çalışma düzeni ve takibe, Online Deneme Kulübüm ise planlı sınav ölçümü ve analize odaklanır.",
  },
  {
    q: "Ürünleri birlikte kullanmak zorunlu mu?",
    a: "Hayır. Öğrenci yalnız ihtiyaç duyduğu ürünle başlayabilir. İhtiyaç değiştiğinde diğer ürünler aynı öğrenme yolculuğuna eklenebilir.",
  },
  {
    q: "Hangi ürünler LGS öğrencileri için uygun?",
    a: "Üç ürün de LGS öğrencileri için konumlandırılmıştır: canlı ders için Online Dershanem, çalışma düzeni için Online Koçum, ölçme ve analiz için Online Deneme Kulübüm.",
  },
  {
    q: "Hangi ürünler YKS öğrencileri için uygun?",
    a: "Online Dershanem ve Online Koçum YKS yolculuğuna; Online Deneme Kulübüm ise TYT ve AYT ölçümüne göre konumlandırılmıştır.",
  },
  {
    q: "Nereden başlamalıyım?",
    a: "Canlı ders ihtiyacı öndeyse Online Dershanem, planı sürdürmek zorsa Online Koçum, mevcut durumu ölçmek gerekiyorsa Online Deneme Kulübüm iyi bir başlangıç noktasıdır.",
  },
  {
    q: "Karar vermeden önce görüşebilir miyiz?",
    a: "Evet. Ücretsiz ön görüşmede öğrencinin sınıfını, sınav hedefini ve bugün ihtiyaç duyduğu destek türünü konuşabiliriz.",
  },
];

/* ---------------- Footer ---------------- */

export const footerColumns = [
  {
    title: "Ürünler",
    links: [
      ...publicProducts.map(({ name, href }) => ({ label: name, href })),
      { label: "Tüm ürünleri karşılaştır", href: "/urunler/" },
    ],
  },
  {
    title: "Kurumsal",
    links: [
      { label: "Hakkımızda", href: "/hakkimizda/" },
      { label: "Blog", href: "/blog/" },
      { label: "İletişim", href: "/iletisim/" },
    ],
  },
  {
    title: "Keşfet",
    links: [
      { label: "LGS çözümleri", href: "/lgs/" },
      { label: "YKS çözümleri", href: "/yks/" },
      { label: "Ders paketleri", href: "/ders-paketleri/" },
      { label: "Sıkça Sorulanlar", href: "/sss/" },
      { label: "Öğrenci girişi", href: "/giris/" },
      { label: "İade Politikası", href: "/iade/" },
    ],
  },
] as const;

export const footerTagline =
  "LGS ve YKS öğrencileri için canlı ders, çalışma düzeni ve online denemeyi üç açık ürün altında buluşturan eğitim platformu.";
