import { blogPosts as existingBlogPosts } from "@/lib/content";

export type BlogSection = {
  h2: string;
  paragraphs?: string[];
  bullets?: string[];
  links?: Array<{ label: string; href: string }>;
};

export type BlogPost = {
  slug: string;
  category: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  cardSnippet: string;
  featured: boolean;
  summary?: string[];
  sections: BlogSection[];
  faq?: Array<{ q: string; a: string }>;
  cta: { title: string; text: string; buttonLabel: string; href?: string };
  relatedSlugs: string[];
};

const newBlogPosts: BlogPost[] = [
  {
    slug: "lgs-matematik-calisma-programi",
    category: "LGS",
    title: "LGS Matematik Çalışma Programı Nasıl Hazırlanır?",
    seoTitle: "LGS Matematik Çalışma Programı: Haftalık Plan",
    metaDescription:
      "LGS matematik için konu, soru çözümü, tekrar ve deneme analizini dengeleyen uygulanabilir haftalık çalışma programını adım adım kurun.",
    excerpt:
      "İyi bir LGS matematik programı yalnızca kaç soru çözüleceğini söylemez; öğrencinin eksiğine göre hangi gün neyi, neden çalışacağını da belirtir.",
    cardSnippet: "Konu, soru, tekrar ve denemeyi dengeleyen gerçekçi haftalık plan.",
    featured: true,
    summary: [
      "Programı hazır bir takvimden değil, son deneme ve konu taramasından başlatın.",
      "Yeni konu, karışık soru ve yanlış dönüşü için ayrı çalışma blokları kullanın.",
      "Haftalık planı tamamlanan sayfaya göre değil, kapanan hata türlerine göre güncelleyin."
    ],
    sections: [
      {
        h2: "Önce mevcut matematik seviyesini görün",
        paragraphs: [
          "Program yazmadan önce öğrencinin hangi kazanımlarda rahat, hangi soru türlerinde kararsız olduğunu görmek gerekir. Son iki denemedeki boşlar ve yanlışlar; konu bilgisi, soruyu anlama, işlem ve süre başlıklarıyla ayrıldığında başlangıç noktası belirginleşir.",
          "Aynı sınıftaki iki öğrencinin haftalık planı bu nedenle aynı olmak zorunda değildir. Biri temel işlem hatalarını azaltmaya çalışırken diğeri uzun problem metinlerinde doğru modeli kurmaya odaklanabilir."
        ]
      },
      {
        h2: "Uygulanabilir bir haftanın dört parçası",
        bullets: [
          "Konu ve örnek çözüm: eksik kazanımı kısa anlatım ve temel sorularla pekiştirme",
          "Odaklı soru seti: aynı beceriyi farklı soru biçimlerinde kullanma",
          "Karışık tekrar: eski konuların unutulmasını önleme",
          "Deneme ve analiz: bir sonraki haftanın önceliğini belirleme"
        ],
        paragraphs: [
          "Bu parçaların süresi öğrencinin okul ve diğer ders yüküne göre ayarlanmalıdır. Her gün uzun saatler yazmak yerine, başlayıp bitirilebilen 30–45 dakikalık bloklar daha izlenebilir bir düzen sağlar."
        ]
      },
      {
        h2: "Örnek haftalık akış",
        bullets: [
          "Pazartesi: eksik konu ve 10–15 temel soru",
          "Salı: yeni nesil soru seti ve çözüm notları",
          "Çarşamba: kısa karışık tekrar",
          "Perşembe: zorlanılan soru türüne ikinci dönüş",
          "Hafta sonu: süreli mini deneme, yanlış analizi ve yeni hafta planı"
        ],
        paragraphs: [
          "Bu bir başlangıç şablonudur; sabit reçete değildir. Öğrenci perşembe günkü hedefi tamamlayamadıysa hafta sonuna yeni bir konu eklemek yerine, yarım kalan beceriyi kapatmak daha anlamlı olabilir."
        ]
      },
      {
        h2: "Programın çalışıp çalışmadığını nasıl anlarsınız?",
        paragraphs: [
          "Yalnız toplam nete bakmak kısa vadede yanıltıcı olabilir. Boş bırakılan soru sayısı, aynı hata türünün tekrar edip etmediği, bir soruda gereğinden uzun kalma ve çözümünü açıklayabilme gibi göstergeler de izlenmelidir.",
          "Hafta sonunda üç soruya cevap verin: Hangi hata azaldı, hangi konu hâlâ kırılgan ve gelecek hafta tek öncelik ne olacak? Bu cevaplar bir sonraki planı sade tutar."
        ],
        links: [
          { label: "Deneme analizini adım adım öğrenin", href: "/blog/matematik-deneme-analizi" },
          { label: "LGS matematik paketini inceleyin", href: "/lgs" }
        ]
      },
      {
        h2: "Veli programı nasıl destekleyebilir?",
        paragraphs: [
          "Velinin rolü her soruyu kontrol etmek değil, çalışma düzeninin devam edip etmediğini görmektir. Günlük sorgulama yerine haftada bir kısa değerlendirme; öğrencinin neyi tamamladığını, nerede desteğe ihtiyaç duyduğunu ve sonraki hedefini konuşmak için yeterlidir."
        ]
      }
    ],
    faq: [
      { q: "LGS matematik her gün çalışılmalı mı?", a: "Her öğrencinin ihtiyacı farklıdır. Düzenli kısa tekrarlar çoğu programda faydalıdır; ancak gün sayısı ve süre okul yükü, seviye ve hata analizine göre belirlenmelidir." },
      { q: "Haftada kaç matematik denemesi çözülmeli?", a: "Sabit bir sayı yerine denemenin analiz edilebilmesi önemlidir. Başlangıçta süreli mini denemeler, sınava yaklaştıkça genel denemeler öğrencinin planına göre artırılabilir." }
    ],
    cta: {
      title: "LGS matematik planını birlikte hazırlayalım",
      text: "En fazla dört öğrencilik canlı derste öğrencinin seviyesine göre çalışma yönünü belirleyelim.",
      buttonLabel: "LGS Paketini İncele",
      href: "/lgs"
    },
    relatedSlugs: ["lgs-yeni-nesil-matematik-sorulari", "matematik-deneme-analizi", "lgs-matematikte-zorlananlar-icin"]
  },
  {
    slug: "tyt-matematik-calisma-programi",
    category: "YKS",
    title: "TYT Matematik Çalışma Programı: Temelden Denemeye",
    seoTitle: "TYT Matematik Çalışma Programı: Haftalık Rehber",
    metaDescription:
      "TYT matematikte temel konu, problem, süreli set ve deneme analizini dengeleyen seviyeye uygun haftalık çalışma programı hazırlayın.",
    excerpt:
      "TYT matematikte ilerleme, her konuyu sırayla bitirmekten çok temel becerileri problem pratiği ve düzenli analizle birlikte geliştirmeye dayanır.",
    cardSnippet: "TYT matematik için temel, problem ve deneme dengesini kurun.",
    featured: false,
    summary: [
      "Temel işlem ve kavram eksiklerini problem çalışmasından tamamen ayırmayın.",
      "Doğruluk yerleşmeden yalnız hız hedeflemeyin.",
      "Her denemeden sonraki haftaya en fazla iki matematik önceliği taşıyın."
    ],
    sections: [
      {
        h2: "Programı net hedefinden önce hata haritasıyla başlatın",
        paragraphs: [
          "Son denemede kaç net yapıldığı tek başına program yazmak için yeterli değildir. Yanlış ve boşların temel bilgi, işlem, problem modelleme ve süre başlıklarında dağılımı çıkarıldığında hangi çalışma türünün ağırlık kazanması gerektiği görülür.",
          "Örneğin işlemleri doğru fakat yavaş yapan öğrenciyle, sorudaki ilişkiyi denkleme aktaramayan öğrencinin aynı soru setini çözmesi verimli olmayabilir."
        ]
      },
      {
        h2: "Haftayı üç çalışma türüne bölün",
        bullets: [
          "Temel blok: kısa konu tekrarı ve kademeli örnekler",
          "Problem bloğu: soru dilini modele dönüştürme pratiği",
          "Ölçme bloğu: süreli karışık set veya deneme ve ayrıntılı analiz"
        ],
        paragraphs: [
          "Her blok ayrı bir amaca hizmet eder. Temel blokta hız baskısı kurmak, problem bloğunda yalnız çözüme bakmak veya ölçme bloğunu analiz etmeden bırakmak programın geri bildirim döngüsünü bozar."
        ]
      },
      {
        h2: "Başlangıç, orta ve ileri seviye için ağırlık nasıl değişir?",
        paragraphs: [
          "Temeli kırılgan öğrencide konu ve temel soru ağırlığı daha yüksek tutulur; ancak haftada birkaç kısa problem sorusuyla okuma ve modelleme bağı korunur. Orta seviyede karışık setler ve yanlış dönüşü artar. İleri seviyede ise seçici sorular, süre yönetimi ve deneme stratejisi öne çıkar.",
          "Seviye değiştikçe yalnız soru sayısı değil, sorunun amacı da değişmelidir."
        ]
      },
      {
        h2: "Deneme sonucunu gelecek haftaya çevirin",
        bullets: [
          "Tekrarlanan iki hata türünü seçin",
          "Bu hatalar için bir temel ve bir uygulama oturumu planlayın",
          "Hafta sonunda benzer sorularla kısa kontrol yapın",
          "Kapanmayan eksiği yeni haftaya açık notla taşıyın"
        ],
        links: [
          { label: "TYT problem çözme hızını geliştirme rehberi", href: "/blog/tyt-matematik-problem-cozme-hizi" },
          { label: "YKS matematik ders paketini görün", href: "/yks" }
        ]
      },
      {
        h2: "TYT ve AYT aynı haftada nasıl dengelenir?",
        paragraphs: [
          "AYT çalışan bir öğrenci TYT matematiği tamamen bırakmamalıdır. Haftanın yoğunluğuna göre TYT için kısa karışık setler ve düzenli deneme analizi korunabilir; AYT tarafında ise daha uzun, kesintisiz öğrenme blokları kullanılabilir. Denge, sınava kalan süre ve öğrencinin güncel ihtiyacına göre yeniden kurulmalıdır."
        ]
      }
    ],
    faq: [
      { q: "TYT matematik programı kaç saat olmalı?", a: "Tek bir doğru süre yoktur. Öğrencinin seviyesi, okul programı ve diğer dersleri dikkate alınarak tamamlanabilir bloklar planlanmalı; süre kadar çalışma amacı da net olmalıdır." },
      { q: "TYT matematikte önce konular mı problemler mi bitmeli?", a: "Temel konular ile problem pratiğini tamamen ardışık yürütmek gerekmez. Öğrenci seviyesine uygun problem çalışması, temel konu öğrenimiyle birlikte kademeli biçimde ilerletilebilir." }
    ],
    cta: {
      title: "TYT ve AYT matematik düzenini birlikte oluşturalım",
      text: "YKS paketinin canlı ders ve ders sonrası yönlendirme modelini inceleyin.",
      buttonLabel: "YKS Paketini İncele",
      href: "/yks"
    },
    relatedSlugs: ["ayt-matematik-calisma-programi", "tyt-matematik-problem-cozme-hizi", "yks-matematik-net-artirma"]
  },
  {
    slug: "ayt-matematik-calisma-programi",
    category: "YKS",
    title: "AYT Matematik Çalışma Programı Nasıl Kurulur?",
    seoTitle: "AYT Matematik Çalışma Programı: Konu ve Deneme Planı",
    metaDescription:
      "AYT matematikte ön koşul konuları, derin çalışma bloklarını, karışık testleri ve deneme analizini dengeleyen bir program kurun.",
    excerpt:
      "AYT matematik programı yalnız konu listesi değildir. Ön koşulları gören, farklı konular arasında bağ kuran ve denemeden geri beslenen bir sistem olmalıdır.",
    cardSnippet: "AYT matematikte konu derinliği ve deneme dengesini kurun.",
    featured: false,
    summary: [
      "Konuları yalnız sıraya değil, ön koşul ilişkilerine göre planlayın.",
      "Uzun öğrenme bloklarının yanına kısa karışık tekrarlar ekleyin.",
      "Denemede görülen hatayı ilgili kavram ve çözüm adımına geri bağlayın."
    ],
    sections: [
      {
        h2: "Konu listesinden önce ön koşul haritası çıkarın",
        paragraphs: [
          "AYT matematikte bir konudaki zorlanma bazen o konunun kendisinden değil; fonksiyon, denklem, işlem veya grafik okuma gibi daha önceki bir beceriden kaynaklanır. Çalışma planı bu bağı görmeden yalnız sıradaki başlığa geçerse öğrenci aynı noktada yeniden takılabilir.",
          "İlk adım, yanlış soruda hangi çözüm adımının kurulamadığını belirlemek ve gerekiyorsa ilgili ön koşula kısa bir dönüş yapmaktır."
        ]
      },
      {
        h2: "Derin çalışma bloğu nasıl olmalı?",
        bullets: [
          "Kavramı ve temel ilişkiyi kendi cümleleriyle açıklama",
          "Çözülmüş örnekte her adımın nedenini görme",
          "Kolaydan seçici soruya kademeli uygulama",
          "Oturum sonunda yardımsız kısa kontrol"
        ],
        paragraphs: [
          "AYT çalışmasında kesintisiz odak önemlidir. Buna rağmen tek oturumda çok farklı hedefi sıkıştırmak yerine, bir ana beceri seçmek öğrenmenin izlenmesini kolaylaştırır."
        ]
      },
      {
        h2: "Karışık tekrar neden ertelenmemeli?",
        paragraphs: [
          "Bir konu testinde hangi yöntemin kullanılacağı çoğu zaman başlıktan anlaşılır. Karışık sette ise öğrenci önce soruyu tanımak ve doğru yaklaşımı seçmek zorundadır. Bu nedenle konu tamamen bittikten haftalar sonra değil, öğrenme ilerlerken kısa karışık setler eklenmelidir."
        ]
      },
      {
        h2: "Deneme analizi AYT planını nasıl değiştirir?",
        bullets: [
          "Bilgi eksikliği: kavram ve ön koşula dönüş",
          "Yöntem seçimi: benzer görünümlü soru türlerini karşılaştırma",
          "İşlem hatası: çözümü satırlandırma ve kontrol alışkanlığı",
          "Süre sorunu: soru seçimi ve takılma eşiğini gözden geçirme"
        ],
        links: [
          { label: "Matematik deneme analiz şablonunu kullanın", href: "/blog/matematik-deneme-analizi" },
          { label: "YKS matematik paketini inceleyin", href: "/yks" }
        ]
      },
      {
        h2: "TYT matematiği koruyan haftalık düzen",
        paragraphs: [
          "AYT ağırlığı arttığında TYT tarafında uzun konu oturumları yerine kısa karışık setler, problem pratiği ve düzenli deneme kullanılabilir. Hangi tarafa daha fazla süre ayrılacağı sabit değil; güncel deneme verisi ve sınava kalan süreyle birlikte değerlendirilmelidir."
        ]
      }
    ],
    cta: {
      title: "AYT matematikte sıradaki adımı belirleyin",
      text: "TYT ve AYT hedeflerini birlikte ele alan YKS matematik paketini görün.",
      buttonLabel: "YKS Paketini İncele",
      href: "/yks"
    },
    relatedSlugs: ["tyt-matematik-calisma-programi", "matematikte-temel-eksigi-nasil-kapatilir", "matematik-deneme-analizi"]
  },
  {
    slug: "matematikte-temel-eksigi-nasil-kapatilir",
    category: "Online Ders",
    title: "Matematikte Temel Eksikliği Nasıl Kapatılır?",
    seoTitle: "Matematikte Temel Eksikliği Kapatma Rehberi",
    metaDescription:
      "Matematik temelindeki eksikleri teşhis edin, ön koşul konularını doğru sıraya koyun ve soru çözümüyle kalıcı bir toparlanma planı kurun.",
    excerpt:
      "“Temelim yok” çoğu zaman tek bir sorun değildir. Eksik kavramı, işlem alışkanlığını ve soru dilini ayrı ayrı görerek daha kısa ve doğru bir toparlanma yolu çizilebilir.",
    cardSnippet: "Temel eksiğini teşhis edip doğru sırayla kapatma rehberi.",
    featured: false,
    summary: [
      "Genel bir ‘temel eksik’ etiketi yerine hangi adımın koptuğunu belirleyin.",
      "Ön koşul konularında kısa öğrenme–uygulama–kontrol döngüleri kurun.",
      "İlerlemeyi yalnız soru sayısıyla değil, yardımsız çözüm ve açıklamayla ölçün."
    ],
    sections: [
      {
        h2: "Temel eksikliği tam olarak ne demek?",
        paragraphs: [
          "Öğrenci işlem yaparken, cebirsel ilişki kurarken, grafiği okurken veya problem metnini matematiksel modele çevirirken zorlanabilir. Bunların tümüne aynı anda ‘temel eksik’ demek, nereden başlanacağını belirsizleştirir.",
          "Son yanlışlardan birkaçını çözüm adımlarına ayırmak; sorun bilginin hatırlanmaması mı, işlemin sürdürülememesi mi, yoksa sorunun anlaşılmaması mı sorusuna cevap verir."
        ]
      },
      {
        h2: "Ön koşul sırasını belirleyin",
        paragraphs: [
          "Yeni bir konuyu öğrenmek için gereken önceki beceriler listelenmelidir. Örneğin denklem kurmada zorlanan bir öğrencinin yalnız daha çok problem çözmesi değil; oran, işlem önceliği veya bilinmeyenle çalışma gibi ilgili basamaklara dönmesi gerekebilir.",
          "Dönüş, bütün müfredatı baştan almak anlamına gelmez. Sorunu besleyen en yakın ön koşulu bulup kısa bir onarım yapmak daha odaklıdır."
        ]
      },
      {
        h2: "Öğrenme döngüsünü kısa tutun",
        bullets: [
          "Kavramı kısa ve açık biçimde öğrenin",
          "Birlikte çözülen örnekte yöntemin nedenini görün",
          "Benzer soruyu yardımsız çözün",
          "Bir gün sonra kısa geri dönüş yapın",
          "Karışık soruda aynı beceriyi yeniden tanıyın"
        ]
      },
      {
        h2: "Kaynak değiştirmek ne zaman işe yaramaz?",
        paragraphs: [
          "Sorunun nedeni belirlenmeden sürekli daha kolay veya daha popüler kaynağa geçmek aynı boşluğu farklı sayfalarda tekrar ettirebilir. Kaynak, öğrencinin o anki hedefiyle uyumluysa değerlidir; hedef net değilse kitap sayısı ilerlemeyi göstermez."
        ]
      },
      {
        h2: "Ne zaman öğretmen desteği düşünülmeli?",
        paragraphs: [
          "Öğrenci çözümü izlediğinde anlıyor fakat tek başına başlayamıyorsa, aynı hata birkaç hafta tekrarlanıyorsa veya neyi çalışacağını seçemiyorsa dış geri bildirim süreci kısaltabilir. Desteğin amacı yalnız soruyu çözmek değil, öğrencinin hangi adımda koptuğunu ortaya çıkarmaktır."
        ],
        links: [
          { label: "Online matematik dersi nasıl olmalı?", href: "/blog/online-matematik-dersi-nasil-olmali" },
          { label: "LGS ve YKS paketlerini karşılaştırın", href: "/ders-paketleri" }
        ]
      }
    ],
    faq: [
      { q: "Matematik temeli ne kadar sürede düzelir?", a: "Süre; eksiklerin kapsamına, düzenli çalışma imkânına ve geri bildirime göre değişir. Tek bir süre vaadi yerine haftalık kapanan becerileri izlemek daha sağlıklıdır." },
      { q: "Matematiğe sıfırdan başlarken çok soru çözmek gerekir mi?", a: "Başlangıçta soru sayısından çok doğru kademelendirme önemlidir. Kavram anlaşıldıktan sonra kolaydan karışığa ilerleyen yeterli pratik yapılmalıdır." }
    ],
    cta: {
      title: "Nereden başlaman gerektiğini birlikte bulalım",
      text: "Öğrencinin sınıfını, hedefini ve matematikte zorlandığı noktayı ücretsiz ön görüşmede konuşalım.",
      buttonLabel: "Ücretsiz Ön Görüşme",
      href: "/iletisim"
    },
    relatedSlugs: ["online-matematik-dersi-nasil-olmali", "lgs-matematikte-zorlananlar-icin", "tyt-matematik-calisma-programi"]
  },
  {
    slug: "lgs-yeni-nesil-matematik-sorulari",
    category: "LGS",
    title: "LGS Yeni Nesil Matematik Soruları Nasıl Çözülür?",
    seoTitle: "LGS Yeni Nesil Matematik Soruları Çözme Rehberi",
    metaDescription:
      "LGS yeni nesil matematik sorularında metni ayıklama, veriyi düzenleme, doğru modeli kurma ve çözümü kontrol etme adımlarını öğrenin.",
    excerpt:
      "Uzun görünen her LGS matematik sorusu zor değildir. Metindeki veriyi ayıklayıp ilişkiyi doğru temsil etmek, işlemden önce kurulması gereken temel beceridir.",
    cardSnippet: "Uzun soruyu veriye, modele ve kontrollü çözüme dönüştürün.",
    featured: false,
    summary: [
      "Soruyu hızlı okumak yerine istenen ve verilenleri ayrı görün.",
      "İşleme başlamadan tablo, şekil, oran veya denklem gibi uygun temsili seçin.",
      "Çözümden sonra yalnız sonucu değil, kurduğunuz modelin soruya uyup uymadığını kontrol edin."
    ],
    sections: [
      {
        h2: "Uzun metni üç parçaya ayırın",
        paragraphs: [
          "Önce sorunun ne istediğini, sonra verilen bilgileri, son olarak bu bilgiler arasındaki ilişkiyi belirleyin. Her cümleyi aynı ağırlıkta okumak yerine ölçü, koşul ve sınırlamaları işaretlemek gereksiz ayrıntı hissini azaltır.",
          "Soruyu kendi cümlesiyle tek satırda özetleyebilen öğrenci, çoğu zaman çözüm yoluna da yaklaşmış olur."
        ]
      },
      {
        h2: "Doğru temsil biçimini seçin",
        bullets: [
          "Tekrarlayan veriler için tablo",
          "Parça–bütün ilişkisi için oran veya şema",
          "Bilinmeyen ilişki için denklem",
          "Konum ve ölçü için sade bir çizim"
        ],
        paragraphs: [
          "Temsil, çözümü süslemek için değil zihindeki yükü azaltmak için kullanılır. Karmaşık bir çizim yerine yalnız gerekli ilişkileri gösteren sade not çoğu zaman daha işlevseldir."
        ]
      },
      {
        h2: "Takıldığınızda başa dönmek yerine adımı bulun",
        paragraphs: [
          "Öğrenci çözüme ilerleyemediğinde soruyu tekrar tekrar okumak yerine hangi noktada kaldığını adlandırmalıdır: Veriyi mi kaçırdı, hangi işlemi seçeceğini mi bilmiyor, yoksa yaptığı işlemin sonucunu mu yorumlayamıyor? Bu teşhis doğru yardımı mümkün kılar."
        ]
      },
      {
        h2: "Hız çalışması doğruluktan sonra gelir",
        paragraphs: [
          "İlk çalışmalarda çözüm adımlarını açık yazmak ve nedenini anlatmak önemlidir. Yöntem yerleştikçe benzer soru gruplarında süre tutulabilir. Yanlış yöntemle hızlı çözüm yapmak, sınav temposunda aynı hatayı daha sık üretir."
        ]
      },
      {
        h2: "Çözüm incelemesini aktif yapın",
        bullets: [
          "Çözümü kapatıp ilk adımı kendiniz yeniden kurun",
          "Farklı çözüm varsa hangi koşulda daha kısa olduğunu karşılaştırın",
          "Sorunun değiştirilebilecek bir verisini seçip sonucu tahmin edin",
          "Hata türünü haftalık çalışma planına yazın"
        ],
        links: [
          { label: "LGS matematik çalışma programını kurun", href: "/blog/lgs-matematik-calisma-programi" },
          { label: "LGS canlı matematik paketini inceleyin", href: "/lgs" }
        ]
      }
    ],
    cta: {
      title: "Yeni nesil sorularda çözüm adımlarını birlikte gösterelim",
      text: "En fazla dört öğrencilik canlı derste öğrenci çözümünü gösterir ve takıldığı adımda geri bildirim alır.",
      buttonLabel: "LGS Paketini İncele",
      href: "/lgs"
    },
    relatedSlugs: ["lgs-matematik-calisma-programi", "matematik-deneme-analizi", "lgs-online-ders-net-artirma"]
  },
  {
    slug: "tyt-matematik-problem-cozme-hizi",
    category: "YKS",
    title: "TYT Matematikte Problem Çözme Hızı Nasıl Gelişir?",
    seoTitle: "TYT Matematik Problem Çözme Hızı Nasıl Artar?",
    metaDescription:
      "TYT matematik problemlerinde doğruluğu koruyarak hızlanmak için soru aileleri, süreli setler, takılma eşiği ve analiz yöntemlerini uygulayın.",
    excerpt:
      "Problem hızını artırmak daha hızlı işlem yapmaktan ibaret değildir. Soruyu tanıma, doğru modeli seçme ve ne zaman geçileceğine karar verme birlikte gelişmelidir.",
    cardSnippet: "Doğruluğu bozmadan problem çözme süresini geliştirin.",
    featured: false,
    summary: [
      "Hız sorununu okuma, modelleme, işlem ve karar verme parçalarına ayırın.",
      "Önce aynı soru ailesinde doğruluk, sonra kısa süreli karışık set çalışın.",
      "Tek soruda kalma süresini ve geri dönüş kararını denemelerde prova edin."
    ],
    sections: [
      {
        h2: "Sürenin nerede kaybolduğunu ölçün",
        paragraphs: [
          "Bazı öğrenciler metni birkaç kez okur, bazıları denklemi geç kurar, bazıları doğru yolu bulduğu hâlde işlemde uzar. Toplam süreyi görmek yerine bu aşamalardan hangisinin geciktiğini not etmek doğru egzersizi seçmeyi sağlar."
        ]
      },
      {
        h2: "Soru aileleriyle yöntem tanıma pratiği yapın",
        paragraphs: [
          "Benzer ilişkiyi kullanan soruları art arda çözmek, yöntem seçimini otomatikleştirmeye yardımcı olur. Ancak yalnız aynı tipte kalmak gerçek denemedeki seçme becerisini geliştirmez; birkaç odaklı oturumdan sonra karışık sete geçmek gerekir."
        ]
      },
      {
        h2: "Süreli seti doğru kullanın",
        bullets: [
          "İlk turda erişilebilir bir süre belirleyin",
          "Yanlış sayısı artıyorsa süreyi değil yöntemi düzeltin",
          "Set sonunda en uzun süren iki soruyu yeniden çözün",
          "Aynı beceriyi birkaç gün sonra kısa kontrol setinde deneyin"
        ],
        paragraphs: [
          "Süre tutmanın amacı öğrenciyi telaşlandırmak değil, kararlarını fark edilir hale getirmektir. Her oturumun rekor denemesi olması gerekmez."
        ]
      },
      {
        h2: "Takılma eşiği ve ikinci tur stratejisi",
        paragraphs: [
          "Sınavda bir soruya devam etmek veya geçmek de çalışılabilen bir beceridir. Öğrenci ilerleme üretmeyen tekrarları fark etmeli, soruyu işaretleyip diğer sorulara geçmeli ve ikinci turda temiz bir bakışla dönmelidir. Eşik kişiye ve soru tipine göre denemelerde ayarlanır."
        ]
      },
      {
        h2: "Haftalık hız planı",
        bullets: [
          "Bir gün: yöntem odaklı soru ailesi",
          "Bir gün: kısa süreli karışık problem seti",
          "Bir gün: yanlış ve uzun süren sorulara dönüş",
          "Hafta sonu: denemede soru seçimi ve süre kontrolü"
        ],
        links: [
          { label: "TYT matematik çalışma programına dönün", href: "/blog/tyt-matematik-calisma-programi" },
          { label: "YKS matematik paketini inceleyin", href: "/yks" }
        ]
      }
    ],
    cta: {
      title: "TYT matematikte sıradaki çalışma adımını belirleyin",
      text: "Canlı derste çözüm adımlarının gösterildiği YKS matematik paketini inceleyin.",
      buttonLabel: "YKS Paketini İncele",
      href: "/yks"
    },
    relatedSlugs: ["tyt-matematik-calisma-programi", "matematik-deneme-analizi", "yks-matematik-net-artirma"]
  },
  {
    slug: "online-matematik-dersi-nasil-olmali",
    category: "Online Dershane",
    title: "İyi Bir Online Matematik Dersi Nasıl Olmalı?",
    seoTitle: "Online Matematik Dersi Nasıl Olmalı? Seçim Rehberi",
    metaDescription:
      "Online matematik dersi seçerken canlı etkileşim, grup büyüklüğü, geri bildirim, ders sonrası plan ve veli bilgilendirmesini değerlendirin.",
    excerpt:
      "İyi bir online matematik dersi yalnız ekran karşısında konu anlatımı değildir. Öğrencinin çözümünü gösterdiği, geri bildirim aldığı ve dersten ne yapacağını bilerek çıktığı bir öğrenme düzenidir.",
    cardSnippet: "Online matematik dersi seçerken bakılacak somut ölçütler.",
    featured: false,
    summary: [
      "Dersin canlı olması kadar öğrencinin aktif çözüm yapabilmesi de önemlidir.",
      "Grup büyüklüğünü soru sorma ve geri bildirim için ayrılan zamanla birlikte değerlendirin.",
      "Ders sonrası ödev, çalışma yönü ve veli iletişiminin nasıl yürüdüğünü kayıt öncesi sorun."
    ],
    sections: [
      {
        h2: "Canlı ders ile video anlatımı aynı deneyim değildir",
        paragraphs: [
          "Video içerik tekrar için yararlı olabilir; ancak öğrencinin yanlış düşünme adımını o anda göremez. Canlı derste öğrenci yalnız dinlememeli, çözümünü göstermeli, neden o yolu seçtiğini açıklamalı ve öğretmenden aynı anda geri bildirim alabilmelidir."
        ]
      },
      {
        h2: "Grup büyüklüğünü nasıl değerlendirmelisiniz?",
        paragraphs: [
          "Tek başına kişi sayısı değil, her öğrencinin derse katılma biçimi önemlidir. Kayıt öncesinde öğrencinin soru sorup soramayacağını, çözümünü paylaşmaya ne kadar alan kaldığını ve öğretmenin farklı seviyeleri nasıl yönettiğini sorun.",
          "Online Dershanem matematik dersleri en fazla dört öğrencilik gruplarda yürütülür; amaç öğrencinin görünür kaldığı bir canlı ders ortamı kurmaktır."
        ]
      },
      {
        h2: "Ders sonrası ne olacağı belli olmalı",
        bullets: [
          "İşlenen konunun kısa özeti",
          "Öğrencinin zorlandığı adım",
          "Bir sonraki derse kadar çalışma yönü",
          "Tamamlanabilir ödev veya tekrar hedefi"
        ],
        paragraphs: [
          "Ders bittiğinde yalnız ‘konu işlendi’ bilgisinin kalması yeterli değildir. Öğrencinin bağımsız çalışmaya nasıl devam edeceği açık olmalıdır."
        ]
      },
      {
        h2: "Veli iletişimi sade ve anlamlı olmalı",
        paragraphs: [
          "Veliye çok sayıda grafik göstermek yerine işlenen konu, gözlenen zorlanma ve sonraki hedefi anlatan kısa bir özet daha kullanışlı olabilir. İletişimin sıklığı ve kapsamı kayıt öncesinde açıkça belirtilmelidir."
        ]
      },
      {
        h2: "Kayıt öncesi sorulacak sekiz soru",
        bullets: [
          "Ders gerçekten canlı mı?",
          "Grupta en fazla kaç öğrenci var?",
          "Öğrenci çözümünü gösterebiliyor mu?",
          "Ders süresi ve aylık ders sayısı nedir?",
          "Ödev ve geri bildirim nasıl ilerliyor?",
          "Grup yerleşimi neye göre yapılıyor?",
          "Veliye hangi bilgi paylaşılıyor?",
          "Ücret, taahhüt ve iptal koşulları açık mı?"
        ],
        links: [
          { label: "LGS ve YKS paketlerini karşılaştırın", href: "/ders-paketleri" },
          { label: "Tüm sık sorulan soruları görün", href: "/sss" }
        ]
      }
    ],
    faq: [
      { q: "Online matematik dersi canlı mı olmalı?", a: "Canlı ders, öğrencinin soru sormasına ve çözüm sırasında geri bildirim almasına imkân verir. Video içerikler tekrar amacıyla destek olabilir; ancak iki deneyim aynı değildir." },
      { q: "Online matematik dersinde ideal grup kaç kişidir?", a: "Tek bir evrensel sayı yoktur; önemli olan öğrencinin görünür kalması ve geri bildirim alabilmesidir. Online Dershanem grupları en fazla dört öğrencidir." }
    ],
    cta: {
      title: "Ders modelini ve fiyatı şeffaf biçimde inceleyin",
      text: "LGS ve YKS matematik paketleri ayda dört canlı 90 dakikalık ders içerir ve aylık ₺3.000'dir.",
      buttonLabel: "Paketleri Karşılaştır",
      href: "/ders-paketleri"
    },
    relatedSlugs: ["online-dershane-secim-rehberi-2026", "ozel-ders-mi-kucuk-grup-mu", "matematikte-temel-eksigi-nasil-kapatilir"]
  },
  {
    slug: "matematik-deneme-analizi",
    category: "Sınav Stratejisi",
    title: "Matematik Deneme Analizi Nasıl Yapılır?",
    seoTitle: "Matematik Deneme Analizi: Uygulanabilir Şablon",
    metaDescription:
      "Matematik denemesindeki yanlış, boş ve uzun süren soruları sınıflandırın; analizden bir sonraki haftaya uygulanabilir çalışma planı çıkarın.",
    excerpt:
      "Deneme puanı sonucu gösterir; analiz ise bir sonraki adımı. Doğru bir matematik deneme analizi, her yanlışın nedenini ve plana nasıl döneceğini açıklar.",
    cardSnippet: "Yanlış ve boşları gelecek haftanın çalışma planına çevirin.",
    featured: false,
    summary: [
      "Yanlışlar kadar boş ve gereğinden uzun süren doğru soruları da inceleyin.",
      "Her soruyu bilgi, modelleme, işlem, dikkat veya süre başlığında sınıflandırın.",
      "Analizden sonraki haftaya en fazla iki öncelikli müdahale çıkarın."
    ],
    sections: [
      {
        h2: "Analize yalnız yanlışlardan başlamayın",
        paragraphs: [
          "Boş bırakılan sorular, tahminle yapılan doğrular ve çok uzun süren çözümler de önemli veri taşır. Deneme biter bitmez soru başına kısa not almak, daha sonra hatırlamaya çalışmaktan daha güvenilirdir.",
          "İlk kayıt için soru numarası, konu, sonuç, yaklaşık süre ve öğrencinin kısa açıklaması yeterlidir."
        ]
      },
      {
        h2: "Beş hata türüyle sınıflandırın",
        bullets: [
          "Bilgi: kavram veya kural bilinmiyor",
          "Modelleme: metin matematiksel ilişkiye çevrilemiyor",
          "İşlem: yöntem doğru, uygulama hatalı",
          "Dikkat: koşul veya veri gözden kaçıyor",
          "Süre ve seçim: soru doğru zamanda bırakılmıyor"
        ],
        paragraphs: [
          "Bir soru birden fazla başlığa girebilir; yine de ilk müdahale edilecek ana nedeni seçmek planı sadeleştirir."
        ]
      },
      {
        h2: "Yanlış defteri nasıl kullanılmalı?",
        paragraphs: [
          "Yanlış defteri yalnız soru görsellerinin biriktiği arşiv olmamalıdır. Sorunun neden yanlış olduğu, doğru çözümün kritik adımı ve benzer soruda dikkat edilecek işaret tek cümleyle yazılmalıdır. Birkaç gün sonra soruyu çözüme bakmadan yeniden yapmak, hatanın kapanıp kapanmadığını gösterir."
        ]
      },
      {
        h2: "Analizden haftalık plana geçin",
        bullets: [
          "En sık tekrar eden bir veya iki hata türünü seçin",
          "Her hata için kısa öğrenme ve uygulama oturumu planlayın",
          "Benzer beceriyi ölçen mini kontrol seti ekleyin",
          "Sonucu bir sonraki denemede yeniden izleyin"
        ],
        paragraphs: [
          "Her yanlışı aynı hafta kapatmaya çalışmak programı aşırı büyütebilir. Öncelik, sık tekrarlanan ve başka konuları da etkileyen hatalarda olmalıdır."
        ]
      },
      {
        h2: "Tek deneme yerine eğilimi okuyun",
        paragraphs: [
          "Denemelerin güçlük düzeyi ve öğrencinin o günkü koşulları değişebilir. Bu nedenle tek net farkından kesin sonuç çıkarmak yerine birkaç denemede aynı hata türünün, süre kullanımının ve boşların yönünü izlemek daha anlamlıdır."
        ],
        links: [
          { label: "LGS matematik çalışma programına geçin", href: "/blog/lgs-matematik-calisma-programi" },
          { label: "TYT matematik çalışma programına geçin", href: "/blog/tyt-matematik-calisma-programi" }
        ]
      }
    ],
    faq: [
      { q: "Deneme analizi ne zaman yapılmalı?", a: "Mümkünse deneyim tazeyken kısa notlar hemen alınmalı; ayrıntılı çözüm ve çalışma planı ise öğrencinin dinlenebileceği uygun bir zamanda tamamlanmalıdır." },
      { q: "Her yanlış yanlış defterine yazılmalı mı?", a: "Her soruyu arşivlemek yerine tekrar eden, önemli bir kavramı gösteren veya çözüm yaklaşımı öğreten sorular seçilebilir. Amaç sayfa biriktirmek değil, hatayı yeniden tanımaktır." }
    ],
    cta: {
      title: "Deneme analizini ders sonrası yönlendirmeye bağlayın",
      text: "Öğrencinin hangi adımı çalışacağını netlikle gösteren LGS ve YKS matematik paketlerini inceleyin.",
      buttonLabel: "Paketleri Karşılaştır",
      href: "/ders-paketleri"
    },
    relatedSlugs: ["lgs-matematik-calisma-programi", "tyt-matematik-calisma-programi", "deneme-analizi-nasil-yapilir"]
  }
];

export const blogPosts: BlogPost[] = [
  ...newBlogPosts,
  ...(existingBlogPosts as BlogPost[]),
];
