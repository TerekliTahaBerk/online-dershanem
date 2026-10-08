export const siteUrl = "https://www.onlinedershanem.com";

/**
 * Doğrudan satın alınabilir matematik kataloğu — OD sepetinin fiyat kaynağı.
 *
 * ÖNEMLİ (ödeme kritik): `category` + `subject` çifti sepet kimliği ve
 * checkout fiyat doğrulamasının anahtarıdır (`getPackagePriceCents`). Bu
 * çiftleri değiştirmeden önce `lib/od/checkout.ts` ve cart akışını gözden geçir.
 * `discountedPrice` Türkçe formatı `parsePriceToCents` ile kuruşa çevrilir.
 *
 * Ürün modeli: iki public satış ürünü — LGS ve YKS Matematik Ders Paketi.
 * Mevcut OD sepeti → /sepet/satin-al → dinamik PayTR iframe akışından
 * satılır; ayrı PayTR linki gerekmez.
 */
export const subjectPackageGroups = [
  {
    key: "Matematik",
    title: "Matematik Ders Paketleri",
    subtitle:
      "LGS ve YKS için iki ayrı paket. Her pakette en fazla dört öğrenci, canlı ders ve ders sonrası net çalışma yönü.",
    packages: [
      {
        id: "lgs-matematik-ders-paketi",
        name: "LGS Matematik Ders Paketi",
        accent: "live",
        subject: "Matematik Ders Paketi",
        category: "LGS",
        badge: "",
        tagline: "8. sınıf LGS matematiği için küçük grupta canlı ders, yeni nesil soru pratiği ve düzenli takip.",
        audience:
          "LGS matematiğinde çözümünü gösterebilmeye, soru sorabilmeye ve hafta içinde ne çalışacağını bilmeye ihtiyaç duyan öğrenciler için.",
        quota: "En fazla 4 öğrenci",
        lessonDurationMinutes: 90,
        lessonsPerMonth: 4,
        billingPeriod: "Aylık paket",
        commitment: "Taahhüt yok",
        oldPrice: "",
        discountLabel: "",
        discountedPrice: "₺2.000/ay",
        priceCents: 200000,
        perLessonPrice: "",
        /** Bu pakete özgü sınav odağı — LGS/YKS arasındaki TEK gerçek fark. */
        examFocus: [
          "Yeni nesil soru pratiği",
          "8. sınıf müfredat takibi"
        ],
        features: [
          "Canlı matematik dersi",
          "En fazla 4 öğrencilik grup",
          "Derste soru-cevap ve birlikte çözüm",
          "Ders sonrası çalışma yönü",
          "Ödevlendirme ve öğretmen notu",
          "Sade gelişim özeti",
          "Seviye ve hedefe göre grup planlaması",
          "PayTR ile güvenli ödeme"
        ],
        cta: "LGS Paketini Satın Al"
      },
      {
        id: "yks-matematik-ders-paketi",
        name: "YKS Matematik Ders Paketi",
        accent: "live",
        subject: "Matematik Ders Paketi",
        category: "YKS",
        badge: "",
        tagline: "TYT ve AYT matematiğini aynı takip düzeninde götüren küçük grup canlı matematik dersi.",
        audience:
          "TYT temelini ve AYT derinliğini birlikte planlamak, deneme analizine göre daha bilinçli ilerlemek isteyen YKS öğrencileri için.",
        quota: "En fazla 4 öğrenci",
        lessonDurationMinutes: 90,
        lessonsPerMonth: 4,
        billingPeriod: "Aylık paket",
        commitment: "Taahhüt yok",
        oldPrice: "",
        discountLabel: "",
        discountedPrice: "₺2.000/ay",
        priceCents: 200000,
        perLessonPrice: "",
        /** Bu pakete özgü sınav odağı — LGS/YKS arasındaki TEK gerçek fark. */
        examFocus: [
          "TYT + AYT bütünlüğünde planlama",
          "Deneme analizine göre takip"
        ],
        features: [
          "Canlı matematik dersi",
          "En fazla 4 öğrencilik grup",
          "Derste soru-cevap ve birlikte çözüm",
          "Ders sonrası çalışma yönü",
          "Ödevlendirme ve öğretmen notu",
          "Sade gelişim özeti",
          "Seviye ve hedefe göre grup planlaması",
          "PayTR ile güvenli ödeme"
        ],
        cta: "YKS Paketini Satın Al"
      }
    ]
  }
] as const;

/**
 * Eski per-branş PayTR direct-link haritası kaldırıldı. Yeni matematik
 * paketleri dinamik PayTR iframe akışından satıldığı için statik link
 * gerekmez. Fonksiyon geriye dönük uyumluluk için korunur; her zaman null
 * döner ve çağıranlar sepet/checkout akışına yönlenir.
 */
export function getPackagePaymentLink(_category: string, _subject: string): string | null {
  void _category;
  void _subject;
  return null;
}

export const blogPosts = [
  {
    slug: "online-dershane-nedir",
    category: "Online Dershane",
    title: "Online Dershane Nedir? LGS ve YKS İçin Doğru Seçim Rehberi",
    seoTitle: "Online Dershane Nedir? LGS-YKS İçin Seçim Rehberi",
    metaDescription:
      "Online dershane nedir, hangi kriterlere göre seçilir? LGS ve YKS öğrencileri için sınıf mevcudu, takip sistemi ve ders bazlı modeli karşılaştıran rehber.",
    excerpt:
      "Online dershane seçerken yapılan en yaygın hata sadece fiyat karşılaştırmak. Bu rehberde küçük grup, ders bazlı seçim ve düzenli takip kriterlerini gerçek bir karar çerçevesine oturtuyoruz.",
    cardSnippet: "Kalabalık sınıf mı, küçük grup mu? Online dershane seçimi için pratik rehber.",
    featured: true,
    sections: [
      {
        h2: "Online dershane seçerken neden yanlış karar veriliyor?",
        paragraphs: [
          "Birçok öğrenci ve veli online dershane seçiminde önce paket fiyatına bakıyor. Oysa öğrencinin gerçekten ilerleyip ilerlemediğini belirleyen ana etken fiyat değil; ders içi etkileşim ve düzenli takip.",
          "Sınıf 20-30 kişiye çıktığında öğrenci derste görünmez kalır. Özellikle TYT ve LGS gibi süreçlerde bu durum, düzenli çalışan bir öğrencinin bile performansını düşürebilir."
        ],
        bullets: [
          "Kalabalık sınıfta bireysel geri bildirim azalır",
          "Ders sonrası analiz yapılmadığında aynı hatalar tekrar eder",
          "Takip yoksa çalışma disiplini kısa sürede dağılır"
        ]
      },
      {
        h2: "Net üreten online dershane modelinin üç temel kriteri",
        paragraphs: [
          "Bir online dershane modelinin gerçekten işe yarayıp yaramadığını üç pratik soruyla anlayabilirsin."
        ],
        bullets: [
          "Küçük grup: Soru sorabilmek ve bireysel dönüş alabilmek için en fazla 4 kişilik gruplar.",
          "Ders bazlı seçim: Sadece ihtiyaç duyulan derse yatırım yaparak verimi artırmak için.",
          "Haftalık takip: Deneme analizi, ödev kontrolü ve hedef takibinin düzenli işlemesi için."
        ]
      },
      {
        h2: "Online dershane mi, online özel ders mi? Karar nasıl verilir?",
        paragraphs: [
          "Öğrenci tüm derslerde temel bir problem yaşıyorsa yapılandırılmış bir online dershane modeli daha sağlıklı sonuç verir. Sadece belirli bir derste tıkanma varsa online özel ders daha hızlı çözüm olabilir.",
          "Çoğu durumda en işlevsel yol, dershane düzenine ihtiyaç olduğunda ders bazlı özel destekle birleşmiş bir yaklaşım oluyor."
        ],
        links: [
          { label: "Canlı ders modeli nasıl işliyor?", href: "/online-ozel-ders" },
          { label: "Ders bazlı küçük grup sistemini incele", href: "/urunler/online-dershanem" }
        ]
      }
    ],
    cta: {
      title: "Sana uygun paketi birlikte seçelim",
      text: "Tek başına çalışırken nerede takıldığını görmek zordur. Hangi dersten başlaman gerektiğini ekibimizle konuşalım.",
      buttonLabel: "Paketleri İncele",
      href: "/paketler"
    },
    relatedSlugs: ["online-ozel-ders-mi-dershane-mi", "yks-online-ders-calisma-plani", "online-dershane-fiyatlari-2026"]
  },
  {
    slug: "online-ozel-ders-mi-dershane-mi",
    category: "Online Ders",
    title: "Online Dershane mi Özel Ders mi? Hangisi Sana Uygun?",
    seoTitle: "Online Dershane mi Özel Ders mi? Karşılaştırma Rehberi",
    metaDescription:
      "Online dershane mi özel ders mi daha verimli? Maliyet, süreklilik ve sonuç açısından küçük grup modeliyle karşılaştırmalı değerlendirme.",
    excerpt:
      "En sık sorulan sorulardan biri: online dershane mi alayım, özel ders mi? Cevap öğrencinin ihtiyacına göre değişiyor; bu yazıda karar vermene yardımcı olacak ölçütleri sıralıyoruz.",
    cardSnippet: "Online dershane ve özel ders karşılaştırması: hangisi sana uygun?",
    featured: true,
    sections: [
      {
        h2: "Özel dersin güçlü tarafı",
        bullets: ["Birebir ilgi", "Hızlı ilerleme", "Esnek ders planı"],
        paragraphs: [
          "Doğru öğretmenle yapılan özel ders kısa sürede ciddi sonuç verebilir.",
          "Ancak çoğu öğrenci için bu maliyet, uzun sınav dönemlerinde zorlayıcı hale gelebiliyor."
        ]
      },
      {
        h2: "Online dershanenin güçlü tarafı",
        bullets: ["Sistemli ilerleme", "Daha uygun maliyet", "Düzenli takip"],
        paragraphs: [
          "Online dershane modelinde haftalık plan, deneme analizi ve takip aynı sistemde yürütülür.",
          "Özellikle uzun sınav süreçlerinde bu düzen, motivasyonu korumayı kolaylaştırır."
        ]
      },
      {
        h2: "Çoğu öğrenci için en dengeli seçenek: küçük grup",
        bullets: ["4 kişilik gruplar", "Derste soru sorma alanı", "Dershane gibi düzen"],
        paragraphs: [
          "Küçük grupta öğrenci ne kalabalıkta kaybolur ne de maliyet yükü altına girer.",
          "Bu yapı hem verimli hem de uzun sınav sürecinde takip edilebilir bir ilerleme sunar."
        ],
        links: [{ label: "Online dershane sistemini incele", href: "/urunler/online-dershanem" }]
      }
    ],
    cta: {
      title: "Küçük grup yaklaşımını yakından incele",
      text: "Öğrencinin seviyesine göre en uygun grubu birlikte seçelim.",
      buttonLabel: "onlinedershanem. ürününü incele",
      href: "/urunler/online-dershanem"
    },
    relatedSlugs: ["online-dershane-nedir", "yks-online-ders-calisma-plani", "online-dershane-fiyatlari-2026"]
  },
  {
    slug: "yks-online-ders-calisma-plani",
    category: "YKS",
    title: "TYT ve AYT Aynı Anda Nasıl Çalışılır?",
    seoTitle: "TYT ve AYT Aynı Anda Nasıl Çalışılır? Net Üreten Sistem",
    metaDescription:
      "TYT ve AYT'yi birlikte yürütürken zaman yönetimi, deneme analizi ve haftalık plan nasıl kurulur? Uygulanabilir bir haftalık plan.",
    excerpt:
      "YKS sürecinde en sık karşılaşılan sorun TYT ile AYT arasında dengeyi kuramamak. Yanlış denge sıralamayı doğrudan etkiliyor; bu yazıda işleyen bir haftalık plan kuruyoruz.",
    cardSnippet: "TYT + AYT dengesini kuran uygulanabilir haftalık çalışma planı.",
    featured: false,
    sections: [
      {
        h2: "TYT ve AYT arasındaki temel fark",
        bullets: ["TYT: hız ve süre yönetimi", "AYT: derinlik ve analiz", "İki alan farklı çalışma mantığı ister"],
        paragraphs: [
          "TYT ve AYT aynı yöntemle çalışıldığında önce süre yönetimi bozuluyor.",
          "Doğru yaklaşım, iki alanı aynı hafta içinde dengeli ama farklı yoğunluklarla yürütmektir."
        ]
      },
      {
        h2: "Haftalık plan nasıl kurulmalı?",
        bullets: [
          "TYT için kısa ve hızlı bloklar",
          "AYT için uzun ve derin odak blokları",
          "Her blok sonunda kısa bir mini test"
        ],
        paragraphs: [
          "Mini test olmayan çalışma ölçülmez. Ölçülmeyen plan da bir hafta sonra kendiliğinden dağılır."
        ]
      },
      {
        h2: "Deneme analizi nasıl yapılır?",
        paragraphs: [
          "Her deneme sonrası kendine sorulması gereken ilk soru şudur: \"Nerede süre kaybettim?\"",
          "Bu soruya net cevap verilmeyen analizlerde ilerleme görünmez kalır."
        ],
        bullets: ["Süre kaybedilen branşları ayır", "Yanlışları tipine göre sınıflandır", "Bir sonraki haftayı analize göre kur"]
      },
      {
        h2: "Sınava yaklaştıkça ne yapılmalı?",
        bullets: ["TYT tekrarını sıklaştır", "AYT'de zayıf konulara odaklan", "Deneme ritmini bozma"]
      },
      {
        h2: "En sık karşılaşılan sorun: takipsizlik",
        paragraphs: [
          "Öğrencilerin çoğu plan yapmayı biliyor ama planı uygulamakta zorlanıyor. Düzenli takip olmadığında program kısa sürede dağılıyor."
        ],
        links: [{ label: "Canlı ders modelini incele", href: "/online-ozel-ders" }]
      }
    ],
    cta: {
      title: "TYT + AYT dengesini konuşalım",
      text: "Tek başına denge kurmakta zorlanıyorsan haftalık planı küçük grup dersinde birlikte hazırlayalım.",
      buttonLabel: "onlinedershanem. ürününü incele",
      href: "/urunler/online-dershanem"
    },
    relatedSlugs: ["online-dershane-nedir", "online-ozel-ders-mi-dershane-mi", "online-dershane-fiyatlari-2026"]
  },
  {
    slug: "lgs-online-ders-net-artirma",
    category: "LGS",
    title: "LGS Net Nasıl Artırılır? 8 Haftalık Uygulanabilir Plan",
    seoTitle: "LGS Net Nasıl Artırılır? 8 Haftalık Uygulanabilir Plan",
    metaDescription:
      "LGS netlerini artırmak için 8 haftalık uygulanabilir bir plan: düzenli çalışma, deneme analizi ve doğru ölçme sistemiyle ilerleme.",
    excerpt:
      "LGS'de net artırmak istiyorsan en büyük engel plansız ve dağınık çalışmak. Bu yazıda 8 haftalık somut çalışma planını adım adım anlatıyoruz.",
    cardSnippet: "LGS net artırmak için 8 haftalık uygulanabilir plan ve analiz sistemi.",
    featured: false,
    sections: [
      {
        h2: "LGS'de net artmamasının üç yaygın sebebi",
        paragraphs: [
          "LGS hazırlığında çoğu öğrenci çok çalışmasına rağmen ilerleyemiyor. Bunun temel nedenleri plansız çalışma, deneme sonrası analiz yapılmaması ve çok sayıda kaynak arasında dağılmak.",
          "Net artışının formülü aslında oldukça net: ölçüm, analiz ve hedefli tekrar."
        ],
        bullets: ["Plansız çalışma", "Deneme analizinin atlanması", "Çok kaynak, az tekrar"]
      },
      {
        h2: "1-2. hafta: Mevcut seviyeyi ölçme",
        paragraphs: [
          "İlk iki haftada öğrencinin mevcut seviyesini ölçmek gerekiyor. Bir seviye belirleme denemesi yapıp özellikle Türkçe paragraf ve matematik problem sürelerini ölçmek kritik.",
          "Bu aşamada öncelik hız değil, doğru çözüm alışkanlığını kurmak."
        ]
      },
      {
        h2: "3-5. hafta: Deneme rutinini oturtma",
        paragraphs: [
          "Bu dönemde öğrencinin seviyesine uygun düzenli deneme veya mini deneme kullanılabilir. Deneme sonrası analiz, yeni haftanın çalışma önceliğini belirlemeye yardımcı olur.",
          "Analizde şu ayrım net biçimde yapılmalı: bilgi eksikliği mi, dikkat hatası mı? Bu ayrım sonraki haftanın planını belirler."
        ],
        bullets: ["Haftada en az 1 deneme", "Her deneme sonrası analiz", "Bilgi eksiği – dikkat hatası ayrımı"]
      },
      {
        h2: "6-8. hafta: Sınav simülasyonu",
        paragraphs: [
          "Son aşamada süre baskısı altında çözüm pratiği ve doğru soru seçme stratejisi öne çıkıyor.",
          "Bu dönemde tek bir net sonucundan çok; süre kullanımı, boşlar ve tekrar eden hata türlerinin birkaç denemedeki seyri izlenmelidir."
        ],
        bullets: ["Süre baskısı altında çözüm", "Doğru soru seçme stratejisi", "İstikrarlı net çıktısı"]
      },
      {
        h2: "Tek başına çalışmak neden bu kadar zor?",
        paragraphs: [
          "Planı bilmek tek başına yetmez. Asıl zorluk, planı haftalar boyunca aynı disiplinle uygulayabilmek.",
          "Düzenli takip ve dış kontrol olmadığında sistem genellikle ilk haftalardan sonra dağılıyor."
        ],
        bullets: ["Disiplin eksikliği", "Takip eksikliği", "Geri bildirim eksikliği"]
      },
      {
        h2: "Çalışma düzenini sürdürebilmek için sistemli model",
        paragraphs: [
          "Bu yüzden öğrencilerin önemli bir kısmı küçük grup online ders modeline geçiyor. Bu yapıda haftalık takip, deneme analizi ve seviyeye göre plan aynı anda yürütülüyor.",
          "Böylece öğrenci yalnızca soru çözmekle kalmaz; hangi eksiğe neden döndüğünü de takip edebilir."
        ],
        links: [
          { label: "Online dershane sistemini incele", href: "/urunler/online-dershanem" },
          { label: "Canlı ders yaklaşımını incele", href: "/online-ozel-ders" }
        ]
      }
    ],
    cta: {
      title: "Net artışı için haftalık planı çıkaralım",
      text: "Bunu tek başına uygulamak zor geliyorsa öğrencinin seviyesine göre haftalık planı birlikte hazırlayalım.",
      buttonLabel: "Paketleri İncele",
      href: "/paketler"
    },
    relatedSlugs: ["online-dershane-nedir", "online-ozel-ders-mi-dershane-mi", "online-dershane-fiyatlari-2026"]
  },
  {
    slug: "online-dershane-fiyatlari-2026",
    category: "Online Dershane",
    title: "Online Dershane Fiyatları 2026",
    seoTitle: "Online Dershane Fiyatları 2026: Ne Kadar Ödemelisin?",
    metaDescription:
      "Online dershane fiyatları 2026 yılında neye göre değişiyor? Grup büyüklüğü, canlı ders kapsamı, takip ve ödeme koşullarını karşılaştırma rehberi.",
    excerpt:
      "Online dershane fiyatları çok değişken. Peki gerçek değer ne? Bu yazıda fiyatı değil sonucu nasıl ölçmen gerektiğini anlatıyoruz.",
    cardSnippet: "Online dershane fiyatları 2026: ucuz mu, değerli mi?",
    featured: false,
    sections: [
      {
        h2: "Fiyatı tek başına okumak yeterli mi?",
        bullets: ["Sınıf mevcudu", "Canlı ders süresi ve sıklığı", "Ders sonrası takip kapsamı"],
        paragraphs: [
          "Piyasadaki rakamlar ders süresi, grup büyüklüğü ve takip kapsamına göre değişir. Bu yüzden yalnız aylık etiketi değil, karşılığında sunulan gerçek ders ve takip düzenini karşılaştırmak gerekir."
        ]
      },
      {
        h2: "Fiyatı Belirleyen Faktörler",
        bullets: ["Sınıf mevcudu", "Canlı etkileşim", "Ders sonrası takip sistemi"],
        paragraphs: [
          "Küçük grup ve ders sonrası takip maliyeti etkileyebilir; karşılaştırmada öğrencinin soru sorma ve geri bildirim alma imkânı da değerlendirilmelidir."
        ]
      },
      {
        h2: "Ucuz mu, Değerli mi?",
        bullets: ["En düşük fiyat her ihtiyaca uygun olmayabilir", "Ders ve takip kapsamını da karşılaştırın"],
        paragraphs: [
          "En uygun tercih; öğrencinin seviyesine, ihtiyaç duyduğu geri bildirime ve ailenin bütçesine uyan seçenektir."
        ],
        links: [{ label: "Online dershane sistemimizi incele", href: "/urunler/online-dershanem" }]
      }
    ],
    cta: {
      title: "Küçük grup + düzenli takibi birlikte deneyin",
      text: "Öğrencinin seviyesine göre ders planını birlikte çıkaralım.",
      buttonLabel: "Paketleri İncele",
      href: "/paketler"
    },
    relatedSlugs: ["online-dershane-nedir", "online-ozel-ders-mi-dershane-mi", "yks-online-ders-calisma-plani"]
  },
  {
    slug: "e-dershane-nedir",
    category: "e-Dershane",
    title: "e Dershane Nedir? Kimler İçin Gerçekten Verimli?",
    seoTitle: "e Dershane Nedir? LGS ve YKS İçin Kılavuz",
    metaDescription:
      "e dershane nedir, online dershaneden farkı var mı? LGS-YKS öğrencileri için verimli e dershane seçme rehberi.",
    excerpt:
      "e dershane arayan öğrenciler için en kritik konu düzenli ilerleme. Hangi yaklaşım gerçekten işe yarıyor, bu yazıda anlatıyoruz.",
    cardSnippet: "e dershane seçerken bakman gereken 3 kritik kriter.",
    featured: false,
    sections: [
      {
        h2: "e dershane ile online dershane aynı mı?",
        paragraphs: [
          "Piyasada e dershane ve online dershane terimleri çoğu zaman aynı anlamda kullanılıyor.",
          "Asıl fark isimde değil, öğrencinin haftalık olarak takip edilip edilmediğinde ortaya çıkıyor."
        ]
      },
      {
        h2: "Verimli e dershane modelinde olmazsa olmazlar",
        bullets: ["Küçük grup dersi", "Haftalık deneme analizi", "Ders bazlı seçim esnekliği"],
        paragraphs: [
          "Bu üç yapı yoksa e dershane sadece video arşivine dönüşür ve öğrenci kısa sürede kopar."
        ]
      },
      {
        h2: "Kimler e dershane modelinden daha düzenli yararlanabilir?",
        bullets: ["Takip ile çalışan öğrenciler", "Planı tek başına sürdüremeyenler", "Ders bazlı destek isteyenler"],
        links: [{ label: "Online dershane sistemini detaylı incele", href: "/urunler/online-dershanem" }]
      }
    ],
    cta: {
      title: "e dershane yaklaşımımızı yakından incele",
      text: "Öğrencinin seviyesine göre hangi dersten başlaman gerektiğini birlikte konuşalım.",
      buttonLabel: "Paketleri İncele",
      href: "/paketler"
    },
    relatedSlugs: ["online-dershane-nedir", "online-ozel-ders-mi-dershane-mi", "online-dershane-fiyatlari-2026"]
  },
  {
    slug: "online-ders-calisma-programi",
    category: "Online Ders",
    title: "Online Ders Çalışma Programı Nasıl Hazırlanır?",
    seoTitle: "Online Ders Çalışma Programı: Uygulanabilir Plan",
    metaDescription:
      "Online ders sürecinde dağılmadan çalışmak için haftalık program nasıl hazırlanır? Uygulanabilir plan ve takip modeli burada.",
    excerpt:
      "Online ders alırken asıl sorun planı sürdürmek. Bu yazıda uygulanabilir haftalık programı adım adım kuruyoruz.",
    cardSnippet: "Online ders programı dağılmadan nasıl yürütülür?",
    featured: false,
    sections: [
      {
        h2: "Program neden ilk haftadan bozuluyor?",
        bullets: ["Gerçekçi olmayan hedefler", "Ölçümsüz çalışma", "Tekrar bloğu olmaması"]
      },
      {
        h2: "Haftalık online ders planı şablonu",
        bullets: [
          "2 gün konu + kısa test",
          "2 gün soru çözüm ve hız",
          "1 gün deneme + analiz",
          "1 gün eksik kapatma"
        ],
        paragraphs: ["Plan mutlaka her hafta deneme sonucuna göre güncellenmelidir."]
      },
      {
        h2: "Programı sürdürmek için takip şart",
        paragraphs: ["Programı yazmak kadar uygulamayı izlemek de önemlidir. Öğretmen geri bildirimi, tamamlanmayan hedefin nedenini görüp planı yeniden düzenlemeye yardımcı olabilir."],
        links: [{ label: "Canlı ders desteğiyle planını gözden geçir", href: "/online-ozel-ders" }]
      }
    ],
    cta: {
      title: "Kişiye özel çalışma programını konuşalım",
      text: "İhtiyacına uygun küçük grup dersinde haftalık planını seviyene göre kuralım.",
      buttonLabel: "Ön Görüşme Talep Et",
      href: "/iletisim#on-gorusme"
    },
    relatedSlugs: ["yks-online-ders-calisma-plani", "online-dershane-nedir", "lgs-online-ders-net-artirma"]
  },
  {
    slug: "ozel-ders-mi-kucuk-grup-mu",
    category: "Online Ders",
    title: "Özel Ders mi Küçük Grup mu? Hangi Seçim Daha Mantıklı?",
    seoTitle: "Özel Ders mi Küçük Grup mu? Karar Rehberi",
    metaDescription:
      "Özel ders ve küçük grup online ders modeli arasında karar veremiyor musun? Maliyet, verim ve süreklilik karşılaştırması.",
    excerpt:
      "Özel ders her zaman en iyi seçenek değildir. Küçük grup dersi bazı öğrenciler için daha verimli ve daha kolay yürütülebilir olabilir.",
    cardSnippet: "Özel ders vs küçük grup: maliyet ve sonuç kıyası.",
    featured: false,
    sections: [
      {
        h2: "Özel dersin güçlü tarafı",
        bullets: ["Birebir tempo", "Anlık geri bildirim", "Kısa vadede hızlı toparlama"]
      },
      {
        h2: "Küçük grubun güçlü tarafı",
        bullets: ["Daha uygun maliyet", "Düzenli haftalık takip", "Akran motivasyonu"],
        paragraphs: ["Uzun sınav dönemlerinde süreklilik, kısa vadeli hızdan daha belirleyici olur."]
      },
      {
        h2: "Hangi durumda hangi model seçilmeli?",
        bullets: ["Tek ders krizi varsa: özel ders", "Genel dağınıklık varsa: küçük grup + takip"],
        links: [{ label: "Küçük grup online dershaneyi incele", href: "/urunler/online-dershanem" }]
      }
    ],
    cta: {
      title: "Uygun seçeneği birlikte seçelim",
      text: "Öğrencinin seviyesine göre özel ders mi küçük grup mu daha verimli, ön görüşmede konuşalım.",
      buttonLabel: "Ön Görüşme Talep Et",
      href: "/iletisim#on-gorusme"
    },
    relatedSlugs: ["online-ozel-ders-mi-dershane-mi", "online-dershane-nedir", "online-dershane-fiyatlari-2026"]
  },
  {
    slug: "yks-matematik-net-artirma",
    category: "YKS",
    title: "YKS Matematik Neti Nasıl Artar? Uygulanabilir Yol Haritası",
    seoTitle: "YKS Matematik Net Artırma Rehberi",
    metaDescription:
      "YKS matematik neti artırmak için soru analizi, süre yönetimi ve haftalık çalışma planı nasıl kurulmalı? Adım adım öğren.",
    excerpt:
      "YKS matematikte net artırmak için çok soru çözmek tek başına yetmez. Doğru analiz ve doğru sıra gerekir.",
    cardSnippet: "YKS matematikte hatayı analize ve haftalık plana çeviren adımlar.",
    featured: false,
    sections: [
      {
        h2: "Neden net artmıyor?",
        bullets: ["Soru tipi analizi yapılmıyor", "Süre yönetimi ihmal ediliyor", "Tekrar planı zayıf kalıyor"]
      },
      {
        h2: "Haftalık matematik planı",
        bullets: ["2 gün konu tekrar", "2 gün yeni nesil soru", "1 gün zamanlı deneme", "1 gün yanlış dönüşü"],
        paragraphs: ["Yanlışlara dönülmeyen programda aynı hata türleri fark edilmeden tekrarlanabilir."]
      },
      {
        h2: "Süre yönetimi nasıl geliştirilir?",
        paragraphs: ["Soru başına bir takılma eşiği belirlemek, öğrencinin deneme sırasında geçme ve geri dönme kararını daha bilinçli vermesine yardımcı olur."],
        links: [{ label: "YKS için canlı ders desteğini incele", href: "/online-ozel-ders" }]
      }
    ],
    cta: {
      title: "Matematik çalışma planını birlikte hazırlayalım",
      text: "Mevcut matematik seviyeni analiz edip küçük grup dersinde ilk 4 haftalık planını birlikte çıkaralım.",
      buttonLabel: "YKS Matematik Paketini İncele",
      href: "/urunler/online-dershanem"
    },
    relatedSlugs: ["yks-online-ders-calisma-plani", "online-dershane-nedir", "online-dershane-fiyatlari-2026"]
  },
  {
    slug: "lgs-matematikte-zorlananlar-icin",
    category: "LGS",
    title: "LGS Matematikte Zorlananlar İçin Kurtarma Planı",
    seoTitle: "LGS Matematikte Net Artırma Planı",
    metaDescription:
      "LGS matematikte zorlanan öğrenciler için adım adım net artırma planı. Problem çözme, deneme analizi ve haftalık tekrar sistemi.",
    excerpt:
      "LGS matematikte zorlanıyorsan konu bilmek yetmez; soru refleksi ve analiz disiplini kurman gerekir.",
    cardSnippet: "LGS matematikte tıkanmayı kıran haftalık plan.",
    featured: false,
    sections: [
      {
        h2: "En yaygın matematik hataları",
        bullets: ["Soruyu eksik okumak", "Uzun soruda panik", "Yanlıştan ders çıkarmamak"]
      },
      {
        h2: "4 haftalık toparlama planı",
        bullets: ["Temel konu tekrar", "Günlük problem seti", "Haftalık mini deneme", "Yanlış defteri takibi"]
      },
      {
        h2: "Küçük grup desteği ne kazandırır?",
        paragraphs: ["En fazla 4 öğrencilik sınıfta öğretmen öğrencinin işlem hatasını hızlı fark eder ve anında müdahale eder."],
        links: [{ label: "LGS için online dershane modelini gör", href: "/urunler/online-dershanem" }]
      }
    ],
    cta: {
      title: "LGS matematik paketini incele",
      text: "Öğrencinin matematik seviyesini ölçüp hangi konudan başlaman gerektiğini belirleyelim.",
      buttonLabel: "LGS Matematik Paketini İncele",
      href: "/urunler/online-dershanem"
    },
    relatedSlugs: ["lgs-online-ders-net-artirma", "online-dershane-nedir", "online-ozel-ders-mi-dershane-mi"]
  },
  {
    slug: "deneme-analizi-nasil-yapilir",
    category: "Sınav Stratejisi",
    title: "Deneme Analizi Nasıl Yapılır? Net Artıran Yöntem",
    seoTitle: "Deneme Analizi Nasıl Yapılır? Net Artışı İçin Rehber",
    metaDescription:
      "Deneme analizi nasıl yapılır? Yanlışları sınıflandırıp bir sonraki haftaya uygulanabilir çalışma planı çıkarmayı öğren.",
    excerpt:
      "Deneme çözmek tek başına yeterli değil. Net artışı, deneme sonrası yapılan doğru analizle başlar.",
    cardSnippet: "Net artırmak isteyenler için deneme analiz sistemi.",
    featured: false,
    sections: [
      {
        h2: "Deneme sonrası ilk 3 soru",
        bullets: [
          "Nerede süre kaybettim?",
          "Yanlışın nedeni bilgi mi dikkat mi?",
          "Hangi konudan tekrar çıkmalı?"
        ]
      },
      {
        h2: "Yanlış sınıflandırma şablonu",
        bullets: ["Bilgi eksiği", "Dikkat hatası", "Süre baskısı", "Yanlış soru seçimi"],
        paragraphs: ["Bu ayrım yapılmadan deneme çözmek, aynı hataların tekrarıyla sonuçlanır."]
      },
      {
        h2: "Analizden plana geçiş",
        paragraphs: ["Analiz sonuçları bir sonraki haftanın konu ve soru dağılımını belirlemeli."],
        links: [{ label: "Haftalık takipli online dershane modeli", href: "/urunler/online-dershanem" }]
      }
    ],
    cta: {
      title: "Deneme analizini düzenli takibe bağla",
      text: "Deneme sonuçlarını birlikte değerlendirip haftalık planı çıkaralım.",
      buttonLabel: "Ön Görüşme Talep Et",
      href: "/iletisim#on-gorusme"
    },
    relatedSlugs: ["yks-online-ders-calisma-plani", "lgs-online-ders-net-artirma", "online-dershane-nedir"]
  },
  {
    slug: "online-dershane-secim-rehberi-2026",
    category: "Online Dershane",
    title: "Online Dershane Seçim Rehberi 2026",
    seoTitle: "Online Dershane Seçim Rehberi 2026",
    metaDescription:
      "2026'da online dershane seçerken dikkat edilmesi gereken kriterler: sınıf mevcudu, canlı etkileşim, takip sistemi ve şeffaf ödeme koşulları.",
    excerpt:
      "Online dershane seçerken reklama değil, ölçülebilir kriterlere bakarak karar vermek uzun vadede çok daha sağlıklı sonuç veriyor.",
    cardSnippet: "2026 için online dershane seçim kontrol listesi.",
    featured: false,
    sections: [
      {
        h2: "Kayıt öncesi kontrol listesi",
        bullets: ["Sınıf mevcudu kaç?", "Haftalık takip var mı?", "Deneme analizi düzenli mi?", "Ders bazlı seçim var mı?"]
      },
      {
        h2: "Öğretmen ve sistem dengesi",
        paragraphs: [
          "İyi öğretmen tek başına yeterli değildir; düzenli takip olmadan öğrencinin ilerlemesi kalıcı olmaz."
        ]
      },
      {
        h2: "Yanlış seçim maliyeti nasıl artar?",
        paragraphs: [
          "Yanlış modelde geçen aylar hem zaman hem motivasyon kaybettirir. Bu yüzden başlangıç seçimi kritik bir yatırım kararıdır."
        ],
        links: [{ label: "Online dershane modelimizi detaylı incele", href: "/urunler/online-dershanem" }]
      }
    ],
    cta: {
      title: "Doğru online dershane seçimi için bizimle iletişime geç",
      text: "Öğrencinin seviyesine göre en uygun başlangıcı birlikte konuşalım.",
      buttonLabel: "Ön Görüşme Talep Et",
      href: "/iletisim#on-gorusme"
    },
    relatedSlugs: ["online-dershane-nedir", "online-dershane-fiyatlari-2026", "online-ozel-ders-mi-dershane-mi"]
  },
  {
    slug: "online-ders-disiplini-nasil-kurulur",
    category: "Online Ders",
    title: "Online Ders Disiplini Nasıl Kurulur?",
    seoTitle: "Online Ders Disiplini Kurma Rehberi",
    metaDescription:
      "Online ders sürecinde disiplin nasıl kurulur? Ertelemeyi azaltan, kalıcı çalışma alışkanlığı oluşturan pratik yöntemler.",
    excerpt:
      "Online dersin en kritik noktası süreklilik. Disiplin kurulamayan programlarda sonuç almak zorlaşır.",
    cardSnippet: "Online derslerde istikrar sağlayan disiplin modeli.",
    featured: false,
    sections: [
      {
        h2: "Disiplin neden bozulur?",
        bullets: ["Belirsiz hedefler", "Takip mekanizması olmaması", "Aşırı yoğun program denemeleri"]
      },
      {
        h2: "Sürdürülebilir sistem nasıl kurulur?",
        bullets: ["Kısa günlük bloklar", "Haftalık sabit deneme saati", "Geri bildirim döngüsü"],
        paragraphs: ["Kısa ve düzenli çalışma blokları, aşırı yoğun programlara göre takip edilmesi daha kolay bir düzen sağlayabilir."]
      },
      {
        h2: "Takip sistemiyle disiplin kalıcı hale gelir",
        paragraphs: ["Öğrenci tek başına kaldığında planı esnetir; dış takip disiplini korumanın en etkili yoludur."],
        links: [{ label: "Haftalık takipli online ders modelini incele", href: "/urunler/online-dershanem" }]
      }
    ],
    cta: {
      title: "Çalışma düzenini birlikte oluşturalım",
      text: "Küçük grup dersinde öğrencinin haftalık çalışma düzenini seviyesine göre tasarlayalım.",
      buttonLabel: "Ön Görüşme Talep Et",
      href: "/iletisim#on-gorusme"
    },
    relatedSlugs: ["online-ders-calisma-programi", "deneme-analizi-nasil-yapilir", "online-dershane-nedir"]
  }
];

export const contact = {
  phone: "+90 537 795 44 34",
  email: "iletisim@onlinedershanem.com",
  whatsapp: "+90 537 795 44 34",
  address: "Yıldız Teknik Üniversitesi Davutpaşa Kampüsü"
};

export const seoKeywords = [
  "onlinedershanem", "online canlı ders", "LGS", "YKS",
  "birebir online ders", "küçük grup canlı ders", "online matematik dersi",
  "Yön Koçluk", "haftalık çalışma planı", "Deneme Ligi",
  "online deneme", "deneme analizi", "Dino AI"
];

/**
 * Türkçe formattaki fiyat string'ini kuruşa çevirir.
 * Örnek: "₺1.500,00 / Ay" → 150000
 *        "1.500,00₺"     → 150000
 *        "3.290 TL"      → 329000
 */
export function parsePriceToCents(priceLabel: string | null | undefined): number {
  if (!priceLabel) return 0;
  // Sadece rakam, nokta (binlik) ve virgül (ondalık) bırak
  const cleaned = priceLabel.replace(/[^\d.,]/g, "");
  if (!cleaned) return 0;

  // Türkçe format: "1.500,00" — nokta=binlik, virgül=ondalık
  let normalised = cleaned;
  if (cleaned.includes(",")) {
    // Türkçe formatlı: noktayı sil, virgülü noktaya çevir
    normalised = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // Sadece nokta var — binlik ayraç olarak yorumla (örn "3.290")
    normalised = cleaned.replace(/\./g, "");
  }

  const tl = parseFloat(normalised);
  if (!isFinite(tl) || tl <= 0) return 0;
  return Math.round(tl * 100);
}

/**
 * Katalogdaki KAMPANYA ÖNCESİ liste fiyatını (`oldPrice`) kuruş olarak döner.
 *
 * Bu değer ödeme-kritik DEĞİLDİR; yalnızca üstü çizili gösterim içindir.
 * Tanımlı değilse 0 döner ve arayüz üstü çizili fiyat basmaz.
 */
export function getPackageListPriceCents(
  category: string,
  subject: string,
): number {
  for (const group of subjectPackageGroups) {
    for (const pkg of group.packages) {
      if (pkg.category === category && pkg.subject === subject) {
        return parsePriceToCents(pkg.oldPrice);
      }
    }
  }
  return 0;
}

/**
 * Static katalogdaki paket fiyatını kuruş olarak döner. Bulamazsa 0.
 */
export function getPackagePriceCents(
  category: string,
  subject: string,
): number {
  for (const group of subjectPackageGroups) {
    for (const pkg of group.packages) {
      if (pkg.category === category && pkg.subject === subject) {
        // Açık priceCents tercih edilir; yoksa Türkçe etiketten parse edilir.
        return pkg.priceCents > 0
          ? pkg.priceCents
          : parsePriceToCents(pkg.discountedPrice);
      }
    }
  }
  return 0;
}
