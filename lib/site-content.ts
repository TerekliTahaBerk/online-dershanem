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
  { label: "Nasıl Çalışır?", href: "/#nasil-calisir" },
  { label: "Paketler", href: "/#paketler" },
  { label: "SSS", href: "/#sss" },
] as const;

/** Sağ üst birincil CTA — lead / satış odaklı (self-register yok). */
export const navCta = { label: "Ücretsiz görüşme", href: "/iletisim/" } as const;
/** Öğrenci paneli girişi. Panel sıfırdan yazılana kadar `/giris` "yenileniyor" mesajı + destek kanallarını gösterir. */
export const navLogin = { label: "Giriş", href: "/giris/" } as const;

/* ---------------- Hero ---------------- */

export const hero = {
  pill: "LGS ve YKS için canlı matematik",
  title: ["Matematiği verimli ve erişilebilir", "öğrenmenin yolu."],
  subtitle:
    "LGS ve YKS öğrencileri için küçük grup canlı ders, öğretmen geri bildirimi ve ders sonunda net çalışma yönü.",
  primary: { label: "Ders Paketlerini İncele", href: "/ders-paketleri/" },
  secondary: { label: "Ücretsiz görüşme", href: "/iletisim/" },
} as const;

/* ---------------- Sosyal kanıt (üniversite barı) ---------------- */

export const socialProof = {
  text: "İki paket, aynı butik ders disiplini: canlı matematik, küçük grup ve takip.",
  badges: ["LGS", "YKS", "Matematik", "Küçük grup", "Canlı ders", "Ders sonrası takip", "PayTR güvenli ödeme"],
} as const;

/* ---------------- Ana değer önerisi (iki büyük kart) ---------------- */

export const valueProps = {
  eyebrow: "Neden Online Dershanem",
  title: "Ders bitince süreç bitmiyor.",
  subtitle:
    "Öğrencinin derste nerede takıldığını görür, ders sonrasında hangi çalışmayla devam edeceğini sade biçimde netleştiririz.",
} as const;

/* ---------------- İlk 30 gün ---------------- */

export const first30 = {
  title: ["İlk 30 günde matematikte", "ne değişir?"],
  timeline: ["Bugün", "7. Gün", "30. Gün"],
  columns: [
    {
      title: "Seviyeyi görelim",
      items: [
        "Öğrencinin sınıfı ve sınav hedefi alınır",
        "Matematikte tıkandığı başlıklar konuşulur",
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
    body: "En fazla dört kişilik grupta öğrenci çözümünü gösterir, takıldığı adımı öğretmeniyle birlikte görünür kılar.",
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
    q: "Dersler kaç dakika ve ayda kaç kez yapılıyor?",
    a: "Her canlı matematik dersi 60 dakikadır. Aylık paket haftada bir, ayda toplam dört canlı ders içerir. Ders günü ve saati uygun küçük grubun programına göre belirlenir.",
  },
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
    a: "Ekibimiz sizinle iletişime geçer, öğrencinin seviyesini ve hedefini konuşur, uygun küçük grubu belirler ve ilk dersi planlar.",
  },
  {
    q: "Hesap oluşturmak gerekiyor mu?",
    a: "Hayır. Paketi satın almak ve ilk ders planlamasını yapmak için hesap oluşturmanız gerekmez.",
  },
  {
    q: "Ders başlamadan önce görüşebilir miyiz?",
    a: "Evet. Ücretsiz ön görüşmede öğrencinin sınıfını, matematik seviyesini ve sınav hedefini konuşabiliriz.",
  },
  {
    q: "Çocuğum matematikte çok gerideyse uygun mu?",
    a: "Ön görüşmede seviyeyi birlikte değerlendiririz. Uygun küçük grup varsa ders, öğrencinin ihtiyaç duyduğu noktadan planlanır.",
  },
].slice(0, 6);

/* ---------------- Footer ---------------- */

export const footerColumns = [
  {
    title: "Ürün",
    links: [
      { label: "Ders Paketleri", href: "/ders-paketleri/" },
      { label: "Online Matematik", href: "/matematik/" },
      { label: "LGS Matematik", href: "/lgs/" },
      { label: "YKS Matematik", href: "/yks/" },
      { label: "Kamplar (ön kayıt)", href: "/kamplar/" },
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
    title: "Destek",
    links: [
      { label: "Sıkça Sorulanlar", href: "/sss/" },
      { label: "Öğrenci girişi", href: "/giris/" },
      { label: "İade Politikası", href: "/iade/" },
    ],
  },
] as const;

export const footerTagline =
  "LGS ve YKS için en fazla 4 kişilik canlı matematik dersleri, ders sonrası çalışma yönü ve güvenli ödeme.";
